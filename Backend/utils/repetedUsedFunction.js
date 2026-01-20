// ============================================
// FILE: Backend/utils/repetedUsedFunction.js
// ✅ UPDATED: Payment Email with Template
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
const paymentSuccessFile = path.join(__dirname, "../html/", "paymentSuccessMail.html"); // ✅ NEW

const secretKey = process.env.SECRET_KEY || 'sdlfklfas6df5sd4fsdf5'; 
const algorithm = 'aes-256-cbc';
const baseUrl = "https://smartdocs365-backend-docker.onrender.com/api/"; // ✅ UPDATED TO DOCKER
const LOGO_URL = "https://smartdocs365-backend-docker.onrender.com/logo.png"; // ✅ UPDATED TO DOCKER

/* ============================================================
   ✅ ZOHO MAIL HTTP API (INDIA DC - .IN)
   ============================================================ */

let zohoAccessToken = null;
let tokenExpiry = null;

async function getZohoToken() {
  if (zohoAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return zohoAccessToken;
  }

  try {
    const response = await axios.post(
      'https://accounts.zoho.in/oauth/v2/token',
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

    if (response.data.error) throw new Error(response.data.error);

    zohoAccessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log('✅ Zoho token refreshed');
    return zohoAccessToken;
  } catch (error) {
    console.error('❌ Zoho token refresh failed:', error.response?.data || error.message);
    throw error;
  }
}

let zohoAccountId = null;
async function getZohoAccountId(token) {
  if (zohoAccountId) return zohoAccountId;

  try {
    const response = await axios.get(
      'https://mail.zoho.in/api/accounts',
      { headers: { 'Authorization': `Zoho-oauthtoken ${token}` }, timeout: 10000 }
    );
    zohoAccountId = response.data.data[0].accountId;
    return zohoAccountId;
  } catch (error) {
    console.error('❌ Failed to get Zoho account ID:', error.message);
    throw error;
  }
}

async function sendEmail(mailOptions) {
  if (!process.env.ZOHO_REFRESH_TOKEN) {
    console.error('❌ ZOHO_REFRESH_TOKEN not set!');
    return { success: false, error: 'Zoho not configured' };
  }

  try {
    const token = await getZohoToken();
    const accountId = await getZohoAccountId(token);
    const toAddresses = Array.isArray(mailOptions.to) ? mailOptions.to.join(',') : mailOptions.to;

    const emailData = {
      fromAddress: process.env.EMAIL_USER || 'Support@smartdocs365.com',
      toAddress: toAddresses,
      subject: mailOptions.subject,
      content: mailOptions.html || mailOptions.text,
      mailFormat: 'html'
    };

    if (mailOptions.replyTo) emailData.replyTo = mailOptions.replyTo;

    const response = await axios.post(
      `https://mail.zoho.in/api/accounts/${accountId}/messages`,
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
    if (emailQueue.length > 0) await new Promise(r => setTimeout(r, 2000));
  }
  isProcessing = false;
}

// Initialize
setTimeout(async () => {
  if (process.env.ZOHO_REFRESH_TOKEN) {
    try { await getZohoToken(); console.log('✅ Zoho Mail API ready'); } 
    catch (e) { console.error('⚠️ Zoho API initialization failed'); }
  }
}, 2000);

/* ============================================================
   EMAIL FUNCTIONS
   ============================================================ */

function sendWelcomeMail(email, name) {
  fs.readFile(welcomeMessageFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ Template missing:", err);
    const fixedTemplate = template.replace(/src="[^"]*logo\.(png|jpg)"/g, `src="${LOGO_URL}"`);
    const rendered = fixedTemplate.replace("{{{ name }}}", name);
    await sendEmailQueued({ to: email, subject: "Welcome to SmartDocs365!", html: rendered });
  });
}

async function expiredMail(email, name, date) {
  try {
    const templateData = fs.readFileSync(expiryMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const rendered = template({ name, date }); 
    const finalHtml = rendered.replace(/src="[^"]*logo\.(png|jpg)"/g, `src="${LOGO_URL}"`);
    await sendEmailQueued({ to: email, subject: "⚠️ Subscription Expiring Soon", html: finalHtml });
  } catch (err) { console.error("❌ Template error:", err.message); }
}

async function expiredPolicyMail(email, name, date, number, days) {
  try {
    const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');
    const template = Handlebars.compile(templateData);
    const rendered = template({ name, number, date, days });
    const finalHtml = rendered.replace(/src="[^"]*logo\.(png|jpg)"/g, `src="${LOGO_URL}"`);
    await sendEmailQueued({ to: email, subject: `📄 Policy Renewal Reminder - ${number}`, html: finalHtml });
  } catch (err) { console.error("❌ Template error:", err.message); }
}

function sendOtpCode(email, otpCode) {
  fs.readFile(sendOtpFile, "utf8", async (err, template) => {
    if (err) return console.error("❌ OTP template missing:", err);
    const fixedTemplate = template.replace(/src="[^"]*logo\.(png|jpg)"/g, `src="${LOGO_URL}"`);
    const rendered = fixedTemplate.replace("{{{ otpCode }}}", otpCode);
    await sendEmailQueued({ to: email, subject: "Your OTP Verification Code", html: rendered });
  });
}

async function sendResetEmail(email, name, resetToken) {
  try {
    if (!fs.existsSync(ResetPasswordMail)) return false;
    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');
    const template = Handlebars.compile(templateData);
    const renderedTemplate = template({ name, resetToken, baseUrl });
    const finalHtml = renderedTemplate.replace(/src="[^"]*logo\.(png|jpg)"/g, `src="${LOGO_URL}"`);
    await sendEmailQueued({ to: email, subject: 'Reset Your Password - SmartDocs365', html: finalHtml });
    return true;
  } catch (error) { return false; }
}

// ✅ UPDATED: Payment Success Email with Template
async function sendPaymentSuccessMail(email, name, planName, amount, expiryDate) {
  try {
    // Check if template exists
    if (!fs.existsSync(paymentSuccessFile)) {
      console.warn('⚠️ Payment success template not found, using fallback HTML');
      // Fallback HTML if template doesn't exist
      const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2 style="color: #10b981;">✅ Payment Successful!</h2>
          <p>Dear ${name},</p>
          <p>Thank you for purchasing <strong>${planName}</strong>.</p>
          <div style="background: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Valid Until:</strong> ${expiryDate}</p>
          </div>
          <a href="https://smartdocs365.com/dashboard" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        </div>
      `;
      await sendEmailQueued({ 
        to: email, 
        subject: "🎉 Payment Successful - Plan Activated", 
        html: fallbackHtml 
      });
      return { success: true };
    }

    // Use template if it exists
    const templateData = fs.readFileSync(paymentSuccessFile, 'utf8');
    const template = Handlebars.compile(templateData);
    
    const transactionDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    const rendered = template({ 
      name, 
      planName, 
      amount, 
      expiryDate,
      transactionDate
    });
    
    const finalHtml = rendered.replace(/src="[^"]*logo\.(png|jpg)"/g, `src="${LOGO_URL}"`);
    
    await sendEmailQueued({ 
      to: email, 
      subject: "🎉 Payment Successful - Welcome to SmartDocs365!", 
      html: finalHtml 
    });
    
    console.log('✅ Payment success email sent to:', email);
    return { success: true };
    
  } catch (err) { 
    console.error("❌ Payment email error:", err.message);
    return { success: false, error: err.message };
  }
}

// ✅ Limit Reached Email
async function sendLimitReachedMail(email, name, limit) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">⚠️ Upload Limit Reached</h2>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #fee2e2; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px;">Dear <strong>${name}</strong>,</p>
        <p style="color: #6b7280;">You have reached your plan's limit of <strong style="color: #ef4444;">${limit} uploads</strong>.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="color: #991b1b; margin: 0; font-size: 14px;">📊 To continue uploading policies, please upgrade your subscription plan.</p>
        </div>
        <a href="https://smartdocs365.com/subscription" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Upgrade Plan Now</a>
      </div>
    </div>
  `;
  console.log(`📧 Queuing Limit Reached Mail for ${email}`);
  await sendEmailQueued({ to: email, subject: "⚠️ Action Required: Upload Limit Reached", html: htmlContent });
}

async function sendMailToSupportMail(payload) {
    const supportEmail = process.env.EMAIL_USER || 'Support@smartdocs365.com';
    await sendEmailQueued({
      to: supportEmail,
      replyTo: payload?.email_address,
      subject: 'New User Inquiry',
      html: `<p>New inquiry from ${payload?.full_name} (${payload?.email_address}): ${payload?.description}</p>`
    });
}

// Helper Exports
function addDaysToCurrentDate(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0]; }
function getCurrentDateTime() {
  const now = new Date();
  return {
      dateAndTimeString: now,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0]
  };
}
function namingValidation(str) { return /^[a-zA-Z\s]+$/.test(str); }
function isEmailValid(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function getOffset(currentPage = 1, listPerPage) { return (currentPage - 1) * listPerPage; }
function emptyOrRows(rows) { return !rows ? [] : rows; }
const encryptData = (data) => { return { iv: '', encryptedData: '' }; };
const decryptData = (data) => { return {}; };
function validateZIPCode(zip) { return /^\d{5}$/.test(zip); }
function deleteFile(filePath) { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
function priceBreakDown(price, zip) { return {}; }
function validateCardNumber(num) { return true; }
function isFutureDate(cardDate) { return true; }
function isValidDate(d) { return !isNaN(Date.parse(d)); }

module.exports = {
  getCurrentDateTime, namingValidation, isEmailValid, getOffset, emptyOrRows,
  sendWelcomeMail, encryptData, decryptData, validateZIPCode, deleteFile,
  addDaysToCurrentDate, priceBreakDown, sendResetEmail, validateCardNumber,
  isFutureDate, isValidDate, sendOtpCode, expiredMail, expiredPolicyMail,
  sendMailToSupportMail,
  sendPaymentSuccessMail,
  sendLimitReachedMail
};