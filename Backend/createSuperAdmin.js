// ============================================
// FILE: Backend/createSuperAdmin.js - FINAL WORKING VERSION
// Fixed to use MONGODB_URI from your .env file
// ============================================

require("dotenv").config();
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const { v4 } = require("uuid");
const readline = require("readline");

// Import your models
const userModel = require("./models/userModel");
const accountModel = require("./models/accountModel");
const rechargeInfoModel = require("./models/rechargeInfoModel");

// FIXED: Read MONGODB_URI (not MONGO_URI) from your .env
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pdf-master";

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createSuperAdmin() {
  try {
    console.log("\n🚀 SmartDocs365 Super-Admin Setup");
    console.log("=====================================\n");

    // Connect to MongoDB Atlas
    console.log("🔗 Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB successfully!\n");

    // Get super-admin details
    const firstName = await question("Enter First Name: ");
    const lastName = await question("Enter Last Name: ");
    const email = await question("Enter Email: ");
    const mobile = await question("Enter Mobile: ");
    const password = await question("Enter Password (min 8 chars): ");

    // Validate inputs
    if (!firstName || !lastName || !email || !mobile || !password) {
      console.log("\n❌ All fields are required!");
      process.exit(1);
    }

    if (password.length < 8) {
      console.log("\n❌ Password must be at least 8 characters!");
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await userModel.findOne({ email_address: email });
    if (existingUser) {
      console.log("\n⚠️  Email already exists!");
      
      // Ask if they want to update role
      const updateRole = await question("\nDo you want to update this user to super-admin? (yes/no): ");
      
      if (updateRole.toLowerCase() === 'yes' || updateRole.toLowerCase() === 'y') {
        await accountModel.findOneAndUpdate(
          { user_id: existingUser.user_id },
          { role: "super-admin" }
        );
        console.log("\n✅ User role updated to super-admin!");
        console.log("\n📧 Login Credentials:");
        console.log("========================");
        console.log(`Email: ${email}`);
        console.log(`Password: (your existing password)`);
        console.log(`Role: super-admin`);
        console.log("========================\n");
        console.log("🌐 Login at: http://localhost:3000");
        console.log("   Click 'Admin Login' button\n");
      } else {
        console.log("\n❌ Operation cancelled. User not updated.");
      }
      
      process.exit(0);
    }

    // Hash password
    console.log("\n🔐 Hashing password...");
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Generate IDs
    const user_id = v4();
    const currentDate = new Date();

    console.log("📝 Creating user records...");

    // Create user
    await userModel.create({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      email_address: email.trim(),
      mobile: mobile.trim(),
      user_id,
      blocked: false,
      plan_id: "1a38214d-3a3c-4584-8980-734ebbc3a20d", // Free plan
      created_at: currentDate,
      updated_at: currentDate
    });

    // Create account with super-admin role
    await accountModel.create({
      user_id,
      password: hashedPassword,
      role: "super-admin"
    });

    // Create default recharge info (free plan)
    const rechargeExpiryDate = new Date();
    rechargeExpiryDate.setDate(rechargeExpiryDate.getDate() + 365); // 1 year validity

    await rechargeInfoModel.create({
      recharge_id: v4(),
      user_id,
      order_id: v4(),
      plan_id: "1a38214d-3a3c-4584-8980-734ebbc3a20d",
      is_active: true,
      payment_status: true,
      recharge_expiry_date: rechargeExpiryDate.toISOString().split('T')[0],
      FullName: `${firstName} ${lastName}`,
      Email_ID: email,
      Mobile_Number: mobile,
      Amount: 0,
      created_at: currentDate
    });

    console.log("\n" + "=".repeat(50));
    console.log("✅ SUPER-ADMIN ACCOUNT CREATED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log("\n📧 Login Credentials:");
    console.log("========================");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     super-admin`);
    console.log("========================\n");
    console.log("🔐 IMPORTANT: Save these credentials securely!\n");
    console.log("🌐 How to Login:");
    console.log("   1. Go to: http://localhost:3000");
    console.log("   2. Click 'Admin Login' button (top right)");
    console.log("   3. Enter your credentials");
    console.log("   4. Access admin panel at /admin\n");
    console.log("=".repeat(50) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("❌ ERROR CREATING SUPER-ADMIN");
    console.error("=".repeat(50));
    console.error("\nError:", error.message);
    
    if (error.message.includes("E11000 duplicate key")) {
      console.error("\n💡 This email already exists in the database.");
      console.error("   Try a different email or update the existing user's role.");
    } else {
      console.error("\n💡 Troubleshooting:");
      console.error("   1. Check if MongoDB Atlas connection is working");
      console.error("   2. Verify MONGODB_URI in .env file");
      console.error("   3. Check if IP address is whitelisted in MongoDB Atlas");
      console.error("   4. Verify database permissions");
    }
    console.error("\n" + "=".repeat(50) + "\n");
    process.exit(1);
  } finally {
    rl.close();
    mongoose.connection.close();
  }
}

// Run the script
createSuperAdmin();