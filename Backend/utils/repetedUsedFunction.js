// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ BEST FIX: Zoho Multi-Server with Auto-Retry
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
   ✅ ZOHO MULTI-SERVER CONFIGURATION
   ============================================================ */

// Multiple Zoho SMTP configurations to try
const zohoConfigs = [
  {
    name: 'Zoho India Primary',
    host: 'smtp.zoho.in',
    port: 587,
    secure: false
  },
  {
    name: 'Zoho India SSL',
    host: 'smtp.zoho.in',
    port: 465,
    secure: true
  },
  {
    name: 'Zoho Global TLS',
    host: 'smtp.zoho.com',
    port: 587,
    secure: false
  },
  {
    name: 'Zoho Global SSL',
    host: 'smtp.zoho.com',
    port: 465,
    secure: true
  },
  {
    name: 'Zoho Alternate Port',
    host: 'smtp.zoho.com',
    port: 25,
    secure: false
  }
];

// Create transporter with current config
let currentConfigIndex = 0;
let transporter;

function createTransporter(configIndex = 0) {
  const config = zohoConfigs[configIndex];
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: process.env.EMAIL_USER || 'Support@smartdocs365.com',
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
      ciphers: 'SSLv3'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    logger: false, // Disable verbose logging
    debug: false
  });
}

// Initialize with first config
transporter = createTransporter(0);

// Test all configurations on startup
async function testAllConfigs() {
  console.log('🔍 Testing Zoho SMTP configurations...');
  
  for (let i = 0; i < zohoConfigs.length; i++) {
    const config = zohoConfigs[i];
    const testTransporter = createTransporter(i);
    
    try {
      await testTransporter.verify();
      console.log(`✅ ${config.name} (${config.host}:${config.port}) - WORKING!`);
      currentConfigIndex = i;
      transporter = testTransporter;
      return true;
    } catch (error) {
      console.log(`❌ ${config.name} - Failed: ${error.message}`);
    }
  }
  
  console.error('⚠️ All Zoho SMTP configs failed. Emails may not work.');
  return false;
}

// Run test after 2 seconds
setTimeout(() => {
  testAllConfigs().then(success => {
    if (success) {
      console.log(`📧 Using: ${zohoConfigs[currentConfigIndex].name}`);
    }
  });
}, 2000);

/* ============================================================
   SMART EMAIL SENDER WITH AUTO-RETRY
   ============================================================ */

async function sendEmailWithRetry(mailOptions, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add from address
      mailOptions.from = process.env.EMAIL_FROM || 
                        `SmartDocs365 Support <${process.env.EMAIL_USER || 'Support@smartdocs365.com'}>`;
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent via ${zohoConfigs[currentConfigIndex].name}:`, info.messageId);
      return { success: true, info };
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
      
      // Try next config on failure
      if (attempt < maxRetries - 1) {
        currentConfigIndex = (currentConfigIndex + 1) % zohoConfigs.length;
        transporter = createTransporter(currentConfigIndex);
        console.log(`🔄 Retrying with ${zohoConfigs[currentConfigIndex].name}...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      }
    }
  }
  
  console.error('❌ All email attempts failed');
  return { success: false };
}

/* ============================================================
   EMAIL FUNCTIONS
   ============================================================ */

function sendWelcomeMail(email, name) {
  fs.readFile(welcomeMessageFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ Missing Template:", err);

    const renderedTemplate = template.replace("{{{ name }}}", name);

    const mailOptions = {
      to: email,
      subject: "Welcome to SmartDocs365!",
      html: renderedTemplate,
    };

    await sendEmailWithRetry(mailOptions);
  });
}

// ✅ SUBSCRIBER Subscription Expiry
async function expiredMail(email, name, date) {
  try {
    const templateData = fs.readFileSync(expiryMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, date });

    const mailOptions = {
      to: email,
      subject: "⚠️ Action Required: Subscription Expiring Soon",
      html: renderedTemplate,
    };

    await sendEmailWithRetry(mailOptions);
  } catch (err) {
    console.error("❌ Template Error (Subscription Expiry):", err.message);
  }
}

// ✅ CUSTOMER Policy Expiry (Send to customer + you)
async function expiredPolicyMail(email, name, date, number, days) {
  try {
    const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, number, date, days });

    // Send to customer
    console.log(`📧 Sending Policy Expiry to Customer: ${email}`);
    await sendEmailWithRetry({
      to: email,
      subject: `🔔 Policy Renewal Reminder - ${number}`,
      html: renderedTemplate,
    });

    // Send copy to you (Support)
    const yourEmail = process.env.EMAIL_USER || 'Support@smartdocs365.com';
    if (yourEmail !== email) {
      console.log(`📧 Sending Policy Expiry copy to: ${yourEmail}`);
      await sendEmailWithRetry({
        to: yourEmail,
        subject: `🔔 [Copy] Policy Renewal Reminder - ${number}`,
        html: renderedTemplate,
      });
    }
  } catch (err) {
    console.error("❌ Template Error (Policy Expiry):", err.message);
  }
}

function sendOtpCode(email, otpCode) {
  fs.readFile(sendOtpFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ Missing OTP Template:", err);

    const renderedTemplate = template.replace("{{{ otpCode }}}", otpCode);

    const mailOptions = {
      to: email,
      subject: "Your OTP Verification Code",
      html: renderedTemplate,
    };

    await sendEmailWithRetry(mailOptions);
  });
}

// ✅ Password Reset Email
async function sendResetEmail(email, name, resetToken) {
  try {
    console.log(`📧 Attempting to send reset email to: ${email}`);
    
    if (!fs.existsSync(ResetPasswordMail)) {
      console.error("❌ CRITICAL: ResetPasswordMail.html not found");
      return false;
    }

    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, resetToken, baseUrl });

    const mailOptions = {
      to: email,
      subject: 'Reset Your Password - SmartDocs365',
      html: renderedTemplate,
    };

    const result = await sendEmailWithRetry(mailOptions);
    return result.success;
  } catch (error) {
    console.error('❌ Failed to send reset email:', error);
    return false;
  }
}

async function sendMailToSupportMail(payload) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric',
    });

    const attachments = payload.file_name ? [{ filename: payload.file_name, path: payload.file_path }] : [];

    const mailOptions = {
      from: payload?.email_address, 
      replyTo: payload?.email_address,
      to: process.env.EMAIL_USER || 'Support@smartdocs365.com',
      subject: 'New User Inquiry / Support Request',
      text: `Dear Support,\n\nDate: ${formattedDate}\nName: ${payload?.full_name}\nEmail: ${payload?.email_address}\nMobile: ${payload?.mobile}\n\nMessage:\n${payload?.description}\n`, 
      attachments: attachments,
    };

    await sendEmailWithRetry(mailOptions);
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