import { NextResponse } from 'next/server';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare R2 credentials not configured' },
        { status: 500 }
      );
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    let continuationToken: string | undefined;
    let totalFiles = 0;
    let totalSize = 0;
    let imagesCount = 0;
    let videosCount = 0;

    do {
      const response = await s3.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'ads/',
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }));

      for (const item of response.Contents || []) {
        const key = item.Key || '';
        if (!key || key.endsWith('/')) continue;

        totalFiles += 1;
        totalSize += item.Size || 0;

        const fileName = key.split('/').pop()?.toLowerCase() || '';
        if (fileName.startsWith('image_')) imagesCount += 1;
        else if (fileName.startsWith('video_')) videosCount += 1;
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return NextResponse.json({
      success: true,
      exists: true,
      data: {
        totalFiles,
        totalSize,
        imagesCount,
        videosCount,
      },
    });
  } catch (error) {
    console.error('[admin ads storage stats]', error);
    return NextResponse.json(
      {
        success: false,
        exists: false,
        data: {
          totalFiles: 0,
          totalSize: 0,
          imagesCount: 0,
          videosCount: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
