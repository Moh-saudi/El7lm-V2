const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function exportEntireDatabase() {
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
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        
        console.log(`📋 Project ID: ${projectId ? 'Set' : 'Missing'}`);
        console.log(`📋 Client Email: ${clientEmail ? 'Set' : 'Missing'}`);
        console.log(`📋 Private Key: ${privateKey ? 'Set' : 'Missing'}`);

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey,
            }),
        });
        console.log('✅ Firebase Admin initialized successfully.');
    } catch (e) {
        console.error('❌ Failed to initialize matching admin:', e);
        return;
    }

    const db = admin.firestore();
    const result = {};

    try {
        console.log('⏳ Listing all collections...');
        const collections = await db.listCollections();
        console.log(`📁 Found ${collections.length} collections.`);

        for (const collection of collections) {
            const collectionId = collection.id;
            console.log(`\n⏳ Fetching collection: ${collectionId}...`);
            result[collectionId] = [];
            
            const snapshot = await collection.get();
            let count = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Recursively convert Firestore Timestamps & GeoPoints
                const convertSpecialTypes = (obj) => {
                    if (obj === null || typeof obj !== 'object') return;
                    Object.keys(obj).forEach(key => {
                        const val = obj[key];
                        if (val && typeof val.toDate === 'function') {
                            obj[key] = val.toDate().toISOString(); // Timestamp
                        } else if (val && val.latitude !== undefined && val.longitude !== undefined && val.isEqual) {
                           obj[key] = { latitude: val.latitude, longitude: val.longitude }; // GeoPoint
                        } else if (val && typeof val === 'object') {
                            convertSpecialTypes(val);
                        }
                    });
                };
                
                convertSpecialTypes(data);
                result[collectionId].push({ id: doc.id, ...data });
                count++;
            });
            console.log(`✅ Fetched ${count} documents from ${collectionId}.`);
        }

        const outputPath = path.resolve(process.cwd(), 'firebase_full_export.json');
        console.log(`\n💾 Writing data to ${outputPath}...`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        
        const stats = fs.statSync(outputPath);
        console.log(`🎉 Successfully exported entire database. File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (error) {
        console.error('❌ Error during export:', error);
    }
}

exportEntireDatabase().catch(console.error);
