const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const path = require("path");
const jwt = require('jsonwebtoken');
const accountModel = require("../../models/accountModel");
const userModel = require('../../models/userModel');
const { upload } = require('../../middleware/uploadImage');
const { isEmailValid, sendResetEmail } = require("../../utils/repetedUsedFunction");

const ResetPasswordForm = path.join(__dirname, "../../html/", "resetPasswordForm.html");
const InvalidMessage = path.join(__dirname, "../../html/", "InvalidMessage.html");

const secretKey = 'sdlfklfas6df5sd4fsdf5';

// Helper functions
function generateToken(email, user_id) {
  return jwt.sign({ email, user_id }, secretKey, { expiresIn: '10m' });
}

function verifyToken(token) {
  try { return jwt.verify(token, secretKey); } catch (err) { return null; }
}

// 🎯 FORGOT PASSWORD ROUTE
router.get('/forgot-password/:email', async (req, res) => {
  try {
    const email = req.params?.email;
    if (!email || !isEmailValid(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address!" });
    }

    // ✅ FIXED: Check both 'email' and 'email_address' fields to be safe
    const user = await userModel.findOne({ 
      $or: [{ email: email }, { email_address: email }] 
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "This email is not registered with us!" });
    }

    const user_id = user.user_id;
    const name = user.name || user.full_name || user.first_name || "User";

    const resetToken = generateToken(email, user_id);

    // 📧 Attempt to send email
    console.log(`Attempting to send reset email to: ${email}`);
    const isSend = await sendResetEmail(email, name, resetToken);

    if (isSend) {
      return res.status(200).json({
        success: true,
        message: `A reset link has been sent to ${email}. Please check your inbox.`
      });
    } else {
      // This triggers if your Gmail credentials in Render are wrong or timing out
      console.error("sendResetEmail returned false. Check your Gmail App Password.");
      return res.status(500).json({
        success: false,
        message: "Email service failed. Please check your Gmail App Password in Render settings."
      });
    }
  } catch (err) {
    console.error('CRITICAL FORGOT PASSWORD ERROR:', err.message);
    res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
  }
});

// 🎯 RESET PASSWORD PAGE (GET)
router.get('/reset-password/:token', (req, res) => {
  const decoded = verifyToken(req.params.token);
  if (decoded && decoded.email) {
    res.sendFile(ResetPasswordForm);
  } else {
    res.sendFile(InvalidMessage);
  }
});

// 🎯 SET NEW PASSWORD (POST)
router.post('/reset-password-set/:token', upload.none(), async (req, res) => {
  try {
    const decoded = verifyToken(req.params.token);
    if (!decoded) return res.status(401).json({ success: false, message: "Token expired or invalid!" });

    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long!" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const updResult = await accountModel.findOneAndUpdate(
      { user_id: decoded.user_id },
      { password: hashedPassword }
    );

    if (updResult) {
      res.status(200).json({ success: true, message: "Password Reset Successfully!" });
    } else {
      res.status(500).json({ success: false, message: "Could not update password. Try again." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;