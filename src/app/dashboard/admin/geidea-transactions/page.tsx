'use client';

import { useEffect, useState } from 'react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { RefreshCw, Download, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface GeideaTransaction {
  id: string;
  orderId?: string;
  merchantReferenceId?: string;
  status: string;
  amount?: number;
  currency?: string;
  responseCode?: string;
  detailedResponseCode?: string;
  responseMessage?: string;
  detailedResponseMessage?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  paidAt?: string;
  fetchedFromGeideaAt?: string;
  createdAt?: any;
  wasNew?: boolean;
  source?: string; // 'firestore_geidea_payments', 'firestore_bulkPayments', 'geidea_api'
}

export default function GeideaTransactionsPage() {
  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({ allowedTypes: ['admin'] });
  const [transactions, setTransactions] = useState<GeideaTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<GeideaTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<GeideaTransaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [updatingTransactions, setUpdatingTransactions] = useState<Set<string>>(new Set());
  const [updatingPending, setUpdatingPending] = useState(false);
  
  // فلاتر
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // all, success, failed, pending
  });

  useEffect(() => {
    if (!isCheckingAuth && isAuthorized) {
      fetchTransactions();
    }
  }, [isAuthorized, isCheckingAuth]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filters]);

  // تحديث تلقائي للمعاملات المعلقة كل 5 دقائق
  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(() => {
      const pendingTransactions = transactions.filter(t => 
        t.status === 'pending' || t.status === 'processing'
      );
      
      if (pendingTransactions.length > 0) {
        console.log(`🔄 [Auto Update] Updating ${pendingTransactions.length} pending transactions...`);
        // استدعاء الوظيفة مباشرة
        updatePendingTransactions();
      }
    }, 5 * 60 * 1000); // كل 5 دقائق

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, isAuthorized]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // جلب من Firestore أولاً (للمدفوعات القديمة والجديدة)
      const allTransactions: GeideaTransaction[] = [];

      // 1. جلب من geidea_payments
      try {
        const geideaPaymentsRef = collection(db, 'geidea_payments');
        let geideaSnapshot;
        try {
          const geideaQuery = query(geideaPaymentsRef, orderBy('createdAt', 'desc'));
          geideaSnapshot = await getDocs(geideaQuery);
        } catch (orderByError) {
          // إذا فشل orderBy (لا يوجد index)، نجلب بدون ترتيب
          console.warn('⚠️ orderBy failed for geidea_payments, fetching without order:', orderByError);
          geideaSnapshot = await getDocs(geideaPaymentsRef);
        }
        
        geideaSnapshot.forEach((doc) => {
          const data = doc.data();
          allTransactions.push({
            id: doc.id,
            orderId: data.orderId || data.geideaOrderId || doc.id,
            merchantReferenceId: data.merchantReferenceId || data.ourMerchantReferenceId,
            status: data.status || 'pending',
            amount: data.amount || null,
            currency: data.currency || 'EGP',
            responseCode: data.responseCode,
            detailedResponseCode: data.detailedResponseCode,
            responseMessage: data.responseMessage,
            detailedResponseMessage: data.detailedResponseMessage,
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            paidAt: data.paidAt,
            fetchedFromGeideaAt: data.fetchedFromGeideaAt,
            createdAt: data.createdAt,
            source: 'firestore_geidea_payments',
          });
        });
        
        console.log(`✅ جلب ${geideaSnapshot.size} معاملة من geidea_payments`);
      } catch (error) {
        console.error('Error fetching from geidea_payments:', error);
      }

      // 2. جلب من bulkPayments - نجلب جميع المدفوعات ثم نفلترها في الكود
      try {
        const bulkPaymentsRef = collection(db, 'bulkPayments');
        let bulkSnapshot;
        
        // محاولة الجلب مع orderBy أولاً
        try {
          const bulkQuery = query(bulkPaymentsRef, orderBy('createdAt', 'desc'));
          bulkSnapshot = await getDocs(bulkQuery);
        } catch (orderByError) {
          // إذا فشل orderBy، نجلب بدون ترتيب
          console.warn('⚠️ orderBy failed for bulkPayments, fetching without order:', orderByError);
          bulkSnapshot = await getDocs(bulkPaymentsRef);
        }
        
        let geideaCount = 0;
        bulkSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // التحقق من أن هذه مدفوعة جيديا (من خلال فحص paymentMethod أو transactionId أو أي علامة أخرى)
          const isGeideaPayment = 
            data.paymentMethod === 'geidea' ||
            data.method === 'geidea' ||
            data.gateway === 'geidea' ||
            (data.transactionId && typeof data.transactionId === 'string' && data.transactionId.length > 10) || // transactionId من جيديا عادة طويل
            (data.orderId && typeof data.orderId === 'string' && data.orderId.includes('-')) || // orderId من جيديا عادة يحتوي على شرطات
            (data.merchantReferenceId && typeof data.merchantReferenceId === 'string' && data.merchantReferenceId.startsWith('EL7LM')); // merchantReferenceId يبدأ بـ EL7LM
          
          if (isGeideaPayment) {
            geideaCount++;
            
            // استخراج اسم العميل ورقم الهاتف (مثل ما يحدث في صفحة المدفوعات)
            let customerName = data.customerName || data.playerName || 'غير محدد';
            let customerPhone = data.customerPhone || data.phone || '';
            
            // إذا كان هناك players array، نأخذ البيانات منه
            if (data.players && Array.isArray(data.players) && data.players.length > 0) {
              const player = data.players[0];
              if (player.name && !customerName.includes('@')) {
                customerName = player.name;
              }
              if (player.phone && !customerPhone) {
                customerPhone = player.phone;
              }
            }
            
            // التحقق من عدم وجود المعاملة مسبقاً (تجنب التكرار)
            const existingIndex = allTransactions.findIndex(
              t => (t.orderId && data.orderId && t.orderId === data.orderId) || 
                   (t.merchantReferenceId && data.merchantReferenceId && t.merchantReferenceId === data.merchantReferenceId) ||
                   t.id === doc.id
            );
            
            if (existingIndex === -1) {
              allTransactions.push({
                id: doc.id,
                orderId: data.orderId || data.transactionId || doc.id,
                merchantReferenceId: data.merchantReferenceId || data.reference || data.merchantRef,
                status: data.status || 'pending',
                amount: data.amount || data.total || null,
                currency: data.currency || 'EGP',
                responseCode: data.responseCode,
                detailedResponseCode: data.detailedResponseCode,
                responseMessage: data.responseMessage || data.detailedResponseMessage || data.errorMessage,
                detailedResponseMessage: data.detailedResponseMessage,
                customerEmail: data.customerEmail || data.email,
                customerName: customerName,
                customerPhone: customerPhone,
                paidAt: data.paidAt || data.timestamp || data.paymentDate,
                createdAt: data.createdAt,
                source: 'firestore_bulkPayments',
              });
            }
          }
        });
        
        console.log(`✅ جلب ${geideaCount} معاملة جيديا من ${bulkSnapshot.size} مدفوعة في bulkPayments`);
      } catch (error) {
        console.error('Error fetching from bulkPayments:', error);
      }

      // ترتيب حسب التاريخ (الأحدث أولاً)
      allTransactions.sort((a, b) => {
        const dateA = a.paidAt 
          ? new Date(a.paidAt).getTime()
          : a.createdAt?.toDate 
            ? a.createdAt.toDate().getTime()
            : 0;
        const dateB = b.paidAt 
          ? new Date(b.paidAt).getTime()
          : b.createdAt?.toDate 
            ? b.createdAt.toDate().getTime()
            : 0;
        return dateB - dateA;
      });

      setTransactions(allTransactions);
      toast.success(`تم جلب ${allTransactions.length} معاملة من Firestore`);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('حدث خطأ أثناء جلب المعاملات');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromGeidea = async () => {
    try {
      setFetching(true);
      
      // استخدام API الجديد لجلب جميع المعاملات من Geidea
      toast.loading('جاري جلب المعاملات من Geidea...', { id: 'fetching-geidea' });
      
      // جلب merchantReferenceIds من transactions الحالية (بدون استخدام Firestore)
      const currentMerchantRefs = transactions
        .filter(t => t.merchantReferenceId && t.merchantReferenceId.startsWith('EL7LM'))
        .slice(0, 10)
        .map(t => t.merchantReferenceId!);

      const response = await fetch('/api/geidea/fetch-all-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          merchantReferenceIds: currentMerchantRefs, // استخدام القائمة الحالية بدلاً من جلب من Firestore
          limit: 10,
          save: false // لا نحفظ في Firestore لتجنب Quota
        }),
      });
      
      const data = await response.json();
      toast.dismiss('fetching-geidea');

      if (data.success) {
        const { results, quotaWarning } = data;
        
        if (quotaWarning) {
          toast.error(
            '⚠️ تم تجاوز الحصة المسموحة في Firestore. تم إيقاف الجلب. يرجى المحاولة مرة أخرى بعد قليل.',
            { duration: 8000 }
          );
        } else {
          toast.success(
            `✅ تم جلب ${results.success} معاملة من Geidea بنجاح${results.failed > 0 ? ` (فشل ${results.failed})` : ''}${results.notFound > 0 ? ` (غير موجودة ${results.notFound})` : ''}${results.remaining > 0 ? ` (${results.remaining} متبقية)` : ''}`,
            { duration: 5000 }
          );
        }
        
        // إعادة جلب المعاملات من Firestore بعد التحديث (فقط إذا لم يكن هناك quota error)
        if (!quotaWarning) {
          await fetchTransactions();
        }
      } else {
        const errorMsg = data.error || 'فشل جلب المعاملات من Geidea';
        const isQuotaError = errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('Quota exceeded');
        
        if (isQuotaError) {
          toast.error(
            '⚠️ تم تجاوز الحصة المسموحة في Firestore. يرجى المحاولة مرة أخرى بعد قليل أو التحقق من إعدادات Firestore.',
            { duration: 8000 }
          );
        } else {
          toast.error(errorMsg, { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('Error fetching from Geidea:', error);
      toast.dismiss('fetching-geidea');
      toast.error('حدث خطأ أثناء جلب المعاملات من Geidea');
    } finally {
      setFetching(false);
    }
  };

  // تحديث معاملة واحدة من Geidea
  const updateTransactionFromGeidea = async (transaction: GeideaTransaction) => {
    const transactionId = transaction.orderId || transaction.merchantReferenceId;
    if (!transactionId) {
      toast.error('لا يمكن تحديث المعاملة: لا يوجد orderId أو merchantReferenceId');
      return;
    }

    try {
      setUpdatingTransactions(prev => new Set(prev).add(transactionId));

      const params = new URLSearchParams();
      if (transaction.orderId) {
        params.append('orderId', transaction.orderId);
      }
      if (transaction.merchantReferenceId) {
        params.append('merchantReferenceId', transaction.merchantReferenceId);
      }
      params.append('save', 'true'); // حفظ تلقائياً في Firestore

      const response = await fetch(`/api/geidea/fetch-order?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.saved) {
        toast.success(`✅ تم تحديث المعاملة من Geidea (${data.savedData?.status || 'محدث'})`);
        // إعادة جلب المعاملات من Firestore
        await fetchTransactions();
      } else {
        toast.error(data.error || 'فشل تحديث المعاملة من Geidea');
      }
    } catch (error) {
      console.error('Error updating transaction from Geidea:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة من Geidea');
    } finally {
      setUpdatingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  // تحديث جميع المعاملات المعلقة
  const updatePendingTransactions = async () => {
    const pendingTransactions = transactions.filter(t => 
      t.status === 'pending' || t.status === 'processing'
    );

    if (pendingTransactions.length === 0) {
      toast.info('لا توجد معاملات معلقة للتحديث');
      return;
    }

    try {
      setUpdatingPending(true);
      let successCount = 0;
      let failCount = 0;

      toast.loading(`جاري تحديث ${pendingTransactions.length} معاملة معلقة...`, { id: 'updating-pending' });

      for (const transaction of pendingTransactions) {
        try {
          const transactionId = transaction.orderId || transaction.merchantReferenceId;
          if (!transactionId) {
            failCount++;
            continue;
          }

          const params = new URLSearchParams();
          if (transaction.orderId) {
            params.append('orderId', transaction.orderId);
          }
          if (transaction.merchantReferenceId) {
            params.append('merchantReferenceId', transaction.merchantReferenceId);
          }
          params.append('save', 'true');

          const response = await fetch(`/api/geidea/fetch-order?${params.toString()}`);
          const data = await response.json();

          if (data.success && data.saved) {
            successCount++;
          } else {
            failCount++;
          }

          // تأخير بسيط لتجنب rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Error updating transaction:', error);
          failCount++;
        }
      }

      toast.dismiss('updating-pending');
      toast.success(`تم تحديث ${successCount} معاملة بنجاح${failCount > 0 ? ` (فشل ${failCount})` : ''}`);
      
      // إعادة جلب المعاملات من Firestore
      await fetchTransactions();
    } catch (error) {
      console.error('Error updating pending transactions:', error);
      toast.dismiss('updating-pending');
      toast.error('حدث خطأ أثناء تحديث المعاملات المعلقة');
    } finally {
      setUpdatingPending(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // فلتر البحث
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.orderId?.toLowerCase().includes(searchLower) ||
        t.merchantReferenceId?.toLowerCase().includes(searchLower) ||
        t.customerEmail?.toLowerCase().includes(searchLower) ||
        t.customerName?.toLowerCase().includes(searchLower) ||
        t.customerPhone?.toLowerCase().includes(searchLower)
      );
    }

    // فلتر الحالة
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => {
        if (filters.status === 'success') {
          return t.status === 'success' || t.status === 'completed' || t.status === 'paid' || t.responseCode === '000';
        }
        if (filters.status === 'failed') {
          return t.status === 'failed' || t.status === 'rejected' || (t.responseCode && t.responseCode !== '000');
        }
        if (filters.status === 'pending') {
          return t.status === 'pending' || t.status === 'processing';
        }
        return true;
      });
    }

    setFilteredTransactions(filtered);
  };

  const getStatusIcon = (status: string, responseCode?: string) => {
    if (status === 'success' || status === 'completed' || status === 'paid' || responseCode === '000') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (status === 'failed' || status === 'rejected') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (status === 'pending' || status === 'processing') {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-gray-500" />;
  };

  const getStatusBadge = (status: string, responseCode?: string) => {
    if (status === 'success' || status === 'completed' || status === 'paid' || responseCode === '000') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">نجح</span>;
    }
    if (status === 'failed' || status === 'rejected') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">فشل</span>;
    }
    if (status === 'pending' || status === 'processing') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">قيد الانتظار</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
  };

  if (isCheckingAuth) {
    return <div className="p-8 text-center">جاري التحقق من الصلاحيات...</div>;
  }

  if (!isAuthorized) {
    return <div className="p-8 text-center text-red-600">غير مصرح لك بالوصول إلى هذه الصفحة</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">معاملات جيديا</h1>
        <p className="text-gray-600">عرض جميع معاملات جيديا المحفوظة في Firestore</p>
      </div>

      {/* أزرار الإجراءات */}
      <div className="mb-6">
        <div className="flex gap-4 flex-wrap mb-3">
          <button
            onClick={fetchFromGeidea}
            disabled={fetching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            title="جلب المعاملات من Geidea وتحديثها في Firestore (يستخدم Firestore Quota)"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            {fetching ? 'جاري الجلب...' : 'جلب من جيديا API'}
          </button>
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'جاري التحديث...' : 'تحديث من Firestore'}
          </button>
          <button
            onClick={updatePendingTransactions}
            disabled={updatingPending || transactions.filter(t => t.status === 'pending' || t.status === 'processing').length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${updatingPending ? 'animate-spin' : ''}`} />
            {updatingPending ? 'جاري التحديث...' : `تحديث المعاملات المعلقة (${transactions.filter(t => t.status === 'pending' || t.status === 'processing').length})`}
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-4">
          <div className="font-semibold mb-2">📋 معلومات مهمة:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>جلب من Firestore:</strong> يعرض جميع المعاملات المحفوظة محلياً (موصى به) ✅</li>
            <li><strong>جلب من جيديا API:</strong> وفقاً لـ <a href="https://docs.geidea.net/docs/geidea-checkout-v2" target="_blank" rel="noopener noreferrer" className="underline">وثائق Geidea</a>، لا توفر الشركة API مباشر لجلب جميع المعاملات</li>
            <li><strong>تحديث معاملة محددة:</strong> استخدم زر "تحديث" بجانب كل معاملة لجلب أحدث بياناتها من Geidea ✅</li>
            <li><strong>تحديث المعاملات المعلقة:</strong> استخدم زر "تحديث المعاملات المعلقة" لتحديث جميع المعاملات المعلقة دفعة واحدة ✅</li>
            <li><strong>تحديث تلقائي:</strong> يتم تحديث المعاملات المعلقة تلقائياً كل 5 دقائق ✅</li>
            <li><strong>المدفوعات الجديدة:</strong> تأتي تلقائياً عبر callback من Geidea وتُحفظ في Firestore ✅</li>
            <li><strong>عرض جميع المعاملات:</strong> استخدم <a href="https://merchant.geidea.net" target="_blank" rel="noopener noreferrer" className="underline">Geidea Merchant Portal</a> لعرض جميع المعاملات</li>
            <li><strong>البيانات الحالية:</strong> تم جلب {transactions.length} معاملة من Firestore</li>
          </ul>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">بحث</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="ابحث عن orderId، merchantReferenceId، بريد، اسم..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">الكل</option>
              <option value="success">نجحت</option>
              <option value="failed">فشلت</option>
              <option value="pending">قيد الانتظار</option>
            </select>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">إجمالي المعاملات</div>
          <div className="text-2xl font-bold text-gray-800">{filteredTransactions.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-600">نجحت</div>
          <div className="text-2xl font-bold text-green-800">
            {filteredTransactions.filter(t => t.status === 'success' || t.status === 'completed' || t.responseCode === '000').length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-sm text-red-600">فشلت</div>
          <div className="text-2xl font-bold text-red-800">
            {filteredTransactions.filter(t => t.status === 'failed' || t.status === 'rejected').length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-600">قيد الانتظار</div>
          <div className="text-2xl font-bold text-yellow-800">
            {filteredTransactions.filter(t => t.status === 'pending' || t.status === 'processing').length}
          </div>
        </div>
      </div>

      {/* جدول المعاملات */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Merchant Ref</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المصدر</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {loading || fetching ? 'جاري التحميل...' : 'لا توجد معاملات'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status, transaction.responseCode)}
                        {getStatusBadge(transaction.status, transaction.responseCode)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {transaction.orderId || transaction.geideaOrderId || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {transaction.merchantReferenceId || transaction.ourMerchantReferenceId || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{transaction.customerName || 'غير محدد'}</div>
                      <div className="text-xs text-gray-500">{transaction.customerEmail || transaction.customerPhone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {transaction.amount ? `${transaction.amount.toLocaleString()} ${transaction.currency || 'EGP'}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {transaction.paidAt 
                        ? new Date(transaction.paidAt).toLocaleString('ar-EG')
                        : transaction.createdAt?.toDate 
                          ? transaction.createdAt.toDate().toLocaleString('ar-EG')
                          : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {transaction.source === 'firestore_geidea_payments' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">geidea_payments</span>
                      )}
                      {transaction.source === 'firestore_bulkPayments' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">bulkPayments</span>
                      )}
                      {transaction.source === 'geidea_api' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">جيديا API</span>
                      )}
                      {!transaction.source && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">غير محدد</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowDetails(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          التفاصيل
                        </button>
                        <button
                          onClick={() => updateTransactionFromGeidea(transaction)}
                          disabled={updatingTransactions.has(transaction.orderId || transaction.merchantReferenceId || '')}
                          className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-1"
                          title="تحديث من Geidea"
                        >
                          <RefreshCw className={`w-3 h-3 ${updatingTransactions.has(transaction.orderId || transaction.merchantReferenceId || '') ? 'animate-spin' : ''}`} />
                          تحديث
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* موديول التفاصيل */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">تفاصيل المعاملة</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Order ID:</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedTransaction.orderId || selectedTransaction.geideaOrderId || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Merchant Reference ID:</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedTransaction.merchantReferenceId || selectedTransaction.ourMerchantReferenceId || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">الحالة:</label>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status, selectedTransaction.responseCode)}</div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">المبلغ:</label>
                  <p className="text-gray-900 font-semibold">
                    {selectedTransaction.amount ? `${selectedTransaction.amount.toLocaleString()} ${selectedTransaction.currency || 'EGP'}` : '-'}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Response Code:</label>
                  <p className="text-gray-900 font-mono">{selectedTransaction.responseCode || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Detailed Response Code:</label>
                  <p className="text-gray-900 font-mono">{selectedTransaction.detailedResponseCode || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">اسم العميل:</label>
                  <p className="text-gray-900">{selectedTransaction.customerName || 'غير محدد'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">بريد العميل:</label>
                  <p className="text-gray-900">{selectedTransaction.customerEmail || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">هاتف العميل:</label>
                  <p className="text-gray-900">{selectedTransaction.customerPhone || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">التاريخ:</label>
                  <p className="text-gray-900">
                    {selectedTransaction.paidAt 
                      ? new Date(selectedTransaction.paidAt).toLocaleString('ar-EG')
                      : selectedTransaction.createdAt?.toDate 
                        ? selectedTransaction.createdAt.toDate().toLocaleString('ar-EG')
                        : '-'}
                  </p>
                </div>
              </div>
              {(selectedTransaction.responseMessage || selectedTransaction.detailedResponseMessage) && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <h4 className="font-bold text-red-800 mb-1">رسالة الخطأ:</h4>
                  <p className="text-red-700 text-sm">{selectedTransaction.responseMessage || selectedTransaction.detailedResponseMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

