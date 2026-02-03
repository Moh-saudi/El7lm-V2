/**
 * Script to sync all employees data to users collection
 * This ensures all employees have correct roleId and permissions
 * 
 * Run with: node scripts/sync-employees-to-users.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-admin-key.json');

try {
    if (!admin.apps.length) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
        console.log('✅ Firebase Admin initialized');
    }
} catch (error) {
    console.log('⚠️ Could not load service account, trying default credentials...');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'el7lm-platform'
        });
    }
}

const db = admin.firestore();

async function syncEmployeesToUsers() {
    console.log('🔄 Starting employee sync...\n');

    try {
        // 1. جلب جميع الموظفين
        const employeesSnapshot = await db.collection('employees').get();
        console.log(`📋 Found ${employeesSnapshot.size} employees\n`);

        if (employeesSnapshot.empty) {
            console.log('❌ No employees found');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const employeeDoc of employeesSnapshot.docs) {
            const employeeData = employeeDoc.data();
            const employeeId = employeeDoc.id;

            console.log(`\n📌 Processing: ${employeeData.name || 'Unknown'} (${employeeData.email})`);
            console.log(`   Employee ID: ${employeeId}`);
            console.log(`   Current roleId: ${employeeData.roleId}`);

            try {
                // 2. جلب صلاحيات الدور
                let permissions = [];
                let roleName = '';

                if (employeeData.roleId) {
                    const roleDoc = await db.collection('roles').doc(employeeData.roleId).get();
                    if (roleDoc.exists) {
                        const roleData = roleDoc.data();
                        permissions = roleData.permissions || [];
                        roleName = roleData.name || '';
                        console.log(`   ✅ Role found: ${roleName}`);
                        console.log(`   📜 Permissions: ${permissions.join(', ')}`);
                    } else {
                        console.log(`   ⚠️ Role not found: ${employeeData.roleId}`);
                    }
                } else {
                    console.log(`   ⚠️ No roleId set for employee`);
                }

                // 3. تحديث بيانات المستخدم في users collection
                const userRef = db.collection('users').doc(employeeId);
                const userDoc = await userRef.get();

                const updateData = {
                    // بيانات الموظف
                    employeeId: employeeId,
                    roleId: employeeData.roleId || null,
                    role: employeeData.roleId || null,
                    employeeRole: employeeData.roleId || null,
                    roleName: employeeData.roleName || roleName,
                    permissions: permissions,

                    // بيانات أساسية
                    accountType: 'admin',
                    name: employeeData.name,
                    email: employeeData.email,
                    phone: employeeData.phone,
                    isActive: employeeData.isActive !== false,
                    department: employeeData.department || '',

                    // تحديث الوقت
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                if (userDoc.exists) {
                    // تحديث المستخدم الموجود
                    await userRef.update(updateData);
                    console.log(`   ✅ Updated user document`);
                } else {
                    // إنشاء مستخدم جديد
                    await userRef.set({
                        ...updateData,
                        uid: employeeId,
                        created_at: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`   ✅ Created new user document`);
                }

                successCount++;

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Sync Summary:');
        console.log(`   ✅ Successfully synced: ${successCount} employees`);
        console.log(`   ❌ Errors: ${errorCount} employees`);
        console.log('='.repeat(50));

        if (successCount > 0) {
            console.log('\n🎉 Done! Employees should log out and log back in to see changes.');
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }

    process.exit(0);
}

// Run the sync
syncEmployeesToUsers();
