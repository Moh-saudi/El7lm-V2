// src/components/shared/FileUploader.tsx
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useState } from 'react';
import { uploadProfileImage, uploadAdditionalImage } from '@/lib/firebase/upload-media';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase/config';

export default function FileUploader({ onUploadComplete, type = 'image' }: { onUploadComplete: (url: string) => void, type?: 'image' | 'video' }) {
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useAuth();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.uid) return;

        try {
            setIsUploading(true);
            let url = '';
            if (type === 'image') {
                url = await uploadProfileImage(file, user); // أو uploadAdditionalImage حسب الحاجة
            } else if (type === 'video') {
                url = await uploadVideoToSupabase(file, user);
            }
            onUploadComplete(url);
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg">
            <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
                accept={type === 'image' ? 'image/*' : 'video/*'}
                disabled={isUploading}
            />
            <Button
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={isUploading}
            >
                {isUploading ? 'جاري الرفع...' : (type === 'image' ? 'اختر صورة' : 'اختر فيديو')}
            </Button>
        </div>
    );
}

// دالة لرفع الفيديو إلى Supabase
async function uploadVideoToSupabase(file: File, user: any): Promise<string> {
    if (!file || !user?.uid) {
        throw new Error('ملف أو معرف المستخدم غير متوفر');
    }

    try {
        // إنشاء اسم فريد للملف
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const filePath = `videos/${user.uid}/${timestamp}.${fileExt}`;

        // طباعة للتشخيص
        console.log('رفع فيديو إلى Cloudflare R2:', { bucket: 'videos', filePath, file });

        const { storageManager } = await import('@/lib/storage');

        // استخدام storageManager للرفع
        // لاحظ: نمرر 'videos' كاسم للبوكت، وهو prefix في R2
        const result = await storageManager.upload('videos', filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
        });

        if (!result?.publicUrl) {
            throw new Error('فشل في الحصول على رابط الفيديو');
        }

        return result.publicUrl;
    } catch (error) {
        console.error('فشل في رفع الفيديو:', error);
        throw error;
    }
}
