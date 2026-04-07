import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { detectCountryFromPhone } from '@/lib/constants/countries';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const db = getSupabaseAdmin();
    console.log('🔄 Starting Full Sync from Auth Source...');

    let updatedCount = 0;
    let createdCount = 0;
    let page = 1;
    let totalAuthUsers = 0;
    const pageSize = 1000;

    const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers'];

    let hasMore = true;
    while (hasMore) {
      const { data: authData, error: authError } = await db.auth.admin.listUsers();
      if (authError) throw authError;

      const users = authData?.users ?? [];
      totalAuthUsers += users.length;

      if (users.length < pageSize) hasMore = false;

      for (const userRecord of users) {
        const uid = userRecord.id;
        const creationTime = userRecord.created_at ? new Date(userRecord.created_at) : null;
        const phoneNumber = userRecord.phone ?? '';

        let found = false;

        for (const col of collections) {
          const { data: rows } = await db.from(col).select('*').eq('id', uid).limit(1);
          if (rows && rows.length > 0) {
            found = true;
            const data = rows[0] as Record<string, unknown>;
            const docUpdates: Record<string, unknown> = {};

            if (creationTime) {
              docUpdates.createdAt = creationTime.toISOString();
              docUpdates.created_at = creationTime.toISOString();
              docUpdates.registrationDate = creationTime.toISOString();
            }

            if (!data.country) {
              const phoneToTest = String(data.phone ?? phoneNumber ?? '');
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

              if (countryName) {
                docUpdates.country = countryName;
                docUpdates.countryCode = countryCode;
              }
            }

            if (Object.keys(docUpdates).length > 0) {
              await db.from(col).update(docUpdates).eq('id', uid);
              updatedCount++;
            }
            break;
          }
        }

        if (!found) {
          const phoneToTest = phoneNumber;
          const cleanPhone = phoneToTest.replace(/\D/g, '');
          let countryName = '';
          let countryCode = '';

          const std = detectCountryFromPhone(phoneToTest);
          if (std) {
            countryName = std.name; countryCode = std.code;
          } else if (cleanPhone) {
            if ((cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) && cleanPhone.length === 10) {
              countryName = 'المغرب'; countryCode = '+212';
            } else if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
              countryName = 'السعودية'; countryCode = '+966';
            } else if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
              countryName = 'مصر'; countryCode = '+20';
            }
          }

          const now = creationTime?.toISOString() ?? new Date().toISOString();
          await db.from('users').upsert({
            id: uid, uid,
            email: userRecord.email ?? '',
            phone: phoneNumber,
            name: userRecord.user_metadata?.full_name ?? (userRecord.email ? userRecord.email.split('@')[0] : 'مستخدم جديد'),
            photoURL: userRecord.user_metadata?.avatar_url ?? '',
            createdAt: now, created_at: now,
            role: 'user', accountType: 'user',
            isActive: true,
            country: countryName || 'غير محدد',
            countryCode,
            isSynced: true,
          });
          createdCount++;
        }
      }

      // Supabase listUsers doesn't have paginated tokens like Firebase, break after first batch
      hasMore = false;
    }

    return NextResponse.json({
      success: true, updatedCount, createdCount, totalAuthUsers,
      message: `تم التحقق من ${totalAuthUsers} حساب في Auth. تم تحديث ${updatedCount} وإنشاء ${createdCount} مستخدم.`,
    });
  } catch (error: unknown) {
    console.error('Sync Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
