import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('audio') as File;
        const userId = formData.get('userId') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // التحقق من نوع الملف
        if (!file.type.startsWith('audio/')) {
            return NextResponse.json(
                { error: 'File must be an audio file' },
                { status: 400 }
            );
        }

        // التحقق من حجم الملف (حد أقصى 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size must be less than 10MB' },
                { status: 400 }
            );
        }

        // قراءة بيانات Cloudflare R2 من المتغيرات البيئية (نفس الطريقة المستخدمة للصور)
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

        // إنشاء S3 Client (نفس الطريقة المستخدمة للصور)
        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // إنشاء اسم فريد للملف
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extension = file.name.split('.').pop() || 'webm';
        const fileName = `voice-messages/${userId}/${timestamp}-${randomString}.${extension}`;

        // تحويل الملف إلى Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // رفع الملف إلى Cloudflare R2
        const uploadCommand = new PutObjectCommand({
            Bucket: mainBucket || 'el7lmplatform',
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
            CacheControl: '3600',
        });

        await s3Client.send(uploadCommand);

        // بناء الرابط العام
        const baseUrl = publicUrl || `https://pub-${accountId}.r2.dev`;
        const filePublicUrl = `${baseUrl}/${fileName}`;

        console.log('✅ Voice message uploaded successfully:', filePublicUrl);

        return NextResponse.json({
            success: true,
            url: filePublicUrl,
            fileName: fileName,
        });
    } catch (error: any) {
        console.error('❌ Error uploading voice message:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
        });

        return NextResponse.json(
            {
                error: 'Failed to upload voice message',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Next.js 14 Route Segment Config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
