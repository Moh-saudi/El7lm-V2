import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';

// البوكتات الموجودة فعلاً في R2 — يُستخدم كـ fallback آمن
const KNOWN_R2_BUCKETS = [
    'el7lmplatform', 'images', 'videos', 'avatars', 'documents',
    'playeracademy', 'playeragent', 'playerclub', 'playertrainer',
    'profile-images', 'ads', 'al7lmarabicupqatar',
    // Profile buckets per account type
    'clubs', 'academies', 'trainers', 'agents', 'marketers',
    'playeravatar', 'clubavatar', 'academyavatar', 'traineravatar', 'agentavatar',
    'tournaments',
];

const FALLBACK_BUCKET = 'el7lmplatform';

function buildS3Client(endpoint: string, accessKeyId: string, secretAccessKey: string) {
    return new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
    });
}

function resolveEndpoint(accountId: string | undefined) {
    return process.env.CLOUDFLARE_R2_ENDPOINT
        || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT
        || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const requestedBucket = formData.get('bucket') as string;
        const path = formData.get('path') as string;
        const contentType = formData.get('contentType') as string;

        if (!file || !requestedBucket || !path) {
            return NextResponse.json(
                { error: 'Missing required fields: file, bucket, or path' },
                { status: 400 }
            );
        }

        const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
        const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://assets.el7lm.com';
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
        const endpoint = resolveEndpoint(accountId);

        if (!accessKeyId || !secretAccessKey || !endpoint) {
            return NextResponse.json({ error: 'Cloudflare R2 credentials not configured' }, { status: 500 });
        }

        const s3Client = buildS3Client(endpoint, accessKeyId, secretAccessKey);

        // اختر البوكت: استخدم requestedBucket إذا كان موجوداً في R2، وإلا FALLBACK_BUCKET
        const configuredBucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || FALLBACK_BUCKET;
        const targetBucket = KNOWN_R2_BUCKETS.includes(requestedBucket)
            ? requestedBucket
            : KNOWN_R2_BUCKETS.includes(configuredBucket)
                ? configuredBucket
                : FALLBACK_BUCKET;

        // المسار داخل البوكت
        const targetKey = path.startsWith(requestedBucket + '/')
            ? path.slice(requestedBucket.length + 1)
            : path;

        console.log('📦 [R2 Upload]', { requestedBucket, targetBucket, targetKey, endpoint });

        const arrayBuffer = await file.arrayBuffer();
        const command = new PutObjectCommand({
            Bucket: targetBucket,
            Key: targetKey,
            Body: Buffer.from(arrayBuffer),
            ContentType: contentType || file.type || 'application/octet-stream',
            CacheControl: '3600',
        });

        await s3Client.send(command);

        const filePublicUrl = `${publicUrl}/${targetKey}`;
        console.log('✅ [R2 Upload] Success:', filePublicUrl);

        return NextResponse.json({ success: true, url: filePublicUrl, path: targetKey, publicUrl: filePublicUrl });

    } catch (error) {
        console.error('❌ [R2 Upload] Failed:', error);
        return NextResponse.json(
            { error: 'Upload failed', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '';
    const endpoint = resolveEndpoint(accountId) || '';
    const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
    const configuredBucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || FALLBACK_BUCKET;

    let availableBuckets: string[] | string = '(could not list)';
    try {
        const s3 = buildS3Client(endpoint, accessKeyId, secretAccessKey);
        const res = await s3.send(new ListBucketsCommand({}));
        availableBuckets = (res.Buckets || []).map(b => b.Name || '');
    } catch (e) {
        availableBuckets = e instanceof Error ? e.message : 'error';
    }

    return NextResponse.json({ configuredBucket, effectiveFallback: FALLBACK_BUCKET, accountId, endpoint, hasKey: !!accessKeyId, hasSecret: !!secretAccessKey, availableBuckets });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
