import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = value;
        }
    });
}

async function exportCollections() {
    console.log('🔄 Initializing Firebase Admin...');
    
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        } else if (!privateKey.includes('\n')) {
            privateKey = privateKey.replace(
                /(-----BEGIN PRIVATE KEY-----)(.*?)(-----END PRIVATE KEY-----)/s,
                '$1\n$2\n$3'
            );
        }
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log('✅ Firebase Admin initialized successfully.');
    } catch (e) {
        console.error('❌ Failed to initialize matching admin:', e);
        return;
    }

    const db = admin.firestore();
    const result: any = {
        bulkPayments: [],
        bulk_payments: []
    };

    console.log('⏳ Fetching bulkPayments...');
    const bpSnapshot = await db.collection('bulkPayments').get();
    bpSnapshot.forEach(doc => {
        const data = doc.data();
        // Convert Timestamps to strings for JSON
        Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key].toDate === 'function') {
                data[key] = data[key].toDate().toISOString();
            }
        });
        result.bulkPayments.push({ id: doc.id, ...data });
    });
    console.log(`✅ Fetched ${result.bulkPayments.length} documents from bulkPayments.`);

    console.log('⏳ Fetching bulk_payments...');
    const bp_Snapshot = await db.collection('bulk_payments').get();
    bp_Snapshot.forEach(doc => {
        const data = doc.data();
        Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key].toDate === 'function') {
                data[key] = data[key].toDate().toISOString();
            }
        });
        result.bulk_payments.push({ id: doc.id, ...data });
    });
    console.log(`✅ Fetched ${result.bulk_payments.length} documents from bulk_payments.`);

    const outputPath = path.resolve(process.cwd(), 'bulk_payments_export.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`🎉 Successfully exported collections to: ${outputPath}`);
}

exportCollections().catch(console.error);
