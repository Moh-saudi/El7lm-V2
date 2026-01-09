import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import {
    Trophy, Calendar, Users, MapPin, DollarSign, Save, X, Link,
    Info, CreditCard, FileText, Image as ImageIcon, Upload, Navigation, Copy,
    CheckCircle2, ChevronRight, ChevronLeft, Flag, HelpCircle, Loader2
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tournament, getCurrencySymbol } from '../utils';
import { storageManager } from '@/lib/storage';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

interface TournamentFormProps {
    initialData: Tournament | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const STEPS = [
    { id: 1, title: 'البيانات الأساسية', icon: Info, description: 'الاسم، الوصف، والموقع' },
    { id: 2, title: 'التواريخ', icon: Calendar, description: 'مواعيد البطولة والتسجيل' },
    { id: 3, title: 'المالية', icon: DollarSign, description: 'الرسوم وطرق الدفع' },
    { id: 4, title: 'تفاصيل إضافية', icon: FileText, description: 'القواعد والفئات والجوائز' },
];

export const TournamentForm: React.FC<TournamentFormProps> = ({
    initialData,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<Tournament>>({
        name: '', description: '', location: '', locationUrl: '', startDate: '', endDate: '',
        registrationDeadline: '', maxParticipants: 100, currentParticipants: 0, entryFee: 0,
        currency: 'EGP', isPaid: false, isActive: true, ageGroups: [], categories: [],
        rules: '', prizes: '', contactInfo: '', logo: '', paymentMethods: ['credit_card', 'bank_transfer'],
        paymentDeadline: '', refundPolicy: '', feeType: 'individual', maxPlayersPerClub: 1,
        allowInstallments: false, installmentsCount: 2, installmentsDetails: '', registrations: [],
        walletName: '', walletNumber: ''
    });

    const ageGroupsList = [
        'تحت 8 سنوات', 'تحت 10 سنوات', 'تحت 12 سنة', 'تحت 14 سنة',
        'تحت 16 سنة', 'تحت 18 سنة', 'تحت 20 سنة', 'كبار (20+ سنة)'
    ];

    const categoriesList = ['أولاد', 'بنات', 'مختلط'];

    const paymentMethodsList = [
        { id: 'credit_card', name: 'بطاقة ائتمان', icon: '💳' },
        { id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏦' },
        { id: 'mobile_wallet', name: 'محفظة إلكترونية', icon: '📱' },
        { id: 'cash', name: 'نقداً', icon: '💵' }
    ];

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    startDate: initialData.startDate.split('T')[0],
                    endDate: initialData.endDate.split('T')[0],
                    registrationDeadline: initialData.registrationDeadline.split('T')[0],
                    paymentDeadline: initialData.paymentDeadline ? initialData.paymentDeadline.split('T')[0] : '',
                    isActive: initialData.isActive === true,
                    paymentMethods: initialData.paymentMethods || ['credit_card', 'bank_transfer'],
                    // Ensure arrays are initialized
                    ageGroups: initialData.ageGroups || [],
                    categories: initialData.categories || [],
                    registrations: initialData.registrations || [],
                    walletName: initialData.walletName || '',
                    walletNumber: initialData.walletNumber || '',
                });
                setLogoPreview(initialData.logo || '');
            } else {
                resetForm();
            }
            setCurrentStep(1);
        }
    }, [isOpen, initialData]);

    const resetForm = () => {
        setFormData({
            name: '', description: '', location: '', locationUrl: '', startDate: '', endDate: '',
            registrationDeadline: '', maxParticipants: 100, currentParticipants: 0, entryFee: 0,
            isPaid: false, isActive: true, ageGroups: [], categories: [], rules: '', prizes: '',
            contactInfo: '', logo: '', paymentMethods: ['credit_card', 'bank_transfer'], paymentDeadline: '',
            refundPolicy: '', feeType: 'individual', maxPlayersPerClub: 1, allowInstallments: false,
            installmentsCount: 2, installmentsDetails: '', registrations: [], walletName: '', walletNumber: ''
        });
        setLogoFile(null);
        setLogoPreview('');
    };

    const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setLogoPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return null;
        try {
            setLogoUploading(true);
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `tournaments/logos/${Date.now()}.${fileExt}`;

            const result = await storageManager.upload('tournaments', fileName, logoFile, {
                cacheControl: '3600', upsert: true, contentType: logoFile.type
            });
            return result?.publicUrl || null;
        } catch (error) {
            console.error('Error uploading logo:', error);
            return null;
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            let logoUrl = formData.logo;
            if (logoFile) {
                logoUrl = await uploadLogo();
                if (!logoUrl && logoFile) {
                    toast.error('فشل في رفع الشعار');
                    setIsSubmitting(false);
                    return;
                }
            }

            const tournamentData: Partial<Tournament> = {
                ...formData,
                logo: logoUrl || '',
                createdAt: initialData ? initialData.createdAt : new Date(),
                updatedAt: new Date(),
                currentParticipants: initialData?.currentParticipants || 0,
                isActive: formData.isActive === true,
            };

            if (initialData) {
                await updateDoc(doc(db, 'tournaments', initialData.id!), tournamentData);
                toast.success('تم تحديث البطولة بنجاح');
            } else {
                await addDoc(collection(db, 'tournaments'), tournamentData);
                toast.success('تم إنشاء البطولة بنجاح');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving tournament:', error);
            toast.error('فشل في حفظ البطولة');
        } finally {
            setIsSubmitting(false);
        }
    };

    // List of countries with their currencies and flags
    const COUNTRIES = [
        { code: 'EG', name: 'مصر', currency: 'EGP', flag: '🇪🇬' },
        { code: 'SA', name: 'السعودية', currency: 'SAR', flag: '🇸🇦' },
        { code: 'AE', name: 'الإمارات', currency: 'AED', flag: '🇦🇪' },
        { code: 'KW', name: 'الكويت', currency: 'KWD', flag: '🇰🇼' },
        { code: 'QA', name: 'قطر', currency: 'QAR', flag: '🇶🇦' },
        { code: 'BH', name: 'البحرين', currency: 'BHD', flag: '🇧🇭' },
        { code: 'OM', name: 'عمان', currency: 'OMR', flag: '🇴🇲' },
        { code: 'JO', name: 'الأردن', currency: 'JOD', flag: '🇯🇴' },
        { code: 'LB', name: 'لبنان', currency: 'USD', flag: '🇱🇧' }, // Often USD used de facto
        { code: 'IQ', name: 'العراق', currency: 'IQD', flag: '🇮🇶' },
        { code: 'YE', name: 'اليمن', currency: 'YER', flag: '🇾🇪' },
        { code: 'PS', name: 'فلسطين', currency: 'ILS', flag: '🇵🇸' },
        { code: 'MA', name: 'المغرب', currency: 'MAD', flag: '🇲🇦' },
        { code: 'DZ', name: 'الجزائر', currency: 'DZD', flag: '🇩🇿' },
        { code: 'TN', name: 'تونس', currency: 'TND', flag: '🇹🇳' },
        { code: 'LY', name: 'ليبيا', currency: 'LYD', flag: '🇱🇾' },
        { code: 'SD', name: 'السودان', currency: 'SDG', flag: '🇸🇩' },
        { code: 'TR', name: 'تركيا', currency: 'TRY', flag: '🇹🇷' },
        { code: 'US', name: 'الولايات المتحدة', currency: 'USD', flag: '🇺🇸' },
        { code: 'GB', name: 'المملكة المتحدة', currency: 'GBP', flag: '🇬🇧' },
        { code: 'EU', name: 'أوروبا (يورو)', currency: 'EUR', flag: '🇪🇺' },
        { code: 'CA', name: 'كندا', currency: 'CAD', flag: '🇨🇦' },
        { code: 'AU', name: 'أستراليا', currency: 'AUD', flag: '🇦🇺' },
        // Add more as needed or use a library
    ];

    // --- Helper for Smart Defaults ---
    const handleCountryChange = (countryCode: string) => {
        const country = COUNTRIES.find(c => c.code === countryCode);
        let currency = country?.currency || 'USD';
        let defaultPaymentMethods = ['credit_card'];

        // Custom logic for payment methods based on region
        if (countryCode === 'EG') {
            defaultPaymentMethods = ['credit_card', 'mobile_wallet', 'bank_transfer'];
        } else if (['SA', 'AE', 'KW', 'QA', 'BH'].includes(countryCode)) {
            defaultPaymentMethods = ['credit_card', 'bank_transfer'];
        }

        setFormData(prev => ({
            ...prev,
            currency,
            country: countryCode,
            paymentMethods: prev.paymentMethods?.length ? prev.paymentMethods : defaultPaymentMethods
        }));
    };

    const nextStep = () => {
        // Basic validation before moving next
        if (currentStep === 1 && !formData.name) {
            toast.error('يرجى إدخال اسم البطولة');
            return;
        }
        if (currentStep === 2 && (!formData.startDate || !formData.endDate)) {
            toast.error('يرجى إدخال تواريخ البداية والنهاية');
            return;
        }
        if (currentStep < 4) setCurrentStep(c => c + 1);
        else handleSubmit();
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    // --- Render Steps ---

    const renderStep1_Basic = () => (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Logo Upload - Compact */}
                <div className="md:col-span-2 flex items-center gap-4 p-4 border rounded-xl bg-gray-50/50">
                    <div className="relative group shrink-0">
                        <div className="w-20 h-20 rounded-full bg-white shadow-sm border overflow-hidden">
                            {logoPreview || formData.logo ? (
                                <img src={logoPreview || fixReceiptUrl(formData.logo) || ''} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <ImageIcon className="h-8 w-8" />
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                            <Upload className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <Label htmlFor="logo-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium text-sm block mb-1">
                            {logoPreview ? 'تغيير الشعار' : 'رفع شعار البطولة'}
                        </Label>
                        <p className="text-xs text-gray-400">صورة مربعة، بحد أقصى 2MB</p>
                        <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-700 text-sm">اسم البطولة <span className="text-red-500">*</span></Label>
                    <Input
                        value={formData.name}
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder="مثال: كأس الصيف 2024"
                        className="h-10"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-700 text-sm">الدولة (لتحديد العملة)</Label>
                    <Select onValueChange={handleCountryChange} defaultValue={formData.country}>
                        <SelectTrigger className="h-10 text-right">
                            <SelectValue placeholder="اختر الدولة" />
                        </SelectTrigger>
                        <SelectContent className="text-right max-h-[200px]">
                            {COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                    {c.flag} {c.name} ({c.currency})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-700 text-sm">المكان <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                value={formData.location}
                                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                                placeholder="حي الملز، الرياض"
                                className="pr-9 h-10"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-700 text-sm">وصف البطولة</Label>
                    <Textarea
                        value={formData.description}
                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        placeholder="نبذة مختصرة عن البطولة..."
                        rows={2}
                        className="resize-none min-h-[80px]"
                    />
                </div>
            </div>
        </div>
    );

    const renderStep2_Dates = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 mb-6">
                <h3 className="text-yellow-800 font-semibold flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" /> تنبيه
                </h3>
                <p className="text-sm text-yellow-600">
                    تأكد من تحديد تواريخ دقيقة. لن يتمكن المشاركون من التسجيل بعد انتهاء موعد التسجيل.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 p-4 border rounded-xl bg-gray-50/30">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2"><Flag className="h-4 w-4 text-green-600" /> فترة إقامة البطولة</h4>
                    <div className="space-y-3">
                        <Label>البداية <span className="text-red-500">*</span></Label>
                        <Input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} className="h-11" />
                    </div>
                    <div className="space-y-3">
                        <Label>النهاية <span className="text-red-500">*</span></Label>
                        <Input type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} className="h-11" />
                    </div>
                </div>

                <div className="space-y-4 p-4 border rounded-xl bg-gray-50/30">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600" /> التسجيل والمشاركين</h4>
                    <div className="space-y-3">
                        <Label>آخر موعد للتسجيل <span className="text-red-500">*</span></Label>
                        <Input type="date" value={formData.registrationDeadline} onChange={e => setFormData(p => ({ ...p, registrationDeadline: e.target.value }))} className="h-11" />
                    </div>
                    <div className="space-y-3">
                        <Label>الحد الأقصى للمشاركين (فرق/لاعبين)</Label>
                        <Input type="number" value={formData.maxParticipants} onChange={e => setFormData(p => ({ ...p, maxParticipants: parseInt(e.target.value) }))} className="h-11" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep3_Financials = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between p-6 bg-white border rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${formData.isPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">حالة الدفع</h3>
                        <p className="text-sm text-gray-500">{formData.isPaid ? 'هذه البطولة تتطلب رسوم اشتراك' : 'هذه البطولة مجانية للمشاركة'}</p>
                    </div>
                </div>
                <Switch checked={formData.isPaid} onCheckedChange={checked => setFormData(p => ({ ...p, isPaid: checked }))} />
            </div>

            {formData.isPaid && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-3">
                        <Label>قيمة الاشتراك</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={isNaN(Number(formData.entryFee)) ? '' : formData.entryFee}
                                onChange={e => setFormData(p => ({ ...p, entryFee: parseFloat(e.target.value) }))}
                                className="h-11 text-lg font-bold"
                            />
                            <Select value={formData.currency} onValueChange={v => setFormData(p => ({ ...p, currency: v }))}>
                                <SelectTrigger className="w-24 h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EGP">EGP</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="SAR">SAR</SelectItem>
                                    <SelectItem value="AED">AED</SelectItem>
                                    <SelectItem value="KWD">KWD</SelectItem>
                                    <SelectItem value="QAR">QAR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>نوع الرسوم</Label>
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, feeType: 'individual' }))}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.feeType === 'individual' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                            >
                                لكل لاعب
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, feeType: 'club' }))}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.feeType === 'club' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                            >
                            </button>
                        </div>
                    </div>



                    <div className="md:col-span-2 space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <Label className="font-semibold text-gray-900">بيانات التحويل (المحفظة/الحساب)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm text-gray-600">
                                    {formData.country === 'EG' ? 'اسم المحفظة (فودافون كاش/انستاباي)' :
                                        formData.country === 'SA' ? 'اسم المحفظة (STC Pay/Alinma)' :
                                            'اسم البنك / المحفظة'}
                                </Label>
                                <Input
                                    value={formData.walletName}
                                    onChange={e => setFormData(p => ({ ...p, walletName: e.target.value }))}
                                    placeholder={formData.country === 'EG' ? 'مثال: فودافون كاش' : 'اسم المحفظة أو البنك'}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm text-gray-600">
                                    {formData.country === 'EG' ? 'رقم المحفظة / عنوان الدفع' :
                                        'رقم الحساب / المحفظة'}
                                </Label>
                                <Input
                                    value={formData.walletNumber}
                                    onChange={e => setFormData(p => ({ ...p, walletNumber: e.target.value }))}
                                    placeholder="01xxxxxxxxx"
                                    className="bg-white"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                        <Label>طرق الدفع المتاحة للمشتركين</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {paymentMethodsList.map(method => (
                                <div
                                    key={method.id}
                                    onClick={() => {
                                        const current = formData.paymentMethods || [];
                                        const next = current.includes(method.id) ? current.filter(X => X !== method.id) : [...current, method.id];
                                        setFormData(p => ({ ...p, paymentMethods: next }));
                                    }}
                                    className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all ${formData.paymentMethods?.includes(method.id) ? 'bg-green-50 border-green-500 text-green-700' : 'hover:bg-gray-50'}`}
                                >
                                    <span className="text-2xl">{method.icon}</span>
                                    <span className="text-sm font-medium">{method.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep4_Details = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <Label className="font-semibold text-blue-900 flex items-center gap-2">
                        <Users className="w-4 h-4" /> نظام الفرق واللاعبين
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">عدد اللاعبين المطلوب للفريق <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.maxPlayersPerClub || 1}
                                onChange={e => setFormData(p => ({ ...p, maxPlayersPerClub: parseInt(e.target.value) }))}
                                className="bg-white"
                                placeholder="مثال: 11"
                            />
                            <p className="text-xs text-gray-500">سيتم منع التسجيل إذا كان عدد اللاعبين المختارين أقل من هذا الرقم</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">الحد الأقصى للبدلاء (اختياري)</Label>
                            <Input type="number" min="0" placeholder="مثال: 5" className="bg-white" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>الفئات العمرية المسموحة</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {ageGroupsList.map(age => (
                            <div
                                key={age}
                                onClick={() => {
                                    const current = formData.ageGroups || [];
                                    const next = current.includes(age) ? current.filter(x => x !== age) : [...current, age];
                                    setFormData(p => ({ ...p, ageGroups: next }));
                                }}
                                className={`text-xs p-2 rounded border cursor-pointer text-center select-none ${formData.ageGroups?.includes(age) ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50'}`}
                            >
                                {age}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>فئة المشاركين</Label>
                    <div className="flex gap-2">
                        {categoriesList.map(cat => (
                            <div
                                key={cat}
                                onClick={() => {
                                    const current = formData.categories || [];
                                    const next = current.includes(cat) ? current.filter(x => x !== cat) : [...current, cat];
                                    setFormData(p => ({ ...p, categories: next }));
                                }}
                                className={`flex-1 text-sm p-3 rounded border cursor-pointer text-center select-none ${formData.categories?.includes(cat) ? 'bg-purple-50 border-purple-500 text-purple-700' : 'hover:bg-gray-50'}`}
                            >
                                {cat}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                    <Label>الجوائز</Label>
                    <Input value={formData.prizes} onChange={e => setFormData(p => ({ ...p, prizes: e.target.value }))} placeholder="مثال: المركز الأول 10000 جنيه + كأس" className="h-11" />
                </div>

                <div className="md:col-span-2 space-y-3">
                    <Label>القواعد والشروط</Label>
                    <Textarea value={formData.rules} onChange={e => setFormData(p => ({ ...p, rules: e.target.value }))} placeholder="اكتب الشروط الخاصة بالبطولة هنا..." rows={4} className="resize-none" />
                </div>
            </div>
        </div>
    );

    const CurrentStepIcon = STEPS[currentStep - 1].icon;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl flex flex-col p-0 gap-0 overflow-hidden bg-gray-50 h-[85vh] sm:h-auto sm:max-h-[85vh]">
                {/* 1. Header with Compact Progress */}
                <div className="bg-white border-b px-4 py-3">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-50 p-2 rounded-lg"><Trophy className="h-5 w-5 text-blue-600" /></div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900">
                                    {initialData ? 'تعديل البطولة' : 'إنشاء بطولة'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500">
                                    {initialData ? 'تعديل تفاصيل وإعدادات البطولة الحالية' : 'أدخل تفاصيل البطولة الجديدة لإنشائها'}
                                </DialogDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                    </div>

                    {/* Compact Stepper */}
                    <div className="flex items-center justify-center gap-2">
                        {STEPS.map((step) => {
                            const isCompleted = step.id < currentStep;
                            const isCurrent = step.id === currentStep;
                            return (
                                <div key={step.id} className="flex items-center">
                                    <div className={`w-2.5 h-2.5 rounded-full transition-all ${isCompleted ? 'bg-blue-600' : isCurrent ? 'bg-blue-600 scale-125 ring-2 ring-blue-100' : 'bg-gray-200'}`} />
                                    {step.id < STEPS.length && <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-center mt-1">
                        <span className="text-xs font-medium text-blue-600">{STEPS[currentStep - 1].title}</span>
                    </div>
                </div>

                {/* 2. Content Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-white">
                    {currentStep === 1 && renderStep1_Basic()}
                    {currentStep === 2 && renderStep2_Dates()}
                    {currentStep === 3 && renderStep3_Financials()}
                    {currentStep === 4 && renderStep4_Details()}
                </div>

                {/* 3. Footer Actions */}
                <div className="bg-gray-50 border-t px-4 py-3 flex items-center justify-between">
                    <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="text-gray-500 hover:text-gray-900">
                        العودة
                    </Button>

                    <div className="flex gap-2 text-sm text-gray-400 items-center">
                        <span>{currentStep} / {STEPS.length}</span>
                    </div>

                    {currentStep === STEPS.length ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 w-32 shadow-sm shadow-blue-200"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                'حفظ وإنهاء'
                            )}
                        </Button>
                    ) : (
                        <Button onClick={nextStep} className="bg-gray-900 hover:bg-black text-white w-32">
                            التالي
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
