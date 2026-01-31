'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { getPartners, savePartners, uploadPartnerLogo, PartnerItem } from '@/lib/content/partners-service';

export default function PartnersManager() {
    const [partners, setPartners] = useState<PartnerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    // Ref for file input
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activePartnerIdRef = useRef<string | null>(null);

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            const data = await getPartners();
            setPartners(data || []);
        } catch (error) {
            toast.error('فشل تحميل الشركاء');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPartner = async () => {
        const newPartner: PartnerItem = {
            id: Date.now().toString(),
            name: 'شريك جديد',
            logoUrl: '',
            order: partners.length
        };
        const updatedPartners = [...partners, newPartner];
        setPartners(updatedPartners);
        // Auto save on add
        try {
            await savePartners(updatedPartners);
            toast.success('تمت إضافة بطاقة جديدة');
        } catch (error) {
            toast.error('فشل الحفظ');
        }
    };

    const handleDelete = async (id: string) => {
        const updatedPartners = partners.filter(p => p.id !== id);
        setPartners(updatedPartners);
        try {
            await savePartners(updatedPartners);
            toast.success('تم حذف الشريك');
        } catch (error) {
            toast.error('فشل الحفظ');
        }
    };

    const handleUpdateName = async (id: string, name: string) => {
        const updatedPartners = partners.map(p => p.id === id ? { ...p, name } : p);
        setPartners(updatedPartners);
    };

    const handleNameBlur = async () => {
        // Save when user finishes typing (on blur)
        try {
            await savePartners(partners);
        } catch (error) {
            toast.error('فشل حفظ الاسم');
        }
    };

    const handleLogoClick = (id: string) => {
        activePartnerIdRef.current = id;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const id = activePartnerIdRef.current;

        if (!file || !id) return;

        // Reset input
        e.target.value = '';

        setUploadingId(id);
        try {
            const url = await uploadPartnerLogo(file);

            const updatedPartners = partners.map(p =>
                p.id === id ? { ...p, logoUrl: url } : p
            );

            setPartners(updatedPartners);
            await savePartners(updatedPartners);

            toast.success('تم رفع الشعار بنجاح');
        } catch (error) {
            console.error(error);
            toast.error('فشل رفع الشعار');
        } finally {
            setUploadingId(null);
            activePartnerIdRef.current = null;
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">جاري تحميل الشركاء...</div>;
    }

    return (
        <div className="space-y-8">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            {/* Guidelines Banner */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-purple-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                    <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-1">تعليمات شعارات الشركاء</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-gray-400">
                        <li>المقاس الموصى به: <span className="font-mono font-bold bg-white dark:bg-black/20 px-1 rounded">200x200</span> بكسل.</li>
                        <li>الصيغة: <span className="font-bold">PNG شفاف</span> (Transparent Background) هو الأفضل.</li>
                        <li>انقر على الدائرة لرفع صورة الشعار.</li>
                    </ul>
                </div>
            </div>

            {/* Partners Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <AnimatePresence>
                    {partners.map((partner) => (
                        <motion.div
                            key={partner.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            layout
                            className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center gap-3 shadow-sm group relative"
                        >
                            <button
                                onClick={() => handleDelete(partner.id)}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                            >
                                <X size={16} />
                            </button>

                            {/* Logo Circle */}
                            <div
                                onClick={() => handleLogoClick(partner.id)}
                                className="w-24 h-24 rounded-full border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-colors relative"
                            >
                                {uploadingId === partner.id ? (
                                    <Loader2 className="animate-spin text-blue-500" />
                                ) : partner.logoUrl ? (
                                    <div className="relative w-full h-full p-2">
                                        <Image
                                            src={partner.logoUrl}
                                            alt={partner.name}
                                            fill
                                            className="object-contain p-2"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-slate-400 flex flex-col items-center gap-1">
                                        <Upload size={20} />
                                        <span className="text-[9px]">رفع</span>
                                    </div>
                                )}
                            </div>

                            {/* Name Input */}
                            <input
                                type="text"
                                value={partner.name}
                                onChange={(e) => handleUpdateName(partner.id, e.target.value)}
                                onBlur={handleNameBlur}
                                className="w-full text-center text-xs font-medium bg-transparent border-b border-transparent focus:border-blue-500 outline-none pb-1 transition-colors hover:border-slate-200"
                                placeholder="اسم الشريك"
                            />
                        </motion.div>
                    ))}

                    {/* Add Button */}
                    <button
                        onClick={handleAddPartner}
                        className="flex flex-col items-center justify-center gap-2 h-[160px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 transition-all text-slate-400 hover:text-blue-500"
                    >
                        <Plus size={24} />
                        <span className="text-xs font-bold">إضافة شريك</span>
                    </button>
                </AnimatePresence>
            </div>
        </div>
    );
}
