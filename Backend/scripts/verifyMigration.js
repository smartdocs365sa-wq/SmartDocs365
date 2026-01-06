// ============================================
// FILE: Backend/scripts/verifyMigration.js
// Verify all data migrated successfully
// ✅ READY TO RUN - URL CONFIGURED
// ============================================

const mongoose = require('mongoose');

// NEW DATABASE URI - CORRECTLY CONFIGURED ✅
const NEW_DB_URI = "mongodb+srv://smartdocs_admin:9APHC6bzzVkXjmPK@smartdocs365-new.hyrjwxv.mongodb.net/smartdocs365?retryWrites=true&w=majority";

async function verifyMigration() {
    try {
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║   MIGRATION VERIFICATION TOOL             ║');
        console.log('╚═══════════════════════════════════════════╝\n');

        console.log('🔌 Connecting to NEW database...');
        console.log('   Database: smartdocs365');
        await mongoose.connect(NEW_DB_URI);
        console.log('✅ Connected successfully\n');

        // Import models
        const userModel = require('../models/userModel');
        const accountModel = require('../models/accountModel');
        const rechargeInfoModel = require('../models/rechargeInfoModel');
        const subcriptionTypesModel = require('../models/subcriptionTypesModel');
        const userSubcriptionInfoModel = require('../models/userSubcriptionInfoModel');
        const pdfDetailsModel = require('../models/pdfDetailsModel');
        const blogModel = require('../models/blogModel');

        console.log('═══════════════════════════════════════════');
        console.log('📊 DATABASE CONTENTS');
        console.log('═══════════════════════════════════════════\n');

        // Check Users
        const usersCount = await userModel.countDocuments();
        console.log(`👥 Users: ${usersCount}`);
        
        if (usersCount > 0) {
            const users = await userModel.find().limit(5);
            users.forEach(u => {
                console.log(`   - ${u.email_address} (${u.first_name} ${u.last_name})`);
            });
        }

        // Check Accounts
        const accountsCount = await accountModel.countDocuments();
        const admins = await accountModel.countDocuments({ role: 'admin' });
        const regularUsers = await accountModel.countDocuments({ role: 'user' });
        console.log(`\n🔐 Accounts: ${accountsCount}`);
        console.log(`   - Admins: ${admins}`);
        console.log(`   - Users: ${regularUsers}`);

        // Check Subscription Plans
        const plansCount = await subcriptionTypesModel.countDocuments();
        console.log(`\n📦 Subscription Plans: ${plansCount}`);
        
        const plans = await subcriptionTypesModel.find().sort({ plan_price: 1 });
        plans.forEach(p => {
            const planType = p.plan_price === 0 ? '🆓 FREE' : '💰 PAID';
            console.log(`   ${planType} ${p.plan_name}: Rs.${p.plan_price}`);
            console.log(`      Duration: ${p.plan_duration} days | PDF Limit: ${p.pdf_limit}`);
            if (p.plan_price === 0) {
                console.log(`      ⚠️  Plan ID: ${p.plan_id}`);
            }
        });

        // Check Recharges
        const rechargesCount = await rechargeInfoModel.countDocuments();
        const activeRecharges = await rechargeInfoModel.countDocuments({ 
            is_active: true, 
            payment_status: true 
        });
        const pendingRecharges = await rechargeInfoModel.countDocuments({ 
            payment_status: false 
        });
        console.log(`\n💳 Recharges: ${rechargesCount}`);
        console.log(`   - Active & Paid: ${activeRecharges}`);
        console.log(`   - Pending: ${pendingRecharges}`);

        // Check User Subscriptions
        const subscriptionsCount = await userSubcriptionInfoModel.countDocuments();
        const activeSubscriptions = await userSubcriptionInfoModel.countDocuments({ 
            plan_active: true 
        });
        console.log(`\n📊 User Subscriptions: ${subscriptionsCount}`);
        console.log(`   - Active: ${activeSubscriptions}`);

        // Check PDFs
        const pdfsCount = await pdfDetailsModel.countDocuments();
        console.log(`\n📄 PDF Documents: ${pdfsCount}`);

        // Check Blogs
        const blogsCount = await blogModel.countDocuments();
        console.log(`\n📝 Blogs: ${blogsCount}`);

        // Critical: Check Free Trial Plan ID
        console.log('\n═══════════════════════════════════════════');
        console.log('⚠️  CRITICAL CONFIGURATION CHECK');
        console.log('═══════════════════════════════════════════\n');

        const freeTrialPlan = await subcriptionTypesModel.findOne({ 
            plan_price: 0 
        });
        
        if (freeTrialPlan) {
            console.log('🆓 Free Trial Plan Found:');
            console.log(`   Name: ${freeTrialPlan.plan_name}`);
            console.log(`   Duration: ${freeTrialPlan.plan_duration} days`);
            console.log(`   PDF Limit: ${freeTrialPlan.pdf_limit}\n`);
            console.log('   📋 COPY THIS PLAN ID:');
            console.log(`   ${freeTrialPlan.plan_id}\n`);
            
            console.log('📝 ACTION REQUIRED:');
            console.log('   1. Open: Backend/controllers/registerController.js');
            console.log('   2. Find line 21');
            console.log('   3. Replace with:');
            console.log(`   const FREE_TRIAL_PLAN_ID = "${freeTrialPlan.plan_id}";`);
        } else {
            console.log('❌ WARNING: No Free Trial plan found!');
            console.log('   Create a Free Trial plan (Rs. 0) in admin panel');
        }

        // Check for test user
        console.log('\n═══════════════════════════════════════════');
        console.log('🧪 YOUR USER ACCOUNT STATUS');
        console.log('═══════════════════════════════════════════\n');

        const testUser = await userModel.findOne({ email_address: 'sivamec24@gmail.com' });
        if (testUser) {
            console.log('✅ User account found:');
            console.log(`   Email: ${testUser.email_address}`);
            console.log(`   Name: ${testUser.first_name} ${testUser.last_name}`);
            console.log(`   User ID: ${testUser.user_id}`);
            console.log(`   Current Plan ID: ${testUser.plan_id}`);
            
            // Check subscription
            const userSubscription = await userSubcriptionInfoModel.findOne({ 
                user_id: testUser.user_id 
            });
            if (userSubscription) {
                console.log(`\n   📊 Subscription Info:`);
                console.log(`      Plan: ${userSubscription.plan_name}`);
                console.log(`      Active: ${userSubscription.plan_active}`);
                console.log(`      PDF Limit: ${userSubscription.pdf_limit}`);
                console.log(`      Expiry: ${userSubscription.expiry_date}`);
            } else {
                console.log('\n   ⚠️  No subscription info found');
            }

            // Check recharges
            const userRecharges = await rechargeInfoModel.find({ 
                user_id: testUser.user_id 
            }).sort({ created_at: -1 });
            
            console.log(`\n   💳 Recharge History: ${userRecharges.length} entries`);
            if (userRecharges.length > 0) {
                const latestRecharge = userRecharges[0];
                const plan = await subcriptionTypesModel.findOne({ 
                    plan_id: latestRecharge.plan_id 
                });
                console.log(`      Latest: ${plan?.plan_name} - Rs.${latestRecharge.Amount}`);
                console.log(`      Status: Active=${latestRecharge.is_active}, Paid=${latestRecharge.payment_status}`);
            }

            // Check PDFs
            const userPDFs = await pdfDetailsModel.countDocuments({ 
                user_id: testUser.user_id 
            });
            console.log(`\n   📄 Uploaded PDFs: ${userPDFs}`);

        } else {
            console.log('⚠️  User sivamec24@gmail.com not found');
            console.log('   You may need to register again');
        }

        console.log('\n═══════════════════════════════════════════');
        console.log('✅ VERIFICATION COMPLETE');
        console.log('═══════════════════════════════════════════\n');

        console.log('📝 NEXT STEPS:');
        console.log('1. Update Render Environment:');
        console.log('   Go to: Render Dashboard → smartdocs365-backend → Environment');
        console.log('   Edit MONGODB_URI to:');
        console.log('   mongodb+srv://smartdocs_admin:9APHC6bzzVkXjmPK@smartdocs365-new.hyrjwxv.mongodb.net/smartdocs365?retryWrites=true&w=majority');
        console.log('\n2. Update registerController.js:');
        console.log(`   Line 21: const FREE_TRIAL_PLAN_ID = "${freeTrialPlan?.plan_id || 'CHECK_ABOVE'}";`);
        console.log('\n3. Commit and push:');
        console.log('   git add .');
        console.log('   git commit -m "Updated MongoDB URI"');
        console.log('   git push');
        console.log('\n4. Test the application:');
        console.log('   - Login with existing account');
        console.log('   - Try purchasing a plan');
        console.log('   - Upload a PDF\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

verifyMigration();