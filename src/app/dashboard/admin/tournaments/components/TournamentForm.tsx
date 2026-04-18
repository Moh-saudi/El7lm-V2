'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Row, Col, ConfigProvider, Divider, Typography, Upload, Button, Tag } from 'antd';
import { TrophyOutlined, CalendarOutlined, DollarOutlined, FileTextOutlined, EnvironmentOutlined, LinkOutlined, PhoneOutlined, UploadOutlined, CheckCircleOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/config';
import { Tournament } from '../utils';
import { storageManager } from '@/lib/storage';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

const { TextArea } = Input;
const { Text } = Typography;

interface TournamentFormProps {
    initialData: Tournament | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ANTD_THEME = { token: { colorPrimary: '#d97706', borderRadius: 8, fontFamily: 'inherit' } };
const STEPS = [
    { title: 'البيانات الأساسية', subtitle: 'الاسم والمكان والشعار', icon: <TrophyOutlined /> },
    { title: 'التواريخ', subtitle: 'بداية ونهاية البطولة والتسجيل', icon: <CalendarOutlined /> },
    { title: 'المالية', subtitle: 'الرسوم وطرق الدفع', icon: <DollarOutlined /> },
    { title: 'التفاصيل', subtitle: 'الفئات والشروط والتواصل', icon: <FileTextOutlined /> },
];

const COUNTRIES = [
    { code: 'EG', name: 'مصر', currency: 'EGP', flag: '🇪🇬' },
    { code: 'SA', name: 'السعودية', currency: 'SAR', flag: '🇸🇦' },
    { code: 'AE', name: 'الإمارات', currency: 'AED', flag: '🇦🇪' },
    { code: 'KW', name: 'الكويت', currency: 'KWD', flag: '🇰🇼' },
    { code: 'QA', name: 'قطر', currency: 'QAR', flag: '🇶🇦' },
    { code: 'BH', name: 'البحرين', currency: 'BHD', flag: '🇧🇭' },
    { code: 'OM', name: 'عمان', currency: 'OMR', flag: '🇴🇲' },
    { code: 'JO', name: 'الأردن', currency: 'JOD', flag: '🇯🇴' },
    { code: 'LB', name: 'لبنان', currency: 'USD', flag: '🇱🇧' },
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
    { code: 'EU', name: 'أوروبا', currency: 'EUR', flag: '🇪🇺' },
    { code: 'CA', name: 'كندا', currency: 'CAD', flag: '🇨🇦' },
    { code: 'AU', name: 'أستراليا', currency: 'AUD', flag: '🇦🇺' },
];

const CURRENCIES = ['EGP', 'USD', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'JOD', 'GBP', 'EUR'];
const PAYMENT_METHODS = [
    { id: 'credit_card', label: 'بطاقة ائتمان', icon: '💳' },
    { id: 'bank_transfer', label: 'تحويل بنكي', icon: '🏦' },
    { id: 'mobile_wallet', label: 'محفظة إلكترونية', icon: '📱' },
    { id: 'cash', label: 'نقدًا', icon: '💵' },
];
const AGE_GROUPS = ['تحت 8 سنوات', 'تحت 10 سنوات', 'تحت 12 سنة', 'تحت 14 سنة', 'تحت 16 سنة', 'تحت 18 سنة', 'تحت 20 سنة', 'كبار (20+ سنة)'];
const CATEGORIES = ['أولاد', 'بنات', 'مختلط'];

const EMPTY: Partial<Tournament> = {
    name: '', description: '', location: '', locationUrl: '', startDate: '', endDate: '', registrationDeadline: '',
    maxParticipants: 16, currentParticipants: 0, entryFee: 0, currency: 'EGP', isPaid: false, isActive: true,
    ageGroups: [], categories: [], rules: '', prizes: '', contactInfo: '', logo: '', paymentMethods: ['credit_card', 'bank_transfer'],
    paymentDeadline: '', feeType: 'individual', maxPlayersPerClub: 11, allowInstallments: false, installmentsCount: 2,
    installmentsDetails: '', registrations: [], walletName: '', walletNumber: '', country: 'EG',
};

export const TournamentForm: React.FC<TournamentFormProps> = ({ initialData, isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<Partial<Tournament>>(EMPTY);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [saving, setSaving] = useState(false);

    const upd = (patch: Partial<Tournament>) => setData((prev) => ({ ...prev, ...patch }));

    useEffect(() => {
        if (!isOpen) return;
        setStep(0);
        if (initialData) {
            setData({
                ...initialData,
                startDate: initialData.startDate?.split('T')[0] || '',
                endDate: initialData.endDate?.split('T')[0] || '',
                registrationDeadline: initialData.registrationDeadline?.split('T')[0] || '',
                paymentDeadline: initialData.paymentDeadline?.split('T')[0] || '',
                isActive: initialData.isActive === true,
                paymentMethods: initialData.paymentMethods?.length ? initialData.paymentMethods : ['credit_card', 'bank_transfer'],
                ageGroups: initialData.ageGroups || [],
                categories: initialData.categories || [],
                registrations: initialData.registrations || [],
                walletName: initialData.walletName || '',
                walletNumber: initialData.walletNumber || '',
                country: initialData.country || 'EG',
            });
            setLogoPreview(initialData.logo || '');
        } else {
            setData(EMPTY);
            setLogoFile(null);
            setLogoPreview('');
        }
    }, [isOpen, initialData]);

    const handleCountryChange = (code: string) => {
        const country = COUNTRIES.find((item) => item.code === code);
        upd({ country: code, currency: country?.currency || 'USD' });
    };

    const toggleItem = (arr: string[], value: string) => arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];

    const validate = () => {
        if (step === 0) {
            if (!data.name?.trim()) return toast.error('يرجى إدخال اسم البطولة'), false;
            if (!data.location?.trim()) return toast.error('يرجى إدخال موقع البطولة'), false;
        }
        if (step === 1) {
            if (!data.startDate) return toast.error('يرجى تحديد تاريخ البداية'), false;
            if (!data.endDate) return toast.error('يرجى تحديد تاريخ النهاية'), false;
            if (!data.registrationDeadline) return toast.error('يرجى تحديد آخر موعد للتسجيل'), false;
            if (new Date(data.endDate) < new Date(data.startDate)) return toast.error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية'), false;
        }
        if (step === 2 && data.isPaid) {
            if (!data.entryFee || data.entryFee <= 0) return toast.error('يرجى إدخال قيمة رسوم الاشتراك'), false;
            if (!data.paymentMethods?.length) return toast.error('يرجى اختيار طريقة دفع واحدة على الأقل'), false;
        }
        return true;
    };

    const handleNext = () => {
        if (validate()) setStep((current) => current + 1);
    };

    const handleBack = () => {
        setStep((current) => current - 1);
    };

    const handleLogoChange = (file: File) => {
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (event) => setLogoPreview(event.target?.result as string);
        reader.readAsDataURL(file);
        return false;
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return null;
        try {
            const ext = logoFile.name.split('.').pop();
            const result = await storageManager.upload('tournaments', `tournaments/logos/${Date.now()}.${ext}`, logoFile, {
                cacheControl: '3600', upsert: true, contentType: logoFile.type,
            });
            return result?.publicUrl || null;
        } catch {
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            let logoUrl = data.logo;
            if (logoFile) {
                const uploaded = await uploadLogo();
                if (!uploaded) return toast.error('فشل في رفع الشعار');
                logoUrl = uploaded;
            }
            const now = new Date().toISOString();
            const payload: any = { ...data, logo: logoUrl || '', updatedAt: now, currentParticipants: initialData?.currentParticipants || 0 };
            if (!initialData) payload.createdAt = now;
            Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
            if (initialData) {
                const { error } = await supabase.from('tournaments').update(payload).eq('id', initialData.id!);
                if (error) throw error;
                toast.success('تم تحديث البطولة بنجاح');
            } else {
                const { error } = await supabase.from('tournaments').insert({ id: crypto.randomUUID(), ...payload });
                if (error) throw error;
                toast.success('تم إنشاء البطولة بنجاح');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('فشل في حفظ البطولة');
        } finally {
            setSaving(false);
        }
    };

    const step0_Basic = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
            <Form.Item label="شعار البطولة" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {logoPreview || data.logo ? (
                            <img src={logoPreview || fixReceiptUrl(data.logo) || data.logo || ''} alt="شعار البطولة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <TrophyOutlined style={{ fontSize: 24, color: '#d1d5db' }} />
                        )}
                    </div>
                    <Upload accept="image/*" showUploadList={false} beforeUpload={handleLogoChange} maxCount={1}>
                        <Button icon={<UploadOutlined />}>{logoPreview || data.logo ? 'تغيير الشعار' : 'رفع الشعار'}</Button>
                    </Upload>
                    {(logoPreview || data.logo) && (
                        <Button danger onClick={() => { setLogoFile(null); setLogoPreview(''); upd({ logo: '' }); }}>
                            حذف
                        </Button>
                    )}
                </div>
            </Form.Item>

            <Form.Item label="اسم البطولة" required style={{ marginBottom: 0 }}>
                <Input prefix={<TrophyOutlined style={{ color: '#9ca3af' }} />} value={data.name || ''} onChange={(e) => upd({ name: e.target.value })} placeholder="مثال: كأس رمضان للشباب 2025" />
            </Form.Item>

            <Row gutter={12}>
                <Col span={10}>
                    <Form.Item label="الدولة" style={{ marginBottom: 0 }}>
                        <Select value={data.country || 'EG'} onChange={handleCountryChange} showSearch optionFilterProp="children">
                            {COUNTRIES.map((country) => (
                                <Select.Option key={country.code} value={country.code}>{country.flag} {country.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={14}>
                    <Form.Item label="الموقع" required style={{ marginBottom: 0 }}>
                        <Input prefix={<EnvironmentOutlined style={{ color: '#9ca3af' }} />} value={data.location || ''} onChange={(e) => upd({ location: e.target.value })} placeholder="الملعب / المنشأة، المدينة" />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item label="رابط الخريطة" style={{ marginBottom: 0 }}>
                <Input prefix={<LinkOutlined style={{ color: '#9ca3af' }} />} value={data.locationUrl || ''} onChange={(e) => upd({ locationUrl: e.target.value })} placeholder="https://maps.google.com/..." dir="ltr" />
            </Form.Item>

            <Form.Item label="وصف البطولة" style={{ marginBottom: 0 }}>
                <TextArea value={data.description || ''} onChange={(e) => upd({ description: e.target.value })} placeholder="نبذة مختصرة عن البطولة وأهدافها..." autoSize={{ minRows: 3, maxRows: 5 }} />
            </Form.Item>
        </div>
    );

    const step1_Dates = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>تأكد من صحة التواريخ لأن التسجيل سيتوقف تلقائيًا بعد انتهاء الموعد المحدد.</Text>
            <Divider style={{ margin: '2px 0 4px' }}>فترة البطولة</Divider>
            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item label="تاريخ البداية" required style={{ marginBottom: 0 }}>
                        <Input type="date" value={data.startDate || ''} onChange={(e) => upd({ startDate: e.target.value })} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="تاريخ النهاية" required style={{ marginBottom: 0 }}>
                        <Input type="date" value={data.endDate || ''} onChange={(e) => upd({ endDate: e.target.value })} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider style={{ margin: '2px 0 4px' }}>التسجيل والمشاركة</Divider>
            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item label="آخر موعد للتسجيل" required style={{ marginBottom: 0 }}>
                        <Input type="date" value={data.registrationDeadline || ''} onChange={(e) => upd({ registrationDeadline: e.target.value })} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="الحد الأقصى للمشاركين" style={{ marginBottom: 0 }}>
                        <InputNumber min={1} max={512} value={data.maxParticipants || 16} onChange={(value) => upd({ maxParticipants: value || 16 })} style={{ width: '100%' }} addonAfter={<TeamOutlined />} />
                    </Form.Item>
                </Col>
            </Row>
        </div>
    );

    const step2_Financials = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: data.isPaid ? '#f0fdf4' : '#f9fafb', border: `1px solid ${data.isPaid ? '#86efac' : '#e5e7eb'}` }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{data.isPaid ? 'بطولة مدفوعة' : 'بطولة مجانية'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{data.isPaid ? 'سيتم تحصيل رسوم من المشاركين' : 'المشاركة متاحة بدون رسوم'}</div>
                </div>
                <Switch checked={data.isPaid || false} onChange={(checked) => upd({ isPaid: checked })} />
            </div>

            {data.isPaid && (
                <>
                    <Divider style={{ margin: '2px 0 4px' }}>تفاصيل الرسوم</Divider>
                    <Row gutter={12}>
                        <Col span={10}>
                            <Form.Item label="قيمة الاشتراك" required style={{ marginBottom: 0 }}>
                                <InputNumber min={0} value={data.entryFee || 0} onChange={(value) => upd({ entryFee: value || 0 })} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="العملة" style={{ marginBottom: 0 }}>
                                <Select value={data.currency || 'EGP'} onChange={(value) => upd({ currency: value })}>
                                    {CURRENCIES.map((currency) => <Select.Option key={currency} value={currency}>{currency}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="نوع الرسوم" style={{ marginBottom: 0 }}>
                                <Select value={data.feeType || 'individual'} onChange={(value) => upd({ feeType: value as 'individual' | 'club' })}>
                                    <Select.Option value="individual">لكل لاعب</Select.Option>
                                    <Select.Option value="club">لكل فريق</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '2px 0 4px' }}><BankOutlined /> بيانات الاستلام</Divider>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item label="اسم المحفظة أو البنك" style={{ marginBottom: 0 }}>
                                <Input value={data.walletName || ''} onChange={(e) => upd({ walletName: e.target.value })} placeholder="مثال: فودافون كاش" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="رقم الحساب أو المحفظة" style={{ marginBottom: 0 }}>
                                <Input value={data.walletNumber || ''} onChange={(e) => upd({ walletNumber: e.target.value })} placeholder="01xxxxxxxxx" dir="ltr" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '2px 0 4px' }}>طرق الدفع المتاحة</Divider>
                    <Row gutter={[8, 8]}>
                        {PAYMENT_METHODS.map((method) => {
                            const selected = data.paymentMethods?.includes(method.id);
                            return (
                                <Col span={6} key={method.id}>
                                    <div onClick={() => upd({ paymentMethods: toggleItem(data.paymentMethods || [], method.id) })} style={{ border: `1px solid ${selected ? '#d97706' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: selected ? '#fff7ed' : '#fff', userSelect: 'none' }}>
                                        <div style={{ fontSize: 20, marginBottom: 4 }}>{method.icon}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: selected ? '#92400e' : '#6b7280' }}>{method.label}</div>
                                    </div>
                                </Col>
                            );
                        })}
                    </Row>
                </>
            )}
        </div>
    );

    const step3_Details = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item label="عدد لاعبي الفريق" required style={{ marginBottom: 0 }}>
                        <InputNumber min={1} max={50} value={data.maxPlayersPerClub || 11} onChange={(value) => upd({ maxPlayersPerClub: value || 1 })} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="معلومات التواصل" style={{ marginBottom: 0 }}>
                        <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} value={data.contactInfo || ''} onChange={(e) => upd({ contactInfo: e.target.value })} placeholder="رقم الهاتف أو البريد الإلكتروني" />
                    </Form.Item>
                </Col>
            </Row>

            <Divider style={{ margin: '2px 0 4px' }}>الفئات العمرية</Divider>
            <Row gutter={[8, 8]}>
                {AGE_GROUPS.map((age) => {
                    const selected = data.ageGroups?.includes(age);
                    return (
                        <Col span={6} key={age}>
                            <div onClick={() => upd({ ageGroups: toggleItem(data.ageGroups || [], age) })} style={{ border: `1px solid ${selected ? '#6366f1' : '#e5e7eb'}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: 'pointer', background: selected ? '#eef2ff' : '#fff', fontSize: 11, fontWeight: 700, color: selected ? '#3730a3' : '#6b7280', userSelect: 'none' }}>
                                {age}
                            </div>
                        </Col>
                    );
                })}
            </Row>

            <Divider style={{ margin: '2px 0 4px' }}>فئة المشاركين</Divider>
            <Row gutter={8}>
                {CATEGORIES.map((category) => {
                    const selected = data.categories?.includes(category);
                    return (
                        <Col span={8} key={category}>
                            <div onClick={() => upd({ categories: toggleItem(data.categories || [], category) })} style={{ border: `1px solid ${selected ? '#a855f7' : '#e5e7eb'}`, borderRadius: 10, padding: '9px 6px', textAlign: 'center', cursor: 'pointer', background: selected ? '#faf5ff' : '#fff', fontSize: 12, fontWeight: 700, color: selected ? '#6b21a8' : '#6b7280', userSelect: 'none' }}>
                                {category}
                            </div>
                        </Col>
                    );
                })}
            </Row>

            <Form.Item label="الجوائز" style={{ marginBottom: 0 }}>
                <Input value={data.prizes || ''} onChange={(e) => upd({ prizes: e.target.value })} placeholder="مثال: المركز الأول - 10,000 ج.م + كأس" />
            </Form.Item>

            <Form.Item label="القواعد والشروط" style={{ marginBottom: 0 }}>
                <TextArea value={data.rules || ''} onChange={(e) => upd({ rules: e.target.value })} placeholder="اكتب الشروط والقواعد الخاصة بالبطولة..." autoSize={{ minRows: 4, maxRows: 7 }} />
            </Form.Item>
        </div>
    );

    const stepContent = [step0_Basic, step1_Dates, step2_Financials, step3_Details];
    const currentStepInfo = STEPS[step];
    const completionPercent = Math.round(((step + 1) / STEPS.length) * 100);

    return (
        <ConfigProvider locale={arEG} theme={ANTD_THEME} direction="rtl">
            <Modal
                open={isOpen}
                onCancel={onClose}
                title={null}
                width={560}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 9, background: '#fff7ed', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                {currentStepInfo.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{currentStepInfo.title}</div>
                                <Text type="secondary" style={{ fontSize: 10 }}>اكتمال {completionPercent}%</Text>
                            </div>
                        </div>
                        <Button size="small" onClick={step === 0 ? onClose : handleBack} disabled={saving}>{step === 0 ? 'إلغاء' : 'السابق'}</Button>
                        {step < STEPS.length - 1 ? (
                            <Button size="small" type="primary" onClick={handleNext}>التالي</Button>
                        ) : (
                            <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={handleSubmit}>حفظ</Button>
                        )}
                    </div>
                }
                styles={{ body: { maxHeight: '78vh', overflowY: 'auto', padding: 0, background: '#f8fafc' } }}
                destroyOnClose={false}
            >
                <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 52%, #eff6ff 100%)', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                                <TrophyOutlined />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>{initialData ? 'تعديل البطولة' : 'بطولة جديدة'}</h2>
                                    <Tag color={data.isPaid ? 'gold' : 'green'} style={{ marginInlineEnd: 0, fontSize: 10, paddingInline: 6 }}>{data.isPaid ? 'مدفوعة' : 'مجانية'}</Tag>
                                </div>
                                <p style={{ margin: '2px 0 0', color: '#4b5563', fontSize: 10 }}>إعداد سريع ومنظم.</p>
                            </div>
                        </div>
                        <div style={{ padding: '4px 8px', borderRadius: 999, background: '#ffffffcc', border: '1px solid #e5e7eb', fontSize: 10, fontWeight: 700, color: '#374151' }}>{step + 1} / {STEPS.length}</div>
                    </div>
                </div>

                <div style={{ padding: 10 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {STEPS.map((item, index) => {
                            const isCurrent = index === step;
                            const isDone = index < step;
                            return (
                                <button
                                    key={item.title}
                                    type="button"
                                    onClick={() => { if (index <= step || validate()) setStep(index); }}
                                    style={{ border: `1px solid ${isCurrent ? '#f59e0b' : isDone ? '#bbf7d0' : '#e5e7eb'}`, background: isCurrent ? '#fff7ed' : isDone ? '#f0fdf4' : '#fff', color: '#111827', borderRadius: 999, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
                                >
                                    <span style={{ width: 16, height: 16, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isCurrent ? '#f59e0b' : isDone ? '#22c55e' : '#f3f4f6', color: isCurrent || isDone ? '#fff' : '#6b7280', fontSize: 9, flexShrink: 0 }}>
                                        {isDone ? <CheckCircleOutlined /> : index + 1}
                                    </span>
                                    <span>{item.title}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 10px 22px rgba(15, 23, 42, 0.04)', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ width: 24, height: 24, borderRadius: 8, background: '#fff7ed', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                                    {currentStepInfo.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{currentStepInfo.title}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{currentStepInfo.subtitle}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: 12 }}>
                            <Form layout="vertical" size="small" style={{ direction: 'rtl' }}>
                                {stepContent[step]}
                            </Form>
                        </div>
                    </div>
                </div>
            </Modal>
        </ConfigProvider>
    );
};
