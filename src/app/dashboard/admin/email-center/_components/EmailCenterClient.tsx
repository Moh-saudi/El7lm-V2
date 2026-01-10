'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Mail, Send, RefreshCw, CheckCircle, XCircle,
    Filter, Search, Clock, AlertTriangle, Plus
} from 'lucide-react';
import { EmailLog, EmailType } from '@/types/email';

interface EmailCenterClientProps {
    initialLogs: EmailLog[];
    config?: {
        sender: string;
        provider: string;
        isConnected: boolean;
        environment: string;
        timestamp: string;
    };
    stats?: {
        total: number;
        success: number;
        failed: number;
        successRate: number;
    };
}

export default function EmailCenterClient({ initialLogs, config, stats }: EmailCenterClientProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filterType, setFilterType] = useState<EmailType | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSendModal, setShowSendModal] = useState(false);

    // Resolve Stats (Global vs Local)
    const statsData = stats || {
        total: initialLogs.length,
        success: initialLogs.filter(log => log.status === 'success').length,
        failed: initialLogs.length - initialLogs.filter(log => log.status === 'success').length,
        successRate: initialLogs.length > 0 ? Math.round((initialLogs.filter(log => log.status === 'success').length / initialLogs.length) * 100) : 0
    };

    // Filter Logs
    const filteredLogs = initialLogs.filter(log => {
        const matchesType = filterType === 'all' || log.type === filterType;
        const matchesSearch = log.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.subject.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000); // Visual feedback
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">مركز الرسائل والبريد</h1>
                    <p className="text-gray-500">إدارة ومتابعة جميع الرسائل المرسلة عبر النظام</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تحديث البيانات"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowSendModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>إرسال رسالة جديدة</span>
                    </button>
                </div>
            </div>

            {/* System Status Dashboard */}
            {config && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        حالة النظام
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <Send className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">مزود الخدمة</p>
                                <p className="font-semibold text-gray-900">{config.provider} API</p>
                            </div>
                            <div className="mr-auto">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    متصل
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">حساب الإرسال</p>
                                <p className="font-semibold text-gray-900 text-sm" dir="ltr">{config.sender}</p>
                            </div>
                            {config.sender.includes('resend.dev') && (
                                <div className="mr-auto">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                        تجريبي
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">بيئة التشغيل</p>
                                <p className="font-semibold text-gray-900">
                                    {config.environment === 'production' ? 'Production' : 'Development'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="إجمالي الرسائل"
                    value={statsData.total}
                    icon={Mail}
                    color="blue"
                    subtext={stats ? 'السجل الكامل' : 'آخر 50 رسالة'}
                />
                <StatCard
                    title="المرسلة بنجاح"
                    value={statsData.success}
                    icon={CheckCircle}
                    color="green"
                    subtext={`${statsData.successRate}% نسبة النجاح`}
                />
                <StatCard
                    title="فشل الإرسال"
                    value={statsData.failed}
                    icon={XCircle}
                    color="red"
                    subtext="تحتاج مراجعة"
                />
                <StatCard
                    title="رسائل النظام"
                    value={initialLogs.filter(l => l.type === 'system' || l.type === 'notification').length}
                    icon={AlertTriangle}
                    color="orange"
                    subtext="تنبيهات وإشعارات"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث عن بريد أو عنوان..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <FilterButton
                        label="الكل"
                        active={filterType === 'all'}
                        onClick={() => setFilterType('all')}
                    />
                    <FilterButton
                        label="التحقق"
                        active={filterType === 'verification'}
                        onClick={() => setFilterType('verification')}
                    />
                    <FilterButton
                        label="كلمة المرور"
                        active={filterType === 'password-reset'}
                        onClick={() => setFilterType('password-reset')}
                    />
                    <FilterButton
                        label="إشعارات"
                        active={filterType === 'notification'}
                        onClick={() => setFilterType('notification')}
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">الحالة</th>
                                <th className="px-6 py-4">النوع</th>
                                <th className="px-6 py-4">المستلم</th>
                                <th className="px-6 py-4">العنوان</th>
                                <th className="px-6 py-4">التوقيت</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <StatusBadge status={log.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <TypeBadge type={log.type} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{log.userName || 'غير معروف'}</span>
                                            <span className="text-xs text-gray-500 font-mono">{log.to}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-gray-700">{log.subject}</span>
                                        {log.error && (
                                            <p className="text-xs text-red-500 mt-1">{log.error}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(log.sentAt)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        لا توجد رسائل مطابقة للبحث
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showSendModal && (
                <SendEmailModal
                    isTestMode={config?.sender?.includes('resend.dev') ?? false}
                    onClose={() => setShowSendModal(false)}
                    onSuccess={() => {
                        setShowSendModal(false);
                        handleRefresh();
                    }}
                />
            )}
        </div>
    );
}

// Sub-components

function StatCard({ title, value, icon: Icon, color, subtext }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    );
}

function FilterButton({ label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${active
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
        >
            {label}
        </button>
    );
}

function StatusBadge({ status }: { status: 'success' | 'failed' }) {
    if (status === 'success') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" />
                ناجح
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            فشل
        </span>
    );
}

function TypeBadge({ type }: { type: EmailType }) {
    const typeMap: Record<EmailType, { label: string; color: string }> = {
        'verification': { label: 'تحقق', color: 'bg-purple-100 text-purple-700' },
        'password-reset': { label: 'كلمة المرور', color: 'bg-amber-100 text-amber-700' },
        'notification': { label: 'إشعار', color: 'bg-blue-100 text-blue-700' },
        'welcome': { label: 'ترحيب', color: 'bg-emerald-100 text-emerald-700' },
        'system': { label: 'نظام', color: 'bg-gray-100 text-gray-700' },
        'marketing': { label: 'تسويق', color: 'bg-pink-100 text-pink-700' },
    };

    const config = typeMap[type] || typeMap['system'];

    return (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
}

function FormatTime({ timestamp }: { timestamp: number }) {
    // Client-side only date formatting to avoid hydration mismatch
    // Implementation simplified in formatDate
    return null;
}

function formatDate(timestamp: number) {
    return new Intl.DateTimeFormat('ar-EG', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
}

// Modal Component
// Modal Component
function SendEmailModal({ onClose, onSuccess, isTestMode }: { onClose: () => void, onSuccess: () => void, isTestMode: boolean }) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'custom' | 'template'>('custom');
    const [formData, setFormData] = useState({
        to: '',
        subject: '',
        message: '',
        type: 'notification' as EmailType,
        template: 'verification' // Default template
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload: any = {
                to: formData.to,
            };

            if (mode === 'custom') {
                payload.subject = formData.subject;
                payload.html = `<div dir="rtl" style="font-family: sans-serif; padding: 20px;">${formData.message.replace(/\n/g, '<br>')}</div>`;
                payload.text = formData.message;
                payload.type = formData.type;
            } else {
                payload.template = formData.template;
            }

            const response = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                alert('✅ تم إرسال الرسالة بنجاح!\n\n⚠️ إذا لم تجد الرسالة في الصندوق الوارد، يرجى التحقق من مجلد الرسائل غير المرغوب فيها (Spam) والتأكد من تفعيل النطاق في إعدادات Resend.');
                onSuccess();
            } else {
                alert('فشل الإرسال: ' + data.error);
            }
        } catch (err) {
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">إرسال رسالة جديدة</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <XCircle className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex border-b border-gray-100">
                    <button
                        type="button"
                        onClick={() => setMode('custom')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'custom' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        رسالة مخصصة
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('template')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'template' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        تجربة قوالب النظام
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني للمستلم</label>
                        <input
                            required
                            type="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="example@el7lm.com"
                            value={formData.to}
                            onChange={e => setFormData({ ...formData, to: e.target.value })}
                        />
                        {isTestMode && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-100">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <p>
                                    <strong>تنبيه وضع الاختبار:</strong> يرجى استخدام البريد الإلكتروني المسجل في حساب Resend (المسؤول) فقط. سيتم رفض أي بريد آخر أثناء الفترة التجريبية.
                                </p>
                            </div>
                        )}
                    </div>

                    {mode === 'custom' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الرسالة</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.type}
                                    onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="notification">إشعار عام</option>
                                    <option value="system">رسالة نظام</option>
                                    <option value="marketing">تسويق</option>
                                    <option value="welcome">ترحيب يدوي</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الموضوع</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="عنوان الرسالة"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">نص الرسالة</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                    placeholder="اكتب محتوى الرسالة هنا..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <label className="block text-sm font-medium text-gray-700 mb-2">اختر القالب للتجربة</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100 cursor-pointer hover:border-purple-300 transition-all">
                                    <input
                                        type="radio"
                                        name="template"
                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                        checked={formData.template === 'verification'}
                                        onChange={() => setFormData({ ...formData, template: 'verification' })}
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="p-1.5 bg-purple-100 rounded text-purple-600"><CheckCircle className="w-4 h-4" /></span>
                                        <span className="text-gray-900 font-medium">رمز التحقق (OTP)</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100 cursor-pointer hover:border-purple-300 transition-all">
                                    <input
                                        type="radio"
                                        name="template"
                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                        checked={formData.template === 'password-reset'}
                                        onChange={() => setFormData({ ...formData, template: 'password-reset' })}
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="p-1.5 bg-amber-100 rounded text-amber-600"><CheckCircle className="w-4 h-4" /></span>
                                        <span className="text-gray-900 font-medium">إعادة تعيين كلمة المرور</span>
                                    </div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">سيقوم النظام بإرسال النسخة الحقيقية للقالب مع بيانات تجريبية (مثل رمز: 123456) إلى بريدك الإلكتروني.</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 py-2.5 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${mode === 'custom' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {mode === 'custom' ? 'إرسال الرسالة' : 'إرسال التجربة'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
