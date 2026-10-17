/**
 * /api/admin/media/approve-skills
 * اعتماد تقييم محلل الأداء الرياضي ومزامنة المهارات الست والتقييم الكلي مباشرة مع جدول اللاعبين وإرسال إشعار فوري
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const auth = await authorizeAdmin(req);
    if (!auth.ok) return auth.response;

    try {
        const body = await req.json();
        const {
            r2Key,
            userId,
            skills,
            overallScore,
            dominantFoot,
            analystNotes,
            analysisText,
            mediaTitle,
        } = body;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'معرف اللاعب (userId) مطلوب' }, { status: 400 });
        }

        const db = getSupabaseAdmin();
        const now = new Date().toISOString();
        const adminId = auth.user.id || 'admin';

        // 1. تحديث حالة الميديا في جدول media_moderation (إذا توفر r2Key)
        if (r2Key) {
            const moderationData: Record<string, any> = {
                r2_key: r2Key,
                status: 'approved',
                reviewed_by: adminId,
                reviewed_at: now,
                notes: analystNotes || null,
                updated_at: now,
            };

            if (analysisText) moderationData.ai_analysis = analysisText;
            if (overallScore) moderationData.ai_rating = Number((overallScore / 10).toFixed(1));
            moderationData.ai_analyzed_at = now;

            const { error: modErr } = await db
                .from('media_moderation')
                .upsert(moderationData, { onConflict: 'r2_key' });

            if (modErr) {
                console.warn('[approve-skills] media_moderation error (non-fatal):', modErr.message);
            }
        }

        // 2. تحديث جدول اللاعبين (players)
        const playerUpdates: Record<string, any> = {
            updated_at: now,
        };

        if (skills) {
            if (typeof skills.pace === 'number') playerUpdates.stats_pace = Math.round(skills.pace);
            if (typeof skills.shooting === 'number') playerUpdates.stats_shooting = Math.round(skills.shooting);
            if (typeof skills.passing === 'number') playerUpdates.stats_passing = Math.round(skills.passing);
            if (typeof skills.dribbling === 'number') playerUpdates.stats_dribbling = Math.round(skills.dribbling);
            if (typeof skills.defending === 'number') playerUpdates.stats_defending = Math.round(skills.defending);
            if (typeof skills.physical === 'number') playerUpdates.stats_physical = Math.round(skills.physical);

            playerUpdates.skills = {
                ...skills,
                overallScore: overallScore || Math.round(
                    ((skills.pace || 70) + (skills.shooting || 70) + (skills.passing || 70) +
                     (skills.dribbling || 70) + (skills.defending || 70) + (skills.physical || 70)) / 6
                ),
                analystNotes: analystNotes || null,
                reviewedBy: adminId,
                evaluatedAt: now,
            };
        }

        if (typeof overallScore === 'number') {
            playerUpdates.overall_rating = Math.round(overallScore);
            playerUpdates.rating = Math.round(overallScore);
        }

        if (dominantFoot) {
            playerUpdates.preferred_foot = dominantFoot;
        }

        // تطبيق التحديث على جدول اللاعبين بمطابقة مرنة للمعرف
        const { data: updatedPlayer, error: playerErr } = await db
            .from('players')
            .update(playerUpdates)
            .or(`id.eq.${userId},user_id.eq.${userId},uid.eq.${userId}`)
            .select('id, full_name, stats_pace, stats_shooting, overall_rating')
            .limit(1);

        if (playerErr) {
            console.error('[approve-skills] players table update error:', playerErr);
            throw new Error('فشل تحديث بيانات مهارات اللاعب: ' + playerErr.message);
        }

        // 3. إرسال إشعار فوري للاعب بتحديث مهاراته واعتمادها
        try {
            const notifPayload = {
                userId,
                title: '🌟 تم اعتماد تقييم أدائك الرياضي',
                message: `قام محلل أداء المنصة باعتماد تقييم مهاراتك الفنية${overallScore ? ` بدرجة إجمالية (${overallScore})` : ''} وتحديث رادار مهاراتك وبطاقتك الاحترافية.`,
                type: 'skills_assessed',
                link: '/dashboard/player/stats',
                metadata: {
                    skills,
                    overallScore,
                    analystNotes,
                    mediaTitle: mediaTitle || 'فيديو المهارات',
                },
                isRead: false,
                read: false,
                createdAt: now,
            };

            await db.from('notifications').insert([notifPayload]);
        } catch (notifErr) {
            console.warn('[approve-skills] Notification dispatch error (non-fatal):', notifErr);
        }

        return NextResponse.json({
            success: true,
            message: 'تم اعتماد تقييم الأداء بنجاح وتحديث مهارات اللاعب وإشعاره فورياً.',
            updatedPlayer: updatedPlayer?.[0] || null,
        });

    } catch (err: any) {
        console.error('[approve-skills] Server error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'حدث خطأ أثناء اعتماد التقييم' },
            { status: 500 }
        );
    }
}
