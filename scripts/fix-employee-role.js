/**
 * Script to fix employee roleId in Firestore
 * Run with: node scripts/fix-employee-role.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (make sure GOOGLE_APPLICATION_CREDENTIALS is set)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'el7lm-platform'
    });
}

const db = admin.firestore();

async function fixEmployeeRole() {
    const employeeEmail = 'macro@el7lm.com';
    const newRoleId = 'users_management'; // دور إدارة المستخدمين

    console.log(`🔍 Searching for employee with email: ${employeeEmail}`);

    try {
        // البحث عن الموظف
        const employeesRef = db.collection('employees');
        const snapshot = await employeesRef.where('email', '==', employeeEmail).get();

        if (snapshot.empty) {
            console.log('❌ Employee not found');
            return;
        }

        const employeeDoc = snapshot.docs[0];
        const employeeData = employeeDoc.data();

        console.log('📋 Current employee data:', {
            id: employeeDoc.id,
            name: employeeData.name,
            email: employeeData.email,
            currentRoleId: employeeData.roleId,
            role: employeeData.role
        });

        // تحديث roleId
        await employeeDoc.ref.update({
            roleId: newRoleId,
            role: newRoleId,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Updated roleId to: ${newRoleId}`);

        // تحديث أيضاً في users collection
        const userRef = db.collection('users').doc(employeeDoc.id);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            await userRef.update({
                roleId: newRoleId,
                role: newRoleId,
                employeeRole: newRoleId,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Updated users collection as well');
        }

        console.log('🎉 Done! Please log out and log back in.');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

fixEmployeeRole();
