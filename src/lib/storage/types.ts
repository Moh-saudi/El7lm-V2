/**
 * أنواع البيانات المشتركة لنظام التخزين
 */

export interface UploadOptions {
    cacheControl?: string;
    upsert?: boolean;
    contentType?: string;
    metadata?: Record<string, string>;
}

export interface UploadResult {
    url: string;
    path: string;
    publicUrl: string;
}

export interface FileInfo {
    id: string;
    name: string;
    size: number;
    type?: string;
    url?: string;
    uploadedAt?: Date;
    metadata?: Record<string, any>;
}

export interface DeleteResult {
    success: boolean;
    error?: string;
}

export interface ListOptions {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: {
        column: string;
        order: 'asc' | 'desc';
    };
}

/**
 * واجهة موحدة لجميع مزودي التخزين
 * يمكن تطبيقها على Supabase, Cloudflare R2, AWS S3, إلخ
 */
export interface StorageProvider {
    /**
     * رفع ملف إلى التخزين
     */
    upload(
        bucket: string,
        path: string,
        file: File | Buffer | Blob,
        options?: UploadOptions
    ): Promise<UploadResult>;

    /**
     * الحصول على رابط عام للملف
     */
    getPublicUrl(bucket: string, path: string): Promise<string>;

    /**
     * حذف ملف من التخزين
     */
    delete(bucket: string, paths: string | string[]): Promise<DeleteResult>;

    /**
     * الحصول على قائمة الملفات في مسار معين
     */
    list(bucket: string, path: string, options?: ListOptions): Promise<FileInfo[]>;

    /**
     * التحقق من وجود ملف
     */
    exists(bucket: string, path: string): Promise<boolean>;

    /**
     * نسخ ملف من مكان لآخر
     */
    copy?(bucket: string, fromPath: string, toPath: string): Promise<UploadResult>;

    /**
     * نقل ملف من مكان لآخر
     */
    move?(bucket: string, fromPath: string, toPath: string): Promise<UploadResult>;
}

/**
 * أنواع مزودي التخزين المدعومة
 */
export type StorageProviderType = 'supabase' | 'cloudflare' | 'hybrid';

/**
 * إعدادات مزود التخزين
 */
export interface StorageConfig {
    provider: StorageProviderType;
    supabase?: {
        url: string;
        key: string;
    };
    cloudflare?: {
        accountId: string;
        accessKeyId: string;
        secretAccessKey: string;
        bucketName?: string;
        publicUrl?: string;
    };
    // للوضع المزدوج: الملفات الجديدة تذهب إلى أي مزود؟
    primaryProvider?: 'supabase' | 'cloudflare';
    // هل نحتفظ بنسخة احتياطية على المزود الآخر؟
    enableBackup?: boolean;
}
