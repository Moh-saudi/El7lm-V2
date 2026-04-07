'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useParams, useRouter } from 'next/navigation';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION, BADGES } from '@/types/referral';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { getOrganizationDetails } from '@/utils/player-organization';
import { OrganizationReferral, PlayerJoinRequest } from '@/types/organization-referral';
import {
    ConfigProvider, Card, Button, Input, Tag, Switch, Tabs, Space, Typography,
    Row, Col, Progress, Tooltip, Empty, Spin, Modal, Form, Table, Badge as AntBadge
} from 'antd';
import {
    TrophyOutlined, UserOutlined, CopyOutlined, ShareAltOutlined, QrcodeOutlined,
    TeamOutlined, DollarOutlined, RiseOutlined, GiftOutlined, ClockCircleOutlined,
    CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined, PlusOutlined,
    SearchOutlined, LinkOutlined, SafetyOutlined, FileTextOutlined, ExportOutlined
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import type { ColumnsType } from 'antd/es/table';
import { toast } from 'sonner';

const { Title, Text, Paragraph } = Typography;

const ANTD_THEME = {
    token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: 'inherit' },
};

// Custom config per account type
const ACCOUNT_TYPE_INFO: Record<string, { title: string; subtitle: string; emoji: string; headerColor: string; accent: string; referralLabel: string }> = {
    player: { title: 'سفراء الحلم', subtitle: 'برنامج سفراء المنصة والمكافآت', emoji: '🏆', headerColor: '#4f46e5', accent: '#6366f1', referralLabel: 'اللاعبين المحالين' },
    club:   { title: 'سفراء الحلم - الأندية', subtitle: 'إدارة الانتساب والنمو الرياضي', emoji: '🏟️', headerColor: '#059669', accent: '#10b981', referralLabel: 'اللاعبين المنتسبين' },
    academy: { title: 'سفراء الحلم - الأكاديميات', subtitle: 'إدارة المواهب والانتساب', emoji: '🎓', headerColor: '#4f46e5', accent: '#6366f1', referralLabel: 'المواهب المسجلة' },
    trainer: { title: 'سفراء الحلم - المدربين', subtitle: 'برنامج المدرب السفير والمكافآت', emoji: '🏋️', headerColor: '#db2777', accent: '#ec4899', referralLabel: 'المتدربين المحالين' },
};

interface PlayerRewards {
    playerId: string;
    totalPoints: number;
    availablePoints: number;
    totalEarnings: number;
    referralCount: number;
    badges: any[];
    lastUpdated: any;
}

export default function EnhancedReferralsPage() {
    const { user, userData } = useAuth();
    const params = useParams();
    const router = useRouter();
    const accountType = params.accountType as string;
    const config = ACCOUNT_TYPE_INFO[accountType] || ACCOUNT_TYPE_INFO.player;

    const [loading, setLoading] = useState(true);
    const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
    const [referralCode, setReferralCode] = useState('');
    const [showQR, setShowQR] = useState(false);

    const [organizationReferrals, setOrganizationReferrals] = useState<OrganizationReferral[]>([]);
    const [joinRequests, setJoinRequests] = useState<PlayerJoinRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [newCodeName, setNewCodeName] = useState('');
    const [isCreatingCode, setIsCreatingCode] = useState(false);

    // Join Org
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        if (user?.id) loadInitialData();
    }, [user]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadRewardsAndStats(),
                accountType !== 'player' ? loadOrganizationData() : loadPlayerOnlyData(),
            ]);
        } catch (err) {
            toast.error('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const loadRewardsAndStats = async () => {
        const rewards = await referralService.createOrUpdatePlayerRewards(user!.id);
        setPlayerRewards(rewards);
        const codes = await referralService.getUserReferralCodes(user!.id);
        if (codes && codes.length > 0) {
            setReferralCode(codes[0].referralCode);
        } else {
            const newCode = referralService.generateReferralCode();
            setReferralCode(newCode);
            await referralService.createReferral(user!.id, newCode);
        }
    };

    const loadOrganizationData = async () => {
        const [referrals, requests] = await Promise.all([
            organizationReferralService.getOrganizationReferrals(user!.id),
            organizationReferralService.getOrganizationJoinRequests(user!.id),
        ]);
        setOrganizationReferrals(referrals);
        setJoinRequests(requests);
    };

    const loadPlayerOnlyData = async () => {
        const requests = await organizationReferralService.getPlayerJoinRequests(user!.id);
        setJoinRequests(requests);
    };

    // --- Actions ---

    const handleJoinOrg = async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        try {
            const orgReferral = await organizationReferralService.verifyReferralCode(joinCode.trim());
            if (!orgReferral) { toast.error('كود الانضمام غير صحيح أو منتهي الصلاحية'); return; }
            await organizationReferralService.createJoinRequest(
                user!.id,
                { full_name: userData?.full_name || userData?.name, email: userData?.email, phone: userData?.phone, position: (userData as any)?.primary_position },
                joinCode.trim()
            );
            toast.success(`تم إرسال طلب الانضمام إلى ${orgReferral.organizationName} بنجاح!`);
            setJoinCode('');
            loadPlayerOnlyData();
            setActiveTab('requests');
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء الانضمام');
        } finally {
            setIsJoining(false);
        }
    };

    const handleCreateCode = async () => {
        try {
            setIsCreatingCode(true);
            let orgName = userData?.full_name || userData?.name || 'المنظمة';
            if (accountType === 'club') orgName = userData?.club_name || orgName;
            if (accountType === 'academy') orgName = userData?.academy_name || orgName;
            await organizationReferralService.createOrganizationReferral(user!.id, accountType, orgName, {
                description: newCodeName.trim() || undefined,
            });
            toast.success('تم إنشاء كود إحالة سفير بنجاح');
            setNewCodeName('');
            loadOrganizationData();
        } catch {
            toast.error('فشل في إنشاء الكود');
        } finally {
            setIsCreatingCode(false);
        }
    };

    const toggleCodeStatus = async (ref: OrganizationReferral) => {
        try {
            await organizationReferralService.updateOrganizationReferral(ref.id, user!.id, { isActive: !ref.isActive });
            toast.success(ref.isActive ? 'تم تعطيل الكود' : 'تم تفعيل الكود');
            loadOrganizationData();
        } catch {
            toast.error('حدث خطأ');
        }
    };

    const handleProcessRequest = async (requestId: string, approve: boolean) => {
        try {
            if (approve) {
                await organizationReferralService.approveJoinRequest(requestId, user!.id, userData?.full_name || 'المنظمة');
                toast.success('تم قبول انضمام اللاعب');
            } else {
                await organizationReferralService.rejectJoinRequest(requestId, user!.id, userData?.full_name || 'المنظمة');
                toast.info('تم رفض الطلب');
            }
            loadOrganizationData();
        } catch {
            toast.error('تعذر معالجة الطلب');
        }
    };

    const filteredRequests = useMemo(() => {
        return joinRequests.filter(req =>
            (req.playerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.playerEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [joinRequests, searchTerm]);

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('تم النسخ بنجاح'); };

    const shareViaWhatsApp = (code: string, isOrg = false) => {
        let message = '';
        if (isOrg) {
            const orgName = userData?.academy_name || userData?.club_name || userData?.full_name || 'المنظمة';
            const typeLabel = { academy: 'أكاديمية', club: 'نادي', trainer: 'مدرب', agent: 'وكيل' }[accountType] || 'منظمة';
            message = `انضم إلى *${typeLabel} ${orgName}* على منصة الحلم!\nكود الانضمام: *${code}*\nسجل الآن: https://el7lm.com/auth/register`;
        } else {
            message = `انضم لمنصة الحلم وسجل مهاراتك الرياضية!\nكودي الخاص: *${code}*\nالرابط: https://el7lm.com`;
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // ─── Table Columns ─────────────────────────────────────────
    const orgRefColumns: ColumnsType<OrganizationReferral> = [
        {
            title: 'اسم السفير / الوصف',
            key: 'desc',
            render: (_, ref) => (
                <Space>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: ref.isActive ? '#e0e7ff' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: ref.isActive ? '#4f46e5' : '#9ca3af' }}>
                        {(ref.description || '?').charAt(0)}
                    </div>
                    <div>
                        <Text strong>{ref.description || 'كود سفير غير مسمى'}</Text>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}>{ref.id.slice(0, 10)}...</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'كود الإحالة',
            key: 'code',
            render: (_, ref) => (
                <Space>
                    <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: 2 }}>{ref.referralCode}</Tag>
                    <Tooltip title="نسخ">
                        <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(ref.referralCode)} />
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: 'الاستخدام',
            key: 'usage',
            render: (_, ref) => (
                <div style={{ width: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11 }}>الاستخدام</Text>
                        <Text strong style={{ fontSize: 11 }}>{ref.currentUsage} / {ref.maxUsage || '∞'}</Text>
                    </div>
                    <Progress
                        percent={Math.min(100, (ref.currentUsage / (ref.maxUsage || 100)) * 100)}
                        showInfo={false}
                        size="small"
                        strokeColor={ref.isActive ? '#6366f1' : '#d1d5db'}
                    />
                </div>
            ),
        },
        {
            title: 'الحالة',
            key: 'status',
            render: (_, ref) => (
                <Switch checked={ref.isActive} onChange={() => toggleCodeStatus(ref)} checkedChildren="نشط" unCheckedChildren="معطل" size="small" />
            ),
        },
        {
            title: 'إجراءات',
            key: 'actions',
            render: (_, ref) => (
                <Button
                    size="small"
                    icon={<ShareAltOutlined />}
                    onClick={() => shareViaWhatsApp(ref.referralCode, true)}
                    style={{ background: '#25D366', color: '#fff', border: 'none' }}
                >
                    مشاركة واتساب
                </Button>
            ),
        },
    ];

    const requestColumns: ColumnsType<PlayerJoinRequest> = [
        {
            title: 'اللاعب',
            key: 'player',
            render: (_, req) => (
                <Space>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#4f46e5' }}>
                        {(req.playerName || '?').charAt(0)}
                    </div>
                    <div>
                        <Text strong style={{ display: 'block' }}>{req.playerName || '-'}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{req.playerEmail || '-'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'المركز',
            key: 'pos',
            render: (_, req) => <Tag color="blue">{req.playerData?.position || 'غير محدد'}</Tag>,
        },
        { title: 'تاريخ الطلب', key: 'date', render: (_, req) => <Text type="secondary">{formatDate(req.requestedAt)}</Text> },
        {
            title: 'الحالة',
            key: 'status',
            render: (_, req) => (
                <Tag color={req.status === 'approved' ? 'green' : req.status === 'pending' ? 'orange' : 'red'}>
                    {req.status === 'approved' ? 'مقبول' : req.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                </Tag>
            ),
        },
        {
            title: 'إجراءات',
            key: 'actions',
            render: (_, req) => req.status === 'pending' ? (
                <Space>
                    <Button size="small" type="primary" style={{ background: '#059669', borderColor: '#059669' }} onClick={() => handleProcessRequest(req.id, true)}>قبول</Button>
                    <Button size="small" danger onClick={() => handleProcessRequest(req.id, false)}>رفض</Button>
                </Space>
            ) : (
                <Button size="small" type="text" icon={<FileTextOutlined />}>التفاصيل</Button>
            ),
        },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <Spin size="large" />
        </div>
    );

    const withdrawProgress = Math.min(100, (playerRewards?.availablePoints || 0) / 500);

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', paddingBottom: 48 }}>

                {/* ─── Header Banner ─────────────────────────────────── */}
                <div style={{
                    background: `linear-gradient(135deg, ${config.headerColor}, ${config.accent})`,
                    borderRadius: 24, padding: '40px 48px', color: '#fff', marginBottom: 32,
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', bottom: -60, left: -30, width: 160, height: 160, background: 'rgba(0,0,0,0.1)', borderRadius: '50%' }} />
                    <Row align="middle" justify="space-between" style={{ position: 'relative' }}>
                        <Col>
                            <Space direction="vertical" size={6}>
                                <Space>
                                    <span style={{ fontSize: 32 }}>{config.emoji}</span>
                                    <Tag style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 12 }}>برنامج النخبة</Tag>
                                </Space>
                                <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 900 }}>{config.title}</Title>
                                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                                    {config.subtitle} - قم بدعوة المواهب وابنِ فريقك واكسب مكافآت حصرية.
                                </Text>
                            </Space>
                        </Col>
                        <Col>
                            <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '20px 28px', backdropFilter: 'blur(10px)' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'block', marginBottom: 4 }}>الرصيد القابل للسحب</Text>
                                <Text style={{ color: '#fff', fontSize: 40, fontWeight: 900, display: 'block', lineHeight: 1 }}>${(playerRewards?.totalEarnings || 0).toFixed(0)}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>≈ {(Number(playerRewards?.totalEarnings || 0) * 50).toLocaleString()} ج.م</Text>
                                <Button style={{ marginTop: 12, borderColor: '#fff', color: '#fff', background: 'transparent', display: 'block', width: '100%' }}>
                                    طلب سحب الأرباح
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* ─── Join Organization (Players Only) ─────────────── */}
                {accountType === 'player' && (
                    <Card bordered={false} style={{ borderRadius: 16, marginBottom: 24, background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', border: '2px solid #a7f3d0' }}>
                        <Row align="middle" gutter={[16, 16]}>
                            <Col flex="auto">
                                <Space>
                                    <div style={{ width: 52, height: 52, background: '#fff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>🏟️</div>
                                    <div>
                                        <Title level={5} style={{ margin: 0 }}>الانضمام إلى مؤسسة رياضية</Title>
                                        <Text type="secondary">هل لديك كود دعوة من نادٍ أو أكاديمية؟ أدخله هنا للانضمام فوراً.</Text>
                                    </div>
                                </Space>
                            </Col>
                            <Col flex="0 0 400px" xs={24} md={12}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        placeholder="أدخل كود الانضمام (مثال: ACD-X92F)"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                        style={{ fontFamily: 'monospace', fontSize: 15, textTransform: 'uppercase' }}
                                    />
                                    <Button
                                        type="primary"
                                        loading={isJoining}
                                        disabled={!joinCode.trim()}
                                        onClick={handleJoinOrg}
                                        style={{ background: '#059669', borderColor: '#059669' }}
                                    >
                                        انضمام
                                    </Button>
                                </Space.Compact>
                            </Col>
                        </Row>
                    </Card>
                )}

                {/* ─── Stats Cards ───────────────────────────────────── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {[
                        { label: 'النقاط المتاحة', value: (playerRewards?.availablePoints || 0).toLocaleString(), emoji: '⭐', color: '#f59e0b' },
                        { label: config.referralLabel, value: playerRewards?.referralCount || 0, emoji: '👥', color: '#6366f1' },
                        { label: 'طلبات جديدة', value: joinRequests.filter(r => r.status === 'pending').length, emoji: '⏳', color: '#f97316' },
                        { label: 'مستوى الانتشار', value: '84%', emoji: '📈', color: '#059669' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} sm={6}>
                            <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>{s.emoji}</div>
                                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block' }}>{s.label}</Text>
                                <Text style={{ fontSize: 22, fontWeight: 900 }}>{s.value}</Text>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* ─── Tabs ──────────────────────────────────────────── */}
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    type="card"
                    items={[
                        {
                            key: 'overview',
                            label: <><TrophyOutlined /> نظرة عامة</>,
                            children: (
                                <Row gutter={[24, 24]}>
                                    {/* Personal Referral Code */}
                                    <Col xs={24} lg={16}>
                                        <Card bordered={false} style={{ borderRadius: 16, background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}>
                                            <Title level={4} style={{ color: '#3730a3', margin: 0, marginBottom: 8 }}>كود الإحالة الشخصي</Title>
                                            <Text style={{ color: '#4338ca' }}>شارك كودك مع اللاعبين واكسب 10,000 نقطة عن كل اشتراك جديد.</Text>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, background: '#fff', borderRadius: 12, padding: '14px 20px', border: '2px solid #c7d2fe' }}>
                                                <Text style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, fontFamily: 'monospace', color: '#4f46e5', flex: 1 }}>{referralCode}</Text>
                                                <Tooltip title="نسخ">
                                                    <Button type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(referralCode)} />
                                                </Tooltip>
                                            </div>
                                            <Space style={{ marginTop: 16 }}>
                                                <Button
                                                    style={{ background: '#25D366', color: '#fff', border: 'none' }}
                                                    icon={<ShareAltOutlined />}
                                                    onClick={() => shareViaWhatsApp(referralCode)}
                                                >
                                                    مشاركة واتساب
                                                </Button>
                                                <Button icon={<QrcodeOutlined />} onClick={() => setShowQR(!showQR)}>
                                                    {showQR ? 'إخفاء QR' : 'عرض QR'}
                                                </Button>
                                            </Space>
                                            {showQR && (
                                                <div style={{ textAlign: 'center', marginTop: 20, padding: 24, background: '#fff', borderRadius: 12 }}>
                                                    <div style={{ width: 120, height: 120, background: '#f3f4f6', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e5e7eb' }}>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>QR CODE</Text>
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Text type="secondary">امسح الكود للتسجيل فوراً</Text>
                                                    </div>
                                                </div>
                                            )}
                                        </Card>

                                        {/* Cash conversion progress */}
                                        <Card bordered={false} style={{ borderRadius: 16, background: '#4f46e5', marginTop: 16 }}>
                                            <Title level={4} style={{ color: '#fff', marginBottom: 8 }}>تحويل النقاط إلى كاش</Title>
                                            <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
                                                عند وصول رصيدك إلى الحد الأدنى (50,000 نقطة)، يمكنك تحويلها مباشرة إلى رصيد مالي.
                                            </Paragraph>
                                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>التقدم نحو السحب</Text>
                                                    <Text style={{ color: '#fff', fontWeight: 900 }}>{withdrawProgress.toFixed(0)}%</Text>
                                                </div>
                                                <Progress percent={withdrawProgress} showInfo={false} strokeColor="#fff" trailColor="rgba(255,255,255,0.2)" />
                                            </div>
                                        </Card>
                                    </Col>

                                    {/* Badges */}
                                    <Col xs={24} lg={8}>
                                        <Card bordered={false} style={{ borderRadius: 16 }}
                                            title={<><TrophyOutlined style={{ color: '#f59e0b' }} /> المسار والشارات</>}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {BADGES.REFERRAL_BADGES.slice(0, 4).map((badge: any) => {
                                                    const isEarned = playerRewards?.badges?.some((b: any) => b.id === badge.id);
                                                    return (
                                                        <div key={badge.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: 12,
                                                            padding: '10px 12px', borderRadius: 10,
                                                            background: isEarned ? '#f0fdf4' : '#f9fafb',
                                                            border: `1px solid ${isEarned ? '#bbf7d0' : '#f3f4f6'}`,
                                                            opacity: isEarned ? 1 : 0.65,
                                                        }}>
                                                            <div style={{ fontSize: 24, width: 44, height: 44, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                                                                {badge.icon}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <Text strong style={{ display: 'block', fontSize: 13 }}>{badge.name}</Text>
                                                                <Text type="secondary" style={{ fontSize: 11 }}>{badge.description}</Text>
                                                            </div>
                                                            {isEarned && <CheckCircleOutlined style={{ color: '#059669', fontSize: 16 }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Card>

                                        {/* How to earn */}
                                        <Card bordered={false} style={{ borderRadius: 16, marginTop: 16 }} title="كيفية الربح؟">
                                            {[
                                                { title: 'الإحالة المباشرة', points: '10,000', emoji: '🎯' },
                                                { title: 'مكافأة التسجيل', points: '5,000', emoji: '🎁' },
                                                { title: 'الربح السنوي', points: '20,000', emoji: '👑' },
                                            ].map((item, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                                                    <span style={{ fontSize: 22 }}>{item.emoji}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                                                    </div>
                                                    <Tag color="purple">{item.points} نقطة</Tag>
                                                </div>
                                            ))}
                                        </Card>
                                    </Col>
                                </Row>
                            ),
                        },
                        ...(accountType !== 'player' ? [{
                            key: 'links',
                            label: <><LinkOutlined /> أكواد المنظمة</>,
                            children: (
                                <div>
                                    <Card bordered={false} style={{ borderRadius: 16, marginBottom: 16 }}>
                                        <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
                                            <Input
                                                placeholder="اسم السفير أو الحملة (مثال: كابتن أحمد - حملة الصيف)"
                                                value={newCodeName}
                                                onChange={e => setNewCodeName(e.target.value)}
                                            />
                                            <Button type="primary" icon={<PlusOutlined />} loading={isCreatingCode} onClick={handleCreateCode}>
                                                إنشاء كود
                                            </Button>
                                        </Space.Compact>
                                    </Card>
                                    <Card bordered={false} style={{ borderRadius: 16 }}>
                                        <Table
                                            columns={orgRefColumns}
                                            dataSource={organizationReferrals}
                                            rowKey="id"
                                            size="middle"
                                            locale={{ emptyText: <Empty description="لا توجد أكواد حالياً" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 600 }}
                                        />
                                    </Card>
                                </div>
                            ),
                        }] : []),
                        {
                            key: 'requests',
                            label: (
                                <>
                                    <ClockCircleOutlined /> طلبات الانضمام
                                    {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                                        <AntBadge count={joinRequests.filter(r => r.status === 'pending').length} size="small" style={{ marginRight: 6 }} />
                                    )}
                                </>
                            ),
                            children: (
                                <Card bordered={false} style={{ borderRadius: 16 }}
                                    extra={
                                        <Input
                                            prefix={<SearchOutlined />}
                                            placeholder="بحث..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            style={{ width: 200 }}
                                            allowClear
                                        />
                                    }
                                >
                                    <Table
                                        columns={requestColumns}
                                        dataSource={filteredRequests}
                                        rowKey="id"
                                        size="middle"
                                        locale={{ emptyText: <Empty description="لا توجد طلبات" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                        pagination={{ pageSize: 10 }}
                                        scroll={{ x: 600 }}
                                    />
                                </Card>
                            ),
                        },
                        ...(accountType !== 'player' ? [{
                            key: 'affiliations',
                            label: <><TeamOutlined /> اللاعبين المسجلين</>,
                            children: (
                                <Row gutter={[16, 16]}>
                                    {joinRequests.filter(r => r.status === 'approved').length === 0 ? (
                                        <Col span={24}>
                                            <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', padding: 40 }}>
                                                <Empty description="لم يتم قبول أي لاعبين بعد" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                            </Card>
                                        </Col>
                                    ) : (
                                        joinRequests.filter(r => r.status === 'approved').map(req => (
                                            <Col key={req.id} xs={24} sm={12} lg={8}>
                                                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                                        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#6366f1' }}>
                                                            {(req.playerName || '?').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <Text strong style={{ fontSize: 16, display: 'block' }}>{req.playerName}</Text>
                                                            <Text type="success" style={{ fontSize: 12 }}><CheckCircleOutlined /> لاعب مثبت</Text>
                                                        </div>
                                                    </div>
                                                    <Row gutter={8} style={{ marginBottom: 16 }}>
                                                        <Col span={12}>
                                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>المركز</Text>
                                                            <Text strong>{req.playerData?.position || '-'}</Text>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>عضو منذ</Text>
                                                            <Text strong>{formatDate(req.processedAt || req.requestedAt)}</Text>
                                                        </Col>
                                                    </Row>
                                                    <Button
                                                        block
                                                        icon={<ExportOutlined />}
                                                        onClick={() => router.push(`/dashboard/player/search/profile/player/${req.playerId}`)}
                                                    >
                                                        عرض الملف
                                                    </Button>
                                                </Card>
                                            </Col>
                                        ))
                                    )}
                                </Row>
                            ),
                        }] : []),
                    ]}
                />

                {/* ─── Footer Tips ──────────────────────────────────── */}
                <Row gutter={[24, 24]} style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #f3f4f6' }}>
                    {[
                        { title: 'توسيع الشبكة', desc: 'كلما شاركت كودك في مجموعات رياضية متخصصة، زادت فرصك في استقطاب مواهب حقيقية.', emoji: '🌐' },
                        { title: 'الأمان والخصوصية', desc: 'نظام إحالة الحلم مشفر بالكامل ويضمن وصول المكافآت لمستحقيها بآلية دقيقة.', emoji: '🔒' },
                        { title: 'قواعد المكافآت', desc: 'تخضع المكافآت لشروط الاستخدام، ويتم تدقيق كل حالة انضمام لضمان الجودة.', emoji: '📋' },
                    ].map((tip, i) => (
                        <Col key={i} xs={24} md={8}>
                            <Space align="start">
                                <div style={{ fontSize: 24, width: 44, height: 44, background: '#f9fafb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {tip.emoji}
                                </div>
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{tip.title}</Text>
                                    <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>{tip.desc}</Text>
                                </div>
                            </Space>
                        </Col>
                    ))}
                </Row>
            </div>
        </ConfigProvider>
    );
}
