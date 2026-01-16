// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ FIXED: Multiple SMTP Fallback + Better Error Handling
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
   ✅ EMAIL TRANSPORTER - SMART CONFIGURATION
   ============================================================ */

// Determine best SMTP config based on available credentials
let transportConfig;

if (process.env.EMAIL_HOST === 'smtp.zoho.com' || process.env.EMAIL_HOST === 'smtp.zoho.in') {
  // Zoho Configuration
  transportConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
  };
} else {
  // Gmail Fallback Configuration
  transportConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'smartdocs365sa@gmail.com',
      pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  };
}

const transporter = nodemailer.createTransport(transportConfig);

// Test connection on startup with timeout
const testConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email Server Ready:', transportConfig.auth?.user || transportConfig.service);
  } catch (error) {
    console.error('❌ Email Server Connection Failed:', error.message);
    console.log('⚠️ Emails will fail until SMTP is configured correctly');
  }
};

// Run test with timeout
Promise.race([
  testConnection(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 5000))
]).catch(err => console.log('⏱️ Email server test timed out -', err.message));

/* ============================================================
   EMAIL FUNCTIONS WITH RETRY LOGIC
   ============================================================ */

// Helper to get correct "from" address
function getFromAddress() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.EMAIL_USER) return `"SmartDocs365" <${process.env.EMAIL_USER}>`;
  if (process.env.GMAIL_USER) return `"SmartDocs365" <${process.env.GMAIL_USER}>`;
  return '"SmartDocs365" <smartdocs365sa@gmail.com>';
}

async function sendEmailWithRetry(mailOptions, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, info };
    } catch (error) {
      console.error(`❌ Email attempt ${i + 1} failed:`, error.message);
      if (i === maxRetries - 1) {
        return { success: false, error };
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

function sendWelcomeMail(email, name) {
  fs.readFile(welcomeMessageFile, "utf8", async (err, template) => {
    if (err) return console.error("Missing Template:", err);

    const renderedTemplate = template.replace("{{{ name }}}", name);

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: "Welcome to SmartDocs365!",
      html: renderedTemplate,
    };

    const result = await sendEmailWithRetry(mailOptions);
    if (result.success) {
      console.log("✅ Welcome Email sent:", result.info.response);
    } else {
      console.error("❌ Failed to send Welcome email after retries");
    }
  });
}

// ✅ SUBSCRIBER Subscription Expiry
async function expiredMail(email, name, date) {
  try {
    const templateData = fs.readFileSync(expiryMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, date });

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: "⚠️ Action Required: Subscription Expiring Soon",
      html: renderedTemplate,
    };

    const result = await sendEmailWithRetry(mailOptions);
    if (result.success) {
      console.log("✅ Subscription Expiry Email sent:", result.info.response);
    } else {
      console.error("❌ Failed to send Subscription Expiry email");
    }
  } catch (err) {
    console.error("Template Error (Subscription Expiry):", err.message);
  }
}

// ✅ CUSTOMER Policy Expiry
async function expiredPolicyMail(email, name, date, number, days) {
  try {
    const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, number, date, days });

    const recipients = [email];
    // Add your email if it exists and is different
    const yourEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;
    if (yourEmail && yourEmail !== email) {
      recipients.push(yourEmail);
    }

    const mailOptions = {
      from: getFromAddress(),
      to: recipients,
      subject: `🔔 Policy Renewal Reminder - ${number}`,
      html: renderedTemplate,
    };

    const result = await sendEmailWithRetry(mailOptions);
    if (result.success) {
      console.log("✅ Policy Expiry Email sent to:", recipients.join(', '));
    } else {
      console.error("❌ Failed to send Policy Expiry email");
    }
  } catch (err) {
    console.error("Template Error (Policy Expiry):", err.message);
  }
}

function sendOtpCode(email, otpCode) {
  fs.readFile(sendOtpFile, "utf8", async (err, template) => {
    if (err) return console.error("Missing OTP Template:", err);

    const renderedTemplate = template.replace("{{{ otpCode }}}", otpCode);

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: "Your OTP Verification Code",
      html: renderedTemplate,
    };

    const result = await sendEmailWithRetry(mailOptions);
    if (result.success) {
      console.log("✅ OTP Email sent:", result.info.response);
    } else {
      console.error("❌ Failed to send OTP email");
    }
  });
}

// ✅ Password Reset Email
async function sendResetEmail(email, name, resetToken) {
  try {
    console.log(`Attempting to send reset email to: ${email}`);
    
    if (!fs.existsSync(ResetPasswordMail)) {
      console.error("CRITICAL: ResetPasswordMail.html not found at", ResetPasswordMail);
      return false;
    }

    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, resetToken, baseUrl });

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: 'Reset Your Password - SmartDocs365',
      html: renderedTemplate,
    };

    const result = await sendEmailWithRetry(mailOptions);
    if (result.success) {
      console.log('✅ Reset Email sent successfully:', result.info.response);
      return true;
    } else {
      console.error('❌ Failed to send reset email after retries');
      return false;
    }
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
      to: process.env.EMAIL_USER || process.env.GMAIL_USER,
      subject: 'New User Inquiry / Support Request',
      text: `Dear Support,\n\nDate: ${formattedDate}\nName: ${payload?.full_name}\nEmail: ${payload?.email_address}\nMobile: ${payload?.mobile}\n\nMessage:\n${payload?.description}\n`, 
      attachments: attachments,
    };

    const result = await sendEmailWithRetry(mailOptions);
    if (result.success) {
      console.log("✅ Support Email sent:", result.info.response);
    } else {
      console.error("❌ Failed to send Support email");
    }
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