/**
 * /api/media/delete
 * يحذف ملف من Cloudflare R2 ويزيل سجله من media_moderation
 * للفيديوهات الخارجية (ext/...) يحذف السجل فقط من media_moderation
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId:     process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';

export async function DELETE(req: NextRequest) {
    try {
        const { r2Key, sourceType } = await req.json();
        if (!r2Key) return NextResponse.json({ success: false, error: 'r2Key مطلوب' }, { status: 400 });

        const db = getSupabaseAdmin();
        const isR2File = sourceType === 'r2' && !r2Key.startsWith('ext/');

        // 1. حذف الملف من R2 (فقط للملفات المرفوعة مباشرة)
        if (isR2File) {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }));
        }

        // 2. حذف سجل الإشراف من Supabase
        await db.from('media_moderation').delete().eq('r2_key', r2Key);

        return NextResponse.json({ success: true, deletedFromR2: isR2File });

    } catch (e: any) {
        console.error('[delete]', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
