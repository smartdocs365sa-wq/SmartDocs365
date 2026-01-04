const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3000",
  "http://localhost",
  "https://smartdocs365.com",
  "https://www.smartdocs365.com", // <--- Add this line to be safe
  "https://admin.smartdocs365.com",
  "chrome-extension://fhbjgbiflinjbdggehcddcbncdddomop",
  "chrome-extension://gmmkjpcadciiokjpikmkkmapphbmdjok",
  'https://your-app.vercel.app'
];

module.exports = allowedOrigins;