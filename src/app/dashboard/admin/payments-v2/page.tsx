'use client';

import { useEffect, useState } from 'react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { fetchPaymentsOptimized } from '@/lib/utils/payments-fetcher';
import { maskPhoneNumber, maskEmail, maskName } from '@/lib/utils/privacy-utils';
import { activateSubscription, updatePaymentStatus, deactivateSubscription } from '@/lib/utils/subscription-manager';
import PaymentDetailsModal from '@/components/payments/PaymentDetailsModal';
import {
    RefreshCw, Eye, EyeOff, Download, CheckCircle, XCircle,
    Clock, DollarSign, TrendingUp, Filter, Search, Calendar,
    MessageCircle, FileText, Shield, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function PaymentsManagementPage() {
    const { isAuthorized, isCheckingAuth, accountType } = useAccountTypeAuth({ allowedTypes: ['admin'] });

    // الحالات الأساسية
    const [payments, setPayments] = useState<any[]>([]);
    const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFullData, setShowFullData] = useState(false);

    // الإحصائيات
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        totalAmount: 0,
        todayAmount: 0,
        weekAmount: 0
    });

    // الفلاتر
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        paymentMethod: 'all',
        dateRange: 'all', // today, week, month, all
        minAmount: '',
        maxAmount: ''
    });

    // التصفح
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // جلب المدفوعات
    const fetchPayments = async (showProgress: boolean = true) => {
        try {
            if (showProgress) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }

            const allPayments = await fetchPaymentsOptimized({
                showFullData: showFullData,
                maxResults: 600,
                onProgress: (current, total) => {
                    console.log(`📊 التقدم: ${current}/${total}`);
                }
            });

            setPayments(allPayments);
            setFilteredPayments(allPayments);
            calculateStats(allPayments);

            if (!showProgress) {
                toast.success(`✅ تم تحديث ${allPayments.length} معاملة`);
            }

        } catch (error: any) {
            console.error('❌ خطأ في جلب المدفوعات:', error);
            toast.error('فشل في جلب المدفوعات');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // حساب الإحصائيات
    const calculateStats = (data: any[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const stats = {
            total: data.length,
            completed: data.filter(p => ['completed', 'success', 'paid', 'accepted'].includes(p.status)).length,
            pending: data.filter(p => ['pending', 'processing', 'waiting', 'Review'].includes(p.status)).length,
            cancelled: data.filter(p => ['cancelled', 'failed', 'rejected'].includes(p.status)).length,
            totalAmount: data.reduce((sum, p) => sum + (p.amount || 0), 0),
            todayAmount: data
                .filter(p => {
                    const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                    return date >= today;
                })
                .reduce((sum, p) => sum + (p.amount || 0), 0),
            weekAmount: data
                .filter(p => {
                    const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                    return date >= weekAgo;
                })
                .reduce((sum, p) => sum + (p.amount || 0), 0)
        };

        setStats(stats);
    };

    // تطبيق الفلاتر
    useEffect(() => {
        let filtered = [...payments];

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.playerName?.toLowerCase().includes(searchTerm) ||
                p.playerPhone?.includes(searchTerm) ||
                p.playerEmail?.toLowerCase().includes(searchTerm) ||
                p.id?.toLowerCase().includes(searchTerm)
            );
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(p => {
                const s = p.status?.toLowerCase();
                if (filters.status === 'completed') return ['completed', 'success', 'paid', 'accepted'].includes(s);
                if (filters.status === 'pending') return ['pending', 'processing', 'waiting', 'review'].includes(s);
                if (filters.status === 'cancelled') return ['cancelled', 'failed', 'rejected'].includes(s);
                return true;
            });
        }

        if (filters.paymentMethod !== 'all') {
            filtered = filtered.filter(p =>
                p.paymentMethod?.toLowerCase().includes(filters.paymentMethod.toLowerCase())
            );
        }

        if (filters.dateRange !== 'all') {
            const now = new Date();
            let startDate: Date;
            if (filters.dateRange === 'today') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            else if (filters.dateRange === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (filters.dateRange === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            else startDate = new Date(0);

            filtered = filtered.filter(p => {
                const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                return date >= startDate;
            });
        }

        if (filters.minAmount) filtered = filtered.filter(p => (p.amount || 0) >= parseInt(filters.minAmount));
        if (filters.maxAmount) filtered = filtered.filter(p => (p.amount || 0) <= parseInt(filters.maxAmount));

        setFilteredPayments(filtered);
        setCurrentPage(1);
    }, [filters, payments]);

    useEffect(() => {
        if (isAuthorized) fetchPayments(false);
    }, [showFullData]);

    useEffect(() => {
        if (isAuthorized) fetchPayments();
    }, [isAuthorized]);

    if (isCheckingAuth) return (
        <div className="flex items-center justify-center min-h-screen">
            <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
        </div>
    );

    if (!isAuthorized) return (
        <div className="flex items-center justify-center min-h-screen flex-col">
            <Shield className="w-16 h-16 text-red-600 mb-4" />
            <h1 className="text-2xl font-bold">غير مصرح لك</h1>
        </div>
    );

    const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

    return (
        <div className="min-h-screen bg-gray-50 p-6 rtl" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* الرأس */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">💰 إدارة المدفوعات (إصدار فريد)</h1>
                            <p className="text-gray-500">إدارة التفعيلات، الإيصالات، والخصوصية</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => fetchPayments(false)} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? 'تحديث...' : 'تحديث'}
                            </button>
                            <button onClick={() => { setShowFullData(!showFullData); toast.success(showFullData ? '🔒 تم إخفاء البيانات' : '🔓 تم إظهار البيانات'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showFullData ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {showFullData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {showFullData ? 'إخفاء الحساسة' : 'إظهار الحساسة'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard icon={<FileText className="text-blue-600" />} label="الإجمالي" value={stats.total} color="blue" />
                        <StatCard icon={<CheckCircle className="text-green-600" />} label="مكتمل" value={stats.completed} color="green" />
                        <StatCard icon={<Clock className="text-yellow-600" />} label="قيد المراجعة" value={stats.pending} color="yellow" />
                        <StatCard icon={<DollarSign className="text-purple-600" />} label="إجمالي المبالغ" value={`${stats.totalAmount.toLocaleString()} EGP`} color="purple" />
                    </div>
                </div>

                {/* الفلاتر */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="بحث بالاسم أو الهاتف..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-full pr-9 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 border rounded-lg">
                            <option value="all">كل الحالات</option>
                            <option value="completed">مكتمل / مقبول</option>
                            <option value="pending">قيد الانتظار</option>
                            <option value="cancelled">مرفوض / فشل</option>
                        </select>
                        <select value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })} className="px-3 py-2 border rounded-lg">
                            <option value="all">كل طرق الدفع</option>
                            <option value="geidea">Geidea</option>
                            <option value="bulk">Bulk Payments</option>
                            <option value="instapay">Instapay</option>
                        </select>
                        <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} className="px-3 py-2 border rounded-lg">
                            <option value="all">كل الأوقات</option>
                            <option value="today">اليوم</option>
                            <option value="week">آخر 7 أيام</option>
                            <option value="month">هذا الشهر</option>
                        </select>
                    </div>
                </div>

                {/* الجدول */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-blue-500" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                    <tr>
                                        <th className="px-6 py-4">التاريخ</th>
                                        <th className="px-6 py-4">العميل</th>
                                        <th className="px-6 py-4">المبلغ</th>
                                        <th className="px-6 py-4">طريقة الدفع</th>
                                        <th className="px-6 py-4">الحالة</th>
                                        <th className="px-6 py-4">الإجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paginatedPayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(p.createdAt).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{p.playerName}</div>
                                                <div className="text-sm text-gray-400">{p.playerPhone}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.amount?.toLocaleString()} {p.currency}</td>
                                            <td className="px-6 py-4 text-sm">{p.paymentMethod}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${['completed', 'success', 'paid', 'accepted'].includes(p.status?.toLowerCase()) ? 'bg-green-100 text-green-700' : ['pending', 'waiting', 'processing'].includes(p.status?.toLowerCase()) ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => { setSelectedPayment(p); setShowDetailsModal(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-bold underline">
                                                    عرض التفاصيل
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* الترقيم */}
                    {!loading && totalPages > 1 && (
                        <div className="p-6 border-t flex items-center justify-center gap-4">
                            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-2 border rounded-lg hover:bg-gray-50">السابق</button>
                            <span className="font-bold">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-2 border rounded-lg hover:bg-gray-50">التالي</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal التفاصيل */}
            {showDetailsModal && selectedPayment && (
                <PaymentDetailsModal
                    payment={selectedPayment}
                    showFullData={showFullData}
                    onClose={() => { setShowDetailsModal(false); setSelectedPayment(null); }}
                    onApprove={async (payment) => {
                        try {
                            await updatePaymentStatus(payment, 'completed', true);
                            await fetchPayments(false);
                            setShowDetailsModal(false);
                        } catch (err) { console.error(err); }
                    }}
                    onReject={async (payment) => {
                        try {
                            await updatePaymentStatus(payment, 'cancelled', false);
                            await fetchPayments(false);
                            setShowDetailsModal(false);
                        } catch (err) { console.error(err); }
                    }}
                    onActivateSubscription={async (payment) => {
                        try {
                            await activateSubscription(payment);
                            toast.success('✅ تم تفعيل الاشتراك بنجاح');
                            await fetchPayments(false);
                            setShowDetailsModal(false);
                        } catch (err: any) {
                            toast.error(err.message || 'فشل التفعيل');
                        }
                    }}
                    onDeactivate={async (userId) => {
                        try {
                            await deactivateSubscription(userId);
                            await fetchPayments(false);
                            setShowDetailsModal(false);
                        } catch (err) { console.error(err); }
                    }}
                />
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color }: any) {
    const bgColors: any = { blue: 'bg-blue-50', green: 'bg-green-50', yellow: 'bg-yellow-50', purple: 'bg-purple-50' };
    return (
        <div className={`p-4 rounded-xl ${bgColors[color]} flex items-center gap-4`}>
            <div className="p-3 bg-white rounded-lg shadow-sm">{icon}</div>
            <div>
                <div className="text-gray-500 text-xs">{label}</div>
                <div className="text-lg font-black text-gray-900">{value}</div>
            </div>
        </div>
    );
}
