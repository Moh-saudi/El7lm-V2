/**
 * API لتحديث سجلات geidea_payments القديمة وإضافة معلومات الباقة
 * 
 * يفحص جميع السجلات التي لا تحتوي على plan_name أو packageType
 * ويحاول استخراج هذه المعلومات من بيانات المستخدم
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MigrationResult {
    total: number;
    updated: number;
    failed: number;
    skipped: number;
    details: Array<{
        orderId: string;
        status: 'updated' | 'failed' | 'skipped';
        reason?: string;
    }>;
}

/**
 * استخراج معلومات الباقة من بيانات المستخدم
 */
async function getUserPackageInfo(
    merchantReferenceId: string | null,
    customerEmail: string | null
): Promise<{
    plan_name?: string | null;
    packageType?: string | null;
    package_type?: string | null;
    selectedPackage?: string | null;
} | null> {
    if (!adminDb) {
        return null;
    }

    try {
        let userId: string | null = null;

        // محاولة استخراج UID من merchantReferenceId
        if (merchantReferenceId) {
            const parts = merchantReferenceId.split('-');
            if (parts.length >= 2) {
                userId = parts[1];
            }
        }

        // البحث بالبريد الإلكتروني
        if (!userId && customerEmail) {
            const usersSnapshot = await adminDb
                .collection('users')
                .where('email', '==', customerEmail)
                .limit(1)
                .get();

            if (!usersSnapshot.empty) {
                userId = usersSnapshot.docs[0].id;
            }
        }

        if (!userId) {
            return null;
        }

        // جلب بيانات المستخدم
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return null;
        }

        const userData = userDoc.data();
        if (!userData) {
            return null;
        }

        const packageType = userData.selectedPackage || userData.packageType || userData.package_type || null;
        const plan_name = userData.plan_name || packageType || null;

        return {
            plan_name,
            packageType,
            package_type: packageType,
            selectedPackage: packageType,
        };
    } catch (error) {
        console.error('Error fetching user package info:', error);
        return null;
    }
}

/**
 * POST - تشغيل Migration
 */
export async function POST(request: NextRequest) {
    try {
        if (!adminDb) {
            return NextResponse.json(
                { error: 'Firebase Admin not initialized' },
                { status: 500 }
            );
        }

        console.log('🔄 [Geidea Migration] Starting package info migration...');

        const result: MigrationResult = {
            total: 0,
            updated: 0,
            failed: 0,
            skipped: 0,
            details: [],
        };

        // جلب جميع سجلات geidea_payments
        const snapshot = await adminDb.collection('geidea_payments').get();
        result.total = snapshot.size;

        console.log(`📊 [Geidea Migration] Found ${result.total} records`);

        // معالجة كل سجل
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const orderId = doc.id;

            // تخطي السجلات التي تحتوي بالفعل على معلومات الباقة
            if (data.plan_name || data.packageType) {
                result.skipped++;
                result.details.push({
                    orderId,
                    status: 'skipped',
                    reason: 'Already has package info',
                });
                continue;
            }

            // محاولة الحصول على معلومات الباقة
            const packageInfo = await getUserPackageInfo(
                data.merchantReferenceId,
                data.customerEmail
            );

            if (!packageInfo || !packageInfo.packageType) {
                result.failed++;
                result.details.push({
                    orderId,
                    status: 'failed',
                    reason: 'Could not find user or package info',
                });
                continue;
            }

            // تحديث السجل
            try {
                await doc.ref.update({
                    plan_name: packageInfo.plan_name,
                    packageType: packageInfo.packageType,
                    package_type: packageInfo.package_type,
                    selectedPackage: packageInfo.selectedPackage,
                    migratedAt: new Date().toISOString(),
                });

                result.updated++;
                result.details.push({
                    orderId,
                    status: 'updated',
                });

                console.log(`✅ [Geidea Migration] Updated ${orderId} with package: ${packageInfo.packageType}`);
            } catch (updateError) {
                result.failed++;
                result.details.push({
                    orderId,
                    status: 'failed',
                    reason: updateError instanceof Error ? updateError.message : 'Update failed',
                });
            }
        }

        console.log('✅ [Geidea Migration] Migration completed:', result);

        return NextResponse.json({
            success: true,
            message: 'Migration completed',
            result,
        });
    } catch (error) {
        console.error('❌ [Geidea Migration] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Migration failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET - عرض حالة السجلات
 */
export async function GET(request: NextRequest) {
    try {
        if (!adminDb) {
            return NextResponse.json(
                { error: 'Firebase Admin not initialized' },
                { status: 500 }
            );
        }

        const snapshot = await adminDb.collection('geidea_payments').get();

        let withPackageInfo = 0;
        let withoutPackageInfo = 0;

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.plan_name || data.packageType) {
                withPackageInfo++;
            } else {
                withoutPackageInfo++;
            }
        });

        return NextResponse.json({
            total: snapshot.size,
            withPackageInfo,
            withoutPackageInfo,
            needsMigration: withoutPackageInfo > 0,
        });
    } catch (error) {
        console.error('Error checking migration status:', error);
        return NextResponse.json(
            {
                error: 'Failed to check status',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
