'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, Save, Image as ImageIcon, Loader2, Eye } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { getAds, saveAds, AdItem } from '@/lib/content/ads-service';
import { storageManager } from '@/lib/storage';

function AdPreviewModal({ ad, onClose }: { ad: AdItem, onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
                    <span className="text-white font-bold text-sm flex items-center gap-2">
                        <Eye size={16} className="text-green-400" />
                        معاينة الإعلان — كما يظهر على الموقع
                    </span>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* The actual ad preview — exact replica */}
                <div className="relative bg-slate-800" style={{ height: '340px' }}>
                    {/* Background Image */}
                    {ad.imageUrl ? (
                        <Image
                            src={ad.imageUrl}
                            alt={ad.title}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                            <div className="text-center">
                                <ImageIcon size={48} className="mx-auto mb-2 opacity-40" />
                                <span className="text-sm">لم يتم رفع صورة بعد</span>
                            </div>
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

                    {/* Badges */}
                    <div className="absolute top-5 right-6 flex gap-2 z-10">
                        <span className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold border border-white/15 uppercase">
                            إعلان
                        </span>
                        {(ad as any).category && (
                            <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                {(ad as any).category}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 right-0 left-0 p-8 z-10 text-right">
                        <h3 className="text-white text-2xl font-extrabold mb-2 leading-tight">{ad.title || 'عنوان الإعلان'}</h3>
                        {(ad as any).description && (
                            <p className="text-white/80 text-sm mb-4 leading-relaxed max-w-lg mr-auto line-clamp-2">
                                {(ad as any).description}
                            </p>
                        )}
                        <span className="inline-flex items-center gap-2 bg-emerald-500 text-white px-5 py-2 rounded-full text-sm font-bold">
                            اعرف أكثر ←
                        </span>
                    </div>
                </div>

                {/* Info bar */}
                <div className="bg-slate-900 px-5 py-3 text-xs text-slate-400 flex items-center gap-4">
                    <span>📐 عرض: 100% من الشاشة | ارتفاع: 340px</span>
                    <span>🔗 الرابط: <span className="text-blue-400 font-mono">{ad.linkUrl || '#'}</span></span>
                    <span className={`mr-auto font-bold ${(ad.active ?? true) ? 'text-green-400' : 'text-red-400'}`}>
                        {(ad.active ?? true) ? '✓ نشط' : '✗ معطّل'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function AdsManager() {
    const [ads, setAds] = useState<AdItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [previewAd, setPreviewAd] = useState<AdItem | null>(null);

    useEffect(() => { loadAds(); }, []);

    const loadAds = async () => {
        try {
            const data = await getAds();
            setAds(data || []);
        } catch {
            toast.error('فشل تحميل الإعلانات');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAd = () => {
        const newAd: AdItem = {
            id: Date.now().toString(),
            title: 'إعلان جديد',
            linkUrl: '#',
            imageUrl: '',
            active: true
        };
        setAds([...ads, newAd]);
    };

    const handleDelete = (id: string) => {
        setAds(ads.filter(a => a.id !== id));
        toast.success('تم حذف الإعلان');
    };

    const handleUpdate = (id: string, field: keyof AdItem, value: any) => {
        setAds(ads.map(a => a.id === id ? { ...a, [field]: value } : a));
        // Update preview if open
        if (previewAd?.id === id) {
            setPreviewAd(prev => prev ? { ...prev, [field]: value } : null);
        }
    };

    const handleImageUpload = async (id: string, file: File) => {
        try {
            setUploadingId(id);
            const fileName = `ads/${Date.now()}_${file.name}`;
            const result = await storageManager.upload('content', fileName, file, {
                contentType: file.type,
                upsert: true
            });
            if (result?.publicUrl) {
                handleUpdate(id, 'imageUrl', result.publicUrl);
                toast.success('تم رفع الصورة بنجاح');
            }
        } catch {
            toast.error('فشل رفع الصورة');
        } finally {
            setUploadingId(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveAds(ads);
            toast.success('تم حفظ التعديلات بنجاح');
        } catch {
            toast.error('فشل حفظ الإعلانات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="space-y-6">
            {/* Preview Modal */}
            <AnimatePresence>
                {previewAd && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <AdPreviewModal ad={previewAd} onClose={() => setPreviewAd(null)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-300">إدارة الإعلانات — سلايدر الصفحة الرئيسية</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">الإعلانات تتنقل تلقائياً كل <strong>1.5 ثانية</strong> — اضغط 👁️ لمعاينة كل إعلان قبل النشر</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    حفظ التعديلات
                </button>
            </div>

            {/* Specs Guide */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                    <span>📐</span> متطلبات صور الإعلانات
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'المقاس المثالي', value: '1920 × 540 px', icon: '🖼️' },
                        { label: 'نسبة العرض للارتفاع', value: '16 : 4.5', icon: '📏' },
                        { label: 'أقصى حجم للملف', value: '2 MB', icon: '💾' },
                        { label: 'الصيغ المدعومة', value: 'JPG / PNG / WebP', icon: '✅' },
                    ].map((spec, i) => (
                        <div key={i} className="bg-white dark:bg-amber-900/20 rounded-lg p-3 text-center border border-amber-100 dark:border-amber-800/20">
                            <div className="text-xl mb-1">{spec.icon}</div>
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">{spec.label}</div>
                            <div className="text-sm font-bold text-amber-900 dark:text-amber-200 mt-0.5">{spec.value}</div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                    💡 <strong>نصيحة:</strong> الإعلان يظهر بعرض كامل الشاشة وارتفاع 340px. استخدم صوراً أفقية بانورامية. الحد الأقصى 5 إعلانات نشطة.
                </p>
            </div>

            {/* Ads List */}
            <div className="space-y-5">
                <AnimatePresence>
                    {ads.map((ad, index) => (
                        <motion.div
                            key={ad.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className={`bg-white dark:bg-[#1e293b] rounded-2xl border ${ad.active ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 dark:border-red-900/50 opacity-70'} overflow-hidden shadow-sm`}
                        >
                            {/* Status + Actions row */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">إعلان #{index + 1}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPreviewAd(ad)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200"
                                    >
                                        <Eye size={13} /> معاينة
                                    </button>
                                    <button
                                        onClick={() => handleUpdate(ad.id, 'active', !ad.active)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${ad.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                    >
                                        {ad.active ? '✓ نشط' : '✗ معطّل'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(ad.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <X size={12} /> حذف
                                    </button>
                                </div>
                            </div>

                            {/* Main: image left + fields right */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                                {/* Image — wide banner aspect */}
                                <div
                                    className="relative bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                                    style={{ aspectRatio: '16 / 4.5', minHeight: '180px' }}
                                >
                                    <input
                                        type="file" accept="image/*"
                                        className="absolute inset-0 opacity-0 z-20 cursor-pointer w-full h-full"
                                        onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(ad.id, e.target.files[0]); }}
                                    />
                                    {uploadingId === ad.id ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-30">
                                            <Loader2 className="animate-spin text-blue-500" size={36} />
                                        </div>
                                    ) : ad.imageUrl ? (
                                        <>
                                            <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" unoptimized />
                                            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 z-10">
                                                <span className="text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-full flex items-center gap-2">
                                                    <Upload size={14} /> تغيير الصورة
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                                            <ImageIcon size={36} className="text-blue-300" />
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">اضغط لرفع صورة الإعلان</span>
                                            <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">المقاس المثالي: 1920 × 540 px</span>
                                        </div>
                                    )}
                                </div>

                                {/* Edit Fields */}
                                <div className="p-5 space-y-3 border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-700">
                                    <div>
                                        <label className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1 block">عنوان الإعلان *</label>
                                        <input type="text" value={ad.title}
                                            onChange={(e) => handleUpdate(ad.id, 'title', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="مثال: خصم 50% على الاشتراك" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1 block">الوصف</label>
                                        <input type="text" value={(ad as any).description || ''}
                                            onChange={(e) => handleUpdate(ad.id, 'description' as any, e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="تفاصيل مختصرة عن الإعلان..." />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1 block">الفئة (شارة ملونة)</label>
                                        <input type="text" value={(ad as any).category || ''}
                                            onChange={(e) => handleUpdate(ad.id, 'category' as any, e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="تدريب / بطولة / عرض خاص" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1 block">رابط التوجيه</label>
                                        <input type="text" value={ad.linkUrl}
                                            onChange={(e) => handleUpdate(ad.id, 'linkUrl', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-left"
                                            dir="ltr" placeholder="https://example.com" />
                                    </div>
                                    <button
                                        onClick={() => setPreviewAd(ad)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-bold"
                                    >
                                        <Eye size={15} /> معاينة الإعلان كما يظهر على الموقع
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Add New */}
                <button onClick={handleAddAd}
                    className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-blue-500">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Plus size={22} />
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-sm">إضافة إعلان جديد</div>
                        <div className="text-xs text-slate-400">الحد الأقصى 5 إعلانات نشطة</div>
                    </div>
                </button>
            </div>
        </div>
    );
}
