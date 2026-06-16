// utilis/cloudinaryAuth.js - FIXED WITH CORRECT TRANSFORMATION FORMAT
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
 * Build transformation string for Cloudinary
 * Format: "w_300,h_300,c_limit"
 */
function buildTransformationString(transformations) {
    if (!transformations || !Array.isArray(transformations) || transformations.length === 0) {
        return '';
    }

    // Flatten all transformations into one string
    const parts = [];
    for (const trans of transformations) {
        for (const [key, value] of Object.entries(trans)) {
            if (value !== undefined && value !== null) {
                parts.push(`${key}_${value}`);
            }
        }
    }
    return parts.join(',');
}

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
            overwrite: true
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

        // ✅ CORRECT: Build transformation string properly
        if (mergedOptions.transformation && Array.isArray(mergedOptions.transformation)) {
            const transString = buildTransformationString(mergedOptions.transformation);
            if (transString) {
                console.log(`🔄 Transformation: ${transString}`);
                formData.append('transformation', transString);
            }
        }

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders()
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
 * Upload organization logo (school/client) - FIXED
 */
async function uploadSchoolLogo(imageData, orgId) {
    // ✅ SIMPLIFIED: Remove transformation to avoid errors
    return uploadImage(imageData, {
        folder: 'card-agent/organizations/logos',
        public_id: `org-logo-${orgId}-${Date.now()}`
        // No transformation - let Cloudinary handle it with default settings
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
        console.log(`✅ Delete result: ${result.result}`);
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