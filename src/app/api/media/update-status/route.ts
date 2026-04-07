/**
 * /api/media/update-status
 * يحدّث حالة الإشراف أو بيانات AI لملف ميديا في جدول media_moderation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { r2Key, status, reviewedBy, notes, aiAnalysis, aiRating, aiAnalyzedAt } = body;

        if (!r2Key) {
            return NextResponse.json({ success: false, error: 'r2Key مطلوب' }, { status: 400 });
        }

        const db = getSupabaseAdmin();
        const now = new Date().toISOString();

        // ابنِ object التحديث بشكل ديناميكي
        const upsertData: Record<string, any> = {
            r2_key:     r2Key,
            updated_at: now,
        };

        if (status !== undefined) {
            upsertData.status      = status;
            upsertData.reviewed_by = reviewedBy || null;
            upsertData.reviewed_at = now;
            if (notes !== undefined) upsertData.notes = notes || null;
        }

        if (aiAnalysis !== undefined) {
            upsertData.ai_analysis    = aiAnalysis;
            upsertData.ai_rating      = aiRating ?? null;
            upsertData.ai_analyzed_at = aiAnalyzedAt || now;
        }

        const { error } = await db
            .from('media_moderation')
            .upsert(upsertData, { onConflict: 'r2_key' });

        if (error) {
            // إذا كان الجدول غير موجود، أرجع رسالة واضحة
            if (error.code === '42P01') {
                return NextResponse.json({
                    success: false,
                    error: 'جدول media_moderation غير موجود. شغّل SQL الموجود في ملف list-r2/route.ts',
                    sqlHint: `
CREATE TABLE IF NOT EXISTS media_moderation (
  r2_key         TEXT PRIMARY KEY,
  status         TEXT NOT NULL DEFAULT 'pending',
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  notes          TEXT,
  ai_analysis    TEXT,
  ai_rating      NUMERIC(3,1),
  ai_analyzed_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);`
                }, { status: 500 });
            }
            throw new Error(error.message);
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error('[update-status]', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
