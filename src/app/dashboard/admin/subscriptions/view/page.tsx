'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, doc, getDoc, orderBy, updateDoc } from 'firebase/firestore';
import { 
  Calendar, 
  CreditCard, 
  Package, 
  RefreshCw, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  Users,
  FileText
} from 'lucide-react';

export default function AdminSubscriptionsView() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  
  // حالات البيانات
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });
  
  // حالات التحميل والفلترة
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  // التحقق من صلاحيات الأدمن
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!loading && user) {
      checkAdminAccess();
    }
  }, [user, loading, router]);

  const checkAdminAccess = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.accountType !== 'admin') {
          router.push('/dashboard');
          return;
        }
      }
      fetchAllData();
    } catch (error) {
      console.error('خطأ في التحقق من صلاحيات الأدمن:', error);
      router.push('/dashboard');
    }
  };

  // جلب جميع البيانات
  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      console.log('🔄 بدء جلب بيانات الاشتراكات والفواتير...');

      // محول آمن لأي نوع تاريخ (Firestore Timestamp | Date | string | number)
      const toDate = (value) => {
        if (!value) return undefined;
        try {
          if (typeof value === 'object' && typeof value.toDate === 'function') {
            return value.toDate();
          }
          if (value instanceof Date) {
            return value;
          }
          const d = new Date(value);
          return isNaN(d.getTime()) ? undefined : d;
        } catch (e) {
          return undefined;
        }
      };

      // جلب جميع الاشتراكات
      const subscriptionsQuery = query(collection(db, 'subscriptions'), orderBy('start_date', 'desc'));
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const subscriptionsData = [];
      
      subscriptionsSnapshot.forEach((doc) => {
        const data = doc.data();
        subscriptionsData.push({
          id: doc.id,
          user_id: data.user_id,
          plan_name: data.plan_name || 'غير محدد',
          start_date: toDate(data.start_date),
          end_date: toDate(data.end_date),
          status: data.status || 'pending',
          amount: data.amount || 0,
          currency: data.currency || 'USD',
          payment_method: data.payment_method || 'غير محدد',
          transaction_id: data.transaction_id,
          user_name: data.user_name || 'غير محدد',
          user_email: data.user_email || 'غير محدد'
        });
      });
      
      console.log(`✅ تم جلب ${subscriptionsData.length} اشتراك`);
      setSubscriptions(subscriptionsData);

      // جلب جميع الفواتير
      let invoicesData = [];
      try {
        const invoicesQuery = query(collection(db, 'invoices'), orderBy('created_at', 'desc'));
        const invoicesSnapshot = await getDocs(invoicesQuery);
        
        invoicesSnapshot.forEach((doc) => {
          const data = doc.data();
          invoicesData.push({
            id: doc.id,
            invoice_number: data.invoice_number || `INV-${doc.id.slice(0, 8)}`,
            user_id: data.user_id,
            amount: data.amount || 0,
            currency: data.currency || 'USD',
            status: data.status || 'pending',
            created_at: toDate(data.created_at),
            plan_name: data.plan_name || 'غير محدد',
            user_name: data.user_name || 'غير محدد',
            user_email: data.user_email || 'غير محدد'
          });
        });
        
        console.log(`✅ تم جلب ${invoicesData.length} فاتورة`);
        setInvoices(invoicesData);
      } catch (error) {
        console.warn('⚠️ لا يمكن جلب الفواتير، ربما الجدول غير موجود:', error);
        setInvoices([]);
        invoicesData = [];
      }

      // في حال عدم وجود فواتير، نحاول الاشتقاق من مجموعات المدفوعات القائمة
      if (!invoicesData || invoicesData.length === 0) {
        try {
          const paymentCollections = ['payments', 'subscriptionPayments', 'bulkPayments'];
          for (const colName of paymentCollections) {
            try {
              const snap = await getDocs(query(collection(db, colName), orderBy('createdAt', 'desc')));
              snap.forEach((doc) => {
                const p = doc.data();
                const mapStatus = (s) => {
                  if (s === 'completed') return 'paid';
                  if (s === 'pending') return 'pending';
                  if (s === 'refunded') return 'cancelled';
                  if (s === 'failed' || s === 'cancelled') return 'cancelled';
                  return 'pending';
                };
                invoicesData.push({
                  id: `${colName}-${doc.id}`,
                  invoice_number: `PAY-${doc.id.slice(0, 8)}`,
                  user_id: p.userId,
                  amount: p.amount || p.totalAmount || 0,
                  currency: p.currency || 'USD',
                  status: mapStatus(p.status),
                  created_at: toDate(p.createdAt),
                  plan_name: p.plan_name || p.packageType || p.planType || p.planName || p.plan || p.subscription_type || 'غير محدد',
                  user_name: p.userName || 'غير محدد',
                  user_email: p.userEmail || 'غير محدد'
                });
              });
            } catch (e) {
              // تجاهل أخطاء المجموعات غير الموجودة
            }
          }
          if (invoicesData.length > 0) {
            console.log(`ℹ️ تم اشتقاق ${invoicesData.length} فاتورة من بيانات المدفوعات`);
            setInvoices(invoicesData);
          }
        } catch (e) {
          console.warn('⚠️ فشل اشتقاق الفواتير من المدفوعات:', e);
        }
      }

      // حساب الإحصائيات
      calculateStats(subscriptionsData, invoicesData);

    } catch (error) {
      console.error('❌ خطأ في جلب البيانات:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // حساب الإحصائيات
  const calculateStats = (subs, invs) => {
    const activeCount = subs.filter(s => s.status === 'active').length;
    const totalRevenue = invs.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
    const pendingPayments = invs.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);

    setStats({
      totalSubscriptions: subs.length,
      activeSubscriptions: activeCount,
      totalRevenue: totalRevenue,
      pendingPayments: pendingPayments
    });
  };

  // دوال التنسيق
  const formatDate = (dateLike) => {
    const date = (() => {
      if (!dateLike) return undefined;
      if (typeof dateLike === 'object' && typeof dateLike.toDate === 'function') return dateLike.toDate();
      if (dateLike instanceof Date) return dateLike;
      const d = new Date(dateLike);
      return isNaN(d.getTime()) ? undefined : d;
    })();
    if (!date) return 'غير محدد';
    // عرض التاريخ بالتقويم الميلادي (Gregorian) مع صيغة عربية
    return date.toLocaleDateString('ar-EG-u-ca-gregory', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': case 'paid': return 'text-green-700 bg-green-100 border-green-200';
      case 'expired': case 'cancelled': return 'text-red-700 bg-red-100 border-red-200';
      case 'pending': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'pending': return 'في الانتظار';
      case 'cancelled': return 'ملغي';
      case 'paid': return 'مدفوع';
      default: return status;
    }
  };

  // تحديث حالة الاشتراك
  const updateSubscriptionStatus = async (subscriptionId, newStatus) => {
    try {
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        status: newStatus,
        updated_at: new Date()
      });
      
      setSubscriptions(prev => prev.map(sub => 
        sub.id === subscriptionId ? { ...sub, status: newStatus } : sub
      ));
      
      console.log(`✅ تم تحديث حالة الاشتراك إلى: ${newStatus}`);
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الاشتراك:', error);
    }
  };

  // فلترة البيانات
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    return true;
  });

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    return true;
  });

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">جاري تحميل بيانات الاشتراكات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* العنوان والإحصائيات */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏛️ إدارة الاشتراكات والفواتير</h1>
              <p className="text-gray-600 mt-2">مراقبة وإدارة جميع اشتراكات المستخدمين والفواتير</p>
            </div>
            <button
              onClick={fetchAllData}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              تحديث البيانات
            </button>
          </div>

          {/* الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">إجمالي الاشتراكات</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalSubscriptions}</p>
                </div>
                <Package className="w-12 h-12 text-blue-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">الاشتراكات النشطة</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">إجمالي الإيرادات</p>
                  <p className="text-3xl font-bold text-purple-600">${stats.totalRevenue}</p>
                </div>
                <DollarSign className="w-12 h-12 text-purple-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">المدفوعات المعلقة</p>
                  <p className="text-3xl font-bold text-yellow-600">${stats.pendingPayments}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* فلاتر البحث */}
        <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              aria-label="فلترة حسب الحالة"
              title="فلترة حسب الحالة"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="expired">منتهي</option>
              <option value="pending">معلق</option>
              <option value="cancelled">ملغي</option>
              <option value="paid">مدفوع</option>
            </select>
          </div>
        </div>

        {/* جدول الاشتراكات */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" />
            الاشتراكات ({filteredSubscriptions.length})
          </h2>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستخدم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الباقة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ البداية</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانتهاء</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubscriptions.length > 0 ? filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{subscription.user_name}</div>
                          <div className="text-sm text-gray-500">{subscription.user_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{subscription.plan_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {subscription.amount} {subscription.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(subscription.start_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(subscription.end_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(subscription.status)}`}>
                          {getStatusText(subscription.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateSubscriptionStatus(subscription.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                            title="تفعيل"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateSubscriptionStatus(subscription.id, 'expired')}
                            className="text-red-600 hover:text-red-900"
                            title="إنهاء"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium">لا توجد اشتراكات</p>
                          <p className="text-sm">ستظهر الاشتراكات هنا عند إتمام عمليات الشراء</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* جدول الفواتير */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            الفواتير ({filteredInvoices.length})
          </h2>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الفاتورة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستخدم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الباقة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.user_name}</div>
                          <div className="text-sm text-gray-500">{invoice.user_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{invoice.plan_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {invoice.amount} {invoice.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium">لا توجد فواتير</p>
                          <p className="text-sm">ستظهر الفواتير هنا عند إتمام عمليات الدفع</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
} 
