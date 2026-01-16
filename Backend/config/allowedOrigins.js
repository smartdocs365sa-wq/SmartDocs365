const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3033',
  'https://smartdocs365.com',
  'https://www.smartdocs365.com',
  'https://smart-docs365.vercel.app',
  'https://smart-docs365-9yagjovsk-siva-ss-projects.vercel.app', // Your previous build
  'https://smart-docs365-nxzyqppre-siva-ss-projects.vercel.app'  // ✅ ADDED: The one causing the error in logs
];

module.exports = allowedOrigins;