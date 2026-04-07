'use client';

import React, { useState } from 'react';
import { Modal, Input, Tag, Space, Typography, ConfigProvider, Empty } from 'antd';
import { GlobalOutlined, SearchOutlined, CheckOutlined } from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';

const { Text } = Typography;

interface CountryPreset {
    code: string;
    name: string;
    currency: string;
    flag: string;
    region: string;
}

const COUNTRY_PRESETS: CountryPreset[] = [
    { code: 'SA', name: 'السعودية', currency: 'SAR', flag: '🇸🇦', region: 'الخليج' },
    { code: 'QA', name: 'قطر', currency: 'QAR', flag: '🇶🇦', region: 'الخليج' },
    { code: 'AE', name: 'الإمارات', currency: 'AED', flag: '🇦🇪', region: 'الخليج' },
    { code: 'KW', name: 'الكويت', currency: 'KWD', flag: '🇰🇼', region: 'الخليج' },
    { code: 'BH', name: 'البحرين', currency: 'BHD', flag: '🇧🇭', region: 'الخليج' },
    { code: 'OM', name: 'عُمان', currency: 'OMR', flag: '🇴🇲', region: 'الخليج' },
    { code: 'EG', name: 'مصر', currency: 'EGP', flag: '🇪🇬', region: 'شمال أفريقيا' },
    { code: 'LY', name: 'ليبيا', currency: 'LYD', flag: '🇱🇾', region: 'شمال أفريقيا' },
    { code: 'TN', name: 'تونس', currency: 'TND', flag: '🇹🇳', region: 'شمال أفريقيا' },
    { code: 'DZ', name: 'الجزائر', currency: 'DZD', flag: '🇩🇿', region: 'شمال أفريقيا' },
    { code: 'MA', name: 'المغرب', currency: 'MAD', flag: '🇲🇦', region: 'شمال أفريقيا' },
    { code: 'SD', name: 'السودان', currency: 'SDG', flag: '🇸🇩', region: 'شمال أفريقيا' },
    { code: 'IQ', name: 'العراق', currency: 'IQD', flag: '🇮🇶', region: 'الشرق الأوسط' },
    { code: 'JO', name: 'الأردن', currency: 'JOD', flag: '🇯🇴', region: 'الشرق الأوسط' },
    { code: 'PS', name: 'فلسطين', currency: 'ILS', flag: '🇵🇸', region: 'الشرق الأوسط' },
    { code: 'LB', name: 'لبنان', currency: 'LBP', flag: '🇱🇧', region: 'الشرق الأوسط' },
    { code: 'SY', name: 'سوريا', currency: 'SYP', flag: '🇸🇾', region: 'الشرق الأوسط' },
    { code: 'YE', name: 'اليمن', currency: 'YER', flag: '🇾🇪', region: 'الشرق الأوسط' },
    { code: 'TR', name: 'تركيا', currency: 'TRY', flag: '🇹🇷', region: 'أخرى' },
    { code: 'GLOBAL', name: 'دولي (USD)', currency: 'USD', flag: '🌍', region: 'عالمي' },
];

const ANTD_THEME = {
    token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
};

interface AddCountryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (country: any) => void;
    existingCodes: string[];
}

export default function AddCountryModal({ isOpen, onClose, onAdd, existingCodes }: AddCountryModalProps) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<CountryPreset | null>(null);

    const filtered = COUNTRY_PRESETS.filter(c =>
        (c.name.includes(search) || c.code.toLowerCase().includes(search.toLowerCase()) || c.region.includes(search)) &&
        !existingCodes.includes(c.code)
    );

    const regions = [...new Set(filtered.map(c => c.region))];

    const handleConfirm = () => {
        if (!selected) return;
        onAdd({
            countryCode: selected.code,
            countryName: selected.name,
            currency: selected.currency,
            methods: [
                { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' },
                ...(selected.code === 'EG' ? [{ id: 'vodafone_cash', name: 'فودافون كاش', type: 'wallet', enabled: true, isDefault: false, icon: '📱' }] : []),
                ...(selected.code === 'QA' ? [{ id: 'skipcash', name: 'SkipCash', type: 'card', enabled: true, isDefault: true, icon: '💳' }] : []),
                ...(selected.code === 'SA' ? [{ id: 'stc_pay', name: 'STC Pay', type: 'wallet', enabled: true, isDefault: false, icon: '📱' }] : []),
                ...(selected.code === 'IQ' ? [{ id: 'zain_cash', name: 'Zain Cash', type: 'wallet', enabled: true, isDefault: false, icon: '📱' }] : []),
            ]
        });
        setSelected(null);
        setSearch('');
        onClose();
    };

    const handleCancel = () => {
        setSearch('');
        setSelected(null);
        onClose();
    };

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <Modal
                open={isOpen}
                onCancel={handleCancel}
                onOk={handleConfirm}
                okText="إضافة"
                cancelText="إلغاء"
                okButtonProps={{ disabled: !selected }}
                title={
                    <Space>
                        <GlobalOutlined style={{ color: '#2563eb' }} />
                        إضافة دولة
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
                        placeholder="بحث عن دولة..."
                        allowClear
                    />

                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <Empty description="لا توجد دول متاحة" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {regions.map(region => (
                                    <div key={region}>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}
                                        >
                                            {region}
                                        </Text>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            {filtered.filter(c => c.region === region).map(country => {
                                                const isSelected = selected?.code === country.code;
                                                return (
                                                    <div
                                                        key={country.code}
                                                        onClick={() => setSelected(country)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            padding: '8px 12px',
                                                            borderRadius: 8,
                                                            border: `1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                                                            background: isSelected ? '#eff6ff' : '#fff',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 18, flexShrink: 0 }}>{country.flag}</span>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <Text strong style={{ fontSize: 12, color: isSelected ? '#1d4ed8' : '#111827', display: 'block' }}>
                                                                {country.name}
                                                            </Text>
                                                            <Text type="secondary" style={{ fontSize: 10 }}>{country.currency}</Text>
                                                        </div>
                                                        {isSelected && <CheckOutlined style={{ color: '#2563eb', fontSize: 12, flexShrink: 0 }} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selected && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: 8,
                        }}>
                            <span style={{ fontSize: 18 }}>{selected.flag}</span>
                            <Text strong style={{ color: '#1d4ed8', fontSize: 13 }}>{selected.name}</Text>
                            <Tag color="blue" style={{ marginRight: 'auto', fontSize: 10 }}>{selected.currency}</Tag>
                        </div>
                    )}
                </div>
            </Modal>
        </ConfigProvider>
    );
}
