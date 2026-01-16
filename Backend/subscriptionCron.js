// ============================================
// FILE: Backend/subscriptionCron.js
// ✅ FIXED: Policy & Subscription Expiry Emails
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

// ====================================================
// 1. Check SUBSCRIPTION Expiry (Send to Subscriber)
// ====================================================
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

      // ✅ Alert at 15, 7, 3, and 0 days (Expired)
      if ([15, 7, 3, 0].includes(daysUntilExpiry)) {
        const user = await userModel.findOne({ user_id: sub.user_id });
        if (!user) continue;

        const msgType = daysUntilExpiry === 0 ? "Expired" : "Expiring Soon";
        console.log(`📧 Sending Subscription ${msgType} Mail to: ${user.email_address}`);

        await expiredMail(
            user.email_address,
            user.first_name,
            formatDate(expiryDate)
        );
      }
      
      // Deactivate if expired
      if(daysUntilExpiry < 0) {
           await userSubcriptionInfoModel.updateOne(
               { _id: sub._id }, 
               { is_active: false }
           );
           console.log(`❌ Deactivated Subscription for User: ${sub.user_id}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in Subscription Check:", error);
  }
}

// ====================================================
// 2. Check POLICY Expiry (Send to Customer + You)
// ====================================================
async function checkPolicyExpiry() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find active PDFs with valid expiry dates
        const activePolicies = await pdfDetailsModel.find({ 
            is_active: true,
            "file_details.Policy_expiry_date": { $exists: true, $ne: "NA" }
        });

        for (const policy of activePolicies) {
            const expiryStr = policy.file_details.Policy_expiry_date;
            if(!expiryStr) continue;

            let expiryDate = parseDateString(expiryStr);
            if(!expiryDate) continue;

            expiryDate.setHours(0, 0, 0, 0);
            const diffTime = expiryDate - today;
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // ✅ Alert at 30, 15, 7, 3, and 0 days before expiry
            if ([30, 15, 7, 3, 0].includes(daysUntilExpiry)) {
                
                const policyHolderEmail = policy.file_details.Policyholder_emailid;
                const policyHolderName = policy.file_details.Policyholder_name || "Valued Customer";
                const policyNumber = policy.file_details.Insurance_policy_number || "Unknown";

                // ✅ VALIDATE EMAIL: Only send if valid
                if(policyHolderEmail && policyHolderEmail !== "NA" && policyHolderEmail.includes("@")) {
                    console.log(`📧 Sending POLICY Expiry Mail to: ${policyHolderEmail} (Days: ${daysUntilExpiry})`);
                    
                    await expiredPolicyMail(
                        policyHolderEmail, 
                        policyHolderName, 
                        formatDate(expiryDate),
                        policyNumber,
                        daysUntilExpiry
                    );
                }
            }
        }
    } catch (error) {
        console.error("❌ Error in Policy Expiry Check:", error);
    }
}

// Helper: Format Date for Email
function formatDate(date) {
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

// Helper: Parse various date strings
function parseDateString(dateStr) {
    try {
        if(dateStr.includes('/')) {
            const parts = dateStr.split('/');
            // Assumes DD/MM/YYYY
            return new Date(parts[2], parts[1]-1, parts[0]);
        }
        return new Date(dateStr);
    } catch(e) { return null; }
}

module.exports = { 
    checkExpiringSubscriptions: async () => { 
        await checkSubscriptionExpiry(); 
        await checkPolicyExpiry(); 
    }
};