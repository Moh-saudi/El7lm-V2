'use client';

import React from 'react';
import {
    Modal, Form, Input, InputNumber, Switch, Tabs, Button, Space, Tag, Select,
    Radio, Row, Col, ConfigProvider, DatePicker,
} from 'antd';
import {
    GiftOutlined, GlobalOutlined, TeamOutlined, AppstoreOutlined,
    PercentageOutlined, DollarOutlined, SyncOutlined, InfoOutlined,
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface CreateOfferModalProps {
    isOpen: boolean;
    formData: any;
    onClose: () => void;
    onSave: () => void;
    onChange: (data: any) => void;
    availablePlans: any[];
    isEditing?: boolean;
    isSaving?: boolean;
}

const ACCOUNT_TYPES = [
    { value: 'club', label: 'الأندية' },
    { value: 'academy', label: 'الأكاديميات' },
    { value: 'trainer', label: 'المدربون' },
    { value: 'agent', label: 'الوكلاء' },
    { value: 'player', label: 'اللاعبون' },
];

const ANTD_THEME = {
    token: { colorPrimary: '#059669', borderRadius: 8, fontFamily: 'inherit' },
};

export default function CreateOfferModal({
    isOpen,
    formData,
    onClose,
    onSave,
    onChange,
    availablePlans,
    isEditing = false,
    isSaving = false,
}: CreateOfferModalProps) {

    const tabItems = [
        {
            key: 'basic',
            label: <span><GiftOutlined /> الأساسيات</span>,
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                    <Row gutter={12}>
                        <Col span={24}>
                            <Form.Item label="اسم العرض" required style={{ marginBottom: 12 }}>
                                <Input
                                    value={formData.title || ''}
                                    onChange={e => onChange({ ...formData, title: e.target.value })}
                                    placeholder="مثال: عرض رمضان 2025"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label="الوصف" style={{ marginBottom: 12 }}>
                        <TextArea
                            rows={2}
                            value={formData.description || ''}
                            onChange={e => onChange({ ...formData, description: e.target.value })}
                            placeholder="وصف مختصر للعرض..."
                        />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item label="كود العرض" style={{ marginBottom: 12 }}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        value={formData.code || ''}
                                        onChange={e => onChange({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="OFFER2025"
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                    <Button
                                        icon={<SyncOutlined />}
                                        onClick={() => {
                                            const code = `OFFER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                                            onChange({ ...formData, code });
                                        }}
                                    />
                                </Space.Compact>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="نوع الخصم" style={{ marginBottom: 12 }}>
                                <Radio.Group
                                    value={formData.discountType || 'percentage'}
                                    onChange={e => onChange({ ...formData, discountType: e.target.value })}
                                    optionType="button"
                                    buttonStyle="solid"
                                    style={{ width: '100%' }}
                                >
                                    <Radio.Button value="percentage" style={{ width: '50%', textAlign: 'center' }}>
                                        <PercentageOutlined /> نسبة
                                    </Radio.Button>
                                    <Radio.Button value="fixed" style={{ width: '50%', textAlign: 'center' }}>
                                        <DollarOutlined /> مبلغ
                                    </Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item label="قيمة الخصم" required style={{ marginBottom: 12 }}>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    value={formData.discountValue || undefined}
                                    onChange={v => onChange({ ...formData, discountValue: v })}
                                    placeholder="0"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="تاريخ البدء" style={{ marginBottom: 12 }}>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    value={formData.startDate ? dayjs(formData.startDate) : null}
                                    onChange={(_, s) => onChange({ ...formData, startDate: s })}
                                    placeholder="اختر تاريخ"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="تاريخ الانتهاء" style={{ marginBottom: 12 }}>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    value={formData.endDate ? dayjs(formData.endDate) : null}
                                    onChange={(_, s) => onChange({ ...formData, endDate: s })}
                                    placeholder="اختر تاريخ"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label="تفعيل فوري" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Switch
                            checked={formData.isActive ?? true}
                            onChange={v => onChange({ ...formData, isActive: v })}
                            checkedChildren="مفعّل"
                            unCheckedChildren="معطل"
                        />
                    </Form.Item>
                </div>
            ),
        },
        {
            key: 'scope',
            label: <span><TeamOutlined /> الجمهور</span>,
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                    <Form.Item label="نطاق العرض" style={{ marginBottom: 12 }}>
                        <Radio.Group
                            value={formData.scope || 'all'}
                            onChange={e => onChange({ ...formData, scope: e.target.value })}
                        >
                            <Space direction="vertical">
                                <Radio value="all">
                                    <Space size={6}>
                                        <GlobalOutlined style={{ color: '#6b7280' }} />
                                        جميع المستخدمين
                                    </Space>
                                </Radio>
                                <Radio value="accountTypes">
                                    <Space size={6}>
                                        <TeamOutlined style={{ color: '#6b7280' }} />
                                        حسب نوع الحساب
                                    </Space>
                                </Radio>
                                <Radio value="countries">
                                    <Space size={6}>
                                        <GlobalOutlined style={{ color: '#6b7280' }} />
                                        حسب الدولة
                                    </Space>
                                </Radio>
                            </Space>
                        </Radio.Group>
                    </Form.Item>
                    {formData.scope === 'accountTypes' && (
                        <Form.Item label="أنواع الحسابات المستهدفة" style={{ marginBottom: 0 }}>
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                value={formData.targetAccountTypes || []}
                                onChange={v => onChange({ ...formData, targetAccountTypes: v })}
                                options={ACCOUNT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                placeholder="اختر أنواع الحسابات..."
                            />
                        </Form.Item>
                    )}
                </div>
            ),
        },
        {
            key: 'limits',
            label: <span><AppstoreOutlined /> الحدود</span>,
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                    <Form.Item label="نوع حد الاستخدام" style={{ marginBottom: 12 }}>
                        <Radio.Group
                            value={formData.usageLimitType || 'unlimited'}
                            onChange={e => onChange({ ...formData, usageLimitType: e.target.value })}
                        >
                            <Space direction="vertical">
                                <Radio value="unlimited">
                                    <Space size={6}>
                                        <InfoOutlined style={{ color: '#6b7280' }} />
                                        غير محدود
                                    </Space>
                                </Radio>
                                <Radio value="total">حد إجمالي</Radio>
                                <Radio value="perUser">مرة لكل مستخدم</Radio>
                            </Space>
                        </Radio.Group>
                    </Form.Item>
                    {formData.usageLimitType === 'total' && (
                        <Form.Item label="الحد الأقصى للاستخدام" style={{ marginBottom: 0 }}>
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                value={formData.totalUsageLimit || undefined}
                                onChange={v => onChange({ ...formData, totalUsageLimit: v })}
                                placeholder="100"
                            />
                        </Form.Item>
                    )}
                </div>
            ),
        },
        {
            key: 'conditions',
            label: <span><AppstoreOutlined /> الشروط</span>,
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                    <Form.Item label="الباقات المؤهلة" style={{ marginBottom: 12 }}>
                        {availablePlans && availablePlans.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {availablePlans.map(plan => {
                                    const isSelected = formData.applicablePlans?.includes(plan.id);
                                    return (
                                        <Tag
                                            key={plan.id}
                                            color={isSelected ? 'green' : 'default'}
                                            style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
                                            onClick={() => {
                                                const current = formData.applicablePlans || [];
                                                const updated = isSelected
                                                    ? current.filter((p: string) => p !== plan.id)
                                                    : [...current, plan.id];
                                                onChange({ ...formData, applicablePlans: updated });
                                            }}
                                        >
                                            {plan.title || plan.name}
                                        </Tag>
                                    );
                                })}
                            </div>
                        ) : (
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>لا توجد باقات — يطبق على الجميع</span>
                        )}
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item label="الحد الأدنى للاعبين" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    value={formData.minPlayers || undefined}
                                    onChange={v => onChange({ ...formData, minPlayers: v })}
                                    placeholder="0"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="الحد الأدنى للمبلغ (USD)" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    value={formData.minAmount || undefined}
                                    onChange={v => onChange({ ...formData, minAmount: v })}
                                    placeholder="0"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </div>
            ),
        },
    ];

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <Modal
                open={isOpen}
                onCancel={onClose}
                onOk={onSave}
                okText={isEditing ? 'حفظ التعديلات' : 'إنشاء العرض'}
                cancelText="إلغاء"
                confirmLoading={isSaving}
                okButtonProps={{ disabled: !formData.title || !formData.discountValue }}
                title={
                    <Space>
                        <GiftOutlined style={{ color: '#059669' }} />
                        <span>{isEditing ? 'تعديل العرض' : 'إضافة عرض ترويجي'}</span>
                    </Space>
                }
                width={620}
                destroyOnClose
            >
                <Form layout="vertical" size="middle" style={{ marginTop: 8 }}>
                    <Tabs items={tabItems} size="small" />
                </Form>
            </Modal>
        </ConfigProvider>
    );
}
