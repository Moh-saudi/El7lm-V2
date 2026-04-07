'use client';

import { useEffect, useState } from 'react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { supabase } from '@/lib/supabase/config';
import toast from 'react-hot-toast';
import { RefreshCw, Download, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle, Upload, Save } from 'lucide-react';

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
  source?: string; // 'firestore_geidea_payments', 'firestore_bulkPayments', 'geidea_api', 'imported_from_bulk'
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
  const [syncing, setSyncing] = useState(false);

  // متغيرات الاستيراد
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchingLegacy, setSearchingLegacy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [foundTransactions, setFoundTransactions] = useState<GeideaTransaction[]>([]);
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());

  // فلاتر
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // all, success, failed, pending
    fromDate: '',
    toDate: '',
    minAmount: '',
    maxAmount: '',
    currency: 'all', // all, EGP, SAR, USD, etc.
    source: 'all', // all, firestore_geidea_payments, imported_from_bulk
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
        const { data: geideaRows, error: geideaError } = await supabase
          .from('geidea_payments')
          .select('*')
          .order('createdAt', { ascending: false });

        if (geideaError) {
          console.warn('⚠️ orderBy failed for geidea_payments, fetching without order:', geideaError);
          const { data: fallbackRows } = await supabase.from('geidea_payments').select('*');
          (fallbackRows || []).forEach((row) => {
            allTransactions.push({
              id: row.id,
              orderId: row.orderId || row.geideaOrderId || row.id,
              merchantReferenceId: row.merchantReferenceId || row.ourMerchantReferenceId,
              status: row.status || 'pending',
              amount: row.amount || null,
              currency: row.currency || 'EGP',
              responseCode: row.responseCode,
              detailedResponseCode: row.detailedResponseCode,
              responseMessage: row.responseMessage,
              detailedResponseMessage: row.detailedResponseMessage,
              customerEmail: row.customerEmail,
              customerName: row.customerName,
              customerPhone: row.customerPhone,
              paidAt: row.paidAt,
              fetchedFromGeideaAt: row.fetchedFromGeideaAt,
              createdAt: row.createdAt,
              source: 'firestore_geidea_payments',
            });
          });
        } else {
          (geideaRows || []).forEach((row) => {
            allTransactions.push({
              id: row.id,
              orderId: row.orderId || row.geideaOrderId || row.id,
              merchantReferenceId: row.merchantReferenceId || row.ourMerchantReferenceId,
              status: row.status || 'pending',
              amount: row.amount || null,
              currency: row.currency || 'EGP',
              responseCode: row.responseCode,
              detailedResponseCode: row.detailedResponseCode,
              responseMessage: row.responseMessage,
              detailedResponseMessage: row.detailedResponseMessage,
              customerEmail: row.customerEmail,
              customerName: row.customerName,
              customerPhone: row.customerPhone,
              paidAt: row.paidAt,
              fetchedFromGeideaAt: row.fetchedFromGeideaAt,
              createdAt: row.createdAt,
              source: 'firestore_geidea_payments',
            });
          });
          console.log(`✅ جلب ${(geideaRows || []).length} معاملة من geidea_payments`);
        }
      } catch (error) {
        console.error('Error fetching from geidea_payments:', error);
        toast.error('حدث خطأ أثناء جلب معاملات جيديا');
      }

      // ترتيب حسب التاريخ (الأحدث أولاً)
      allTransactions.sort((a, b) => {
        const dateA = a.paidAt
          ? new Date(a.paidAt).getTime()
          : a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;
        const dateB = b.paidAt
          ? new Date(b.paidAt).getTime()
          : b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;
        return dateB - dateA;
      });

      setTransactions(allTransactions);

      if (allTransactions.length === 0) {
        toast('لا توجد معاملات جيديا بعد. ستظهر هنا تلقائياً عند استلام Callback من جيديا.', { icon: 'ℹ️' });
      } else {
        toast.success(`تم جلب ${allTransactions.length} معاملة من جيديا`);
      }
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
  // مزامنة شاملة مع Geidea (جميع المعاملات)
  const syncWithGeidea = async () => {
    try {
      setSyncing(true);
      toast.loading('جاري المزامنة مع Geidea (جميع المعاملات)...', { id: 'syncing-geidea' });

      const response = await fetch('/api/geidea/search-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          save: true, // حفظ النتائج في Firestore
          limit: 1000 // محاولة جلب عدد كبير من المعاملات
        }),
      });

      const data = await response.json();
      toast.dismiss('syncing-geidea');

      if (data.success) {
        const { total, savedCount } = data.data;
        toast.success(`✅ تمت المزامنة بنجاح. تم العثور على ${total} معاملة وتحديث ${savedCount} منها.`);

        // إعادة جلب المعاملات لتحديث القائمة
        await fetchTransactions();
      } else {
        toast.error(data.error || 'فشل المزامنة مع Geidea');
      }
    } catch (error) {
      console.error('Error syncing with Geidea:', error);
      toast.dismiss('syncing-geidea');
      toast.error('حدث خطأ أثناء المزامنة');
    } finally {
      setSyncing(false);
    }
  };

  const updatePendingTransactions = async () => {
    const pendingTransactions = transactions.filter(t =>
      t.status === 'pending' || t.status === 'processing'
    );

    if (pendingTransactions.length === 0) {
      toast('لا توجد معاملات معلقة للتحديث', { icon: 'ℹ️' });
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

  // البحث عن معاملات قديمة في bulkPayments
  const searchLegacyTransactions = async () => {
    try {
      setSearchingLegacy(true);
      setFoundTransactions([]);
      setSelectedForImport(new Set());

      const { data: bulkRows } = await supabase
        .from('bulkPayments')
        .select('*')
        .eq('paymentMethod', 'geidea')
        .order('createdAt', { ascending: false });

      const found: GeideaTransaction[] = [];

      (bulkRows || []).forEach((data) => {
        // التحقق الإضافي: يجب أن يكون لها merchantReferenceId يبدأ بـ EL7LM أو orderId مميز
        const isValidGeidea =
          (data.merchantReferenceId && typeof data.merchantReferenceId === 'string' && data.merchantReferenceId.startsWith('EL7LM')) ||
          (data.orderId && typeof data.orderId === 'string' && data.orderId.includes('-'));

        if (isValidGeidea) {
          // التحقق مما إذا كانت موجودة بالفعل في المعاملات الحالية
          const exists = transactions.some(t =>
            (t.orderId && data.orderId && t.orderId === data.orderId) ||
            (t.merchantReferenceId && data.merchantReferenceId && t.merchantReferenceId === data.merchantReferenceId)
          );

          if (!exists) {
            // استخراج اسم العميل ورقم الهاتف
            let customerName = data.customerName || data.playerName || 'غير محدد';
            let customerPhone = data.customerPhone || data.phone || '';

            if (data.players && Array.isArray(data.players) && data.players.length > 0) {
              const player = data.players[0];
              if (player.name && !customerName.includes('@')) customerName = player.name;
              if (player.phone && !customerPhone) customerPhone = player.phone;
            }

            found.push({
              id: data.id, // نحتفظ بنفس ID المستند
              orderId: data.orderId || data.transactionId || data.id,
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
              source: 'imported_from_bulk',
            });
          }
        }
      });

      setFoundTransactions(found);
      if (found.length === 0) {
        toast('لم يتم العثور على معاملات جيديا جديدة في المحفظة', { icon: 'ℹ️' });
      } else {
        toast.success(`تم العثور على ${found.length} معاملة يمكن استيرادها`);
      }
    } catch (error) {
      console.error('Error searching legacy transactions:', error);
      toast.error('حدث خطأ أثناء البحث');
    } finally {
      setSearchingLegacy(false);
    }
  };

  // استيراد المعاملات المحددة
  const importLegacyTransactions = async () => {
    if (selectedForImport.size === 0) {
      toast.error('يرجى تحديد معاملات للاستيراد');
      return;
    }

    try {
      setImporting(true);
      let successCount = 0;
      let failCount = 0;

      const transactionsToImport = foundTransactions.filter(t => selectedForImport.has(t.id));

      for (const transaction of transactionsToImport) {
        try {
          // إنشاء مستند جديد في geidea_payments
          // نستخدم orderId أو merchantReferenceId كـ ID للمستند إذا أمكن، وإلا نستخدم ID الأصلي
          const docId = transaction.orderId || transaction.merchantReferenceId || transaction.id;

          const { error: upsertError } = await supabase.from('geidea_payments').upsert({
            ...transaction,
            id: docId,
            importedAt: new Date().toISOString(),
            source: 'imported_from_bulk'
          });

          if (upsertError) throw upsertError;
          successCount++;
        } catch (error) {
          console.error(`Failed to import transaction ${transaction.id}:`, error);
          failCount++;
        }
      }

      toast.success(`تم استيراد ${successCount} معاملة بنجاح${failCount > 0 ? ` (فشل ${failCount})` : ''}`);
      setShowImportModal(false);
      setFoundTransactions([]);
      setSelectedForImport(new Set());

      // تحديث القائمة
      fetchTransactions();
    } catch (error) {
      console.error('Error importing transactions:', error);
      toast.error('حدث خطأ أثناء الاستيراد');
    } finally {
      setImporting(false);
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

    // فلتر التاريخ (من)
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      filtered = filtered.filter(t => {
        const transactionDate = t.paidAt
          ? new Date(t.paidAt)
          : t.createdAt
            ? new Date(t.createdAt)
            : null;
        return transactionDate && transactionDate >= fromDate;
      });
    }

    // فلتر التاريخ (إلى)
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999); // نهاية اليوم
      filtered = filtered.filter(t => {
        const transactionDate = t.paidAt
          ? new Date(t.paidAt)
          : t.createdAt
            ? new Date(t.createdAt)
            : null;
        return transactionDate && transactionDate <= toDate;
      });
    }

    // فلتر المبلغ (الحد الأدنى)
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      filtered = filtered.filter(t => t.amount && t.amount >= minAmount);
    }

    // فلتر المبلغ (الحد الأقصى)
    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      filtered = filtered.filter(t => t.amount && t.amount <= maxAmount);
    }

    // فلتر العملة
    if (filters.currency !== 'all') {
      filtered = filtered.filter(t => t.currency === filters.currency);
    }

    // فلتر المصدر
    if (filters.source !== 'all') {
      filtered = filtered.filter(t => t.source === filters.source);
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
            {loading ? 'جاري التحديث...' : 'تحديث معاملات جيديا'}
          </button>
          <button
            onClick={updatePendingTransactions}
            disabled={updatingPending || transactions.filter(t => t.status === 'pending' || t.status === 'processing').length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${updatingPending ? 'animate-spin' : ''}`} />
            {updatingPending ? 'جاري التحديث...' : `تحديث المعاملات المعلقة (${transactions.filter(t => t.status === 'pending' || t.status === 'processing').length})`}
          </button>
          <button
            onClick={syncWithGeidea}
            disabled={syncing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'جاري المزامنة...' : 'مزامنة شاملة (الكل)'}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            استيراد بيانات قديمة
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-4">
          <div className="font-semibold mb-2">📋 معلومات مهمة:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>مصدر البيانات:</strong> معاملات جيديا الرسمية فقط (من Callback) ✅</li>
            <li><strong>Callback URL:</strong> <code>https://www.el7lm.com/api/geidea/callback</code></li>
            <li><strong>المعاملات الجديدة:</strong> تظهر تلقائياً عند استلام Callback من جيديا ✅</li>
            <li><strong>تحديث المعاملات المعلقة:</strong> استخدم زر "تحديث المعاملات المعلقة" ✅</li>
            <li><strong>تحديث معاملة محددة:</strong> استخدم زر "تحديث" بجانب كل معاملة ✅</li>
            <li><strong>عرض جميع المعاملات:</strong> استخدم <a href="https://merchant.geidea.net" target="_blank" rel="noopener noreferrer" className="underline">Geidea Merchant Portal</a></li>
            <li><strong>البيانات الحالية:</strong> {transactions.length} معاملة من جيديا</li>
          </ul>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            فلاتر البحث
          </h3>
          <button
            onClick={() => setFilters({
              search: '',
              status: 'all',
              fromDate: '',
              toDate: '',
              minAmount: '',
              maxAmount: '',
              currency: 'all',
              source: 'all',
            })}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            مسح الفلاتر
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* البحث */}
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

          {/* الحالة */}
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

          {/* العملة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العملة</label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">الكل</option>
              <option value="EGP">EGP - جنيه مصري</option>
              <option value="SAR">SAR - ريال سعودي</option>
              <option value="USD">USD - دولار أمريكي</option>
              <option value="AED">AED - درهم إماراتي</option>
            </select>
          </div>

          {/* المصدر */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المصدر</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">الكل</option>
              <option value="firestore_geidea_payments">geidea_payments</option>
              <option value="imported_from_bulk">مستورد من المحفظة</option>
              <option value="geidea_api">Geidea API</option>
            </select>
          </div>

          {/* من تاريخ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* إلى تاريخ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* الحد الأدنى للمبلغ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأدنى للمبلغ</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* الحد الأقصى للمبلغ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأقصى للمبلغ</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              placeholder="∞"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                      {transaction.orderId || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {transaction.merchantReferenceId || '-'}
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
                        : transaction.createdAt
                          ? new Date(transaction.createdAt).toLocaleString('ar-EG')
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
                  <p className="text-gray-900 font-mono text-sm">{selectedTransaction.orderId || '-'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Merchant Reference ID:</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedTransaction.merchantReferenceId || '-'}</p>
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
                      : selectedTransaction.createdAt
                        ? new Date(selectedTransaction.createdAt).toLocaleString('ar-EG')
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
      {/* نافذة الاستيراد */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Upload className="w-6 h-6 text-purple-600" />
                استيراد بيانات قديمة
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6 bg-purple-50 p-4 rounded-lg text-sm text-purple-800">
              <p className="font-semibold mb-1">كيف يعمل الاستيراد؟</p>
              <p>يقوم هذا النظام بالبحث في "المحفظة" (bulkPayments) عن معاملات تم دفعها عبر Geidea ولكنها غير موجودة في القائمة الرسمية. يتم استخدام معايير صارمة لضمان الدقة.</p>
            </div>

            <div className="flex gap-4 mb-4">
              <button
                onClick={searchLegacyTransactions}
                disabled={searchingLegacy}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Search className={`w-4 h-4 ${searchingLegacy ? 'animate-spin' : ''}`} />
                {searchingLegacy ? 'جاري البحث...' : 'بحث عن معاملات في المحفظة'}
              </button>

              {foundTransactions.length > 0 && (
                <button
                  onClick={importLegacyTransactions}
                  disabled={importing || selectedForImport.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
                  {importing ? 'جاري الاستيراد...' : `استيراد المحدد (${selectedForImport.size})`}
                </button>
              )}
            </div>

            {/* نتائج البحث */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForImport(new Set(foundTransactions.map(t => t.id)));
                          } else {
                            setSelectedForImport(new Set());
                          }
                        }}
                        checked={foundTransactions.length > 0 && selectedForImport.size === foundTransactions.length}
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Merchant Ref</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {foundTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        {searchingLegacy ? 'جاري البحث...' : 'اضغط "بحث" للبدء'}
                      </td>
                    </tr>
                  ) : (
                    foundTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedForImport.has(transaction.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedForImport);
                              if (e.target.checked) {
                                newSet.add(transaction.id);
                              } else {
                                newSet.delete(transaction.id);
                              }
                              setSelectedForImport(newSet);
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{transaction.orderId || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{transaction.merchantReferenceId || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {transaction.amount ? `${transaction.amount.toLocaleString()} ${transaction.currency || 'EGP'}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {transaction.paidAt
                            ? new Date(transaction.paidAt).toLocaleString('ar-EG')
                            : transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleString('ar-EG')
                              : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(transaction.status, transaction.responseCode)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

