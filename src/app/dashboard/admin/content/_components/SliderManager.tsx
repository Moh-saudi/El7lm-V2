'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, Save, Image as ImageIcon, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { getSliderItems, saveSliderItems, SliderItem } from '@/lib/content/slider-service';
import { storageManager } from '@/lib/storage';
import { MARKETING_TEMPLATES } from '@/data/marketing-templates';

export default function SliderManager() {
    const [slides, setSlides] = useState<SliderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    useEffect(() => {
        loadSlides();
    }, []);

    const loadSlides = async () => {
        try {
            const data = await getSliderItems();
            setSlides(data.length > 0 ? data : []);
        } catch (error) {
            toast.error('Failed to load slides');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlide = () => {
        const newSlide: SliderItem = {
            id: Date.now().toString(),
            title: 'عنوان جديد',
            subtitle: 'وصف قصير للشريحة...',
            image: '',
            ctaText: 'زر الإجراء',
            ctaLink: '#',
            active: true,
            order: slides.length
        };
        setSlides([...slides, newSlide]);
    };

    const handleDelete = (id: string) => {
        setSlides(slides.filter(s => s.id !== id));
        toast.success('Deleted slide');
    };

    const handleUpdate = (id: string, field: keyof SliderItem, value: any) => {
        setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleImageUpload = async (id: string, file: File) => {
        try {
            setUploadingId(id);
            const fileName = `slider/${Date.now()}_${file.name}`;
            const result = await storageManager.upload('content', fileName, file, {
                contentType: file.type,
                upsert: true
            });

            if (result?.publicUrl) {
                handleUpdate(id, 'image', result.publicUrl);
                toast.success('Image uploaded');
            }
        } catch (error) {
            console.error(error);
            toast.error('Upload failed');
        } finally {
            setUploadingId(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveSliderItems(slides);
            toast.success('Changes saved successfully');
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleAutoGenerate = (id: string) => {
        const templates = MARKETING_TEMPLATES.slider;
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

        setSlides(slides.map(s => s.id === id ? {
            ...s,
            title: randomTemplate.title,
            subtitle: randomTemplate.subtitle,
            ctaText: randomTemplate.ctaText
        } : s));

        toast.success('تم توليد محتوى مقترح ✨', {
            icon: '✨',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-8">
            {/* Header Actions */}
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <div className="flex items-center gap-3">
                    <AlertCircle className="text-blue-500" size={20} />
                    <div className="text-sm">
                        <span className="font-bold text-blue-700 dark:text-blue-300">نصائح: </span>
                        <span className="text-slate-600 dark:text-gray-400">استخدم صور عالية الدقة (1920x1080) لضمان أفضل ظهور.</span>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    حفظ التعديلات
                </button>
            </div>

            {/* Slides List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                    {slides.map((slide, index) => (
                        <motion.div
                            key={slide.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm group"
                        >
                            {/* Image Preview Area */}
                            <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative group cursor-pointer border-b border-slate-100 dark:border-slate-700">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 z-20 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleImageUpload(slide.id, e.target.files[0]);
                                    }}
                                />
                                {uploadingId === slide.id ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-30">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                    </div>
                                ) : slide.image ? (
                                    <Image src={slide.image} alt={slide.title} fill className="object-cover" priority={true} sizes="(max-width: 768px) 100vw, 50vw" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                        <ImageIcon size={32} />
                                        <span className="text-xs font-medium">اضغط لرفع صورة</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10 w-auto">
                                    شريحة #{index + 1}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(slide.id);
                                    }}
                                    className="absolute top-2 left-2 p-1.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-30"
                                    title="حذف"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Edit Fields */}
                            <div className="p-4 space-y-3">
                                <div className="flex justify-end -mt-2 mb-2">
                                    <button
                                        onClick={() => handleAutoGenerate(slide.id)}
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 px-2.5 py-1 rounded-full transition-all border border-purple-100 dark:border-purple-800 shadow-sm hover:shadow"
                                        title="توليد عنوان ووصف تلقائياً"
                                    >
                                        <Sparkles size={12} className="text-purple-500" />
                                        <span>اقتراح محتوى ذكي AI</span>
                                    </button>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1 block">العنوان الرئيسي</label>
                                    <input
                                        type="text"
                                        value={slide.title}
                                        onChange={(e) => handleUpdate(slide.id, 'title', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1 block">الوصف</label>
                                    <textarea
                                        value={slide.subtitle}
                                        onChange={(e) => handleUpdate(slide.id, 'subtitle', e.target.value)}
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1 block">نص الزر</label>
                                        <input
                                            type="text"
                                            value={slide.ctaText}
                                            onChange={(e) => handleUpdate(slide.id, 'ctaText', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1 block">الرابط</label>
                                        <input
                                            type="text"
                                            value={slide.ctaLink}
                                            onChange={(e) => handleUpdate(slide.id, 'ctaLink', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Add New Button */}
                    <button
                        onClick={handleAddSlide}
                        className="flex flex-col items-center justify-center gap-3 aspect-video bg-dashed border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group text-slate-400 hover:text-blue-500"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                            <Plus size={24} />
                        </div>
                        <span className="font-medium text-sm">إضافة شريحة جديدة</span>
                    </button>
                </AnimatePresence>
            </div>
        </div>
    );
}
