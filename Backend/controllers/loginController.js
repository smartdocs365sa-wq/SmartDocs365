// ============================================
// FILE: Backend/controllers/loginController.js (FIXED)
// ============================================

const userModel = require("../models/userModel");
const accountModel = require("../models/accountModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res, next) => {
  try {
    console.log('📥 Login request body:', req.body);

    // ✅ Support both email and email_address
    const email = req.body.email_address || req.body.email;
    const password = req.body.password;

    // ✅ Better validation with detailed error messages
    if (!email) {
      console.log('❌ Email missing');
      return res.status(400).json({
        success: false,
        message: "Email is required!"
      });
    }

    if (!password) {
      console.log('❌ Password missing');
      return res.status(400).json({
        success: false,
        message: "Password is required!"
      });
    }

    console.log('🔍 Looking for user:', email);

    // Check if user exists
    const user = await userModel.findOne({ email_address: email });

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password!"
      });
    }

    console.log('✅ User found:', user.user_id);

    // Get account details (password)
    const account = await accountModel.findOne({ user_id: user.user_id });

    if (!account) {
      console.log('❌ Account not found for user:', user.user_id);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password!"
      });
    }

    // Check if user is blocked
    if (user.blocked) {
      console.log('❌ User is blocked:', email);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support."
      });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, account.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password!"
      });
    }

    console.log('✅ Password valid');

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email_address: user.email_address,
        role: account.role || 'user'
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '7d' } // Token valid for 7 days
    );

    console.log('✅ Token generated');

    // Return success response
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token: token,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email_address: user.email_address,
        mobile: user.mobile,
        role: account.role || 'user'
      }
    });

    console.log('✅ Login successful for:', email);

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again."
    });
  }
};

module.exports = { login };