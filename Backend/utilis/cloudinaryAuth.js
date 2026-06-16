// utilis/cloudinaryAuth.js - FIXED WITH UNSIGNED PRESET
const cloudinary = require('cloudinary').v2;
const FormData = require('form-data');
const fetch = require('node-fetch');

// Cloudinary config (still needed for URL generation and deletion)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const UNSIGNED_PRESET = 'card_agent_unsigned';

/**
 * Upload an image to Cloudinary using unsigned preset
 * @param {string|Buffer} imageData - Base64 image data or buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
async function uploadImage(imageData, options = {}) {
    try {
        console.log('📸 Uploading image to Cloudinary...');

        // Convert buffer to base64 if needed
        let fileData = imageData;
        if (Buffer.isBuffer(imageData)) {
            fileData = `data:image/png;base64,${imageData.toString('base64')}`;
        }

        // Default options
        const defaultOptions = {
            folder: 'card-agent/general',
            overwrite: true,
            transformation: [
                { width: 300, height: 300, crop: "limit" },
                { quality: "auto:good" }
            ]
        };

        const mergedOptions = { ...defaultOptions, ...options };

        // Build FormData for unsigned upload
        const formData = new FormData();
        formData.append('file', fileData);
        formData.append('upload_preset', UNSIGNED_PRESET);

        if (mergedOptions.public_id) {
            formData.append('public_id', mergedOptions.public_id);
        }

        if (mergedOptions.folder) {
            formData.append('folder', mergedOptions.folder);
        }

        // Handle transformation
        if (mergedOptions.transformation && mergedOptions.transformation.length > 0) {
            const transformationString = mergedOptions.transformation
                .map(t => Object.entries(t).map(([k, v]) => `${k}_${v}`).join(','))
                .join('/');
            formData.append('transformation', transformationString);
        }

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders(),
                timeout: 120000
            }
        );

        const result = await response.json();

        if (!response.ok || !result.secure_url) {
            console.error('❌ Cloudinary upload failed:', result);
            throw new Error(result.error?.message || 'Failed to upload image');
        }

        console.log('✅ Image uploaded:', result.secure_url);

        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };

    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw new Error(`Image upload failed: ${error.message}`);
    }
}

/**
 * Upload user avatar
 */
async function uploadAvatar(imageData, userId) {
    return uploadImage(imageData, {
        folder: 'card-agent/avatars',
        public_id: `avatar-${userId}-${Date.now()}`,
        transformation: [
            { width: 150, height: 150, crop: "thumb", gravity: "face" },
            { quality: "auto:best" }
        ]
    });
}

/**
 * Upload company logo
 */
async function uploadCompanyLogo(imageData, companyId) {
    return uploadImage(imageData, {
        folder: 'card-agent/companies/logos',
        public_id: `logo-${companyId}-${Date.now()}`,
        transformation: [
            { width: 300, height: 300, crop: "limit" },
            { quality: "auto:best" }
        ]
    });
}

/**
 * Upload organization logo (school/client)
 */
async function uploadSchoolLogo(imageData, orgId) {
    return uploadImage(imageData, {
        folder: 'card-agent/organizations/logos',
        public_id: `org-logo-${orgId}-${Date.now()}`,
        transformation: [
            { width: 300, height: 300, crop: "limit" },
            { quality: "auto:best" }
        ]
    });
}

/**
 * Upload student/employee photo
 */
async function uploadPersonPhoto(imageData, personId) {
    return uploadImage(imageData, {
        folder: 'card-agent/people/photos',
        public_id: `person-${personId}-${Date.now()}`,
        transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto:good" }
        ]
    });
}

/**
 * Upload template image
 */
async function uploadTemplateImage(imageData, side) {
    return uploadImage(imageData, {
        folder: `card-agent/templates/${side}`,
        public_id: `template-${side}-${Date.now()}`,
        transformation: [
            { width: 1200, height: 800, crop: "limit" },
            { quality: "auto:good" }
        ]
    });
}

/**
 * Delete image from Cloudinary
 * This still uses the SDK because it requires authentication
 */
async function deleteImage(publicId) {
    try {
        if (!publicId) return false;
        console.log(`🗑️ Deleting image: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('❌ Cloudinary delete error:', error);
        return false;
    }
}

/**
 * Extract public_id from Cloudinary URL
 */
function extractPublicIdFromUrl(url) {
    if (!url) return null;
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\./);
    return matches ? matches[1] : null;
}

module.exports = {
    uploadImage,
    uploadAvatar,
    uploadCompanyLogo,
    uploadSchoolLogo,
    uploadPersonPhoto,
    uploadTemplateImage,
    deleteImage,
    extractPublicIdFromUrl
};