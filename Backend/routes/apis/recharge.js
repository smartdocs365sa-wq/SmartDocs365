const express = require("express");
const router = express.Router();
const rechargeInfoModel = require('../../models/rechargeInfoModel.js');
const subcriptionTypesModel = require('../../models/subcriptionTypesModel.js');
const userSubcriptionInfoModel = require('../../models/userSubcriptionInfoModel.js'); // Import
const userModel = require('../../models/userModel.js');
const PaymentHistory = require('../../models/paymentHistory.js');
const crypto = require('crypto');
const axios = require('axios');
const { getCurrentDateTime, addDaysToCurrentDate } = require("../../utils/repetedUsedFunction");

const merchant_id = process.env.MERCHANT_ID;
const salt_key = process.env.SALT_KEY;
const payUrl = process.env.PAY_URL;

// ... [Existing /purchase/plan-id/:id logic remains same] ...
// (Ensure you keep the purchase route logic as is, just pasting the update logic below)

router.post("/status-update/:transactionId", async (req, res, next) => {
    try {
        const recharge_id = req.params?.transactionId;

        if (!recharge_id) {
            return res.status(400).json({ success: false, message: "Required Field Missing!" });
        }

        const merchantTransactionId = req.body.transactionId;
        const merchantId = req.body.merchantId;

        // ... [Checksum logic remains same] ...
        const keyIndex = 1;
        const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + salt_key;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + "###" + keyIndex;

        const options = {
            method: 'GET',
            url: `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': `${merchantId}`
            }
        };

        const response = await axios.request(options);

        if (response.data.success === true) {
            console.log("✅ Payment Successful:", response.data);
            
            // 1. Log History
            await PaymentHistory.create({ recharge_id, data: response.data });
            
            // 2. Activate Recharge Entry
            const rechargeEntry = await rechargeInfoModel.findOneAndUpdate(
                { recharge_id },
                { is_active: true, payment_status: true },
                { new: true }
            );

            if (rechargeEntry) {
                // 3. Fetch Plan Details
                const planInfo = await subcriptionTypesModel.findOne({ plan_id: rechargeEntry.plan_id });
                
                // 4. UPDATE USER SUBSCRIPTION (The Dashboard Logic)
                const expiryDate = new Date(rechargeEntry.recharge_expiry_date);
                
                await userSubcriptionInfoModel.findOneAndUpdate(
                    { user_id: rechargeEntry.user_id },
                    {
                        plan_id: planInfo.plan_id,
                        plan_name: planInfo.plan_name,
                        plan_active: true,
                        pdf_limit: planInfo.pdf_limit,
                        // Reset usage count for new plan? 
                        // Usually YES, new subscription = fresh uploads.
                        // If you want to Carry Forward, remove this line.
                        total_uploads_used: 0, 
                        expiry_date: expiryDate,
                        updated_at: getCurrentDateTime().dateAndTimeString
                    },
                    { upsert: true } // Create if doesn't exist
                );
            }

            return res.redirect('https://smartdocs365.com/home');
        } else {
            return res.redirect('https://smartdocs365.com/home');
        }

    } catch (err) {
        console.log(`Error While Updating Recharge Status`, err);
        next(err);
    }
});

// ... [Rest of the file remains same] ...
module.exports = router;