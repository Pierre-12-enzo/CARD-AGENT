// utilis/cloudinaryUpload.js - COMPLETE WITH RETRY + UNSIGNED PRESET
const JSZip = require('jszip');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const UNSIGNED_PRESET = 'card_agent_unsigned';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

/**
 * Sanitize filename - remove any characters that could cause issues
 */
function sanitizeFilename(filename) {
  let clean = filename.replace(/[\/\\:*?"<>|]/g, '_');
  clean = clean.replace(/[^a-zA-Z0-9_-]/g, '_');
  clean = clean.replace(/^[_-]+/, '');
  if (clean.length > 50) {
    clean = clean.substring(0, 50);
  }
  return clean;
}

/**
 * Upload image to Cloudinary using unsigned preset with retry logic
 */
async function uploadToCloudinaryWithRetry(buffer, studentId, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Cloudinary upload attempt ${attempt}/${maxRetries} for ${studentId}`);

      // Detect MIME type
      let mimeType = 'image/jpeg';
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        mimeType = 'image/png';
      } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        mimeType = 'image/gif';
      } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        mimeType = 'image/webp';
      }

      // Create base64 string
      const base64String = buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64String}`;

      // Create FormData for unsigned upload
      const formData = new FormData();
      formData.append('file', dataUri);
      formData.append('upload_preset', UNSIGNED_PRESET);
      formData.append('public_id', `student_${studentId}_${Date.now()}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders()
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      console.log(`✅ Uploaded ${studentId}: ${result.secure_url}`);
      return result;

    } catch (error) {
      lastError = error;
      console.log(`⚠️ Upload attempt ${attempt} failed for ${studentId}: ${error.message}`);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Waiting ${delay / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Extract photos from ZIP and upload to Cloudinary using unsigned preset
 */
async function extractAndUploadPhotosToCloudinary(zipBuffer) {
  const photoCloudinaryMap = {};

  try {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipBuffer);

    console.log(`📦 Processing ZIP with ${Object.keys(zipData.files).length} items`);

    const files = Object.entries(zipData.files).filter(([fileName, file]) =>
      !file.dir && fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    );

    console.log(`🎯 Found ${files.length} image files in ZIP`);

    for (let i = 0; i < files.length; i++) {
      const [fileName, file] = files[i];

      try {
        const baseNameWithExt = path.basename(fileName);
        const studentIdRaw = path.parse(baseNameWithExt).name;
        const studentId = sanitizeFilename(studentIdRaw);

        if (!studentId || studentId.length < 2) {
          console.warn(`⚠️ Skipping invalid filename: ${fileName} -> cleaned to: ${studentId}`);
          continue;
        }

        const fileBuffer = await file.async('nodebuffer');

        if (fileBuffer.length === 0) {
          console.warn(`⚠️ Empty file: ${fileName}`);
          continue;
        }

        console.log(`📸 Processing photo ${i + 1}/${files.length}: ${studentId} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);

        const uploadResult = await uploadToCloudinaryWithRetry(fileBuffer, studentId);

        photoCloudinaryMap[studentId] = {
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        };

        console.log(`✅ Successfully uploaded: ${studentId}`);

        // Small delay between uploads to avoid rate limits
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Failed to process ${fileName}:`, error.message);
      }
    }

    console.log(`✅ Uploaded ${Object.keys(photoCloudinaryMap).length} photos to Cloudinary`);
    return photoCloudinaryMap;

  } catch (error) {
    console.error('❌ ZIP processing error:', error);
    return {};
  }
}

/**
 * Upload single photo to Cloudinary
 */
async function uploadSinglePhotoToCloudinary(buffer, studentId) {
  return await uploadToCloudinaryWithRetry(buffer, studentId);
}

module.exports = {
  extractAndUploadPhotosToCloudinary,
  uploadToCloudinaryWithRetry,
  uploadSinglePhotoToCloudinary
};