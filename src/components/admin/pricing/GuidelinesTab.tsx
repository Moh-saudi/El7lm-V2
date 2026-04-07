'use client';

import React, { useState, useEffect } from 'react';
import { Card, Select, Form, Input, Button, Space, Tag, Typography, Spin, Row, Col, List, Empty, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, TagOutlined, StarOutlined, UserOutlined, MessageOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import { ConfigProvider, App } from 'antd';
import arEG from 'antd/locale/ar_EG';
import { PricingService } from '@/lib/pricing/pricing-service';

const { TextArea } = Input;
const { Text, Title } = Typography;

const ANTD_THEME = {
    token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'inherit' },
    components: { Card: { borderRadiusLG: 12 } },
};

function GuidelinesContent() {
    const { message } = App.useApp();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [badges, setBadges] = useState<string[]>([]);
    const [highlights, setHighlights] = useState<string[]>([]);
    const [recommendedFor, setRecommendedFor] = useState('');
    const [description, setDescription] = useState('');
    const [newBadge, setNewBadge] = useState('');
    const [newHighlight, setNewHighlight] = useState('');

    useEffect(() => { loadPlans(); }, []);

    useEffect(() => {
        if (selectedPlanId) {
            const plan = plans.find(p => p.id === selectedPlanId);
            if (plan) {
                setBadges(plan.badges || []);
                setHighlights(plan.highlights || []);
                setRecommendedFor(plan.recommendedFor || '');
                setDescription(plan.description || '');
            }
        }
    }, [selectedPlanId, plans]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await PricingService.getAllPlans();
            setPlans(data);
            if (data.length > 0 && !selectedPlanId) setSelectedPlanId(data[0].id);
        } catch {
            message.error('فشل تحميل الباقات');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedPlanId) return;
        setIsSaving(true);
        try {
            const plan = plans.find(p => p.id === selectedPlanId);
            await PricingService.updatePlan({ ...plan, badges, highlights, recommendedFor, description });
            message.success('تم حفظ الإرشادات');
            loadPlans();
        } catch {
            message.error('فشل الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    const addBadge = () => {
        if (!newBadge.trim()) return;
        setBadges(prev => [...prev, newBadge.trim()]);
        setNewBadge('');
    };

    const addHighlight = () => {
        if (!newHighlight.trim()) return;
        setHighlights(prev => [...prev, newHighlight.trim()]);
        setNewHighlight('');
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spin size="large" />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <Title level={5} style={{ margin: 0 }}>الإرشادات والوصف التسويقي</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>الشارات والمميزات والوصف الظاهر للمستخدم</Text>
                </div>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    onClick={handleSave}
                >
                    حفظ التغييرات
                </Button>
            </div>

            {/* Plan selector */}
            <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                <Space>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>الباقة:</Text>
                    <Select
                        value={selectedPlanId}
                        onChange={setSelectedPlanId}
                        style={{ width: 220 }}
                        options={plans.map(p => ({ value: p.id, label: p.title }))}
                    />
                </Space>
            </Card>

            <Row gutter={16}>
                {/* Left: Badges + Highlights */}
                <Col xs={24} lg={12}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Badges */}
                        <Card
                            size="small"
                            title={<Space><TagOutlined style={{ color: '#7c3aed' }} /><span>الشارات</span><Text type="secondary" style={{ fontSize: 11 }}>تظهر فوق البطاقة</Text></Space>}
                        >
                            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                                <Input
                                    size="small"
                                    value={newBadge}
                                    onChange={e => setNewBadge(e.target.value)}
                                    onPressEnter={addBadge}
                                    placeholder="مثال: الأكثر طلباً، موصى به..."
                                />
                                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addBadge} />
                            </Space.Compact>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {badges.length === 0 ? (
                                    <Text type="secondary" italic style={{ fontSize: 12 }}>لا توجد شارات</Text>
                                ) : badges.map((badge, i) => (
                                    <Tag
                                        key={i}
                                        closable
                                        onClose={() => setBadges(prev => prev.filter((_, idx) => idx !== i))}
                                        color="purple"
                                    >
                                        {badge}
                                    </Tag>
                                ))}
                            </div>
                        </Card>

                        {/* Highlights */}
                        <Card
                            size="small"
                            title={<Space><StarOutlined style={{ color: '#f59e0b' }} /><span>النقاط المميزة</span></Space>}
                        >
                            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                                <Input
                                    size="small"
                                    value={newHighlight}
                                    onChange={e => setNewHighlight(e.target.value)}
                                    onPressEnter={addHighlight}
                                    placeholder="مثال: وفّر 35% مع الاشتراك السنوي..."
                                />
                                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addHighlight} />
                            </Space.Compact>
                            {highlights.length === 0 ? (
                                <Empty description="لا توجد نقاط مميزة" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <List
                                    size="small"
                                    dataSource={highlights}
                                    renderItem={(item, index) => (
                                        <List.Item
                                            style={{ background: '#fffbeb', borderRadius: 6, marginBottom: 4, padding: '6px 10px' }}
                                            actions={[
                                                <Button
                                                    key="del"
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => setHighlights(prev => prev.filter((_, i) => i !== index))}
                                                />
                                            ]}
                                        >
                                            <Space size={6}>
                                                <StarOutlined style={{ color: '#f59e0b' }} />
                                                <Text style={{ fontSize: 12 }}>{item}</Text>
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </div>
                </Col>

                {/* Right: Description + Target + Preview */}
                <Col xs={24} lg={12}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Card size="small">
                            <Form layout="vertical" size="small">
                                <Form.Item
                                    label={<Space size={4}><UserOutlined style={{ color: '#3b82f6' }} />الفئة المستهدفة</Space>}
                                >
                                    <Input
                                        value={recommendedFor}
                                        onChange={e => setRecommendedFor(e.target.value)}
                                        placeholder="مثال: الأندية الاحترافية والأكاديميات..."
                                    />
                                </Form.Item>
                                <Divider style={{ margin: '8px 0' }} />
                                <Form.Item
                                    label={<Space size={4}><MessageOutlined style={{ color: '#6b7280' }} />الوصف التسويقي</Space>}
                                >
                                    <TextArea
                                        rows={5}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="اكتب وصفاً جذاباً لهذه الباقة..."
                                    />
                                </Form.Item>
                            </Form>
                        </Card>

                        {/* Live preview */}
                        <Card
                            size="small"
                            title={<Space><EyeOutlined style={{ color: '#60a5fa' }} /><span style={{ color: '#60a5fa', fontSize: 11 }}>معاينة مباشرة</span></Space>}
                            style={{ background: '#111827', borderColor: '#1f2937' }}
                            styles={{ header: { background: '#111827', borderBottom: '1px solid #1f2937' }, body: { background: '#111827' } }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                {badges.length === 0 ? (
                                    <Text style={{ fontSize: 10, color: '#4b5563', fontStyle: 'italic' }}>لا توجد شارات</Text>
                                ) : badges.map((b, i) => (
                                    <span key={i} style={{ fontSize: 10, background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>{b}</span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                {highlights.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                                        <Text style={{ fontSize: 12, color: '#d1d5db' }}>{h}</Text>
                                    </div>
                                ))}
                            </div>
                            {description && (
                                <>
                                    <Divider style={{ borderColor: '#1f2937', margin: '8px 0' }} />
                                    <Text style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>{description}</Text>
                                </>
                            )}
                            {recommendedFor && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                    <UserOutlined style={{ color: '#60a5fa', fontSize: 11 }} />
                                    <Text style={{ fontSize: 11, color: '#60a5fa' }}>{recommendedFor}</Text>
                                </div>
                            )}
                        </Card>
                    </div>
                </Col>
            </Row>
        </div>
    );
}

export default function GuidelinesTab() {
    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <App>
                <GuidelinesContent />
            </App>
        </ConfigProvider>
    );
}
