// utilis/cloudinaryAuth.js - CARD-AGENT
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a single image to Cloudinary
 */
async function uploadImage(imageData, options = {}) {
    try {
        const defaultOptions = {
            folder: 'card-agent/general',
            overwrite: true,
            timeout: 120000,
            transformation: [
                { width: 300, height: 300, crop: "limit" },
                { quality: "auto:good" }
            ]
        };

        const uploadOptions = { ...defaultOptions, ...options };
        const result = await cloudinary.uploader.upload(imageData
            , uploadOptions);

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
 */
async function deleteImage(publicId) {
    try {
        if (!publicId) return false;
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