import { X, Image as ImageIcon, CheckCircle, XCircle, RefreshCw, ZoomIn, Maximize2, Zap, Copy, CreditCard, User, FileText, Clock } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { deactivateSubscription } from '@/lib/utils/subscription-manager';

interface PaymentDetailsModalProps {
    payment: any;
    showFullData: boolean;
    onClose: () => void;
    onApprove: (payment: any) => Promise<void>;
    onReject: (payment: any) => Promise<void>;
    onActivateSubscription: (payment: any) => Promise<void>;
    onDeactivate?: (userId: string) => Promise<void>;
}

export default function PaymentDetailsModal({
    payment,
    showFullData,
    onClose,
    onApprove,
    onReject,
    onActivateSubscription,
    onDeactivate
}: PaymentDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<string | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);

    if (!payment) return null;

    const handleAction = async (actionType: 'approve' | 'reject' | 'activate') => {
        setLoading(true);
        setAction(actionType);

        try {
            if (actionType === 'approve') {
                await onApprove(payment);
            } else if (actionType === 'reject') {
                await onReject(payment);
            } else if (actionType === 'activate') {
                await onActivateSubscription(payment);
            }
        } finally {
            setLoading(false);
            setAction(null);
        }
    };

    const receiptUrl = payment.receiptImage || payment.receiptUrl || payment.receipt_url;
    const isCompleted = ['completed', 'success', 'paid', 'accepted'].includes(payment.status?.toLowerCase());
    const isPending = ['pending', 'processing', 'waiting', 'review'].includes(payment.status?.toLowerCase());
    const isCancelled = ['cancelled', 'failed', 'rejected'].includes(payment.status?.toLowerCase());

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-8"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col rtl"
                    dir="rtl"
                >
                    {/* الهيدر الثابت */}
                    <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-6 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                <FileText className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">تفاصيل المعاملة المالية</h2>
                                <p className="text-sm text-blue-200 opacity-80">الرقم المرجعي: {payment.id}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                        >
                            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* محتوى الـ Modal القابل للتمرير */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                            {/* العمود الأيمن: صورة الإيصال (الآن هي البطل) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-blue-600" />
                                        إيصال الدفع المرفق
                                    </h3>
                                    {receiptUrl && (
                                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md">
                                            اضغط على الصورة للتكبير
                                        </span>
                                    )}
                                </div>

                                {receiptUrl ? (
                                    <div
                                        onClick={() => setIsZoomed(true)}
                                        className="relative group cursor-zoom-in rounded-2xl overflow-hidden bg-white shadow-xl border-4 border-white transition-all hover:ring-4 hover:ring-blue-100 hover:scale-[1.01]"
                                    >
                                        <img
                                            src={receiptUrl}
                                            alt="إيصال الدفع"
                                            className="w-full h-auto min-h-[300px] object-contain bg-gray-50 transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <div className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 font-bold text-blue-600 flex items-center gap-2">
                                                <ZoomIn className="w-5 h-5" />
                                                <span>تكبير الصورة</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ImageIcon className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-medium">لا يوجد إيصال دفع مرفق لهذه المعاملة</p>
                                    </div>
                                )}
                            </div>

                            {/* العمود الأيسر: البيانات والبيانات الحساسة */}
                            <div className="space-y-6">
                                {/* بطاقة العميل */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-50">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-gray-900">بيانات العميل</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <DataRow label="اسم العميل" value={payment.playerName || payment.userName || payment.full_name} highlight />
                                        <DataRow label="نوع الحساب" value={payment.accountType || payment.account_type || payment.userRole || 'غير محدد'} />
                                        <DataRow label="رقم الهاتف" value={payment.playerPhone || payment.phone || payment.phoneNumber} copyable />
                                        <DataRow label="البريد الإلكتروني" value={payment.playerEmail || payment.email || payment.userEmail} copyable />
                                        <DataRow label="الدولة" value={payment.country || payment.selectedCountry || 'غير محدد'} />
                                        <DataRow label="معرف العميل (ID)" value={payment.userId || payment.playerId || payment.player_id} copyable />

                                        {/* قائمة اللاعبين في حالة الدفع الجماعي */}
                                        {payment.players && Array.isArray(payment.players) && payment.players.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-50">
                                                <p className="text-xs text-gray-400 mb-2 font-bold">قائمة اللاعبين المشمولين ({payment.players.length}):</p>
                                                <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto space-y-2">
                                                    {payment.players.map((player: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-gray-100">
                                                            <span className="font-bold text-gray-700">{player.name || player.playerName}</span>
                                                            <span className="text-gray-400 text-[10px]">{player.id || player.playerId}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* بطاقة الدفع */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-50">
                                        <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-gray-900">بيانات العملية</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-gray-500 text-sm">المبلغ الإجمالي</span>
                                            <span className="text-2xl font-black text-green-600">
                                                {payment.amount?.toLocaleString()} <span className="text-sm font-bold text-gray-400">{payment.currency}</span>
                                            </span>
                                        </div>
                                        <DataRow label="طريقة الدفع" value={payment.paymentMethod || payment.collection} highlight />
                                        <DataRow label="الوصف / الباقة" value={payment.packageType || payment.package_description || payment.description || 'غير محدد'} />
                                        <DataRow
                                            label="تاريخ الطلب"
                                            value={payment.createdAt?.toDate
                                                ? payment.createdAt.toDate().toLocaleString('ar-EG')
                                                : new Date(payment.createdAt).toLocaleString('ar-EG')
                                            }
                                        />
                                        {payment.transactionId && <DataRow label="رقم المعاملة" value={payment.transactionId} copyable />}
                                        {payment.referralCode && <DataRow label="كود الشريك" value={payment.referralCode} highlight />}
                                        {payment.subscriptionEnd && (
                                            <DataRow
                                                label="تاريخ انتهاء الاشتراك"
                                                value={typeof payment.subscriptionEnd === 'string' ? payment.subscriptionEnd : new Date(payment.subscriptionEnd).toLocaleDateString('ar-EG')}
                                                highlight
                                            />
                                        )}
                                        {payment.notes && (
                                            <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100 italic text-xs text-orange-800">
                                                <span className="font-bold block mb-1">📝 ملاحظات:</span>
                                                {payment.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* حالة الطلب */}
                                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${isCompleted ? 'bg-green-50 border-green-100 text-green-700' :
                                    isPending ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                                        'bg-red-50 border-red-100 text-red-700'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-100' : isPending ? 'bg-yellow-100' : 'bg-red-100'}`}>
                                            {isCompleted ? <CheckCircle className="w-5 h-5" /> : isPending ? <Clock className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider opacity-70">الحالة الحالية</p>
                                            <p className="font-black text-lg">{payment.status}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* البار السفلي للأكشنز */}
                    <div className="bg-white border-t p-6 flex flex-wrap gap-4 items-center justify-center shrink-0">
                        {isPending && (
                            <button
                                onClick={() => handleAction('approve')}
                                disabled={loading}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all disabled:opacity-50"
                            >
                                {loading && action === 'approve' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                موافقة وتفعيل
                            </button>
                        )}

                        {isCompleted && (
                            <button
                                onClick={async () => {
                                    if (confirm('هل أنت متأكد من رغبتك في إيقاف هذا الاشتراك؟')) {
                                        setLoading(true);
                                        try {
                                            const userId = payment.userId || payment.playerId;
                                            if (onDeactivate) {
                                                await onDeactivate(userId);
                                            } else {
                                                await deactivateSubscription(userId);
                                            }
                                            onClose();
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                                disabled={loading}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-100 border-2 border-amber-100 transition-all disabled:opacity-50"
                            >
                                <XCircle className="w-5 h-5" />
                                إيقاف الاشتراك
                            </button>
                        )}

                        {!isCancelled && !isCompleted && (
                            <button
                                onClick={() => handleAction('reject')}
                                disabled={loading}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 border-2 border-red-100 transition-all disabled:opacity-50"
                            >
                                {loading && action === 'reject' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                رفض الطلب
                            </button>
                        )}

                        {!isCompleted && (
                            <button
                                onClick={() => handleAction('activate')}
                                disabled={loading}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
                            >
                                {loading && action === 'activate' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                تفعيل يدوي
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Lightbox للتحكم في تكبير الصورة في نفس الصفحة */}
                {isZoomed && receiptUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out"
                        onClick={() => setIsZoomed(false)}
                    >
                        <button
                            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                            onClick={() => setIsZoomed(false)}
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <motion.img
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={receiptUrl}
                            alt="إيصال كامل"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl shadow-white/5"
                            onClick={(e) => e.stopPropagation()}
                        />

                        <div className="mt-6 text-white text-lg font-bold flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full backdrop-blur-md border border-white/10">
                            <ImageIcon className="w-6 h-6 text-blue-400" />
                            <span>{payment.playerName} - إيصال السداد</span>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

// مكون فرعي لعرض صف البيانات
function DataRow({ label, value, highlight = false, copyable = false }: any) {
    return (
        <div className="flex justify-between items-center py-1 group/row">
            <span className="text-gray-500 text-xs font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${highlight ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : 'text-gray-800'}`}>
                    {value || 'غير متوفر'}
                </span>
                {copyable && value && (
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(value);
                            // toast.success('تم النسخ');
                        }}
                        className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-gray-100 rounded transition-all text-gray-400 hover:text-blue-600"
                        title="نسخ"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

// تم حذف الأيقونات المحلية واستبدالها باستيرادات lucide-react المباشرة في أعلى الملف
