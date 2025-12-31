'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Printer,
  Zap,
  TrendingUp,
  FileText,
  User,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { POINTS_CONVERSION } from '@/types/referral';

interface SubscriptionStatus {
  plan_name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'pending' | 'expired' | 'inactive';
  payment_method: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  receipt_url?: string;
  autoRenew: boolean;
  transaction_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_date: string;
  accountType?: string;
  packageType?: string;
  selectedPackage?: string;
  isFromParent?: boolean;
}

export default function SubscriptionStatusPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const accountType = userData?.accountType || 'player';

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    } else if (!loading) {
      router.push('/auth/login');
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
    try {
      if (!user) return;
      setLoading(true);
      setError(null);

      console.log('🔍 [Subscription] جلب بيانات الاشتراك للمستخدم:', user.uid);

      // 1. البحث في مجموعات المدفوعات والاشتراكات بترتيب محدد
      const sources = [
        { name: 'geidea_payments', queryField: 'customerEmail', queryValue: user.email, statusField: 'status', activeStatus: 'success' },
        { name: 'bulkPayments', queryField: 'userId', queryValue: user.uid, statusField: 'status', activeStatus: 'completed' },
        { name: 'bulk_payments', queryField: 'userId', queryValue: user.uid, statusField: 'status', activeStatus: 'completed' },
        { name: 'receipts', queryField: 'userId', queryValue: user.uid, statusField: 'status', activeStatus: 'approved' },
        { name: 'proofs', queryField: 'userId', queryValue: user.uid, statusField: 'status', activeStatus: 'approved' },
        { name: 'payments', queryField: 'userId', queryValue: user.uid, statusField: 'status', activeStatus: 'completed' },
        { name: 'invoices', queryField: 'userId', queryValue: user.uid, statusField: 'status', activeStatus: 'paid' },
        { name: 'subscriptions', queryField: '__name__', queryValue: user.uid, isDoc: true }
      ];

      let foundData = false;

      for (const source of sources) {
        try {
          console.log(`📡 [Subscription] البحث في مصدر: ${source.name}...`);
          let data: any = null;

          if (source.isDoc) {
            const docRef = doc(db, source.name, source.queryValue!);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) data = docSnap.data();
          } else {
            const collRef = collection(db, source.name);

            // محاولة البحث بـ userId أولاً
            let q = query(collRef, where(source.queryField, '==', source.queryValue), limit(1));
            let snap = await getDocs(q);

            // إذا لم ينجح، حاول بـ user_id كبديل (إلا إذا كان البحث بالإيميل)
            if (snap.empty && source.queryField === 'userId') {
              q = query(collRef, where('user_id', '==', source.queryValue), limit(1));
              snap = await getDocs(q);
            }

            // إذا لم ينجح، حاول بـ playerId
            if (snap.empty && source.queryField === 'userId') {
              q = query(collRef, where('playerId', '==', source.queryValue), limit(1));
              snap = await getDocs(q);
            }

            if (!snap.empty) data = snap.docs[0].data();
          }

          if (data) {
            console.log(`✅ [Subscription] تم العثور على بيانات في ${source.name}:`, data);

            const paymentDate = data.paidAt || data.callbackReceivedAt || data.createdAt?.toDate?.() || data.createdAt || new Date().toISOString();
            const startDate = data.start_date || data.startDate || paymentDate;
            const endDate = data.end_date || data.endDate || data.subscription_end || data.expires_at || new Date(new Date(startDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

            const subscriptionData: SubscriptionStatus = {
              plan_name: data.plan_name || data.package_name || data.selectedPackage || 'اشتراك أساسي',
              start_date: typeof startDate === 'string' ? startDate : startDate.toDate?.().toISOString() || startDate.toISOString(),
              end_date: typeof endDate === 'string' ? endDate : endDate.toDate?.().toISOString() || endDate.toISOString(),
              status: (data.status === 'success' || data.status === 'completed' || data.status === 'active' || data.status === 'approved' || data.status === 'paid' || data.status === 'accepted') ? 'active' :
                (data.status === 'pending' || data.status === 'waiting' || data.status === 'processing') ? 'pending' : 'expired',
              payment_method: data.paymentMethod || data.payment_method || (source.name === 'geidea_payments' ? 'Geidea' : 'N/A'),
              amount: data.amount || 0,
              currency: data.currency || 'EGP',
              currencySymbol: data.currencySymbol || (data.currency === 'USD' ? '$' : 'ج.م'),
              receipt_url: data.receiptUrl || data.receipt_url || data.receipt_image || data.receiptImage || data.cloudflare_url || data.r2_url,
              autoRenew: !!data.autoRenew,
              transaction_id: data.transactionId || data.transaction_id || data.orderId || 'N/A',
              invoice_number: data.invoice_number || data.invoiceNumber || `INV-${Date.now()}`,
              customer_name: data.customerName || data.customer_name || data.playerName || data.userName || user.displayName || 'مستخدم',
              customer_email: data.customerEmail || data.customer_email || data.playerEmail || data.userEmail || user.email || '',
              customer_phone: data.customerPhone || data.customer_phone || data.playerPhone || data.phone || data.phone_number || '',
              payment_date: typeof paymentDate === 'string' ? paymentDate : paymentDate.toDate?.().toISOString() || paymentDate.toISOString(),
              accountType: data.accountType || data.account_type || 'player',
              packageType: data.packageType || data.package_type || data.selectedPackage || data.packageName,
              selectedPackage: data.selectedPackage || data.plan_name
            };

            setSubscription(subscriptionData);
            foundData = true;
            break;
          }
        } catch (err) {
          console.warn(`⚠️ [Subscription] فشل البحث في ${source.name}:`, err);
        }
      }

      // 2. البحث في الملف الشخصي لمنظمات اللاعب التابع (Parent Accounts)
      if (!foundData && userData?.accountType === 'player') {
        const parentId = userData.club_id || userData.academy_id || userData.trainer_id || userData.agent_id;
        if (parentId) {
          console.log('🔍 [Subscription] فحص اشتراك الحساب الأب:', parentId);
          const parentDoc = await getDoc(doc(db, 'subscriptions', parentId));
          if (parentDoc.exists()) {
            const data = parentDoc.data();
            const subscriptionData: SubscriptionStatus = {
              plan_name: data.plan_name || 'اشتراك تابع لجهة',
              start_date: data.start_date || new Date().toISOString(),
              end_date: data.end_date || data.expires_at || new Date().toISOString(),
              status: data.status === 'active' ? 'active' : 'inactive',
              payment_method: 'اشتراك مؤسسي',
              amount: 0,
              currency: 'EGP',
              currencySymbol: 'ج.م',
              autoRenew: false,
              transaction_id: 'PARENT',
              invoice_number: `PAR-${parentId}`,
              customer_name: userData.club_name || userData.academy_name || 'جهة تابعة',
              customer_email: '',
              customer_phone: '',
              payment_date: new Date().toISOString(),
              isFromParent: true
            };
            setSubscription(subscriptionData);
            foundData = true;
          }
        }
      }

      // 3. البحث في الملف الشخصي للمستخدم كحل أخير
      if (!foundData) {
        console.log('🔍 [Subscription] فحص بيانات الاشتراك في الملف الشخصي...');
        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          if (uData.subscriptionStatus === 'active') {
            const subscriptionData: SubscriptionStatus = {
              plan_name: uData.selectedPackage || uData.packageType || 'اشتراك أساسي',
              start_date: uData.lastPaymentDate || new Date().toISOString(),
              end_date: uData.subscriptionEndDate?.toDate?.().toISOString() || uData.subscriptionEndDate || new Date().toISOString(),
              status: 'active',
              payment_method: uData.lastPaymentMethod || 'N/A',
              amount: uData.lastPaymentAmount || 0,
              currency: 'EGP',
              currencySymbol: 'ج.م',
              autoRenew: false,
              transaction_id: 'N/A',
              invoice_number: `INV-${Date.now()}`,
              customer_name: uData.displayName || user.displayName || 'مستخدم',
              customer_email: uData.email || user.email || '',
              customer_phone: uData.phone || '',
              payment_date: uData.lastPaymentDate || new Date().toISOString(),
            };
            setSubscription(subscriptionData);
            foundData = true;
          }
        }
      }

      if (!foundData) {
        setError('لم يتم العثور على بيانات اشتراك نشطة. يرجى إتمام عملية الدفع للحصول على الاشتراك.');
      }
    } catch (err) {
      console.error('❌ [Subscription] خطأ عام:', err);
      setError('حدث خطأ أثناء تحميل بيانات الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'pending': return 'قيد المراجعة';
      case 'expired': return 'منتهي';
      default: return 'غير مفعل';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handlePrintInvoice = () => {
    if (!subscription) return;
    setPrinting(true);

    // Logic for printing here...
    window.print();
    setPrinting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">جاري جلب بيانات الاشتراك...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-700 mb-2">تنبيه</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <Button onClick={() => router.push(`/dashboard/${accountType}/bulk-payment`)} className="bg-red-600 hover:bg-red-700">
              الذهاب لصفحة الباقات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">حالة الاشتراك</h1>
          <p className="text-gray-500">مرحباً بك في لوحة تحكم اشتراكك وتفاصيل الدفع</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={() => fetchSubscriptionStatus()} title="تحديث البيانات">
            <TrendingUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handlePrintInvoice}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة الفاتورة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Status Block */}
        <Card className="lg:col-span-2 overflow-hidden border-blue-100 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Zap className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                تفاصيل الباقة الحالية
              </CardTitle>
              <Badge className={getStatusColor(subscription?.status || '')}>
                {getStatusText(subscription?.status || '')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> الباقة
                </p>
                <p className="text-lg font-bold text-gray-900">{subscription?.plan_name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" /> تاريخ الانتهاء
                </p>
                <p className="text-lg font-bold text-gray-900">{formatDate(subscription?.end_date || '')}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" /> طريقة الدفع
                </p>
                <p className="text-lg font-bold text-gray-900">{subscription?.payment_method}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex flex-wrap gap-4">
                <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-100">
                  تبدأ في: {formatDate(subscription?.start_date || '')}
                </Badge>
                {subscription?.autoRenew && (
                  <Badge variant="secondary" className="px-3 py-1 bg-green-50 text-green-700 border-green-100">
                    تجديد تلقائي: مفعل
                  </Badge>
                )}
                {subscription?.isFromParent && (
                  <Badge variant="default" className="px-3 py-1 bg-purple-50 text-purple-700 border-purple-100">
                    اشتراك مؤسسي
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount Side Card */}
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">القيمة المدفوعة</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-5xl font-bold text-blue-700 mb-2">
              {subscription?.amount}
              <span className="text-2xl ml-2">{subscription?.currencySymbol}</span>
            </div>
            <p className="text-sm text-blue-600 font-medium">إجمالي آخر دفعة</p>
            <div className="mt-6 w-full">
              <Button onClick={() => router.push(`/dashboard/${accountType}/bulk-payment`)} className="w-full bg-blue-600 hover:bg-blue-700 group">
                تجديد أو ترقية
                <ArrowRight className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details Section */}
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        تفاصيل الفاتورة
      </h2>
      <Card className="border-gray-100 shadow-sm mb-8">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 border-b md:border-b-0 md:border-l border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">بيانات العميل</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">الاسم الكامل</p>
                    <p className="font-medium text-gray-900">{subscription?.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                    <p className="font-medium text-gray-900">{subscription?.customer_email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">رقم الهاتف</p>
                    <p className="font-medium text-gray-900">{subscription?.customer_phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">بيانات العملية</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">رقم الفاتورة</p>
                  <p className="font-mono font-medium text-blue-700">{subscription?.invoice_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">رقم الحركة (Transaction ID)</p>
                  <p className="font-mono text-sm text-gray-600 truncate">{subscription?.transaction_id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">تاريخ الدفع</p>
                  <p className="font-medium text-gray-900">{formatDate(subscription?.payment_date || '')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Message */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
        <p className="text-sm text-gray-600">
          تواجه مشكلة في اشتراكك؟
          <a href="mailto:support@el7lm.com" className="text-blue-600 font-bold mr-2 hover:underline">اتصل بالدعم الفني</a>
        </p>
      </div>
    </div>
  );
}
