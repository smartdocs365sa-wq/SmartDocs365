// ============================================
// FILE: Backend/scripts/fixLogin.js
// ✅ FIX: Manually creates login credentials
// ============================================

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const { v4 } = require('uuid');

// YOUR NEW DATABASE URI
const MONGO_URI = "mongodb+srv://smartdocs_admin:9APHC6bzzVkXjmPK@smartdocs365-new.hyrjwxv.mongodb.net/smartdocs365?retryWrites=true&w=majority";

// The details from your screenshot
const TARGET_EMAIL = "sivamec24@gmail.com";
const TARGET_PASSWORD = "SIVADEEPI@24";

async function fixLogin() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // 1. Get Models
        const userModel = require('../models/userModel');
        const accountModel = require('../models/accountModel');

        // 2. Find the User
        console.log(`🔍 Looking for user: ${TARGET_EMAIL}...`);
        const user = await userModel.findOne({ email_address: TARGET_EMAIL });

        if (!user) {
            console.log('❌ User not found! Cannot fix login.');
            process.exit(1);
        }
        console.log(`✅ User found: ${user.first_name} ${user.last_name} (${user.user_id})`);

        // 3. Hash the Password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcryptjs.hash(TARGET_PASSWORD, 10);

        // 4. Update or Create Account Entry
        console.log('🛠️  Fixing Account entry...');
        
        // Remove any broken existing entries
        await accountModel.deleteMany({ user_id: user.user_id });

        // Create fresh entry
        await accountModel.create({
            user_id: user.user_id,
            password: hashedPassword,
            role: "user" // OR "admin" if you are an admin
        });

        console.log('\n═══════════════════════════════════════════');
        console.log('✅ LOGIN FIXED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════');
        console.log(`📧 Email: ${TARGET_EMAIL}`);
        console.log(`🔑 Password: ${TARGET_PASSWORD}`);
        console.log('🚀 YOU CAN LOG IN NOW!');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
}

fixLogin();