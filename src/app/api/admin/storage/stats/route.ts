import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
    try {
        const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
        const accessKeyId = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
        const mainBucket = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'assets';

        if (!accountId || !accessKeyId || !secretAccessKey) {
            return NextResponse.json(
                { error: 'Cloudflare R2 credentials not configured' },
                { status: 500 }
            );
        }

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // We want to get stats for the common "folders"
        const folders = ['ads', 'avatars', 'videos', 'documents', 'receipts', 'proofs'];
        const stats = await Promise.all(folders.map(async (folder) => {
            let totalSize = 0;
            let fileCount = 0;
            let continuationToken: string | undefined = undefined;

            try {
                do {
                    const command: ListObjectsV2Command = new ListObjectsV2Command({
                        Bucket: mainBucket,
                        Prefix: `${folder}/`,
                        ContinuationToken: continuationToken,
                    });

                    const response = await s3Client.send(command);

                    if (response.Contents) {
                        fileCount += response.Contents.length;
                        totalSize += response.Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
                    }

                    continuationToken = response.NextContinuationToken;
                } while (continuationToken);

                return {
                    bucketName: folder,
                    fileCount,
                    totalSize,
                    status: 'active' as const,
                    provider: 'cloudflare' as const
                };
            } catch (err) {
                console.error(`Error fetching stats for folder ${folder}:`, err);
                return {
                    bucketName: folder,
                    fileCount: 0,
                    totalSize: 0,
                    status: 'error' as const,
                    provider: 'cloudflare' as const
                };
            }
        }));

        // Calculate grand total
        const totalStorageSize = stats.reduce((acc, s) => acc + s.totalSize, 0);
        const totalFileCount = stats.reduce((acc, s) => acc + s.fileCount, 0);

        return NextResponse.json({
            success: true,
            stats,
            summary: {
                totalSize: totalStorageSize,
                fileCount: totalFileCount,
                bucketCount: folders.length
            }
        });

    } catch (error) {
        console.error('❌ [Storage Stats API] Failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch storage stats' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
