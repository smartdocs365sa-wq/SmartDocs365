// ============================================
// FILE: Backend/routes/apis/cron.js
// ✅ NEW: Manual Trigger for Render Free Tier
// ============================================
const express = require("express");
const router = express.Router();
const { checkSubscriptionExpiry, checkPolicyExpiry } = require("../../subscriptionCron");

// ROUTE: /api/cron/trigger
// USAGE: https://your-backend.onrender.com/api/cron/trigger?key=secure123
router.get("/trigger", async (req, res) => {
    try {
        const { key } = req.query;
        // Simple security key to prevent unauthorized triggers
        if (key !== "secure123") {
            return res.status(403).json({ success: false, message: "Unauthorized: Wrong Key" });
        }

        console.log("🚀 Manual Cron Triggered via API...");

        // Run jobs concurrently
        await Promise.all([
            checkSubscriptionExpiry(),
            checkPolicyExpiry()
        ]);

        console.log("✅ Manual Cron Finished Successfully");

        res.status(200).json({ 
            success: true, 
            message: "Daily checks completed successfully",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Cron Trigger Error:", error);
        res.status(500).json({ success: false, message: "Cron failed", error: error.message });
    }
});

module.exports = router;