import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * API Route لرفع الملفات إلى Cloudflare R2
 * يعمل على السيرفر لتجنب مشاكل CORS
 */
export async function POST(request: NextRequest) {
    try {
        // قراءة البيانات من الطلب
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string;
        const path = formData.get('path') as string;
        const contentType = formData.get('contentType') as string;

        if (!file || !bucket || !path) {
            return NextResponse.json(
                { error: 'Missing required fields: file, bucket, or path' },
                { status: 400 }
            );
        }

        // قراءة بيانات Cloudflare R2 من المتغيرات البيئية
        const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
        const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://assets.el7lm.com';
        const mainBucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'assets';

        // بناء الـ endpoint — نستخدم المتغير الكامل إذا وُجد، وإلا نبنيه من accountId
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
        const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT
            || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);

        if (!accessKeyId || !secretAccessKey || !endpoint) {
            return NextResponse.json(
                { error: 'Cloudflare R2 credentials not configured' },
                { status: 500 }
            );
        }

        // إنشاء S3 Client
        const s3Client = new S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true,
        });

        // تحويل الملف إلى Buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // كل الملفات تذهب لـ el7lmplatform مع مجلدات للتنظيم
        const targetBucket = mainBucket; // el7lmplatform
        // المسار: bucket/path (تجنب التكرار)
        const targetKey = path.startsWith(bucket + '/') ? path : `${bucket}/${path}`;

        console.log('📦 [API Route] Upload details:', {
            requestedBucket: bucket,
            targetBucket,
            targetKey,
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        });

        // رفع الملف
        const command = new PutObjectCommand({
            Bucket: targetBucket,
            Key: targetKey,
            Body: fileBuffer,
            ContentType: contentType || file.type || 'application/octet-stream',
            CacheControl: '3600',
        });

        await s3Client.send(command);

        // بناء الرابط العام - publicUrl هو URL الـ el7lmplatform bucket
        const filePublicUrl = `${publicUrl}/${targetKey}`;

        console.log('✅ [API Route] File uploaded successfully:', filePublicUrl);

        return NextResponse.json({
            success: true,
            url: filePublicUrl,
            path,
            publicUrl: filePublicUrl,
        });

    } catch (error) {
        console.error('❌ [API Route] Upload failed:', error);

        return NextResponse.json(
            {
                error: 'Upload failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    const bucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'assets(default)';
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '(missing)';
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT || '(missing)';
    const hasKey = !!(process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID);
    const hasSecret = !!(process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY);
    return NextResponse.json({ bucket, accountId, endpoint, hasKey, hasSecret });
}

// Next.js 14 Route Segment Config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
