/**
 * API لتحديث سجلات geidea_payments القديمة وإضافة معلومات الباقة
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

async function getUserPackageInfo(
    merchantReferenceId: string | null,
    customerEmail: string | null
): Promise<{
    plan_name?: string | null;
    packageType?: string | null;
    package_type?: string | null;
    selectedPackage?: string | null;
} | null> {
    const db = getSupabaseAdmin();

    try {
        let userId: string | null = null;

        if (merchantReferenceId) {
            const parts = merchantReferenceId.split('-');
            if (parts.length >= 2) userId = parts[1];
        }

        if (!userId && customerEmail) {
            const { data: users } = await db.from('users').select('id').eq('email', customerEmail).limit(1);
            if (users?.length) userId = String(users[0].id);
        }

        if (!userId) return null;

        const { data: userData } = await db.from('users').select('selectedPackage, packageType, package_type, plan_name').eq('id', userId).limit(1);
        if (!userData?.length) return null;

        const row = userData[0] as Record<string, unknown>;
        const packageType = String(row.selectedPackage || row.packageType || row.package_type || '');
        const plan_name = String(row.plan_name || packageType || '');

        return {
            plan_name: plan_name || null,
            packageType: packageType || null,
            package_type: packageType || null,
            selectedPackage: packageType || null,
        };
    } catch (error) {
        console.error('Error fetching user package info:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getSupabaseAdmin();
        console.log('🔄 [Geidea Migration] Starting package info migration...');

        const result: MigrationResult = { total: 0, updated: 0, failed: 0, skipped: 0, details: [] };

        const { data: payments, count } = await db.from('geidea_payments').select('*', { count: 'exact' });
        result.total = count ?? (payments ?? []).length;

        console.log(`📊 [Geidea Migration] Found ${result.total} records`);

        for (const row of (payments ?? []) as Record<string, unknown>[]) {
            const orderId = String(row.id);

            if (row.plan_name || row.packageType) {
                result.skipped++;
                result.details.push({ orderId, status: 'skipped', reason: 'Already has package info' });
                continue;
            }

            const packageInfo = await getUserPackageInfo(
                row.merchantReferenceId ? String(row.merchantReferenceId) : null,
                row.customerEmail ? String(row.customerEmail) : null
            );

            if (!packageInfo || !packageInfo.packageType) {
                result.failed++;
                result.details.push({ orderId, status: 'failed', reason: 'Could not find user or package info' });
                continue;
            }

            try {
                await db.from('geidea_payments').update({
                    plan_name: packageInfo.plan_name,
                    packageType: packageInfo.packageType,
                    package_type: packageInfo.package_type,
                    selectedPackage: packageInfo.selectedPackage,
                    migratedAt: new Date().toISOString(),
                }).eq('id', orderId);

                result.updated++;
                result.details.push({ orderId, status: 'updated' });
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
        return NextResponse.json({ success: true, message: 'Migration completed', result });
    } catch (error) {
        console.error('❌ [Geidea Migration] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(_request: NextRequest) {
    try {
        const db = getSupabaseAdmin();
        const { data: payments } = await db.from('geidea_payments').select('plan_name, packageType');

        let withPackageInfo = 0;
        let withoutPackageInfo = 0;

        (payments ?? []).forEach((row: Record<string, unknown>) => {
            if (row.plan_name || row.packageType) withPackageInfo++;
            else withoutPackageInfo++;
        });

        return NextResponse.json({
            total: (payments ?? []).length,
            withPackageInfo,
            withoutPackageInfo,
            needsMigration: withoutPackageInfo > 0,
        });
    } catch (error) {
        console.error('Error checking migration status:', error);
        return NextResponse.json(
            { error: 'Failed to check status', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
