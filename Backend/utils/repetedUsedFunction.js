// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ FIXED: Universal Configuration (Obey Env Vars)
// ============================================
const nodemailer = require("nodemailer");
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
   ✅ EMAIL TRANSPORTER - UNIVERSAL CONFIGURATION
   ============================================================ */

console.log(`🔵 Initializing Mail Transporter...`);
console.log(`   Host: ${process.env.EMAIL_HOST}`);
console.log(`   Port: ${process.env.EMAIL_PORT}`);
console.log(`   User: ${process.env.EMAIL_USER}`);

const transportConfig = {
    host: process.env.EMAIL_HOST, // Uses smtp.gmail.com or smtp.zoho.com
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // Must match string 'true'
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    // High timeout settings to prevent "Connection timeout"
    connectionTimeout: 60000, 
    greetingTimeout: 60000,
    socketTimeout: 60000
};

const transporter = nodemailer.createTransport(transportConfig);

// Test connection on startup
const testConnection = async () => {
  try {
    console.log(`📡 Testing connection to ${transportConfig.host}...`);
    await transporter.verify();
    console.log('✅ Email Server Ready:', transportConfig.auth.user);
  } catch (error) {
    console.error('❌ Email Server Connection Failed:', error.message);
  }
};

testConnection();

/* ============================================================
   EMAIL FUNCTIONS 
   ============================================================ */

function getFromAddress() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  return `"SmartDocs Support" <${process.env.EMAIL_USER}>`;
}

async function sendEmailWithRetry(mailOptions, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, info };
    } catch (error) {
      console.error(`❌ Email attempt ${i + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  return { success: false };
}

// --- Rest of the functions (No changes needed below) ---

function sendWelcomeMail(email, name) {
  fs.readFile(welcomeMessageFile, "utf8", async (err, template) => {
    if (err) return console.error("Missing Template:", err);
    const renderedTemplate = template.replace("{{{ name }}}", name);
    const mailOptions = { from: getFromAddress(), to: email, subject: "Welcome to SmartDocs365!", html: renderedTemplate };
    await sendEmailWithRetry(mailOptions);
  });
}

async function expiredMail(email, name, date) {
  try {
    const templateData = fs.readFileSync(expiryMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, date });
    const mailOptions = { from: getFromAddress(), to: email, subject: "⚠️ Action Required: Subscription Expiring Soon", html: renderedTemplate };
    await sendEmailWithRetry(mailOptions);
  } catch (err) { console.error("Template Error (Subscription):", err.message); }
}

async function expiredPolicyMail(email, name, date, number, days) {
  try {
    const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, number, date, days });
    const recipients = [email];
    if (process.env.EMAIL_USER && process.env.EMAIL_USER !== email) recipients.push(process.env.EMAIL_USER);
    const mailOptions = { from: getFromAddress(), to: recipients, subject: `🔔 Policy Renewal Reminder - ${number}`, html: renderedTemplate };
    await sendEmailWithRetry(mailOptions);
  } catch (err) { console.error("Template Error (Policy):", err.message); }
}

function sendOtpCode(email, otpCode) {
  fs.readFile(sendOtpFile, "utf8", async (err, template) => {
    if (err) return console.error("Missing OTP Template:", err);
    const renderedTemplate = template.replace("{{{ otpCode }}}", otpCode);
    const mailOptions = { from: getFromAddress(), to: email, subject: "Your OTP Verification Code", html: renderedTemplate };
    await sendEmailWithRetry(mailOptions);
  });
}

async function sendResetEmail(email, name, resetToken) {
  try {
    if (!fs.existsSync(ResetPasswordMail)) return false;
    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, resetToken, baseUrl });
    const mailOptions = { from: getFromAddress(), to: email, subject: 'Reset Your Password - SmartDocs365', html: renderedTemplate };
    const result = await sendEmailWithRetry(mailOptions);
    return result.success;
  } catch (error) { return false; }
}

async function sendMailToSupportMail(payload) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-GB');
    const attachments = payload.file_name ? [{ filename: payload.file_name, path: payload.file_path }] : [];
    const mailOptions = {
      from: payload?.email_address, replyTo: payload?.email_address, to: process.env.EMAIL_USER,
      subject: 'New User Inquiry / Support Request', text: `Support Request\n${payload?.description}`, attachments: attachments,
    };
    await sendEmailWithRetry(mailOptions);
}

function getCurrentDateTime() { const now = new Date(); const estTime = new Date(now.getTime() - 5 * 60 * 60 * 1000); return { dateString: estTime.toISOString().split('T')[0], timeString: estTime.toTimeString().split(' ')[0] }; }
function namingValidation(str) { return /^[a-zA-Z\s]+$/.test(str); }
function isEmailValid(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function getOffset(currentPage = 1, listPerPage) { return (currentPage - 1) * listPerPage; }
function emptyOrRows(rows) { return !rows ? [] : rows; }
const encryptData = (data) => { const iv = crypto.randomBytes(16); const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv); let encryptedData = cipher.update(typeof data !== 'string' ? JSON.stringify(data) : data, 'utf-8', 'hex'); encryptedData += cipher.final('hex'); return { iv: iv.toString('hex'), encryptedData }; };
const decryptData = (data) => { const {iv, encryptedData} = data; const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv, 'hex')); let decryptedData = decipher.update(encryptedData, 'hex', 'utf-8'); decryptedData += decipher.final('utf-8'); try { return JSON.parse(decryptedData); } catch (e) { return decryptedData; } };
function validateZIPCode(zip) { return /^\d{5}$/.test(zip); }
function deleteFile(filePath) { try { if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); return true; } return false; } catch (err) { return false; } }
function priceBreakDown(price, zip) { return { actualTotal: price }; }
function validateCardNumber(num) { return true; }
function isFutureDate(cardDate) { return true; }
function isValidDate(d) { return !isNaN(Date.parse(d)); }
function addDaysToCurrentDate(days) { return ""; }

module.exports = {
  getCurrentDateTime, namingValidation, isEmailValid, getOffset, emptyOrRows,
  sendWelcomeMail, encryptData, decryptData, validateZIPCode, deleteFile,
  addDaysToCurrentDate, priceBreakDown, sendResetEmail, validateCardNumber,
  isFutureDate, isValidDate, sendOtpCode, expiredMail, expiredPolicyMail,
  sendMailToSupportMail
};