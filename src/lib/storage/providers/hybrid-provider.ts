import type {
    StorageProvider,
    UploadOptions,
    UploadResult,
    FileInfo,
    DeleteResult,
    ListOptions,
} from '../types';
import { SupabaseStorageProvider } from './supabase-provider';
import { CloudflareStorageProvider } from './cloudflare-provider';

/**
 * محول مزدوج (Hybrid Provider)
 * يستخدم كلا من Supabase و Cloudflare في نفس الوقت
 * 
 * الاستخدامات:
 * 1. فترة الانتقال: الملفات الجديدة → Cloudflare، القديمة → Supabase
 * 2. النسخ الاحتياطي: رفع على كلا المزودين
 * 3. التوزيع الجغرافي: استخدام أقرب مزود للمستخدم
 */
export class HybridStorageProvider implements StorageProvider {
    private supabase: SupabaseStorageProvider;
    private cloudflare: CloudflareStorageProvider;
    private primaryProvider: 'supabase' | 'cloudflare';
    private enableBackup: boolean;

    constructor(config: {
        supabase: SupabaseStorageProvider;
        cloudflare: CloudflareStorageProvider;
        primaryProvider?: 'supabase' | 'cloudflare';
        enableBackup?: boolean;
    }) {
        this.supabase = config.supabase;
        this.cloudflare = config.cloudflare;
        this.primaryProvider = config.primaryProvider || 'cloudflare'; // الافتراضي: Cloudflare للملفات الجديدة
        this.enableBackup = config.enableBackup ?? false;
    }

    /**
     * رفع ملف إلى المزود الأساسي (وإلى المزود الاحتياطي إذا كان مفعلاً)
     */
    async upload(
        bucket: string,
        path: string,
        file: File | Buffer | Blob,
        options?: UploadOptions
    ): Promise<UploadResult> {
        try {
            console.log(`📤 [Hybrid] Uploading to ${this.primaryProvider}...`);

            // رفع إلى المزود الأساسي
            const primary = this.primaryProvider === 'cloudflare' ? this.cloudflare : this.supabase;
            const result = await primary.upload(bucket, path, file, options);

            // إذا كان النسخ الاحتياطي مفعلاً، رفع إلى المزود الثانوي أيضاً
            if (this.enableBackup) {
                const secondary = this.primaryProvider === 'cloudflare' ? this.supabase : this.cloudflare;
                console.log(`💾 [Hybrid] Backing up to ${this.primaryProvider === 'cloudflare' ? 'supabase' : 'cloudflare'}...`);

                // رفع في الخلفية (لا ننتظر النتيجة)
                secondary.upload(bucket, path, file, options).catch((error) => {
                    console.error('⚠️ [Hybrid] Backup upload failed:', error);
                });
            }

            return result;
        } catch (error) {
            console.error('❌ [Hybrid] Upload failed:', error);
            throw error;
        }
    }

    /**
     * الحصول على رابط عام - يحاول من المزود الأساسي أولاً
     */
    async getPublicUrl(bucket: string, path: string): Promise<string> {
        const primary = this.primaryProvider === 'cloudflare' ? this.cloudflare : this.supabase;
        return primary.getPublicUrl(bucket, path);
    }

    /**
     * حذف ملف من كلا المزودين
     */
    async delete(bucket: string, paths: string | string[]): Promise<DeleteResult> {
        try {
            console.log('🗑️ [Hybrid] Deleting from both providers...');

            // حذف من كلا المزودين
            const [supabaseResult, cloudflareResult] = await Promise.allSettled([
                this.supabase.delete(bucket, paths),
                this.cloudflare.delete(bucket, paths),
            ]);

            // إذا نجح واحد على الأقل، نعتبر العملية ناجحة
            const success =
                (supabaseResult.status === 'fulfilled' && supabaseResult.value.success) ||
                (cloudflareResult.status === 'fulfilled' && cloudflareResult.value.success);

            if (!success) {
                return {
                    success: false,
                    error: 'فشل الحذف من كلا المزودين',
                };
            }

            console.log('✅ [Hybrid] Delete successful');
            return { success: true };
        } catch (error) {
            console.error('❌ [Hybrid] Delete failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'خطأ غير معروف',
            };
        }
    }

    /**
     * الحصول على قائمة الملفات من المزود الأساسي
     */
    async list(bucket: string, path: string, options?: ListOptions): Promise<FileInfo[]> {
        const primary = this.primaryProvider === 'cloudflare' ? this.cloudflare : this.supabase;
        return primary.list(bucket, path, options);
    }

    /**
     * التحقق من وجود ملف في أي من المزودين
     */
    async exists(bucket: string, path: string): Promise<boolean> {
        // نتحقق من كلا المزودين
        const [supabaseExists, cloudflareExists] = await Promise.all([
            this.supabase.exists(bucket, path),
            this.cloudflare.exists(bucket, path),
        ]);

        return supabaseExists || cloudflareExists;
    }

    /**
     * نسخ ملف
     */
    async copy(bucket: string, fromPath: string, toPath: string): Promise<UploadResult> {
        const primary = this.primaryProvider === 'cloudflare' ? this.cloudflare : this.supabase;

        if (!primary.copy) {
            throw new Error('Copy operation is not supported by the primary provider');
        }

        return primary.copy(bucket, fromPath, toPath);
    }

    /**
     * نقل ملف
     */
    async move(bucket: string, fromPath: string, toPath: string): Promise<UploadResult> {
        const primary = this.primaryProvider === 'cloudflare' ? this.cloudflare : this.supabase;

        if (!primary.move) {
            throw new Error('Move operation is not supported by the primary provider');
        }

        return primary.move(bucket, fromPath, toPath);
    }

    /**
     * تبديل المزود الأساسي
     */
    switchPrimaryProvider(provider: 'supabase' | 'cloudflare') {
        console.log(`🔄 [Hybrid] Switching primary provider to ${provider}`);
        this.primaryProvider = provider;
    }

    /**
     * تفعيل/تعطيل النسخ الاحتياطي
     */
    setBackupEnabled(enabled: boolean) {
        console.log(`💾 [Hybrid] Backup ${enabled ? 'enabled' : 'disabled'}`);
        this.enableBackup = enabled;
    }
}
