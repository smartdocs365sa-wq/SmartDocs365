// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ ZOHO MAIL VIA HTTP API (INDIA DC FIXED)
// ============================================
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const Handlebars = require('handlebars');
const crypto = require('crypto');

// HTML Template Paths
const ResetPasswordMail = path.join(__dirname, "../html/", "ResetPasswordMail.html"); 
const welcomeMessageFile = path.join(__dirname, "../html/", "welcomeEmail.html");
const sendOtpFile = path.join(__dirname, "../html/", "otpMail.html");
const expiryMailFile = path.join(__dirname, "../html/", "expiryMail.html");
const expiryPolicyMailFile = path.join(__dirname, "../html/", "policyExpireMail.html");

const secretKey = process.env.SECRET_KEY || 'sdlfklfas6df5sd4fsdf5'; 
const algorithm = 'aes-256-cbc';
const baseUrl = "https://smartdocs365-backend.onrender.com/api/"; 

/* ============================================================
   ✅ ZOHO MAIL HTTP API (INDIA DC - .IN)
   Setup: https://www.zoho.com/mail/help/api/
   ============================================================ */

// Zoho OAuth Configuration
let zohoAccessToken = null;
let tokenExpiry = null;

// Get Zoho Access Token
async function getZohoToken() {
  // Return cached token if still valid
  if (zohoAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return zohoAccessToken;
  }

  // Refresh token - USING .IN (India)
  try {
    const response = await axios.post(
      'https://accounts.zoho.in/oauth/v2/token', // CHANGED TO .IN
      null,
      {
        params: {
          refresh_token: process.env.ZOHO_REFRESH_TOKEN,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: 'refresh_token'
        },
        timeout: 10000
      }
    );

    if (response.data.error) {
       throw new Error(response.data.error);
    }

    zohoAccessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    
    console.log('✅ Zoho token refreshed (India DC)');
    return zohoAccessToken;
  } catch (error) {
    console.error('❌ Zoho token refresh failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get Zoho Account ID (cached)
let zohoAccountId = null;
async function getZohoAccountId(token) {
  if (zohoAccountId) return zohoAccountId;

  try {
    const response = await axios.get(
      'https://mail.zoho.in/api/accounts', // CHANGED TO .IN
      {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        timeout: 10000
      }
    );
    
    zohoAccountId = response.data.data[0].accountId;
    console.log('✅ Zoho account ID retrieved:', zohoAccountId);
    return zohoAccountId;
  } catch (error) {
    console.error('❌ Failed to get Zoho account ID:', error.response?.data || error.message);
    throw error;
  }
}

// Send Email via Zoho Mail API
async function sendEmail(mailOptions) {
  // Check if Zoho is configured
  if (!process.env.ZOHO_REFRESH_TOKEN) {
    console.error('❌ ZOHO_REFRESH_TOKEN not set! Cannot send emails.');
    return { success: false, error: 'Zoho not configured' };
  }

  try {
    // Get access token
    const token = await getZohoToken();
    
    // Get account ID
    const accountId = await getZohoAccountId(token);
    
    // Prepare email data
    const toAddresses = Array.isArray(mailOptions.to) 
      ? mailOptions.to.join(',') 
      : mailOptions.to;

    const emailData = {
      fromAddress: process.env.EMAIL_USER || 'Support@smartdocs365.com',
      toAddress: toAddresses,
      subject: mailOptions.subject,
      content: mailOptions.html || mailOptions.text,
      mailFormat: 'html'
    };

    if (mailOptions.replyTo) {
      emailData.replyTo = mailOptions.replyTo;
    }

    // Send via Zoho API - USING .IN
    const response = await axios.post(
      `https://mail.zoho.in/api/accounts/${accountId}/messages`, // CHANGED TO .IN
      emailData,
      {
        headers: { 
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ Email sent via Zoho API to:', toAddresses);
    return { success: true, response: response.data };
    
  } catch (error) {
    console.error('❌ Zoho API error:', error.response?.data || error.message);
    return { success: false, error };
  }
}

// Rate-limited queue to prevent spam
let emailQueue = [];
let isProcessing = false;

async function sendEmailQueued(mailOptions) {
  return new Promise((resolve) => {
    emailQueue.push({ mailOptions, resolve });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessing || emailQueue.length === 0) return;
  
  isProcessing = true;
  
  while (emailQueue.length > 0) {
    const { mailOptions, resolve } = emailQueue.shift();
    
    const result = await sendEmail(mailOptions);
    resolve(result);
    
    // Wait 2 seconds between emails
    if (emailQueue.length > 0) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  isProcessing = false;
}

// Initialize on startup
setTimeout(async () => {
  if (process.env.ZOHO_REFRESH_TOKEN) {
    try {
      await getZohoToken();
      console.log('✅ Zoho Mail API ready (India DC - Render compatible)');
    } catch (error) {
      console.error('⚠️ Zoho API initialization failed. Check credentials.');
    }
  } else {
    console.log('⚠️ Zoho not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN');
  }
}, 2000);

/* ============================================================
   EMAIL FUNCTIONS
   ============================================================ */

function sendWelcomeMail(email, name) {
  fs.readFile(welcomeMessageFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ Template missing:", err);

    const renderedTemplate = template.replace("{{{ name }}}", name);

    await sendEmailQueued({
      to: email,
      subject: "Welcome to SmartDocs365!",
      html: renderedTemplate,
    });
  });
}

async function expiredMail(email, name, date) {
  try {
    const templateData = fs.readFileSync(expiryMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, date });

    await sendEmailQueued({
      to: email,
      subject: "⚠️ Subscription Expiring Soon",
      html: renderedTemplate,
    });
  } catch (err) {
    console.error("❌ Template error:", err.message);
  }
}

async function expiredPolicyMail(email, name, date, number, days) {
  try {
    const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, number, date, days });

    // Send to customer
    console.log(`📧 Sending to customer: ${email}`);
    await sendEmailQueued({
      to: email,
      subject: `🔔 Policy Renewal Reminder - ${number}`,
      html: renderedTemplate,
    });

    // Send copy to you
    const yourEmail = process.env.EMAIL_USER || 'Support@smartdocs365.com';
    if (yourEmail !== email) {
      console.log(`📧 Sending copy to: ${yourEmail}`);
      await sendEmailQueued({
        to: yourEmail,
        subject: `🔔 [Copy] Policy Renewal - ${number}`,
        html: renderedTemplate,
      });
    }
  } catch (err) {
    console.error("❌ Template error:", err.message);
  }
}

function sendOtpCode(email, otpCode) {
  fs.readFile(sendOtpFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ OTP template missing:", err);

    const renderedTemplate = template.replace("{{{ otpCode }}}", otpCode);

    await sendEmailQueued({
      to: email,
      subject: "Your OTP Verification Code",
      html: renderedTemplate,
    });
  });
}

async function sendResetEmail(email, name, resetToken) {
  try {
    if (!fs.existsSync(ResetPasswordMail)) {
      console.error("❌ Reset template missing");
      return false;
    }

    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, resetToken, baseUrl });

    const result = await sendEmailQueued({
      to: email,
      subject: 'Reset Your Password - SmartDocs365',
      html: renderedTemplate,
    });
    
    return result.success;
  } catch (error) {
    console.error('❌ Reset email error:', error.message);
    return false;
  }
}

async function sendMailToSupportMail(payload) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric',
    });

    const supportEmail = process.env.EMAIL_USER || 'Support@smartdocs365.com';

    await sendEmailQueued({
      to: supportEmail,
      replyTo: payload?.email_address,
      subject: 'New User Inquiry',
      html: `
        <h2>New Support Request</h2>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Name:</strong> ${payload?.full_name}</p>
        <p><strong>Email:</strong> ${payload?.email_address}</p>
        <p><strong>Mobile:</strong> ${payload?.mobile}</p>
        <h3>Message:</h3>
        <p>${payload?.description}</p>
      `
    });
}

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

function addDaysToCurrentDate(days) {
  const currentDate = new Date();
  const estOffset = -5 * 60 * 60 * 1000;
  const estDate = new Date(currentDate.getTime() + estOffset);
  estDate.setDate(estDate.getDate() + days);
  
  const year = estDate.getFullYear();
  const month = (estDate.getMonth() + 1).toString().padStart(2, '0');
  const day = estDate.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentDateTime() {
  const now = new Date();
  const estTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  
  const dateString = estTime.toISOString().split('T')[0];
  const timeString = estTime.toTimeString().split(' ')[0];
  
  return { dateString, timeString, dateAndTimeString: `${dateString} ${timeString}` };
}

function namingValidation(str) { return /^[a-zA-Z\s]+$/.test(str); }
function isEmailValid(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function getOffset(currentPage = 1, listPerPage) { return (currentPage - 1) * listPerPage; }
function emptyOrRows(rows) { return !rows ? [] : rows; }

const encryptData = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let inputData = typeof data !== 'string' ? JSON.stringify(data) : data;
  let encryptedData = cipher.update(inputData, 'utf-8', 'hex');
  encryptedData += cipher.final('hex');
  return { iv: iv.toString('hex'), encryptedData };
};

const decryptData = (data) => {
  const {iv, encryptedData} = data;
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv, 'hex'));
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf-8');
  decryptedData += decipher.final('utf-8');
  try { return JSON.parse(decryptedData); } catch (e) { return decryptedData; }
};

function validateZIPCode(zip) { return /^\d{5}$/.test(zip); }

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error deleting file: ${err.message}`);
    return false;
  }
}

function priceBreakDown(price, zip) {
  let zipCode = (zip || "23123").toString();
  let firstChar = zipCode.charAt(0);
  let shippingCost = 30;
  
  if (['2','3'].includes(firstChar)) shippingCost = 40;
  else if (['4','5'].includes(firstChar)) shippingCost = 50;
  else if (['6','7'].includes(firstChar)) shippingCost = 60;
  else if (['8','9'].includes(firstChar)) shippingCost = 70;

  let demandeyCharges = +price * 0.07;
  let processingFee = (+price * 0.0075) + 0.10;
  let stateTax = +price * 0.0625;
  let actualTotal = +price + shippingCost + demandeyCharges + stateTax + processingFee;

  return {
    shippingCost: shippingCost.toFixed(2),
    demandeyCharges: demandeyCharges.toFixed(2),
    stateTax: stateTax.toFixed(2),
    processingFee: processingFee.toFixed(2),
    actualTotal: actualTotal.toFixed(2)
  };
}

function validateCardNumber(num) {
  let s = num.replace(/\D/g, '');
  if (!/^\d{13,16}$/.test(s)) return false;
  let sum = 0, isEven = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = parseInt(s.charAt(i), 10);
    if (isEven && (d *= 2) > 9) d -= 9;
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function isFutureDate(cardDate) {
  const [m, y] = cardDate.split('/').map(n => parseInt(n, 10));
  const now = new Date();
  const curY = now.getFullYear() % 100;
  const curM = now.getMonth() + 1;
  return y > curY || (y === curY && m > curM);
}

function isValidDate(d) { return !isNaN(Date.parse(d)); }

module.exports = {
  getCurrentDateTime, namingValidation, isEmailValid, getOffset, emptyOrRows,
  sendWelcomeMail, encryptData, decryptData, validateZIPCode, deleteFile,
  addDaysToCurrentDate, priceBreakDown, sendResetEmail, validateCardNumber,
  isFutureDate, isValidDate, sendOtpCode, expiredMail, expiredPolicyMail,
  sendMailToSupportMail
};