'use client';

import React, { useState } from 'react';
import { Modal, Input, List, Avatar, Tag, Space, Typography, Select, Divider, ConfigProvider } from 'antd';
import { CreditCardOutlined, SearchOutlined, CheckOutlined } from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';

const { Text } = Typography;

interface PaymentProvider {
    id: string;
    name: string;
    type: 'card' | 'wallet' | 'bank_transfer' | 'other';
    icon: string;
    desc: string;
}

const PROVIDERS: PaymentProvider[] = [
    { id: 'stripe', name: 'Stripe', type: 'card', icon: '💳', desc: 'بطاقات دولية' },
    { id: 'paypal', name: 'PayPal', type: 'wallet', icon: '💙', desc: 'محفظة عالمية' },
    { id: 'vodafone_cash', name: 'Vodafone Cash', type: 'wallet', icon: '📱', desc: 'مصر - فودافون' },
    { id: 'instapay', name: 'InstaPay', type: 'wallet', icon: '⚡', desc: 'مصر - تحويل فوري' },
    { id: 'stc_pay', name: 'STC Pay', type: 'wallet', icon: '📱', desc: 'السعودية' },
    { id: 'skipcash', name: 'SkipCash', type: 'card', icon: '💳', desc: 'قطر' },
    { id: 'zain_cash', name: 'Zain Cash', type: 'wallet', icon: '📱', desc: 'الأردن / العراق' },
    { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', icon: '🏦', desc: 'تحويل مباشر' },
];

const typeColor: Record<string, string> = {
    card: 'blue', wallet: 'green', bank_transfer: 'orange', other: 'default'
};
const typeLabel: Record<string, string> = {
    card: 'بطاقة', wallet: 'محفظة رقمية', bank_transfer: 'تحويل بنكي', other: 'أخرى'
};

const ANTD_THEME = {
    token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
};

interface AddPaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (method: any) => void;
}

export default function AddPaymentMethodModal({ isOpen, onClose, onAdd }: AddPaymentMethodModalProps) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<PaymentProvider | null>(null);
    const [customName, setCustomName] = useState('');
    const [customType, setCustomType] = useState('wallet');

    const filtered = PROVIDERS.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.includes(search)
    );

    const handleConfirm = () => {
        if (selected) {
            onAdd({
                id: selected.id === 'bank_transfer' ? `bank_${Date.now()}` : selected.id,
                name: selected.name,
                type: selected.type,
                enabled: true,
                isDefault: false,
                accountNumber: '',
                icon: selected.icon
            });
        } else if (customName.trim()) {
            onAdd({
                id: `custom_${Date.now()}`,
                name: customName.trim(),
                type: customType,
                enabled: true,
                isDefault: false,
                accountNumber: '',
                icon: customType === 'wallet' ? '📱' : customType === 'bank_transfer' ? '🏦' : '💳'
            });
        }
        setSearch(''); setSelected(null); setCustomName('');
        onClose();
    };

    const canConfirm = !!selected || !!customName.trim();

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <Modal
                open={isOpen}
                onCancel={() => { setSearch(''); setSelected(null); setCustomName(''); onClose(); }}
                onOk={handleConfirm}
                okText="إضافة"
                cancelText="إلغاء"
                okButtonProps={{ disabled: !canConfirm }}
                title={
                    <Space>
                        <CreditCardOutlined style={{ color: '#2563eb' }} />
                        إضافة طريقة دفع
                    </Space>
                }
                width={480}
                destroyOnClose
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="بحث..."
                        allowClear
                    />

                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        <List
                            size="small"
                            dataSource={filtered}
                            renderItem={p => (
                                <List.Item
                                    onClick={() => { setSelected(p); setCustomName(''); }}
                                    style={{
                                        cursor: 'pointer',
                                        background: selected?.id === p.id ? '#eff6ff' : undefined,
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        border: selected?.id === p.id ? '1px solid #bfdbfe' : '1px solid transparent',
                                        marginBottom: 4,
                                    }}
                                    actions={selected?.id === p.id ? [<CheckOutlined key="check" style={{ color: '#2563eb' }} />] : []}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ background: '#f1f5f9', fontSize: 18 }}>{p.icon}</Avatar>}
                                        title={
                                            <Space size={6}>
                                                <Text strong style={{ fontSize: 13, color: selected?.id === p.id ? '#1d4ed8' : undefined }}>
                                                    {p.name}
                                                </Text>
                                                <Tag color={typeColor[p.type]} style={{ fontSize: 10 }}>{typeLabel[p.type]}</Tag>
                                            </Space>
                                        }
                                        description={<Text type="secondary" style={{ fontSize: 11 }}>{p.desc}</Text>}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>

                    <Divider style={{ margin: '4px 0' }}>أو أضف طريقة مخصصة</Divider>

                    <Space>
                        <Input
                            value={customName}
                            onChange={e => { setCustomName(e.target.value); setSelected(null); }}
                            placeholder="اسم طريقة الدفع..."
                            style={{ flex: 1 }}
                        />
                        <Select
                            value={customType}
                            onChange={setCustomType}
                            style={{ width: 140 }}
                            options={[
                                { value: 'wallet', label: 'محفظة' },
                                { value: 'bank_transfer', label: 'تحويل بنكي' },
                                { value: 'card', label: 'بطاقة' },
                                { value: 'other', label: 'أخرى' },
                            ]}
                        />
                    </Space>

                    {canConfirm && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{selected?.icon || '💳'}</span>
                            <Text strong style={{ color: '#1d4ed8', fontSize: 13 }}>{selected?.name || customName}</Text>
                            <Tag color={typeColor[selected?.type || customType]} style={{ marginRight: 'auto', fontSize: 10 }}>
                                {typeLabel[selected?.type || customType]}
                            </Tag>
                        </div>
                    )}
                </div>
            </Modal>
        </ConfigProvider>
    );
}
