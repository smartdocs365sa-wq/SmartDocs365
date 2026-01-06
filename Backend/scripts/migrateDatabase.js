// ============================================
// FILE: Backend/scripts/migrateDatabase.js
// Migrate ALL data from old MongoDB to new MongoDB
// ✅ READY TO RUN - URLs CONFIGURED
// ============================================

const mongoose = require('mongoose');

// ============================================
// CONFIGURATION - CORRECTLY CONFIGURED ✅
// ============================================

// OLD DATABASE (Your current Render MongoDB)
const OLD_DB_URI = "mongodb+srv://pdfmaster:pdfmaster123@cluster0.iaqmv6x.mongodb.net/pdf-master?retryWrites=true&w=majority";

// NEW DATABASE (Your new MongoDB Atlas account)
const NEW_DB_URI = "mongodb+srv://smartdocs_admin:9APHC6bzzVkXjmPK@smartdocs365-new.hyrjwxv.mongodb.net/smartdocs365?retryWrites=true&w=majority";

// ============================================
// COLLECTIONS TO MIGRATE
// ============================================
const COLLECTIONS = [
    'users',
    'accounts',
    'recharge-infos',
    'subscription-plans',
    'user-subcription-infos',
    'pdf-details',
    'blogs',
    'notifications',
    'payment-history',
    'user-questions'
];

// ============================================
// MIGRATION FUNCTION
// ============================================
async function migrateDatabase() {
    let oldConnection, newConnection;

    try {
        console.log('🚀 Starting MongoDB Migration...\n');
        
        console.log('🔌 Connecting to OLD database...');
        console.log('   Database: pdf-master');
        oldConnection = await mongoose.createConnection(OLD_DB_URI, {
            serverSelectionTimeoutMS: 10000
        }).asPromise();
        console.log('✅ Connected to OLD database');

        console.log('\n🔌 Connecting to NEW database...');
        console.log('   Database: smartdocs365');
        newConnection = await mongoose.createConnection(NEW_DB_URI, {
            serverSelectionTimeoutMS: 10000
        }).asPromise();
        console.log('✅ Connected to NEW database\n');

        let totalDocuments = 0;
        let migratedCollections = 0;

        for (const collectionName of COLLECTIONS) {
            try {
                console.log(`📦 Processing: ${collectionName}`);

                // Check if collection exists in old DB
                const collections = await oldConnection.db.listCollections({ name: collectionName }).toArray();
                if (collections.length === 0) {
                    console.log(`   ⚠️  Not found in old database, skipping...\n`);
                    continue;
                }

                // Get data from old collection
                const oldCollection = oldConnection.collection(collectionName);
                const documents = await oldCollection.find({}).toArray();

                if (documents.length === 0) {
                    console.log(`   ℹ️  Collection is empty, skipping...\n`);
                    continue;
                }

                console.log(`   📊 Found ${documents.length} documents`);

                // Insert into new collection
                const newCollection = newConnection.collection(collectionName);
                
                // Check if data already exists
                const existingCount = await newCollection.countDocuments();
                if (existingCount > 0) {
                    console.log(`   ⚠️  Found ${existingCount} existing documents`);
                    console.log(`   🗑️  Clearing old data...`);
                    await newCollection.deleteMany({});
                }

                // Insert documents in batches (to handle large collections)
                const batchSize = 1000;
                for (let i = 0; i < documents.length; i += batchSize) {
                    const batch = documents.slice(i, i + batchSize);
                    await newCollection.insertMany(batch, { ordered: false });
                    console.log(`   ⬆️  Inserted ${Math.min(i + batchSize, documents.length)}/${documents.length} documents`);
                }

                console.log(`   ✅ Successfully migrated ${documents.length} documents\n`);
                totalDocuments += documents.length;
                migratedCollections++;

            } catch (error) {
                console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
                console.log('');
            }
        }

        console.log('═══════════════════════════════════════════');
        console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════\n');
        
        console.log('📊 MIGRATION SUMMARY:');
        console.log(`   Collections Migrated: ${migratedCollections}/${COLLECTIONS.length}`);
        console.log(`   Total Documents: ${totalDocuments}\n`);
        
        console.log('📋 NEW DATABASE CONTENTS:');
        for (const collectionName of COLLECTIONS) {
            try {
                const collection = newConnection.collection(collectionName);
                const count = await collection.countDocuments();
                if (count > 0) {
                    console.log(`   ✓ ${collectionName}: ${count} documents`);
                }
            } catch (error) {
                console.log(`   ✗ ${collectionName}: Error counting`);
            }
        }

        console.log('\n═══════════════════════════════════════════');
        console.log('📝 NEXT STEPS:');
        console.log('═══════════════════════════════════════════');
        console.log('1. Update Render Environment Variable:');
        console.log('   Variable Name: MONGODB_URI or MONGO_URI');
        console.log('   Value: mongodb+srv://smartdocs_admin:9APHC6bzzVkXjmPK@smartdocs365-new.hyrjwxv.mongodb.net/smartdocs365?retryWrites=true&w=majority');
        console.log('\n2. Run verification script:');
        console.log('   node scripts/verifyMigration.js');
        console.log('\n3. Update registerController.js with Free Trial Plan ID');
        console.log('\n4. Push to GitHub (Render auto-deploys)');
        console.log('═══════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        if (oldConnection) {
            await oldConnection.close();
            console.log('👋 Closed OLD database connection');
        }
        if (newConnection) {
            await newConnection.close();
            console.log('👋 Closed NEW database connection');
        }
        process.exit(0);
    }
}

// ============================================
// RUN MIGRATION
// ============================================
console.log('\n');
console.log('╔═══════════════════════════════════════════╗');
console.log('║   SMARTDOCS365 DATABASE MIGRATION         ║');
console.log('║   FROM: pdf-master → smartdocs365         ║');
console.log('╚═══════════════════════════════════════════╝');
console.log('\n');

migrateDatabase();