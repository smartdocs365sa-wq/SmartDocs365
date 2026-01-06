// ============================================
// FILE: Backend/routes/apis/recharge.js
// ✅ COMPLETE PAYMENT ROUTES (Purchase + Callback)
// ============================================

const express = require("express");
const router = express.Router();
const rechargeInfoModel = require('../../models/rechargeInfoModel.js');
const subcriptionTypesModel = require('../../models/subcriptionTypesModel.js');
const userSubcriptionInfoModel = require('../../models/userSubcriptionInfoModel.js');
const userModel = require('../../models/userModel.js');
const PaymentHistory = require('../../models/paymentHistory.js');
const crypto = require('crypto');
const axios = require('axios');
const { v4 } = require('uuid');
const { getCurrentDateTime, addDaysToCurrentDate } = require("../../utils/repetedUsedFunction");

// Environment Variables
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || process.env.MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY || process.env.SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || 1;
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || 'https://api.phonepe.com/apis/hermes';

// ============================================
// 1. PURCHASE ROUTE - INITIATE PAYMENT
// ============================================
router.post("/purchase/plan-id/:id", async (req, res, next) => {
    try {
        const plan_id = req.params.id;
        const user_id = req.user_id; // From JWT middleware

        if (!plan_id || !user_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Plan ID or User ID missing!" 
            });
        }

        // Validate Required Billing Fields
        const { FullName, Email_ID, Mobile_Number, Pincode, City, GST_Number } = req.body;
        
        if (!FullName || !Email_ID || !Mobile_Number || !Pincode || !City) {
            return res.status(400).json({
                success: false,
                message: "Missing required billing information!"
            });
        }

        // Fetch Plan Details
        const planInfo = await subcriptionTypesModel.findOne({ plan_id });
        if (!planInfo) {
            return res.status(404).json({
                success: false,
                message: "Plan not found!"
            });
        }

        // Generate Unique IDs
        const recharge_id = v4();
        const order_id = v4();
        const merchantTransactionId = `TXN_${Date.now()}_${user_id.slice(0, 8)}`;

        // Calculate Expiry Date
        const recharge_expiry_date = addDaysToCurrentDate(planInfo.plan_duration);

        // Create Pending Recharge Entry
        await rechargeInfoModel.create({
            recharge_id,
            user_id,
            order_id,
            plan_id,
            is_active: false, // Will be activated on successful payment
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

        // Prepare PhonePe Payment Payload
        const paymentPayload = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: user_id,
            amount: planInfo.plan_price * 100, // Convert to paise
            redirectUrl: `https://smartdocs365-backend.onrender.com/api/recharge/status-update/${recharge_id}`,
            redirectMode: "REDIRECT",
            callbackUrl: `https://smartdocs365-backend.onrender.com/api/recharge/status-update/${recharge_id}`,
            mobileNumber: Mobile_Number,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        // Encode Payload to Base64
        const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

        // Generate Checksum
        const checksumString = base64Payload + '/pg/v1/pay' + SALT_KEY;
        const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + SALT_INDEX;

        // Make Request to PhonePe
        const options = {
            method: 'POST',
            url: `${PHONEPE_HOST_URL}/pg/v1/pay`,
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

        if (response.data.success) {
            return res.json({
                success: true,
                message: "Payment initiated successfully",
                url: response.data.data.instrumentResponse.redirectInfo.url,
                merchantTransactionId
            });
        } else {
            return res.status(400).json({
                success: false,
                message: response.data.message || "Payment initiation failed"
            });
        }

    } catch (error) {
        console.error("Payment Initiation Error:", error.response?.data || error.message);
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
        const recharge_id = req.params?.transactionId;

        if (!recharge_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Transaction ID missing!" 
            });
        }

        const merchantTransactionId = req.body.transactionId;
        const merchantId = req.body.merchantId;

        // Generate Checksum for Status Check
        const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + "###" + SALT_INDEX;

        // Check Payment Status
        const options = {
            method: 'GET',
            url: `${PHONEPE_HOST_URL}/pg/v1/status/${merchantId}/${merchantTransactionId}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': merchantId
            }
        };

        const response = await axios.request(options);

        if (response.data.success === true) {
            console.log("✅ Payment Successful:", response.data);
            
            // 1. Log Payment History
            await PaymentHistory.create({ 
                recharge_id, 
                data: response.data 
            });
            
            // 2. Activate Recharge Entry
            const rechargeEntry = await rechargeInfoModel.findOneAndUpdate(
                { recharge_id },
                { 
                    is_active: true, 
                    payment_status: true 
                },
                { new: true }
            );

            if (rechargeEntry) {
                // 3. Fetch Plan Details
                const planInfo = await subcriptionTypesModel.findOne({ 
                    plan_id: rechargeEntry.plan_id 
                });
                
                if (planInfo) {
                    // 4. Update User Subscription Info
                    const expiryDate = new Date(rechargeEntry.recharge_expiry_date);
                    
                    await userSubcriptionInfoModel.findOneAndUpdate(
                        { user_id: rechargeEntry.user_id },
                        {
                            plan_id: planInfo.plan_id,
                            plan_name: planInfo.plan_name,
                            plan_active: true,
                            pdf_limit: planInfo.pdf_limit,
                            total_uploads_used: 0, // Reset for new plan
                            expiry_date: expiryDate,
                            updated_at: getCurrentDateTime().dateAndTimeString
                        },
                        { upsert: true }
                    );

                    // 5. Update User's Current Plan ID
                    await userModel.findOneAndUpdate(
                        { user_id: rechargeEntry.user_id },
                        { plan_id: planInfo.plan_id }
                    );
                }
            }

            // Redirect to Success Page
            return res.redirect('https://smartdocs365.com/home');
        } else {
            console.log("❌ Payment Failed:", response.data);
            // Redirect to Home (could be a failure page)
            return res.redirect('https://smartdocs365.com/home');
        }

    } catch (error) {
        console.error("Payment Status Update Error:", error.message);
        return res.redirect('https://smartdocs365.com/home');
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