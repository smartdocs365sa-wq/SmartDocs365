// ============================================
// FILE: Backend/routes/apis/recharge.js
// ✅ FIXED: Routes for Payment Initiation
// ============================================
const express = require('express');
const router = express.Router();
const rechargeController = require('../../controllers/rechargeController');

// Matches: /api/recharge/purchase/plan-id/:plan_id
router.post('/purchase/plan-id/:plan_id', rechargeController.createOrder);

module.exports = router;