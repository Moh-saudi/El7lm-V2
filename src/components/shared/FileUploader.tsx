// src/components/shared/FileUploader.tsx
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useId } from 'react';
import { uploadProfileImage, uploadAdditionalImage } from '@/lib/firebase/upload-media';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase/config';

export default function FileUploader({ onUploadComplete, type = 'image' }: { onUploadComplete: (url: string) => void, type?: 'image' | 'video' | 'document' }) {
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useAuth();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id) return;

        try {
            setIsUploading(true);
            let url = '';
            if (type === 'image') {
                url = await uploadProfileImage(file, user); // أو uploadAdditionalImage حسب الحاجة
            } else if (type === 'video') {
                url = await uploadVideoToSupabase(file, user);
            } else if (type === 'document') {
                url = await uploadDocumentToStorage(file, user);
            }
            onUploadComplete(url);
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const inputId = useId();
    return (
        <div className="p-4 border rounded-lg bg-gray-50/50">
            <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id={inputId}
                accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '.pdf,.doc,.docx,.jpg,.png'}
                disabled={isUploading}
            />
            <Button
                type="button"
                onClick={() => document.getElementById(inputId)?.click()}
                disabled={isUploading}
                className="w-full bg-black text-white hover:bg-black/90"
            >
                {isUploading ? 'جاري الرفع...' : (type === 'image' ? 'اختر صورة' : type === 'video' ? 'اختر فيديو' : 'اختر ملف')}
            </Button>
        </div>
    );
}

// دالة لرفع الفيديو إلى Supabase
async function uploadVideoToSupabase(file: File, user: any): Promise<string> {
    if (!file || !user?.id) {
        throw new Error('ملف أو معرف المستخدم غير متوفر');
    }

    try {
        // إنشاء اسم فريد للملف
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const filePath = `videos/${user.id}/${timestamp}.${fileExt}`;


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

async function uploadDocumentToStorage(file: File, user: any): Promise<string> {
    if (!file || !user?.id) throw new Error('ملف أو معرف المستخدم غير متوفر');

    try {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        // Use a generic logic or 'documents' bucket/prefix
        const filePath = `documents/${user.id}/${timestamp}.${fileExt}`;

        const { storageManager } = await import('@/lib/storage');

        const result = await storageManager.upload('documents', filePath, file, {
            contentType: file.type
        });

        return result.publicUrl;
    } catch (error) {
        console.error('فشل في رفع المستند:', error);
        throw error;
    }
}
