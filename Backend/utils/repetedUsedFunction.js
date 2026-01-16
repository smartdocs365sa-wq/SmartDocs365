// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ ULTIMATE: Zoho Mail API (Port 443 - Always Works!)
// ============================================
const nodemailer = require("nodemailer");
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
   ✅ ZOHO MAIL API CONFIGURATION (Port 443 - Always Works!)
   ============================================================ */

// Zoho OAuth tokens
let zohoAccessToken = null;
let tokenExpiry = null;

// Get fresh access token
async function getZohoAccessToken() {
  // If token is still valid, return it
  if (zohoAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return zohoAccessToken;
  }

  // Refresh token
  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    });

    zohoAccessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early
    
    console.log('✅ Zoho API token refreshed');
    return zohoAccessToken;
  } catch (error) {
    console.error('❌ Failed to refresh Zoho token:', error.message);
    throw error;
  }
}

// Send email via Zoho Mail API
async function sendViaZohoAPI(mailOptions) {
  try {
    const accessToken = await getZohoAccessToken();
    
    // Get account ID (first time only)
    if (!global.zohoAccountId) {
      const accountsRes = await axios.get('https://mail.zoho.com/api/accounts', {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
      });
      global.zohoAccountId = accountsRes.data.data[0].accountId;
    }

    // Prepare recipients
    const toAddresses = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
    
    // Send email
    const emailData = {
      fromAddress: process.env.EMAIL_USER || 'Support@smartdocs365.com',
      toAddress: toAddresses.join(','),
      subject: mailOptions.subject,
      content: mailOptions.html || mailOptions.text,
      mailFormat: 'html'
    };

    await axios.post(
      `https://mail.zoho.com/api/accounts/${global.zohoAccountId}/messages`,
      emailData,
      {
        headers: { 
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Email sent via Zoho API to:', toAddresses.join(', '));
    return { success: true };
  } catch (error) {
    console.error('❌ Zoho API send failed:', error.response?.data || error.message);
    return { success: false, error };
  }
}

/* ============================================================
   FALLBACK: Gmail SMTP (if Zoho API not configured)
   ============================================================ */

const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'smartdocs365sa@gmail.com',
    pass: process.env.GMAIL_PASS,
  }
});

// Smart email sender - tries Zoho API first, falls back to Gmail
async function sendEmail(mailOptions) {
  // Add from address
  mailOptions.from = process.env.EMAIL_FROM || 
                    `SmartDocs365 Support <${process.env.EMAIL_USER || 'Support@smartdocs365.com'}>`;

  // Try Zoho API first (if configured)
  if (process.env.ZOHO_REFRESH_TOKEN) {
    const result = await sendViaZohoAPI(mailOptions);
    if (result.success) return result;
    
    console.log('🔄 Zoho API failed, trying Gmail fallback...');
  }

  // Fallback to Gmail SMTP
  try {
    const info = await gmailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent via Gmail:', info.response);
    return { success: true };
  } catch (error) {
    console.error('❌ Gmail also failed:', error.message);
    return { success: false };
  }
}

// Test on startup
setTimeout(async () => {
  if (process.env.ZOHO_REFRESH_TOKEN) {
    try {
      await getZohoAccessToken();
      console.log('✅ Zoho Mail API initialized');
    } catch (error) {
      console.log('⚠️ Zoho API not available, will use Gmail fallback');
    }
  } else {
    console.log('ℹ️ Zoho API not configured, using Gmail SMTP');
    gmailTransporter.verify((error) => {
      if (error) console.error('❌ Gmail connection failed:', error.message);
      else console.log('✅ Gmail SMTP ready');
    });
  }
}, 2000);

/* ============================================================
   EMAIL FUNCTIONS
   ============================================================ */

function sendWelcomeMail(email, name) {
  fs.readFile(welcomeMessageFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ Missing Template:", err);

    const renderedTemplate = template.replace("{{{ name }}}", name);

    await sendEmail({
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

    await sendEmail({
      to: email,
      subject: "⚠️ Action Required: Subscription Expiring Soon",
      html: renderedTemplate,
    });
  } catch (err) {
    console.error("❌ Template Error:", err.message);
  }
}

async function expiredPolicyMail(email, name, date, number, days) {
  try {
    const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, number, date, days });

    const recipients = [email];
    const yourEmail = process.env.EMAIL_USER || 'Support@smartdocs365.com';
    if (yourEmail && yourEmail !== email) {
      recipients.push(yourEmail);
    }

    await sendEmail({
      to: recipients,
      subject: `🔔 Policy Renewal Reminder - ${number}`,
      html: renderedTemplate,
    });
  } catch (err) {
    console.error("❌ Template Error:", err.message);
  }
}

function sendOtpCode(email, otpCode) {
  fs.readFile(sendOtpFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ Missing Template:", err);

    const renderedTemplate = template.replace("{{{ otpCode }}}", otpCode);

    await sendEmail({
      to: email,
      subject: "Your OTP Verification Code",
      html: renderedTemplate,
    });
  });
}

async function sendResetEmail(email, name, resetToken) {
  try {
    if (!fs.existsSync(ResetPasswordMail)) {
      console.error("❌ Template not found");
      return false;
    }

    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, resetToken, baseUrl });

    const result = await sendEmail({
      to: email,
      subject: 'Reset Your Password - SmartDocs365',
      html: renderedTemplate,
    });

    return result.success;
  } catch (error) {
    console.error('❌ Reset email failed:', error.message);
    return false;
  }
}

async function sendMailToSupportMail(payload) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric',
    });

    // Note: Attachments not supported in Zoho API, will use Gmail fallback
    const attachments = payload.file_name ? [{ filename: payload.file_name, path: payload.file_path }] : [];

    await sendEmail({
      from: payload?.email_address, 
      replyTo: payload?.email_address,
      to: process.env.EMAIL_USER || 'Support@smartdocs365.com',
      subject: 'New User Inquiry / Support Request',
      text: `Dear Support,\n\nDate: ${formattedDate}\nName: ${payload?.full_name}\nEmail: ${payload?.email_address}\nMobile: ${payload?.mobile}\n\nMessage:\n${payload?.description}\n`, 
      attachments: attachments,
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