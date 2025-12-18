import { S3Client, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

// تحميل متغيرات البيئة
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function createAdsBucket() {
    console.log('🏗️  بدء إنشاء bucket الإعلانات (ads) في Cloudflare R2...');

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

    const bucketName = 'ads';

    try {
        console.log('🔍 جاري التحقق من الـ Buckets الموجودة...');
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
        const existingBucketNames = Buckets?.map(b => b.Name) || [];

        if (existingBucketNames.includes(bucketName)) {
            console.log(`✅ البوكت '${bucketName}' موجود بالفعل.`);
            return;
        }

        console.log(`🔨 جاري إنشاء البوكت: ${bucketName}...`);
        await s3Client.send(new CreateBucketCommand({
            Bucket: bucketName
        }));
        console.log(`✨ تم إنشاء البوكت '${bucketName}' بنجاح!`);
        console.log('🎉 يمكنك الآن تجربة رفع الإعلانات مرة أخرى.');

    } catch (error: any) {
        console.error('❌ حدث خطأ:', error.message);
    }
}

createAdsBucket();
