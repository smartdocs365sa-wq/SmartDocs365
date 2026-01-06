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
// PUBLIC ROUTES
// ============================================
router.get("/otp-verification/:email", registerController.sendOtp);
router.post("/register", registerController.create);

// ============================================
// PROTECTED ROUTES
// ============================================
router.use(verifyJWT);

router.post('/register/admin', registerController.createAdmin);
router.post('/delete-admin', registerController.deleteAdmin);
router.put("/block", registerController.blockUser);
router.get("/list", registerController.userList);
router.get("/admin/list", registerController.adminList);
router.get("/profile", registerController.getUserDetail); 
router.get('/get-user-subcription-info/:userId', registerController.getUserSubcription);
router.put("/profile-update/:uuid", registerController.updateProfile);

// DELETE USER
router.post("/delete", async (req, res) => {
  try {
    if (req.role !== "admin" && req.role !== "super-admin") return res.status(403).json({ success: false, message: "Permission Denied" });
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: "User ID required" });

    await Promise.all([
      pdfDetailsModel.deleteMany({ user_id }),
      userSubcriptionInfoModel.deleteMany({ user_id }),
      rechargeInfoModel.deleteMany({ user_id }),
      accountModel.deleteOne({ user_id }),
      userModel.deleteOne({ user_id })
    ]);

    res.status(200).json({ success: true, message: "User Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PROMOTE TO ADMIN
router.post("/make-admin", async (req, res) => {
  try {
    if (req.role !== "super-admin") return res.status(403).json({ success: false, message: "Permission Denied" });
    const { user_id } = req.body;
    await accountModel.findOneAndUpdate({ user_id }, { role: "admin" });
    res.status(200).json({ success: true, message: "User Promoted to Admin" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DEMOTE TO USER
router.post("/demote-admin", async (req, res) => {
  try {
    if (req.role !== "super-admin") return res.status(403).json({ success: false, message: "Permission Denied" });
    const { user_id } = req.body;
    if (user_id === req.user_id) return res.status(400).json({ success: false, message: "Cannot demote self" });
    
    await accountModel.findOneAndUpdate({ user_id }, { role: "user" });
    res.status(200).json({ success: true, message: "Admin Demoted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;