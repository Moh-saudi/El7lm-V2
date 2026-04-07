'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Tabs, Button, Space, List, Typography, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckOutlined, StarOutlined, SettingOutlined } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';

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
}

interface EditPlanModalProps {
    plan: SubscriptionPlan;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPlan: SubscriptionPlan) => void;
}

const ANTD_THEME = {
    token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
};

export default function EditPlanModal({ plan, isOpen, onClose, onSave }: EditPlanModalProps) {
    const [form] = Form.useForm();
    const [features, setFeatures] = React.useState<string[]>([]);
    const [bonusFeatures, setBonusFeatures] = React.useState<string[]>([]);
    const [newFeature, setNewFeature] = React.useState('');
    const [newBonus, setNewBonus] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    useEffect(() => {
        if (plan && isOpen) {
            form.setFieldsValue({
                title: plan.title,
                subtitle: plan.subtitle || '',
                period: plan.period,
                base_original_price: plan.base_original_price,
                base_price: plan.base_price,
                isActive: plan.isActive,
            });
            setFeatures(plan.features || []);
            setBonusFeatures(plan.bonusFeatures || []);
        }
    }, [plan, isOpen, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setIsSaving(true);
            await onSave({
                ...plan,
                ...values,
                features,
                bonusFeatures,
            });
            onClose();
        } catch {
            // validation failed
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
                        {plan && <Tag color="blue">{plan.title}</Tag>}
                    </Space>
                }
                onOk={handleSave}
                okText="حفظ التغييرات"
                cancelText="إلغاء"
                confirmLoading={isSaving}
                width={600}
                destroyOnClose
            >
                <Tabs items={tabItems} size="small" />
            </Modal>
        </ConfigProvider>
    );
}
