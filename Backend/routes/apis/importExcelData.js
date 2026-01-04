// ============================================
// FILE: Backend/routes/apis/importExcelData.js
// FIXED: Supports both Bulk Excel Upload (File) AND Single Record Create (JSON)
// ============================================

const multer = require('multer');
const xlsx = require('xlsx');
const express = require("express");
const router = express.Router();
const pdfDetailsModel = require('../../models/pdfDetailsModel');
const { v4 } = require("uuid");
const {
    getCurrentDateTime,
    isValidDate,
  } = require("../../utils/repetedUsedFunction");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('excelFile');

// Helper to handle Excel Serial Dates or standard strings
function parseDateValue(value) {
    if (!value) return "NA";
    
    // If it's a number (Excel Serial Date)
    if (typeof value === 'number') {
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        // 25569 is offset for Excel epoch, check if your dates are off by ~2 days or decades
        // Adjust logic if needed based on Excel version (1900 vs 1904 date system)
        const date = new Date((value - 25569) * MS_PER_DAY); 
        
        if(!isValidDate(date)) return "NA";
        
        const day = date.getUTCDate().toString().padStart(2, '0');
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // If it's already a string, return as is (Frontend might have formatted it)
    return value;
}

// ✅ Handle both Multipart (File) and JSON (Data)
router.post('/', upload, async (req, res, next) => {
    try {
        var user_id = req?.user_id; // From verifyJWT middleware
        var process_id = v4();

        // ====================================================
        // SCENARIO 1: Single Record Creation (From Frontend "Save" Button)
        // ====================================================
        // req.body is populated if JSON is sent, req.file is null
        if (!req.file && req.body.file_details) {
            
            const file_details = req.body.file_details;
            // Use provided filename or default
            const fileName = req.body.file_name || "Manual_Import";

            var payload = {};
            payload.file_details = file_details;
            payload.user_id = user_id;
            payload.process_id = process_id;
            payload.document_id = v4();
            
            // Use utility for consistent time format
            const timeData = getCurrentDateTime();
            payload.created_at = timeData.dateAndTimeString || new Date();
            payload.updated_at = timeData.dateAndTimeString || new Date();
            
            payload.file_name = fileName;
            payload.export_data = true;

            // Save single record to DB
            const result = await pdfDetailsModel.create(payload);
            
            return res.status(200).json({
                success: true,
                message: 'Policy created successfully',
                data: result
            });
        }

        // ====================================================
        // SCENARIO 2: Bulk Excel File Upload (Initial Import)
        // ====================================================
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded and no data provided'
            });
        }

        const expectedColumns = [
            "Insurance_company_name", "Insurance_plan_name", "Insurance_policy_type",
            "Insurance_policy_number", "Vehicle_registration_number", "Engine_number",
            "Chassis_number", "Policyholder_name", "Policyholder_address",
            "Policyholder_phone_number", "Policyholder_emailid", "Intermediary_code",
            "Intermediary_name", "Intermediary_phone_number", "Intermediary_emailid",
            "Total_premium_paid", "Own_damage_premium", "Base_premium",
            "Policy_start_date", "Policy_expiry_date", "Policy_issuance_date"
        ];

        const fileName = req.file.originalname;
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        
        // Handle case where workbook might be empty
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
             return res.status(400).json({ success: false, message: "Invalid Excel file" });
        }

        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (sheetData.length === 0) {
            return res.status(400).json({ success: false, message: "Sheet is empty" });
        }

        const actualColumns = Object.keys(sheetData[0]);

        // Optional: strict column checking
        // if (!expectedColumns.every(col => actualColumns.includes(col))) {
        //     return res.status(400).json({
        //         success: false,
        //         message: `Invalid file structure. Columns mismatch.`
        //     });
        // }

        for (var i = 0; i < sheetData.length; i++) {
            var file_details = sheetData[i];

            // Convert dates using helper
            file_details.Policy_expiry_date = parseDateValue(file_details.Policy_expiry_date);
            file_details.Policy_start_date = parseDateValue(file_details.Policy_start_date);
            file_details.Policy_issuance_date = parseDateValue(file_details.Policy_issuance_date);

            var payload = {};
            payload.file_details = file_details;
            payload.user_id = user_id;
            payload.process_id = process_id;
            payload.document_id = v4();
            
            const timeData = getCurrentDateTime();
            payload.created_at = timeData.dateAndTimeString;
            payload.updated_at = timeData.dateAndTimeString;
            
            payload.file_name = fileName;
            payload.export_data = true;

            await pdfDetailsModel.create(payload);
        }

        res.status(200).json({
            success: true,
            message: 'Bulk data uploaded successfully'
        });

    } catch (err) {
        console.log(`Error in Import Excel Route:`, err);
        next(err);
    }
});

module.exports = router;