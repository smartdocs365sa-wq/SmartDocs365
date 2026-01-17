// ============================================
// FILE: Backend/subscriptionCron.js
// ✅ FIXED: Exact Days Logic + Expired Alerts
// ============================================

const cron = require("node-cron");
const userModel = require("./models/userModel");
const pdfDetailsModel = require("./models/pdfDetailsModel");
const userSubcriptionInfoModel = require("./models/userSubcriptionInfoModel");
const { expiredMail, expiredPolicyMail } = require("./utils/repetedUsedFunction");

// Run every day at 9 AM
cron.schedule("0 9 * * *", async () => {
  console.log("🔔 Running daily expiry checks...");
  await checkSubscriptionExpiry(); 
  await checkPolicyExpiry();       
});

// 1. SUBSCRIPTION CHECK (For Subscriber)
// Logic: 15, 10, 5, 3, 1, 0 days
async function checkSubscriptionExpiry() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSubs = await userSubcriptionInfoModel.find({ is_active: true });

    for (const sub of activeSubs) {
      if(!sub.expiry_date) continue;
      
      const expiryDate = new Date(sub.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      
      const diffTime = expiryDate - today;
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // ✅ Trigger Days: 15, 10, 5, 3, 1, 0
      if ([15, 10, 5, 3, 1, 0].includes(daysUntilExpiry)) {
        const user = await userModel.findOne({ user_id: sub.user_id });
        if (!user) continue;

        console.log(`📧 Subscription Reminder (${daysUntilExpiry} days) to: ${user.email_address}`);
        await expiredMail(user.email_address, user.first_name, formatDate(expiryDate));
        await new Promise(r => setTimeout(r, 2000)); 
      }
      
      if(daysUntilExpiry < 0) {
           await userSubcriptionInfoModel.updateOne({ _id: sub._id }, { is_active: false });
      }
    }
  } catch (error) { console.error("❌ Subscription Check Error:", error); }
}

// 2. POLICY EXPIRY CHECK (Customer + Subscriber)
// Logic: 30, 15, 10, 5, 3, 1, 0 AND -1, -3, -7, -30, < -30
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

            // ✅ LOGIC: Future & Past Triggers
            // Specific Future Days: 30, 15, 10, 5, 3, 1, 0
            // Specific Past Days: -1, -3, -7, -30
            // Very Old Expired: Checks if it is LESS THAN -30 (e.g. -31, -60, etc - typically you might run this once a month or add to specific list)
            
            const specificTriggerDays = [30, 15, 10, 5, 3, 1, 0, -1, -3, -7, -30];
            let shouldSend = specificTriggerDays.includes(daysUntilExpiry);

            // Optional: If you want to catch ALL very old expired policies (use cautiously to avoid spam)
            // if (daysUntilExpiry < -30) { shouldSend = true; } 

            if (shouldSend) {
                
                const policyHolderEmail = policy.file_details.Policyholder_emailid;
                const policyHolderName = policy.file_details.Policyholder_name || "Valued Customer";
                const policyNumber = policy.file_details.Insurance_policy_number || "Unknown";
                
                // Calculate Dynamic Message
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
                    console.log(`📧 Policy Alert (${daysUntilExpiry} days) to Customer: ${policyHolderEmail}`);
                    await expiredPolicyMail(policyHolderEmail, policyHolderName, formatDate(expiryDate), policyNumber, statusMsg);
                    await new Promise(r => setTimeout(r, 2000));
                }

                // 2. Send to Subscriber (Copy)
                const subscriber = await userModel.findOne({ user_id: policy.user_id });
                if(subscriber && isValidEmail(subscriber.email_address)) {
                    console.log(`📧 Policy Alert Copy to Subscriber: ${subscriber.email_address}`);
                    await expiredPolicyMail(subscriber.email_address, `(Copy) ${policyHolderName}`, formatDate(expiryDate), policyNumber, statusMsg);
                    await new Promise(r => setTimeout(r, 2000));
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