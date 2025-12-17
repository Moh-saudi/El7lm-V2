import { supabase } from '../../supabase/config';
import type {
    StorageProvider,
    UploadOptions,
    UploadResult,
    FileInfo,
    DeleteResult,
    ListOptions,
} from '../types';

/**
 * محول Supabase Storage
 * يغلف جميع عمليات Supabase Storage في واجهة موحدة
 */
export class SupabaseStorageProvider implements StorageProvider {
    /**
     * رفع ملف إلى Supabase Storage
     */
    async upload(
        bucket: string,
        path: string,
        file: File | Buffer | Blob,
        options?: UploadOptions
    ): Promise<UploadResult> {
        try {
            console.log('📤 [Supabase] Uploading file:', { bucket, path });

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: options?.cacheControl || '3600',
                    upsert: options?.upsert ?? false,
                    contentType: options?.contentType,
                });

            if (error) {
                console.error('❌ [Supabase] Upload error:', error);
                throw new Error(`فشل في رفع الملف: ${error.message}`);
            }

            // الحصول على الرابط العام
            const publicUrl = await this.getPublicUrl(bucket, path);

            console.log('✅ [Supabase] Upload successful:', publicUrl);

            return {
                url: publicUrl,
                path: data.path,
                publicUrl,
            };
        } catch (error) {
            console.error('❌ [Supabase] Upload failed:', error);
            throw error;
        }
    }

    /**
     * الحصول على رابط عام للملف
     */
    async getPublicUrl(bucket: string, path: string): Promise<string> {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    }

    /**
     * حذف ملف أو عدة ملفات
     */
    async delete(bucket: string, paths: string | string[]): Promise<DeleteResult> {
        try {
            const pathsArray = Array.isArray(paths) ? paths : [paths];
            console.log('🗑️ [Supabase] Deleting files:', { bucket, paths: pathsArray });

            const { error } = await supabase.storage.from(bucket).remove(pathsArray);

            if (error) {
                console.error('❌ [Supabase] Delete error:', error);
                return {
                    success: false,
                    error: `فشل في حذف الملف: ${error.message}`,
                };
            }

            console.log('✅ [Supabase] Delete successful');
            return { success: true };
        } catch (error) {
            console.error('❌ [Supabase] Delete failed:', error);
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
            console.log('📋 [Supabase] Listing files:', { bucket, path });

            const { data, error } = await supabase.storage.from(bucket).list(path, {
                limit: options?.limit || 100,
                offset: options?.offset || 0,
                search: options?.search,
                sortBy: options?.sortBy
                    ? { column: options.sortBy.column, order: options.sortBy.order }
                    : undefined,
            });

            if (error) {
                console.error('❌ [Supabase] List error:', error);
                throw new Error(`فشل في الحصول على قائمة الملفات: ${error.message}`);
            }

            // تحويل البيانات إلى FileInfo
            const files: FileInfo[] = await Promise.all(
                (data || []).map(async (file) => {
                    const fullPath = path ? `${path}/${file.name}` : file.name;
                    const url = await this.getPublicUrl(bucket, fullPath);

                    return {
                        id: file.id || file.name,
                        name: file.name,
                        size: file.metadata?.size || 0,
                        url,
                        uploadedAt: file.updated_at ? new Date(file.updated_at) : undefined,
                        metadata: file.metadata,
                    };
                })
            );

            console.log(`✅ [Supabase] Found ${files.length} files`);
            return files;
        } catch (error) {
            console.error('❌ [Supabase] List failed:', error);
            return [];
        }
    }

    /**
     * التحقق من وجود ملف
     */
    async exists(bucket: string, path: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.storage.from(bucket).list('', {
                search: path,
                limit: 1,
            });

            if (error) return false;
            return (data || []).length > 0;
        } catch (error) {
            console.error('❌ [Supabase] Exists check failed:', error);
            return false;
        }
    }

    /**
     * نسخ ملف (Supabase لا يدعم هذه الميزة مباشرة)
     */
    async copy(bucket: string, fromPath: string, toPath: string): Promise<UploadResult> {
        throw new Error('Copy operation is not supported by Supabase Storage');
    }

    /**
     * نقل ملف (Supabase لا يدعم هذه الميزة مباشرة)
     */
    async move(bucket: string, fromPath: string, toPath: string): Promise<UploadResult> {
        throw new Error('Move operation is not supported by Supabase Storage');
    }
}
