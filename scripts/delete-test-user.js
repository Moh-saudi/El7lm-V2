
// تحميل المتغيرات البيئية
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            }),
        });
        console.log('✅ Firebase Admin Initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        process.exit(1);
    }
}

const db = admin.firestore();
const auth = admin.auth();

const TARGET_EMAIL = 'mo.saudi19@gmail.com';

async function deleteUserByEmail(email) {
    console.log(`🔍 Searching for user: ${email}...`);

    try {
        // 1. Get Authentication user to find UID
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log(`✅ Found Auth User: UID = ${userRecord.uid}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log('⚠️ User not found in Authentication, checking Firestore by email...');
            } else {
                throw e;
            }
        }

        let uid = userRecord ? userRecord.uid : null;

        // If auth user missing, search in `users` collection by email
        if (!uid) {
            const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
            if (!snapshot.empty) {
                uid = snapshot.docs[0].id;
                console.log(`✅ Found User in Firestore: UID = ${uid}`);
            } else {
                console.log('❌ User not found in Auth or Firestore.');
                return;
            }
        }

        console.log(`🗑️ Deleting user data for UID: ${uid}`);

        // 2. Delete from Collections
        const collectionsToCheck = [
            'users',
            'players',
            'clubs',
            'academies',
            'agents',
            'trainers',
            'marketers',
            'admins' // just in case
        ];

        for (const col of collectionsToCheck) {
            const docRef = db.collection(col).doc(uid);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                await docRef.delete();
                console.log(`   - Deleted from [${col}] collection`);
            }
        }

        // 3. Delete Authentication Record
        if (userRecord) {
            await auth.deleteUser(uid);
            console.log('✅ Deleted Authentication Record');
        }

        console.log('\n🎉 User deleted successfully! You can now sign in as a NEW user.');

    } catch (error) {
        console.error('❌ Error deleting user:', error);
    }
}

deleteUserByEmail(TARGET_EMAIL);
