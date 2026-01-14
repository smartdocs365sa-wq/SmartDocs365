// ============================================
// FILE: Backend/routes/apis/paymentCallback.js
// ✅ DEDICATED PUBLIC CALLBACK - NO JWT
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

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || process.env.MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY || process.env.SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || 'https://api.phonepe.com/apis/hermes';

// ============================================
// PAYMENT CALLBACK - COMPLETELY PUBLIC
// ============================================
router.post("/:transactionId", async (req, res) => {
    try {
        console.log('\n');
        console.log('═══════════════════════════════════════════');
        console.log('🔔 PHONEPE CALLBACK RECEIVED');
        console.log('═══════════════════════════════════════════');
        console.log('Transaction ID:', req.params.transactionId);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
        console.log('═══════════════════════════════════════════\n');

        const recharge_id = req.params.transactionId;

        if (!recharge_id) {
            console.error('❌ No transaction ID');
            return res.redirect('https://smartdocs365.com/subscription?error=no_id');
        }

        const merchantTransactionId = req.body.transactionId;
        const merchantId = req.body.merchantId;

        console.log('🔍 Verifying payment status with PhonePe...');

        // Generate Checksum
        const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + "###" + SALT_INDEX;

        // Check Payment Status
        const statusUrl = `${PHONEPE_HOST_URL}/pg/v1/status/${merchantId}/${merchantTransactionId}`;
        
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
        console.log('📊 PhonePe Status Response:', JSON.stringify(response.data, null, 2));

        if (response.data.success === true) {
            console.log('\n✅ PAYMENT SUCCESSFUL - UPDATING DATABASE...\n');
            
            // 1. Save Payment History
            await PaymentHistory.create({ 
                recharge_id, 
                data: response.data,
                created_at: new Date()
            });
            console.log('✅ Step 1/5: Payment history saved');
            
            // 2. Find and Activate Recharge
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

            console.log('✅ Step 2/5: Recharge activated');
            console.log('   User ID:', rechargeEntry.user_id);
            console.log('   Plan ID:', rechargeEntry.plan_id);
            console.log('   Amount:', rechargeEntry.Amount);

            // 3. Get Plan Details
            const planInfo = await subcriptionTypesModel.findOne({ 
                plan_id: rechargeEntry.plan_id 
            });
            
            if (!planInfo) {
                console.error('❌ Plan not found:', rechargeEntry.plan_id);
                return res.redirect('https://smartdocs365.com/subscription?error=plan_not_found');
            }

            console.log('✅ Step 3/5: Plan info retrieved');
            console.log('   Plan Name:', planInfo.plan_name);
            console.log('   PDF Limit:', planInfo.pdf_limit);
            console.log('   Duration:', planInfo.plan_duration, 'days');

            // 4. Update User Subscription
            const expiryDate = new Date(rechargeEntry.recharge_expiry_date);
            
            const subscriptionUpdate = await userSubcriptionInfoModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id },
                {
                    plan_id: planInfo.plan_id,
                    plan_name: planInfo.plan_name,
                    plan_active: true,
                    pdf_limit: planInfo.pdf_limit,
                    total_uploads_used: 0,
                    expiry_date: expiryDate,
                    updated_at: new Date()
                },
                { 
                    upsert: true,
                    new: true 
                }
            );

            console.log('✅ Step 4/5: User subscription updated');
            console.log('   New Counter:', subscriptionUpdate.total_uploads_used);
            console.log('   Expiry:', expiryDate);

            // 5. Update User Model
            const userUpdate = await userModel.findOneAndUpdate(
                { user_id: rechargeEntry.user_id },
                { plan_id: planInfo.plan_id },
                { new: true }
            );

            console.log('✅ Step 5/5: User plan_id updated');
            console.log('   User:', userUpdate.email_address);
            console.log('   New Plan ID:', userUpdate.plan_id);

            console.log('\n═══════════════════════════════════════════');
            console.log('🎉 DATABASE UPDATE COMPLETE!');
            console.log('═══════════════════════════════════════════\n');

            return res.redirect('https://smartdocs365.com/subscription?success=true');

        } else {
            console.log('❌ Payment verification failed:', response.data);
            return res.redirect('https://smartdocs365.com/subscription?error=payment_failed');
        }

    } catch (error) {
        console.error('\n❌ CALLBACK ERROR:', error.message);
        console.error('Stack:', error.stack);
        return res.redirect('https://smartdocs365.com/subscription?error=callback_error');
    }
});

module.exports = router;