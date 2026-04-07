'use client';

import React, { useState, useEffect } from 'react';
import {
    ConfigProvider, App, Layout, Menu, Card, Statistic, Table, Modal, Form,
    Input, Select, Button, Space, Tag, Spin, Row, Col, Divider, Switch,
    Popconfirm, Typography, Alert, InputNumber, Radio, Tooltip, Badge, DatePicker
} from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import {
    DollarOutlined, GlobalOutlined, GiftOutlined, TeamOutlined, CreditCardOutlined,
    BookOutlined, AppstoreOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    EyeOutlined, ReloadOutlined, SettingOutlined, CopyOutlined, CheckOutlined,
    StarOutlined, CalendarOutlined, ApartmentOutlined, PercentageOutlined,
    CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
    TagOutlined, InfoCircleOutlined, SyncOutlined, UsergroupAddOutlined
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/config';
import { PricingService } from '@/lib/pricing/pricing-service';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useAbility } from '@/hooks/useAbility';
import AccessDenied from '@/components/admin/AccessDenied';
import EditPlanModal from '@/components/admin/pricing/EditPlanModal';
import AccountTypePricingTab from '@/components/admin/pricing/AccountTypePricingTab';
import GuidelinesTab from '@/components/admin/pricing/GuidelinesTab';
import PaymentSettingsTab from '@/components/admin/pricing/PaymentSettingsTab';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

// ==================== TYPES ====================

interface SubscriptionPlan {
    id: string;
    title?: string;
    subtitle?: string;
    period?: string;
    base_currency?: string;
    base_original_price?: number;
    base_price?: number;
    features: any[];
    bonusFeatures?: any[];
    isActive: boolean;
    popular?: boolean;
    icon?: string;
    overrides?: Record<string, any>;
    accountTypeOverrides?: Record<string, any>;
    order?: number;
    name?: string;
    basePrice?: number;
}

interface PromotionalOffer {
    id: string;
    name: string;
    description?: string;
    code?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    applicablePlans?: string[];
    usageLimitType?: string;
    totalUsageLimit?: number;
    currentUses?: number;
}

interface Partner {
    id: string;
    partnerName?: string;
    name?: string;
    partnerCode?: string;
    partnerType?: string;
    status?: string;
    customPricing?: Record<string, number>;
    activeSubscriptions?: number;
}

const MENU_ITEMS: MenuProps['items'] = [
    { key: 'plans', icon: <AppstoreOutlined />, label: 'الباقات' },
    { key: 'custom', icon: <GlobalOutlined />, label: 'التسعير الدولي' },
    { key: 'offers', icon: <GiftOutlined />, label: 'العروض الترويجية' },
    { key: 'partners', icon: <ApartmentOutlined />, label: 'الشركاء' },
    { key: 'payments', icon: <CreditCardOutlined />, label: 'إعدادات الدفع' },
    { key: 'accountTypes', icon: <TeamOutlined />, label: 'أسعار الحسابات' },
    { key: 'guidelines', icon: <BookOutlined />, label: 'الإرشادات' },
];

const ANTD_THEME = {
    token: {
        colorPrimary: '#2563eb',
        borderRadius: 8,
        fontFamily: 'inherit',
        colorBgContainer: '#ffffff',
    },
    components: {
        Menu: { itemBorderRadius: 6 },
        Card: { borderRadiusLG: 12 },
        Table: { borderRadiusLG: 12 },
    },
};

// ==================== MAIN PAGE ====================

export default function PricingManagementPage() {
    const { can } = useAbility();
    const [activeTab, setActiveTab] = useState('plans');
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [offers, setOffers] = useState<PromotionalOffer[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInitModal, setShowInitModal] = useState(false);
    const [initLoading, setInitLoading] = useState(false);

    useEffect(() => {
        if (can('read', 'pricing')) loadData();
    }, []);

    if (!can('read', 'pricing')) return <AccessDenied resource="إدارة الأسعار" />;

    async function loadData() {
        setLoading(true);
        try {
            const plansData = await PricingService.getAllPlans();
            setPlans(plansData.map(p => ({ ...p, name: p.title, basePrice: p.base_price })));
            const { data: offersData } = await supabase.from('promotional_offers').select('*').order('createdAt', { ascending: false });
            setOffers(offersData || []);
            const { data: partnersData } = await supabase.from('partners').select('*').order('createdAt', { ascending: false });
            setPartners(partnersData || []);
        } catch {
            toast.error('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    }

    async function handleInitSystem() {
        setInitLoading(true);
        try {
            await PricingService.initializeDefaults();
            toast.success('تم تهيئة الباقات الافتراضية');
            setShowInitModal(false);
            loadData();
        } catch {
            toast.error('فشل تهيئة النظام');
        } finally {
            setInitLoading(false);
        }
    }

    const activePlanCount = plans.filter(p => p.isActive).length;
    const activeOfferCount = offers.filter(o => o.isActive).length;
    const activePartnerCount = partners.filter(p => p.status === 'active').length;

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <App>
                <div className="min-h-screen bg-gray-50" dir="rtl">
                    {/* ── Header ── */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <Space size={12}>
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                    <DollarOutlined className="text-white text-lg" />
                                </div>
                                <div>
                                    <Title level={5} className="!mb-0 !text-gray-900">إدارة الأسعار والباقات</Title>
                                    <Text type="secondary" className="text-xs">التحكم في الباقات والعروض ووسائل الدفع</Text>
                                </div>
                            </Space>
                            <Space>
                                <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} loading={loading}>
                                    تحديث
                                </Button>
                                {can('create', 'pricing') && (
                                    <Button icon={<SettingOutlined />} onClick={() => setShowInitModal(true)}>
                                        تهيئة الباقات
                                    </Button>
                                )}
                            </Space>
                        </div>
                    </div>

                    {/* ── Stats Bar ── */}
                    <div className="bg-white border-b border-gray-200 px-6 py-3">
                        <div className="max-w-7xl mx-auto">
                            <Space size={32} split={<Divider type="vertical" className="h-8" />}>
                                <Statistic title="الباقات النشطة" value={activePlanCount}
                                    valueStyle={{ color: '#2563eb', fontSize: 22 }}
                                    prefix={<AppstoreOutlined />} />
                                <Statistic title="العروض النشطة" value={activeOfferCount}
                                    valueStyle={{ color: '#059669', fontSize: 22 }}
                                    prefix={<GiftOutlined />} />
                                <Statistic title="الشركاء الفعالون" value={activePartnerCount}
                                    valueStyle={{ color: '#7c3aed', fontSize: 22 }}
                                    prefix={<ApartmentOutlined />} />
                                <Statistic title="إجمالي الباقات" value={plans.length}
                                    valueStyle={{ color: '#6b7280', fontSize: 22 }}
                                    prefix={<TagOutlined />} />
                            </Space>
                        </div>
                    </div>

                    {/* ── Main Layout ── */}
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        <Layout className="!bg-transparent" style={{ gap: 24 }}>
                            <Sider
                                width={210}
                                className="!bg-white rounded-xl border border-gray-200 overflow-hidden"
                                style={{ height: 'fit-content', position: 'sticky', top: 96 }}
                            >
                                <Menu
                                    mode="inline"
                                    selectedKeys={[activeTab]}
                                    items={MENU_ITEMS}
                                    onClick={({ key }) => setActiveTab(key)}
                                    className="!border-none py-2"
                                    style={{ borderRadius: 12 }}
                                />
                            </Sider>

                            <Content>
                                {loading ? (
                                    <Card className="text-center py-16">
                                        <Spin size="large" />
                                    </Card>
                                ) : (
                                    <>
                                        {activeTab === 'plans' && <PlansTab plans={plans} onUpdate={loadData} />}
                                        {activeTab === 'custom' && <CustomPricingTab />}
                                        {activeTab === 'offers' && <OffersTab offers={offers} plans={plans} onUpdate={loadData} />}
                                        {activeTab === 'partners' && <PartnersTab partners={partners} onUpdate={loadData} />}
                                        {activeTab === 'payments' && <PaymentSettingsTab />}
                                        {activeTab === 'accountTypes' && <AccountTypePricingTab />}
                                        {activeTab === 'guidelines' && <GuidelinesTab />}
                                    </>
                                )}
                            </Content>
                        </Layout>
                    </div>

                    {/* ── Init Modal ── */}
                    <Modal
                        open={showInitModal}
                        onCancel={() => setShowInitModal(false)}
                        onOk={handleInitSystem}
                        confirmLoading={initLoading}
                        title={<Space><SettingOutlined className="text-amber-500" /><span>تهيئة الباقات الافتراضية</span></Space>}
                        okText="تهيئة"
                        cancelText="إلغاء"
                        okButtonProps={{ danger: true }}
                        width={420}
                    >
                        <Alert
                            type="warning"
                            icon={<ExclamationCircleOutlined />}
                            showIcon
                            message="تحذير"
                            description="هذا الإجراء سيستبدل الباقات الحالية بالقيم الافتراضية. سيتم إنشاء أو إعادة ضبط الباقات الثلاث الافتراضية (3 شهور، 6 شهور، سنوي)."
                            className="mt-2"
                        />
                    </Modal>
                </div>
            </App>
        </ConfigProvider>
    );
}

// ==================== PLANS TAB ====================

function PlansTab({ plans, onUpdate }: { plans: SubscriptionPlan[]; onUpdate: () => void }) {
    const { can } = useAbility();
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const handleCreate = async () => {
        try {
            const vals = await form.validateFields();
            setSaving(true);
            const newPlan: SubscriptionPlan = {
                id: `plan_${Date.now()}`,
                title: vals.title,
                subtitle: vals.subtitle || '',
                period: vals.period,
                base_currency: vals.base_currency || 'USD',
                base_original_price: vals.base_original_price || 0,
                base_price: vals.base_price,
                features: [],
                bonusFeatures: [],
                isActive: vals.isActive ?? true,
                order: plans.length + 1,
            };
            await PricingService.updatePlan(newPlan as any);
            toast.success('تم إنشاء الباقة');
            setModalOpen(false);
            form.resetFields();
            onUpdate();
        } catch { toast.error('فشل إنشاء الباقة'); }
        finally { setSaving(false); }
    };

    if (plans.length === 0) {
        return (
            <Card className="text-center py-16">
                <AppstoreOutlined className="text-5xl text-gray-300 mb-4" />
                <Title level={5} type="secondary">لا توجد باقات</Title>
                <Text type="secondary">استخدم زر "تهيئة الباقات" لإنشاء الباقات الافتراضية</Text>
            </Card>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Title level={5} className="!mb-0">الباقات الأساسية</Title>
                    <Text type="secondary" className="text-xs">إدارة باقات الاشتراك وأسعارها</Text>
                </div>
                {can('create', 'pricing') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ base_currency: 'USD', isActive: true }); setModalOpen(true); }}>
                        إضافة باقة
                    </Button>
                )}
            </div>
            <Row gutter={[16, 16]}>
                {plans.map(plan => (
                    <Col key={plan.id} xs={24} md={12} lg={8}>
                        <PlanCard plan={plan} onUpdate={onUpdate} />
                    </Col>
                ))}
            </Row>

            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleCreate}
                confirmLoading={saving}
                title={<Space><AppstoreOutlined style={{ color: '#2563eb' }} /><span>إضافة باقة جديدة</span></Space>}
                okText="إنشاء الباقة"
                cancelText="إلغاء"
                width={500}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={14}>
                            <Form.Item name="title" label="اسم الباقة" rules={[{ required: true, message: 'مطلوب' }]}>
                                <Input placeholder="مثال: باقة الاحتراف" />
                            </Form.Item>
                        </Col>
                        <Col span={10}>
                            <Form.Item name="period" label="المدة" rules={[{ required: true, message: 'مطلوب' }]}>
                                <Input placeholder="مثال: 6 شهور" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="subtitle" label="وصف مختصر">
                        <Input placeholder="وصف الباقة..." />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="base_currency" label="العملة">
                                <Select>
                                    <Select.Option value="USD">USD</Select.Option>
                                    <Select.Option value="EGP">EGP</Select.Option>
                                    <Select.Option value="SAR">SAR</Select.Option>
                                    <Select.Option value="QAR">QAR</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="base_original_price" label="السعر الأصلي">
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="base_price" label="السعر الفعلي" rules={[{ required: true, message: 'مطلوب' }]}>
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="isActive" label="الحالة" valuePropName="checked">
                        <Switch checkedChildren="نشطة" unCheckedChildren="معطلة" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ==================== PLAN CARD ====================

function PlanCard({ plan, onUpdate }: { plan: SubscriptionPlan; onUpdate: () => void }) {
    const { can } = useAbility();
    const [showEdit, setShowEdit] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isPopular = plan.id?.includes('6months') || plan.popular;

    const handleToggle = async (checked: boolean) => {
        setToggling(true);
        try {
            await PricingService.updatePlan({ ...plan, isActive: checked } as any);
            toast.success(checked ? 'تم تفعيل الباقة' : 'تم تعطيل الباقة');
            onUpdate();
        } catch { toast.error('فشل تحديث الحالة'); }
        finally { setToggling(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await PricingService.deletePlan(plan.id);
            toast.success('تم حذف الباقة');
            onUpdate();
        } catch { toast.error('فشل الحذف'); }
        finally { setDeleting(false); }
    };

    const handleSave = async (updatedPlan: any) => {
        await PricingService.updatePlan({
            ...updatedPlan,
            title: updatedPlan.name || updatedPlan.title,
            base_price: updatedPlan.basePrice ?? updatedPlan.base_price,
            features: updatedPlan.features?.map((f: any) => typeof f === 'string' ? f : f.name),
            bonusFeatures: updatedPlan.bonusFeatures?.map((b: any) => typeof b === 'string' ? b : b.name),
        });
        toast.success('تم حفظ التغييرات');
        setShowEdit(false);
        onUpdate();
    };

    const features = plan.features || [];

    return (
        <>
            <Card
                className={`h-full transition-shadow hover:shadow-md ${isPopular ? 'border-blue-400' : ''}`}
                styles={{ header: { background: isPopular ? '#2563eb' : '#f9fafb', borderBottom: isPopular ? '1px solid #1d4ed8' : undefined } }}
                title={
                    <Space>
                        <span className="text-lg">{plan.icon || '📦'}</span>
                        <div>
                            <div className={`font-semibold text-sm ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                                {plan.title || plan.name}
                            </div>
                            <div className={`text-xs ${isPopular ? 'text-blue-100' : 'text-gray-500'}`}>{plan.period}</div>
                        </div>
                        {isPopular && <Tag color="gold" className="text-[10px]">الأكثر طلباً</Tag>}
                    </Space>
                }
                extra={
                    <div className={`text-right ${isPopular ? 'text-white' : ''}`}>
                        <div className="text-xl font-bold">${plan.base_price || plan.basePrice}</div>
                        {plan.base_original_price && (
                            <div className={`text-xs line-through ${isPopular ? 'text-blue-200' : 'text-gray-400'}`}>
                                ${plan.base_original_price}
                            </div>
                        )}
                    </div>
                }
                actions={[
                    <Tooltip title="معاينة" key="preview">
                        <Button type="text" icon={<EyeOutlined />} onClick={() => setShowPreview(true)} size="small" />
                    </Tooltip>,
                    can('update', 'pricing') ? (
                        <Tooltip title="تعديل" key="edit">
                            <Button type="text" icon={<EditOutlined />} onClick={() => setShowEdit(true)} size="small" />
                        </Tooltip>
                    ) : <span key="edit" />,
                    can('update', 'pricing') ? (
                        <Tooltip title={plan.isActive ? 'تعطيل' : 'تفعيل'} key="toggle">
                            <Switch
                                checked={plan.isActive}
                                onChange={handleToggle}
                                loading={toggling}
                                size="small"
                            />
                        </Tooltip>
                    ) : <span key="toggle" />,
                    can('delete', 'pricing') ? (
                        <Popconfirm
                            key="delete"
                            title="حذف الباقة"
                            description="هل أنت متأكد من حذف هذه الباقة؟"
                            onConfirm={handleDelete}
                            okText="حذف"
                            cancelText="إلغاء"
                            okButtonProps={{ danger: true, loading: deleting }}
                        >
                            <Button type="text" icon={<DeleteOutlined />} danger size="small" />
                        </Popconfirm>
                    ) : <span key="delete" />,
                ]}
            >
                <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                        <Text type="secondary" className="text-xs">{features.length} ميزة مشمولة</Text>
                        <Badge
                            status={plan.isActive ? 'success' : 'default'}
                            text={<Text className="text-xs">{plan.isActive ? 'نشطة' : 'معطلة'}</Text>}
                        />
                    </div>
                    {features.slice(0, 4).map((f: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                            <CheckOutlined className="text-green-500 text-xs shrink-0" />
                            <span className="truncate">{typeof f === 'string' ? f : f?.name}</span>
                        </div>
                    ))}
                    {features.length > 4 && (
                        <Button type="link" size="small" className="!p-0 text-xs" onClick={() => setShowPreview(true)}>
                            +{features.length - 4} ميزة أخرى
                        </Button>
                    )}
                    {plan.overrides && Object.keys(plan.overrides).length > 0 && (
                        <>
                            <Divider className="my-2" />
                            <Text type="secondary" className="text-xs">
                                <GlobalOutlined className="ml-1" />
                                {Object.keys(plan.overrides).length} تسعير دولي مخصص
                            </Text>
                        </>
                    )}
                </div>
            </Card>

            {/* Edit Modal */}
            <EditPlanModal plan={plan as any} isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleSave} />

            {/* Preview Modal */}
            <Modal
                open={showPreview}
                onCancel={() => setShowPreview(false)}
                footer={<Button onClick={() => setShowPreview(false)}>إغلاق</Button>}
                title={<Space><span className="text-lg">{plan.icon || '📦'}</span><span>{plan.title}</span></Space>}
                width={480}
            >
                <div className="space-y-2 max-h-80 overflow-y-auto py-2">
                    {features.length > 0 && (
                        <>
                            <Text strong className="text-xs text-gray-500 uppercase tracking-wide">الميزات</Text>
                            {features.map((f: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <CheckCircleOutlined className="text-green-500" />
                                    <span>{typeof f === 'string' ? f : f?.name}</span>
                                </div>
                            ))}
                        </>
                    )}
                    {(plan.bonusFeatures || []).length > 0 && (
                        <>
                            <Divider />
                            <Text strong className="text-xs text-gray-500 uppercase tracking-wide">المكافآت</Text>
                            {(plan.bonusFeatures || []).map((b: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-amber-700">
                                    <StarOutlined className="text-amber-500" />
                                    <span>{typeof b === 'string' ? b : b?.name}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
}

// ==================== CUSTOM PRICING TAB ====================

function CustomPricingTab() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        PricingService.getAllPlans().then(data => {
            setPlans(data);
            if (data.length > 0) setSelectedPlanId(data[0].id);
            setLoading(false);
        });
    }, []);

    const currentPlan = plans.find(p => p.id === selectedPlanId);
    const overrides: [string, any][] = currentPlan?.overrides ? Object.entries(currentPlan.overrides) : [];

    const openAdd = () => {
        setEditingCode(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (code: string, data: any) => {
        setEditingCode(code);
        form.setFieldsValue({ countryCode: code, currency: data.currency, originalPrice: data.original_price, price: data.price, active: data.active ?? true });
        setModalOpen(true);
    };

    const handleDelete = async (code: string) => {
        const updated = { ...currentPlan, overrides: { ...currentPlan.overrides } };
        delete updated.overrides[code];
        await PricingService.updatePlan(updated);
        setPlans(prev => prev.map(p => p.id === selectedPlanId ? updated : p));
        toast.success('تم الحذف');
    };

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            setSaving(true);
            const updated = {
                ...currentPlan,
                overrides: {
                    ...currentPlan.overrides,
                    [vals.countryCode.toUpperCase()]: {
                        currency: vals.currency,
                        original_price: vals.originalPrice || 0,
                        price: vals.price,
                        active: vals.active ?? true,
                    }
                }
            };
            await PricingService.updatePlan(updated);
            setPlans(prev => prev.map(p => p.id === selectedPlanId ? updated : p));
            toast.success('تم الحفظ');
            setModalOpen(false);
        } catch { toast.error('فشل الحفظ'); }
        finally { setSaving(false); }
    };

    const columns: TableColumnsType<any> = [
        { title: 'رمز الدولة', dataIndex: '0', key: 'code', render: (code: string) => <Tag color="blue">{code}</Tag>, width: 100 },
        { title: 'العملة', key: 'currency', render: (_: any, r: any) => <Text>{r[1].currency}</Text>, width: 100 },
        { title: 'السعر الأصلي', key: 'original', render: (_: any, r: any) => <Text delete type="secondary">{r[1].original_price}</Text>, width: 120 },
        { title: 'السعر الفعلي', key: 'price', render: (_: any, r: any) => <Text strong>{r[1].price}</Text>, width: 120 },
        {
            title: 'الحالة', key: 'active', width: 100,
            render: (_: any, r: any) => r[1].active
                ? <Badge status="success" text="مفعّل" />
                : <Badge status="default" text="معطل" />,
        },
        {
            title: '', key: 'actions', width: 80,
            render: (_: any, r: any) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r[0], r[1])} />
                    <Popconfirm title={`حذف تسعير ${r[0]}؟`} onConfirm={() => handleDelete(r[0])} okText="حذف" cancelText="إلغاء" okButtonProps={{ danger: true }}>
                        <Button type="text" icon={<DeleteOutlined />} danger size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (loading) return <Card><div className="text-center py-8"><Spin /></div></Card>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <Title level={5} className="!mb-0">التسعير الدولي المخصص</Title>
                    <Text type="secondary" className="text-xs">تخصيص الأسعار حسب الدولة لكل باقة</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>إضافة دولة</Button>
            </div>

            <Card>
                <Space>
                    <Text type="secondary" className="text-xs">الباقة:</Text>
                    <Select value={selectedPlanId} onChange={setSelectedPlanId} style={{ width: 200 }} size="small">
                        {plans.map(p => <Select.Option key={p.id} value={p.id}>{p.title}</Select.Option>)}
                    </Select>
                    {currentPlan && (
                        <>
                            <Divider type="vertical" />
                            <Text className="text-xs">السعر الأساسي: <Text strong>${currentPlan.base_price}</Text></Text>
                        </>
                    )}
                </Space>
            </Card>

            <Table
                columns={columns}
                dataSource={overrides}
                rowKey={([code]) => code}
                pagination={false}
                locale={{ emptyText: <div className="py-8 text-center text-gray-400"><GlobalOutlined className="text-3xl mb-2" /><div>لا توجد أسعار مخصصة لهذه الباقة</div></div> }}
                className="bg-white rounded-xl"
                bordered={false}
            />

            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                title={<Space><GlobalOutlined className="text-blue-500" /><span>{editingCode ? 'تعديل سعر دولة' : 'إضافة سعر دولة'}</span></Space>}
                okText="حفظ"
                cancelText="إلغاء"
                width={400}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="countryCode" label="رمز الدولة" rules={[{ required: true }]}>
                                <Input placeholder="SA" disabled={!!editingCode} style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="currency" label="رمز العملة" rules={[{ required: true }]}>
                                <Input placeholder="SAR" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="originalPrice" label="السعر الأصلي">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="price" label="السعر الفعلي" rules={[{ required: true }]}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="active" valuePropName="checked" initialValue={true}>
                        <Switch checkedChildren="مفعّل" unCheckedChildren="معطل" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ==================== OFFERS TAB ====================

const EMPTY_FORM = {
    title: '', description: '', code: '', discountType: 'percentage', discountValue: 0,
    startDate: '', endDate: '', isActive: true, scope: 'all',
    targetAccountTypes: [], targetCountries: [], applicablePlans: [],
    usageLimitType: 'unlimited', totalUsageLimit: 0,
};

function OffersTab({ offers, plans, onUpdate }: { offers: PromotionalOffer[]; plans: SubscriptionPlan[]; onUpdate: () => void }) {
    const { can } = useAbility();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<PromotionalOffer | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const openCreate = () => {
        setEditingOffer(null);
        form.setFieldsValue(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (offer: PromotionalOffer) => {
        setEditingOffer(offer);
        form.setFieldsValue({
            title: offer.name, description: offer.description || '',
            code: offer.code || '', discountType: offer.discountType,
            discountValue: offer.discountValue,
            startDate: offer.startDate ? dayjs(offer.startDate) : null,
            endDate: offer.endDate ? dayjs(offer.endDate) : null,
            isActive: offer.isActive,
            usageLimitType: offer.totalUsageLimit ? 'total' : 'unlimited',
            totalUsageLimit: offer.totalUsageLimit || 0,
            applicablePlans: offer.applicablePlans || [],
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            setSaving(true);
            const payload = {
                name: vals.title, description: vals.description, code: vals.code,
                discountType: vals.discountType, discountValue: vals.discountValue,
                startDate: vals.startDate ? dayjs(vals.startDate).toISOString() : null,
                endDate: vals.endDate ? dayjs(vals.endDate).toISOString() : null,
                isActive: vals.isActive, applicablePlans: vals.applicablePlans || [],
                totalUsageLimit: vals.usageLimitType === 'total' ? vals.totalUsageLimit : null,
                updatedAt: new Date().toISOString(),
            };
            if (editingOffer) {
                await supabase.from('promotional_offers').update(payload).eq('id', editingOffer.id);
                toast.success('تم تحديث العرض');
            } else {
                await supabase.from('promotional_offers').insert({ ...payload, createdAt: new Date().toISOString() });
                toast.success('تم إنشاء العرض');
            }
            setModalOpen(false);
            onUpdate();
        } catch { toast.error('فشل الحفظ'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await supabase.from('promotional_offers').delete().eq('id', id);
        toast.success('تم الحذف');
        onUpdate();
    };

    const handleToggle = async (offer: PromotionalOffer) => {
        await supabase.from('promotional_offers').update({ isActive: !offer.isActive }).eq('id', offer.id);
        toast.success(offer.isActive ? 'تم تعطيل العرض' : 'تم تفعيل العرض');
        onUpdate();
    };

    const columns: TableColumnsType<PromotionalOffer> = [
        {
            title: 'العرض', key: 'name',
            render: (_, r) => (
                <div>
                    <Text strong className="text-sm">{r.name}</Text>
                    {r.code && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <Tag color="blue" className="font-mono text-xs">{r.code}</Tag>
                            <Button
                                type="text" size="small" icon={<CopyOutlined />}
                                onClick={() => { navigator.clipboard.writeText(r.code!); toast.success('تم النسخ'); }}
                            />
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'الخصم', key: 'discount', width: 120,
            render: (_, r) => (
                <Text strong className="text-emerald-600 text-base">
                    {r.discountType === 'percentage' ? `${r.discountValue}%` : `$${r.discountValue}`}
                </Text>
            ),
        },
        {
            title: 'الفترة', key: 'dates', width: 180,
            render: (_, r) => (
                <div className="text-xs text-gray-500 space-y-0.5">
                    {r.startDate && <div><CalendarOutlined className="ml-1" />{new Date(r.startDate).toLocaleDateString('ar')}</div>}
                    {r.endDate && <div>حتى {new Date(r.endDate).toLocaleDateString('ar')}</div>}
                    {!r.startDate && !r.endDate && <Text type="secondary">غير محدد</Text>}
                </div>
            ),
        },
        {
            title: 'الاستخدام', key: 'usage', width: 120,
            render: (_, r) => r.totalUsageLimit
                ? <Text className="text-xs">{r.currentUses || 0}/{r.totalUsageLimit}</Text>
                : <Text type="secondary" className="text-xs">غير محدود</Text>,
        },
        {
            title: 'الحالة', key: 'status', width: 100,
            render: (_, r) => r.isActive
                ? <Badge status="success" text="نشط" />
                : <Badge status="default" text="معطل" />,
        },
        {
            title: '', key: 'actions', width: 120,
            render: (_, r) => (
                <Space>
                    {can('update', 'pricing') && (
                        <>
                            <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
                            <Switch checked={r.isActive} onChange={() => handleToggle(r)} size="small" />
                        </>
                    )}
                    {can('delete', 'pricing') && (
                        <Popconfirm title="حذف هذا العرض؟" onConfirm={() => handleDelete(r.id)} okText="حذف" cancelText="إلغاء" okButtonProps={{ danger: true }}>
                            <Button type="text" icon={<DeleteOutlined />} danger size="small" />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <Title level={5} className="!mb-0">العروض الترويجية</Title>
                    <Text type="secondary" className="text-xs">إدارة كودات الخصم والحملات التسويقية</Text>
                </div>
                {can('create', 'pricing') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>عرض جديد</Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={offers}
                rowKey="id"
                locale={{ emptyText: <div className="py-8 text-center text-gray-400"><GiftOutlined className="text-3xl mb-2" /><div>لا توجد عروض ترويجية</div></div> }}
                className="bg-white rounded-xl"
                pagination={{ pageSize: 10, showSizeChanger: true }}
            />

            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                title={<Space><GiftOutlined className="text-emerald-500" /><span>{editingOffer ? 'تعديل العرض' : 'عرض ترويجي جديد'}</span></Space>}
                okText={editingOffer ? 'حفظ التعديلات' : 'إنشاء العرض'}
                cancelText="إلغاء"
                width={560}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Row gutter={16}>
                        <Col span={14}>
                            <Form.Item name="title" label="اسم العرض" rules={[{ required: true, message: 'مطلوب' }]}>
                                <Input placeholder="مثال: عرض رمضان 2025" />
                            </Form.Item>
                        </Col>
                        <Col span={10}>
                            <Form.Item name="code" label="كود العرض">
                                <Input placeholder="OFFER2025" style={{ fontFamily: 'monospace' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="الوصف">
                        <Input.TextArea rows={2} placeholder="وصف مختصر..." />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="discountType" label="نوع الخصم">
                                <Radio.Group buttonStyle="solid">
                                    <Radio.Button value="percentage"><PercentageOutlined /> نسبة</Radio.Button>
                                    <Radio.Button value="fixed"><DollarOutlined /> مبلغ ثابت</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="discountValue" label="قيمة الخصم" rules={[{ required: true, message: 'مطلوب' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="startDate" label="تاريخ البدء">
                                <DatePicker style={{ width: '100%' }} placeholder="اختر تاريخ البدء" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="endDate" label="تاريخ الانتهاء">
                                <DatePicker style={{ width: '100%' }} placeholder="اختر تاريخ الانتهاء" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="applicablePlans" label="الباقات المؤهلة">
                        <Select mode="multiple" placeholder="جميع الباقات" allowClear>
                            {plans.map(p => <Select.Option key={p.id} value={p.id}>{p.title || p.name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="usageLimitType" label="حد الاستخدام">
                        <Radio.Group>
                            <Radio value="unlimited">غير محدود</Radio>
                            <Radio value="total">حد إجمالي</Radio>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.usageLimitType !== cur.usageLimitType}>
                        {({ getFieldValue }) => getFieldValue('usageLimitType') === 'total' && (
                            <Form.Item name="totalUsageLimit" label="الحد الأقصى">
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        )}
                    </Form.Item>
                    <Form.Item name="isActive" valuePropName="checked" label="الحالة">
                        <Switch checkedChildren="نشط" unCheckedChildren="معطل" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ==================== PARTNERS TAB ====================

function PartnersTab({ partners, onUpdate }: { partners: Partner[]; onUpdate: () => void }) {
    const { can } = useAbility();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const openCreate = () => { setEditingPartner(null); form.resetFields(); form.setFieldsValue({ partnerType: 'federation', status: 'active', isPublic: true }); setModalOpen(true); };
    const openEdit = (p: Partner) => {
        setEditingPartner(p);
        form.setFieldsValue({ partnerName: p.partnerName || p.name, partnerCode: p.partnerCode, partnerType: p.partnerType || 'federation', status: p.status || 'active' });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            setSaving(true);
            const payload = { ...vals, updatedAt: new Date().toISOString() };
            if (editingPartner) {
                await supabase.from('partners').update(payload).eq('id', editingPartner.id);
                toast.success('تم التحديث');
            } else {
                await supabase.from('partners').insert({ ...payload, id: crypto.randomUUID(), activeSubscriptions: 0, createdAt: new Date().toISOString() });
                toast.success('تم الإضافة');
            }
            setModalOpen(false);
            onUpdate();
        } catch { toast.error('فشل الحفظ'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        await supabase.from('partners').delete().eq('id', id);
        toast.success('تم الحذف');
        onUpdate();
    };

    const typeLabel: Record<string, string> = { federation: 'اتحاد', league: 'دوري', government: 'حكومي', corporate: 'شركة' };

    const columns: TableColumnsType<Partner> = [
        {
            title: 'الشريك', key: 'name',
            render: (_, r) => (
                <div>
                    <Text strong className="text-sm">{r.partnerName || r.name}</Text>
                    {r.partnerCode && <div><Tag className="font-mono text-xs mt-0.5">{r.partnerCode}</Tag></div>}
                </div>
            ),
        },
        {
            title: 'النوع', key: 'type', width: 120,
            render: (_, r) => r.partnerType ? <Tag color="purple">{typeLabel[r.partnerType] || r.partnerType}</Tag> : null,
        },
        {
            title: 'الاشتراكات', key: 'subs', width: 120,
            render: (_, r) => <Text>{r.activeSubscriptions ?? 0} نشط</Text>,
        },
        {
            title: 'الحالة', key: 'status', width: 100,
            render: (_, r) => r.status === 'active'
                ? <Badge status="success" text="نشط" />
                : <Badge status="default" text="معطل" />,
        },
        {
            title: '', key: 'actions', width: 100,
            render: (_, r) => (
                <Space>
                    {can('update', 'pricing') && <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />}
                    {can('delete', 'pricing') && (
                        <Popconfirm title="حذف هذا الشريك؟" onConfirm={() => handleDelete(r.id)} okText="حذف" cancelText="إلغاء" okButtonProps={{ danger: true }}>
                            <Button type="text" icon={<DeleteOutlined />} danger size="small" />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <Title level={5} className="!mb-0">الشركاء الاستراتيجيون</Title>
                    <Text type="secondary" className="text-xs">الاتحادات والدوريات والشركات الشريكة</Text>
                </div>
                {can('create', 'pricing') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>شريك جديد</Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={partners}
                rowKey="id"
                locale={{ emptyText: <div className="py-8 text-center text-gray-400"><ApartmentOutlined className="text-3xl mb-2" /><div>لا يوجد شركاء مسجلون</div></div> }}
                className="bg-white rounded-xl"
                pagination={{ pageSize: 10 }}
            />

            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                title={<Space><ApartmentOutlined className="text-purple-500" /><span>{editingPartner ? 'تعديل الشريك' : 'إضافة شريك جديد'}</span></Space>}
                okText={editingPartner ? 'حفظ التغييرات' : 'إضافة'}
                cancelText="إلغاء"
                width={440}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="partnerName" label="اسم الشريك" rules={[{ required: true, message: 'مطلوب' }]}>
                        <Input placeholder="اسم الجهة الشريكة" />
                    </Form.Item>
                    <Form.Item name="partnerCode" label="كود الشريك">
                        <Input placeholder="P-CODE" addonAfter={
                            <Button type="text" size="small" onClick={() => form.setFieldValue('partnerCode', 'P' + Math.random().toString(36).substring(2, 7).toUpperCase())}>
                                توليد
                            </Button>
                        } />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="partnerType" label="النوع">
                                <Select>
                                    <Select.Option value="federation">اتحاد</Select.Option>
                                    <Select.Option value="league">دوري</Select.Option>
                                    <Select.Option value="government">حكومي</Select.Option>
                                    <Select.Option value="corporate">شركة</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="الحالة">
                                <Select>
                                    <Select.Option value="active">نشط</Select.Option>
                                    <Select.Option value="inactive">معطل</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}
