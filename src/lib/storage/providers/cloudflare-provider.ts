import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type {
    StorageProvider,
    UploadOptions,
    UploadResult,
    FileInfo,
    DeleteResult,
    ListOptions,
} from '../types';

/**
 * محول Cloudflare R2 Storage
 * يستخدم AWS SDK v3 للتعامل مع Cloudflare R2 (S3-compatible)
 */
export class CloudflareStorageProvider implements StorageProvider {
    private s3Client: S3Client;
    private publicUrl: string;
    private accountId: string;
    private mainBucket: string;

    constructor(config: {
        accountId: string;
        accessKeyId: string;
        secretAccessKey: string;
        publicUrl?: string;
        bucketName?: string;
    }) {
        this.accountId = config.accountId;
        this.publicUrl = config.publicUrl || `https://pub-${config.accountId}.r2.dev`;
        this.mainBucket = config.bucketName || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'assets';

        // إنشاء S3 Client متوافق مع Cloudflare R2
        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }

    /**
   * رفع ملف إلى Cloudflare R2 عبر API Route
   */
    async upload(
        bucket: string,
        path: string,
        file: File | Buffer | Blob,
        options?: UploadOptions
    ): Promise<UploadResult> {
        try {
            console.log('📤 [Cloudflare R2] Uploading file via API route:', { bucket, path });

            // إنشاء FormData للإرسال إلى API Route
            const formData = new FormData();

            // تحويل Buffer إلى Blob إذا لزم الأمر
            if (file instanceof Buffer) {
                const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
                const blob = new Blob([arrayBuffer]);
                formData.append('file', blob, 'file');
            } else if (file instanceof Blob) {
                formData.append('file', file);
            }

            formData.append('bucket', bucket);
            formData.append('path', path);
            formData.append('contentType', options?.contentType || 'application/octet-stream');

            // إرسال الطلب إلى API Route
            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            const result = await response.json();

            console.log('✅ [Cloudflare R2] Upload successful:', result.publicUrl);

            return {
                url: result.publicUrl,
                path: result.path,
                publicUrl: result.publicUrl,
            };
        } catch (error) {
            console.error('❌ [Cloudflare R2] Upload failed:', error);
            throw error;
        }
    }

    /**
     * الحصول على رابط عام للملف
     */
    async getPublicUrl(bucket: string, path: string): Promise<string> {
        let fullKey = path;
        if (bucket !== this.mainBucket) {
            fullKey = `${bucket}/${path}`;
        }
        return `${this.publicUrl}/${fullKey}`;
    }

    /**
     * حذف ملف أو عدة ملفات
     */
    async delete(bucket: string, paths: string | string[]): Promise<DeleteResult> {
        try {
            const pathsArray = Array.isArray(paths) ? paths : [paths];
            const targetBucket = this.mainBucket;

            console.log('🗑️ [Cloudflare R2] Deleting files:', { bucket, paths: pathsArray });

            // حذف كل ملف على حدة
            const deletePromises = pathsArray.map(async (path) => {
                let fullKey = path;
                if (bucket !== this.mainBucket && !path.startsWith(bucket + '/')) {
                    fullKey = `${bucket}/${path}`;
                }

                const command = new DeleteObjectCommand({
                    Bucket: targetBucket,
                    Key: fullKey,
                });
                await this.s3Client.send(command);
            });

            await Promise.all(deletePromises);

            console.log('✅ [Cloudflare R2] Delete successful');
            return { success: true };
        } catch (error) {
            console.error('❌ [Cloudflare R2] Delete failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'خطأ غير معروف',
            };
        }
    }

    /**
     * الحصول على قائمة الملفات
     */
    async list(bucket: string, path: string, options?: ListOptions): Promise<FileInfo[]> {
        try {
            console.log(`📂 [Cloudflare R2] Listing files in ${bucket}/${path}`);

            // تحديد البوكت والمسار الفعليين
            // في حالتنا، نستخدم بوكت واحد (assets) مع مجلدات
            let targetBucket = this.mainBucket;
            let prefix = path;

            // إذا كان البوكت الممرر ليس البوكت الرئيسي، نعتبره مجلد بادئة
            if (bucket !== this.mainBucket) {
                // ندمج اسم البوكت القديم مع المسار ليصبحا Prefix
                // مثال: bucket='videos', path='user1' -> prefix='videos/user1/'
                prefix = path ? `${bucket}/${path}` : `${bucket}/`;
            }

            // Fetch all items (handling pagination)
            let allContents: any[] = [];
            let continuationToken: string | undefined = undefined;
            let isTruncated = true;

            do {
                const command = new ListObjectsV2Command({
                    Bucket: targetBucket,
                    Prefix: prefix,
                    MaxKeys: 1000,
                    ContinuationToken: continuationToken,
                });

                const response = await this.s3Client.send(command);

                if (response.Contents) {
                    allContents.push(...response.Contents);
                }

                isTruncated = response.IsTruncated || false;
                continuationToken = response.NextContinuationToken;

                if (options?.limit && allContents.length >= options.limit) {
                    allContents = allContents.slice(0, options.limit);
                    break;
                }
            } while (isTruncated);

            if (allContents.length === 0) {
                return [];
            }

            return allContents.map(item => {
                // استخراج الاسم النسبي
                const fullKey = item.Key || '';
                let relativeName = fullKey;

                // إزالة الـ prefix من الاسم للعرض
                if (prefix && fullKey.startsWith(prefix)) {
                    relativeName = fullKey.substring(prefix.length);
                }

                return {
                    id: item.ETag?.replace(/"/g, '') || fullKey,
                    name: relativeName,
                    size: item.Size || 0,
                    url: `${this.publicUrl}/${fullKey}`,
                    uploadedAt: item.LastModified || new Date(),
                    metadata: {
                        size: item.Size || 0,
                        mimetype: 'application/octet-stream',
                        lastModified: item.LastModified
                    }
                };
            });

        } catch (error) {
            console.error('❌ [Cloudflare R2] List failed:', error);
            return [];
        }
    }

    /**
     * التحقق من وجود ملف
     */
    async exists(bucket: string, path: string): Promise<boolean> {
        try {
            let fullKey = path;
            if (bucket !== this.mainBucket && !path.startsWith(bucket + '/')) {
                fullKey = `${bucket}/${path}`;
            }

            const command = new HeadObjectCommand({
                Bucket: this.mainBucket,
                Key: fullKey,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * نسخ ملف
     */
    async copy(bucket: string, fromPath: string, toPath: string): Promise<UploadResult> {
        throw new Error('Copy operation is not implemented yet for Cloudflare R2');
    }

    /**
     * نقل ملف
     */
    async move(bucket: string, fromPath: string, toPath: string): Promise<UploadResult> {
        throw new Error('Move operation is not implemented yet for Cloudflare R2');
    }
}
