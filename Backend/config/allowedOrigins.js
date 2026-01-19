// ============================================
// FILE: Backend/config/allowedOrigins.js
// ✅ FIXED: Wildcard for ALL Vercel preview deployments
// ============================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3033',
  'https://smartdocs365.com',
  'https://www.smartdocs365.com',
  'https://smartdocs365-backend.onrender.com', // Old backend (keep for now)
  'https://smartdocs365-backend-docker.onrender.com', // ✅ NEW Docker backend
  'https://smart-docs365.vercel.app',
  
  // ✅ This regex allows ALL Vercel preview URLs
  /^https:\/\/smart-docs365-[a-z0-9]+-siva-ss-projects\.vercel\.app$/
];

module.exports = allowedOrigins;