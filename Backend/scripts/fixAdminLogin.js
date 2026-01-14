// ============================================
// FILE: Backend/scripts/fixAdminLogin.js
// ✅ FIX: Manually restores Super Admin access
// ============================================

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

// YOUR NEW DATABASE URI
const MONGO_URI = "mongodb+srv://smartdocs_admin:9APHC6bzzVkXjmPK@smartdocs365-new.hyrjwxv.mongodb.net/smartdocs365?retryWrites=true&w=majority";

// ADMIN CREDENTIALS TO SET
const TARGET_EMAIL = "superadmin@smartdocs365.com";
const NEW_PASSWORD = "SuperAdmin@123"; // You will use this to login

async function fixAdmin() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const userModel = require('../models/userModel');
        const accountModel = require('../models/accountModel');

        // 1. Find the Admin User Profile
        console.log(`🔍 Looking for admin user: ${TARGET_EMAIL}...`);
        const user = await userModel.findOne({ email_address: TARGET_EMAIL });

        if (!user) {
            console.log('❌ Super Admin user NOT found in "users" collection!');
            console.log('   You might need to create the super admin from scratch.');
            process.exit(1);
        }
        console.log(`✅ Admin found: ${user.first_name} ${user.last_name} (${user.user_id})`);

        // 2. Hash the Password
        console.log('🔐 Hashing new password...');
        const hashedPassword = await bcryptjs.hash(NEW_PASSWORD, 10);

        // 3. Update or Create Account Entry
        console.log('🛠️  Fixing Admin Account entry...');
        
        // Remove any old/broken entries for this ID
        await accountModel.deleteMany({ user_id: user.user_id });

        // Create FRESH Super Admin Entry
        await accountModel.create({
            user_id: user.user_id,
            password: hashedPassword,
            role: "super-admin" // ⚠️ CRITICAL: Must be 'super-admin'
        });

        console.log('\n═══════════════════════════════════════════');
        console.log('✅ SUPER ADMIN ACCESS RESTORED!');
        console.log('═══════════════════════════════════════════');
        console.log(`📧 Email: ${TARGET_EMAIL}`);
        console.log(`🔑 Password: ${NEW_PASSWORD}`);
        console.log('🚀 Login here: https://smartdocs365.com/admin/login'); // Check your actual admin login URL
        
        process.exit(0);

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
}

fixAdmin();