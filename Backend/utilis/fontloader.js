// Create a new file: utils/fontLoader.js
const fs = require('fs');
const path = require('path');
const { registerFont } = require('canvas');

class FontLoader {
  constructor() {
    this.fontsDir = path.join(__dirname, '..', 'fonts');
    this.fontsLoaded = false;
  }

  async loadFonts() {
    if (this.fontsLoaded) return true;

    try {
      console.log('🔤 Loading fonts with base64 embedding...');
      
      // Read font files as base64
      const regularPath = path.join(this.fontsDir, 'Roboto-Regular.ttf');
      const boldPath = path.join(this.fontsDir, 'Roboto-Bold.ttf');
      
      if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
        console.log('⚠️ Font files not found, downloading...');
        await this.downloadFonts();
      }
      
      // Register fonts with absolute paths
      registerFont(regularPath, { 
        family: 'Roboto',
        weight: 'normal',
        style: 'normal'
      });
      
      registerFont(boldPath, { 
        family: 'Roboto',
        weight: 'bold', 
        style: 'normal'
      });
      
      this.fontsLoaded = true;
      console.log('✅ Fonts loaded successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load fonts:', error);
      return false;
    }
  }

  async downloadFonts() {
    const https = require('https');
    const fs = require('fs').promises;
    
    const fonts = [
      {
        url: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.ttf',
        filename: 'Roboto-Regular.ttf'
      },
      {
        url: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.ttf',
        filename: 'Roboto-Bold.ttf'
      }
    ];
    
    for (const font of fonts) {
      const filePath = path.join(this.fontsDir, font.filename);
      console.log(`📥 Downloading ${font.filename}...`);
      
      await new Promise((resolve, reject) => {
        https.get(font.url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download ${font.filename}: ${response.statusCode}`));
            return;
          }
          
          const fileStream = fs.createWriteStream(filePath);
          response.pipe(fileStream);
          
          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✅ Downloaded ${font.filename}`);
            resolve();
          });
          
          fileStream.on('error', reject);
        }).on('error', reject);
      });
    }
  }

  getFontFamily(fallback = true) {
    if (!fallback) {
      return '"Roboto"';
    }
    
    // Font stack with reliable fallbacks
    return '"Roboto", "Segoe UI", "Arial", "Helvetica", sans-serif';
  }
}
// utils/systemFonts.js
const systemFonts = {
  getFontStack(primaryFont = 'Roboto') {
    // Priority: Custom font → Windows → macOS → Linux → Universal
    return [
      `"${primaryFont}"`,
      '"Segoe UI"',        // Windows 8+
      '"Helvetica Neue"',  // macOS
      'Arial',             // Universal
      '"Liberation Sans"', // Linux
      'sans-serif'         // Ultimate fallback
    ].join(', ');
  },
  
  getSafeFont(size, isBold = false, primaryFont = 'Roboto') {
    const weight = isBold ? 'bold' : 'normal';
    return `${weight} ${size}px ${this.getFontStack(primaryFont)}`;
  }
};

module.exports = systemFonts;

module.exports = new FontLoader();