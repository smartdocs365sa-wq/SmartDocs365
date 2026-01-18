// ============================================
// FILE: Backend/app.js
// ✅ COMPLETE: Fixed CORS with regex support for Vercel
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

// ✅ Import subscription cron (it has its own cron.schedule inside)
require("./subscriptionCron");

// App setup
const app = express();
const PORT = process.env.PORT || 3033;

// ============================================
// ✅ FIXED: CORS Configuration with Regex Support
// ============================================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origins (string or regex)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      // If it's a regex pattern
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
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zoho Mail Setup - SmartDocs365</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 600px;
              width: 100%;
            }
            h1 {
              color: #333;
              font-size: 28px;
              margin-bottom: 10px;
            }
            .subtitle {
              color: #666;
              font-size: 16px;
              margin-bottom: 30px;
            }
            .step {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 20px;
              border-left: 4px solid #667eea;
            }
            .step-number {
              background: #667eea;
              color: white;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              margin-right: 10px;
            }
            .btn {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 16px 40px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              margin-top: 20px;
              transition: transform 0.2s, box-shadow 0.2s;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            .note {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 15px;
              border-radius: 10px;
              margin-top: 30px;
              font-size: 14px;
              color: #856404;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📧 Zoho Mail Setup</h1>
            <p class="subtitle">Configure Zoho Mail API for SmartDocs365</p>
            
            <div class="step">
              <span class="step-number">1</span>
              <strong>Click the button to authorize Zoho</strong>
              <p style="margin-top: 10px; color: #666; font-size: 14px;">
                You'll be redirected to Zoho's secure login
              </p>
            </div>
            
            <div class="step">
              <span class="step-number">2</span>
              <strong>Grant email permissions</strong>
              <p style="margin-top: 10px; color: #666; font-size: 14px;">
                Allow SmartDocs365 to send emails
              </p>
            </div>
            
            <div class="step">
              <span class="step-number">3</span>
              <strong>Copy your refresh token</strong>
              <p style="margin-top: 10px; color: #666; font-size: 14px;">
                Save it to Render environment
              </p>
            </div>
            
            <center>
              <a href="https://accounts.zoho.in/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ&client_id=1000.TJUP8N9JKBHXAA1Q8FOSLB5DAW8T3Q&response_type=code&access_type=offline&redirect_uri=https://smartdocs365-backend.onrender.com/get-zoho-token" class="btn">
                🚀 Authorize Zoho Mail
              </a>
            </center>
            
            <div class="note">
              <strong>⚠️ Important:</strong> Complete within 60 seconds after clicking authorize.
            </div>
          </div>
        </body>
      </html>
    `);
  }

  // Step 2: Exchange code for refresh token
  try {
    console.log('🔧 Exchanging authorization code...');
    
    const response = await axios.post(
      'https://accounts.zoho.in/oauth/v2/token',
      null,
      {
        params: {
          code: code,
          client_id: '1000.TJUP8N9JKBHXAA1Q8FOSLB5DAW8T3Q',
          client_secret: 'b7786316b5ef771e27f0c7956fb7b3d4524b05a5e3',
          redirect_uri: 'https://smartdocs365-backend.onrender.com/get-zoho-token',
          grant_type: 'authorization_code'
        }
      }
    );

    console.log('✅ Refresh token generated!');

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Success - Zoho Mail Connected</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 900px;
              margin: 40px auto;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              padding: 40px;
              text-align: center;
            }
            .content {
              padding: 40px;
            }
            .token-box {
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              border-radius: 10px;
              padding: 20px;
              font-family: 'Courier New', monospace;
              font-size: 13px;
              word-break: break-all;
              margin: 15px 0;
            }
            .copy-btn {
              background: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              margin-top: 10px;
            }
            .copy-btn:hover { background: #0056b3; }
            .instructions {
              background: #e7f3ff;
              border-left: 4px solid #007bff;
              padding: 20px;
              border-radius: 10px;
              margin-top: 30px;
            }
            .instructions ol {
              margin-left: 20px;
              color: #004085;
            }
            .instructions li {
              margin: 10px 0;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
              <h1>Zoho Mail Connected!</h1>
              <p>Your refresh token is ready</p>
            </div>
            
            <div class="content">
              <h2 style="margin-bottom: 15px;">📋 Your Refresh Token:</h2>
              <div class="token-box" id="refreshToken">${response.data.refresh_token}</div>
              <button class="copy-btn" onclick="copy('refreshToken', this)">📋 Copy Token</button>
              
              <h2 style="margin: 30px 0 15px 0;">🔧 Environment Variables:</h2>
              <div class="token-box" id="envVars">ZOHO_CLIENT_ID=1000.TJUP8N9JKBHXAA1Q8FOSLB5DAW8T3Q
ZOHO_CLIENT_SECRET=b7786316b5ef771e27f0c7956fb7b3d4524b05a5e3
ZOHO_REFRESH_TOKEN=${response.data.refresh_token}
EMAIL_USER=Support@smartdocs365.com</div>
              <button class="copy-btn" onclick="copy('envVars', this)">📋 Copy All</button>
              
              <div class="instructions">
                <h3 style="color: #004085; margin-bottom: 15px;">🚀 Next Steps:</h3>
                <ol>
                  <li>Go to <strong>Render Dashboard</strong> → <strong>Environment</strong></li>
                  <li>Click "Copy All" button above</li>
                  <li>Add each variable (one per line)</li>
                  <li>Click <strong>"Save Changes"</strong></li>
                  <li>Wait 2-3 minutes for redeploy</li>
                  <li>Test by registering a user!</li>
                </ol>
              </div>
            </div>
          </div>
          
          <script>
            function copy(id, btn) {
              const text = document.getElementById(id).innerText;
              navigator.clipboard.writeText(text).then(() => {
                const orig = btn.innerText;
                btn.innerText = '✅ Copied!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                  btn.innerText = orig;
                  btn.style.background = '#007bff';
                }, 2000);
              });
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Token error:', error.response?.data || error.message);
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Error - Token Failed</title>
          <style>
            body { 
              font-family: Arial; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              max-width: 700px;
            }
            h1 { color: #dc3545; }
            .error { 
              background: #f8d7da; 
              border: 2px solid #dc3545; 
              padding: 20px; 
              border-radius: 10px; 
              margin: 20px 0;
              font-family: monospace;
              overflow: auto;
            }
            .tip {
              background: #fff3cd;
              padding: 15px;
              margin-top: 20px;
              border-radius: 5px;
            }
            .btn {
              display: inline-block;
              background: #007bff;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Token Generation Failed</h1>
            <div class="error"><pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre></div>
            
            <div class="tip">
              <strong>💡 Common Issues:</strong>
              <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Code expired (60 second timeout)</li>
                <li>Code already used</li>
                <li>Network issue</li>
              </ul>
            </div>
            
            <center><a href="/get-zoho-token" class="btn">🔄 Try Again</a></center>
          </div>
        </body>
      </html>
    `);
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
  console.log("🔧 Zoho OAuth: /get-zoho-token");
});