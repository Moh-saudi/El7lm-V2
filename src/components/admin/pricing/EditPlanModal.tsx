'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Tabs, Button, Space, List, Typography, Empty, Tag, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckOutlined, StarOutlined, SettingOutlined } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import toast from 'react-hot-toast';

const { TextArea } = Input;
const { Text } = Typography;

interface SubscriptionPlan {
    id: string;
    title: string;
    subtitle?: string;
    period: string;
    base_currency: string;
    base_original_price: number;
    base_price: number;
    features: string[];
    bonusFeatures?: string[];
    isActive: boolean;
    order?: number;
    overrides?: any;
    accountTypeOverrides?: any;
}

interface EditPlanModalProps {
    plan: SubscriptionPlan;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPlan: SubscriptionPlan) => Promise<void> | void;
}

const ANTD_THEME = {
    token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
};

export default function EditPlanModal({ plan, isOpen, onClose, onSave }: EditPlanModalProps) {
    const [form] = Form.useForm();
    const [activeTab, setActiveTab] = useState('basic');
    const [features, setFeatures] = useState<string[]>([]);
    const [bonusFeatures, setBonusFeatures] = useState<string[]>([]);
    const [newFeature, setNewFeature] = useState('');
    const [newBonus, setNewBonus] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (plan && isOpen) {
            const rawPlan = plan as any;
            form.setFieldsValue({
                title: rawPlan.title || rawPlan.name || '',
                subtitle: rawPlan.subtitle || rawPlan.description || '',
                period: rawPlan.period || '',
                base_currency: rawPlan.base_currency || 'USD',
                base_original_price: Number(rawPlan.base_original_price ?? rawPlan.baseOriginalPrice ?? 0),
                base_price: Number(rawPlan.base_price ?? rawPlan.basePrice ?? 0),
                isActive: rawPlan.isActive ?? true,
            });
            const rawFeatures = Array.isArray(rawPlan.features) ? rawPlan.features : [];
            setFeatures(rawFeatures.map((f: any) => typeof f === 'string' ? f : f?.name || f?.title || '').filter(Boolean));
            
            const rawBonus = Array.isArray(rawPlan.bonusFeatures) ? rawPlan.bonusFeatures : [];
            setBonusFeatures(rawBonus.map((b: any) => typeof b === 'string' ? b : b?.name || b?.title || '').filter(Boolean));
            setActiveTab('basic');
        }
    }, [plan, isOpen, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setIsSaving(true);
            const cleanFeatures = features.map(f => typeof f === 'string' ? f : (f as any)?.name || '').filter(Boolean);
            const cleanBonus = bonusFeatures.map(b => typeof b === 'string' ? b : (b as any)?.name || '').filter(Boolean);
            
            await onSave({
                ...plan,
                ...values,
                base_price: Number(values.base_price),
                base_original_price: Number(values.base_original_price || 0),
                features: cleanFeatures,
                bonusFeatures: cleanBonus,
            });
            onClose();
        } catch (err: any) {
            if (err?.errorFields && err.errorFields.length > 0) {
                setActiveTab('basic');
                toast.error('يرجى التأكد من ملء جميع الحقول المطلوبة بشكل صحيح');
            } else {
                console.error('[EditPlanModal] Error saving plan:', err);
                toast.error(err?.message || 'فشل حفظ التعديلات');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const addFeature = () => {
        if (!newFeature.trim()) return;
        setFeatures(prev => [...prev, newFeature.trim()]);
        setNewFeature('');
    };

    const addBonus = () => {
        if (!newBonus.trim()) return;
        setBonusFeatures(prev => [...prev, newBonus.trim()]);
        setNewBonus('');
    };

    const tabItems = [
        {
            key: 'basic',
            forceRender: true,
            label: (
                <span className="flex items-center gap-1.5">
                    <SettingOutlined /> المعلومات الأساسية
                </span>
            ),
            children: (
                <Form form={form} layout="vertical" size="middle">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="title" label="اسم الباقة" rules={[{ required: true, message: 'مطلوب' }]}>
                            <Input placeholder="اسم الباقة" />
                        </Form.Item>
                        <Form.Item name="period" label="الفترة الزمنية" rules={[{ required: true, message: 'مطلوب' }]}>
                            <Input placeholder="مثال: 3 أشهر" />
                        </Form.Item>
                    </div>
                    <Form.Item name="subtitle" label="وصف مختصر">
                        <Input placeholder="وصف الباقة..." />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="base_original_price" label={`السعر الأصلي (${plan?.base_currency || 'USD'})`}>
                            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                        </Form.Item>
                        <Form.Item name="base_price" label={`السعر الفعلي (${plan?.base_currency || 'USD'})`} rules={[{ required: true, message: 'مطلوب' }]}>
                            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                        </Form.Item>
                    </div>
                    <Form.Item name="isActive" label="حالة الباقة" valuePropName="checked">
                        <Switch checkedChildren="نشطة" unCheckedChildren="معطلة" />
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: 'features',
            label: (
                <span className="flex items-center gap-1.5">
                    <CheckOutlined /> الميزات
                </span>
            ),
            children: (
                <div>
                    <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                        <Input
                            value={newFeature}
                            onChange={e => setNewFeature(e.target.value)}
                            onPressEnter={addFeature}
                            placeholder="أضف ميزة جديدة..."
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={addFeature}>إضافة</Button>
                    </Space.Compact>
                    {features.length === 0 ? (
                        <Empty description="لا توجد ميزات بعد" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <List
                            size="small"
                            dataSource={features}
                            renderItem={(item, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="del"
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() => setFeatures(prev => prev.filter((_, i) => i !== index))}
                                        />
                                    ]}
                                >
                                    <Space>
                                        <CheckOutlined style={{ color: '#10b981' }} />
                                        <Text>{typeof item === 'string' ? item : (item as any)?.name || ''}</Text>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    )}
                </div>
            ),
        },
        {
            key: 'bonus',
            label: (
                <span className="flex items-center gap-1.5">
                    <StarOutlined /> المكافآت
                </span>
            ),
            children: (
                <div>
                    <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                        <Input
                            value={newBonus}
                            onChange={e => setNewBonus(e.target.value)}
                            onPressEnter={addBonus}
                            placeholder="أضف مكافأة جديدة..."
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={addBonus}>إضافة</Button>
                    </Space.Compact>
                    {bonusFeatures.length === 0 ? (
                        <Empty description="لا توجد مكافآت بعد" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <List
                            size="small"
                            dataSource={bonusFeatures}
                            renderItem={(item, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="del"
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() => setBonusFeatures(prev => prev.filter((_, i) => i !== index))}
                                        />
                                    ]}
                                    style={{ background: '#fffbeb' }}
                                >
                                    <Space>
                                        <StarOutlined style={{ color: '#f59e0b' }} />
                                        <Text>{typeof item === 'string' ? item : (item as any)?.name || ''}</Text>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    )}
                </div>
            ),
        },
    ];

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <Modal
                open={isOpen}
                onCancel={onClose}
                title={
                    <Space>
                        <SettingOutlined style={{ color: '#2563eb' }} />
                        <span>تعديل الباقة</span>
                        {plan && <Tag color="blue">{plan.title || (plan as any).name}</Tag>}
                    </Space>
                }
                onOk={handleSave}
                okText="حفظ التغييرات"
                cancelText="إلغاء"
                confirmLoading={isSaving}
                width={600}
                destroyOnClose
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    size="small"
                    destroyInactiveTabPane={false}
                />
            </Modal>
        </ConfigProvider>
    );
}
