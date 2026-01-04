// ============================================
// FILE: Backend/routes/apis/login.js (FIXED)
// ============================================

const express = require("express");
const router = express.Router();
const { login } = require("../../controllers/loginController");

// ✅ POST /api/login
router.post("/", login);

module.exports = router;