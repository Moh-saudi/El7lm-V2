
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
        }

        const logs: string[] = [];
        console.log(`🔥 Starting PURGE for email: ${email}`);

        // 1. Terminate from Auth
        let uid = null;
        try {
            const userRecord = await adminAuth.getUserByEmail(email);
            uid = userRecord.uid;
            await adminAuth.deleteUser(uid);
            logs.push(`✅ Deleted from Firebase Auth (UID: ${uid})`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                logs.push('ℹ️ User not found in Firebase Auth (Already Clean)');
            } else {
                logs.push(`❌ Error deleting from Auth: ${error.message}`);
                console.error('Auth Delete Error', error);
            }
        }

        // 2. Terminate from Firestore (Sweep all collections)
        const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'employees', 'parents', 'marketers'];

        for (const coll of collections) {
            try {
                const snapshot = await adminDb.collection(coll).where('email', '==', email).get();
                if (!snapshot.empty) {
                    const batch = adminDb.batch();
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                        logs.push(`🔥 Deleting from Firestore: ${coll}/${doc.id}`);
                    });
                    await batch.commit();
                }

                // If we know the UID, check for ID match too (in case email field is missing/mismatched)
                if (uid) {
                    const docRef = adminDb.collection(coll).doc(uid);
                    const docSnap = await docRef.get();
                    if (docSnap.exists) {
                        await docRef.delete();
                        logs.push(`🔥 Deleting orphan doc by ID from ${coll}/${uid}`);
                    }
                }

            } catch (err: any) {
                console.error(`Error scanning ${coll}:`, err);
            }
        }

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error('Purge error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
