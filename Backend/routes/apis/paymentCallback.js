// ============================================
// FILE: Backend/routes/apis/paymentCallback.js
// ✅ FIXED: Email Trigger + Correct Redirect
// ============================================

const express = require("express");
const router = express.Router();
const rechargeInfoModel = require('../../models/rechargeInfoModel.js');
const subcriptionTypesModel = require('../../models/subcriptionTypesModel.js');
const userSubcriptionInfoModel = require('../../models/userSubcriptionInfoModel.js');
const userModel = require('../../models/userModel.js');
const PaymentHistory = require('../../models/paymentHistory.js');
const { sendPaymentSuccessMail } = require('../../utils/repetedUsedFunction');

router.post("/:transactionId", async (req, res) => {
    try {
        const recharge_id = req.params.transactionId;
        
        // Decode PhonePe Response
        if (!req.body.response) throw new Error("No response from PhonePe");
        const decodedResponse = Buffer.from(req.body.response, 'base64').toString('utf8');
        const paymentData = JSON.parse(decodedResponse);

        if (paymentData.success === true && paymentData.code === 'PAYMENT_SUCCESS') {
            
            // 1. Save History
            await PaymentHistory.create({ recharge_id, data: paymentData, created_at: new Date() });
            
            // 2. Activate Recharge
            const rechargeEntry = await rechargeInfoModel.findOneAndUpdate(
                { recharge_id }, { is_active: true, payment_status: true }, { new: true }
            );
            if (!rechargeEntry) throw new Error("Recharge entry not found");

            // 3. Get Plan Info
            const planInfo = await subcriptionTypesModel.findOne({ plan_id: rechargeEntry.plan_id });
            
            // 4. Update Subscription
            const expiryDate = new Date(rechargeEntry.recharge_expiry_date);
            await userSubcriptionInfoModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id },
                {
                    plan_id: planInfo.plan_id,
                    plan_name: planInfo.plan_name,
                    plan_active: true,
                    pdf_limit: planInfo.pdf_limit,
                    total_uploads_used: 0, // Reset counter on new plan
                    expiry_date: expiryDate,
                    updated_at: new Date()
                },
                { upsert: true, new: true }
            );

            // 5. Update User
            const user = await userModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id }, { plan_id: planInfo.plan_id }, { new: true }
            );

            // 📧 SEND IMMEDIATE EMAIL
            if (user && planInfo) {
                console.log('📧 Sending Payment Success Email...');
                await sendPaymentSuccessMail(
                    user.email_address,
                    user.first_name,
                    planInfo.plan_name,
                    rechargeEntry.Amount,
                    expiryDate.toLocaleDateString('en-GB')
                );
            }

            console.log('✅ Payment Success. Redirecting...');
            return res.redirect('https://smartdocs365.com/subscription?success=true');

        } else {
            console.log('❌ Payment Failed');
            return res.redirect('https://smartdocs365.com/subscription?error=payment_failed');
        }

    } catch (error) {
        console.error('❌ Callback Error:', error.message);
        return res.redirect('https://smartdocs365.com/subscription?error=server_error');
    }
});

module.exports = router;