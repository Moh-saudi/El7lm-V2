import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plus, Edit, Eye, Image, Video, FileText, Calendar, Users, Target, Save, X,
    Clock, Zap, Settings, ExternalLink, Upload, Gift
} from 'lucide-react';
import AdFileUpload from '@/components/ads/AdFileUpload';
import { Ad } from '@/types/ads';

interface AdFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingAd: Ad | null;
    onSubmit: (data: Partial<Ad>) => Promise<void>;
}

export default function AdFormDialog({ open, onOpenChange, editingAd, onSubmit }: AdFormDialogProps) {
    const [formData, setFormData] = useState<Partial<Ad>>({
        title: '',
        description: '',
        type: 'text',
        mediaUrl: '',
        ctaText: '',
        ctaUrl: '',
        customUrl: '',
        isActive: true,
        priority: 1,
        targetAudience: 'new_users',
        displayLocation: 'all',
        startDate: '',
        endDate: '',
        popupType: 'modal',
        displayDelay: 3,
        maxDisplays: 1,
        displayFrequency: 'once',
        showCloseButton: true,
        autoClose: 0,
        showProgressBar: false,
        urgency: 'medium',
        discount: '',
        countdown: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form when editingAd changes
    useEffect(() => {
        if (editingAd) {
            let ctaUrl = editingAd.ctaUrl || '';
            let customUrl = '';

            const predefinedUrls = [
                '/auth/register', '/auth/login', '/dashboard', '/dashboard/player',
                '/dashboard/club', '/dashboard/academy', '/dashboard/trainer', '/dashboard/agent',
                '/pricing', '/about', '/contact', '/features', '/testimonials',
                '/blog', '/support', '/careers', '/platform', '/dashboard/dream-academy',
                '/dashboard/player/referrals'
            ];

            if (ctaUrl && !predefinedUrls.includes(ctaUrl)) {
                customUrl = ctaUrl;
                ctaUrl = 'custom';
            }

            setFormData({
                ...editingAd,
                ctaUrl,
                customUrl
            });
        } else {
            // Reset to defaults
            setFormData({
                title: '',
                description: '',
                type: 'text',
                mediaUrl: '',
                ctaText: '',
                ctaUrl: '',
                customUrl: '',
                isActive: true,
                priority: 1,
                targetAudience: 'new_users',
                displayLocation: 'all',
                startDate: '',
                endDate: '',
                popupType: 'modal',
                displayDelay: 3,
                maxDisplays: 1,
                displayFrequency: 'once',
                showCloseButton: true,
                autoClose: 0,
                showProgressBar: false,
                urgency: 'medium',
                discount: '',
                countdown: ''
            });
        }
    }, [editingAd, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let finalCtaUrl = formData.ctaUrl;
            if (formData.ctaUrl === 'custom' && formData.customUrl) {
                if (!formData.customUrl.startsWith('http://') && !formData.customUrl.startsWith('https://')) {
                    alert('يجب أن يبدأ الرابط المخصص بـ http:// أو https://');
                    setIsSubmitting(false);
                    return;
                }
                finalCtaUrl = formData.customUrl;
            }

            await onSubmit({
                ...formData,
                ctaUrl: finalCtaUrl
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-hidden p-0 bg-white border-0 flex flex-col" aria-describedby="ad-form-description">
                <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 px-6 py-4 flex-shrink-0">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                    {editingAd ? <Edit className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-white">
                                        {editingAd ? 'تعديل الإعلان' : 'إنشاء إعلان جديد'}
                                    </DialogTitle>
                                    <DialogDescription id="ad-form-description" className="text-white/70 text-sm">
                                        {editingAd ? 'تعديل بيانات الإعلان الحالي' : 'إضافة إعلان جديد للمنصة'}
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                                <div className={`w-2 h-2 rounded-full ${formData.title && formData.description ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                                <span className="text-xs font-medium text-white">
                                    {formData.title && formData.description ? 'جاهز للنشر' : 'قيد التعديل'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Body - Split Layout */}
                    <div className="flex-1 flex overflow-hidden min-h-0 bg-gray-50/50">
                        {/* Form Section */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-300">
                            <Tabs defaultValue="basic" className="space-y-6">
                                <TabsList className="bg-white border p-1 rounded-xl w-full sm:w-auto h-auto grid grid-cols-3 sm:flex gap-1">
                                    <TabsTrigger value="basic" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 py-2">
                                        <FileText className="h-4 w-4 ml-2" /> <span className="text-xs sm:text-sm">الأساسية</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="media" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 py-2">
                                        <Image className="h-4 w-4 ml-2" /> <span className="text-xs sm:text-sm">الوسائط</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="settings" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 py-2">
                                        <Settings className="h-4 w-4 ml-2" /> <span className="text-xs sm:text-sm">الإعدادات</span>
                                    </TabsTrigger>
                                </TabsList>

                                {/* BASIC TAB */}
                                <TabsContent value="basic" className="space-y-6">
                                    {/* Cards Grid */}
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Basic Info */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm">
                                            <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold border-b pb-2">
                                                <Zap className="h-4 w-4 text-purple-600" /> معلومات الإعلان
                                            </div>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-xs mb-1.5 block">عنوان الإعلان <span className="text-red-500">*</span></Label>
                                                        <Input
                                                            value={formData.title}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                                            placeholder="مثال: عرض خاص..."
                                                            className="bg-gray-50 focus:bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs mb-1.5 block">النوع <span className="text-red-500">*</span></Label>
                                                        <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as any }))}>
                                                            <SelectTrigger className="bg-gray-50"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="text">نص فقط</SelectItem>
                                                                <SelectItem value="image">صورة</SelectItem>
                                                                <SelectItem value="video">فيديو</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">الوصف <span className="text-red-500">*</span></Label>
                                                    <Textarea
                                                        value={formData.description}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                        rows={4}
                                                        placeholder="تفاصيل الإعلان..."
                                                        className="bg-gray-50 focus:bg-white resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* CTA */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm">
                                            <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold border-b pb-2">
                                                <Target className="h-4 w-4 text-emerald-600" /> زر الإجراء (CTA)
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">نص الزر</Label>
                                                    <Input
                                                        value={formData.ctaText}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
                                                        placeholder="اضغط هنا"
                                                        className="bg-gray-50 border-emerald-100 focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">الوجهة</Label>
                                                    <Select value={formData.ctaUrl} onValueChange={(v) => setFormData(prev => ({ ...prev, ctaUrl: v }))}>
                                                        <SelectTrigger className="bg-gray-50 border-emerald-100"><SelectValue placeholder="اختر الوجهة" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="/auth/register">التسجيل</SelectItem>
                                                            <SelectItem value="/auth/login">تسجيل الدخول</SelectItem>
                                                            <SelectItem value="/dashboard">لوحة التحكم</SelectItem>
                                                            <SelectItem value="/pricing">الأسعار</SelectItem>
                                                            <SelectItem value="custom">رابط مخصص</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {formData.ctaUrl === 'custom' && (
                                                    <div className="sm:col-span-2">
                                                        <Label className="text-xs mb-1.5 block">الرابط المخصص</Label>
                                                        <Input
                                                            value={formData.customUrl}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, customUrl: e.target.value }))}
                                                            placeholder="https://"
                                                            className="bg-gray-50 border-emerald-100"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* MEDIA TAB */}
                                <TabsContent value="media">
                                    <div className="bg-white p-6 rounded-xl border shadow-sm text-center">
                                        {formData.type === 'image' || formData.type === 'video' ? (
                                            <div className="space-y-6">
                                                <div className="max-w-md mx-auto">
                                                    <div className="mb-4">
                                                        <h3 className="text-lg font-medium text-gray-900 mb-1">رفع {formData.type === 'image' ? 'الصورة' : 'الفيديو'}</h3>
                                                        <p className="text-sm text-gray-500">اختر ملفاً من جهازك أو اسحبه هنا</p>
                                                    </div>
                                                    <AdFileUpload
                                                        adId={editingAd?.id || `temp_${Date.now()}`}
                                                        fileType={formData.type}
                                                        onFileUploaded={(url) => {
                                                            console.log('🖼️ Media URL updated in form:', url);
                                                            setFormData(prev => ({ ...prev, mediaUrl: url }));
                                                        }}
                                                        onFileDeleted={() => setFormData(prev => ({ ...prev, mediaUrl: '' }))}
                                                        currentFileUrl={formData.mediaUrl}
                                                    />
                                                    {formData.mediaUrl && (
                                                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs break-all text-gray-500 font-mono">
                                                            DEBUG URL: {formData.mediaUrl}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="border-t pt-4">
                                                    <p className="text-xs font-semibold text-gray-500 mb-2">أو رابط خارجي</p>
                                                    <div className="flex gap-2 max-w-lg mx-auto">
                                                        <Input
                                                            value={formData.mediaUrl}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                                                            placeholder="https://example.com/media.jpg"
                                                            className="text-sm"
                                                        />
                                                        <Button variant="outline" size="icon" title="preview">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-12">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <FileText className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <h3 className="text-gray-900 font-medium">النوع المحدد هو "نص فقط"</h3>
                                                <p className="text-gray-500 text-sm mt-1">غيّر النوع إلى صورة أو فيديو لتتمكن من رفع الوسائط.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                {/* SETTINGS TAB */}
                                <TabsContent value="settings" className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Display Settings */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                            <h3 className="font-semibold flex items-center gap-2 border-b pb-2"><Settings className="h-4 w-4" /> العرض والجمهور</h3>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">الأولوية</Label>
                                                    <Input type="number" min="1" max="10" value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: +e.target.value }))} />
                                                </div>
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">الجمهور</Label>
                                                    <Select value={formData.targetAudience} onValueChange={(v) => setFormData(prev => ({ ...prev, targetAudience: v as any }))}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">الجميع</SelectItem>
                                                            <SelectItem value="new_users">جدد</SelectItem>
                                                            <SelectItem value="returning_users">عائدين</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs mb-1.5 block">مكان الظهور</Label>
                                                <Select value={formData.displayLocation} onValueChange={(v) => setFormData(prev => ({ ...prev, displayLocation: v as any }))}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">🌐 الكل</SelectItem>
                                                        <SelectItem value="landing">🏠 الرئيسية</SelectItem>
                                                        <SelectItem value="dashboard">📊 لوحة التحكم</SelectItem>
                                                        <SelectItem value="player">⚽ لاعب</SelectItem>
                                                        <SelectItem value="club">🏟️ نادي</SelectItem>
                                                        <SelectItem value="admin">⚙️ أدمن</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                <span className="text-sm font-medium">حالة الإعلان</span>
                                                <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))} />
                                            </div>
                                        </div>

                                        {/* Scheduling */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                            <h3 className="font-semibold flex items-center gap-2 border-b pb-2"><Calendar className="h-4 w-4" /> الجدول الزمني</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">من تاريخ</Label>
                                                    <Input type="date" value={formData.startDate} onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">إلى تاريخ</Label>
                                                    <Input type="date" value={formData.endDate} onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">خصم (نص)</Label>
                                                    <Input placeholder="50% OFF" value={formData.discount} onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <Label className="text-xs mb-1.5 block">عد تنازلي</Label>
                                                    <Input placeholder="HH:MM:SS" value={formData.countdown} onChange={(e) => setFormData(prev => ({ ...prev, countdown: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Advanced Popup Settings */}
                                        <div className="lg:col-span-2 bg-gradient-to-r from-violet-50 to-purple-50 p-5 rounded-xl border border-violet-100 space-y-4">
                                            <h3 className="font-semibold flex items-center gap-2 border-b border-violet-200 pb-2 text-violet-800"><Zap className="h-4 w-4" /> سلوك النافذة (Popup)</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div>
                                                    <Label className="text-xs text-violet-700 mb-1 block">نوع العرض</Label>
                                                    <Select value={formData.popupType} onValueChange={(v) => setFormData(prev => ({ ...prev, popupType: v as any }))}>
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="modal">Modal</SelectItem>
                                                            <SelectItem value="toast">Toast</SelectItem>
                                                            <SelectItem value="banner">Banner</SelectItem>
                                                            <SelectItem value="side-panel">Side Panel</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-violet-700 mb-1 block">تكرار العرض</Label>
                                                    <Select value={formData.displayFrequency} onValueChange={(v) => setFormData(prev => ({ ...prev, displayFrequency: v as any }))}>
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="once">مرة واحدة</SelectItem>
                                                            <SelectItem value="daily">يومياً</SelectItem>
                                                            <SelectItem value="always">دائماً</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-violet-700 mb-1 block">تأخير (ث)</Label>
                                                    <Input type="number" min="0" value={formData.displayDelay} onChange={(e) => setFormData(prev => ({ ...prev, displayDelay: +e.target.value }))} className="bg-white" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-violet-700 mb-1 block">إغلاق تلقائي (ث)</Label>
                                                    <Input type="number" min="0" placeholder="0 = لا" value={formData.autoClose || 0} onChange={(e) => setFormData(prev => ({ ...prev, autoClose: +e.target.value }))} className="bg-white" />
                                                </div>
                                            </div>
                                            <div className="flex gap-6 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <Switch checked={formData.showCloseButton} onCheckedChange={(v) => setFormData(prev => ({ ...prev, showCloseButton: v }))} className="data-[state=checked]:bg-violet-600" />
                                                    <span className="text-sm">زر إغلاق</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch checked={formData.showProgressBar} onCheckedChange={(v) => setFormData(prev => ({ ...prev, showProgressBar: v }))} className="data-[state=checked]:bg-violet-600" />
                                                    <span className="text-sm">شريط تقدم</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Preview Section - Hidden on small screens */}
                        <div className="hidden lg:block w-[320px] bg-slate-100 border-r p-6 overflow-y-auto">
                            <div className="sticky top-0">
                                <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-4 text-lg">
                                    <Eye className="h-5 w-5" /> معاينة حية
                                </h4>

                                {/* Phone Mockup or Card */}
                                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                                    {/* Mockup Header */}
                                    <div className="bg-slate-800 text-white p-3 text-xs flex justify-between items-center">
                                        <span>9:41</span>
                                        <div className="flex gap-1">
                                            <div className="w-3 h-3 rounded-full bg-white/20"></div>
                                            <div className="w-3 h-3 rounded-full bg-white/20"></div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 min-h-[400px] flex items-center justify-center bg-gray-50">
                                        <div className="w-full bg-white rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in duration-500">
                                            {formData.mediaUrl && (
                                                <div className="h-40 bg-gray-200 relative">
                                                    {formData.type === 'video' ? (
                                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400"><Video className="h-10 w-10" /></div>
                                                    ) : (
                                                        <img src={formData.mediaUrl} className="w-full h-full object-cover" alt="preview" />
                                                    )}
                                                    {formData.showCloseButton && (
                                                        <button className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs">✕</button>
                                                    )}
                                                </div>
                                            )}
                                            <div className="p-4 text-center">
                                                <h3 className="font-bold text-gray-900 mb-2">{formData.title || 'عنوان الإعلان'}</h3>
                                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                                    {formData.description || 'وصف الإعلان سيظهر هنا...'}
                                                </p>
                                                {formData.ctaText && (
                                                    <Button className="w-full bg-blue-600 hover:bg-blue-700">{formData.ctaText}</Button>
                                                )}
                                            </div>
                                            {formData.showProgressBar && (
                                                <div className="h-1 bg-gray-100 w-full"><div className="h-full bg-blue-600 w-1/3"></div></div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-2">
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">ملخص</div>
                                    <div className="bg-white p-3 rounded-lg border text-sm flex justify-between">
                                        <span className="text-gray-500">النوع</span>
                                        <span className="font-semibold">{formData.popupType}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border text-sm flex justify-between">
                                        <span className="text-gray-500">التكرار</span>
                                        <span className="font-semibold">{formData.displayFrequency}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Actions */}
                    <div className="p-4 border-t bg-white flex justify-end gap-3 flex-shrink-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                            {isSubmitting ? <span className="animate-spin ml-2">⏳</span> : <Save className="ml-2 h-4 w-4" />}
                            {editingAd ? 'حفظ التعديلات' : 'نشر الإعلان'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
