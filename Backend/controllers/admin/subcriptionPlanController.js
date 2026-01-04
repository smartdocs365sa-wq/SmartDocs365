// ============================================
// FILE: Backend/controllers/admin/subcriptionPlanController.js (FINAL FIXED VERSION)
// ============================================

const subcriptionTypesModel = require("../../models/subcriptionTypesModel");
const userSubcriptionInfoModel = require("../../models/userSubcriptionInfoModel"); 
const { v4 } = require("uuid");
const { getCurrentDateTime } = require("../../utils/repetedUsedFunction");

// 1. CREATE PLAN
const create = async (req, res, next) => {
  try {
    const requiredFields = ["plan_name", "pdf_limit", "plan_price", "plan_duration"];
    for (const field of requiredFields) {
      if (!Object.keys(req.body).includes(field)) {
        return res.status(400).json({ success: false, message: `Required Field "${field}" is Missing!` });
      }
    }
    const { plan_name, pdf_limit, plan_price, plan_duration, line1, line2, line3 } = req.body;
    const result = await subcriptionTypesModel.create({
      plan_id: v4(),
      plan_name: plan_name.trim(),
      pdf_limit: Number(pdf_limit),
      plan_price: Number(plan_price),
      plan_duration: Number(plan_duration),
      line1: line1 || '',
      line2: line2 || '',
      line3: line3 || '',
      is_active: true,
      created_at: getCurrentDateTime().dateAndTimeString,
      updated_at: getCurrentDateTime().dateAndTimeString
    });
    res.status(201).json({ success: true, message: "Plan Created", data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. UPDATE PLAN (FIXED SYNC LOGIC)
const updatePlan = async (req, res, next) => {
  try {
    const plan_id = req.params?.id;
    console.log(`\n🔵 [Admin Update] Request received for Plan ID: ${plan_id}`);
    
    if (!plan_id) return res.status(400).json({ success: false, message: "Plan ID is required!" });

    const { plan_name, pdf_limit, plan_price, plan_duration, line1, line2, line3 } = req.body;
    
    // A. Update the Plan Definition
    const updateData = { updated_at: getCurrentDateTime().dateAndTimeString };
    if (plan_name !== undefined) updateData.plan_name = plan_name.trim();
    if (pdf_limit !== undefined) updateData.pdf_limit = Number(pdf_limit);
    if (plan_price !== undefined) updateData.plan_price = Number(plan_price);
    if (plan_duration !== undefined) updateData.plan_duration = Number(plan_duration);
    if (line1 !== undefined) updateData.line1 = line1;
    if (line2 !== undefined) updateData.line2 = line2;
    if (line3 !== undefined) updateData.line3 = line3;

    const updatedPlan = await subcriptionTypesModel.findOneAndUpdate(
      { plan_id },
      updateData,
      { new: true }
    );

    if (!updatedPlan) {
        return res.status(404).json({ success: false, message: "Plan not found!" });
    }
    console.log("✅ [Success] Plan Definition Updated.");

    // =========================================================
    // ✅ SYNC LOGIC: Update All Existing Users on this Plan
    // =========================================================
    if (plan_duration !== undefined || pdf_limit !== undefined) {
      console.log(`🔄 [Sync] Starting user sync...`);
      
      const subscribers = await userSubcriptionInfoModel.find({ plan_id: plan_id });
      console.log(`   [Sync] Found ${subscribers.length} active subscribers.`);
      
      let updatedCount = 0;

      for (const sub of subscribers) {
        // 🛡️ SAFETY CHECK: Skip broken records
        if (!sub.user_id) {
            console.log("   ⚠️ [Skip] Found record without user_id, skipping...");
            continue;
        }

        let updates = {};

        // A. Update PDF Limit
        if (pdf_limit !== undefined) updates.pdf_limit = Number(pdf_limit);

        // B. Recalculate Expiry Date (ANCHORED TO TODAY)
        // This ensures the update always gives valid time from the moment you click update.
        if (plan_duration !== undefined) {
          const now = new Date();
          const newExpiry = new Date(now);
          newExpiry.setDate(now.getDate() + Number(plan_duration));
          
          updates.expiry_date = newExpiry;
          
          console.log(`   -> User ${sub.user_id}: Resetting Duration. New Expiry: ${newExpiry.toISOString().split('T')[0]}`);
        }

        if (Object.keys(updates).length > 0) {
           await userSubcriptionInfoModel.updateOne({ _id: sub._id }, updates);
           updatedCount++;
        }
      }
      console.log(`✅ [Sync] Successfully updated ${updatedCount} users.`);
    }

    res.status(200).json({
      success: true,
      message: "Plan Updated & Users Synced!",
      data: updatedPlan
    });

  } catch (error) {
    console.error("❌ Error Updating Plan:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const list = async (req, res, next) => {
    try {
      const data = await subcriptionTypesModel.find({ is_active: true });
      res.status(200).json({ success: true, message: "Fetched Successfully!", result: data.length, data: data });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch plans" });
    }
};
  
const deletePlan = async (req, res, next) => {
    try {
      const plan_id = req.params?.id;
      await subcriptionTypesModel.findOneAndUpdate({ plan_id }, { is_active: false });
      res.status(200).json({ success: true, message: "Plan Deleted Successfully!" });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to delete plan" });
    }
};
  
const specificPlanDetail = async (req, res, next) => {
    try {
      const plan_id = req.params?.id;
      const data = await subcriptionTypesModel.findOne({ plan_id, is_active: true });
      if (!data) return res.status(404).json({ success: false, message: "Plan not found!" });
      res.status(200).json({ success: true, message: "Details Fetched!", data: data });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch details" });
    }
};

module.exports = { create, updatePlan, list, deletePlan, specificPlanDetail };