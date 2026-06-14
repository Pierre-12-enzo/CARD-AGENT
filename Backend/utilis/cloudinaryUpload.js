// utilis/cloudinaryUpload.js - USING CLOUDINARY SDK (SIGNED)
const cloudinary = require('cloudinary').v2;
const JSZip = require('jszip');
const path = require('path');
const { Readable } = require('stream');

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test the configuration
console.log('📸 Cloudinary configured with:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? 'Present' : 'Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Present' : 'Missing'
});

/**
 * Sanitize filename - remove any characters that could cause issues
 */
function sanitizeFilename(filename) {
  // Remove any path separators
  let clean = filename.replace(/[\/\\]/g, '_');
  // Remove any other problematic characters
  clean = clean.replace(/[^a-zA-Z0-9_-]/g, '_');
  // Ensure it doesn't start with special character
  clean = clean.replace(/^[_-]+/, '');
  // Limit length
  if (clean.length > 50) {
    clean = clean.substring(0, 50);
  }
  return clean;
}

/**
 * Extract photos from ZIP and upload to Cloudinary using SDK
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
        // Get the student ID from filename (without extension)
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

        // ✅ Use Cloudinary SDK with buffer stream
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'card-agent/people/bulk-photos',
              public_id: `student_${studentId}_${Date.now()}`,
              overwrite: true,
              transformation: [
                { width: 500, height: 500, crop: "fill", gravity: "face" },
                { quality: "auto:good" },
                { fetch_format: "auto" }
              ]
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary SDK error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          // Create a readable stream from buffer and pipe to Cloudinary
          const readableStream = new Readable();
          readableStream.push(fileBuffer);
          readableStream.push(null);
          readableStream.pipe(uploadStream);
        });

        photoCloudinaryMap[studentId] = {
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        };

        console.log(`✅ Successfully uploaded: ${studentId} -> ${uploadResult.secure_url}`);

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
async function uploadSinglePhotoToCloudinary(fileBuffer, studentId) {
  try {
    const cleanId = sanitizeFilename(studentId);

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'card-agent/people/photos',
          public_id: `student_${cleanId}_${Date.now()}`,
          transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto:good" }
          ]
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        }
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    return result;
  } catch (error) {
    console.error(`Failed to upload photo for ${studentId}:`, error.message);
    throw error;
  }
}

module.exports = {
  extractAndUploadPhotosToCloudinary,
  uploadSinglePhotoToCloudinary
};