// ============================================
// FILE: Backend/subscriptionCron.js
// ✅ FIXED: Subscription Alerts + Auto-Stop + Policy Alerts
// ============================================

const cron = require("node-cron");
const userModel = require("./models/userModel");
const pdfDetailsModel = require("./models/pdfDetailsModel");
const userSubcriptionInfoModel = require("./models/userSubcriptionInfoModel");
const { expiredMail, expiredPolicyMail } = require("./utils/repetedUsedFunction");

// ⚠️ TEST MODE: Runs Every Minute (* * * * *) 
// ✅ PRODUCTION: Change back to ("0 9 * * *") for Daily at 9 AM
cron.schedule("* * * * *", async () => {
  console.log("🔔 Running subscription & policy checks...");
  await checkSubscriptionExpiry(); 
  await checkPolicyExpiry();       
});

// -------------------------------------------------------------
// 1. SUBSCRIPTION CHECK (Sends ONLY to Subscriber)
// -------------------------------------------------------------
async function checkSubscriptionExpiry() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // We fetch ALL active subscriptions to check their dates
    const activeSubs = await userSubcriptionInfoModel.find({ is_active: true });

    for (const sub of activeSubs) {
      if(!sub.expiry_date) continue;
      
      const expiryDate = new Date(sub.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      
      const diffTime = expiryDate - today;
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const user = await userModel.findOne({ user_id: sub.user_id });
      if (!user) continue;

      // ✅ LOGIC A: AUTO-STOP IF UPGRADED
      // If the user upgrades, 'expiryDate' becomes future (e.g., +365 days).
      // 'daysUntilExpiry' becomes positive (365).
      // The code below (Logic B & C) only runs for low or negative numbers.
      // So, emails STOP automatically when they upgrade.

      // ✅ LOGIC B: HARD STOP (Expired > 45 Days)
      // If they haven't renewed for 45 days, we deactivate them to stop spamming.
      if (daysUntilExpiry < -45) {
          console.log(`🚫 Deactivating Subscription for ${user.email_address} (Expired > 45 days)`);
          await userSubcriptionInfoModel.updateOne({ _id: sub._id }, { is_active: false });
          continue; 
      }

      // ✅ LOGIC C: Upcoming Expiry Warning (15, 10, 5, 3, 1, 0 Days)
      if ([15, 10, 5, 3, 1, 0].includes(daysUntilExpiry)) {
        console.log(`📧 Subscription Warning (${daysUntilExpiry} days left) to: ${user.email_address}`);
        await expiredMail(user.email_address, user.first_name, formatDate(expiryDate));
      }
      
      // ✅ LOGIC D: Already Expired - Remind Every 5 Days (-5, -10, ... -45)
      // We check if days are negative AND divisible by 5
      else if (daysUntilExpiry < 0 && Math.abs(daysUntilExpiry) % 5 === 0) {
        console.log(`📧 Subscription Expired Reminder (${Math.abs(daysUntilExpiry)} days ago) to: ${user.email_address}`);
        await expiredMail(user.email_address, user.first_name, formatDate(expiryDate)); 
      }
    }
  } catch (error) { console.error("❌ Subscription Check Error:", error); }
}

// -------------------------------------------------------------
// 2. POLICY EXPIRY CHECK (Sends to Policyholder & Subscriber)
// -------------------------------------------------------------
async function checkPolicyExpiry() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activePolicies = await pdfDetailsModel.find({ 
            is_active: true,
            "file_details.Policy_expiry_date": { $exists: true, $ne: "NA" }
        });

        for (const policy of activePolicies) {
            const expiryStr = policy.file_details.Policy_expiry_date;
            const expiryDate = parseDateString(expiryStr);
            if(!expiryDate) continue;

            expiryDate.setHours(0, 0, 0, 0);
            const diffTime = expiryDate - today;
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Policy Triggers
            const specificTriggerDays = [30, 15, 10, 5, 3, 1, 0, -1, -3, -7, -30];
            
            if (specificTriggerDays.includes(daysUntilExpiry)) {
                
                const policyHolderEmail = policy.file_details.Policyholder_emailid;
                const policyHolderName = policy.file_details.Policyholder_name || "Valued Customer";
                const policyNumber = policy.file_details.Insurance_policy_number || "Unknown";
                
                let statusMsg = "";
                if(daysUntilExpiry > 0) {
                    statusMsg = `Remaining time to expire: ${daysUntilExpiry} Days`;
                } else if (daysUntilExpiry === 0) {
                    statusMsg = `⚠️ EXPIRING TODAY!`;
                } else {
                    statusMsg = `❌ EXPIRED ${Math.abs(daysUntilExpiry)} days ago. RENEW IMMEDIATELY!`;
                }

                // 1. Send to Policy Holder
                if(isValidEmail(policyHolderEmail)) {
                    // console.log(`📧 Policy Alert to Customer: ${policyHolderEmail}`);
                    await expiredPolicyMail(policyHolderEmail, policyHolderName, formatDate(expiryDate), policyNumber, statusMsg);
                    await new Promise(r => setTimeout(r, 1000)); // Small delay
                }

                // 2. Send to Subscriber (Copy)
                const subscriber = await userModel.findOne({ user_id: policy.user_id });
                if(subscriber && isValidEmail(subscriber.email_address)) {
                    // console.log(`📧 Policy Alert Copy to Subscriber: ${subscriber.email_address}`);
                    await expiredPolicyMail(subscriber.email_address, `(Copy) ${policyHolderName}`, formatDate(expiryDate), policyNumber, statusMsg);
                    await new Promise(r => setTimeout(r, 1000)); // Small delay
                }
            }
        }
    } catch (error) { console.error("❌ Policy Check Error:", error); }
}

// Helpers
function formatDate(date) { return date.toLocaleDateString('en-GB'); }
function isValidEmail(email) { return email && email.includes("@") && email !== "NA"; }
function parseDateString(dateStr) {
    try {
        if(dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if(parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        const iso = new Date(dateStr);
        return isNaN(iso) ? null : iso;
    } catch(e) { return null; }
}

module.exports = { checkSubscriptionExpiry, checkPolicyExpiry };