// utilis/cloudinaryUpload.js - CARD-AGENT
const cloudinary = require('cloudinary').v2;
const JSZip = require('jszip');
const path = require('path');

/**
 * Extract photos from ZIP and upload to Cloudinary
 * @param {Buffer} zipBuffer - ZIP file buffer
 * @returns {Promise<Object>} Map of student_id -> Cloudinary data
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

        const ext = path.extname(fileName).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.gif') mimeType = 'image/gif';
        if (ext === '.bmp') mimeType = 'image/bmp';

        const uploadResult = await uploadToCloudinaryWithRetry(fileBuffer, studentId, mimeType);

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
 * Upload image to Cloudinary with retry logic
 */
async function uploadToCloudinaryWithRetry(buffer, studentId, mimeType, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Cloudinary upload attempt ${attempt}/${maxRetries} for ${studentId}`);

      const uploadResult = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${buffer.toString('base64')}`,
        {
          folder: 'card-agent/people/photos',
          public_id: `person-${studentId}-${Date.now()}`,
          overwrite: true,
          transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto:good" }
          ],
          timeout: 30000
        }
      );

      return uploadResult;
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
  return await uploadToCloudinaryWithRetry(buffer, studentId, 'image/jpeg');
}

module.exports = {
  extractAndUploadPhotosToCloudinary,
  uploadToCloudinaryWithRetry,
  uploadSinglePhotoToCloudinary
};