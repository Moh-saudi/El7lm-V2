'use client';

import { useState, useEffect } from 'react';
import { Upload, Save, Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { getHomeImages, saveHomeImages, HomeImagesData } from '@/lib/content/home-images-service';
import { storageManager } from '@/lib/storage';

export default function HomeImagesManager() {
    const [data, setData] = useState<HomeImagesData>({
        heroImage: '',
        heroImages: [],
        heroMockup: '',
        heroMockups: [],
        aboutVideoBg: '',
        tourImages: ['', '', ''],
        playerImages: ['', '', '', '']
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const images = await getHomeImages();
            setData(images);
        } catch {
            toast.error('فشل تحميل الصور');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (field: keyof HomeImagesData, file: File, index?: number) => {
        const uploadKey = index !== undefined ? `${field}_${index}` : field;
        setUploadingField(uploadKey);
        try {
            const fileName = `home/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const result = await storageManager.upload('content', fileName, file, { contentType: file.type, upsert: true });
            if (result?.publicUrl) {
                if (index !== undefined) {
                    setData(prev => {
                        const newArr = [...(prev[field] as string[])];
                        newArr[index] = result.publicUrl;
                        return { ...prev, [field]: newArr };
                    });
                } else {
                    setData(prev => ({ ...prev, [field]: result.publicUrl }));
                }
                toast.success('تم رفع الصورة بنجاح');
            }
        } catch {
            toast.error('فشل الرفع');
        } finally {
            setUploadingField(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveHomeImages(data);
            toast.success('تم الحفظ بنجاح ✓');
        } catch {
            toast.error('فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const addToArray = (field: 'heroImages' | 'heroMockups') => {
        setData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
    };

    const removeFromArray = (field: 'heroImages' | 'heroMockups', index: number) => {
        setData(prev => {
            const newArr = (prev[field] as string[]).filter((_, i) => i !== index);
            return { ...prev, [field]: newArr.length > 0 ? newArr : [''] };
        });
    };

    const ImageUploader = ({ label, field, value, index }: {
        label: string, field: keyof HomeImagesData, value: string, index?: number
    }) => {
        const uploadKey = index !== undefined ? `${field}_${index}` : field;
        return (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">{label}</label>
                <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-blue-500 transition-colors">
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 z-20 cursor-pointer"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(field, e.target.files[0], index)} />
                    {uploadingField === uploadKey ? (
                        <div className="absolute inset-0 flex items-center justify-center z-30">
                            <Loader2 className="animate-spin text-blue-500" />
                        </div>
                    ) : value ? (
                        <Image src={value} alt={label} fill className="object-cover" unoptimized />
                    ) : (
                        <div className="text-slate-400 flex flex-col items-center gap-1">
                            <ImageIcon size={20} />
                            <span className="text-xs">انقر لرفع صورة</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                        <Upload className="text-white" size={18} />
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-300">صور الصفحة الرئيسية</h3>
                    <p className="text-sm text-slate-500">ارفع صوراً من جهازك — تُحفظ وتظهر فوراً في الموقع</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    حفظ التعديلات
                </button>
            </div>

            {/* 1. HERO BACKGROUND IMAGES */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-bold text-base">🖼️ صور خلفية قسم الهيرو</h4>
                        <p className="text-sm text-slate-500 mt-0.5">تتبدّل تلقائياً مع كل عبارة تحفيزية كخلفية للقسم الرئيسي</p>
                    </div>
                    <button onClick={() => addToArray('heroImages')}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">
                        <Plus size={14} /> إضافة صورة
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {data.heroImages.map((img, i) => (
                        <div key={i} className="relative group">
                            <ImageUploader label={`خلفية ${i + 1}`} field="heroImages" index={i} value={img || ''} />
                            {data.heroImages.length > 1 && (
                                <button onClick={() => removeFromArray('heroImages', i)}
                                    className="absolute top-1 left-1 z-30 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={11} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. HERO MOCKUP (Player Card) IMAGES */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-bold text-base">🃏 صور المستطيل الجانبي (بطاقة اللاعب)</h4>
                        <p className="text-sm text-slate-500 mt-0.5">تظهر داخل المستطيل بجوار العبارات التحفيزية وتتبدّل معها</p>
                    </div>
                    <button onClick={() => addToArray('heroMockups')}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">
                        <Plus size={14} /> إضافة صورة
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {data.heroMockups.map((img, i) => (
                        <div key={i} className="relative group">
                            <ImageUploader label={`بطاقة اللاعب ${i + 1}`} field="heroMockups" index={i} value={img || ''} />
                            {data.heroMockups.length > 1 && (
                                <button onClick={() => removeFromArray('heroMockups', i)}
                                    className="absolute top-1 left-1 z-30 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={11} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. AI VIDEO BG */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <h4 className="font-bold text-base mb-4">🤖 صورة خلفية قسم الذكاء الاصطناعي</h4>
                <div className="max-w-sm">
                    <ImageUploader label="خلفية فيديو الذكاء الاصطناعي" field="aboutVideoBg" value={data.aboutVideoBg} />
                </div>
            </div>

            {/* 4. TOUR IMAGES */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <h4 className="font-bold text-base mb-4">🏆 صور البطولات</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ImageUploader label="صورة البطولة 1" field="tourImages" index={0} value={data.tourImages[0] || ''} />
                    <ImageUploader label="صورة البطولة 2" field="tourImages" index={1} value={data.tourImages[1] || ''} />
                    <ImageUploader label="صورة البطولة 3" field="tourImages" index={2} value={data.tourImages[2] || ''} />
                </div>
            </div>

            {/* 5. PLAYER IMAGES */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <h4 className="font-bold text-base mb-4">⭐ صور المواهب المميزة</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ImageUploader label="اللاعب 1" field="playerImages" index={0} value={data.playerImages[0] || ''} />
                    <ImageUploader label="اللاعب 2" field="playerImages" index={1} value={data.playerImages[1] || ''} />
                    <ImageUploader label="اللاعب 3" field="playerImages" index={2} value={data.playerImages[2] || ''} />
                    <ImageUploader label="اللاعب 4" field="playerImages" index={3} value={data.playerImages[3] || ''} />
                </div>
            </div>
        </div>
    );
}
