
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
        let pageToken = undefined;
        const updates: Promise<any>[] = [];

        // 1. Loop through ALL Auth Users (batches of 1000)
        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);

            for (const userRecord of listUsersResult.users) {
                updates.push((async () => {
                    const uid = userRecord.uid;
                    const creationTime = new Date(userRecord.metadata.creationTime);
                    const phoneNumber = userRecord.phoneNumber || ''; // Auth phone (e.g. +212...)

                    // Try to find the user in generic 'users' collection first (most likely)
                    // We will try to update 'users', 'players', 'clubs' blindly or checking existence.
                    // Checking existence is costly. Let's assume 'users' for now or try generic update.

                    // Better strategy: Update ALL collections we suspect.
                    const collections = ['users', 'players', 'clubs', 'academies'];

                    for (const col of collections) {
                        const docRef = db.collection(col).doc(uid);

                        // We use update() so we don't create garbage docs if user is not in that collection
                        // But update() fails if doc doesn't exist.
                        // So we need to check existence efficiently?
                        // Actually, getting doc is fast.
                        const docSnap = await docRef.get();
                        if (docSnap.exists) {
                            const data = docSnap.data();
                            const docUpdates: any = {};

                            // A. Sync Date
                            if (!data?.createdAt && creationTime) {
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
                })());
            }

            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        await Promise.all(updates);

        return NextResponse.json({
            success: true,
            count: updatedCount,
            message: `تمت مزامنة ${updatedCount} مستخدم من سجلات Auth بنجاح`
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
