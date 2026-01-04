// ============================================
// FILE: Backend/cleanDatabase.js
// WARNING: This will delete ALL data except super-admin!
// Usage: node cleanDatabase.js
// ============================================

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const userModel = require("./models/userModel");
const accountModel = require("./models/accountModel");
const rechargeInfoModel = require("./models/rechargeInfoModel");
const pdfDetailsModel = require("./models/pdfDetailsModel");
const paymentHistory = require("./models/paymentHistory");

const MONGO_URI = process.env.MONGODB_URI;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function cleanDatabase() {
  try {
    console.log("\n⚠️  DATABASE CLEANUP SCRIPT");
    console.log("=".repeat(50));
    console.log("\n🔴 WARNING: This will delete ALL data except super-admin!");
    console.log("   - All regular users");
    console.log("   - All PDFs/policies");
    console.log("   - All payment history");
    console.log("   - All recharge info");
    
    const confirm = await question("\nType 'DELETE' to confirm: ");
    
    if (confirm !== 'DELETE') {
      console.log("\n❌ Operation cancelled.");
      process.exit(0);
    }

    console.log("\n🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!\n");

    // Get super-admin user_id to preserve it
    const superAdmin = await accountModel.findOne({ role: "super-admin" });
    const superAdminUserId = superAdmin?.user_id;

    if (!superAdminUserId) {
      console.log("⚠️  No super-admin found! All data will be deleted.");
    } else {
      console.log(`✅ Super-admin found: ${superAdminUserId}`);
      console.log("   This account will be preserved.\n");
    }

    console.log("🗑️  Starting cleanup...\n");

    // Delete regular users (keep super-admin)
    const usersDeleted = await userModel.deleteMany({ 
      user_id: { $ne: superAdminUserId } 
    });
    console.log(`✅ Deleted ${usersDeleted.deletedCount} regular users`);

    // Delete regular accounts (keep super-admin)
    const accountsDeleted = await accountModel.deleteMany({ 
      user_id: { $ne: superAdminUserId },
      role: { $ne: "super-admin" }
    });
    console.log(`✅ Deleted ${accountsDeleted.deletedCount} regular accounts`);

    // Delete all PDFs
    const pdfsDeleted = await pdfDetailsModel.deleteMany({});
    console.log(`✅ Deleted ${pdfsDeleted.deletedCount} PDF records`);

    // Delete payment history (keep super-admin's)
    const paymentsDeleted = await paymentHistory.deleteMany({});
    console.log(`✅ Deleted ${paymentsDeleted.deletedCount} payment records`);

    // Delete recharge info (keep super-admin's)
    const rechargeDeleted = await rechargeInfoModel.deleteMany({ 
      user_id: { $ne: superAdminUserId } 
    });
    console.log(`✅ Deleted ${rechargeDeleted.deletedCount} recharge records`);

    console.log("\n" + "=".repeat(50));
    console.log("✅ DATABASE CLEANED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log("\n📊 Summary:");
    console.log(`   Users:     ${usersDeleted.deletedCount}`);
    console.log(`   Accounts:  ${accountsDeleted.deletedCount}`);
    console.log(`   PDFs:      ${pdfsDeleted.deletedCount}`);
    console.log(`   Payments:  ${paymentsDeleted.deletedCount}`);
    console.log(`   Recharges: ${rechargeDeleted.deletedCount}`);
    
    if (superAdminUserId) {
      console.log("\n✅ Super-admin account preserved!");
    }
    
    console.log("\n" + "=".repeat(50) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    rl.close();
    mongoose.connection.close();
  }
}

cleanDatabase();