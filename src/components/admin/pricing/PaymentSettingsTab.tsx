'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  Tag,
  Switch,
  Input,
  Typography,
  Spin,
  Alert,
  List,
  Avatar,
  Popconfirm,
  Descriptions,
  Empty,
  Row,
  Col,
  ConfigProvider,
  App,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  GlobalOutlined,
  CreditCardOutlined,
  SaveOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import { supabase } from '@/lib/supabase/config';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import AddCountryModal from './AddCountryModal';

const { Text, Title } = Typography;

type PaymentType = 'card' | 'wallet' | 'bank_transfer' | 'installment' | 'other';

interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentType;
  enabled: boolean;
  isDefault: boolean;
  accountNumber?: string;
  instructions?: string;
  icon?: string;
  installmentPlans?: number[];
}

interface CountrySettings {
  countryCode: string;
  countryName: string;
  currency: string;
  methods: PaymentMethod[];
}

const DEFAULT_SETTINGS: CountrySettings[] = [
  {
    countryCode: 'EG',
    countryName: 'مصر',
    currency: 'EGP',
    methods: [
      { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
      { id: 'vodafone_cash', name: 'فودافون كاش', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
      { id: 'instapay', name: 'إنستاباي', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
      { id: 'valu', name: 'valU', type: 'installment', enabled: true, isDefault: false, icon: 'EG', installmentPlans: [6, 12, 18, 24] },
      { id: 'sympl', name: 'Sympl', type: 'installment', enabled: true, isDefault: false, icon: 'EG', installmentPlans: [3, 4, 5] },
      { id: 'souhoola', name: 'Souhoola', type: 'installment', enabled: true, isDefault: false, icon: 'EG', installmentPlans: [6, 12, 18, 24] },
      { id: 'contact', name: 'Contact', type: 'installment', enabled: true, isDefault: false, icon: 'EG', installmentPlans: [6, 12, 18, 24] },
      { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' },
    ],
  },
  {
    countryCode: 'QA',
    countryName: 'قطر',
    currency: 'QAR',
    methods: [
      { id: 'skipcash', name: 'SkipCash', type: 'card', enabled: true, isDefault: true, icon: '💳' },
      { id: 'fawran', name: 'خدمة فورا', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
      { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' },
    ],
  },
  {
    countryCode: 'SA',
    countryName: 'السعودية',
    currency: 'SAR',
    methods: [
      { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
      { id: 'stc_pay', name: 'STC Pay', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
      { id: 'tamara', name: 'Tamara', type: 'installment', enabled: true, isDefault: false, icon: '🧾', installmentPlans: [2, 3, 4] },
      { id: 'tabby', name: 'Tabby', type: 'installment', enabled: true, isDefault: false, icon: '💚', installmentPlans: [4] },
      { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' },
    ],
  },
  {
    countryCode: 'GLOBAL',
    countryName: 'دولي (USD)',
    currency: 'USD',
    methods: [
      { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
      { id: 'paypal', name: 'PayPal', type: 'wallet', enabled: true, isDefault: false, icon: '💙' },
      { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' },
    ],
  },
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
  wallet: 'محفظة',
  bank_transfer: 'تحويل',
  installment: 'تقسيط',
  other: 'أخرى',
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
        for (let i = 0; i < loaded.length; i += 1) {
          const { data } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('id', loaded[i].countryCode)
            .single();

          if (data) loaded[i] = { ...loaded[i], ...data } as CountrySettings;
        }
        setSettings(loaded);
      } catch {
        // keep defaults silently
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, []);

  const currentCountry = settings.find((item) => item.countryCode === activeCountry) || settings[0];

  const updateCountry = (updater: (country: CountrySettings) => CountrySettings) => {
    setSettings((prev) =>
      prev.map((country) => (country.countryCode !== activeCountry ? country : updater(country)))
    );
  };

  const handleSave = async () => {
    if (!currentCountry) return;

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
    updateCountry((country) => ({
      ...country,
      methods: country.methods.map((method) =>
        method.id !== methodId ? method : { ...method, ...updates }
      ),
    }));
  };

  const handleAddMethod = (newMethod: PaymentMethod) => {
    updateCountry((country) => ({ ...country, methods: [...country.methods, newMethod] }));
    message.success(`تمت إضافة ${newMethod.name}`);
  };

  const handleAddCountry = (newCountry: CountrySettings) => {
    setSettings((prev) => [...prev, newCountry]);
    setActiveCountry(newCountry.countryCode);
    message.success(`تمت إضافة ${newCountry.countryName}`);
  };

  const handleDeleteMethod = (methodId: string) => {
    updateCountry((country) => ({
      ...country,
      methods: country.methods.filter((method) => method.id !== methodId),
    }));
    message.success('تم حذف طريقة الدفع');
  };

  const tabItems = settings.map((country) => ({
    key: country.countryCode,
    label: (
      <Space size={4}>
        <GlobalOutlined />
        {country.countryName}
        <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{country.currency}</Tag>
      </Space>
    ),
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            إعدادات الدفع
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            طرق الدفع والتقسيط المتاحة لكل دولة
          </Text>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => setIsCountryModalOpen(true)} style={{ borderStyle: 'dashed' }}>
          دولة جديدة
        </Button>
      </div>

      <Tabs activeKey={activeCountry} onChange={setActiveCountry} items={tabItems} type="card" />

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
                <Button size="small" icon={<PlusOutlined />} onClick={() => setIsAddModalOpen(true)}>
                  إضافة طريقة
                </Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
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
                renderItem={(method) => (
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
                        onChange={(value) => updateMethod(method.id, { enabled: value })}
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
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar style={{ background: '#f1f5f9', fontSize: 18 }}>{method.icon || '💳'}</Avatar>}
                      title={
                        <Space size={6}>
                          <Text strong style={{ fontSize: 13 }}>
                            {method.name}
                          </Text>
                          {method.isDefault && (
                            <Tag color="blue" style={{ fontSize: 10 }}>
                              افتراضي
                            </Tag>
                          )}
                          <Tag color={TYPE_COLOR[method.type]} style={{ fontSize: 10 }}>
                            {TYPE_LABEL[method.type] || method.type}
                          </Tag>
                          {method.type === 'installment' && method.installmentPlans?.length ? (
                            <Tag color="purple" style={{ fontSize: 10 }}>
                              {`خطط: ${method.installmentPlans.join(' / ')} أشهر`}
                            </Tag>
                          ) : null}
                        </Space>
                      }
                      description={
                        <div style={{ marginTop: 8 }}>
                          {method.enabled &&
                          method.id !== 'geidea' &&
                          method.id !== 'paypal' &&
                          method.id !== 'skipcash' &&
                          method.id !== 'tamara' &&
                          method.id !== 'tabby' ? (
                            <Row gutter={8} style={{ marginBottom: method.type === 'installment' ? 8 : 0 }}>
                              <Col span={12}>
                                <Input
                                  size="small"
                                  value={method.accountNumber || ''}
                                  onChange={(e) => updateMethod(method.id, { accountNumber: e.target.value })}
                                  placeholder="رقم الحساب / IBAN..."
                                  style={{ fontSize: 11 }}
                                />
                              </Col>
                              <Col span={12}>
                                <Input
                                  size="small"
                                  value={method.instructions || ''}
                                  onChange={(e) => updateMethod(method.id, { instructions: e.target.value })}
                                  placeholder="تعليمات التحويل..."
                                  style={{ fontSize: 11 }}
                                />
                              </Col>
                            </Row>
                          ) : null}

                          {method.type === 'installment' ? (
                            <Input
                              size="small"
                              value={(method.installmentPlans || []).join(', ')}
                              onChange={(e) =>
                                updateMethod(method.id, {
                                  installmentPlans: e.target.value
                                    .split(',')
                                    .map((value) => Number(value.trim()))
                                    .filter((value) => Number.isFinite(value) && value > 0),
                                })
                              }
                              placeholder="خطط التقسيط بالأشهر: 3, 4, 6"
                              style={{ fontSize: 11 }}
                            />
                          ) : null}
                        </div>
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
                    {currentCountry?.methods.filter((method) => method.enabled).length}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="خطط التقسيط">
                  <Text strong style={{ color: '#7c3aed' }}>
                    {currentCountry?.methods
                      .filter((method) => method.type === 'installment' && method.enabled)
                      .map((method) => method.name)
                      .join('، ') || 'لا يوجد'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Alert
              icon={<InfoCircleOutlined />}
              message="يمكنكم تفعيل التقسيط لكل دولة ثم تسجيل الخطط المتاحة مثل 3 أو 4 أو 6 أشهر، وبعدها ربط المزود الحقيقي لاحقًا دون تغيير هيكل البيانات."
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
        existingCodes={settings.map((item) => item.countryCode)}
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
