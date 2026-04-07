'use client';

import React, { useState, useEffect } from 'react';
import { Card, Tabs, Button, Space, Tag, Switch, Input, Typography, Spin, Alert, List, Avatar, Popconfirm, Divider, Descriptions, Empty, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, GlobalOutlined, CreditCardOutlined, SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ConfigProvider, App } from 'antd';
import arEG from 'antd/locale/ar_EG';
import { supabase } from '@/lib/supabase/config';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import AddCountryModal from './AddCountryModal';

const { Text, Title } = Typography;

interface PaymentMethod {
    id: string;
    name: string;
    type: 'card' | 'wallet' | 'bank_transfer' | 'other';
    enabled: boolean;
    isDefault: boolean;
    accountNumber?: string;
    instructions?: string;
    icon?: string;
}

interface CountrySettings {
    countryCode: string;
    countryName: string;
    currency: string;
    methods: PaymentMethod[];
}

const DEFAULT_SETTINGS: CountrySettings[] = [
    {
        countryCode: 'EG', countryName: 'مصر', currency: 'EGP',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'vodafone_cash', name: 'فودافون كاش', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
            { id: 'instapay', name: 'انستاباي', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'QA', countryName: 'قطر', currency: 'QAR',
        methods: [
            { id: 'skipcash', name: 'SkipCash (بطاقة بنكية)', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'fawran', name: 'خدمة فورا', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'SA', countryName: 'السعودية', currency: 'SAR',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'stc_pay', name: 'STC Pay', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'GLOBAL', countryName: 'دولي (USD)', currency: 'USD',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'paypal', name: 'PayPal', type: 'wallet', enabled: true, isDefault: false, icon: '💙' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    }
];

const typeColor: Record<string, string> = {
    card: 'blue', wallet: 'green', bank_transfer: 'orange', other: 'default'
};
const typeLabel: Record<string, string> = {
    card: 'بطاقة', wallet: 'محفظة', bank_transfer: 'تحويل', other: 'أخرى'
};

const ANTD_THEME = {
    token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
    components: { Card: { borderRadiusLG: 12 }, Tabs: { borderRadius: 8 } },
};

function PaymentSettingsContent() {
    const { message } = App.useApp();
    const [settings, setSettings] = useState<CountrySettings[]>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeCountry, setActiveCountry] = useState('EG');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const loaded = [...DEFAULT_SETTINGS];
                for (let i = 0; i < loaded.length; i++) {
                    const { data } = await supabase.from('payment_settings').select('*').eq('id', loaded[i].countryCode).single();
                    if (data) loaded[i] = { ...loaded[i], ...data } as CountrySettings;
                }
                setSettings(loaded);
            } catch {
                // use defaults silently
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const currentCountry = settings.find(s => s.countryCode === activeCountry) || settings[0];

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.from('payment_settings').upsert({ id: activeCountry, ...currentCountry });
            message.success(`تم حفظ إعدادات ${currentCountry.countryName}`);
        } catch {
            message.error('فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const updateMethod = (methodId: string, updates: Partial<PaymentMethod>) => {
        setSettings(prev => prev.map(country => {
            if (country.countryCode !== activeCountry) return country;
            return { ...country, methods: country.methods.map(m => m.id !== methodId ? m : { ...m, ...updates }) };
        }));
    };

    const handleAddMethod = (newMethod: PaymentMethod) => {
        setSettings(prev => prev.map(c => c.countryCode !== activeCountry ? c : { ...c, methods: [...c.methods, newMethod] }));
        message.success(`تمت إضافة ${newMethod.name}`);
    };

    const handleAddCountry = (newCountry: CountrySettings) => {
        setSettings(prev => [...prev, newCountry]);
        setActiveCountry(newCountry.countryCode);
        message.success(`تمت إضافة ${newCountry.countryName}`);
    };

    const handleDeleteMethod = (methodId: string) => {
        setSettings(prev => prev.map(c => c.countryCode !== activeCountry ? c : { ...c, methods: c.methods.filter(m => m.id !== methodId) }));
        message.success('تم حذف طريقة الدفع');
    };

    const tabItems = settings.map(s => ({
        key: s.countryCode,
        label: (
            <Space size={4}>
                <GlobalOutlined />
                {s.countryName}
                <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{s.currency}</Tag>
            </Space>
        ),
    }));

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spin size="large" />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <Title level={5} style={{ margin: 0 }}>إعدادات الدفع</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>طرق الدفع المتاحة لكل دولة</Text>
                </div>
                <Button
                    icon={<PlusOutlined />}
                    onClick={() => setIsCountryModalOpen(true)}
                    style={{ borderStyle: 'dashed' }}
                >
                    دولة جديدة
                </Button>
            </div>

            <Tabs
                activeKey={activeCountry}
                onChange={setActiveCountry}
                items={tabItems}
                type="card"
            />

            <Row gutter={16}>
                <Col xs={24} lg={16}>
                    <Card
                        title={
                            <Space>
                                <CreditCardOutlined style={{ color: '#2563eb' }} />
                                <span>طرق الدفع في {currentCountry?.countryName}</span>
                                <Tag color="blue">{currentCountry?.currency}</Tag>
                            </Space>
                        }
                        extra={
                            <Space>
                                <Button
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    إضافة طريقة
                                </Button>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={saving}
                                    onClick={handleSave}
                                >
                                    حفظ
                                </Button>
                            </Space>
                        }
                        styles={{ body: { padding: 0 } }}
                    >
                        {currentCountry?.methods.length === 0 ? (
                            <Empty
                                description="لا توجد طرق دفع لهذه الدولة"
                                image={<CreditCardOutlined style={{ fontSize: 40, color: '#d1d5db' }} />}
                                style={{ padding: '40px 0' }}
                            />
                        ) : (
                            <List
                                dataSource={currentCountry?.methods || []}
                                renderItem={method => (
                                    <List.Item
                                        style={{
                                            padding: '12px 20px',
                                            opacity: method.enabled ? 1 : 0.5,
                                            background: method.enabled ? undefined : '#f9fafb',
                                        }}
                                        actions={[
                                            <Switch
                                                key="toggle"
                                                size="small"
                                                checked={method.enabled}
                                                onChange={v => updateMethod(method.id, { enabled: v })}
                                            />,
                                            <Popconfirm
                                                key="del"
                                                title="حذف طريقة الدفع هذه؟"
                                                onConfirm={() => handleDeleteMethod(method.id)}
                                                okText="حذف"
                                                cancelText="إلغاء"
                                                okButtonProps={{ danger: true }}
                                            >
                                                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                            </Popconfirm>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar style={{ background: '#f1f5f9', fontSize: 18 }}>
                                                    {method.icon || '💳'}
                                                </Avatar>
                                            }
                                            title={
                                                <Space size={6}>
                                                    <Text strong style={{ fontSize: 13 }}>{method.name}</Text>
                                                    {method.isDefault && <Tag color="blue" style={{ fontSize: 10 }}>افتراضي</Tag>}
                                                    <Tag color={typeColor[method.type]} style={{ fontSize: 10 }}>
                                                        {typeLabel[method.type] || method.type}
                                                    </Tag>
                                                </Space>
                                            }
                                            description={
                                                method.enabled && method.id !== 'geidea' && method.id !== 'paypal' && method.id !== 'skipcash' ? (
                                                    <Row gutter={8} style={{ marginTop: 8 }}>
                                                        <Col span={12}>
                                                            <Input
                                                                size="small"
                                                                value={method.accountNumber || ''}
                                                                onChange={e => updateMethod(method.id, { accountNumber: e.target.value })}
                                                                placeholder="رقم الحساب / IBAN..."
                                                                style={{ fontSize: 11 }}
                                                            />
                                                        </Col>
                                                        <Col span={12}>
                                                            <Input
                                                                size="small"
                                                                value={method.instructions || ''}
                                                                onChange={e => updateMethod(method.id, { instructions: e.target.value })}
                                                                placeholder="تعليمات التحويل..."
                                                                style={{ fontSize: 11 }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                ) : undefined
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Card size="small" title={<Space><GlobalOutlined />معلومات الدولة</Space>}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="رمز الدولة">
                                    <Tag>{currentCountry?.countryCode}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="العملة">
                                    <Tag color="blue">{currentCountry?.currency}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="إجمالي طرق الدفع">
                                    <Text strong>{currentCountry?.methods.length}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="المفعّلة">
                                    <Text strong style={{ color: '#059669' }}>
                                        {currentCountry?.methods.filter(m => m.enabled).length}
                                    </Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        <Alert
                            icon={<InfoCircleOutlined />}
                            message="تأكد من إدخال أرقام الحسابات الصحيحة لطرق الدفع اليدوية لتجنب فشل المعاملات."
                            type="info"
                            showIcon
                            style={{ fontSize: 12 }}
                        />
                    </div>
                </Col>
            </Row>

            <AddPaymentMethodModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddMethod}
            />
            <AddCountryModal
                isOpen={isCountryModalOpen}
                onClose={() => setIsCountryModalOpen(false)}
                onAdd={handleAddCountry}
                existingCodes={settings.map(s => s.countryCode)}
            />
        </div>
    );
}

export default function PaymentSettingsTab() {
    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <App>
                <PaymentSettingsContent />
            </App>
        </ConfigProvider>
    );
}
