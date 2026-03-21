'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
} from 'firebase/firestore';
import {
    Users,
    Trophy,
    DollarSign,
    TrendingUp,
    Search,
    CheckCircle2,
    Clock,
    Download,
    Building,
    GraduationCap,
    ArrowUpRight,
    Shield,
    Briefcase,
    Target,
    BarChart3,
    Calendar,
    Gift,
    Activity,
    History,
    Star,
    Plus,
    X,
    Copy,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PlayerJoinRequest, OrganizationReferral } from '@/types/organization-referral';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';

// --- Interfaces ---
interface GlobalReferralStats {
    totalReferrals: number;
    totalPointsDistributed: number;
    totalEarningsDistributed: number;
    activeOrgCodes: number;
    pendingJoinRequests: number;
}

interface TopReferrer {
    userId: string;
    name: string;
    email: string;
    accountType: string;
    referralCount: number;
    totalEarnings: number;
    avatar?: string;
}

export default function AdminReferralsManagement() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<GlobalReferralStats>({
        totalReferrals: 0,
        totalPointsDistributed: 0,
        totalEarningsDistributed: 0,
        activeOrgCodes: 0,
        pendingJoinRequests: 0
    });

    const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
    const [allJoinRequests, setAllJoinRequests] = useState<PlayerJoinRequest[]>([]);
    const [allOrgReferrals, setAllOrgReferrals] = useState<OrganizationReferral[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('overview');

    // --- Create Code Modal ---
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [orgSearch, setOrgSearch] = useState('');
    const [orgSearchResults, setOrgSearchResults] = useState<any[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
    const [createForm, setCreateForm] = useState({
        organizationType: 'club' as 'club' | 'academy' | 'trainer' | 'agent',
        organizationName: '',
        organizationId: '',
        description: '',
        maxUsage: '',
        expiresAt: '',
    });

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
    const handleOrgSearch = async (term: string) => {
        setOrgSearch(term);
        if (term.length < 2) { setOrgSearchResults([]); return; }
        try {
            const type = createForm.organizationType;
            const collectionName = type === 'club' ? 'clubs' : type === 'academy' ? 'academies' : type === 'trainer' ? 'trainers' : 'agents';
            const nameField = type === 'club' ? 'club_name' : type === 'academy' ? 'academy_name' : type === 'trainer' ? 'trainer_name' : 'agent_name';
            const snap = await getDocs(query(collection(db, collectionName), limit(10)));
            const results = snap.docs
                .map(d => ({ id: d.id, name: d.data()[nameField] || d.data().full_name || d.data().name || d.id, ...d.data() }))
                .filter(r => r.name.toLowerCase().includes(term.toLowerCase()));
            setOrgSearchResults(results);
        } catch {
            setOrgSearchResults([]);
        }
    };

    // --- Create Referral Code ---
    const handleCreateCode = async () => {
        const name = selectedOrg?.name || createForm.organizationName;
        const id = selectedOrg?.id || createForm.organizationId;
        if (!name || !id) {
            toast.error('يرجى تحديد المنظمة وإدخال بياناتها');
            return;
        }
        setCreating(true);
        try {
            await organizationReferralService.createOrganizationReferral(
                id,
                createForm.organizationType,
                name,
                {
                    description: createForm.description || undefined,
                    maxUsage: createForm.maxUsage ? parseInt(createForm.maxUsage) : undefined,
                    expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt) : undefined,
                }
            );
            toast.success(`تم إنشاء كود إحالة لـ ${name} بنجاح`);
            setShowCreateModal(false);
            setSelectedOrg(null);
            setOrgSearch('');
            setOrgSearchResults([]);
            setCreateForm({ organizationType: 'club', organizationName: '', organizationId: '', description: '', maxUsage: '', expiresAt: '' });
            loadAdminData();
        } catch (e: any) {
            toast.error(e.message || 'حدث خطأ أثناء إنشاء الكود');
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        if (user?.uid) {
            loadAdminData();
        }
    }, [user]);

    const loadAdminData = async () => {
        try {
            setLoading(true);

            // Parallel loading of all data
            const [
                referralsSnap,
                rewardsSnap,
                requestsSnap,
                orgRefsSnap,
                transactionsSnap
            ] = await Promise.all([
                getDocs(query(collection(db, 'referrals'), limit(100))),
                getDocs(query(collection(db, 'player_rewards'), orderBy('referralCount', 'desc'), limit(50))),
                getDocs(query(collection(db, 'player_join_requests'), orderBy('requestedAt', 'desc'), limit(100))),
                getDocs(query(collection(db, 'organization_referrals'), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'point_transactions'), orderBy('timestamp', 'desc'), limit(50)))
            ]);

            // Calculate Global Stats
            let totalPoints = 0;
            let totalEarnings = 0;
            rewardsSnap.docs.forEach(d => {
                const data = d.data();
                totalPoints += data.totalPoints || 0;
                totalEarnings += data.totalEarnings || 0;
            });

            setStats({
                totalReferrals: referralsSnap.size,
                totalPointsDistributed: totalPoints,
                totalEarningsDistributed: totalEarnings,
                activeOrgCodes: orgRefsSnap.docs.filter(d => d.data().isActive).length,
                pendingJoinRequests: requestsSnap.docs.filter(d => d.data().status === 'pending').length
            });

            // Prepare Top Referrers with user names
            const referrersData: TopReferrer[] = [];
            for (const d of rewardsSnap.docs) {
                const rewards = d.data();
                // Here normally we should fetch names in bulk or rely on flattened data
                referrersData.push({
                    userId: d.id,
                    name: 'جاري التحميل...', // We'll update this or use ID as fallback
                    email: '',
                    accountType: 'player',
                    referralCount: rewards.referralCount || 0,
                    totalEarnings: rewards.totalEarnings || 0
                });
            }
            setTopReferrers(referrersData);

            setAllJoinRequests(requestsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerJoinRequest)));
            setAllOrgReferrals(orgRefsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrganizationReferral)));
            setRecentTransactions(transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (err) {
            console.error('Error loading admin referral data:', err);
            toast.error('حدث خطأ في تحميل البيانات الإدارية');
        } finally {
            setLoading(false);
        }
    };

    // --- Search & Filter ---
    const filteredRequests = useMemo(() => {
        return allJoinRequests.filter(req => {
            const matchSearch = req.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.organizationName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === 'all' || req.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [allJoinRequests, searchTerm, filterStatus]);

    const filteredOrgRefs = useMemo(() => {
        return allOrgReferrals.filter(ref =>
            ref.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ref.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allOrgReferrals, searchTerm]);

    // --- Handlers ---
    const handleExportDataByEmail = () => {
        toast.success('جاري تصدير البيانات إلى بريدك الإلكتروني...');
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
    );

    return (
        <div className="p-6 md:p-8 space-y-8 bg-gray-50/30 min-h-screen">
            {/* --- Header --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">إدارة سفراء الحلم</h1>
                    </div>
                    <p className="text-gray-500 font-medium">مركز التحكم الشامل لجميع السفراء وأكواد الإحالة وطلبات الانضمام.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="rounded-xl border-gray-200 bg-white" onClick={handleExportDataByEmail}>
                        <Download className="w-4 h-4 ml-2" />
                        تصدير التقارير
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء كود إحالة
                    </Button>
                </div>
            </header>

            {/* ─── Create Code Modal ────────────────────────────────── */}
            <AnimatePresence>
                {showCreateModal && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-40"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                        />
                        {/* Sheet */}
                        <motion.div
                            className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        >
                            <div className="p-6 md:p-8 space-y-6">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 rounded-xl">
                                            <Plus className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-gray-900">إنشاء كود إحالة جديد</h2>
                                            <p className="text-sm text-gray-500">أنشئ كود دعوة لنادٍ أو أكاديمية أو مدرب أو وكيل</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                {/* Form */}
                                <div className="space-y-5">
                                    {/* Organization Type */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">نوع المنظمة</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {([
                                                { value: 'club', label: 'نادي', icon: Building, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                                                { value: 'academy', label: 'أكاديمية', icon: GraduationCap, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                                                { value: 'trainer', label: 'مدرب', icon: Target, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                                                { value: 'agent', label: 'وكيل', icon: Briefcase, color: 'bg-purple-50 border-purple-200 text-purple-700' },
                                            ] as const).map(opt => {
                                                const Icon = opt.icon;
                                                const isSelected = createForm.organizationType === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => {
                                                            setCreateForm(f => ({ ...f, organizationType: opt.value }));
                                                            setSelectedOrg(null);
                                                            setOrgSearch('');
                                                            setOrgSearchResults([]);
                                                        }}
                                                        className={cn(
                                                            'flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all font-bold text-sm',
                                                            isSelected ? opt.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
                                                        )}
                                                    >
                                                        <Icon className="w-5 h-5" />
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Organization Search */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">
                                            ابحث عن المنظمة في النظام
                                        </label>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                placeholder={`ابحث باسم ${createForm.organizationType === 'club' ? 'النادي' : createForm.organizationType === 'academy' ? 'الأكاديمية' : createForm.organizationType === 'trainer' ? 'المدرب' : 'الوكيل'}...`}
                                                className="pr-10 rounded-xl h-11 border-gray-200"
                                                value={orgSearch}
                                                onChange={e => handleOrgSearch(e.target.value)}
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                        {/* Search Results */}
                                        {orgSearchResults.length > 0 && (
                                            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                                {orgSearchResults.map(org => (
                                                    <button
                                                        key={org.id}
                                                        onClick={() => {
                                                            setSelectedOrg(org);
                                                            setOrgSearch(org.name);
                                                            setOrgSearchResults([]);
                                                            setCreateForm(f => ({
                                                                ...f,
                                                                organizationName: org.name,
                                                                organizationId: org.id,
                                                            }));
                                                        }}
                                                        className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center font-black text-indigo-600 text-sm">
                                                            {org.name.charAt(0)}
                                                        </div>
                                                        <div className="text-sm">
                                                            <p className="font-bold text-gray-900">{org.name}</p>
                                                            <p className="text-xs text-gray-400 font-mono">{org.id.slice(0, 12)}...</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {selectedOrg && (
                                            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-emerald-800 text-sm">{selectedOrg.name}</p>
                                                    <p className="text-xs text-emerald-600 font-mono">{selectedOrg.id}</p>
                                                </div>
                                                <button onClick={() => { setSelectedOrg(null); setOrgSearch(''); }} className="text-emerald-500 hover:text-emerald-700">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Manual Entry (fallback) */}
                                    {!selectedOrg && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700">اسم المنظمة (يدوي)</label>
                                                <Input
                                                    placeholder="مثال: نادي الأهلي"
                                                    className="rounded-xl h-11 border-gray-200"
                                                    value={createForm.organizationName}
                                                    onChange={e => setCreateForm(f => ({ ...f, organizationName: e.target.value }))}
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700">معرّف المنظمة (ID)</label>
                                                <Input
                                                    placeholder="مثال: abc123"
                                                    className="rounded-xl h-11 border-gray-200 font-mono"
                                                    value={createForm.organizationId}
                                                    onChange={e => setCreateForm(f => ({ ...f, organizationId: e.target.value }))}
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Optional Settings */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">وصف الكود (اختياري)</label>
                                            <Input
                                                placeholder="مثال: كود الموسم الجديد"
                                                className="rounded-xl h-11 border-gray-200"
                                                value={createForm.description}
                                                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">الحد الأقصى للاستخدام</label>
                                            <Input
                                                type="number"
                                                placeholder="∞ غير محدود"
                                                className="rounded-xl h-11 border-gray-200"
                                                value={createForm.maxUsage}
                                                onChange={e => setCreateForm(f => ({ ...f, maxUsage: e.target.value }))}
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">تاريخ الانتهاء (اختياري)</label>
                                            <Input
                                                type="date"
                                                className="rounded-xl h-11 border-gray-200"
                                                value={createForm.expiresAt}
                                                onChange={e => setCreateForm(f => ({ ...f, expiresAt: e.target.value }))}
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2 pb-safe">
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-2xl h-12 border-gray-200"
                                        onClick={() => setShowCreateModal(false)}
                                        disabled={creating}
                                    >
                                        إلغاء
                                    </Button>
                                    <Button
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 font-bold shadow-lg shadow-emerald-100"
                                        onClick={handleCreateCode}
                                        disabled={creating || (!selectedOrg && (!createForm.organizationName || !createForm.organizationId))}
                                    >
                                        {creating ? (
                                            <span className="flex items-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                جاري الإنشاء...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                إنشاء الكود
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* --- Stats Cards --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'إجمالي الإحالات', value: stats.totalReferrals, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'نقاط موزعة', value: stats.totalPointsDistributed.toLocaleString(), icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'أرباح المحيلين', value: `$${stats.totalEarningsDistributed.toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'أكواد نشطة', value: stats.activeOrgCodes, icon: Building, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'طلبات معلقة', value: stats.pendingJoinRequests, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' }
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                            <div className={cn("p-3 rounded-2xl mb-2", stat.bg)}>
                                <stat.icon className={cn("w-6 h-6", stat.color)} />
                            </div>
                            <p className="text-gray-500 text-xs font-bold uppercase">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* --- Main Content Tabs --- */}
            <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-14 w-full md:w-auto">
                        <TabsTrigger value="overview" className="rounded-xl px-6 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">نظرة عامة</TabsTrigger>
                        <TabsTrigger value="org_referrals" className="rounded-xl px-6 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">أكواد المنظمات</TabsTrigger>
                        <TabsTrigger value="join_requests" className="rounded-xl px-6 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">طلبات الانضمام</TabsTrigger>
                        <TabsTrigger value="transactions" className="rounded-xl px-6 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">سجل العمليات</TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="بحث في النظام..."
                            className="pl-10 rounded-xl h-12 bg-white border-gray-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- Overview: Analytics & Top Referrers --- */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Growth Chart Placeholder */}
                        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden min-h-[400px]">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-6">
                                <div>
                                    <CardTitle className="text-xl font-black">نمو الإحالات الأسبوعي</CardTitle>
                                    <CardDescription>معدل تسجيل اللاعبين الجدد عبر الدعوات</CardDescription>
                                </div>
                                <Badge variant="outline" className="px-3 py-1">آخر 30 يوم</Badge>
                            </CardHeader>
                            <CardContent className="h-full flex items-center justify-center bg-indigo-50/20">
                                <div className="text-center space-y-4">
                                    <BarChart3 className="w-20 h-20 text-indigo-100 mx-auto" />
                                    <p className="text-gray-400 font-medium">سيتم ربط المخططات البيانية بـ Recharts قريباً</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Referrers Leaderboard */}
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">قائمة الأوائل</CardTitle>
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                </div>
                                <CardDescription>أكثر المستخدمين دعوة للاعبين</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {topReferrers.map((ref, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black">
                                                {ref.userId.substring(0, 2).toUpperCase()}
                                            </div>
                                            {i < 3 && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-black">
                                                    {i + 1}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate">المحيل: {ref.userId.substring(0, 10)}...</p>
                                            <p className="text-xs text-indigo-600 font-bold">{ref.referralCount} إحالة ناجحة</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-gray-900 text-sm">${ref.totalEarnings.toFixed(0)}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- Organization Referrals Table --- */}
                <TabsContent value="org_referrals" className="space-y-4">
                    {/* Quick create shortcut inside tab */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-500">{filteredOrgRefs.length} كود مسجّل</p>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus className="w-3.5 h-3.5 ml-1.5" />
                            إنشاء كود جديد
                        </Button>
                    </div>

                    <Card className="border-none shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-gray-500 text-xs font-black uppercase tracking-wider">
                                        <th className="px-6 py-4">المنظمة / المؤسسة</th>
                                        <th className="px-6 py-4">كود الإحالة</th>
                                        <th className="px-6 py-4">الاستخدام</th>
                                        <th className="px-6 py-4">الحالة</th>
                                        <th className="px-6 py-4 text-left">التاريخ</th>
                                        <th className="px-6 py-4 text-left">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrgRefs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                                    <Gift className="w-10 h-10 text-gray-200" />
                                                    <p className="font-bold">لا توجد أكواد بعد</p>
                                                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowCreateModal(true)}>
                                                        <Plus className="w-4 h-4 ml-1" /> إنشاء أول كود
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {filteredOrgRefs.map((ref) => (
                                        <tr key={ref.id} className="hover:bg-gray-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                                        {ref.organizationType === 'academy'
                                                            ? <GraduationCap className="w-5 h-5 text-indigo-500" />
                                                            : ref.organizationType === 'trainer'
                                                            ? <Target className="w-5 h-5 text-amber-500" />
                                                            : ref.organizationType === 'agent'
                                                            ? <Briefcase className="w-5 h-5 text-purple-500" />
                                                            : <Building className="w-5 h-5 text-emerald-500" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">{ref.organizationName}</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase">{ref.organizationType}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-sm border-indigo-100 text-indigo-700 bg-indigo-50/30">{ref.referralCode}</Badge>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(ref.referralCode); toast.success('تم نسخ الكود'); }}
                                                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="نسخ الكود"
                                                    >
                                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                    </button>
                                                </div>
                                                {ref.description && <span className="text-[10px] font-bold text-gray-400 block mt-1">{ref.description}</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-black text-gray-900">{ref.currentUsage}</span>
                                                    <span className="text-gray-300 text-xs">/ {ref.maxUsage ?? '∞'}</span>
                                                </div>
                                                {ref.expiresAt && (
                                                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        ينتهي {new Date((ref.expiresAt as any).toDate ? (ref.expiresAt as any).toDate() : ref.expiresAt).toLocaleDateString('ar-EG')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleCode(ref.id, ref.isActive)}
                                                    className={cn(
                                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                                                        ref.isActive
                                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                    )}
                                                >
                                                    {ref.isActive
                                                        ? <><ToggleRight className="w-3.5 h-3.5" /> نشط</>
                                                        : <><ToggleLeft className="w-3.5 h-3.5" /> معطل</>}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-left text-xs font-medium text-gray-400">
                                                {ref.createdAt ? new Date((ref.createdAt as any).toDate ? (ref.createdAt as any).toDate() : ref.createdAt).toLocaleDateString('ar-EG') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-left">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(ref.inviteLink || ''); toast.success('تم نسخ رابط الدعوة'); }}
                                                        className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-400 hover:text-indigo-600"
                                                        title="نسخ رابط الدعوة"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* --- Global Join Requests --- */}
                <TabsContent value="join_requests" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRequests.map((req) => (
                            <Card key={req.id} className="border-none shadow-sm relative overflow-hidden group">
                                <div className={cn("absolute top-0 right-0 h-full w-1.5",
                                    req.status === 'pending' ? 'bg-amber-500' : req.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
                                )} />
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary" className="rounded-full text-[10px] font-black uppercase">
                                            {req.organizationType} Invite
                                        </Badge>
                                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {req.requestedAt ? new Date((req.requestedAt as any).toDate ? (req.requestedAt as any).toDate() : req.requestedAt).toLocaleDateString('ar-EG') : '-'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 p-1 border-2 border-white shadow-sm flex items-center justify-center font-black text-gray-400 text-xl">
                                            {req.playerName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-gray-900 truncate">{req.playerName}</h4>
                                            <p className="text-xs text-gray-500 truncate">{req.playerEmail}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-bold">الجهة المطلوبة</span>
                                            <span className="font-black text-indigo-600">{req.organizationName}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-bold">الكود المستخدم</span>
                                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-100">{req.referralCode}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold border-gray-200">
                                            معاينة الملف
                                        </Button>
                                        <Button className={cn("rounded-xl h-10 w-24 text-xs font-bold text-white",
                                            req.status === 'pending' ? 'bg-amber-500' : req.status === 'approved' ? 'bg-emerald-600' : 'bg-rose-600'
                                        )}>
                                            {req.status === 'pending' ? 'قيد الانتظار' : req.status === 'approved' ? 'تم القبول' : 'مرفوض'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* --- Global Point Transactions --- */}
                <TabsContent value="transactions" className="space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="font-black text-gray-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-500" />
                                سجل توزيع المكافآت الأخير
                            </h3>
                            <span className="text-xs font-bold text-gray-400 underline cursor-pointer">عرض الأرشيف الكامل</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/30 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                        <th className="px-6 py-4">التحرك</th>
                                        <th className="px-6 py-4">المستفيد (ID)</th>
                                        <th className="px-6 py-4">القيمة</th>
                                        <th className="px-6 py-4">السبب</th>
                                        <th className="px-6 py-4 text-left">التوقيت</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {tx.playerId}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-emerald-600">+{tx.points.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                                {tx.reason}
                                            </td>
                                            <td className="px-6 py-4 text-left text-xs font-medium text-gray-400">
                                                {tx.timestamp ? new Date(tx.timestamp.toDate()).toLocaleTimeString('ar-EG') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
