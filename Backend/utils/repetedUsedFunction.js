// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ FIXED: Uses Gmail Environment Variables
// ============================================
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const Handlebars = require('handlebars');
const crypto = require('crypto');

// HTML Template Paths
const welcomeMessageFile = path.join(__dirname, "../html/", "welcomeEmail.html");
const ResetPasswordMail = path.join(__dirname, "../html/", "ResetPasswordMail.html");
const sendOtpFile = path.join(__dirname, "../html/", "otpMail.html");
const expiryMailFile = path.join(__dirname, "../html/", "expiryMail.html");
const expiryPolicyMailFile = path.join(__dirname, "../html/", "policyExpireMail.html");

const secretKey = process.env.SECRET_KEY || 'sdlfklfas6df5sd4fsdf5'; // Fallback key if env missing
const algorithm = 'aes-256-cbc';
const baseUrl = "https://smartdocs365-backend.onrender.com/api/"; // ✅ Updated to Render URL

/* ============================================================
   ✅ EMAIL TRANSPORTER (Uses Render Env Variables)
   ============================================================ */
const transporter = nodemailer.createTransport({
  service: 'gmail', // Built-in support for Gmail
  auth: {
    user: process.env.GMAIL_USER, // e.g. sivamec24@gmail.com
    pass: process.env.GMAIL_PASS, // e.g. xxxx xxxx xxxx xxxx (App Password)
  },
});

/* ============================================================
   EMAIL FUNCTIONS
   ============================================================ */

function sendWelcomeMail(email, name) {
  fs.readFile(welcomeMessageFile, "utf8", (err, template) => {
    if (err) return console.error("Missing Template:", err);

    const renderedTemplate = template.replace("{{{ name }}}", name);

    const mailOptions = {
      from: `"SmartDocs365" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Welcome to SmartDocs365!",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Error sending Welcome email:", error);
      else console.log("Welcome Email sent:", info.response);
    });
  });
}

function expiredMail(email, name, date) {
  try {
    const templateData = fs.readFileSync(expiryMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, date });

    const mailOptions = {
      from: `"SmartDocs365" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Action Required: Subscription Expiring Soon",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Error sending Expiry email:", error);
      else console.log("Expiry Email sent:", info.response);
    });
  } catch (err) {
    console.error("Template Error (Expiry):", err.message);
  }
}

function expiredPolicyMail(email, name, date, number, days) {
  try {
    const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, number, date, days });

    const mailOptions = {
      from: `"SmartDocs365" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Policy Expiry Alert - SmartDocs365",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Error sending Policy Expiry email:", error);
      else console.log("Policy Expiry Email sent:", info.response);
    });
  } catch (err) {
    console.error("Template Error (Policy Expiry):", err.message);
  }
}

function sendOtpCode(email, otpCode) {
  fs.readFile(sendOtpFile, "utf8", (err, template) => {
    if (err) return console.error("Missing OTP Template:", err);

    const renderedTemplate = template.replace("{{{ otpCode }}}", otpCode);

    const mailOptions = {
      from: `"SmartDocs365 Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP Verification Code",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Error sending OTP:", error);
      else console.log("OTP Email sent:", info.response);
    });
  });
}

// ✅ FIXED: Async/Await logic for Password Reset
async function sendResetEmail(email, name, resetToken) {
  try {
    console.log(`Attempting to send reset email to: ${email}`);
    
    // Check if template exists
    if (!fs.existsSync(ResetPasswordMail)) {
      console.error("CRITICAL: ResetPasswordMail.html not found at", ResetPasswordMail);
      return false;
    }

    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');
    const template = Handlebars.compile(templateData);
    
    // Render with dynamic data
    const renderedTemplate = template({ name, resetToken, baseUrl });

    const mailOptions = {
      from: `"SmartDocs365 Support" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: renderedTemplate,
    };

    // Send
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Reset Email sent successfully:', info.response);
    return true; 

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
      from: payload?.email_address, // User's email as sender (might be blocked by Gmail, better to put in replyTo)
      replyTo: payload?.email_address,
      to: process.env.GMAIL_USER, // Send to yourself (Support)
      subject: 'New User Inquiry / Support Request',
      text: `Dear Support,\n\nDate: ${formattedDate}\nName: ${payload?.full_name}\nEmail: ${payload?.email_address}\nMobile: ${payload?.mobile}\n\nMessage:\n${payload?.description}\n`, 
      attachments: attachments,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Error sending Support email:", error);
      else console.log("Support Email sent:", info.response);
    });
}

/* ============================================================
   HELPER FUNCTIONS (Date, Encryption, Validation)
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
function getOffset(currentPage = 1, listPerPage) { return (currentPage - 1) * listPerPage; } // Fixed array bracket issue
function emptyOrRows(rows) { return !rows ? [] : rows; }

// Encrypt / Decrypt
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