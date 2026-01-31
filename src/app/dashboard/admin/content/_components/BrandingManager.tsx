
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { getBrandingData, saveBrandingData, BrandingData } from '@/lib/content/branding-service';
import { storageManager } from '@/lib/storage';

export default function BrandingManager() {
    const [data, setData] = useState<BrandingData>({
        logoUrl: '',
        darkLogoUrl: '',
        footerLogoUrl: '',
        siteName: '',
        slogan: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const branding = await getBrandingData();
            setData(branding);
        } catch (error) {
            toast.error('Failed to load branding data');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (field: keyof BrandingData, file: File) => {
        try {
            setUploadingField(field);
            const fileName = `branding/${Date.now()}_${field}_${file.name}`;
            const result = await storageManager.upload('content', fileName, file, {
                contentType: file.type,
                upsert: true
            });

            if (result?.publicUrl) {
                setData(prev => ({ ...prev, [field]: result.publicUrl }));
                toast.success('Image uploaded successfully');
            }
        } catch (error) {
            console.error(error);
            toast.error('Upload failed');
        } finally {
            setUploadingField(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveBrandingData(data);
            toast.success('Settings saved successfully');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const ImageUploader = ({ label, field, value }: { label: string, field: keyof BrandingData, value: string }) => (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{label}</label>
            <div className="relative aspect-square w-32 md:w-48 bg-slate-100 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-blue-500 transition-colors mx-auto">
                <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 z-20 cursor-pointer"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(field, e.target.files[0])}
                />

                {uploadingField === field ? (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-30">
                        <Loader2 className="animate-spin text-blue-500" />
                    </div>
                ) : value ? (
                    <Image src={value} alt={label} fill className="object-contain p-2" />
                ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-2">
                        <ImageIcon size={24} />
                        <span className="text-xs">رفع صورة</span>
                    </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                    <Upload className="text-white" size={20} />
                </div>
            </div>
            {value && (
                <button
                    onClick={() => setData(prev => ({ ...prev, [field]: '' }))}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 block mx-auto"
                >
                    حذف الصورة
                </button>
            )}
        </div>
    );

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-300">إعدادات الهوية البصرية</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">تخصيص شعار الموقع واسم المنصة</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    حفظ التعديلات
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ImageUploader label="الشعار الرئيسي (الوضع الفاتح)" field="logoUrl" value={data.logoUrl} />
                <ImageUploader label="الشعار الليلي (الوضع الداكن)" field="darkLogoUrl" value={data.darkLogoUrl || ''} />
                <ImageUploader label="شعار الفوتر (اختياري)" field="footerLogoUrl" value={data.footerLogoUrl || ''} />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="font-bold border-b pb-2 mb-4">نصوص العلامة التجارية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">اسم الموقع</label>
                        <input
                            type="text"
                            value={data.siteName}
                            onChange={(e) => setData(prev => ({ ...prev, siteName: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="مثال: منصة الحلم"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الشعار النصي (Slogan)</label>
                        <input
                            type="text"
                            value={data.slogan}
                            onChange={(e) => setData(prev => ({ ...prev, slogan: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="مثال: نحو مستقبل رياضي أفضل"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
