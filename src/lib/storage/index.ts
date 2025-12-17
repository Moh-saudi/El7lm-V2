import type { StorageProvider, StorageConfig, StorageProviderType } from './types';
import { SupabaseStorageProvider } from './providers/supabase-provider';
import { CloudflareStorageProvider } from './providers/cloudflare-provider';
import { HybridStorageProvider } from './providers/hybrid-provider';

/**
 * مدير التخزين الموحد
 * نقطة الدخول الرئيسية لجميع عمليات التخزين
 * 
 * الاستخدام:
 * ```typescript
 * import { storageManager } from '@/lib/storage';
 * 
 * // رفع ملف
 * const result = await storageManager.upload('videos', 'path/to/file.mp4', file);
 * 
 * // حذف ملف
 * await storageManager.delete('videos', 'path/to/file.mp4');
 * ```
 */
class StorageManager {
    private provider: StorageProvider;
    private config: StorageConfig;

    constructor(config?: Partial<StorageConfig>) {
        // قراءة الإعدادات من متغيرات البيئة أو الإعدادات المُمررة
        this.config = this.loadConfig(config);
        this.provider = this.createProvider();
    }

    /**
     * تحميل الإعدادات من متغيرات البيئة
     */
    private loadConfig(customConfig?: Partial<StorageConfig>): StorageConfig {
        const providerType = (customConfig?.provider ||
            process.env.NEXT_PUBLIC_STORAGE_PROVIDER ||
            'supabase') as StorageProviderType;

        return {
            provider: providerType,
            primaryProvider: (customConfig?.primaryProvider ||
                process.env.NEXT_PUBLIC_PRIMARY_STORAGE_PROVIDER ||
                'cloudflare') as 'supabase' | 'cloudflare',
            enableBackup: customConfig?.enableBackup ??
                process.env.NEXT_PUBLIC_STORAGE_BACKUP_ENABLED === 'true',
            supabase: {
                url: customConfig?.supabase?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                key: customConfig?.supabase?.key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            },
            cloudflare: {
                accountId: customConfig?.cloudflare?.accountId ||
                    process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '',
                accessKeyId: customConfig?.cloudflare?.accessKeyId ||
                    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID || '',
                secretAccessKey: customConfig?.cloudflare?.secretAccessKey ||
                    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
                publicUrl: customConfig?.cloudflare?.publicUrl ||
                    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL,
            },
        };
    }

    /**
     * إنشاء المزود المناسب بناءً على الإعدادات
     */
    private createProvider(): StorageProvider {
        console.log(`🔧 [StorageManager] Initializing ${this.config.provider} provider...`);

        switch (this.config.provider) {
            case 'supabase':
                return new SupabaseStorageProvider();

            case 'cloudflare':
                if (!this.config.cloudflare?.accountId ||
                    !this.config.cloudflare?.accessKeyId ||
                    !this.config.cloudflare?.secretAccessKey) {
                    console.warn('⚠️ [StorageManager] Cloudflare credentials missing, falling back to Supabase');
                    return new SupabaseStorageProvider();
                }
                return new CloudflareStorageProvider({
                    accountId: this.config.cloudflare.accountId,
                    accessKeyId: this.config.cloudflare.accessKeyId,
                    secretAccessKey: this.config.cloudflare.secretAccessKey,
                    publicUrl: this.config.cloudflare.publicUrl,
                });

            case 'hybrid':
                const supabaseProvider = new SupabaseStorageProvider();

                if (!this.config.cloudflare?.accountId ||
                    !this.config.cloudflare?.accessKeyId ||
                    !this.config.cloudflare?.secretAccessKey) {
                    console.warn('⚠️ [StorageManager] Cloudflare credentials missing, using Supabase only');
                    return supabaseProvider;
                }

                const cloudflareProvider = new CloudflareStorageProvider({
                    accountId: this.config.cloudflare.accountId,
                    accessKeyId: this.config.cloudflare.accessKeyId,
                    secretAccessKey: this.config.cloudflare.secretAccessKey,
                    publicUrl: this.config.cloudflare.publicUrl,
                });

                return new HybridStorageProvider({
                    supabase: supabaseProvider,
                    cloudflare: cloudflareProvider,
                    primaryProvider: this.config.primaryProvider,
                    enableBackup: this.config.enableBackup,
                });

            default:
                console.warn(`⚠️ [StorageManager] Unknown provider: ${this.config.provider}, using Supabase`);
                return new SupabaseStorageProvider();
        }
    }

    /**
     * رفع ملف
     */
    async upload(
        bucket: string,
        path: string,
        file: File | Buffer | Blob,
        options?: any
    ) {
        return this.provider.upload(bucket, path, file, options);
    }

    /**
     * الحصول على رابط عام
     */
    async getPublicUrl(bucket: string, path: string) {
        return this.provider.getPublicUrl(bucket, path);
    }

    /**
     * حذف ملف أو عدة ملفات
     */
    async delete(bucket: string, paths: string | string[]) {
        return this.provider.delete(bucket, paths);
    }

    /**
     * الحصول على قائمة الملفات
     */
    async list(bucket: string, path: string, options?: any) {
        return this.provider.list(bucket, path, options);
    }

    /**
     * التحقق من وجود ملف
     */
    async exists(bucket: string, path: string) {
        return this.provider.exists(bucket, path);
    }

    /**
     * نسخ ملف
     */
    async copy(bucket: string, fromPath: string, toPath: string) {
        if (!this.provider.copy) {
            throw new Error('Copy operation is not supported by the current provider');
        }
        return this.provider.copy(bucket, fromPath, toPath);
    }

    /**
     * نقل ملف
     */
    async move(bucket: string, fromPath: string, toPath: string) {
        if (!this.provider.move) {
            throw new Error('Move operation is not supported by the current provider');
        }
        return this.provider.move(bucket, fromPath, toPath);
    }

    /**
     * الحصول على نوع المزود الحالي
     */
    getProviderType(): StorageProviderType {
        return this.config.provider;
    }

    /**
     * تبديل المزود (للوضع المزدوج فقط)
     */
    switchProvider(provider: 'supabase' | 'cloudflare') {
        if (this.provider instanceof HybridStorageProvider) {
            this.provider.switchPrimaryProvider(provider);
        } else {
            console.warn('⚠️ [StorageManager] switchProvider only works in hybrid mode');
        }
    }

    /**
     * تفعيل/تعطيل النسخ الاحتياطي (للوضع المزدوج فقط)
     */
    setBackupEnabled(enabled: boolean) {
        if (this.provider instanceof HybridStorageProvider) {
            this.provider.setBackupEnabled(enabled);
        } else {
            console.warn('⚠️ [StorageManager] setBackupEnabled only works in hybrid mode');
        }
    }
}

// تصدير instance واحد فقط (Singleton)
export const storageManager = new StorageManager();

// تصدير الكلاس للاستخدام المخصص
export { StorageManager };

// تصدير الأنواع
export * from './types';
