// ============================================
// FILE: Backend/routes/apis/cron.js
// ✅ FIXED: "Fire & Forget" (Allows 5+ Minute Jobs)
// ============================================
const express = require("express");
const router = express.Router();
const { checkSubscriptionExpiry, checkPolicyExpiry } = require("../../subscriptionCron");

// ROUTE: /api/cron/trigger
router.get("/trigger", (req, res) => {
    // 1. Security Check
    const { key } = req.query;
    if (key !== "secure123") {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    console.log("🚀 Cron Trigger Received. Sending instant response...");

    // 2. ✅ FIRE AND FORGET: Send success response IMMEDIATELY
    // This stops the external cron service from timing out.
    res.status(200).json({ 
        success: true, 
        message: "Trigger received. Jobs started in background.",
        timestamp: new Date().toISOString()
    });

    // 3. Run Heavy Jobs in Background
    // The server stays awake for ~15 mins after this request, giving you plenty of time.
    (async () => {
        try {
            console.log("⏳ Background jobs started...");
            const startTime = Date.now();

            await Promise.all([
                checkSubscriptionExpiry(),
                checkPolicyExpiry()
            ]);

            const duration = (Date.now() - startTime) / 1000;
            console.log(`✅ Background jobs finished in ${duration} seconds.`);
        } catch (error) {
            console.error("❌ Background Job Failed:", error);
        }
    })();
});

module.exports = router;