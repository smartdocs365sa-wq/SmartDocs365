// ============================================
// FILE: Backend/controllers/pdfDataController.js
// OPTION A: LIFETIME UPLOADS - NEVER DECREASES
// ============================================

const PDFDetails = require("../models/pdfDetailsModel");

// 1. MAIN LIST (Sorted by newest first)
exports.list = async (req, res) => {
    try {
        const user_id = req.user_id;
        console.log('Fetching policies for:', user_id);
        
        const policies = await PDFDetails.find({ 
            user_id,
            is_active: true
        }).sort({ _id: -1 }); 
        
        console.log('Found policies:', policies.length);
        res.json({ success: true, data: policies });
    } catch (error) {
        console.error('List error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. EXPIRY LIST (Sorted by newest first)
exports.expiryPolicyList = async (req, res) => {
    try {
        const policies = await PDFDetails.find({ 
            user_id: req.user_id,
            is_active: true
        }).sort({ _id: -1 });
        
        res.json({ success: true, data: policies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. UPDATE FUNCTION
exports.update = async (req, res) => {
    const { document_id, file_details, file_name, remark = '' } = req.body;
    const user_id = req.user_id;
    
    console.log('UPDATE called for:', document_id);
    
    try {
        let policy = await PDFDetails.findOne({ document_id, user_id });
        
        if (policy) {
            policy.file_details = file_details;
            if (file_name) policy.file_name = file_name;
            policy.remark = remark;
            policy.updated_at = new Date();
            await policy.save();
            console.log('UPDATED existing policy');
        } else {
            const newPolicy = {
                document_id: document_id,
                process_id: document_id,
                user_id: user_id,
                file_name: file_name || 'Policy Document',
                file_details: file_details,
                remark: remark,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            };
            
            console.log('Creating new policy');
            policy = await PDFDetails.create(newPolicy);
            console.log('CREATED new policy, ID:', policy._id);
        }
        
        res.json({ success: true, message: 'Policy saved', data: policy });
    } catch (error) {
        console.error('UPDATE ERROR:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. ✅ DELETE FUNCTION - OPTION A: NO DECREMENT!
exports.deleteData = async (req, res) => {
    try {
        const document_id = req.params.id;
        const user_id = req.user_id;
        
        console.log(`🗑️  DELETE REQUEST - OPTION A (No Decrement)`);
        console.log(`   Document ID: ${document_id}`);
        console.log(`   User ID: ${user_id}`);
        
        // Find and delete the policy
        const result = await PDFDetails.findOneAndDelete({ 
            document_id: document_id, 
            user_id: user_id 
        });
        
        if (!result) {
            console.log('❌ Policy not found');
            return res.status(404).json({ 
                success: false, 
                message: 'Policy not found' 
            });
        }
        
        console.log('✅ Policy deleted from database');
        console.log(`   Policy Number: ${result.file_details?.Insurance_policy_number || 'N/A'}`);
        
        // ✅ CRITICAL: OPTION A - DO NOT DECREMENT THE COUNTER
        // The counter tracks LIFETIME uploads, not current active policies
        console.log('ℹ️  OPTION A: Counter NOT decremented (tracks lifetime uploads)');
        
        res.json({ 
            success: true, 
            message: 'Policy deleted successfully',
            deletedPolicy: {
                document_id: result.document_id,
                policy_number: result.file_details?.Insurance_policy_number
            }
            // No updatedUsage - counter stays the same
        });
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// 5. DATA BY PROCESS ID
exports.dataByProcessId = async (req, res) => {
    try {
        const policy = await PDFDetails.findOne({ 
            process_id: req.params.id, 
            user_id: req.user_id,
            is_active: true
        });
        
        if (!policy) {
            return res.status(404).json({ 
                success: false, 
                message: 'Policy not found' 
            });
        }
        
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// 6. GET POLICY BY DOCUMENT ID
exports.getByDocumentId = async (req, res) => {
    try {
        const policy = await PDFDetails.findOne({ 
            document_id: req.params.id, 
            user_id: req.user_id,
            is_active: true
        });
        
        if (!policy) {
            return res.status(404).json({ 
                success: false, 
                message: 'Policy not found' 
            });
        }
        
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// 7. ✅ BULK DELETE - OPTION A: NO DECREMENT!
exports.bulkDelete = async (req, res) => {
    try {
        const { document_ids } = req.body;
        const user_id = req.user_id;
        
        if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide document_ids array' 
            });
        }
        
        const result = await PDFDetails.deleteMany({ 
            document_id: { $in: document_ids },
            user_id: user_id 
        });
        
        console.log(`✅ Bulk deleted ${result.deletedCount} policies`);
        console.log('ℹ️  OPTION A: Counter NOT decremented (tracks lifetime uploads)');
        
        // ✅ OPTION A: NO DECREMENT - Lifetime counter stays same
        
        res.json({ 
            success: true, 
            message: `${result.deletedCount} policies deleted successfully`,
            deletedCount: result.deletedCount
            // No updatedUsage - counter stays the same
        });
        
    } catch (error) {
        console.error('❌ Bulk delete error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// 8. GET STATISTICS FOR USER
exports.getStatistics = async (req, res) => {
    try {
        const user_id = req.user_id;
        
        const total = await PDFDetails.countDocuments({ 
            user_id, 
            is_active: true 
        });
        
        const policies = await PDFDetails.find({ 
            user_id, 
            is_active: true 
        });
        
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        let active = 0;
        let expiringSoon = 0;
        let expired = 0;
        
        policies.forEach(policy => {
            const expiryDateStr = policy.file_details?.Policy_expiry_date;
            
            if (!expiryDateStr || expiryDateStr === "NA") {
                active++;
                return;
            }
            
            let expiryDate;
            if (expiryDateStr.includes('/')) {
                const [day, month, year] = expiryDateStr.split('/');
                expiryDate = new Date(year, month - 1, day);
            } else {
                expiryDate = new Date(expiryDateStr);
            }
            
            if (isNaN(expiryDate.getTime())) {
                active++;
            } else if (expiryDate < now) {
                expired++;
            } else if (expiryDate < thirtyDaysFromNow) {
                expiringSoon++;
            } else {
                active++;
            }
        });
        
        res.json({ 
            success: true, 
            data: {
                total,
                active,
                expiringSoon,
                expired
            }
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

module.exports = exports;