'use client';

import React, { useState } from 'react';
import {
  Modal,
  Input,
  List,
  Avatar,
  Tag,
  Space,
  Typography,
  Select,
  Divider,
  ConfigProvider,
} from 'antd';
import { CreditCardOutlined, SearchOutlined, CheckOutlined } from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';

const { Text } = Typography;

type PaymentType = 'card' | 'wallet' | 'bank_transfer' | 'installment' | 'other';

interface PaymentProvider {
  id: string;
  name: string;
  type: PaymentType;
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
  { id: 'tamara', name: 'Tamara', type: 'installment', icon: '🧾', desc: 'تقسيط - السعودية والخليج' },
  { id: 'tabby', name: 'Tabby', type: 'installment', icon: '💚', desc: 'تقسيط - السعودية والخليج' },
  { id: 'valu', name: 'valU', type: 'installment', icon: '🇪🇬', desc: 'مصر - تقسيط مرن' },
  { id: 'sympl', name: 'Sympl', type: 'installment', icon: '🇪🇬', desc: 'مصر - اشتري الآن وادفع لاحقًا' },
  { id: 'souhoola', name: 'Souhoola', type: 'installment', icon: '🇪🇬', desc: 'مصر - تقسيط استهلاكي' },
  { id: 'contact', name: 'Contact', type: 'installment', icon: '🇪🇬', desc: 'مصر - تقسيط وتمويل' },
  { id: 'zain_cash', name: 'Zain Cash', type: 'wallet', icon: '📱', desc: 'الأردن / العراق' },
  { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', icon: '🏦', desc: 'تحويل مباشر' },
];

const TYPE_COLOR: Record<PaymentType, string> = {
  card: 'blue',
  wallet: 'green',
  bank_transfer: 'orange',
  installment: 'purple',
  other: 'default',
};

const TYPE_LABEL: Record<PaymentType, string> = {
  card: 'بطاقة',
  wallet: 'محفظة رقمية',
  bank_transfer: 'تحويل بنكي',
  installment: 'تقسيط',
  other: 'أخرى',
};

const ANTD_THEME = {
  token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
};

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (method: {
    id: string;
    name: string;
    type: PaymentType;
    enabled: boolean;
    isDefault: boolean;
    accountNumber: string;
    icon: string;
    instructions?: string;
    installmentPlans?: number[];
  }) => void;
}

function getInstallmentPlans(providerId: string, type: PaymentType) {
  if (providerId === 'valu' || providerId === 'souhoola' || providerId === 'contact') {
    return [6, 12, 18, 24];
  }
  if (providerId === 'sympl') {
    return [3, 4, 5];
  }
  return type === 'installment' ? [3, 4, 6] : undefined;
}

export default function AddPaymentMethodModal({
  isOpen,
  onClose,
  onAdd,
}: AddPaymentMethodModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PaymentProvider | null>(null);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<PaymentType>('wallet');

  const filtered = PROVIDERS.filter(
    (provider) =>
      provider.name.toLowerCase().includes(search.toLowerCase()) || provider.desc.includes(search)
  );

  const resolveIcon = (type: PaymentType) => {
    if (type === 'wallet') return '📱';
    if (type === 'bank_transfer') return '🏦';
    if (type === 'installment') return '🧾';
    return '💳';
  };

  const handleConfirm = () => {
    if (selected) {
      onAdd({
        id: selected.id === 'bank_transfer' ? `bank_${Date.now()}` : selected.id,
        name: selected.name,
        type: selected.type,
        enabled: true,
        isDefault: false,
        accountNumber: '',
        icon: selected.icon,
        installmentPlans: getInstallmentPlans(selected.id, selected.type),
      });
    } else if (customName.trim()) {
      onAdd({
        id: `custom_${Date.now()}`,
        name: customName.trim(),
        type: customType,
        enabled: true,
        isDefault: false,
        accountNumber: '',
        icon: resolveIcon(customType),
        installmentPlans: customType === 'installment' ? [3, 4, 6] : undefined,
      });
    }

    setSearch('');
    setSelected(null);
    setCustomName('');
    onClose();
  };

  const canConfirm = Boolean(selected) || Boolean(customName.trim());
  const previewType = selected?.type || customType;

  return (
    <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
      <Modal
        open={isOpen}
        onCancel={() => {
          setSearch('');
          setSelected(null);
          setCustomName('');
          onClose();
        }}
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            allowClear
          />

          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            <List
              size="small"
              dataSource={filtered}
              renderItem={(provider) => (
                <List.Item
                  onClick={() => {
                    setSelected(provider);
                    setCustomName('');
                  }}
                  style={{
                    cursor: 'pointer',
                    background: selected?.id === provider.id ? '#eff6ff' : undefined,
                    borderRadius: 8,
                    padding: '8px 12px',
                    border:
                      selected?.id === provider.id
                        ? '1px solid #bfdbfe'
                        : '1px solid transparent',
                    marginBottom: 4,
                  }}
                  actions={
                    selected?.id === provider.id
                      ? [<CheckOutlined key="check" style={{ color: '#2563eb' }} />]
                      : []
                  }
                >
                  <List.Item.Meta
                    avatar={<Avatar style={{ background: '#f1f5f9', fontSize: 18 }}>{provider.icon}</Avatar>}
                    title={
                      <Space size={6}>
                        <Text
                          strong
                          style={{
                            fontSize: 13,
                            color: selected?.id === provider.id ? '#1d4ed8' : undefined,
                          }}
                        >
                          {provider.name}
                        </Text>
                        <Tag color={TYPE_COLOR[provider.type]} style={{ fontSize: 10 }}>
                          {TYPE_LABEL[provider.type]}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {provider.desc}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </div>

          <Divider style={{ margin: '4px 0' }}>أو أضف طريقة مخصصة</Divider>

          <Space>
            <Input
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                setSelected(null);
              }}
              placeholder="اسم طريقة الدفع..."
              style={{ flex: 1 }}
            />
            <Select
              value={customType}
              onChange={(value) => setCustomType(value)}
              style={{ width: 160 }}
              options={[
                { value: 'wallet', label: 'محفظة' },
                { value: 'bank_transfer', label: 'تحويل بنكي' },
                { value: 'card', label: 'بطاقة' },
                { value: 'installment', label: 'تقسيط' },
                { value: 'other', label: 'أخرى' },
              ]}
            />
          </Space>

          {canConfirm && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>{selected?.icon || resolveIcon(previewType)}</span>
              <Text strong style={{ color: '#1d4ed8', fontSize: 13 }}>
                {selected?.name || customName}
              </Text>
              <Tag color={TYPE_COLOR[previewType]} style={{ marginRight: 'auto', fontSize: 10 }}>
                {TYPE_LABEL[previewType]}
              </Tag>
            </div>
          )}
        </div>
      </Modal>
    </ConfigProvider>
  );
}
