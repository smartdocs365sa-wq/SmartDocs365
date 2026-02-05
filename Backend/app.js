// ============================================
// FILE: Backend/app.js
// ✅ COMPLETE: Updated with NEW Render URL (v2)
// ============================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const axios = require("axios");
const importExcelDataRoute = require('./routes/apis/importExcelData');

// Importing middlewares
const allowedOrigins = require("./config/allowedOrigins");
const credentials = require("./middleware/credentials");
const errorHandler = require("./errorHandler");
const verifyJWT = require('./middleware/verifyJWT');

// ✅ Import subscription cron (internal scheduler)
require("./subscriptionCron");

// App setup
const app = express();
const PORT = process.env.PORT || 3033;

// ============================================
// ✅ FIXED: CORS Configuration with Regex Support
// ============================================
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("🚫 Blocked by CORS:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
};

// ============================================
// MIDDLEWARE
// ============================================

app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "/public")));

// ✅ Explicitly serve logo.png
app.get('/logo.png', (req, res) => {
  const logoPath = path.join(__dirname, 'public', 'logo.png');
  const fs = require('fs');
  
  if (fs.existsSync(logoPath)) {
      res.sendFile(logoPath);
      console.log('✅ Logo served:', logoPath);
  } else {
      console.error('❌ Logo not found:', logoPath);
      res.status(404).send('Logo not found');
  }
});

// ============================================
// ✅ CRON JOB FIX (Fixes "Output too large")
// ============================================
app.get('/api/cron/trigger', (req, res) => {
  // 1. Security Check (Matches your cron-job.org URL)
  const { key } = req.query;
  if (key !== 'secure123') {
    return res.status(401).send('Unauthorized');
  }

  // 2. Log it
  console.log('✅ Cron job ping received (Keeping server alive)');

  // 3. SEND TINY RESPONSE (The Solution)
  // We strictly send "OK" so cron-job.org doesn't fail.
  res.status(200).send('OK');
});


// ============================================
// ZOHO OAUTH TOKEN GENERATOR
// ============================================

app.get('/get-zoho-token', async (req, res) => {
  const { code } = req.query;
  
  // Step 1: Show authorization page
  if (!code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Zoho Mail Setup</title>
          <style>body { font-family: sans-serif; padding: 40px; text-align: center; }</style>
        </head>
        <body>
          <h1>Zoho Mail Setup</h1>
          <a href="https://accounts.zoho.in/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ&client_id=1000.TJUP8N9JKBHXAA1Q8FOSLB5DAW8T3Q&response_type=code&access_type=offline&redirect_uri=https://smartdocs365-backend-v2.onrender.com/get-zoho-token">
            Authorize Zoho Mail
          </a>
        </body>
      </html>
    `);
  }

  // Step 2: Exchange code for refresh token
  try {
    const response = await axios.post(
      'https://accounts.zoho.in/oauth/v2/token',
      null,
      {
        params: {
          code: code,
          client_id: '1000.TJUP8N9JKBHXAA1Q8FOSLB5DAW8T3Q',
          client_secret: 'b7786316b5ef771e27f0c7956fb7b3d4524b05a5e3',
          // ✅ UPDATED: Points to NEW Render URL
          redirect_uri: 'https://smartdocs365-backend-v2.onrender.com/get-zoho-token',
          grant_type: 'authorization_code'
        }
      }
    );
    res.send(`<h1>Success!</h1><p>Refresh Token: ${response.data.refresh_token}</p>`);
  } catch (error) {
    res.send(`<h1>Error</h1><pre>${JSON.stringify(error.response?.data || error.message)}</pre>`);
  }
});

// ============================================
// API ROUTES
// ============================================

app.use("/api", require("./routes/handler"));
app.use('/import-excel-data', importExcelDataRoute);

// Error handler
app.use(errorHandler);

// Database connection
require("./middleware/db");

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log("✅ App is listening on port", PORT);
  console.log("✅ Subscription cron jobs loaded");
  console.log("🔧 Cron Route: /api/cron/trigger");
});
