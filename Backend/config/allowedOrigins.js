// ============================================
// FILE: Backend/config/allowedOrigins.js
// ✅ FIXED: Added New Render URL (v2)
// ============================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3033',
  'https://smartdocs365.com',
  'https://www.smartdocs365.com',
  'https://smartdocs365-backend-docker.onrender.com', // Old Backend (Keep for now)
  'https://smartdocs365-backend-v2.onrender.com',    // ✅ NEW Backend
  'https://smart-docs365.vercel.app',
  
  // ✅ This regex allows ALL Vercel preview/deployment URLs
  // This will automatically allow your NEW Vercel frontend once you create it.
  /^https:\/\/smart-docs365-[a-z0-9]+-siva-ss-projects\.vercel\.app$/,
  /^https:\/\/smartdocs365-[a-z0-9]+.*\.vercel\.app$/ // Added extra check for new account names
];

module.exports = allowedOrigins;
