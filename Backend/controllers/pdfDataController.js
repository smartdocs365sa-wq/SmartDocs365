// ============================================
// FILE: Backend/controllers/pdfDataController.js
// ✅ FIXED: Limit Email & Any Expired Day Alert
// ============================================

const PDFDetails = require("../models/pdfDetailsModel");
const UserSubscription = require("../models/userSubcriptionInfoModel");
const User = require("../models/userModel");
const { sendLimitReachedMail, expiredPolicyMail } = require("../utils/repetedUsedFunction");

// Robust Date Parsing
function parseDateString(dateStr) {
    try {
        if(!dateStr || dateStr === "NA") return null;
        if (dateStr.includes('-')) return new Date(dateStr);
        if(dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if(parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
    } catch(e) { return null; }
}

function formatDate(date) { return date.toLocaleDateString('en-GB'); }

exports.update = async (req, res) => {
    const { document_id, file_details, file_name, remark = '' } = req.body;
    const user_id = req.user_id;
    
    console.log(`\n🔵 UPDATE CALLED for Doc ID: ${document_id}`);
    
    try {
        let policy = await PDFDetails.findOne({ document_id, user_id });
        
        // ---------------------------------------------------------
        // 1. LIMIT CHECK (Only for NEW Uploads/Policies)
        // ---------------------------------------------------------
        if (!policy) {
            const sub = await UserSubscription.findOne({ user_id });
            
            // Check if limit reached
            if (sub && sub.pdf_limit > 0 && sub.total_uploads_used >= sub.pdf_limit) {
                console.log(`⚠️ Limit Reached: ${sub.total_uploads_used}/${sub.pdf_limit}`);
                
                // Trigger Email
                const user = await User.findOne({ user_id });
                if (user) {
                    console.log(`📧 Sending Limit Reached Mail to: ${user.email_address}`);
                    await sendLimitReachedMail(user.email_address, user.first_name, sub.pdf_limit);
                }

                // BLOCK ACTION
                return res.status(403).json({ 
                    success: false, 
                    message: "⚠️ Upload limit reached! Upgrade your plan." 
                });
            }
        }

        // 2. SAVE POLICY
        if (policy) {
            policy.file_details = file_details;
            if (file_name) policy.file_name = file_name;
            policy.remark = remark;
            policy.updated_at = new Date();
            await policy.save();
        } else {
            policy = await PDFDetails.create({
                document_id, process_id: document_id, user_id,
                file_name: file_name || 'Policy Document',
                file_details, remark, is_active: true,
                created_at: new Date(), updated_at: new Date()
            });
            // Increment Counter
            await UserSubscription.updateOne({ user_id }, { $inc: { total_uploads_used: 1 } });
        }

        // ---------------------------------------------------------
        // 3. IMMEDIATE EMAIL TRIGGER (EDIT/SAVE)
        // ---------------------------------------------------------
        if (file_details && file_details.Policy_expiry_date) {
            const expiryDate = parseDateString(file_details.Policy_expiry_date);
            
            if (expiryDate && !isNaN(expiryDate)) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                expiryDate.setHours(0, 0, 0, 0);
                
                const diffTime = expiryDate - today;
                const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                console.log(`📅 Date Check: ${daysUntilExpiry} days remaining`);

                // ✅ LOGIC: Send if in Specific Future List OR if Expired (Any negative day)
                const futureTriggers = [30, 15, 10, 5, 3, 1, 0];
                const isExpired = daysUntilExpiry < 0; 

                if (futureTriggers.includes(daysUntilExpiry) || isExpired) {
                    console.log(`⚡ TRIGGERING EMAIL (Days: ${daysUntilExpiry})`);
                    
                    const policyHolderEmail = file_details.Policyholder_emailid;
                    const policyHolderName = file_details.Policyholder_name || "Valued Customer";
                    const policyNumber = file_details.Insurance_policy_number || "Unknown";

                    // Custom Message
                    let statusMsg = "";
                    if (daysUntilExpiry > 0) statusMsg = `Remaining time to expire: ${daysUntilExpiry} Days`;
                    else if (daysUntilExpiry === 0) statusMsg = `⚠️ EXPIRING TODAY!`;
                    else statusMsg = `❌ EXPIRED ${Math.abs(daysUntilExpiry)} days ago. RENEW IMMEDIATELY!`;

                    // 1. Send to Customer (New Email)
                    if (policyHolderEmail && policyHolderEmail.includes("@")) {
                        await expiredPolicyMail(policyHolderEmail, policyHolderName, formatDate(expiryDate), policyNumber, statusMsg);
                    }

                    // 2. Send to Subscriber (You)
                    const subscriber = await User.findOne({ user_id });
                    if (subscriber && subscriber.email_address) {
                        await expiredPolicyMail(subscriber.email_address, `(Copy) ${policyHolderName}`, formatDate(expiryDate), policyNumber, statusMsg);
                    }
                }
            }
        }
        
        res.json({ success: true, message: 'Policy saved', data: policy });

    } catch (error) {
        console.error("❌ Update Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ... Exports for other functions ...
exports.list = async (req, res) => { try{ const p=await PDFDetails.find({user_id:req.user_id,is_active:true}).sort({_id:-1}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.expiryPolicyList = async (req, res) => { try{ const p=await PDFDetails.find({user_id:req.user_id,is_active:true}).sort({_id:-1}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.deleteData = async (req, res) => { try{ await PDFDetails.findOneAndDelete({document_id:req.params.id,user_id:req.user_id}); res.json({success:true}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.dataByProcessId = async (req, res) => { try{ const p=await PDFDetails.findOne({process_id:req.params.id,user_id:req.user_id}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.getByDocumentId = async (req, res) => { try{ const p=await PDFDetails.findOne({document_id:req.params.id,user_id:req.user_id}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.bulkDelete = async (req, res) => { try{ await PDFDetails.deleteMany({document_id:{$in:req.body.document_ids},user_id:req.user_id}); res.json({success:true}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.getStatistics = async (req, res) => { try{ const p=await PDFDetails.find({user_id:req.user_id,is_active:true}); res.json({success:true,data:{total:p.length}}); }catch(e){res.status(500).json({success:false,message:e.message});} };

module.exports = exports;