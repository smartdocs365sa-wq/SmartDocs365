// ============================================
// FILE: Backend/routes/apis/register.js
// ============================================

const express = require("express");
const router = express.Router();
const registerController = require("../../controllers/registerController.js");
const verifyJWT = require("../../middleware/verifyJWT");
const userModel = require("../../models/userModel");
const accountModel = require("../../models/accountModel");
const pdfDetailsModel = require("../../models/pdfDetailsModel");
const userSubcriptionInfoModel = require("../../models/userSubcriptionInfoModel");
const rechargeInfoModel = require("../../models/rechargeInfoModel");

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// OTP verification (public)
router.get("/otp-verification/:email", registerController.sendOtp);

// User registration (public)
router.post("/register", registerController.create);

// ✅ NEW CONTACT US ROUTE
router.post("/contact-us", registerController.contactUs);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================
router.use(verifyJWT);

// Admin registration (super-admin only)
router.post('/register/admin', registerController.createAdmin);

// Delete admin (super-admin only)
router.post('/delete-admin', registerController.deleteAdmin);

// Block/unblock user (admin/super-admin)
router.put("/block", registerController.blockUser);

// Get user list (admin/super-admin)
router.get("/list", registerController.userList);

// Get admin list (super-admin only)
router.get("/admin/list", registerController.adminList);

// Get user profile (authenticated users)
router.get("/profile", registerController.getUserDetail); 

// Get user subscription info
router.get('/get-user-subcription-info/:userId', registerController.getUserSubcription);

// Update user profile
router.put("/profile-update/:uuid", registerController.updateProfile);

// ============================================
// ✅ NEW USER MANAGEMENT ROUTES
// ============================================

// DELETE USER (admin/super-admin)
router.post("/delete", async (req, res) => {
  try {
    if (req.role !== "admin" && req.role !== "super-admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete users!"
      });
    }

    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required!"
      });
    }

    const user = await userModel.findOne({ user_id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }

    if (user_id === req.user_id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account!"
      });
    }

    await Promise.all([
      pdfDetailsModel.deleteMany({ user_id }),
      userSubcriptionInfoModel.deleteMany({ user_id }),
      rechargeInfoModel.deleteMany({ user_id }),
      accountModel.deleteOne({ user_id }),
      userModel.deleteOne({ user_id })
    ]);

    res.status(200).json({
      success: true,
      message: "User and all associated data deleted successfully!"
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user: " + error.message
    });
  }
});

// MAKE USER AS ADMIN (super-admin only)
router.post("/make-admin", async (req, res) => {
  try {
    if (req.role !== "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Only super-admin can promote users to admin!"
      });
    }

    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required!"
      });
    }

    const user = await userModel.findOne({ user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }

    const account = await accountModel.findOne({ user_id });
    if (account && account.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "User is already an admin!"
      });
    }

    await accountModel.findOneAndUpdate(
      { user_id },
      { role: "admin" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `User "${user.full_name}" has been promoted to admin successfully!`
    });
  } catch (error) {
    console.error("Error making user admin:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to promote user: " + error.message 
    });
  }
});

// DEMOTE ADMIN TO USER (super-admin only)
router.post("/demote-admin", async (req, res) => {
  try {
    if (req.role !== "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Only super-admin can demote admins!"
      });
    }

    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required!"
      });
    }

    const account = await accountModel.findOne({ user_id });
    if (!account || account.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "This user is not an admin!"
      });
    }

    if (user_id === req.user_id) {
      return res.status(400).json({
        success: false,
        message: "You cannot demote your own account!"
      });
    }

    const user = await userModel.findOne({ user_id });
    
    await accountModel.findOneAndUpdate(
      { user_id },
      { role: "user" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `${user.full_name} has been demoted to regular user successfully!`
    });
  } catch (error) {
    console.error("Error demoting admin:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to demote admin: " + error.message 
    });
  }
});

module.exports = router;