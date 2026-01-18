const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3033',
  'https://smartdocs365.com',
  'https://www.smartdocs365.com',
  'https://smart-docs365.vercel.app',
  'https://smart-docs365-9yagjovsk-siva-ss-projects.vercel.app',
  'https://smart-docs365-nxzyqppre-siva-ss-projects.vercel.app',
  
  // 👇 ADD THIS LINE (Fixes the Red CORS Error)
  'https://smartdocs365-backend.onrender.com' 
];

module.exports = allowedOrigins;