// ============================================
// FILE: Backend/routes/apis/recharge.js
// ✅ COMPLETE FIX: Payment + Callback + Dashboard Update
// ============================================

const express = require("express");
const router = express.Router();
const rechargeInfoModel = require('../../models/rechargeInfoModel.js');
const subcriptionTypesModel = require('../../models/subcriptionTypesModel.js');
const userSubcriptionInfoModel = require('../../models/userSubcriptionInfoModel.js');
const userModel = require('../../models/userModel.js');
const PaymentHistory = require('../../models/paymentHistory.js');
const { sendPaymentSuccessMail } = require('../../utils/repetedUsedFunction');
const crypto = require('crypto');
const axios = require('axios');
const { v4 } = require('uuid');
const { getCurrentDateTime, addDaysToCurrentDate } = require("../../utils/repetedUsedFunction");

// Environment Variables
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || process.env.MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY || process.env.SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || 'https://api.phonepe.com/apis/hermes';

// ✅ CRITICAL FIX: Docker Backend URL
const DOCKER_BACKEND = 'https://smartdocs365-backend-docker.onrender.com';

console.log('💳 PhonePe Config:', {
    merchantId: MERCHANT_ID,
    saltKeyPresent: !!SALT_KEY,
    hostUrl: PHONEPE_HOST_URL,
    backendUrl: DOCKER_BACKEND
});

// ============================================
// 1. PURCHASE ROUTE - INITIATE PAYMENT
// ============================================
router.post("/purchase/plan-id/:id", async (req, res, next) => {
    try {
        console.log('🛒 Purchase Request:', {
            planId: req.params.id,
            userId: req.user_id,
            body: req.body
        });

        const plan_id = req.params.id;
        const user_id = req.user_id;

        if (!plan_id || !user_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Plan ID or User ID missing!" 
            });
        }

        const { FullName, Email_ID, Mobile_Number, Pincode, City, GST_Number } = req.body;
        
        if (!FullName || !Email_ID || !Mobile_Number || !Pincode || !City) {
            return res.status(400).json({
                success: false,
                message: "Missing required billing information!"
            });
        }

        const planInfo = await subcriptionTypesModel.findOne({ plan_id });
        if (!planInfo) {
            return res.status(404).json({
                success: false,
                message: "Plan not found!"
            });
        }

        console.log('📦 Plan Found:', planInfo);

        const recharge_id = v4();
        const order_id = v4();
        const merchantTransactionId = `TXN_${Date.now()}_${user_id.slice(0, 8)}`;
        const recharge_expiry_date = addDaysToCurrentDate(planInfo.plan_duration);

        await rechargeInfoModel.create({
            recharge_id,
            user_id,
            order_id,
            plan_id,
            is_active: false,
            payment_status: false,
            created_at: getCurrentDateTime().dateAndTimeString,
            recharge_expiry_date,
            FullName,
            Email_ID,
            Mobile_Number,
            Pincode,
            City,
            GST_Number: GST_Number || "",
            Amount: planInfo.plan_price
        });

        console.log('✅ Recharge Entry Created:', recharge_id);

        // ✅ CRITICAL FIX: Use Docker Backend URLs
        const paymentPayload = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: user_id,
            amount: planInfo.plan_price * 100,
            redirectUrl: `${DOCKER_BACKEND}/api/recharge/status-update/${recharge_id}`,
            redirectMode: "REDIRECT",
            callbackUrl: `${DOCKER_BACKEND}/api/recharge/status-update/${recharge_id}`,
            mobileNumber: Mobile_Number,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        console.log('💰 Payment Payload:', {
            redirectUrl: paymentPayload.redirectUrl,
            callbackUrl: paymentPayload.callbackUrl,
            amount: paymentPayload.amount
        });

        const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
        const checksumString = base64Payload + '/pg/v1/pay' + SALT_KEY;
        const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + SALT_INDEX;

        const phonepeUrl = `${PHONEPE_HOST_URL}/pg/v1/pay`;
        console.log('📡 PhonePe Request URL:', phonepeUrl);

        const options = {
            method: 'POST',
            url: phonepeUrl,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: base64Payload
            }
        };

        const response = await axios.request(options);
        console.log('📥 PhonePe Response:', response.data);

        if (response.data.success) {
            return res.json({
                success: true,
                message: "Payment initiated successfully",
                url: response.data.data.instrumentResponse.redirectInfo.url,
                merchantTransactionId
            });
        } else {
            console.error('❌ PhonePe Error:', response.data);
            return res.status(400).json({
                success: false,
                message: response.data.message || "Payment initiation failed"
            });
        }

    } catch (error) {
        console.error("💥 Payment Initiation Error:", {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });
        
        return res.status(500).json({
            success: false,
            message: "Payment initiation failed: " + (error.response?.data?.message || error.message)
        });
    }
});
// ============================================
// 2. CALLBACK ROUTE - PAYMENT STATUS UPDATE
// ============================================
router.post("/status-update/:transactionId", async (req, res, next) => {
    try {
        console.log('📞 Callback Received:', {
            transactionId: req.params.transactionId,
            body: req.body
        });

        const recharge_id = req.params?.transactionId;

        if (!recharge_id) {
            console.error('❌ No transaction ID provided');
            return res.redirect('https://smartdocs365.com/subscription?error=no_transaction_id');
        }

        const merchantTransactionId = req.body.transactionId;
        const merchantId = req.body.merchantId;

        // Generate Checksum for Status Check
        const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + "###" + SALT_INDEX;

        // Check Payment Status
        const statusUrl = `${PHONEPE_HOST_URL}/pg/v1/status/${merchantId}/${merchantTransactionId}`;
        console.log('🔍 Checking Status:', statusUrl);

        const options = {
            method: 'GET',
            url: statusUrl,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': merchantId
            }
        };

        const response = await axios.request(options);
        console.log('📊 Status Response:', response.data);

        if (response.data.success === true) {
            console.log("✅ Payment Successful - Starting Database Updates");
            
            // 1. Log Payment History
            await PaymentHistory.create({ 
                recharge_id, 
                data: response.data 
            });
            console.log('✅ Payment history logged');
            
            // 2. Activate Recharge Entry
            const rechargeEntry = await rechargeInfoModel.findOneAndUpdate(
                { recharge_id },
                { 
                    is_active: true, 
                    payment_status: true 
                },
                { new: true }
            );

            if (!rechargeEntry) {
                console.error('❌ Recharge entry not found:', recharge_id);
                return res.redirect('https://smartdocs365.com/subscription?error=recharge_not_found');
            }

            console.log('✅ Recharge Activated:', {
                recharge_id,
                user_id: rechargeEntry.user_id,
                plan_id: rechargeEntry.plan_id
            });

            // 3. Fetch Plan Details
            const planInfo = await subcriptionTypesModel.findOne({ 
                plan_id: rechargeEntry.plan_id 
            });
            
            if (!planInfo) {
                console.error('❌ Plan not found:', rechargeEntry.plan_id);
                return res.redirect('https://smartdocs365.com/subscription?error=plan_not_found');
            }

            console.log('✅ Plan Info Retrieved:', {
                plan_id: planInfo.plan_id,
                plan_name: planInfo.plan_name,
                pdf_limit: planInfo.pdf_limit
            });

            // 4. Calculate Dates
            const now = new Date();
            const expiryDate = new Date(rechargeEntry.recharge_expiry_date);

            console.log('📅 Dates:', {
                start: now,
                expiry: expiryDate,
                duration: planInfo.plan_duration
            });

            // 5. Update User Subscription Info
            const subscriptionUpdate = await userSubcriptionInfoModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id },
                {
                    plan_id: planInfo.plan_id,
                    plan_name: planInfo.plan_name,
                    plan_active: true,
                    pdf_limit: planInfo.pdf_limit,
                    total_uploads_used: 0, // Reset for new plan
                    expiry_date: expiryDate,
                    updated_at: now
                },
                { 
                    upsert: true, // Create if doesn't exist
                    new: true 
                }
            );

            console.log('✅ User Subscription Updated:', subscriptionUpdate);

            // 6. Update User's Current Plan ID
            const userUpdate = await userModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id },
                { plan_id: planInfo.plan_id },
                { new: true }
            );

            console.log('✅ User Model Updated:', {
                user_id: userUpdate.user_id,
                plan_id: userUpdate.plan_id
            });

            // 6. Send Payment Success Email
try {
    console.log('📧 Sending Payment Success Email...');
    await sendPaymentSuccessMail(
        rechargeEntry.Email_ID,
        rechargeEntry.FullName,
        planInfo.plan_name,
        rechargeEntry.Amount,
        expiryDate.toLocaleDateString('en-GB')
    );
    console.log('✅ Email sent successfully');
} catch (emailError) {
    console.error('⚠️ Email failed (non-critical):', emailError.message);
}

console.log('🎉 ALL DATABASE UPDATES COMPLETED SUCCESSFULLY');

// Redirect with plan name
return res.redirect(`https://smartdocs365.com/subscription?success=true&plan=${encodeURIComponent(planInfo.plan_name)}`);
        } else {
            console.log("❌ Payment Failed:", response.data);
            return res.redirect('https://smartdocs365.com/subscription?error=payment_failed');
        }

    } catch (error) {
        console.error("💥 Payment Status Update Error:", {
            message: error.message,
            stack: error.stack
        });
        return res.redirect('https://smartdocs365.com/subscription?error=callback_error');
    }
});

// ============================================
// 3. GET USER'S RECHARGE HISTORY
// ============================================
router.get("/history", async (req, res, next) => {
    try {
        const user_id = req.user_id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated!"
            });
        }

        const rechargeHistory = await rechargeInfoModel
            .find({ user_id })
            .sort({ created_at: -1 });

        // Populate with plan details
        const historyWithPlans = await Promise.all(
            rechargeHistory.map(async (recharge) => {
                const planInfo = await subcriptionTypesModel.findOne({ 
                    plan_id: recharge.plan_id 
                });
                return {
                    ...recharge._doc,
                    planInfo
                };
            })
        );

        res.json({
            success: true,
            data: historyWithPlans
        });

    } catch (error) {
        console.error("Recharge History Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch recharge history"
        });
    }
});

module.exports = router;