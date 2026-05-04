// utils/imageLoader.js
const { loadImage } = require('canvas');

/**
 * Load image from URL with retry and Cloudinary optimization
 * @param {string} url - Image URL
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise} Canvas image object
 */
async function loadImageFromUrl(url, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Loading image attempt ${attempt}/${maxRetries}: ${url}`);
      return await loadImage(url);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}`);
      
      // On last attempt, try Cloudinary optimization
      if (attempt === maxRetries && url.includes('cloudinary.com')) {
        console.log(`🔄 Last attempt, trying Cloudinary optimization...`);
        
        // Add optimization parameters
        const optimizedUrl = url.replace(/\/upload\//, '/upload/q_auto,f_auto/');
        if (optimizedUrl !== url) {
          try {
            console.log(`🔗 Trying optimized URL: ${optimizedUrl}`);
            return await loadImage(optimizedUrl);
          } catch (optimizedError) {
            console.error(`❌ Even optimized URL failed: ${optimizedError.message}`);
          }
        }
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        const delay = attempt * 1000;
        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Failed to load image after ${maxRetries} attempts: ${url}`);
}

module.exports = {
  loadImageFromUrl
};