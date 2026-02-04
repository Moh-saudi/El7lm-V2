// ... imports
// (Keep existing imports)
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { detectCountryFromPhone } from '@/lib/constants/countries';

export const maxDuration = 60; // Allow 60 seconds
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Enforce Node.js runtime

// تهيئة Admin SDK
function getAdminContext() {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Env Vars');
    }

    if (getApps().length === 0) {
        initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId
        });
    }

    return { auth: getAuth(), db: getFirestore() };
}

export async function POST(req: Request) {
    try {
        const { auth, db } = getAdminContext();
        console.log('🔄 Starting Full Sync from Auth Source...');

        let updatedCount = 0;
        let createdCount = 0;
        let pageToken = undefined;
        const updates: Promise<any>[] = [];

        // 1. Loop through ALL Auth Users (batches of 1000)
        let totalAuthUsers = 0;
        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            totalAuthUsers += listUsersResult.users.length;

            for (const userRecord of listUsersResult.users) {
                updates.push((async () => {
                    const uid = userRecord.uid;
                    const creationTime = new Date(userRecord.metadata.creationTime);
                    const phoneNumber = userRecord.phoneNumber || ''; // Auth phone (e.g. +212...)

                    // Check all collections used in the dashboard
                    const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

                    let found = false;

                    for (const col of collections) {
                        const docRef = db.collection(col).doc(uid);
                        const docSnap = await docRef.get();

                        if (docSnap.exists) {
                            found = true;
                            const data = docSnap.data();
                            const docUpdates: any = {};

                            // A. Sync Date - Force Sync from Auth
                            // We now overwrite these fields to ensure they match the source of truth (Auth).
                            // This fixes cases where fields existed but were undefined, null, string-based, or mismatched.
                            if (creationTime) {
                                docUpdates.createdAt = creationTime;
                                docUpdates.created_at = creationTime;
                                docUpdates.registrationDate = creationTime;
                            }

                            // B. Sync Country
                            if (!data?.country) {
                                const phoneToTest = data?.phone || phoneNumber || '';
                                const cleanPhone = phoneToTest.replace(/\D/g, '');

                                let countryName = '';
                                let countryCode = '';

                                // 1. Standard Detect
                                const std = detectCountryFromPhone(phoneToTest);
                                if (std) {
                                    countryName = std.name;
                                    countryCode = std.code;
                                }
                                // 2. Smart Local Detect
                                else if (cleanPhone) {
                                    if ((cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) && cleanPhone.length === 10) {
                                        countryName = 'المغرب'; countryCode = '+212';
                                    } else if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
                                        countryName = 'السعودية'; countryCode = '+966';
                                    } else if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
                                        countryName = 'مصر'; countryCode = '+20';
                                    }
                                }

                                if (countryName) {
                                    docUpdates.country = countryName;
                                    docUpdates.countryCode = countryCode;
                                }
                            }

                            if (Object.keys(docUpdates).length > 0) {
                                await docRef.update(docUpdates);
                                updatedCount++;
                            }
                            break; // Found the user in this collection, stop looking in others
                        }
                    }

                    // If user was NOT found in any collection, create them in 'users'
                    if (!found) {
                        const phoneToTest = phoneNumber || '';
                        const cleanPhone = phoneToTest.replace(/\D/g, '');
                        let countryName = '';
                        let countryCode = '';

                        const std = detectCountryFromPhone(phoneToTest);
                        if (std) {
                            countryName = std.name;
                            countryCode = std.code;
                        } else if (cleanPhone) {
                            if ((cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) && cleanPhone.length === 10) {
                                countryName = 'المغرب'; countryCode = '+212';
                            } else if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
                                countryName = 'السعودية'; countryCode = '+966';
                            } else if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
                                countryName = 'مصر'; countryCode = '+20';
                            }
                        }

                        const newUser = {
                            uid: uid,
                            id: uid, // Helper for some UIs
                            email: userRecord.email || '',
                            phone: phoneNumber,
                            name: userRecord.displayName || (userRecord.email ? userRecord.email.split('@')[0] : 'مستخدم جديد'),
                            photoURL: userRecord.photoURL || '',
                            createdAt: creationTime,
                            created_at: creationTime,
                            role: 'user', // Default role for orphaned users
                            accountType: 'user',
                            isActive: true, // Default to active
                            country: countryName || 'غير محدد',
                            countryCode: countryCode,
                            isSynced: true // Flag to know it was auto-created/synced
                        };

                        await db.collection('users').doc(uid).set(newUser);
                        createdCount++;
                    }

                })());
            }

            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        await Promise.all(updates);

        return NextResponse.json({
            success: true,
            updatedCount,
            createdCount,
            totalAuthUsers,
            message: `تم التحقق من ${totalAuthUsers} حساب في Auth. تم تحديث ${updatedCount} وإنشاء ${createdCount} مستخدم.`
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
