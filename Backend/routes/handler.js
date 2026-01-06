// ============================================
// FILE: Backend/routes/handler.js
// ✅ FIXED: Public Access for Subscription Plans
// ============================================

const express = require("express");
const verifyJWT = require("../middleware/verifyJWT");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const pdfDetailsModel = require("../models/pdfDetailsModel");
const rechargeInfoModel = require("../models/rechargeInfoModel");
const subcriptionTypesModel = require("../models/subcriptionTypesModel");
const blogModel = require("../models/blogModel"); 
const { v4 } = require("uuid");

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
  res.json({ status: "success", version: "FINAL-FIXED-V7" });
});

/* ===============================
   PUBLIC ROUTES (No Login Required)
================================ */
router.use("/user", require("./apis/register"));
router.use("/login", require("./apis/login"));
router.use("/update", require("./apis/update_password"));

// ✅ CRITICAL FIX: Public Subscription Route
// This allows the "Choose Your Plan" page to load plans without a token
router.use("/subcription-plan-direct", require("./admin/subcriptionPlan"));

// Public Blogs Route
router.get("/public/blogs", async (req, res) => {
  try {
    const blogs = await blogModel.find({ is_active: true }).sort({ created_at: -1 });
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
   PROTECTED ROUTES (REQUIRE JWT)
================================ */
router.use(verifyJWT);

// Protected User Routes
router.use("/user", require("./apis/user"));
router.use("/subcription-plan", require("./admin/subcriptionPlan")); // Admin/Protected access
router.use("/admin/blogs", require("./admin/blogs")); 
router.use("/report", require("./admin/report"));
router.use("/pdf", require("./apis/pdfData"));
router.use("/recharge", require("./apis/recharge"));
router.use("/questions", require("./apis/userQuestions"));
router.use("/import-excel-data", require("./apis/importExcelData"));

/* ===============================
   PDF UPLOAD ROUTE
================================ */
router.post("/upload-pdf", upload.any(), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const user_id = req.user_id;
  if (!user_id) return res.status(401).json({ success: false, message: "User not authenticated" });

  const activeRecharge = await rechargeInfoModel.findOne({
    user_id,
    is_active: true,
    payment_status: true
  }).sort({ created_at: -1 });

  if (!activeRecharge) {
    return res.status(403).json({
      success: false,
      message: "No active subscription found. Please purchase a plan first."
    });
  }

  const recharge_id = activeRecharge.recharge_id;
  const planInfo = await subcriptionTypesModel.findOne({ plan_id: activeRecharge.plan_id });
  const pdfCount = await pdfDetailsModel.countDocuments({ recharge_id });
  const pdfLimit = planInfo?.pdf_limit || 0;

  if (pdfCount >= pdfLimit) {
    return res.status(403).json({
      success: false,
      message: `Upload limit reached! Used ${pdfCount} of ${pdfLimit}. Upgrade plan.`
    });
  }

  const remainingUploads = pdfLimit - pdfCount;
  if (req.files.length > remainingUploads) {
    return res.status(403).json({
      success: false,
      message: `Limit exceeded. You can only upload ${remainingUploads} more file(s).`
    });
  }

  const results = [];
  const process_id = v4();

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

  res.json({ 
    success: true, 
    data: results,
    message: `${results.length} file(s) uploaded successfully.`
  });
});

/* ===============================
   FILE DOWNLOAD
================================ */
router.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../uploads", req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }
  res.download(filePath);
});

module.exports = router;