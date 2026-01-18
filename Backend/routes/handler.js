// ============================================
// FILE: Backend/routes/handler.js
// ✅ FIXED: Uploads, Counter Increment + INSTANT EMAIL TRIGGER
// ============================================

const express = require("express");
const verifyJWT = require("../middleware/verifyJWT");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { v4 } = require("uuid");

// ✅ MODELS
const pdfDetailsModel = require("../models/pdfDetailsModel");
const rechargeInfoModel = require("../models/rechargeInfoModel");
const subcriptionTypesModel = require("../models/subcriptionTypesModel");
const userSubcriptionInfoModel = require("../models/userSubcriptionInfoModel");
const blogModel = require("../models/blogModel");
const userModel = require("../models/userModel"); // ✅ ADDED: To fetch email address

// ✅ UTILS (Import Email Function)
const { sendLimitReachedMail } = require("../utils/repetedUsedFunction"); 

/* ===============================
   MULTER CONFIG
================================ */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const cleanName = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + cleanName);
  }
});

const upload = multer({ storage });

/* ===============================
   HELPERS
================================ */
function formatDateForFrontend(dateStr) {
  if (!dateStr || dateStr === "NA") return "";
  const dmy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;
  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  return dateStr;
}

/* ===============================
   BASE ROUTE
================================ */
router.get("/", (req, res) => {
  res.json({ status: "success", version: "FIXED-EMAIL-TRIGGER" });
});

/* ===============================
   PUBLIC ROUTES (No JWT)
================================ */
router.use("/user", require("./apis/register"));
router.use("/login", require("./apis/login"));
router.use("/update", require("./apis/update_password"));
router.use("/subcription-plan-direct", require("./admin/subcriptionPlan"));

// ✅ CRITICAL: Dedicated Payment Callback
router.use("/recharge/status-update", require("./apis/paymentCallback"));

// Public Blogs
router.get("/public/blogs", async (req, res) => {
  try {
    const blogs = await blogModel.find({ is_active: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (error) {
    console.error("Public Blog Fetch Error:", error);
    res.status(500).json({ success: false, message: "Error fetching blogs" });
  }
});

router.get("/download-demo-excel", (req, res) => {
  const demoPath = path.join(__dirname, "../DEMO.xlsx");
  if (fs.existsSync(demoPath)) {
    res.download(demoPath);
  } else {
    res.status(404).json({ success: false, message: "Demo file not found" });
  }
});

/* ===============================
   PROTECTED ROUTES (JWT Required)
================================ */
router.use(verifyJWT);

router.use("/user", require("./apis/user"));
router.use("/subcription-plan", require("./admin/subcriptionPlan"));
router.use("/admin/blogs", require("./admin/blogs")); 
router.use("/report", require("./admin/report"));
router.use("/pdf", require("./apis/pdfData"));
router.use("/questions", require("./apis/userQuestions"));
router.use("/import-excel-data", require("./apis/importExcelData"));

// Protected recharge routes
router.use("/recharge", require("./apis/recharge"));

/* ===============================
   PDF UPLOAD - ✅ FIXED WITH EMAIL TRIGGER
================================ */
router.post("/upload-pdf", upload.any(), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const user_id = req.user_id;
  if (!user_id) return res.status(401).json({ success: false, message: "User not authenticated" });

  console.log('\n📤 PDF Upload Request:');
  console.log('   User:', user_id);
  console.log('   Files:', req.files.length);

  // ✅ Get user's subscription info
  const userSubscription = await userSubcriptionInfoModel.findOne({ user_id });
  
  if (!userSubscription) {
    return res.status(403).json({
      success: false,
      message: "No subscription found. Please purchase a plan first."
    });
  }

  console.log('   Current Counter:', userSubscription.total_uploads_used);
  console.log('   Limit:', userSubscription.pdf_limit);

  // Check limit
  if (userSubscription.total_uploads_used >= userSubscription.pdf_limit) {
    return res.status(403).json({
      success: false,
      message: `Upload limit reached! Used ${userSubscription.total_uploads_used} of ${userSubscription.pdf_limit}. Upgrade plan.`
    });
  }

  const remainingUploads = userSubscription.pdf_limit - userSubscription.total_uploads_used;
  if (req.files.length > remainingUploads) {
    return res.status(403).json({
      success: false,
      message: `Limit exceeded. You can only upload ${remainingUploads} more file(s).`
    });
  }

  // Get active recharge
  const activeRecharge = await rechargeInfoModel.findOne({
    user_id,
    is_active: true,
    payment_status: true
  }).sort({ created_at: -1 });

  if (!activeRecharge) {
    return res.status(403).json({
      success: false,
      message: "No active recharge found."
    });
  }

  const recharge_id = activeRecharge.recharge_id;
  const results = [];
  const process_id = v4();
  let successfulUploads = 0;

  for (let i = 0; i < req.files.length; i++) {
    const filePath = req.files[i].path;
    const scriptPath = path.join(__dirname, "../extract_policy.py");
    const pathParts = filePath.split('/');
    const actualFilename = pathParts[pathParts.length - 1];
    
    await new Promise((resolve) => {
      const python = spawn("python3", [scriptPath, filePath]);
      let output = "";

      python.stdout.on("data", (d) => (output += d.toString()));
      python.stderr.on("data", (d) => console.error(d.toString()));

      python.on("close", async () => {
        try {
          const jsonStart = output.indexOf("{");
          const jsonEnd = output.lastIndexOf("}");
          const extracted = JSON.parse(output.slice(jsonStart, jsonEnd + 1));

          const payload = {
            document_id: v4(),
            process_id,
            user_id: user_id,
            recharge_id: recharge_id,
            plan_id: activeRecharge.plan_id,
            file_name: actualFilename,
            original_name: req.files[i].originalname,
            file_path: filePath,
            file_details: {
              Insurance_company_name: extracted.Insurance_company_name || "",
              Insurance_plan_name: extracted.Insurance_plan_name || "",
              Insurance_policy_type: extracted.Insurance_policy_type || "",
              Insurance_policy_number: extracted.Insurance_policy_number || "",
              Vehicle_registration_number: extracted.Vehicle_registration_number || "",
              Engine_number: extracted.Engine_number || "",
              Chassis_number: extracted.Chassis_number || "",
              Policyholder_name: extracted.Policyholder_name || "",
              Policyholder_address: extracted.Policyholder_address || "",
              Policyholder_phone_number: extracted.Policyholder_phone_number || "",
              Policyholder_emailid: extracted.Policyholder_emailid || "",
              Intermediary_code: extracted.Intermediary_code || "",
              Intermediary_name: extracted.Intermediary_name || "",
              Intermediary_phone_number: extracted.Intermediary_phone_number || "",
              Intermediary_emailid: extracted.Intermediary_emailid || "",
              Total_premium_paid: extracted.Total_premium_paid || "0",
              Own_damage_premium: extracted.Own_damage_premium || "0",
              Base_premium: extracted.Base_premium || "0",
              Policy_start_date: formatDateForFrontend(extracted.Policy_start_date),
              Policy_expiry_date: formatDateForFrontend(extracted.Policy_expiry_date),
              Policy_issuance_date: formatDateForFrontend(extracted.Policy_issuance_date)
            },
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          };

          const saved = await pdfDetailsModel.create(payload);
          successfulUploads++; 
          
          results.push({
            document_id: saved.document_id,
            file_name: saved.file_name,
            original_name: saved.original_name,
            file_details: saved.file_details
          });
        } catch (err) {
          console.error("PDF extraction error:", err);
          results.push({
            file_name: req.files[i].originalname,
            error: "Extraction failed"
          });
        }
        resolve();
      });
    });
  }

  // ✅ CRITICAL FIX: INCREMENT COUNTER & SEND EMAIL
  if (successfulUploads > 0) {
    console.log(`\n✅ Incrementing counter by ${successfulUploads}...`);
    
    const updatedSubscription = await userSubcriptionInfoModel.findOneAndUpdate(
      { user_id },
      { 
        $inc: { total_uploads_used: successfulUploads },
        updated_at: new Date()
      },
      { new: true }
    );

    const currentCount = Number(updatedSubscription.total_uploads_used);
    const limit = Number(updatedSubscription.pdf_limit);

    console.log('   New Counter:', currentCount);
    console.log('   Remaining:', limit - currentCount);

    // 📧 MAIL TRIGGER: Did we just hit the limit?
    if (limit > 0 && currentCount >= limit) {
        console.log(`🚨 LIMIT REACHED (${currentCount}/${limit}) - Triggering Alert Email!`);
        
        // Fetch User details for email address
        const user = await userModel.findOne({ user_id });
        if (user) {
            await sendLimitReachedMail(user.email_address, user.first_name || "User", limit);
            console.log(`✅ Limit Mail Sent to ${user.email_address}`);
        } else {
            console.log("❌ Could not find user to send limit email.");
        }
    }
  }

  res.json({ 
    success: true, 
    data: results,
    message: `${results.length} file(s) uploaded successfully.`,
    uploadStats: {
      successful: successfulUploads,
      failed: results.length - successfulUploads,
      remaining: userSubscription.pdf_limit - (userSubscription.total_uploads_used + successfulUploads)
    }
  });
});

router.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../uploads", req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }
  res.download(filePath);
});

module.exports = router;