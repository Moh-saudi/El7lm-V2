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
        const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
        const accessKeyId = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
        const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
        const mainBucket = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET;

        if (!accountId || !accessKeyId || !secretAccessKey) {
            return NextResponse.json(
                { error: 'Cloudflare R2 credentials not configured' },
                { status: 500 }
            );
        }

        // إنشاء S3 Client
        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // تحويل الملف إلى Buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // إستراتيجية البوكت الواحد: استخدام البوكت الرئيسي دائماً والمجلدات
        // البوكت الرئيسي هو 'el7lmplatform' كما هو محدد في إعدادات Cloudflare
        const targetBucket = 'el7lmplatform';

        // المسار الكامل: bucket المُرسل يصبح مجلد + المسار الأصلي
        let targetKey = path;
        if (bucket && bucket !== targetBucket && !path.startsWith(bucket + '/')) {
            targetKey = `${bucket}/${path}`;
        }

        console.log('📦 [API Route] Upload details:', {
            requestedBucket: bucket,
            targetBucket,
            targetKey,
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            mainBucket: mainBucket || 'not set'
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

        // بناء الرابط العام
        // استخدام الدومين المخصص
        const baseUrl = 'https://assets.el7lm.com';
        // الرابط يجب أن يشير إلى المسار الكامل (بما في ذلك المجلدات)
        const filePublicUrl = `${baseUrl}/${targetKey}`;

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

// Next.js 14 Route Segment Config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
