// ============================================
// FILE: Backend/controllers/pdfDataController.js
// ✅ FIXED: Excel = Unlimited Uploads + Excel Badge + Email Alerts
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
    // ✅ 1. Get 'is_manual' flag from Frontend
    let { document_id, file_details, file_name, remark = '', is_manual } = req.body;
    const user_id = req.user_id;
    
    // Auto-ID for Excel Imports
    if (!document_id) {
        document_id = Date.now().toString();
    }

    console.log(`\n🔵 UPDATE/SAVE CALLED for Doc ID: ${document_id} (Manual/Excel: ${is_manual})`);
    
    try {
        let policy = await PDFDetails.findOne({ document_id, user_id });
        
        // ---------------------------------------------------------
        // 2. LIMIT CHECK (Skip if this is an Excel/Manual Import)
        // ---------------------------------------------------------
        // We only enforce limits on actual PDF uploads (!is_manual)
        if (!policy && !is_manual) {
            const sub = await UserSubscription.findOne({ user_id });
            
            // Safe Number Conversion
            const used = sub ? Number(sub.total_uploads_used) : 0;
            const limit = sub ? Number(sub.pdf_limit) : 0;

            if (sub && limit > 0 && used >= limit) {
                console.log(`⚠️ Limit Reached (Blocked): ${used}/${limit}`);
                
                const user = await User.findOne({ user_id });
                if (user) {
                    await sendLimitReachedMail(user.email_address, user.first_name, limit);
                }

                return res.status(403).json({ 
                    success: false, 
                    message: "⚠️ Upload limit reached! Upgrade your plan." 
                });
            }
        }

        // ---------------------------------------------------------
        // 3. SAVE POLICY
        // ---------------------------------------------------------
        if (policy) {
            // Update existing
            policy.file_details = file_details;
            if (file_name) policy.file_name = file_name;
            policy.remark = remark;
            policy.updated_at = new Date();
            // If it was manual before, keep it manual. If new update says manual, set it.
            if (is_manual !== undefined) policy.is_manual = is_manual; 
            await policy.save();
        } else {
            // Create New
            policy = await PDFDetails.create({
                document_id, process_id: document_id, user_id,
                file_name: file_name || 'Policy Document',
                file_details, remark, is_active: true,
                is_manual: !!is_manual, // ✅ Save the Excel Flag
                created_at: new Date(), updated_at: new Date()
            });
            
            // ✅ ONLY Increment Counter if it is NOT Excel/Manual
            if (!is_manual) {
                await UserSubscription.updateOne({ user_id }, { $inc: { total_uploads_used: 1 } });

                // Check for Immediate Limit Hit (100%)
                const updatedSub = await UserSubscription.findOne({ user_id });
                const newUsed = Number(updatedSub.total_uploads_used);
                const newLimit = Number(updatedSub.pdf_limit);
                
                if (updatedSub && newLimit > 0 && newUsed === newLimit) {
                    console.log(`🚨 JUST HIT LIMIT (${newUsed}/${newLimit}) - Sending Mail Immediately!`);
                    const user = await User.findOne({ user_id });
                    if (user) {
                        await sendLimitReachedMail(user.email_address, user.first_name, newLimit);
                    }
                }
            }
        }

        // ---------------------------------------------------------
        // 4. EMAIL TRIGGER (Works for BOTH Excel & PDF)
        // ---------------------------------------------------------
        if (file_details && file_details.Policy_expiry_date) {
            const expiryDate = parseDateString(file_details.Policy_expiry_date);
            
            if (expiryDate && !isNaN(expiryDate)) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                expiryDate.setHours(0, 0, 0, 0);
                
                const diffTime = expiryDate - today;
                const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const futureTriggers = [30, 15, 10, 5, 3, 1, 0];
                const isExpired = daysUntilExpiry < 0; 

                if (futureTriggers.includes(daysUntilExpiry) || isExpired) {
                    const pEmail = file_details.Policyholder_emailid;
                    const pName = file_details.Policyholder_name || "Customer";
                    const pNo = file_details.Insurance_policy_number || "Unknown";

                    let msg = daysUntilExpiry > 0 
                        ? `Expiring in ${daysUntilExpiry} Days` 
                        : `❌ EXPIRED ${Math.abs(daysUntilExpiry)} days ago. RENEW NOW!`;

                    if (pEmail && pEmail.includes("@")) {
                        await expiredPolicyMail(pEmail, pName, formatDate(expiryDate), pNo, msg);
                    }
                    const admin = await User.findOne({ user_id });
                    if (admin) {
                        await expiredPolicyMail(admin.email_address, `(Copy) ${pName}`, formatDate(expiryDate), pNo, msg);
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

exports.list = async (req, res) => { try{ const p=await PDFDetails.find({user_id:req.user_id,is_active:true}).sort({_id:-1}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.expiryPolicyList = async (req, res) => { try{ const p=await PDFDetails.find({user_id:req.user_id,is_active:true}).sort({_id:-1}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.deleteData = async (req, res) => { try{ await PDFDetails.findOneAndDelete({document_id:req.params.id,user_id:req.user_id}); res.json({success:true}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.dataByProcessId = async (req, res) => { try{ const p=await PDFDetails.findOne({process_id:req.params.id,user_id:req.user_id}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.getByDocumentId = async (req, res) => { try{ const p=await PDFDetails.findOne({document_id:req.params.id,user_id:req.user_id}); res.json({success:true,data:p}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.bulkDelete = async (req, res) => { try{ await PDFDetails.deleteMany({document_id:{$in:req.body.document_ids},user_id:req.user_id}); res.json({success:true}); }catch(e){res.status(500).json({success:false,message:e.message});} };
exports.getStatistics = async (req, res) => { try{ const p=await PDFDetails.find({user_id:req.user_id,is_active:true}); res.json({success:true,data:{total:p.length}}); }catch(e){res.status(500).json({success:false,message:e.message});} };

module.exports = exports;