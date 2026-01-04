// ============================================
// FILE: Backend/routes/apis/user.js (COMPLETE FIX)
// ============================================

const express = require("express");
const router = express.Router();
const userModel = require("../../models/userModel");
const accountModel = require("../../models/accountModel");
const pdfDetailsModel = require("../../models/pdfDetailsModel");
const userSubcriptionInfoModel = require("../../models/userSubcriptionInfoModel");
const rechargeInfoModel = require("../../models/rechargeInfoModel");
const subcriptionTypesModel = require("../../models/subcriptionTypesModel");
const { getCurrentDateTime } = require("../../utils/repetedUsedFunction");

// ✅ HELPER: Formats date to "YYYY-MM-DD"
const formatToSimpleDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

// ========================================
// 1. USER PROFILE & BASIC DETAILS
// ========================================

router.get("/profile", async (req, res) => {
  try {
    const user = await userModel.findOne({ user_id: req.user_id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        name: user.name || user.full_name, 
        email: user.email || user.email_address,
        phone: user.phone || user.mobile_number,
        created_at: user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await userModel.findOneAndUpdate(
      { user_id: req.user_id },
      { name, phone, updated_at: new Date() },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user_id: user.user_id, name: user.name, email: user.email, phone: user.phone }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/get-user-details", async (req, res) => {
  try {
    const user_id = req?.user_id;
    if (!user_id) return res.status(401).json({ success: false, message: "user_id Missing!" });

    const user = await userModel.findOne({ user_id });
    if (!user) return res.status(404).json({ success: false, message: "User not found!" });

    const account = await accountModel.findOne({ user_id });
    const rechargeInfos = await rechargeInfoModel.find({ user_id, is_active: true, payment_status: true });

    let totalLimit = 0;
    let pdfCount = 0;
    let planName = "";
    let planPrice = 0;
    let rechargeExpiredDate = null;
    let latestExpiryDate = new Date(0);

    for (const recharge of rechargeInfos) {
      const planInfo = await subcriptionTypesModel.findOne({ plan_id: recharge.plan_id });
      if (planInfo) {
        totalLimit += planInfo.pdf_limit;
        planName = planInfo.plan_name;
        planPrice = planInfo.plan_price;
      }
      const count = await pdfDetailsModel.countDocuments({ recharge_id: recharge.recharge_id });
      pdfCount += count;
      const targetDate = new Date(recharge.recharge_expiry_date);
      if (targetDate > latestExpiryDate) {
        latestExpiryDate = targetDate;
        rechargeExpiredDate = recharge.recharge_expiry_date;
      }
    }

    res.status(200).json({
      success: true,
      message: "User details fetched successfully!",
      data: { ...user.toObject(), role: account?.role || 'user' },
      other: {
        totalPdfLimit: totalLimit,
        usedLimit: pdfCount,
        leftLimit: totalLimit - pdfCount,
        planName: planName || "Free Trial",
        planPrice: planPrice,
        rechargeExpiredDate: formatToSimpleDate(rechargeExpiredDate)
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================================
// 2. ✅ FIXED DASHBOARD STATS
// ========================================

router.get("/dashboard-stats", async (req, res) => {
  try {
    const user_id = req.user_id;
    
    console.log('📊 Dashboard Stats Request for user:', user_id);

    // ✅ CRITICAL FIX: Get or create subscription if missing
    let subscription = await userSubcriptionInfoModel.findOne({ user_id });
    
    // ✅ If no subscription exists, create one with Free Trial
    if (!subscription) {
      console.log('⚠️  No subscription found, creating Free Trial...');
      
      // Find Free Trial plan
      const freeTrialPlan = await subcriptionTypesModel.findOne({ 
        plan_name: { $regex: /free trial/i } 
      });
      
      if (freeTrialPlan) {
        subscription = await userSubcriptionInfoModel.create({
          user_id: user_id,
          plan_id: freeTrialPlan.plan_id,
          plan_name: freeTrialPlan.plan_name,
          plan_type: freeTrialPlan.plan_type || "Free",
          pdf_limit: freeTrialPlan.pdf_limit || 10,
          total_uploads_used: 0,
          plan_active: true,
          expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log('✅ Free Trial subscription created');
      } else {
        console.error('❌ No Free Trial plan found in database!');
        return res.status(500).json({ 
          success: false, 
          message: "No subscription plan configured" 
        });
      }
    }

    // ✅ Now calculate actual counts from database
    const actualUploadCount = await pdfDetailsModel.countDocuments({ 
      user_id 
      // No is_active filter - counts ALL uploads (Option A)
    });
    
    console.log(`📈 User ${user_id}:`);
    console.log(`   Subscription counter: ${subscription.total_uploads_used}`);
    console.log(`   Actual DB count: ${actualUploadCount}`);
    
    // ✅ If counts don't match, sync them
    if (subscription.total_uploads_used !== actualUploadCount) {
      console.log('🔄 Syncing counter...');
      subscription.total_uploads_used = actualUploadCount;
      await subscription.save();
      console.log(`✅ Counter synced to ${actualUploadCount}`);
    }

    // Prepare response data
    let planName = subscription.plan_name || "Free Trial";
    let planId = subscription.plan_id;
    let expiryDate = formatToSimpleDate(subscription.expiry_date);
    let uploadsUsed = subscription.total_uploads_used || 0;
    let uploadsLimit = subscription.pdf_limit || 0;
    
    // Check if plan is expired
    const now = new Date();
    const expiry = new Date(subscription.expiry_date);
    const isExpired = expiry < now;
    
    if (isExpired) {
      planName = `${planName} (Expired)`;
    }

    const uploadPercentage = uploadsLimit > 0 
      ? Math.round((uploadsUsed / uploadsLimit) * 100) : 0;

    // ✅ Policy Visual Stats
    const totalPolicies = await pdfDetailsModel.countDocuments({ 
      user_id, 
      is_active: true 
    });
    
    const allPolicies = await pdfDetailsModel.find({ 
      user_id, 
      is_active: true 
    });
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    let activePolicies = 0;
    let expiringSoon = 0;
    let expired = 0;

    allPolicies.forEach(p => {
      const pDate = p.file_details?.Policy_expiry_date;
      if (pDate && pDate !== "NA") {
        let d = new Date(pDate);
        if (pDate.includes('/')) {
          const [day, month, year] = pDate.split('/');
          d = new Date(year, month - 1, day);
        }
        if (!isNaN(d.getTime())) {
          if (d < now) expired++;
          else if (d < thirtyDaysFromNow) expiringSoon++;
          else activePolicies++;
        } else {
          activePolicies++;
        }
      } else {
        activePolicies++;
      }
    });

    console.log('📊 Sending response:', {
      totalPolicies,
      activePolicies,
      expiringSoon,
      expired,
      planName,
      uploadsUsed,
      uploadsLimit,
      uploadPercentage
    });

    res.json({
      success: true,
      data: {
        totalPolicies,
        activePolicies,
        expiringSoon,
        expired,
        planName,
        planId,
        uploadsUsed,
        uploadsLimit,
        uploadPercentage,
        expiryDate
      }
    });

  } catch (error) {
    console.error("❌ Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// 3. SUBSCRIPTION PAGE INFO
// ========================================

router.get("/subscription", async (req, res) => {
  try {
    const user_id = req.user_id;
    const subscription = await userSubcriptionInfoModel.findOne({ user_id });

    if (!subscription || !subscription.plan_active) {
      return res.json({
        success: true,
        data: { hasActivePlan: false, message: "No active subscription" }
      });
    }

    const planType = await subcriptionTypesModel.findOne({ plan_id: subscription.plan_id });
    const price = planType ? planType.plan_price : 0;

    res.json({
      success: true,
      data: {
        hasActivePlan: true,
        planName: subscription.plan_name,
        planPrice: price,
        pdfLimit: subscription.pdf_limit,
        usedUploads: subscription.total_uploads_used || 0,
        remainingUploads: Math.max(0, subscription.pdf_limit - (subscription.total_uploads_used || 0)),
        expiryDate: formatToSimpleDate(subscription.expiry_date),
        paymentStatus: true
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// 4. ADMIN ROUTES
// ========================================

router.get("/list", async (req, res) => {
    try {
        if (req.role !== "admin" && req.role !== "super-admin") {
          return res.status(403).json({ success: false, message: "Permission denied" });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.listPerPage) || 10;
        const skip = (page - 1) * limit;

        const userAccounts = await accountModel.find({ role: 'user' });
        const userIds = userAccounts.map(acc => acc.user_id);

        const users = await userModel.find({ user_id: { $in: userIds } })
          .sort({ created_at: -1 }).skip(skip).limit(limit);

        res.status(200).json({
          success: true,
          message: "Users fetched successfully!",
          data: users,
          result: users.length,
          pagination: { total: userIds.length, page, limit, totalPages: Math.ceil(userIds.length / limit) }
        });
    } catch(e) { res.status(500).json({success: false, message: e.message}) }
});

router.put("/block", async (req, res) => {
  try {
    if (req.role !== "admin" && req.role !== "super-admin") return res.status(403).json({ msg: "Denied" });
    const { user_id, Status } = req.body;
    const result = await userModel.findOneAndUpdate(
      { user_id },
      { blocked: Status, updated_at: getCurrentDateTime().dateAndTimeString },
      { new: true }
    );
    if(!result) return res.status(404).json({msg:"User not found"});
    res.json({ success: true, message: `User ${Status ? 'blocked' : 'unblocked'}`, data: result });
  } catch(e) { res.status(500).json({success: false, message: e.message}) }
});

router.post("/delete", async (req, res) => {
   try {
    if (req.role !== "admin" && req.role !== "super-admin") return res.status(403).json({msg: "Denied"});
    const { user_id } = req.body;
    if(user_id === req.user_id) return res.status(400).json({msg:"Cannot delete self"});
    
    await Promise.all([
      userModel.deleteOne({ user_id }),
      accountModel.deleteOne({ user_id }),
      userSubcriptionInfoModel.deleteMany({ user_id }),
      rechargeInfoModel.deleteMany({ user_id }),
      pdfDetailsModel.deleteMany({ user_id })
    ]);
    res.json({ success: true, message: "User Deleted" });
   } catch(e) { res.status(500).json({success: false, message: e.message}) }
});

router.post("/make-admin", async (req, res) => {
  try {
    if (req.role !== "super-admin") return res.status(403).json({ msg: "Denied" });
    const { user_id } = req.body;
    await accountModel.findOneAndUpdate({ user_id }, { role: "admin" });
    res.json({ success: true, message: "User promoted to admin" });
  } catch(e) { res.status(500).json({success: false, message: e.message}) }
});

router.post("/demote-admin", async (req, res) => {
  try {
    if (req.role !== "super-admin") return res.status(403).json({ msg: "Denied" });
    const { user_id } = req.body;
    if(user_id === req.user_id) return res.status(400).json({msg:"Cannot demote self"});
    await accountModel.findOneAndUpdate({ user_id }, { role: "user" });
    res.json({ success: true, message: "Admin demoted to user" });
  } catch(e) { res.status(500).json({success: false, message: e.message}) }
});

router.get("/admin/list", async (req, res) => {
  try {
    if (req.role !== "super-admin") return res.status(403).json({ msg: "Denied" });
    const accounts = await accountModel.find({ role: "admin" });
    const ids = accounts.map(a => a.user_id);
    const admins = await userModel.find({ user_id: { $in: ids } });
    res.json({ success: true, list: admins });
  } catch(e) { res.status(500).json({success: false, message: e.message}) }
});

router.post("/delete-admin", async (req, res) => {
  try {
    if (req.role !== "super-admin") return res.status(403).json({ msg: "Denied" });
    const { user_id } = req.body;
    if(user_id === req.user_id) return res.status(400).json({msg:"Cannot delete self"});
    await Promise.all([
      userModel.deleteOne({ user_id }),
      accountModel.deleteOne({ user_id }),
      userSubcriptionInfoModel.deleteMany({ user_id }),
      rechargeInfoModel.deleteMany({ user_id }),
      pdfDetailsModel.deleteMany({ user_id })
    ]);
    res.json({ success: true, message: "Admin Deleted" });
  } catch(e) { res.status(500).json({success: false, message: e.message}) }
});

router.get("/get-user-subcription-info/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.role !== "admin" && req.role !== "super-admin" && req.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Permission denied!" });
    }
    const subInfo = await userSubcriptionInfoModel.findOne({ user_id: userId });
    if (!subInfo) return res.status(404).json({ success: false, message: "Info not found" });
    res.status(200).json({ success: true, data: subInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;