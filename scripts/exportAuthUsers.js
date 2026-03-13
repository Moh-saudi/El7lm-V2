const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function exportAuthUsers() {
    console.log('🔄 Initializing Firebase Admin for Auth Export...');
    
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
        // If already initialized by another script in a shared environment, ignore
        if (e.code !== 'app/duplicate-app') {
            console.error('❌ Failed to initialize matching admin:', e);
            return;
        }
    }

    const allUsers = [];
    let nextPageToken;

    console.log('⏳ Fetching users from Firebase Auth...');

    try {
        do {
            // maxResults per page is 1000
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            
            listUsersResult.users.forEach((userRecord) => {
                allUsers.push({
                    uid: userRecord.uid,
                    email: userRecord.email,
                    emailVerified: userRecord.emailVerified,
                    displayName: userRecord.displayName,
                    phoneNumber: userRecord.phoneNumber,
                    disabled: userRecord.disabled,
                    metadata: {
                        creationTime: userRecord.metadata.creationTime,
                        lastSignInTime: userRecord.metadata.lastSignInTime,
                        lastRefreshTime: userRecord.metadata.lastRefreshTime,
                    },
                    providerData: userRecord.providerData.map(provider => ({
                        providerId: provider.providerId,
                        uid: provider.uid,
                        email: provider.email,
                        displayName: provider.displayName,
                        phoneNumber: provider.phoneNumber,
                    })),
                    customClaims: userRecord.customClaims
                });
            });

            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        console.log(`✅ Successfully fetched ${allUsers.length} users.`);

        const outputPath = path.resolve(process.cwd(), 'firebase_auth_export.json');
        console.log(`\n💾 Writing auth data to ${outputPath}...`);
        fs.writeFileSync(outputPath, JSON.stringify(allUsers, null, 2));
        
        const stats = fs.statSync(outputPath);
        console.log(`🎉 Successfully exported Auth Users. File size: ${(stats.size / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.error('❌ Error exporting Auth Users:', error);
    }
}

exportAuthUsers().catch(console.error);
