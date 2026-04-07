'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import {
    ConfigProvider, Table, Tabs, Card, Statistic, Button, Input, Tag, Switch,
    Modal, Form, Select, InputNumber, DatePicker, Space, Typography, Empty,
    Tooltip, Badge as AntBadge, Row, Col, Spin, App
} from 'antd';
import {
    UserOutlined, TrophyOutlined, DollarOutlined, RiseOutlined,
    SearchOutlined, CopyOutlined, PlusOutlined, DownloadOutlined,
    BankOutlined, BookOutlined, HistoryOutlined, ThunderboltOutlined,
    CalendarOutlined, GiftOutlined, BarChartOutlined, TeamOutlined,
    ClockCircleOutlined, LinkOutlined
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type { ColumnsType } from 'antd/es/table';
import { PlayerJoinRequest, OrganizationReferral } from '@/types/organization-referral';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';

const { Title, Text } = Typography;
const { Option } = Select;

const ANTD_THEME = {
    token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: 'inherit' },
};

interface GlobalReferralStats {
    totalReferrals: number;
    totalPointsDistributed: number;
    totalEarningsDistributed: number;
    activeOrgCodes: number;
    pendingJoinRequests: number;
}

interface TopReferrer {
    userId: string;
    referralCount: number;
    totalEarnings: number;
}

const ORG_TYPE_LABELS: Record<string, string> = {
    club: 'نادي', academy: 'أكاديمية', trainer: 'مدرب', agent: 'وكيل',
};
const ORG_TYPE_COLORS: Record<string, string> = {
    club: 'green', academy: 'blue', trainer: 'gold', agent: 'purple',
};

export default function AdminReferralsManagement() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<GlobalReferralStats>({
        totalReferrals: 0,
        totalPointsDistributed: 0,
        totalEarningsDistributed: 0,
        activeOrgCodes: 0,
        pendingJoinRequests: 0,
    });

    const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
    const [allJoinRequests, setAllJoinRequests] = useState<PlayerJoinRequest[]>([]);
    const [allOrgReferrals, setAllOrgReferrals] = useState<OrganizationReferral[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    // Create Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [orgSearchResults, setOrgSearchResults] = useState<any[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
    const [form] = Form.useForm();

    // --- Toggle Code Status ---
    const handleToggleCode = async (refId: string, currentStatus: boolean) => {
        try {
            const refDoc = allOrgReferrals.find(r => r.id === refId);
            if (!refDoc) return;
            await organizationReferralService.updateOrganizationReferral(refId, refDoc.organizationId, {
                isActive: !currentStatus,
            });
            setAllOrgReferrals(prev => prev.map(r => r.id === refId ? { ...r, isActive: !currentStatus } : r));
            toast.success(!currentStatus ? 'تم تفعيل الكود' : 'تم تعطيل الكود');
        } catch {
            toast.error('حدث خطأ أثناء تحديث حالة الكود');
        }
    };

    // --- Search organizations ---
    const handleOrgSearch = async (term: string, orgType: string) => {
        if (term.length < 2) { setOrgSearchResults([]); return; }
        try {
            const tableName = orgType === 'club' ? 'clubs' : orgType === 'academy' ? 'academies' : orgType === 'trainer' ? 'trainers' : 'agents';
            const nameField = orgType === 'club' ? 'club_name' : orgType === 'academy' ? 'academy_name' : orgType === 'trainer' ? 'trainer_name' : 'agent_name';
            const { data } = await supabase.from(tableName).select('*').limit(10);
            const results = (data || [])
                .map((d: any) => ({ id: d.id, name: d[nameField] || d.full_name || d.name || d.id }))
                .filter((r: any) => r.name.toLowerCase().includes(term.toLowerCase()));
            setOrgSearchResults(results);
        } catch {
            setOrgSearchResults([]);
        }
    };

    // --- Create Referral Code ---
    const handleCreateCode = async () => {
        try {
            const values = await form.validateFields();
            const name = selectedOrg?.name || values.organizationName;
            const id = selectedOrg?.id || values.organizationId;
            if (!name || !id) {
                toast.error('يرجى تحديد المنظمة وإدخال بياناتها');
                return;
            }
            setCreating(true);
            await organizationReferralService.createOrganizationReferral(
                id,
                values.organizationType,
                name,
                {
                    description: values.description || undefined,
                    maxUsage: values.maxUsage || undefined,
                    expiresAt: values.expiresAt ? values.expiresAt.toDate() : undefined,
                }
            );
            toast.success(`تم إنشاء كود إحالة لـ ${name} بنجاح`);
            setShowCreateModal(false);
            setSelectedOrg(null);
            setOrgSearchResults([]);
            form.resetFields();
            loadAdminData();
        } catch (e: any) {
            if (e?.errorFields) return; // validation error, don't show toast
            toast.error(e.message || 'حدث خطأ أثناء إنشاء الكود');
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        if (user?.id) loadAdminData();
    }, [user]);

    const loadAdminData = async () => {
        try {
            setLoading(true);
            const [referralsRes, rewardsRes, requestsRes, orgRefsRes, transactionsRes] = await Promise.all([
                supabase.from('referrals').select('*').limit(100),
                supabase.from('player_rewards').select('*').order('referralCount', { ascending: false }).limit(50),
                supabase.from('player_join_requests').select('*').order('requestedAt', { ascending: false }).limit(100),
                supabase.from('organization_referrals').select('*').order('createdAt', { ascending: false }),
                supabase.from('point_transactions').select('*').order('timestamp', { ascending: false }).limit(50),
            ]);

            const referralsData = referralsRes.data || [];
            const rewardsData = rewardsRes.data || [];
            const requestsData = requestsRes.data || [];
            const orgRefsData = orgRefsRes.data || [];
            const transactionsData = transactionsRes.data || [];

            let totalPoints = 0, totalEarnings = 0;
            rewardsData.forEach((d: any) => {
                totalPoints += d.totalPoints || 0;
                totalEarnings += d.totalEarnings || 0;
            });

            setStats({
                totalReferrals: referralsData.length,
                totalPointsDistributed: totalPoints,
                totalEarningsDistributed: totalEarnings,
                activeOrgCodes: orgRefsData.filter((d: any) => d.isActive).length,
                pendingJoinRequests: requestsData.filter((d: any) => d.status === 'pending').length,
            });

            setTopReferrers(rewardsData.map((d: any) => ({
                userId: d.id,
                referralCount: d.referralCount || 0,
                totalEarnings: d.totalEarnings || 0,
            })));

            setAllJoinRequests(requestsData as PlayerJoinRequest[]);
            setAllOrgReferrals(orgRefsData as OrganizationReferral[]);
            setRecentTransactions(transactionsData);
        } catch (err) {
            console.error('Error loading admin referral data:', err);
            toast.error('حدث خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = useMemo(() => {
        return allJoinRequests.filter(req => {
            const term = searchTerm.toLowerCase();
            return (req.playerName || '').toLowerCase().includes(term) ||
                (req.organizationName || '').toLowerCase().includes(term);
        });
    }, [allJoinRequests, searchTerm]);

    const filteredOrgRefs = useMemo(() => {
        return allOrgReferrals.filter(ref =>
            (ref.organizationName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ref.referralCode || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allOrgReferrals, searchTerm]);

    // ─── Table Columns ────────────────────────────────────────────
    const orgRefColumns: ColumnsType<OrganizationReferral> = [
        {
            title: 'المنظمة',
            key: 'org',
            render: (_, ref) => (
                <Space>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8, background: '#f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                        {ref.organizationType === 'academy' ? '🎓' :
                            ref.organizationType === 'trainer' ? '🏋️' :
                                ref.organizationType === 'agent' ? '💼' : '🏟️'}
                    </div>
                    <div>
                        <Text strong style={{ display: 'block' }}>{ref.organizationName}</Text>
                        <Tag color={ORG_TYPE_COLORS[ref.organizationType] || 'default'} style={{ fontSize: 10, marginTop: 2 }}>
                            {ORG_TYPE_LABELS[ref.organizationType] || ref.organizationType}
                        </Tag>
                    </div>
                </Space>
            ),
        },
        {
            title: 'كود الإحالة',
            key: 'code',
            render: (_, ref) => (
                <Space>
                    <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 13, padding: '2px 10px' }}>
                        {ref.referralCode}
                    </Tag>
                    <Tooltip title="نسخ الكود">
                        <Button
                            type="text" size="small" icon={<CopyOutlined />}
                            onClick={() => { navigator.clipboard.writeText(ref.referralCode); toast.success('تم نسخ الكود'); }}
                        />
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: 'الاستخدام',
            key: 'usage',
            render: (_, ref) => (
                <div>
                    <Text strong>{ref.currentUsage}</Text>
                    <Text type="secondary"> / {ref.maxUsage ?? '∞'}</Text>
                    {ref.expiresAt && (
                        <div style={{ marginTop: 2 }}>
                            <Text type="warning" style={{ fontSize: 11 }}>
                                <CalendarOutlined /> ينتهي {new Date(ref.expiresAt as any).toLocaleDateString('ar-EG')}
                            </Text>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'الحالة',
            key: 'status',
            render: (_, ref) => (
                <Switch
                    checked={ref.isActive}
                    onChange={() => handleToggleCode(ref.id, ref.isActive)}
                    checkedChildren="نشط"
                    unCheckedChildren="معطل"
                    size="small"
                />
            ),
        },
        {
            title: 'التاريخ',
            key: 'date',
            render: (_, ref) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {ref.createdAt ? new Date(ref.createdAt as any).toLocaleDateString('ar-EG') : '-'}
                </Text>
            ),
        },
        {
            title: 'رابط',
            key: 'link',
            render: (_, ref) => (
                <Tooltip title="نسخ رابط الدعوة">
                    <Button
                        type="text" icon={<LinkOutlined />}
                        onClick={() => { navigator.clipboard.writeText(ref.inviteLink || ''); toast.success('تم نسخ رابط الدعوة'); }}
                    />
                </Tooltip>
            ),
        },
    ];

    const transactionColumns: ColumnsType<any> = [
        {
            title: '',
            key: 'icon',
            width: 48,
            render: () => (
                <div style={{ width: 32, height: 32, background: '#ecfdf5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ThunderboltOutlined style={{ color: '#059669' }} />
                </div>
            ),
        },
        { title: 'المستفيد (ID)', dataIndex: 'playerId', key: 'player', render: v => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: 'النقاط', dataIndex: 'points', key: 'pts', render: v => <Text strong style={{ color: '#059669' }}>+{(v || 0).toLocaleString()}</Text> },
        { title: 'السبب', dataIndex: 'reason', key: 'reason', render: v => <Text>{v}</Text> },
        {
            title: 'التوقيت', dataIndex: 'timestamp', key: 'time',
            render: v => <Text type="secondary" style={{ fontSize: 11 }}>{v ? new Date(v).toLocaleString('ar-EG') : '-'}</Text>,
        },
    ];

    const joinRequestColumns: ColumnsType<PlayerJoinRequest> = [
        {
            title: 'اللاعب',
            key: 'player',
            render: (_, req) => (
                <Space>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8, background: '#e0e7ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, color: '#4f46e5',
                    }}>
                        {(req.playerName || '?').charAt(0)}
                    </div>
                    <div>
                        <Text strong style={{ display: 'block' }}>{req.playerName || '-'}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{req.playerEmail || '-'}</Text>
                    </div>
                </Space>
            ),
        },
        { title: 'الجهة المطلوبة', dataIndex: 'organizationName', key: 'org', render: v => <Text strong style={{ color: '#4f46e5' }}>{v || '-'}</Text> },
        {
            title: 'النوع', dataIndex: 'organizationType', key: 'type',
            render: v => <Tag color={ORG_TYPE_COLORS[v] || 'default'}>{ORG_TYPE_LABELS[v] || v || '-'}</Tag>,
        },
        { title: 'الكود', dataIndex: 'referralCode', key: 'code', render: v => <Tag style={{ fontFamily: 'monospace' }}>{v || '-'}</Tag> },
        {
            title: 'الحالة', dataIndex: 'status', key: 'status',
            render: v => (
                <Tag color={v === 'pending' ? 'orange' : v === 'approved' ? 'green' : 'red'}>
                    {v === 'pending' ? 'قيد الانتظار' : v === 'approved' ? 'مقبول' : 'مرفوض'}
                </Tag>
            ),
        },
        {
            title: 'التاريخ', dataIndex: 'requestedAt', key: 'date',
            render: v => <Text type="secondary" style={{ fontSize: 11 }}>{v ? new Date(v).toLocaleDateString('ar-EG') : '-'}</Text>,
        },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <Spin size="large" />
        </div>
    );

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <div style={{ padding: '24px 32px', background: '#f9fafb', minHeight: '100vh' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <Space align="center" style={{ marginBottom: 8 }}>
                            <div style={{ width: 42, height: 42, background: '#6366f1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TeamOutlined style={{ color: '#fff', fontSize: 20 }} />
                            </div>
                            <Title level={3} style={{ margin: 0, fontWeight: 900 }}>إدارة سفراء الحلم</Title>
                        </Space>
                        <Text type="secondary">مركز التحكم الشامل لجميع السفراء وأكواد الإحالة وطلبات الانضمام</Text>
                    </div>
                    <Space>
                        <Button icon={<DownloadOutlined />} onClick={() => toast.success('جاري تصدير البيانات...')}>
                            تصدير التقارير
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setShowCreateModal(true)}
                            style={{ background: '#059669', borderColor: '#059669' }}
                        >
                            إنشاء كود إحالة
                        </Button>
                    </Space>
                </div>

                {/* Stats */}
                <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                    {[
                        { label: 'إجمالي الإحالات', value: stats.totalReferrals, icon: <UserOutlined />, color: '#3b82f6' },
                        { label: 'نقاط موزعة', value: stats.totalPointsDistributed, icon: <TrophyOutlined />, color: '#f59e0b' },
                        { label: 'أرباح المحيلين', value: `$${stats.totalEarningsDistributed.toFixed(0)}`, icon: <DollarOutlined />, color: '#059669', isStr: true },
                        { label: 'أكواد نشطة', value: stats.activeOrgCodes, icon: <GiftOutlined />, color: '#8b5cf6' },
                        { label: 'طلبات معلقة', value: stats.pendingJoinRequests, icon: <ClockCircleOutlined />, color: '#f97316' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={6} lg={4} xl={4} flex="1">
                            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, background: s.color + '15',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 8px', fontSize: 20, color: s.color,
                                    }}>
                                        {s.icon}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>{s.label}</Text>
                                    <Text style={{ fontSize: 22, fontWeight: 900 }}>{s.isStr ? s.value : (s.value as number).toLocaleString()}</Text>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Search Bar */}
                <div style={{ marginBottom: 16 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="بحث في النظام..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ maxWidth: 360, borderRadius: 10 }}
                        allowClear
                    />
                </div>

                {/* Main Tabs */}
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    type="card"
                    items={[
                        {
                            key: 'overview',
                            label: <><BarChartOutlined /> نظرة عامة</>,
                            children: (
                                <Row gutter={[24, 24]}>
                                    {/* Placeholder Chart */}
                                    <Col xs={24} lg={16}>
                                        <Card bordered={false} style={{ borderRadius: 16, minHeight: 360 }}
                                            title={<><RiseOutlined /> نمو الإحالات الأسبوعي</>}
                                            extra={<Tag>آخر 30 يوم</Tag>}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, background: '#f0f4ff', borderRadius: 12 }}>
                                                <div style={{ textAlign: 'center', color: '#a5b4fc' }}>
                                                    <BarChartOutlined style={{ fontSize: 64 }} />
                                                    <div style={{ marginTop: 12, color: '#6b7280' }}>سيتم ربط المخططات البيانية بـ Recharts قريباً</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </Col>

                                    {/* Top Referrers */}
                                    <Col xs={24} lg={8}>
                                        <Card bordered={false} style={{ borderRadius: 16 }}
                                            title={<><TrophyOutlined style={{ color: '#f59e0b' }} /> قائمة الأوائل</>}
                                        >
                                            {topReferrers.length === 0 ? (
                                                <Empty description="لا توجد بيانات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    {topReferrers.slice(0, 8).map((ref, i) => (
                                                        <div key={ref.userId} style={{
                                                            display: 'flex', alignItems: 'center', gap: 12,
                                                            padding: '10px 12px', borderRadius: 10,
                                                            background: i < 3 ? '#fefce8' : '#f9fafb',
                                                            border: `1px solid ${i < 3 ? '#fef08a' : '#f3f4f6'}`,
                                                        }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <div style={{
                                                                    width: 38, height: 38, borderRadius: 10,
                                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: '#fff', fontWeight: 900, fontSize: 13,
                                                                }}>
                                                                    {ref.userId.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                {i < 3 && (
                                                                    <div style={{
                                                                        position: 'absolute', top: -4, right: -4,
                                                                        width: 18, height: 18, background: '#f59e0b',
                                                                        borderRadius: '50%', border: '2px solid #fff',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: 9, color: '#fff', fontWeight: 900,
                                                                    }}>{i + 1}</div>
                                                                )}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <Text strong style={{ fontSize: 12, display: 'block' }}>{ref.userId.substring(0, 12)}...</Text>
                                                                <Text type="secondary" style={{ fontSize: 11 }}>{ref.referralCount} إحالة</Text>
                                                            </div>
                                                            <Text strong style={{ fontSize: 13 }}>${ref.totalEarnings.toFixed(0)}</Text>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    </Col>
                                </Row>
                            ),
                        },
                        {
                            key: 'org_referrals',
                            label: <><GiftOutlined /> أكواد المنظمات</>,
                            children: (
                                <Card bordered={false} style={{ borderRadius: 16 }}
                                    extra={
                                        <Space>
                                            <Text type="secondary">{filteredOrgRefs.length} كود مسجّل</Text>
                                            <Button
                                                type="primary" size="small" icon={<PlusOutlined />}
                                                onClick={() => setShowCreateModal(true)}
                                                style={{ background: '#059669', borderColor: '#059669' }}
                                            >
                                                كود جديد
                                            </Button>
                                        </Space>
                                    }
                                >
                                    <Table
                                        columns={orgRefColumns}
                                        dataSource={filteredOrgRefs}
                                        rowKey="id"
                                        size="middle"
                                        locale={{ emptyText: <Empty description="لا توجد أكواد بعد" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                        pagination={{ pageSize: 15, showTotal: total => `${total} كود` }}
                                        scroll={{ x: 700 }}
                                    />
                                </Card>
                            ),
                        },
                        {
                            key: 'join_requests',
                            label: (
                                <>
                                    <ClockCircleOutlined /> طلبات الانضمام
                                    {stats.pendingJoinRequests > 0 && (
                                        <AntBadge count={stats.pendingJoinRequests} size="small" style={{ marginRight: 6 }} />
                                    )}
                                </>
                            ),
                            children: (
                                <Card bordered={false} style={{ borderRadius: 16 }}>
                                    <Table
                                        columns={joinRequestColumns}
                                        dataSource={filteredRequests}
                                        rowKey="id"
                                        size="middle"
                                        locale={{ emptyText: <Empty description="لا توجد طلبات" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                        pagination={{ pageSize: 15, showTotal: total => `${total} طلب` }}
                                        scroll={{ x: 700 }}
                                    />
                                </Card>
                            ),
                        },
                        {
                            key: 'transactions',
                            label: <><HistoryOutlined /> سجل العمليات</>,
                            children: (
                                <Card
                                    bordered={false}
                                    style={{ borderRadius: 16 }}
                                    title={<><HistoryOutlined /> سجل توزيع المكافآت الأخير</>}
                                >
                                    <Table
                                        columns={transactionColumns}
                                        dataSource={recentTransactions}
                                        rowKey="id"
                                        size="middle"
                                        locale={{ emptyText: <Empty description="لا توجد عمليات" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                        pagination={{ pageSize: 20, showTotal: total => `${total} عملية` }}
                                        scroll={{ x: 600 }}
                                    />
                                </Card>
                            ),
                        },
                    ]}
                />

                {/* ─── Create Code Modal ─────────────────────────────────── */}
                <Modal
                    open={showCreateModal}
                    onCancel={() => { setShowCreateModal(false); setSelectedOrg(null); setOrgSearchResults([]); form.resetFields(); }}
                    onOk={handleCreateCode}
                    okText="إنشاء الكود"
                    cancelText="إلغاء"
                    confirmLoading={creating}
                    okButtonProps={{ style: { background: '#059669', borderColor: '#059669' } }}
                    title={
                        <Space>
                            <PlusOutlined style={{ color: '#059669' }} />
                            إنشاء كود إحالة جديد
                        </Space>
                    }
                    width={560}
                    destroyOnClose
                >
                    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                        {/* Organization Type */}
                        <Form.Item name="organizationType" label="نوع المنظمة" initialValue="club" rules={[{ required: true }]}>
                            <Select onChange={() => { setSelectedOrg(null); setOrgSearchResults([]); }}>
                                <Option value="club">🏟️ نادي</Option>
                                <Option value="academy">🎓 أكاديمية</Option>
                                <Option value="trainer">🏋️ مدرب</Option>
                                <Option value="agent">💼 وكيل</Option>
                            </Select>
                        </Form.Item>

                        {/* Organization Search */}
                        <Form.Item label="ابحث عن المنظمة في النظام">
                            <Input.Search
                                placeholder="ابحث باسم المنظمة..."
                                onSearch={term => handleOrgSearch(term, form.getFieldValue('organizationType') || 'club')}
                                onChange={e => { if (!e.target.value) { setOrgSearchResults([]); setSelectedOrg(null); } }}
                                allowClear
                                enterButton
                            />
                            {orgSearchResults.length > 0 && (
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 8, overflow: 'hidden' }}>
                                    {orgSearchResults.map(org => (
                                        <div
                                            key={org.id}
                                            onClick={() => {
                                                setSelectedOrg(org);
                                                form.setFieldsValue({ organizationName: org.name, organizationId: org.id });
                                                setOrgSearchResults([]);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '10px 14px', cursor: 'pointer',
                                                borderBottom: '1px solid #f3f4f6',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                        >
                                            <div style={{
                                                width: 32, height: 32, background: '#e0e7ff', borderRadius: 6,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 900, color: '#4f46e5',
                                            }}>
                                                {org.name.charAt(0)}
                                            </div>
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{org.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}>{org.id.slice(0, 16)}...</Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedOrg && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
                                    padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8,
                                }}>
                                    <Text strong style={{ color: '#065f46', flex: 1 }}>{selectedOrg.name}</Text>
                                    <Button size="small" type="text" onClick={() => { setSelectedOrg(null); form.setFieldsValue({ organizationName: '', organizationId: '' }); }}>✕</Button>
                                </div>
                            )}
                        </Form.Item>

                        {/* Manual fallback */}
                        {!selectedOrg && (
                            <Row gutter={12}>
                                <Col span={12}>
                                    <Form.Item name="organizationName" label="اسم المنظمة (يدوي)">
                                        <Input placeholder="مثال: نادي الأهلي" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="organizationId" label="معرّف المنظمة (ID)">
                                        <Input placeholder="مثال: abc123" style={{ fontFamily: 'monospace' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        )}

                        {/* Optional settings */}
                        <Row gutter={12}>
                            <Col span={24}>
                                <Form.Item name="description" label="وصف الكود (اختياري)">
                                    <Input placeholder="مثال: كود الموسم الجديد" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="maxUsage" label="الحد الأقصى للاستخدام">
                                    <InputNumber placeholder="∞ غير محدود" style={{ width: '100%' }} min={1} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="expiresAt" label="تاريخ الانتهاء (اختياري)">
                                    <DatePicker style={{ width: '100%' }} disabledDate={d => d && d < dayjs().startOf('day')} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>

            </div>
        </ConfigProvider>
    );
}
