// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ FINAL SOLUTION: Resend API (Port 443 - Always Works!)
// ============================================
const path = require("path");
const fs = require("fs");
const Handlebars = require('handlebars');
const crypto = require('crypto');

// Try to load Resend
let Resend;
let resend;
try {
  const ResendModule = require('resend');
  Resend = ResendModule.Resend;
  
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend Email API initialized');
  }
} catch (e) {
  console.log('⚠️ Resend not installed. Run: npm install resend');
}

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
   EMAIL SENDING FUNCTION
   ============================================================ */

async function sendEmail(mailOptions) {
  if (!resend) {
    console.error('❌ Resend not configured! Set RESEND_API_KEY in environment');
    return { success: false };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || 
                       `SmartDocs365 <onboarding@resend.dev>`; // Resend verified sender
    
    const toAddresses = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
    
    const emailData = {
      from: fromAddress,
      to: toAddresses,
      subject: mailOptions.subject,
      html: mailOptions.html || mailOptions.text,
    };

    if (mailOptions.replyTo) {
      emailData.reply_to = mailOptions.replyTo;
    }

    const result = await resend.emails.send(emailData);
    
    console.log('✅ Email sent via Resend to:', toAddresses.join(', '));
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Resend API error:', error.message);
    return { success: false, error };
  }
}

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

    // Send to customer
    console.log(`📧 Sending Policy Expiry to Customer: ${email}`);
    await sendEmail({
      to: email,
      subject: `🔔 Policy Renewal Reminder - ${number}`,
      html: renderedTemplate,
    });

    // Send copy to you
    const yourEmail = process.env.EMAIL_USER || 'Support@smartdocs365.com';
    if (yourEmail && yourEmail !== email) {
      console.log(`📧 Sending copy to: ${yourEmail}`);
      await sendEmail({
        to: yourEmail,
        subject: `🔔 [Copy] Policy Renewal - ${number}`,
        html: renderedTemplate,
      });
    }
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
    console.log(`📧 Sending reset email to: ${email}`);
    
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

    const supportEmail = process.env.EMAIL_USER || 'Support@smartdocs365.com';

    await sendEmail({
      to: supportEmail,
      replyTo: payload?.email_address,
      subject: 'New User Inquiry / Support Request',
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