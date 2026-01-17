// ============================================
// FILE: Backend/controllers/pdfDataController.js
// ✅ FIXED: Limit Check & Email Block
// ============================================

const PDFDetails = require("../models/pdfDetailsModel");
const UserSubscription = require("../models/userSubcriptionInfoModel");
const User = require("../models/userModel");
const { sendLimitReachedMail } = require("../utils/repetedUsedFunction");

// ... (Keep list, expiryPolicyList functions unchanged) ...

exports.list = async (req, res) => {
    try {
        const user_id = req.user_id;
        const policies = await PDFDetails.find({ user_id, is_active: true }).sort({ _id: -1 }); 
        res.json({ success: true, data: policies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.expiryPolicyList = async (req, res) => {
    try {
        const policies = await PDFDetails.find({ user_id: req.user_id, is_active: true }).sort({ _id: -1 });
        res.json({ success: true, data: policies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. UPDATE FUNCTION (Handles Create/Update)
exports.update = async (req, res) => {
    const { document_id, file_details, file_name, remark = '' } = req.body;
    const user_id = req.user_id;
    
    try {
        let policy = await PDFDetails.findOne({ document_id, user_id });
        
        if (policy) {
            // Update existing - No limit check
            policy.file_details = file_details;
            if (file_name) policy.file_name = file_name;
            policy.remark = remark;
            policy.updated_at = new Date();
            await policy.save();
        } else {
            // ✅ NEW POLICY - CHECK LIMIT
            const sub = await UserSubscription.findOne({ user_id });
            
            // Check if limit is reached (only if limit > 0)
            if (sub && sub.pdf_limit > 0 && sub.total_uploads_used >= sub.pdf_limit) {
                console.log(`⚠️ Limit Reached for ${user_id}`);
                
                // Send Email
                const user = await User.findOne({ user_id });
                if (user) {
                    await sendLimitReachedMail(user.email_address, user.first_name, sub.pdf_limit);
                }

                // BLOCK ACTION
                return res.status(403).json({ 
                    success: false, 
                    message: "⚠️ Upload limit reached! Upgrade your plan to continue." 
                });
            }

            // Create New
            policy = await PDFDetails.create({
                document_id, process_id: document_id, user_id,
                file_name: file_name || 'Policy Document',
                file_details, remark, is_active: true,
                created_at: new Date(), updated_at: new Date()
            });
            
            // Increment Counter
            if(sub) {
                await UserSubscription.updateOne({ user_id }, { $inc: { total_uploads_used: 1 } });
            }
        }
        
        res.json({ success: true, message: 'Policy saved', data: policy });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteData = async (req, res) => {
    try {
        const result = await PDFDetails.findOneAndDelete({ document_id: req.params.id, user_id: req.user_id });
        if (!result) return res.status(404).json({ success: false, message: 'Policy not found' });
        res.json({ success: true, message: 'Policy deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.dataByProcessId = async (req, res) => {
    try {
        const policy = await PDFDetails.findOne({ process_id: req.params.id, user_id: req.user_id, is_active: true });
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getByDocumentId = async (req, res) => {
    try {
        const policy = await PDFDetails.findOne({ document_id: req.params.id, user_id: req.user_id, is_active: true });
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.bulkDelete = async (req, res) => {
    try {
        const { document_ids } = req.body;
        const result = await PDFDetails.deleteMany({ document_id: { $in: document_ids }, user_id: req.user_id });
        res.json({ success: true, message: `${result.deletedCount} policies deleted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStatistics = async (req, res) => {
    try {
        const user_id = req.user_id;
        const policies = await PDFDetails.find({ user_id, is_active: true });
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        let active = 0, expiringSoon = 0, expired = 0;
        
        policies.forEach(policy => {
            const expiryStr = policy.file_details?.Policy_expiry_date;
            if (!expiryStr || expiryStr === "NA") { active++; return; }
            
            let expiryDate;
            if (expiryStr.includes('/')) {
                const [day, month, year] = expiryStr.split('/');
                expiryDate = new Date(year, month - 1, day);
            } else { expiryDate = new Date(expiryStr); }
            
            if (isNaN(expiryDate.getTime())) active++;
            else if (expiryDate < now) expired++;
            else if (expiryDate < thirtyDaysFromNow) expiringSoon++;
            else active++;
        });
        
        res.json({ success: true, data: { total: policies.length, active, expiringSoon, expired } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = exports;