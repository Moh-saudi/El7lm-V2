import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Starting email migration...');

    const { batchSize = 10, dryRun = false } = await request.json();
    const db = getSupabaseAdmin();

    // Get users with long email addresses
    const { data: allUsers, error } = await db
      .from('users')
      .select('id, email')
      .gte('email', 'user_');

    if (error) throw error;

    const longEmails = (allUsers ?? []).filter((u: Record<string, unknown>) => {
      const email = String(u.email ?? '');
      return email && email.length > 50;
    });

    console.log(`📊 [Admin API] Found ${longEmails.length} users with long emails`);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          totalFound: longEmails.length,
          sampleEmails: longEmails.slice(0, 5).map((u: Record<string, unknown>) => ({
            id: u.id, email: u.email, length: String(u.email ?? '').length,
          })),
          dryRun: true,
        },
        message: 'Dry run completed - no changes made',
      });
    }

    const results = { totalProcessed: 0, successful: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < longEmails.length; i += batchSize) {
      const batch = longEmails.slice(i, i + batchSize);

      for (const user of batch) {
        try {
          const userId = String(user.id);
          const oldEmail = String(user.email ?? '');
          const newEmail = `user_${userId}@el7lm.com`;

          await db.from('users').update({
            email: newEmail, oldEmail,
            emailMigratedAt: new Date().toISOString(),
            emailMigrationStatus: 'completed',
          }).eq('id', userId);

          results.successful++;
          console.log(`✅ [Admin API] Migrated email for user ${userId}: ${oldEmail} -> ${newEmail}`);
        } catch (e) {
          results.failed++;
          results.errors.push(`Failed to migrate user ${user.id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
        results.totalProcessed++;
      }

      if (i + batchSize < longEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...results, totalFound: longEmails.length, migrationCompleted: true, completedAt: new Date().toISOString() },
      message: `Email migration completed. ${results.successful} successful, ${results.failed} failed.`,
    });
  } catch (error) {
    console.error('❌ [Admin API] Error during email migration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to migrate emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
