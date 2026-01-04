// ============================================
// FILE: Backend/createFreeTrialPlan.cjs
// RUN: node createFreeTrialPlan.cjs
// ============================================

require("dotenv").config();
const mongoose = require("mongoose");

// Correct Paths
const subcriptionTypesModel = require("./models/subcriptionTypesModel");
const { getCurrentDateTime } = require("./utils/repetedUsedFunction");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/insurance-policy";
const FREE_TRIAL_PLAN_ID = "1a38214d-3a3c-4584-8980-734ebbc3a20d";

async function createFreeTrialPlan() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 2. Define the "Perfect" Free Trial Plan
    const freePlanData = {
      plan_name: "Free Trial",
      pdf_limit: 15,          // ✅ Hardcoded to 15
      plan_price: 0,
      plan_duration: 15,      // ✅ Hardcoded to 15 Days
      is_active: true,
      
      // ✅ UNIQUE DESCRIPTIONS (To avoid duplicates on Frontend)
      // The Frontend automatically shows "15 PDF Uploads", so we don't repeat it here.
      line1: "Access to Full Dashboard",  
      line2: "Valid for 15 days",
      line3: "No credit card required",
      
      updated_at: getCurrentDateTime().dateAndTimeString
    };

    // 3. Update or Create
    const existingPlan = await subcriptionTypesModel.findOne({ plan_id: FREE_TRIAL_PLAN_ID });

    if (existingPlan) {
      console.log("🔄 Updating existing Free Trial plan...");
      await subcriptionTypesModel.findOneAndUpdate(
        { plan_id: FREE_TRIAL_PLAN_ID },
        freePlanData
      );
      console.log("✅ Free Trial plan updated to 15 Days/15 PDFs.");
    } else {
      console.log("🆕 Creating new Free Trial plan...");
      await subcriptionTypesModel.create({
        plan_id: FREE_TRIAL_PLAN_ID,
        ...freePlanData,
        created_at: getCurrentDateTime().dateAndTimeString
      });
      console.log("✅ Free Trial plan created.");
    }

    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createFreeTrialPlan();