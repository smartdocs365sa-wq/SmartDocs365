// ============================================
// FILE: Backend/config/allowedOrigins.js
// ✅ FIXED: Added your new Vercel Preview URL
// ============================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3033',
  'https://smartdocs365.com',
  'https://www.smartdocs365.com',
  'https://smartdocs365-backend.onrender.com', // Backend itself
  'https://smart-docs365.vercel.app',
  
  // Previous Vercel builds
  'https://smart-docs365-9yagjovsk-siva-ss-projects.vercel.app',
  'https://smart-docs365-nxzyqppre-siva-ss-projects.vercel.app',
  
  // 👇 ADD THIS NEW ONE FROM YOUR LOGS 👇
  'https://smart-docs365-pr6y9wrbp-siva-ss-projects.vercel.app'
];

module.exports = allowedOrigins;