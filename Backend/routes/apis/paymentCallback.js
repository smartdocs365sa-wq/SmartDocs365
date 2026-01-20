// ============================================
// FILE: Backend/routes/apis/paymentCallback.js
// ✅ FIXED: Always redirect to website, never show errors
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
        
        console.log('📥 Payment Callback Received:', recharge_id);
        
        // Validate request
        if (!req.body.response) {
            console.error('❌ No response from PhonePe');
            return res.redirect('https://smartdocs365.com/subscription?error=invalid_response');
        }

        // Decode PhonePe Response
        const decodedResponse = Buffer.from(req.body.response, 'base64').toString('utf8');
        const paymentData = JSON.parse(decodedResponse);

        console.log('📊 Payment Status:', paymentData.code);

        // SUCCESS CASE
        if (paymentData.success === true && paymentData.code === 'PAYMENT_SUCCESS') {
            
            // 1. Save Payment History
            await PaymentHistory.create({ 
                recharge_id, 
                data: paymentData, 
                created_at: new Date() 
            });
            
            // 2. Activate Recharge Entry
            const rechargeEntry = await rechargeInfoModel.findOneAndUpdate(
                { recharge_id }, 
                { is_active: true, payment_status: true }, 
                { new: true }
            );

            if (!rechargeEntry) {
                console.error('❌ Recharge entry not found:', recharge_id);
                return res.redirect('https://smartdocs365.com/subscription?error=recharge_not_found');
            }

            // 3. Get Plan Details
            const planInfo = await subcriptionTypesModel.findOne({ plan_id: rechargeEntry.plan_id });
            
            if (!planInfo) {
                console.error('❌ Plan not found:', rechargeEntry.plan_id);
                return res.redirect('https://smartdocs365.com/subscription?error=plan_not_found');
            }

            // 4. Update User Subscription
            const expiryDate = new Date(rechargeEntry.recharge_expiry_date);
            await userSubcriptionInfoModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id },
                {
                    plan_id: planInfo.plan_id,
                    plan_name: planInfo.plan_name,
                    plan_active: true,
                    pdf_limit: planInfo.pdf_limit,
                    start_date: new Date(),
                    expiry_date: expiryDate,
                    is_active: true,
                    updated_at: new Date()
                },
                { upsert: true, new: true }
            );

            // 5. Update User's Current Plan
            const user = await userModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id }, 
                { plan_id: planInfo.plan_id }, 
                { new: true }
            );

            // 6. Send Success Email
            if (user && planInfo) {
                try {
                    console.log('📧 Sending payment success email to:', user.email_address);
                    await sendPaymentSuccessMail(
                        user.email_address,
                        user.first_name,
                        planInfo.plan_name,
                        rechargeEntry.Amount || 0,
                        expiryDate.toLocaleDateString('en-GB')
                    );
                    console.log('✅ Email sent successfully');
                } catch (emailError) {
                    console.error('⚠️ Email send failed (non-critical):', emailError.message);
                    // Don't fail the payment flow due to email issues
                }
            }

            console.log('✅ Payment processed successfully. Redirecting to subscription page...');
            return res.redirect('https://smartdocs365.com/subscription?success=true&plan=' + encodeURIComponent(planInfo.plan_name));

        } 
        // FAILURE CASES
        else if (paymentData.code === 'PAYMENT_PENDING') {
            console.log('⏳ Payment pending');
            return res.redirect('https://smartdocs365.com/subscription?status=pending');
        }
        else if (paymentData.code === 'PAYMENT_DECLINED') {
            console.log('❌ Payment declined');
            return res.redirect('https://smartdocs365.com/subscription?error=declined');
        }
        else if (paymentData.code === 'PAYMENT_ERROR') {
            console.log('❌ Payment error');
            return res.redirect('https://smartdocs365.com/subscription?error=payment_error');
        }
        else {
            console.log('❌ Payment failed with code:', paymentData.code);
            return res.redirect('https://smartdocs365.com/subscription?error=failed');
        }

    } catch (error) {
        console.error('❌ Payment Callback Error:', error.message);
        console.error('Stack:', error.stack);
        
        // ALWAYS redirect to subscription page, never show raw error
        return res.redirect('https://smartdocs365.com/subscription?error=server_error');
    }
});

// GET route (in case user accidentally visits the callback URL directly)
router.get("/:transactionId", async (req, res) => {
    console.log('⚠️ GET request to payment callback (should be POST)');
    return res.redirect('https://smartdocs365.com/subscription');
});

module.exports = router;