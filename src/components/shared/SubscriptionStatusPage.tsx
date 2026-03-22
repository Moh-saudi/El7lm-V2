'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PricingService } from '@/lib/pricing/pricing-service';
import { SubscriptionPlan } from '@/types/pricing';
import { COMPANY_INFO, getPrimaryWhatsAppNumber } from '@/config/company-info';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Printer,
  Zap,
  TrendingUp,
  Image as ImageIcon,
  History,
  ShieldCheck,
  Award,
  MessageSquare,
  Send,
  ChevronLeft,
  Crown,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { serverTimestamp, addDoc } from 'firebase/firestore';

const mapPaymentStatus = (status: string, source: string, data: any) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'success' || s === 'completed' || s === 'accepted' || s === 'approved') {
    return 'completed' as const;
  }
  if (s === 'rejected' || s === 'failed' || s === 'cancelled') {
    return 'failed' as const;
  }
  if (s === 'processing' || s === 'waiting' || s === 'inactive' || s === 'pending_review') {
    return s as any;
  }
  // Check for manual review status
  if (source === 'receipts' || source === 'proofs' || data.receiptUrl || data.receiptImage) {
    return 'pending_review' as const;
  }
  return 'pending' as const;
};

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'success' | 'pending_review' | 'accepted' | 'approved' | 'rejected' | 'processing' | 'waiting' | 'inactive';
  payment_date: any;
  createdAt?: any;
  package_name?: string;
  packageType?: string;
  transaction_id?: string;
  customer_name?: string;
  customer_email?: string;
  receiptUrl?: string;
  notes?: string;
  source?: string; // مصدر البيانات: 'bulkPayments', 'geidea_payments', 'bulk_payments'
}

interface SubscriptionInfo {
  status: 'active' | 'expired' | 'pending' | 'inactive' | 'completed' | 'success' | 'cancelled' | 'failed' | 'rejected' | 'processing' | 'waiting' | 'pending_review';
  plan_name?: string;
  package_name?: string;
  packageType?: string;
  package_duration?: string;
  start_date?: any;
  end_date?: any;
  expires_at?: any;
  activated_at?: any;
  amount?: number;
  currency?: string;
  daysLeft?: number;
  isFromParent?: boolean; // ⬅️ هل الاشتراك من الحساب الأب؟
  parentAccountType?: string; // ⬅️ نوع الحساب الأب (academy, club, etc.)
  parentAccountName?: string; // ⬅️ اسم الحساب الأب
}

interface SubscriptionStatusPageProps {
  accountType: string;
}

const SubscriptionStatusPage: React.FC<SubscriptionStatusPageProps> = ({ accountType }) => {
  const { user, userData } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [parentSubscriptionUnsubscribe, setParentSubscriptionUnsubscribe] = useState<(() => void) | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim() || !user) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      // 1. Create Conversation
      const conversationRef = await addDoc(collection(db, 'support_conversations'), {
        userId: user.uid,
        userName: userData?.name || user.displayName || 'مستخدم',
        userEmail: user.email || '',
        userPhone: userData?.phone || userData?.personal_phone || '',
        userType: accountType,
        status: 'open',
        priority: 'medium',
        category: 'subscription',
        lastMessage: ticketMessage.trim(),
        lastMessageTime: serverTimestamp(),
        unreadCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        subject: ticketSubject.trim()
      });

      // 2. Create Message
      await addDoc(collection(db, 'support_messages'), {
        conversationId: conversationRef.id,
        senderId: user.uid,
        senderName: userData?.name || user.displayName || 'مستخدم',
        senderType: 'user',
        message: ticketMessage.trim(),
        timestamp: serverTimestamp(),
        isRead: false
      });

      toast.success('تم إرسال تذكرتك بنجاح، سيتم الرد عليك قريباً');
      setIsSupportModalOpen(false);
      setTicketSubject('');
      setTicketMessage('');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('فشل إرسال التذكرة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setError('يجب تسجيل الدخول للوصول إلى بيانات الاشتراك');
      setLoading(false);
      return;
    }

    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);
        setIsUpdating(true);

        const allPlans = await PricingService.getAllPlans();
        setPlans(allPlans);

        // 1. Parallel fetch for current subscription and parent subscription (if any)
        const parentAccountId = (accountType === 'player' && userData) ?
          (userData.club_id || userData.clubId || userData.academy_id || userData.academyId || userData.trainer_id || userData.trainerId || userData.agent_id || userData.agentId) : null;

        const [subscriptionDoc, parentDoc] = await Promise.all([
          getDoc(doc(db, 'subscriptions', user.uid)),
          parentAccountId ? getDoc(doc(db, 'subscriptions', parentAccountId)) : Promise.resolve(null)
        ]);

        if (subscriptionDoc.exists()) {
          const subData = subscriptionDoc.data();
          const expiresAt = subData.expires_at?.toDate ? subData.expires_at.toDate() : (subData.end_date?.toDate ? subData.end_date.toDate() : null);
          const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

          // Smart Dynamic Labeling
          const matchedPlan = allPlans.find(p => p.id === subData.packageType);
          let planNameFromPlan = matchedPlan?.title;
          let durationFromPlan = matchedPlan?.period;

          let planName = planNameFromPlan || subData.plan_name || subData.package_name;
          let duration = durationFromPlan || subData.package_duration;

          // Ultimate amount-aware fallback for existing records
          const lastAmount = Number(subData.amount || 0);
          if ((lastAmount >= 110 && lastAmount < 180) && (!planName || planName.includes('3'))) {
            planName = planNameFromPlan || 'باقة الاحتراف';
            duration = durationFromPlan || '6 شهور';
          } else if (lastAmount >= 180 && (!planName || !planName.includes('سنة'))) {
            planName = planNameFromPlan || 'باقة الحلم';
            duration = durationFromPlan || '12 شهر';
          }

          setSubscription({
            status: subData.status === 'active' && daysLeft > 0 ? 'active' : (subData.status === 'active' && daysLeft <= 0 ? 'expired' : subData.status || 'inactive'),
            plan_name: planName || (subData.packageType === 'subscription_6months' ? 'باقة الاحتراف' : subData.packageType === 'subscription_annual' ? 'باقة الحلم' : 'باقة الانطلاقة'),
            package_duration: duration || (subData.packageType === 'subscription_6months' ? '6 شهور' : subData.packageType === 'subscription_annual' ? '12 شهر' : '3 شهور'),
            packageType: subData.packageType,
            expires_at: expiresAt,
            daysLeft: daysLeft,
            isFromParent: false
          });
        } else if (parentDoc?.exists()) {
          const pSubData = parentDoc.data();
          const expiresAt = pSubData.expires_at?.toDate ? pSubData.expires_at.toDate() : (pSubData.end_date?.toDate ? pSubData.end_date.toDate() : null);
          const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

          setSubscription({
            status: pSubData.status === 'active' && daysLeft > 0 ? 'active' : (pSubData.status === 'active' && daysLeft <= 0 ? 'expired' : pSubData.status || 'inactive'),
            plan_name: pSubData.plan_name || pSubData.package_name || 'باقة العضوية للأكاديمية/النادي',
            package_duration: pSubData.package_duration || (pSubData.packageType === 'subscription_6months' ? '6 شهور' : pSubData.packageType === 'subscription_annual' ? '12 شهر' : '3 شهور'),
            packageType: pSubData.packageType,
            expires_at: expiresAt,
            daysLeft: daysLeft,
            isFromParent: true,
            parentAccountName: parentDoc.data()?.name || parentDoc.data()?.club_name || parentDoc.data()?.academy_name || 'الحساب الأب'
          });
        }

        // 2. Parallel fetch for History (All relevant collections)
        const essentialColls = [
          { name: 'payments', currency: 'EGP' },
          { name: 'invoices', currency: 'QAR' },
          { name: 'geidea_payments', currency: 'EGP' },
          { name: 'bulkPayments', currency: 'EGP' },
          { name: 'receipts', currency: 'EGP' },
          { name: 'proofs', currency: 'EGP' },
          { name: 'instapay', currency: 'EGP' },
          { name: 'vodafone_cash', currency: 'EGP' },
          { name: 'etisalat_wallet', currency: 'EGP' },
          { name: 'orange_money', currency: 'EGP' }
        ];

        const historyPromises = essentialColls.flatMap(coll => [
          getDocs(query(collection(db, coll.name), where('userId', '==', user.uid), limit(10))),
          getDocs(query(collection(db, coll.name), where('user_id', '==', user.uid), limit(10))),
          // Query for player-specific fields in case of academies/clubs
          getDocs(query(collection(db, coll.name), where('playerId', '==', user.uid), limit(10)))
        ]);

        const results = await Promise.all(historyPromises);
        const historyData: PaymentRecord[] = [];

        results.forEach((snap, idx) => {
          const coll = essentialColls[Math.floor(idx / 3)];
          snap.forEach(d => {
            const data = d.data();
            if (!historyData.find(ex => ex.id === d.id)) {
              historyData.push({
                id: d.id,
                amount: data.amount || 0,
                currency: data.currency || coll.currency,
                status: mapPaymentStatus(data.status, coll.name, data),
                payment_date: data.createdAt || data.created_at || data.paidAt || data.uploadedAt,
                createdAt: data.createdAt || data.created_at || data.paidAt || data.uploadedAt,
                package_name: (data.packageName || data.package_name || data.plan_name) ? (
                  ((Number(data.amount) >= 110 && Number(data.amount) < 180) && (data.packageName || data.package_name || '').includes('3'))
                    ? 'اشتراك 6 شهور'
                    : (data.packageName || data.package_name || data.plan_name)
                ) : (
                  coll.name === 'invoices' ? (Number(data.amount) >= 180 ? 'اشتراك سنوي' : Number(data.amount) >= 110 ? 'اشتراك 6 شهور' : 'اشتراك 3 شهور') :
                    coll.name === 'receipts' ? 'إيصال دفع مرفوع' :
                      coll.name === 'vodafone_cash' ? 'فودافون كاش' : 'اشتراك'
                ),
                source: coll.name,
                notes: data.notes || data.adminNotes || data.rejectionReason || null
              });
            }
          });
        });

        setPayments(historyData.sort((a, b) => {
          const tA = (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) || (a.payment_date?.toDate ? a.payment_date.toDate().getTime() : (a.payment_date instanceof Date ? a.payment_date.getTime() : 0));
          const tB = (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) || (b.payment_date?.toDate ? b.payment_date.toDate().getTime() : (b.payment_date instanceof Date ? b.payment_date.getTime() : 0));
          return tB - tA;
        }));

      } catch (err) {
        console.error('Fetch error:', err);
        setError('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
        setIsUpdating(false);
      }
    };

    fetchSubscriptionData();

    // 3. Setup real-time listeners (Only for primary status)
    const unsubSub = onSnapshot(doc(db, 'subscriptions', user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const exp = d.expires_at?.toDate ? d.expires_at.toDate() : null;
        const dl = exp ? Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
        setSubscription(prev => ({
          ...prev!,
          status: d.status === 'active' && dl > 0 ? 'active' : d.status || 'inactive',
          daysLeft: dl,
          expires_at: exp
        }));
        setIsUpdating(true);
        setTimeout(() => setIsUpdating(false), 2000);
      }
    });

    return () => {
      unsubSub();
      if (parentSubscriptionUnsubscribe) parentSubscriptionUnsubscribe();
    };
  }, [user?.uid, userData, accountType]);

  // عداد انتهاء ديناميكي يحدث كل ثانية
  useEffect(() => {
    if (!subscription?.expires_at) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const expiresAt = subscription.expires_at?.toDate
        ? subscription.expires_at.toDate()
        : subscription.expires_at instanceof Date
          ? subscription.expires_at
          : new Date(subscription.expires_at);

      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    // تحديث فوري
    updateCountdown();

    // تحديث كل ثانية
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [subscription?.expires_at]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'مكتمل' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'في الانتظار' };
      case 'failed':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, text: 'فشل' };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, text: 'ملغي' };
      case 'pending_review':
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock, text: 'بانتظار مراجعة الإدارة' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle, text: status };
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'غير محدد';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 animate-pulse">جاري تحميل بيانات اشتراكك...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border-2 border-red-100">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-900 mb-2">عذراً، حدث خطأ</h3>
        <p className="text-red-700">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-red-600 hover:bg-red-700">تحديث الصفحة</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Premium Membership Card Header - Light Theme */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 p-8 text-slate-900 shadow-2xl shadow-blue-500/5 transition-all hover:shadow-blue-500/10 group border border-slate-200/60">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-blue-400/5 blur-[100px] transition-all group-hover:bg-blue-400/10"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-80 w-80 rounded-full bg-purple-400/5 blur-[100px] transition-all group-hover:bg-purple-400/10"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-right" dir="rtl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-200">
                <Zap className="w-8 h-8 text-white fill-white/20" />
              </div>
              <div>
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 mb-1 font-bold">
                  عضوية المنصة الموثقة
                </Badge>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
                  {subscription?.plan_name}
                  {subscription?.package_duration && (
                    <span className="text-lg font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 mr-2">
                      ({subscription.package_duration})
                    </span>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200/50">
                <div className={`w-3 h-3 rounded-full animate-pulse ${subscription?.status === 'active' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' :
                  subscription?.status === 'pending_review' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                <span className="text-sm font-bold text-slate-700">
                  {subscription?.status === 'active' ? 'الحساب مفعل' :
                    subscription?.status === 'pending_review' ? 'بانتظار مراجعة الإدارة' : 'الاشتراك غير نشط'}
                </span>
              </div>

              {subscription?.expires_at && subscription.status === 'active' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/5 rounded-xl border border-blue-100">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">
                    ينتهي في: {formatDate(subscription.expires_at)}
                  </span>
                </div>
              )}
              {subscription?.status === 'active' && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-8 font-extrabold shadow-lg shadow-blue-200 transition-all active:scale-95"
                  onClick={() => setIsActionModalOpen(true)}
                >
                  تجديد أو ترقية
                </Button>
              )}
              {(!subscription || subscription.status !== 'active') && (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-6 font-bold shadow-lg shadow-blue-200" onClick={() => window.location.href = '/dashboard/shared/bulk-payment'}>
                  تفعيل الاشتراك الآن
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="text-right">
              <p className="text-slate-400 text-sm mb-1 uppercase tracking-widest font-bold">رقم العميل</p>
              <code className="text-xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100/50">
                #{user?.uid.slice(-8).toUpperCase()}
              </code>
            </div>
          </div>
        </div>

        {subscription?.status === 'active' && countdown && (
          <div className="mt-12 grid grid-cols-4 gap-4 max-w-2xl" dir="rtl">
            {[
              { label: 'يوم', val: countdown.days },
              { label: 'ساعة', val: countdown.hours },
              { label: 'دقيقة', val: countdown.minutes },
              { label: 'ثانية', val: countdown.seconds },
            ].map((t, idx) => (
              <div key={idx} className="flex flex-col items-center p-3 bg-white rounded-2xl border border-slate-200 shadow-sm group/item hover:border-blue-400 transition-all">
                <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover/item:text-blue-600 transition-colors">
                  {t.val.toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right" dir="rtl">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-800">
                <History className="w-6 h-6 text-blue-600 ml-2" />
                تاريخ العمليات المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-12 text-center border-t border-slate-100">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">لا توجد عمليات مسجلة</h3>
                  <p className="text-gray-500 max-w-xs mx-auto mt-1">سيظهر سجل مدفوعاتك هنا بمجرد إتمام أول عملية اشتراك.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payments.map((p) => {
                    const status = getStatusInfo(p.status);
                    const Icon = status.icon;
                    return (
                      <React.Fragment key={p.id}>
                        <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${p.status === 'completed' || p.status === 'success' ? 'bg-green-100 text-green-600' :
                              p.status === 'pending_review' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                              } transition-all group-hover:scale-110`}>
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 leading-none mb-1">{p.package_name || 'اشتراك منصة الحلم'}</h4>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium font-mono">
                                <span>#{p.id.slice(-6).toUpperCase()}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                                <span>{formatDate(p.payment_date)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 text-right">
                            <span className="text-lg font-black text-slate-950 font-mono">
                              {p.amount.toLocaleString()} <span className="text-sm font-bold text-slate-400">{p.currency}</span>
                            </span>
                            <Badge variant="outline" className={`rounded-full px-3 py-0.5 border-none shadow-sm ${status.color}`}>
                              <Icon className="w-3 h-3 ml-1.5" />
                              {status.text}
                            </Badge>
                          </div>
                        </div>
                        {p.notes && (p.status === 'cancelled' || p.status === 'failed') && (
                          <div className="px-6 pb-6 -mt-2">
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3">
                              <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-red-700 font-bold leading-relaxed">
                                سبب الرفض: {p.notes}
                              </p>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div >

        <div className="space-y-6">
          <Card className="border-none bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] shadow-xl shadow-blue-500/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardHeader>
              <CardTitle className="text-xl font-black">تحتاج مساعدة؟</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-blue-50/80 text-sm leading-relaxed">
                إذا واجهت أي مشكلة في تفعيل اشتراكك أو لديك استفسار حول طرق الدفع، يسعدنا تواصلك معنا دائماً.
              </p>
              <div className="flex flex-col gap-2">
                <Button className="bg-white text-blue-600 hover:bg-blue-50 w-full rounded-2xl font-bold py-6 group" onClick={() => window.open(getPrimaryWhatsAppNumber(), '_blank')}>
                  تواصل عبر الواتساب
                  <div className="mr-2 p-1 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform">
                    <Zap className="w-4 h-4 text-blue-600 fill-blue-600" />
                  </div>
                </Button>
                <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 w-full rounded-2xl font-bold py-6 backdrop-blur-sm transition-all" onClick={() => setIsSupportModalOpen(true)}>
                  فتح تذكرة دعم
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-slate-50 border-2 border-slate-100/50 rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">تفاصيل العضوية</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  { label: 'نوع الحساب', val: accountType === 'player' ? 'لاعب محترف' : accountType, icon: Zap },
                  { label: 'مدة الاشتراك', val: subscription?.package_duration || 'غير محددة', icon: Calendar },
                  { label: 'بريد التواصل', val: user?.email, icon: AlertCircle },
                  { label: 'المعرف الرقمي', val: user?.uid.slice(0, 10), icon: CreditCard },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 ml-2">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800 font-mono">{item.val}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div >
      {/* Support Ticket Modal */}
      < Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen} >
        <DialogContent className="w-[95vw] sm:w-[450px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem] sm:rounded-[2.5rem]">
          <div className="p-8 text-right" dir="rtl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 shadow-inner">
                <MessageSquare className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 leading-none mb-2">الدعم الفني</DialogTitle>
                <DialogDescription className="text-slate-500 font-bold text-xs uppercase tracking-wider">Help & Support</DialogDescription>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 mr-1">موضوع المشكلة</label>
                <Input
                  placeholder="ما هي المشكلة التي تواجهها؟"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-blue-500 h-12 text-right font-medium transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 mr-1">التفاصيل</label>
                <Textarea
                  placeholder="اشرح لنا المشكلة بالتفصيل هنا..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="min-h-[140px] rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-blue-500 text-right font-medium resize-none leading-relaxed transition-all"
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row-reverse gap-3">
              <Button
                onClick={handleSubmitTicket}
                disabled={isSubmittingTicket}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 px-8 font-black flex-1 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmittingTicket ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    إرسال الطلب
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsSupportModalOpen(false)}
                className="rounded-2xl h-14 px-6 font-bold text-slate-400 hover:bg-slate-100 transition-all"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Subscription Action Modal (Renew / Upgrade) */}
      < Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen} >
        <DialogContent className="w-[95vw] sm:w-[450px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem] sm:rounded-[2.5rem]">
          <div className="p-8 text-center" dir="rtl">
            <div className="mx-auto w-18 h-18 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-200 flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-white/20 rounded-[2rem] animate-pulse"></div>
              <Zap className="w-10 h-10 text-white relative z-10 fill-white" />
            </div>

            <DialogTitle className="text-3xl font-black text-slate-900 mb-3">إدارة اشتراكك</DialogTitle>
            <DialogDescription className="text-slate-600 font-bold mb-10 max-w-[300px] mx-auto leading-relaxed">
              اشتراكك الحالي مفعّل، يمكنك تمديده أو الترقية لمميزات أقوى
            </DialogDescription>

            <div className="space-y-4">
              <button
                className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border-2 border-slate-50 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all group text-right active:scale-[0.98]"
                onClick={() => window.location.href = `/dashboard/shared/bulk-payment?action=renew`}
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-lg text-slate-900 group-hover:text-blue-700">تمديد الاشتراك</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">إضافة مدة جديدة لرصيدك الحالي</p>
                  </div>
                </div>
                <ChevronLeft className="w-6 h-6 text-slate-300 group-hover:translate-x-[-6px] transition-transform" />
              </button>

              <button
                className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border-2 border-slate-50 hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group text-right active:scale-[0.98]"
                onClick={() => window.location.href = `/dashboard/shared/bulk-payment?action=upgrade`}
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-lg text-slate-900 group-hover:text-indigo-700">ترقية الباقة</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">الحصول على مميزات السنوية والهدايا</p>
                  </div>
                </div>
                <ChevronLeft className="w-6 h-6 text-slate-300 group-hover:translate-x-[-6px] transition-transform" />
              </button>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-50">
              <Button
                variant="ghost"
                className="text-slate-400 font-black hover:text-slate-600 hover:bg-slate-50 rounded-xl px-10"
                onClick={() => setIsActionModalOpen(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >
    </div >
  );
};

export default SubscriptionStatusPage;

