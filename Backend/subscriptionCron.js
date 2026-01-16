// ============================================
// FILE: Backend/subscriptionCron.js
// ✅ FINAL: Policy & Subscription Expiry with Rate Limiting
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
        
        // ✅ Wait 2 seconds before next subscription email
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    
    console.log('✅ Subscription expiry check completed');
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

        console.log(`📋 Found ${activePolicies.length} active policies to check`);

        let emailsSent = 0;

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
                    
                    try {
                        await expiredPolicyMail(
                            policyHolderEmail, 
                            policyHolderName, 
                            formatDate(expiryDate),
                            policyNumber,
                            daysUntilExpiry
                        );
                        
                        emailsSent++;
                        
                        // ✅ Wait 2 seconds between each policy to avoid rate limits
                        // This ensures we stay under 2 emails per second
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                    } catch (emailError) {
                        console.error(`❌ Failed to send email for policy ${policyNumber}:`, emailError.message);
                        // Continue with next policy even if this one fails
                    }
                } else {
                    console.log(`⚠️ Skipping policy ${policyNumber} - invalid email: ${policyHolderEmail}`);
                }
            }
        }
        
        console.log(`✅ Policy expiry check completed - ${emailsSent} emails sent`);
        
    } catch (error) {
        console.error("❌ Error in Policy Expiry Check:", error);
    }
}

// ====================================================
// HELPER FUNCTIONS
// ====================================================

// Format Date for Email (DD/MM/YYYY)
function formatDate(date) {
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

// Parse various date string formats
function parseDateString(dateStr) {
    try {
        if(dateStr.includes('/')) {
            const parts = dateStr.split('/');
            
            // Handle both DD/MM/YYYY and MM/DD/YYYY
            if(parts.length === 3) {
                // Assumes DD/MM/YYYY (common for policy dates)
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                const year = parseInt(parts[2], 10);
                
                // Validate date components
                if(day > 0 && day <= 31 && month >= 0 && month <= 11 && year > 2000) {
                    return new Date(year, month, day);
                }
            }
        }
        
        // Try parsing as ISO date string (YYYY-MM-DD)
        const isoDate = new Date(dateStr);
        if(!isNaN(isoDate.getTime())) {
            return isoDate;
        }
        
        return null;
    } catch(e) { 
        console.error(`❌ Error parsing date: ${dateStr}`, e.message);
        return null; 
    }
}

// ====================================================
// MANUAL TRIGGER (for testing)
// ====================================================
async function runManualCheck() {
    console.log("🧪 Running manual expiry check...");
    await checkSubscriptionExpiry(); 
    await checkPolicyExpiry();
    console.log("✅ Manual check completed");
}

// Export functions
module.exports = { 
    checkExpiringSubscriptions: async () => { 
        await checkSubscriptionExpiry(); 
        await checkPolicyExpiry(); 
    },
    runManualCheck, // For testing
    checkSubscriptionExpiry,
    checkPolicyExpiry
};