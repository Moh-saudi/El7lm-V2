import { S3Client, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

// تحميل متغيرات البيئة
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function createR2Buckets() {
    console.log('🏗️  بدء إنشاء Buckets في Cloudflare R2...');

    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        console.error('❌ خطأ: بيانات الاتصال غير موجودة في .env.local');
        process.exit(1);
    }

    const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    // قائمة الـ Buckets المطلوبة حسب الكود
    const bucketsToCreate = [
        'profile-images',
        'avatars',       // للصور الإضافية
        'playertrainer',
        'playerclub',
        'playeragent',
        'playeracademy',
        'videos',
        'documents',
        'images'
    ];

    try {
        console.log('🔍 جاري التحقق من الـ Buckets الموجودة...');
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
        const existingBucketNames = Buckets?.map(b => b.Name) || [];

        console.log('📋 الـ Buckets الحالية:', existingBucketNames.join(', ') || '(لا يوجد)');

        for (const bucketName of bucketsToCreate) {
            if (existingBucketNames.includes(bucketName)) {
                console.log(`✅ البوكت موجود بالفعل: ${bucketName}`);
                continue;
            }

            console.log(`🔨 جاري إنشاء البوكت: ${bucketName}...`);
            try {
                await s3Client.send(new CreateBucketCommand({
                    Bucket: bucketName
                }));
                console.log(`   ✨ تم الإنشاء بنجاح: ${bucketName}`);
            } catch (err: any) {
                console.error(`   ❌ فشل إنشاء ${bucketName}:`, err.message);
                // نستمر في المحاولة للباقي
            }
        }

        console.log('\n🎉 اكتملت العملية.');

    } catch (error: any) {
        console.error('❌ حدث خطأ عام:', error.message);
    }
}

createR2Buckets();
