
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
const TARGET_UID = '6kWRDWlJwrelT1LDvJmiX8HSL7Q2'; // Found from previous run

async function forceDeleteUser() {
    console.log(`🔥 Force deleting user: ${TARGET_EMAIL} (${TARGET_UID})...`);

    // 1. Blind Delete from Collections (Writes check quota differently than Reads)
    const collections = ['users', 'clubs', 'players', 'academies', 'agents', 'trainers', 'marketers'];

    for (const col of collections) {
        try {
            // Blind delete - no read cost
            await db.collection(col).doc(TARGET_UID).delete();
            console.log(`   - Sent delete request to [${col}]`);
        } catch (e) {
            console.log(`   ⚠️ Failed to delete from [${col}]: ${e.message}`);
        }
    }

    // 2. Delete Authentication Record
    try {
        await auth.deleteUser(TARGET_UID);
        console.log('✅ Deleted Authentication Record');
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            console.log('✅ Auth user already deleted');
        } else {
            console.error('❌ Error deleting Auth user:', e.message);
        }
    }

    console.log('\n🎉 Cleanup attempt finished. Try signing in now as a NEW user.');
}

forceDeleteUser();
