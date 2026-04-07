'use client';

import React, { useState, useEffect } from 'react';
import { Card, Modal, Form, InputNumber, Switch, Select, Space, Tag, Button, Spin, Alert, Row, Col, Statistic, Divider, Typography, Empty, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined, BookOutlined, BankOutlined, GlobalOutlined, ApartmentOutlined } from '@ant-design/icons';
import { ConfigProvider, App } from 'antd';
import arEG from 'antd/locale/ar_EG';
import { PricingService } from '@/lib/pricing/pricing-service';

const { Text, Title } = Typography;

const ACCOUNT_TYPES = [
    { code: 'club', name: 'الأندية', icon: <ApartmentOutlined />, color: 'blue' },
    { code: 'academy', name: 'الأكاديميات', icon: <BookOutlined />, color: 'green' },
    { code: 'trainer', name: 'المدربون', icon: <UserOutlined />, color: 'purple' },
    { code: 'agent', name: 'الوكلاء', icon: <BankOutlined />, color: 'orange' },
    { code: 'player', name: 'اللاعبون', icon: <TeamOutlined />, color: 'red' },
];

const ANTD_THEME = {
    token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
    components: { Card: { borderRadiusLG: 12 } },
};

function AccountTypePricingContent() {
    const { message } = App.useApp();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [editingType, setEditingType] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => { loadPlans(); }, []);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await PricingService.getAllPlans();
            setPlans(data);
            if (data.length > 0 && !selectedPlan) setSelectedPlan(data[0].id);
        } catch {
            message.error('فشل تحميل الباقات');
        } finally {
            setLoading(false);
        }
    };

    const currentPlan = plans.find(p => p.id === selectedPlan);

    const handleEdit = (typeCode: string) => {
        const override = currentPlan?.accountTypeOverrides?.[typeCode];
        setEditingType(typeCode);
        form.setFieldsValue({
            original_price: override?.original_price ?? currentPlan?.base_original_price ?? undefined,
            price: override?.price ?? currentPlan?.base_price ?? undefined,
            discount_percentage: override?.discount_percentage ?? undefined,
            active: override?.active ?? true,
        });
    };

    const handleSave = async () => {
        if (!editingType || !currentPlan) return;
        try {
            const values = await form.validateFields();
            setIsSaving(true);
            const updatedOverrides = {
                ...currentPlan.accountTypeOverrides,
                [editingType]: {
                    original_price: values.original_price || undefined,
                    price: values.price || undefined,
                    discount_percentage: values.discount_percentage || undefined,
                    active: values.active,
                },
            };
            await PricingService.updatePlan({ ...currentPlan, accountTypeOverrides: updatedOverrides });
            message.success('تم حفظ التسعير');
            setEditingType(null);
            loadPlans();
        } catch {
            message.error('فشل الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async (typeCode: string) => {
        if (!currentPlan) return;
        try {
            const updatedOverrides = { ...currentPlan.accountTypeOverrides };
            delete updatedOverrides[typeCode];
            await PricingService.updatePlan({ ...currentPlan, accountTypeOverrides: updatedOverrides });
            message.success('تم حذف التسعير الخاص');
            loadPlans();
        } catch {
            message.error('فشل الحذف');
        }
    };

    const editingTypeInfo = ACCOUNT_TYPES.find(a => a.code === editingType);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spin size="large" />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <Title level={5} style={{ margin: 0 }}>أسعار أنواع الحسابات</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>تخصيص السعر لكل نوع حساب لكل باقة</Text>
                </div>
            </div>

            {/* Plan selector */}
            <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                <Space wrap align="center">
                    <div>
                        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>الباقة</Text>
                        <Select
                            value={selectedPlan}
                            onChange={setSelectedPlan}
                            style={{ width: 200 }}
                            options={plans.map(p => ({ value: p.id, label: p.title }))}
                        />
                    </div>
                    {currentPlan && (
                        <>
                            <Divider type="vertical" style={{ height: 40 }} />
                            <Statistic
                                title={<span style={{ fontSize: 11 }}>السعر الأساسي</span>}
                                value={currentPlan.base_price}
                                prefix="$"
                                valueStyle={{ fontSize: 16 }}
                            />
                            <Alert
                                message="التسعير الخاص بنوع الحساب يتجاوز السعر الأساسي"
                                type="warning"
                                showIcon
                                style={{ fontSize: 11, padding: '4px 10px' }}
                            />
                        </>
                    )}
                </Space>
            </Card>

            {/* Account types grid */}
            <Row gutter={[16, 16]}>
                {ACCOUNT_TYPES.map(type => {
                    const override = currentPlan?.accountTypeOverrides?.[type.code];
                    const hasOverride = !!override;

                    return (
                        <Col key={type.code} xs={24} sm={12} lg={8}>
                            <Card
                                size="small"
                                styles={{ body: { padding: 0 } }}
                                style={{ borderColor: hasOverride ? '#bfdbfe' : undefined }}
                                title={
                                    <Space>
                                        <span style={{ color: '#2563eb' }}>{type.icon}</span>
                                        <Text strong style={{ fontSize: 13 }}>{type.name}</Text>
                                        {hasOverride && <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>خاص</Tag>}
                                    </Space>
                                }
                                actions={[
                                    <Button
                                        key="edit"
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => handleEdit(type.code)}
                                    >
                                        تعديل
                                    </Button>,
                                    ...(hasOverride ? [
                                        <Popconfirm
                                            key="del"
                                            title="حذف التسعير الخاص؟"
                                            onConfirm={() => handleRemove(type.code)}
                                            okText="حذف"
                                            cancelText="إلغاء"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    ] : []),
                                ]}
                            >
                                <div style={{ padding: '12px 16px' }}>
                                    <Row gutter={8}>
                                        <Col span={12}>
                                            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
                                                <Text style={{ fontSize: 10, color: '#9ca3af', display: 'block', marginBottom: 2 }}>السعر الفعلي</Text>
                                                <Text strong style={{ fontSize: 16, color: hasOverride ? '#059669' : '#9ca3af' }}>
                                                    {hasOverride ? `$${override.price}` : 'افتراضي'}
                                                </Text>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
                                                <Text style={{ fontSize: 10, color: '#9ca3af', display: 'block', marginBottom: 2 }}>نسبة الخصم</Text>
                                                <Text strong style={{ fontSize: 16, color: override?.discount_percentage ? '#ea580c' : '#9ca3af' }}>
                                                    {override?.discount_percentage ? `${override.discount_percentage}%` : '—'}
                                                </Text>
                                            </div>
                                        </Col>
                                    </Row>
                                    {hasOverride && (
                                        <div style={{ marginTop: 8 }}>
                                            <Tag color={override.active ? 'success' : 'default'} style={{ fontSize: 11 }}>
                                                {override.active ? 'مفعّل' : 'معطل'}
                                            </Tag>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {/* Edit Modal */}
            <Modal
                open={!!editingType}
                onCancel={() => setEditingType(null)}
                onOk={handleSave}
                confirmLoading={isSaving}
                okText="حفظ"
                cancelText="إلغاء"
                title={
                    editingTypeInfo ? (
                        <Space>
                            <span style={{ color: '#2563eb' }}>{editingTypeInfo.icon}</span>
                            <span>تسعير {editingTypeInfo.name}</span>
                        </Space>
                    ) : 'تعديل التسعير'
                }
                width={400}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="original_price" label="السعر الأصلي">
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="price" label="السعر الفعلي">
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="discount_percentage" label="نسبة الخصم (%)">
                        <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="0" />
                    </Form.Item>
                    <Form.Item name="active" label="الحالة" valuePropName="checked">
                        <Switch checkedChildren="مفعّل" unCheckedChildren="معطل" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default function AccountTypePricingTab() {
    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <App>
                <AccountTypePricingContent />
            </App>
        </ConfigProvider>
    );
}
