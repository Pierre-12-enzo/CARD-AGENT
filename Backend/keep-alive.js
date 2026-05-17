// keep-alive.js - Optional file for Render Cron Jobs
const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'https://card-agent-backend.onrender.com';

console.log(`🔄 Keep-alive ping at ${new Date().toISOString()}`);

https.get(`${BACKEND_URL}/api/health`, (res) => {
    console.log(`✅ Ping successful: ${res.statusCode}`);
    process.exit(0);
}).on('error', (err) => {
    console.error(`❌ Ping failed: ${err.message}`);
    process.exit(1);
});