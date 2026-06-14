// utilis/cloudinaryUpload.js - COMPLETE FIXED VERSION
const cloudinary = require('cloudinary').v2;
const JSZip = require('jszip');
const path = require('path');
const fetch = require('node-fetch');

// Cloudinary config (still needed for URL generation)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Your unsigned preset name
const UNSIGNED_PRESET = 'card_agent_unsigned';

/**
 * Extract photos from ZIP and upload to Cloudinary
 */
async function extractAndUploadPhotosToCloudinary(zipBuffer) {
  const photoCloudinaryMap = {};

  try {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipBuffer);

    console.log(`📦 Processing ZIP with ${Object.keys(zipData.files).length} items`);

    const files = Object.entries(zipData.files).filter(([fileName, file]) =>
      !file.dir && fileName.match(/\.(jpg|jpeg|png|gif|bmp)$/i)
    );

    console.log(`🎯 Found ${files.length} image files in ZIP`);

    for (let i = 0; i < files.length; i++) {
      const [fileName, file] = files[i];

      try {
        const baseName = path.basename(fileName);
        const studentId = path.parse(baseName).name;

        if (!studentId || studentId.length < 2) {
          console.warn(`⚠️ Skipping invalid filename: ${fileName}`);
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

        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
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
 * Upload image to Cloudinary using fetch API (unsigned preset)
 */
async function uploadToCloudinaryWithRetry(buffer, studentId, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Cloudinary upload attempt ${attempt}/${maxRetries} for ${studentId}`);

      // Convert buffer to base64
      const base64String = buffer.toString('base64');

      // Simple JSON payload
      const payload = {
        file: `data:image/jpeg;base64,${base64String}`,
        upload_preset: UNSIGNED_PRESET,
        public_id: `person-${studentId}-${Date.now()}`
      };

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
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
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${delay / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
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