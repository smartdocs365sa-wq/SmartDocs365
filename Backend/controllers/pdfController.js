// ============================================
// FILE: Backend/controllers/pdfController.js
// ✅ FIXED: "Limit Reached" Email Triggers Instantly on Increment
// ============================================

const userModel = require("../models/userModel");
const pdfDetailsModel = require('../models/pdfDetailsModel');
const userSubcriptionInfoModel = require('../models/userSubcriptionInfoModel'); 
const { v4 } = require("uuid");
// ✅ Added sendLimitReachedMail to imports
const { getCurrentDateTime, sendLimitReachedMail } = require("../utils/repetedUsedFunction");
const { extractDataFromPDF, PageCount, parseDate } = require('../utils/extract');
const openaiExtract = require('../utils/openai');

const extractData = async (req, res, next) => {
    try {
        const files = req?.files; 
        const user_id = req?.user_id; // Comes from verifyJWT

        // =========================================================
        // 1. CHECK SUBSCRIPTION & LIMITS (Pre-Upload Check)
        // =========================================================
        const userSubscription = await userSubcriptionInfoModel.findOne({ user_id });

        if (!userSubscription) {
            return res.status(403).json({
                success: false,
                message: "No active subscription found. Please subscribe to a plan."
            });
        }

        // Check if Plan is Expired
        if (userSubscription.expiry_date && new Date() > new Date(userSubscription.expiry_date)) {
            return res.status(403).json({
                success: false,
                message: "Your subscription has expired. Please upgrade or renew."
            });
        }

        // Check Upload Limit
        const currentUsed = Number(userSubscription.total_uploads_used) || 0;
        const limit = Number(userSubscription.pdf_limit) || 0;
        const newFilesCount = files?.length || 0;

        if ((currentUsed + newFilesCount) > limit) {
             return res.status(403).json({
                success: false,
                message: `Limit Exceeded! You have used ${currentUsed}/${limit} uploads. Upgrade plan to continue.`
            });
        }

        // =========================================================
        // 2. PROCESS FILES
        // =========================================================
        var process_id = v4();
        
        for(var i=0; i < files?.length; i++){
            var pdfFile = files[i];

            // A. Extract Text & Costs
            var extractedData = await extractDataFromPDF(pdfFile.path);
            extractedData = extractedData.replaceAll(" ","");
            const page = await PageCount(pdfFile.path);

            var embedding_cost_USD = +(extractedData.split(" ")?.length + 400 ) * 0.0000015;
            embedding_cost_USD = parseFloat(embedding_cost_USD);
            var total_cost_INR = +parseFloat(embedding_cost_USD * 84);
            
            var processedText;
            if(extractedData.length != 0){
                processedText = await openaiExtract(extractedData);
            } else {
                processedText = JSON.stringify({
                    "Insurance_company_name":"NA",
                    "Insurance_policy_number":"NA",
                    "Policyholder_name":"NA",
                    "Policy_expiry_date":"NA"
                });
            }

            var jsonObj = JSON?.parse(processedText);
        
            // B. Parse Dates
            if(jsonObj?.Policy_start_date || jsonObj?.Policy_expiry_date || jsonObj?.Policy_issuance_date){
                jsonObj.Policy_start_date = parseDate(jsonObj?.Policy_start_date)
                jsonObj.Policy_expiry_date = parseDate(jsonObj?.Policy_expiry_date)
                jsonObj.Policy_issuance_date = parseDate(jsonObj?.Policy_issuance_date);
            }

            // C. Prepare Data
            const pathParts = pdfFile.path.split('/');
            const fullFilenameWithTimestamp = pathParts[pathParts.length - 1];

            var payload = {};
            payload.document_id = v4();
            payload.process_id = process_id;
            payload.file_name = fullFilenameWithTimestamp;
            payload.original_name = pdfFile.originalname;
            payload.user_id = user_id;
            payload.file_path = pdfFile?.path;
            payload.file_details = jsonObj;
            payload.total_page = page;
            payload.total_cost_INR = total_cost_INR;
            payload.embedding_cost_USD = embedding_cost_USD;
            payload.plan_id = userSubscription.plan_id; 
            payload.created_at = getCurrentDateTime().dateAndTimeString;
            payload.updated_at = getCurrentDateTime().dateAndTimeString;

            // D. Save PDF
            await pdfDetailsModel.create(payload);

            // =========================================================
            // 3. ✅ INCREMENT & TRIGGER MAIL (The Fix)
            // =========================================================
            const updatedSub = await userSubcriptionInfoModel.findOneAndUpdate(
                { user_id },
                { $inc: { total_uploads_used: 1 } },
                { new: true } // Returns the document AFTER update
            );

            // 📧 CHECK: Did we just hit the limit?
            const newUsed = Number(updatedSub.total_uploads_used);
            const newLimit = Number(updatedSub.pdf_limit);

            if (newLimit > 0 && newUsed === newLimit) {
                console.log(`🚨 JUST HIT LIMIT (${newUsed}/${newLimit}) - Sending Mail Immediately!`);
                
                // Fetch User details for email address
                const user = await userModel.findOne({ user_id });
                if (user) {
                    await sendLimitReachedMail(user.email_address, user.first_name, newLimit);
                    console.log(`✅ Mail Sent to ${user.email_address}`);
                }
            }
        }

        // 4. Return Response with Updated Usage
        var data = await pdfDetailsModel.find({process_id});
        const finalSub = await userSubcriptionInfoModel.findOne({ user_id });

        res.status(200).json({
            success: true,
            message: "Data Fetched & Saved Successfully!",
            result: data?.length,
            data: data,
            usage: {
                used: finalSub.total_uploads_used,
                limit: finalSub.pdf_limit
            }
        });

    } catch (error) {
        console.error("Error When Data Extraction:", error);
        return res.status(500).send("Internal Server Error");
    }
};

module.exports = { extractData };