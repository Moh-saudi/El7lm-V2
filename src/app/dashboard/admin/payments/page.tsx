'use client';

import Link from 'next/link';
import { db } from '@/lib/firebase/config';
import { openWhatsAppShare, testWhatsAppShare } from '@/lib/utils/whatsapp-share';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';

export default function AdminPaymentsPage() {
  // التحقق من الصلاحيات
  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({ allowedTypes: ['admin'] });
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    totalAmount: 0,
    messagesSent: 0,
    customersWithMessages: 0
  });

  // فلاتر البحث والترتيب
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentMethod: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // عرض البيانات
  const [viewMode, setViewMode] = useState('cards'); // 'cards' أو 'table'
  const [selectedRows, setSelectedRows] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // صفحات البيانات
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // تحديث حالة المدفوعات
  const [showStatusUpdateDialog, setShowStatusUpdateDialog] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [packageInfo, setPackageInfo] = useState({
    name: '',
    duration: '',
    price: 0
  });
  const [messageHistory, setMessageHistory] = useState<{[key: string]: any[]}>({});
  const [showMessageHistory, setShowMessageHistory] = useState(false);

  // حذف المدفوعات
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(null);

  // تتبع المدفوعات السابقة للإشعارات
  const [previousPaymentIds, setPreviousPaymentIds] = useState(new Set());

  // تتبع الإشعارات المرسلة لتجنب التكرار
  const [sentNotifications, setSentNotifications] = useState(new Set());

  // إدارة إرسال الإشعارات للمدير
  const [adminNotificationsEnabled, setAdminNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminNotificationsEnabled');
      return saved ? JSON.parse(saved) : false; // ✅ تم تعطيل الإرسال التلقائي - يجب التفعيل يدوياً
    }
    return false; // ✅ معطل افتراضياً
  });

  // نماذج الرسائل الجاهزة
  const messageTemplates = {
    paymentSuccess: (payment) => `🎉 تم استلام دفعتك بنجاح!\n\n📦 الباقة: ${packageInfo.name || 'باقة مميزة'}\n💰 المبلغ: ${payment.amount?.toLocaleString()} ${payment.currency}\n⏰ مدة الاشتراك: ${packageInfo.duration || 'شهر واحد'}\n\n✅ تم تفعيل اشتراكك بنجاح. استمتع بخدماتنا!`,
    paymentPending: '⏳ دفعتك قيد المعالجة. سنوافيك بالنتيجة قريباً.',
    paymentFailed: '❌ عذراً، فشلت عملية الدفع. يرجى المحاولة مرة أخرى.',
    subscriptionActivated: (payment) => `🎊 تم تفعيل اشتراكك بنجاح!\n\n📦 الباقة: ${packageInfo.name || 'باقة مميزة'}\n💰 المبلغ: ${payment.amount?.toLocaleString()} ${payment.currency}\n⏰ مدة الاشتراك: ${packageInfo.duration || 'شهر واحد'}\n\n🚀 يمكنك الآن الاستمتاع بجميع خدماتنا!`,
    welcome: '👋 مرحباً بك في منصتنا! نتمنى لك تجربة ممتعة.',
    reminder: '🔔 تذكير: لديك دفعة معلقة تنتظر الإتمام.',
    support: '🆘 هل تحتاج مساعدة؟ فريق الدعم جاهز لمساعدتك.',
    custom: 'رسالة مخصصة'
  };

  const selectTemplate = (template) => {
    if (template === 'custom') {
      setMessageText('');
    } else if (typeof messageTemplates[template] === 'function') {
      setMessageText(messageTemplates[template](selectedPayment));
    } else {
      setMessageText(messageTemplates[template]);
    }
  };

  // وظائف الفلترة والترتيب
  const applyFilters = () => {
    let filtered = [...payments];

    // فلتر البحث
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.playerName.toLowerCase().includes(searchTerm) ||
        payment.playerPhone.toLowerCase().includes(searchTerm) ||
        payment.paymentMethod.toLowerCase().includes(searchTerm) ||
        payment.collection.toLowerCase().includes(searchTerm)
      );
    }

    // فلتر الحالة
    if (filters.status !== 'all') {
      filtered = filtered.filter(payment => {
        if (filters.status === 'completed') {
          return payment.status === 'completed' || payment.status === 'success' || payment.status === 'paid';
        } else if (filters.status === 'pending') {
          return payment.status === 'pending' || payment.status === 'processing' || payment.status === 'waiting';
        } else if (filters.status === 'cancelled') {
          return payment.status === 'cancelled' || payment.status === 'failed' || payment.status === 'rejected';
        }
        return true;
      });
    }

    // فلتر طريقة الدفع
    if (filters.paymentMethod !== 'all') {
      const beforeFilterCount = filtered.length;
      filtered = filtered.filter(payment => {
        const matches = payment.paymentMethod && payment.paymentMethod.toLowerCase().includes(filters.paymentMethod.toLowerCase());
        // تسجيل خاص لفلتر جيديا
        if (filters.paymentMethod.toLowerCase() === 'geidea') {
          if (matches) {
            console.log(`✅ [Geidea Filter] Payment matches filter:`, {
              id: payment.id,
              paymentMethod: payment.paymentMethod,
              amount: payment.amount,
              playerName: payment.playerName
            });
          }
        }
        return matches;
      });
      const afterFilterCount = filtered.length;
      if (filters.paymentMethod.toLowerCase() === 'geidea') {
        console.log(`🔍 [Geidea Filter] Filtered ${beforeFilterCount} payments, found ${afterFilterCount} Geidea payments`);
      }
    }

    // فلتر التاريخ
    if (filters.dateFrom) {
      filtered = filtered.filter(payment => {
        const paymentDate = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
        return paymentDate >= new Date(filters.dateFrom);
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(payment => {
        const paymentDate = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
        return paymentDate <= new Date(filters.dateTo);
      });
    }

    // الترتيب
    filtered.sort((a, b) => {
      let aValue, bValue;

      if (filters.sortBy === 'amount') {
        aValue = a.amount || 0;
        bValue = b.amount || 0;
      } else if (filters.sortBy === 'playerName') {
        aValue = a.playerName || '';
        bValue = b.playerName || '';
      } else if (filters.sortBy === 'status') {
        aValue = a.status || '';
        bValue = b.status || '';
      } else {
        aValue = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        bValue = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPayments(filtered);
    if (itemsPerPage === -1) {
      setTotalPages(1);
    } else {
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    }
    setCurrentPage(1);
  };

  // الحصول على البيانات للصفحة الحالية
  const getCurrentPageData = () => {
    if (itemsPerPage === -1) {
      return filteredPayments;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPayments.slice(startIndex, endIndex);
  };

  // تحديث الفلاتر
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // مسح جميع الفلاتر
  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      paymentMethod: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  // تحديد/إلغاء تحديد صف
  const toggleRowSelection = (paymentId) => {
    setSelectedRows(prev =>
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    const currentData = getCurrentPageData();
    if (selectedRows.length === currentData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentData.map(payment => payment.id));
    }
  };

  // تحديث حالة المدفوعة
  const handleStatusUpdate = (payment) => {
    setUpdatingPayment(payment);
    setNewStatus(payment.status);
    setShowStatusUpdateDialog(true);
  };

  // حفظ تحديث الحالة
  const saveStatusUpdate = async () => {
    if (!updatingPayment || !newStatus) {
      toast.error('يرجى اختيار حالة جديدة');
      return;
    }

    try {
      // تحديث الحالة في قاعدة البيانات
      const paymentRef = doc(db, updatingPayment.collection, updatingPayment.id);
      await updateDoc(paymentRef, {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: 'admin'
      });

      // إذا كانت الحالة "مقبولة" أو "مكتملة"، فعّل الاشتراك
      if (newStatus === 'completed' || newStatus === 'accepted' || newStatus === 'success') {
        await activateSubscription(updatingPayment);
      }

      // إرسال إشعار للعميل
      await sendNotificationToCustomer(updatingPayment, newStatus);

      // تحديث البيانات المحلية
      setPayments(prev => prev.map(p =>
        p.id === updatingPayment.id
          ? { ...p, status: newStatus, updatedAt: new Date() }
          : p
      ));

      // تحديث حالة الدفع في الجدول الأصلي (تم تحديثه بالفعل أعلاه، لكن نتأكد من تحديث bulkPayments أيضاً)
      // إذا كانت الدفعة من bulkPayments، نحدثها في الجدول الأصلي
      if (updatingPayment.collection === 'bulkPayments' || updatingPayment.collection === 'bulk_payments') {
        // تم التحديث بالفعل في السطر 243-248، لا حاجة لتحديث إضافي
        console.log('تم تحديث الدفعة في جدول bulkPayments بنجاح');
      }

      toast.success('تم تحديث حالة الدفعة بنجاح');
      setShowStatusUpdateDialog(false);
      setUpdatingPayment(null);
      setNewStatus('');
    } catch (error) {
      console.error('خطأ في تحديث الحالة:', error);
      toast.error('فشل في تحديث حالة الدفعة');
    }
  };

  // تفعيل الاشتراك
  const activateSubscription = async (payment) => {
    try {
      const userId = payment.playerId || payment.userId;
      if (!userId || userId === 'unknown') {
        console.error('لا يوجد معرف مستخدم للتفعيل:', {
          paymentId: payment.id,
          playerId: payment.playerId,
          userId: payment.userId
        });
        return;
      }

      // تحديد مدة الاشتراك بناءً على نوع الباقة
      const packageType = payment.packageType || packageInfo.name || 'subscription_3months';
      let subscriptionMonths = 3; // افتراضي 3 أشهر
      let packageName = 'اشتراك 3 شهور';
      let packageDuration = '3 شهور';

      if (packageType.includes('annual') || packageType.includes('yearly') || packageType.includes('سنوي')) {
        subscriptionMonths = 12;
        packageName = 'اشتراك سنوي';
        packageDuration = '12 شهر';
      } else if (packageType.includes('6months') || packageType.includes('6 شهور')) {
        subscriptionMonths = 6;
        packageName = 'اشتراك 6 شهور';
        packageDuration = '6 شهور';
      } else if (packageType.includes('3months') || packageType.includes('3 شهور')) {
        subscriptionMonths = 3;
        packageName = 'اشتراك 3 شهور';
        packageDuration = '3 شهور';
      }

      const expiresAt = new Date(Date.now() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000);

      const subscriptionData = {
        userId: userId,
        plan_name: packageInfo.name || packageName,
        package_name: packageInfo.name || packageName,
        packageType: packageType,
        package_duration: packageInfo.duration || packageDuration,
        package_price: payment.amount,
        payment_id: payment.id,
        activated_at: new Date(),
        expires_at: expiresAt,
        end_date: expiresAt,
        status: 'active',
        features: ['unlimited_access', 'premium_support', 'advanced_features'],
        invoice_number: `INV-${Date.now()}`,
        receipt_url: payment.receiptImage || payment.receiptUrl || '',
        created_at: new Date(),
        updated_at: new Date()
      };

      // حفظ الاشتراك في قاعدة البيانات باستخدام userId كمفتاح
      const subscriptionRef = doc(db, 'subscriptions', userId);
      console.log('🔄 [Admin Payments] جاري تحديث subscriptions collection:', {
        userId,
        subscriptionData: {
          status: subscriptionData.status,
          package_name: subscriptionData.package_name,
          expires_at: subscriptionData.expires_at,
          activated_at: subscriptionData.activated_at
        }
      });
      
      await updateDoc(subscriptionRef, subscriptionData).catch(async () => {
        // إذا لم يكن موجود، أنشئه
        console.log('📝 [Admin Payments] إنشاء اشتراك جديد (لم يكن موجوداً)');
        await addDoc(collection(db, 'subscriptions'), {
          ...subscriptionData,
          id: userId
        });
      });
      
      console.log('✅ [Admin Payments] تم تحديث subscriptions collection بنجاح!');

      // تحديث بيانات المستخدم
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: subscriptionData.expires_at,
        subscriptionEndDate: subscriptionData.expires_at,
        lastPaymentId: payment.id,
        packageType: packageType,
        selectedPackage: packageInfo.name || packageName,
        updatedAt: new Date()
      });

      // تحديث حالة الدفع في الجدول الأصلي إذا كانت من bulkPayments
      if (payment.collection === 'bulkPayments' || payment.collection === 'bulk_payments') {
        try {
          const bulkPaymentRef = doc(db, payment.collection, payment.id);
          await updateDoc(bulkPaymentRef, {
            status: 'completed',
            subscription_status: 'active',
            subscription_expires_at: subscriptionData.expires_at,
            updatedAt: new Date(),
            updated_at: new Date()
          });
          console.log(`تم تحديث الدفعة في جدول ${payment.collection} بنجاح`);
        } catch (bulkError: any) {
          console.log(`خطأ في تحديث جدول ${payment.collection}:`, bulkError);
        }
      }

      console.log('تم تفعيل الاشتراك بنجاح');
    } catch (error) {
      console.error('خطأ في تفعيل الاشتراك:', error);
      throw error;
    }
  };

  // دالة لإنشاء رسالة SMS قصيرة
  const createShortSMSMessage = (payment) => {
    // اختصار اسم العميل
    const customerName = payment.playerName || payment.playerId || 'غير محدد';
    const shortName = customerName.length > 8 ? customerName.substring(0, 6) + '..' : customerName;

    // اختصار المبلغ
    const amount = payment.amount || 0;
    const currency = payment.currency || 'EGP';

    // إنشاء رسالة قصيرة جداً
    const message = `💰 مدفوعة جديدة!\n👤 ${shortName}\n💵 ${amount} ${currency}`;

    return {
      message: message,
      length: message.length
    };
  };

  // إرسال إشعار للمدير عند وصول مدفوعة جديدة
  const sendAdminNotification = async (payment) => {
    // التحقق من أن الإشعارات مفعلة
    if (!adminNotificationsEnabled) {
      console.log('إشعارات المدير معطلة');
      return;
    }

    // التحقق من عدم إرسال إشعار مكرر
    if (sentNotifications.has(payment.id)) {
      console.log(`تم إرسال إشعار مسبقاً لمدفوعة: ${payment.id}`);
      return;
    }

    // التحقق من أن المدفوعة جديدة فعلاً (تم إنشاؤها في آخر 10 دقائق)
    const paymentTime = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
    const now = new Date();
    const timeDiff = now.getTime() - paymentTime.getTime();
    const tenMinutes = 10 * 60 * 1000; // 10 دقائق بالميلي ثانية

    if (timeDiff > tenMinutes) {
      console.log(`تجاهل إشعار لمدفوعة قديمة: ${payment.id} - تم إنشاؤها منذ ${Math.round(timeDiff / (60 * 1000))} دقيقة`);
      return;
    }

    try {
      const adminPhone = '01017799580';

      // إنشاء رسالة SMS قصيرة
      const smsData = createShortSMSMessage(payment);

      console.log(`رسالة SMS: ${smsData.message} (${smsData.length} حرف)`);

      // التحقق من طول الرسالة
      if (smsData.length > 65) {
        console.warn(`⚠️ الرسالة طويلة جداً: ${smsData.length} حرف`);
        // إنشاء رسالة أقصر
        const customerName = payment.playerName || payment.playerId || 'غير محدد';
        const shortName = customerName.length > 5 ? customerName.substring(0, 4) + '..' : customerName;
        const amount = payment.amount || 0;
        const currency = payment.currency || 'EGP';
        const shortMessage = `💰 مدفوعة جديدة!\n👤 ${shortName}\n💵 ${amount} ${currency}`;

        console.log(`رسالة مختصرة: ${shortMessage} (${shortMessage.length} حرف)`);

        await fetch('/api/whatsapp/babaservice/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sms',
            phoneNumbers: [adminPhone],
            message: shortMessage
          })
        });
      } else {
        // إرسال SMS للمدير
        await fetch('/api/whatsapp/babaservice/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sms',
            phoneNumbers: [adminPhone],
            message: smsData.message
          })
        });
      }

      // حفظ الإشعار في قاعدة البيانات
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'new_payment',
        title: 'مدفوعة جديدة',
        message: `مدفوعة جديدة من ${payment.playerName || payment.playerId || 'غير محدد'} بقيمة ${payment.amount?.toLocaleString()} ${payment.currency || 'EGP'}`,
        paymentId: payment.id,
        paymentData: payment,
        isRead: false,
        createdAt: new Date()
      });

      // إضافة المدفوعة إلى قائمة الإشعارات المرسلة
      setSentNotifications(prev => new Set([...Array.from(prev), payment.id]));

      console.log(`✅ تم إرسال إشعار للمدير لمدفوعة جديدة: ${payment.id}`);
    } catch (error) {
      console.error('خطأ في إرسال إشعار المدير:', error);
    }
  };

  // إنشاء وتنزيل فاتورة الدفع
  const generateInvoice = (payment) => {
    const invoiceContent = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>فاتورة دفع - ${payment.playerName}</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; padding: 0; margin: 0; background: #fff; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 32px 24px; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
            .logo { height: 64px; }
            .company-info { text-align: left; font-size: 14px; color: #444; }
            .invoice-title { font-size: 2rem; color: #1a237e; font-weight: bold; letter-spacing: 1px; }
            .section-title { color: #1976d2; font-size: 1.1rem; margin-bottom: 8px; font-weight: bold; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .details-table th, .details-table td { border: 1px solid #e0e0e0; padding: 10px 8px; text-align: right; font-size: 15px; }
            .details-table th { background: #f0f4fa; color: #1a237e; }
            .details-table td { background: #fafbfc; }
            .summary { margin: 24px 0; font-size: 1.1rem; }
            .summary strong { color: #1976d2; }
            .footer { border-top: 2px solid #eee; padding-top: 16px; margin-top: 24px; text-align: center; color: #555; font-size: 15px; }
            .footer .icons { font-size: 1.5rem; margin-bottom: 8px; }
            .customer-care { background: #e3f2fd; color: #1976d2; border-radius: 8px; padding: 12px; margin: 18px 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; justify-content: center; }
            .thankyou { color: #388e3c; font-size: 1.2rem; margin: 18px 0 0 0; font-weight: bold; }
            .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
            .status-completed { background: #e8f5e8; color: #2e7d32; }
            .status-pending { background: #fff3e0; color: #f57c00; }
            .status-failed { background: #ffebee; color: #c62828; }
            @media print { body { background: #fff; } }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="/el7lm-logo.png" alt="Logo" class="logo" />
              <div class="company-info">
                <strong>منصة الحلم</strong><br>
                📧 info@el7lm.com<br>
                📱 +20 101 779 9580<br>
                🌐 www.el7lm.com
              </div>
            </div>

            <div class="invoice-title">فاتورة دفع <span style="font-size:1.3em;">🧾</span></div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 1.1rem;">
              <b>رقم الفاتورة:</b> ${payment.id} &nbsp; | &nbsp;
              <b>تاريخ الإصدار:</b> ${new Date().toLocaleDateString('ar-EG')} &nbsp; | &nbsp;
              <b>حالة الدفع:</b> <span class="status-badge status-${payment.status}">${payment.status}</span>
            </div>

            <div class="section-title">📋 تفاصيل الدفع</div>
            <table class="details-table">
              <tr><th>المبلغ المدفوع</th><td>${payment.amount?.toLocaleString()} ${payment.currency}</td></tr>
              <tr><th>طريقة الدفع</th><td>${payment.paymentMethod || 'غير محدد'}</td></tr>
              <tr><th>تاريخ الدفع</th><td>${payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(payment.createdAt).toLocaleDateString('ar-EG')}</td></tr>
              <tr><th>المصدر</th><td>${payment.collection}</td></tr>
              <tr><th>رقم العملية</th><td>${payment.transactionId || payment.id}</td></tr>
            </table>

            <div class="section-title">👤 معلومات العميل</div>
            <table class="details-table">
              <tr><th>الاسم</th><td>${payment.playerName}</td></tr>
              <tr><th>رقم الهاتف</th><td>${payment.playerPhone || 'غير محدد'}</td></tr>
              <tr><th>البريد الإلكتروني</th><td>${payment.playerEmail || 'غير محدد'}</td></tr>
            </table>

            <div class="summary">
              <strong>إجمالي المبلغ:</strong> ${payment.amount?.toLocaleString()} ${payment.currency}
            </div>

            <div class="customer-care">
              🎧 خدمة العملاء متاحة 24/7 | 📧 info@el7lm.com | 📱 +20 101 779 9580
            </div>

            <div class="footer">
              <div class="icons">🌟 منصة الحلم - حيث تتحقق الأحلام 🌟</div>
              <div style="margin-top:8px; font-size:13px; color:#888;">تم إصدار هذه الفاتورة إلكترونيًا ولا تحتاج إلى توقيع.</div>
            </div>

            <div class="thankyou">شكرًا لاختيارك منصة الحلم! 🎉</div>
          </div>
        </body>
      </html>
    `;

    // إنشاء blob من HTML
    const blob = new Blob([invoiceContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // إنشاء رابط التحميل
    const link = document.createElement('a');
    link.href = url;
    link.download = `فاتورة-دفع-${payment.playerName}-${new Date().toISOString().split('T')[0]}.html`;

    // إضافة الرابط للصفحة وتنفيذ التحميل
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // تنظيف URL
    URL.revokeObjectURL(url);
  };

  // إرسال إشعار عبر WhatsApp
  const sendPaymentViaWhatsApp = (payment) => {
    if (!payment.playerPhone || payment.playerPhone === 'غير محدد') {
      toast.error('رقم الهاتف غير متوفر');
      return;
    }

    let message = '';

    if (payment.status === 'completed' || payment.status === 'accepted' || payment.status === 'success') {
      message = `✅ تم تأكيد دفعتك بنجاح!\n\n💰 المبلغ: ${payment.amount?.toLocaleString()} ${payment.currency}\n📅 التاريخ: ${new Date(payment.createdAt).toLocaleDateString('ar-EG')}\n\nشكراً لثقتك في El7lm Platform! 🎉`;
    } else if (payment.status === 'pending') {
      message = `⏳ دفعتك قيد المراجعة\n\n💰 المبلغ: ${payment.amount?.toLocaleString()} ${payment.currency}\n📅 التاريخ: ${new Date(payment.createdAt).toLocaleDateString('ar-EG')}\n\nسيتم تأكيدها قريباً! 🚀`;
    } else if (payment.status === 'cancelled' || payment.status === 'failed') {
      message = `❌ فشل في معالجة دفعتك\n\n💰 المبلغ: ${payment.amount?.toLocaleString()} ${payment.currency}\n📅 التاريخ: ${new Date(payment.createdAt).toLocaleDateString('ar-EG')}\n\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.`;
    } else {
      message = `📋 تحديث على دفعتك\n\n💰 المبلغ: ${payment.amount?.toLocaleString()} ${payment.currency}\n📅 التاريخ: ${new Date(payment.createdAt).toLocaleDateString('ar-EG')}\n🔄 الحالة: ${payment.status}\n\nمن El7lm Platform`;
    }

    const result = openWhatsAppShare(payment.playerPhone, message);

    if (result.success) {
      toast.success('تم فتح WhatsApp بنجاح!');
    } else {
      toast.error(result.error || 'فشل في فتح WhatsApp');
    }
  };

  // اختبار WhatsApp Share
  const testWhatsAppShareFeature = () => {
    const result = testWhatsAppShare('اختبار إشعارات المدفوعات من El7lm Platform');

    if (result.success) {
      toast.success('تم فتح WhatsApp للاختبار!');
    } else {
      toast.error(result.error || 'فشل في اختبار WhatsApp');
    }
  };

  // إرسال إشعار للعميل
  const sendNotificationToCustomer = async (payment, status) => {
    try {
      if (!payment.playerPhone || payment.playerPhone === 'غير محدد') {
        console.log('لا يوجد رقم هاتف للإشعار');
        return;
      }

      let notificationMessage = '';

      if (status === 'completed' || status === 'accepted' || status === 'success') {
        notificationMessage = messageTemplates.subscriptionActivated(payment);
      } else if (status === 'pending') {
        notificationMessage = messageTemplates.paymentPending;
      } else if (status === 'cancelled' || status === 'failed') {
        notificationMessage = messageTemplates.paymentFailed;
      }

      if (notificationMessage) {
        // إرسال SMS
        await fetch('/api/whatsapp/babaservice/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sms',
            phoneNumbers: [payment.playerPhone],
            message: notificationMessage
          })
        });

        // حفظ الإشعار في قاعدة البيانات
        await addDoc(collection(db, 'notifications'), {
          userId: payment.playerId || payment.userId,
          type: 'payment_status_update',
          title: 'تحديث حالة الدفعة',
          message: notificationMessage,
          paymentId: payment.id,
          status: status,
          sentAt: new Date(),
          sentVia: 'sms'
        });

        console.log('تم إرسال الإشعار بنجاح');
      }
    } catch (error) {
      console.error('خطأ في إرسال الإشعار:', error);
      // لا نرمي الخطأ هنا حتى لا نوقف عملية تحديث الحالة
    }
  };

  // جلب تاريخ الرسائل للعميل
  const fetchMessageHistory = async (paymentId: string, phoneNumber: string) => {
    try {
      if (!phoneNumber || phoneNumber === 'غير محدد') {
        return [];
      }

      // البحث في جدول notifications
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('phoneNumber', '==', phoneNumber),
        where('type', 'in', ['sms', 'whatsapp', 'payment_notification']),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));

      return messages;
    } catch (error) {
      console.error('Error fetching message history:', error);
      return [];
    }
  };

  // عرض تاريخ الرسائل
  const showMessageHistoryDialog = async (payment: any) => {
    try {
      setSelectedPayment(payment);
      setShowMessageHistory(true);

      // جلب تاريخ الرسائل
      const messages = await fetchMessageHistory(payment.id, payment.playerPhone);
      setMessageHistory(prev => ({
        ...prev,
        [payment.id]: messages
      }));
    } catch (error) {
      console.error('Error showing message history:', error);
      toast.error('خطأ في جلب تاريخ الرسائل');
    }
  };

  // حساب عدد الرسائل المرسلة للعميل
  const getMessageCount = (paymentId: string) => {
    const messages = messageHistory[paymentId] || [];
    return messages.length;
  };

  // التحقق من وجود رسائل مرسلة
  const hasMessages = (paymentId: string) => {
    return getMessageCount(paymentId) > 0;
  };

  // حساب إحصائيات الرسائل
  const calculateMessageStats = () => {
    let totalMessages = 0;
    let customersWithMessages = 0;

    Object.values(messageHistory).forEach(messages => {
      if (messages && messages.length > 0) {
        totalMessages += messages.length;
        customersWithMessages++;
      }
    });

    return { totalMessages, customersWithMessages };
  };

  // تحميل جميع الرسائل المرسلة
  const fetchAllMessages = async () => {
    try {
      const notificationsRef = collection(db, 'notifications');
      // إزالة orderBy لتجنب مشكلة Firebase index
      const q = query(
        notificationsRef,
        where('type', 'in', ['sms', 'whatsapp', 'payment_notification'])
      );

      const snapshot = await getDocs(q);
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));

      // ترتيب البيانات يدوياً لتجنب مشاكل Firebase Indexing
      const sortedMessages = allMessages.sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
      );

      // تجميع الرسائل حسب رقم الهاتف
      const messagesByPhone = {};
      sortedMessages.forEach((message: any) => {
        if (message.phoneNumber) {
          if (!messagesByPhone[message.phoneNumber]) {
            messagesByPhone[message.phoneNumber] = [];
          }
          messagesByPhone[message.phoneNumber].push(message);
        }
      });

      setMessageHistory(messagesByPhone);
      console.log('تم تحميل جميع الرسائل:', sortedMessages.length);

      return messagesByPhone;
    } catch (error) {
      console.error('خطأ في تحميل الرسائل:', error);
      return {};
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const collectionNames = [
        'payments', 'payment', 'transactions', 'orders',
        'wallet', 'instapay', 'fawry', 'vodafone_cash',
        'orange_money', 'etisalat_wallet', 'paymob',
        'paypal_transactions', 'stripe_payments',
        'bulkPayments', 'bulk_payments', 'payment_action_logs', 'payment_results',
        'tournament_payments', 'geidea_payments', 'geidea'
      ];

      let allPayments = [];

      for (const collectionName of collectionNames) {
        try {
          const collectionRef = collection(db, collectionName);
          const q = query(collectionRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);

          for (const doc of querySnapshot.docs) {
            const data = doc.data();

            console.log(`Collection: ${collectionName}, Data:`, data);
            
            // تسجيل خاص لمدفوعات جيديا
            if (data.paymentMethod === 'geidea' || collectionName === 'bulkPayments' || collectionName === 'bulk_payments') {
              console.log(`🔍 [Geidea Payment] Found in ${collectionName}:`, {
                id: doc.id,
                paymentMethod: data.paymentMethod,
                amount: data.amount,
                status: data.status,
                userId: data.userId
              });
            }

            // البحث عن معرف اللاعب
            let playerId = null;
            const playerIdFields = [
              'playerId', 'userId', 'customerId', 'user_id', 'player_id', 'customer_id',
              'player', 'user', 'customer', 'accountId', 'account_id'
            ];

            for (const field of playerIdFields) {
              if (data[field] && data[field].toString().trim() !== '') {
                playerId = data[field].toString().trim();
                console.log(`Found playerId in field: ${field} = ${playerId}`);
                break;
              }
            }

            // البحث عن بيانات اللاعب - التصحيح الصحيح!
            let playerName = 'غير محدد';
            let playerPhone = 'غير محدد';
            let userName = null;
            let playerData = null;
            let userData = null;

            // الأولوية للمدفوعات الجماعية - البحث عن أسماء اللاعبين من حقل players في bulkPayments
            if (collectionName === 'bulkPayments' || collectionName === 'bulk_payments') {
              if (data.players && Array.isArray(data.players) && data.players.length > 0) {
                // إذا كان هناك لاعب واحد فقط
                if (data.players.length === 1) {
                  const player = data.players[0];
                  if (player.name && typeof player.name === 'string' && player.name.trim()) {
                    playerName = player.name.trim();
                    console.log(`Found player name from bulkPayments players array (single): ${playerName}`);
                  }
                } else {
                  // إذا كان هناك أكثر من لاعب، نجمع الأسماء
                  const playerNames = data.players
                    .map((p: any) => p.name || p.playerName || '')
                    .filter((name: string) => name && name.trim() && !name.includes('@'))
                    .map((name: string) => name.trim());
                  
                  if (playerNames.length > 0) {
                    if (playerNames.length <= 3) {
                      // إذا كان 3 لاعبين أو أقل، اعرض جميع الأسماء
                      playerName = playerNames.join(' - ');
                    } else {
                      // إذا كان أكثر من 3، اعرض عدد اللاعبين
                      playerName = `${playerNames[0]} و ${playerNames.length - 1} لاعب آخر`;
                    }
                    console.log(`Found player names from bulkPayments players array (multiple): ${playerName}`);
                  }
                }
              }
            }

            // البحث الأولي في الحقول الأساسية - تحسين البحث (فقط إذا لم نجد من bulkPayments)
            const primaryNameFields = ['full_name', 'name', 'playerName', 'customerName', 'userName', 'displayName'];
            for (const field of primaryNameFields) {
              if (data[field] && typeof data[field] === 'string' && data[field].trim() && !data[field].includes('@')) {
                const foundName = data[field].trim();
                // التحقق من أن القيمة ليست مجرد كلمة "player" أو كلمات مشابهة
                const lowerName = foundName.toLowerCase();
                if (lowerName !== 'player' && lowerName !== 'user' && lowerName !== 'customer' && 
                    lowerName.length > 2 && /[a-zA-Z\u0600-\u06FF]/.test(foundName)) {
                  playerName = foundName;
                  console.log(`Found name in primary field '${field}': ${playerName}`);
                  break;
                }
              }
            }

            // إذا كان الاسم يحتوي على إيميل أو لم نجد، نحاول البحث في حقول أخرى
            if (playerName.includes('@') || playerName === 'غير محدد') {
              const directNameFields = [
                'playerName', 'customerName', 'userName', 'displayName',
                'firstName', 'lastName', 'recipientName', 'buyerName', 'clientName',
                'accountName', 'holderName', 'customer_name', 'user_name',
                'first_name', 'last_name', 'recipient_name', 'buyer_name', 'client_name',
                'customer_full_name', 'user_full_name', 'account_name', 'player_name',
                'realName', 'actualName', 'nickName', 'preferredName',
                'billingName', 'shippingName', 'contactName', 'primaryName'
              ];

              for (const field of directNameFields) {
                if (data[field] && data[field].toString().trim() !== '') {
                  const foundName = data[field].toString().trim();

                  // التحقق من أن القيمة ليست إيميل وليست كلمة عامة
                  const lowerFoundName = foundName.toLowerCase();
                  if (!foundName.includes('@') && 
                      lowerFoundName !== 'player' && lowerFoundName !== 'user' && lowerFoundName !== 'customer' &&
                      foundName.length > 2 && /[a-zA-Z\u0600-\u06FF]/.test(foundName)) {
                    playerName = foundName;
                    console.log(`Found name directly in data: ${field} = ${playerName}`);
                    break;
                  } else {
                    console.log(`Skipping invalid name in field ${field}: ${foundName}`);
                  }
                }
              }
            }

            // إذا لم نجد الاسم، نبحث في جميع الحقول للعثور على اسم حقيقي
            if (playerName === 'غير محدد') {
              // البحث في جميع الحقول للعثور على اسم حقيقي
              for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'string' && value.trim() !== '') {
                  const lowerKey = key.toLowerCase();

                  // البحث في الحقول التي قد تحتوي على أسماء
                  if (lowerKey.includes('name') || lowerKey.includes('user') ||
                      lowerKey.includes('customer') || lowerKey.includes('player') ||
                      lowerKey.includes('client') || lowerKey.includes('account')) {

                    const foundValue = value.toString().trim();

                    // التحقق من أن القيمة ليست إيميل وتبدو كاسم حقيقي وليست كلمة عامة
                    const lowerFoundValue = foundValue.toLowerCase();
                    if (!foundValue.includes('@') &&
                        lowerFoundValue !== 'player' && lowerFoundValue !== 'user' && lowerFoundValue !== 'customer' &&
                        foundValue.length > 2 &&
                        foundValue.length < 50 &&
                        /[a-zA-Z\u0600-\u06FF]/.test(foundValue) &&
                        !/^\d+$/.test(foundValue)) {

                      playerName = foundValue;
                      console.log(`Found real name in field: ${key} = ${playerName}`);
                      break;
                    }
                  }
                }
              }
            }

            // إذا لم نجد الاسم، نبحث في الإيميل ونستخرج الاسم منه (كحل أخير فقط)
            if (playerName === 'غير محدد' && data.email) {
              const email = data.email.toString().trim();
              console.log(`Found email: ${email}`);

              // استخراج الاسم من الإيميل (قبل علامة @) - فقط إذا كان يبدو كاسم حقيقي
              if (email.includes('@')) {
                const nameFromEmail = email.split('@')[0];
                // تنظيف الاسم من الأرقام والرموز
                const cleanName = nameFromEmail.replace(/[0-9_\-\.]/g, ' ').trim();

                // التحقق من أن الاسم يبدو كاسم حقيقي (يحتوي على أحرف وليس أرقام فقط)
                if (cleanName && cleanName.length > 2 && /[a-zA-Z\u0600-\u06FF]/.test(cleanName)) {
                  playerName = cleanName;
                  console.log(`Extracted name from email: ${playerName}`);
                } else {
                  // إذا لم يكن يبدو كاسم حقيقي، نتركه "غير محدد"
                  console.log(`Email prefix doesn't look like a real name: ${nameFromEmail}`);
                }
              }
            }

            // البحث عن رقم الهاتف - التصحيح الصحيح للحقول!
            const directPhoneFields = [
              'phone', 'whatsapp', 'mobile', 'telephone', 'contact',
              'phoneNumber', 'mobileNumber', 'contactNumber',
              'customer_phone', 'user_phone', 'phone_number', 'mobile_number',
              'customerMobile', 'userMobile', 'customerTel', 'userTel',
              'customer_phone_number', 'user_phone_number', 'contact_phone',
              'player_phone', 'customer_phone_number', 'user_phone_number',
              'phoneNumber', 'mobileNumber', 'contactNumber', 'tel',
              'customerPhone', 'userPhone', 'recipientPhone', 'buyerPhone',
              'clientPhone', 'accountPhone', 'holderPhone', 'customer_phone',
              'user_phone', 'recipient_phone', 'buyer_phone', 'client_phone',
              'account_phone', 'holder_phone', 'phone_no', 'mobile_no',
              'contact_no', 'tel_no', 'phoneNum', 'mobileNum', 'contactNum',
              'customer_phone_no', 'user_phone_no', 'recipient_phone_no',
              'buyer_phone_no', 'client_phone_no', 'account_phone_no',
              'holder_phone_no', 'phoneNumber', 'mobileNumber', 'contactNumber',
              'customerPhoneNumber', 'userPhoneNumber', 'recipientPhoneNumber',
              'buyerPhoneNumber', 'clientPhoneNumber', 'accountPhoneNumber',
              'holderPhoneNumber', 'phone_number', 'mobile_number', 'contact_number',
              'customer_phone_number', 'user_phone_number', 'recipient_phone_number',
              'buyer_phone_number', 'client_phone_number', 'account_phone_number',
              'holder_phone_number', 'phoneNo', 'mobileNo', 'contactNo',
              'customerPhoneNo', 'userPhoneNo', 'recipientPhoneNo',
              'buyerPhoneNo', 'clientPhoneNo', 'accountPhoneNo', 'holderPhoneNo'
            ];

            for (const field of directPhoneFields) {
              if (data[field] && data[field].toString().trim() !== '') {
                playerPhone = data[field].toString().trim();
                console.log(`Found phone directly in data: ${field} = ${playerPhone}`);
                break;
              }
            }

            // البحث في حقول أخرى محتملة للهاتف
            if (playerPhone === 'غير محدد') {
              const additionalPhoneFields = [
                'customerPhone', 'userPhone', 'recipientPhone', 'buyerPhone',
                'clientPhone', 'accountPhone', 'holderPhone', 'customer_phone',
                'user_phone', 'recipient_phone', 'buyer_phone', 'client_phone',
                'account_phone', 'holder_phone'
              ];

              for (const field of additionalPhoneFields) {
                if (data[field] && data[field].toString().trim() !== '') {
                  playerPhone = data[field].toString().trim();
                  console.log(`Found phone in additional field: ${field} = ${playerPhone}`);
                  break;
                }
              }
            }

            // إذا لم نجد رقم الهاتف، نبحث في الإيميل ونستخرج الرقم منه
            if (playerPhone === 'غير محدد' && data.email) {
              const email = data.email.toString().trim();
              // استخراج الأرقام من الإيميل
              const phoneMatch = email.match(/\d+/);
              if (phoneMatch) {
                playerPhone = phoneMatch[0];
                console.log(`Extracted phone from email: ${playerPhone}`);
              }
            }

            // البحث في حقول أخرى محتملة للهاتف
            if (playerPhone === 'غير محدد') {
              const additionalPhoneFields = [
                'customerPhone', 'userPhone', 'recipientPhone', 'buyerPhone',
                'clientPhone', 'accountPhone', 'holderPhone', 'customer_phone',
                'user_phone', 'recipient_phone', 'buyer_phone', 'client_phone',
                'account_phone', 'holder_phone', 'phone_no', 'mobile_no',
                'contact_no', 'tel_no', 'phoneNum', 'mobileNum', 'contactNum',
                'customer_phone_no', 'user_phone_no', 'recipient_phone_no',
                'buyer_phone_no', 'client_phone_no', 'account_phone_no',
                'holder_phone_no', 'phoneNumber', 'mobileNumber', 'contactNumber',
                'customerPhoneNumber', 'userPhoneNumber', 'recipientPhoneNumber',
                'buyerPhoneNumber', 'clientPhoneNumber', 'accountPhoneNumber',
                'holderPhoneNumber', 'phone_number', 'mobile_number', 'contact_number',
                'customer_phone_number', 'user_phone_number', 'recipient_phone_number',
                'buyer_phone_number', 'client_phone_number', 'account_phone_number',
                'holder_phone_number', 'phoneNo', 'mobileNo', 'contactNo',
                'customerPhoneNo', 'userPhoneNo', 'recipientPhoneNo',
                'buyerPhoneNo', 'clientPhoneNo', 'accountPhoneNo', 'holderPhoneNo'
              ];

              for (const field of additionalPhoneFields) {
                if (data[field] && data[field].toString().trim() !== '') {
                  playerPhone = data[field].toString().trim();
                  console.log(`Found phone in additional field: ${field} = ${playerPhone}`);
                  break;
                }
              }
            }

            // البحث في جميع الحقول المحتملة للهاتف
            if (playerPhone === 'غير محدد') {
              // البحث في جميع الحقول التي تحتوي على كلمة "phone" أو "mobile" أو "contact"
              for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'string' && value.trim() !== '') {
                  const lowerKey = key.toLowerCase();
                  if (lowerKey.includes('phone') || lowerKey.includes('mobile') ||
                      lowerKey.includes('contact') || lowerKey.includes('tel') ||
                      lowerKey.includes('whatsapp') || lowerKey.includes('sms')) {
                    // التحقق من أن القيمة تحتوي على أرقام
                    if (/\d/.test(value)) {
                      playerPhone = value.toString().trim();
                      console.log(`Found phone in field: ${key} = ${playerPhone}`);
                      break;
                    }
                  }
                }
              }
            }

            // البحث في جميع الحقول المحتملة للهاتف - بحث شامل
            if (playerPhone === 'غير محدد') {
              // البحث في جميع الحقول التي تحتوي على أرقام
              for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'string' && value.trim() !== '') {
                  // التحقق من أن القيمة تحتوي على أرقام فقط أو أرقام مع رموز
                  if (/^[\d\s\-\+\(\)]+$/.test(value) && value.length >= 7 && value.length <= 15) {
                    playerPhone = value.toString().trim();
                    console.log(`Found phone-like value in field: ${key} = ${playerPhone}`);
                    break;
                  }
                }
              }
            }

            // البحث في جميع الحقول المحتملة للاسم - بحث شامل
            if (playerName === 'غير محدد') {
              // البحث في جميع الحقول التي تحتوي على كلمة "name" أو تبدو كأسماء
              for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'string' && value.trim() !== '') {
                  const lowerKey = key.toLowerCase();
                  if (lowerKey.includes('name') || lowerKey.includes('user') || lowerKey.includes('customer')) {
                    const foundValue = value.toString().trim();
                    const lowerFoundValue = foundValue.toLowerCase();
                    // التحقق من أن القيمة تبدو كاسم حقيقي وليست كلمة عامة
                    if (!foundValue.includes('@') &&
                        lowerFoundValue !== 'player' && lowerFoundValue !== 'user' && lowerFoundValue !== 'customer' &&
                        /[a-zA-Z\u0600-\u06FF]/.test(foundValue) && foundValue.length >= 2 && foundValue.length <= 50) {
                      playerName = foundValue;
                      console.log(`Found name-like value in field: ${key} = ${playerName}`);
                      break;
                    }
                  }
                }
              }
            }

            // إذا لم نجد البيانات مباشرة، نبحث في جدول players
            if (playerId && (playerName === 'غير محدد' || playerPhone === 'غير محدد')) {
              try {
                console.log(`Searching for player with ID: ${playerId}`);
                
                // محاولة البحث باستخدام معرف المستند مباشرة أولاً
                try {
                  const playerDocRef = doc(db, 'players', playerId);
                  const playerDocSnap = await getDoc(playerDocRef);
                  
                  if (playerDocSnap.exists()) {
                    playerData = playerDocSnap.data();
                    console.log('Player data found by document ID:', playerData);
                  }
                } catch (docError) {
                  console.log('Could not find player by document ID, trying query...');
                }
                
                // إذا لم نجد بالبحث المباشر، نبحث باستخدام استعلام
                if (!playerData) {
                  const playerQuery = await getDocs(query(collection(db, 'players'),
                    where('uid', '==', playerId)
                  ));

                  if (!playerQuery.empty) {
                    playerData = playerQuery.docs[0].data();
                    console.log('Player data found by uid query:', playerData);
                  }
                }

                if (playerData) {
                  console.log('Player data found:', playerData);

                  // استخدام نفس منطق getPlayerName من player-organization.ts
                  if (playerName === 'غير محدد') {
                    const possibleNameFields = [
                      'full_name', 'name', 'player_name', 'display_name', 'first_name', 'last_name',
                      'arabic_name', 'english_name', 'nickname', 'title',
                      'firstName', 'lastName', 'fullName', 'displayName'
                    ];
                    
                    // البحث في جميع الحقول المحتملة
                    for (const field of possibleNameFields) {
                      if (playerData[field] && typeof playerData[field] === 'string' && playerData[field].trim()) {
                        const foundName = playerData[field].trim();
                        // التحقق من أن القيمة ليست إيميل وتبدو كاسم حقيقي وليست كلمة عامة
                        const lowerFoundName = foundName.toLowerCase();
                        if (!foundName.includes('@') && 
                            lowerFoundName !== 'player' && lowerFoundName !== 'user' && lowerFoundName !== 'customer' &&
                            foundName.length > 1 && /[a-zA-Z\u0600-\u06FF]/.test(foundName)) {
                          playerName = foundName;
                          console.log(`Found name in player data field '${field}': ${playerName}`);
                          break;
                        }
                      }
                    }
                    
                    // إذا لم يوجد اسم، جرب دمج الاسم الأول والأخير
                    if (playerName === 'غير محدد' && (playerData.first_name || playerData.last_name || playerData.firstName || playerData.lastName)) {
                      const firstName = playerData.first_name || playerData.firstName || '';
                      const lastName = playerData.last_name || playerData.lastName || '';
                      const fullName = `${firstName} ${lastName}`.trim();
                      if (fullName && fullName !== 'undefined undefined') {
                        playerName = fullName;
                        console.log(`Merged name from first/last name: ${playerName}`);
                      }
                    }
                    
                    // إذا لم نجد بعد، نستخدم القيمة الافتراضية
                    if (playerName === 'غير محدد') {
                      console.log('Could not find name in player data, keeping default');
                    }
                  }

                  // استخدام نفس منطق صفحة إدارة المستخدمين للهاتف
                  if (playerPhone === 'غير محدد') {
                    playerPhone = playerData.phone || playerData.phoneNumber || playerData.whatsapp || 'غير محدد';
                    console.log(`Found phone in player data: ${playerPhone}`);
                  }

                  // البحث في جميع الحقول المحتملة للهاتف في جدول players
                  if (playerPhone === 'غير محدد') {
                    for (const [key, value] of Object.entries(playerData)) {
                      if (value && typeof value === 'string' && value.trim() !== '') {
                        const lowerKey = key.toLowerCase();
                        if (lowerKey.includes('phone') || lowerKey.includes('mobile') ||
                            lowerKey.includes('contact') || lowerKey.includes('tel') ||
                            lowerKey.includes('whatsapp') || lowerKey.includes('sms')) {
                          // التحقق من أن القيمة تحتوي على أرقام
                          if (/\d/.test(value)) {
                            playerPhone = value.toString().trim();
                            console.log(`Found phone in player field: ${key} = ${playerPhone}`);
                            break;
                          }
                        }
                      }
                    }
                  }

                  // البحث في جميع الحقول المحتملة للاسم في جدول players
                  if (playerName === 'غير محدد') {
                    for (const [key, value] of Object.entries(playerData)) {
                      if (value && typeof value === 'string' && value.trim() !== '') {
                        const lowerKey = key.toLowerCase();
                        if (lowerKey.includes('name') || lowerKey.includes('user') || lowerKey.includes('customer')) {
                          // التحقق من أن القيمة تبدو كاسم حقيقي
                          if (/[a-zA-Z\u0600-\u06FF]/.test(value) && value.length >= 2 && value.length <= 50) {
                            playerName = value.toString().trim();
                            console.log(`Found name in player field: ${key} = ${playerName}`);
                            break;
                          }
                        }
                      }
                    }
                  }

                  console.log(`Final result from players - Name: ${playerName}, Phone: ${playerPhone}`);
                } else {
                  console.log(`No player found with ID: ${playerId}`);

                  // محاولة البحث في جدول users إذا لم يتم العثور في players
                  try {
                    
                    // محاولة البحث باستخدام معرف المستند مباشرة أولاً
                    try {
                      const userDocRef = doc(db, 'users', playerId);
                      const userDocSnap = await getDoc(userDocRef);
                      
                      if (userDocSnap.exists()) {
                        userData = userDocSnap.data();
                        console.log('User data found by document ID:', userData);
                      }
                    } catch (docError) {
                      console.log('Could not find user by document ID, trying query...');
                    }
                    
                    // إذا لم نجد بالبحث المباشر، نبحث باستخدام استعلام
                    if (!userData) {
                      const userQuery = await getDocs(query(collection(db, 'users'),
                        where('uid', '==', playerId)
                      ));

                      if (!userQuery.empty) {
                        userData = userQuery.docs[0].data();
                        console.log('User data found by uid query:', userData);
                      }
                    }

                    if (userData) {
                      console.log('User data found:', userData);

                      // استخدام نفس منطق getPlayerName من player-organization.ts
                      if (playerName === 'غير محدد') {
                        const possibleNameFields = [
                          'full_name', 'name', 'player_name', 'display_name', 'first_name', 'last_name',
                          'arabic_name', 'english_name', 'nickname', 'title',
                          'firstName', 'lastName', 'fullName', 'displayName'
                        ];
                        
                        // البحث في جميع الحقول المحتملة
                        for (const field of possibleNameFields) {
                          if (userData[field] && typeof userData[field] === 'string' && userData[field].trim()) {
                            const foundName = userData[field].trim();
                            // التحقق من أن القيمة ليست إيميل وتبدو كاسم حقيقي وليست كلمة عامة
                            const lowerFoundName = foundName.toLowerCase();
                            if (!foundName.includes('@') && 
                                lowerFoundName !== 'player' && lowerFoundName !== 'user' && lowerFoundName !== 'customer' &&
                                foundName.length > 1 && /[a-zA-Z\u0600-\u06FF]/.test(foundName)) {
                              playerName = foundName;
                              console.log(`Found name in user data field '${field}': ${playerName}`);
                              break;
                            }
                          }
                        }
                        
                        // إذا لم يوجد اسم، جرب دمج الاسم الأول والأخير
                        if (playerName === 'غير محدد' && (userData.first_name || userData.last_name || userData.firstName || userData.lastName)) {
                          const firstName = userData.first_name || userData.firstName || '';
                          const lastName = userData.last_name || userData.lastName || '';
                          const fullName = `${firstName} ${lastName}`.trim();
                          if (fullName && fullName !== 'undefined undefined') {
                            playerName = fullName;
                            console.log(`Merged name from first/last name: ${playerName}`);
                          }
                        }
                        
                        // إذا لم نجد بعد، نستخدم القيمة الافتراضية
                        if (playerName === 'غير محدد') {
                          console.log('Could not find name in user data, keeping default');
                        }
                      }

                      // استخدام نفس منطق صفحة إدارة المستخدمين للهاتف
                      if (playerPhone === 'غير محدد') {
                        playerPhone = userData.phone || userData.phoneNumber || userData.whatsapp || 'غير محدد';
                        console.log(`Found phone in user data: ${playerPhone}`);
                      }

                      // البحث في جميع الحقول المحتملة للهاتف في جدول users
                      if (playerPhone === 'غير محدد') {
                        for (const [key, value] of Object.entries(userData)) {
                          if (value && typeof value === 'string' && value.trim() !== '') {
                            const lowerKey = key.toLowerCase();
                            if (lowerKey.includes('phone') || lowerKey.includes('mobile') ||
                                lowerKey.includes('contact') || lowerKey.includes('tel') ||
                                lowerKey.includes('whatsapp') || lowerKey.includes('sms')) {
                              // التحقق من أن القيمة تحتوي على أرقام
                              if (/\d/.test(value)) {
                                playerPhone = value.toString().trim();
                                console.log(`Found phone in user field: ${key} = ${playerPhone}`);
                                break;
                              }
                            }
                          }
                        }
                      }

                      // البحث في جميع الحقول المحتملة للاسم في جدول users
                      if (playerName === 'غير محدد') {
                        for (const [key, value] of Object.entries(userData)) {
                          if (value && typeof value === 'string' && value.trim() !== '') {
                            const lowerKey = key.toLowerCase();
                            if (lowerKey.includes('name') || lowerKey.includes('user') || lowerKey.includes('customer')) {
                              // التحقق من أن القيمة تبدو كاسم حقيقي
                              if (/[a-zA-Z\u0600-\u06FF]/.test(value) && value.length >= 2 && value.length <= 50) {
                                playerName = value.toString().trim();
                                console.log(`Found name in user field: ${key} = ${playerName}`);
                                break;
                              }
                            }
                          }
                        }
                      }

                      console.log(`Final result from users - Name: ${playerName}, Phone: ${playerPhone}`);
                    }
                  } catch (userError) {
                    console.log(`Error searching users table:`, userError);
                  }
                }
              } catch (error) {
                console.error(`Error fetching player data for ID ${playerId}:`, error);
              }
            } else if (!playerId) {
              console.log('No playerId found in payment data');
            }


            // البحث عن اسم المستخدم إذا كان موجوداً
            const userNameFields = ['userName', 'user_name', 'username', 'userName', 'displayName', 'display_name'];
            for (const field of userNameFields) {
              if (data[field] && typeof data[field] === 'string' && data[field].trim() && 
                  !data[field].includes('@') && data[field].trim().toLowerCase() !== 'player') {
                userName = data[field].trim();
                console.log(`Found userName in field '${field}': ${userName}`);
                break;
              }
            }

            // إذا لم نجد في البيانات المباشرة، نبحث في بيانات اللاعب
            if (!userName && playerData) {
              for (const field of userNameFields) {
                if (playerData[field] && typeof playerData[field] === 'string' && playerData[field].trim() && 
                    !playerData[field].includes('@') && playerData[field].trim().toLowerCase() !== 'player') {
                  userName = playerData[field].trim();
                  console.log(`Found userName in player data field '${field}': ${userName}`);
                  break;
                }
              }
            }

            // إذا لم نجد في بيانات اللاعب، نبحث في بيانات المستخدم
            if (!userName && userData) {
              for (const field of userNameFields) {
                if (userData[field] && typeof userData[field] === 'string' && userData[field].trim() && 
                    !userData[field].includes('@') && userData[field].trim().toLowerCase() !== 'player') {
                  userName = userData[field].trim();
                  console.log(`Found userName in user data field '${field}': ${userName}`);
                  break;
                }
              }
            }

            console.log(`Final payment data - Name: ${playerName}, UserName: ${userName}, Phone: ${playerPhone}, Collection: ${collectionName}`);

            // إضافة معلومات إضافية للمدفوعات الجماعية
            const isBulkPayment = collectionName === 'bulkPayments' || collectionName === 'bulk_payments';
            const playersCount = isBulkPayment && data.players && Array.isArray(data.players) ? data.players.length : null;
            const playersData = isBulkPayment && data.players && Array.isArray(data.players) ? data.players : null;

            // استخراج طريقة الدفع
            const extractedPaymentMethod = data.paymentMethod || data.method || data.gateway || data.paymentType || collectionName;
            
            // تسجيل خاص لمدفوعات جيديا بعد الاستخراج
            if (extractedPaymentMethod === 'geidea' || data.paymentMethod === 'geidea') {
              console.log(`✅ [Geidea Payment] Extracted paymentMethod:`, {
                collection: collectionName,
                docId: doc.id,
                extractedPaymentMethod: extractedPaymentMethod,
                originalPaymentMethod: data.paymentMethod,
                amount: data.amount,
                playerName: playerName
              });
            }

            allPayments.push({
              id: doc.id,
              collection: collectionName,
              playerName: playerName,
              userName: userName,
              playerPhone: playerPhone,
              playerId: playerId, // إضافة playerId للاستخدام في تفعيل الاشتراك
              userId: playerId, // إضافة userId أيضاً (قد يكون نفس playerId)
              amount: data.amount || data.total || data.value || data.price || data.cost || data.fee || 0,
              currency: data.currency || data.currencyCode || data.currencySymbol || 'EGP',
              status: data.status || data.paymentStatus || data.transactionStatus || 'pending',
              paymentMethod: extractedPaymentMethod,
              createdAt: data.createdAt || data.timestamp || data.date || data.paymentDate || data.transactionDate || new Date(),
              receiptImage: data.receiptImage || data.receiptUrl || data.image || data.photo || data.picture || null,
              receiptUrl: data.receiptUrl || data.receiptImage || data.image || data.photo || data.picture || null,
              // بيانات إضافية للمدفوعات الجماعية
              isBulkPayment: isBulkPayment,
              playersCount: playersCount,
              playersData: playersData,
              // بيانات إضافية من البيانات الأصلية
              packageType: data.packageType || data.package_type || null
            });
          }
        } catch (error) {
          console.log(`Collection ${collectionName} not accessible:`, error);
        }
      }

      // حساب الإحصائيات
      const totalAmount = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const completed = allPayments.filter(p => p.status === 'completed' || p.status === 'success' || p.status === 'paid').length;
      const pending = allPayments.filter(p => p.status === 'pending' || p.status === 'processing' || p.status === 'waiting').length;
      const cancelled = allPayments.filter(p => p.status === 'cancelled' || p.status === 'failed' || p.status === 'rejected').length;

      // حساب إحصائيات الرسائل
      const messageStats = calculateMessageStats();

      setStats({
        total: allPayments.length,
        completed,
        pending,
        cancelled,
        totalAmount,
        messagesSent: messageStats.totalMessages,
        customersWithMessages: messageStats.customersWithMessages
      });

      console.log('إحصائيات الرسائل:', messageStats);
      console.log('messageHistory:', messageHistory);

      // اكتشاف المدفوعات الجديدة
      const currentPaymentIds = new Set(allPayments.map(p => p.id));
      const newPayments = allPayments.filter(payment => !previousPaymentIds.has(payment.id));

      // إرسال إشعارات للمدفوعات الجديدة فقط
      if (newPayments.length > 0) {
        console.log(`إرسال إشعارات لـ ${newPayments.length} مدفوعة جديدة`);
        for (const newPayment of newPayments) {
          // التحقق من أن المدفوعة جديدة فعلاً (تم إنشاؤها في آخر 5 دقائق)
          const paymentTime = newPayment.createdAt?.toDate ? newPayment.createdAt.toDate() : new Date(newPayment.createdAt);
          const now = new Date();
          const timeDiff = now.getTime() - paymentTime.getTime();
          const fiveMinutes = 5 * 60 * 1000; // 5 دقائق بالميلي ثانية

          if (timeDiff <= fiveMinutes) {
            console.log(`إرسال إشعار لمدفوعة جديدة: ${newPayment.id} - ${newPayment.playerName}`);
            await sendAdminNotification(newPayment);
          } else {
            console.log(`تجاهل مدفوعة قديمة: ${newPayment.id} - تم إنشاؤها منذ ${Math.round(timeDiff / (60 * 1000))} دقيقة`);
          }
        }
      } else {
        console.log('لا توجد مدفوعات جديدة لإرسال إشعارات');
      }

      // تحديث قائمة المدفوعات السابقة
      setPreviousPaymentIds(currentPaymentIds);

      setPayments(allPayments);
      console.log(`تم جلب ${allPayments.length} دفعة`);
      console.log(`تم اكتشاف ${newPayments.length} مدفوعة جديدة`);
      console.log('مثال على البيانات المجلوبة:', allPayments.slice(0, 3));

      // تحميل الرسائل بعد تحميل المدفوعات
      await fetchAllMessages();

      toast.success(`تم جلب ${allPayments.length} دفعة بنجاح`);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('خطأ في جلب بيانات المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  // وظائف الأزرار
  const handleDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsDialog(true);
  };

  const handleReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceiptDialog(true);
  };

  const handleMessage = (payment) => {
    setSelectedPayment(payment);
    setShowMessageDialog(true);
  };

  // إرسال SMS
  const sendSMS = async () => {
    if (!messageText.trim()) {
      toast.error('يرجى كتابة رسالة');
      return;
    }

    if (!selectedPayment.playerPhone || selectedPayment.playerPhone === 'غير محدد') {
      toast.error('رقم الهاتف غير متوفر للإرسال');
      return;
    }

    try {
      await fetch('/api/whatsapp/babaservice/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sms',
          phoneNumbers: [selectedPayment.playerPhone],
          message: messageText
        })
      });

      toast.success('تم إرسال SMS بنجاح');

      // إغلاق الموديول وتنظيف النص بعد الإرسال الناجح
      setShowMessageDialog(false);
      setMessageText('');

      // تحديث تاريخ الرسائل
      const messages = await fetchMessageHistory(selectedPayment.id, selectedPayment.playerPhone);
      setMessageHistory(prev => ({
        ...prev,
        [selectedPayment.id]: messages
      }));

      // تحديث الإحصائيات
      const messageStats = calculateMessageStats();
      setStats(prev => ({
        ...prev,
        messagesSent: messageStats.totalMessages,
        customersWithMessages: messageStats.customersWithMessages
      }));

    } catch (error) {
      console.error('خطأ في إرسال SMS:', error);
      toast.error('فشل في إرسال SMS');
    }
  };

  // إرسال WhatsApp
  const sendWhatsApp = async () => {
    if (!messageText.trim()) {
      toast.error('يرجى كتابة رسالة');
      return;
    }

    if (!selectedPayment.playerPhone || selectedPayment.playerPhone === 'غير محدد') {
      toast.error('رقم الهاتف غير متوفر للإرسال');
      return;
    }

    try {
      await fetch('/api/whatsapp/babaservice/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'whatsapp',
          phoneNumbers: [selectedPayment.playerPhone],
          message: messageText
        })
      });
      toast.success('تم إرسال الرسالة عبر WhatsApp بنجاح');

      // إغلاق الموديول وتنظيف النص بعد فتح WhatsApp
      setShowMessageDialog(false);
      setMessageText('');

      // تحديث الإحصائيات (لأن WhatsApp يُفتح في نافذة جديدة)
      const messageStats = calculateMessageStats();
      setStats(prev => ({
        ...prev,
        messagesSent: messageStats.totalMessages,
        customersWithMessages: messageStats.customersWithMessages
      }));

    } catch (error) {
      console.error('خطأ في فتح WhatsApp:', error);
      toast.error('فشل في فتح WhatsApp');
    }
  };

  // الدالة القديمة للتوافق مع الكود الموجود
  const sendMessage = async () => {
    // سيتم استبدالها بالدوال الجديدة
    await sendSMS();
  };

  // حذف المدفوعة
  const handleDeletePayment = (payment) => {
    setDeletingPayment(payment);
    setShowDeleteDialog(true);
  };

  const confirmDeletePayment = async () => {
    if (!deletingPayment) return;

    try {
      // حذف المدفوعة من Firebase
      const paymentRef = doc(db, deletingPayment.collection, deletingPayment.id);
      await deleteDoc(paymentRef);

      // تحديث البيانات المحلية
      setPayments(prev => prev.filter(p => p.id !== deletingPayment.id));
      setFilteredPayments(prev => prev.filter(p => p.id !== deletingPayment.id));

      // تحديث الإحصائيات
      const updatedPayments = payments.filter(p => p.id !== deletingPayment.id);
      const totalAmount = updatedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const completed = updatedPayments.filter(p => p.status === 'completed' || p.status === 'success' || p.status === 'paid').length;
      const pending = updatedPayments.filter(p => p.status === 'pending' || p.status === 'processing' || p.status === 'waiting').length;
      const cancelled = updatedPayments.filter(p => p.status === 'cancelled' || p.status === 'failed' || p.status === 'rejected').length;

      setStats(prev => ({
        ...prev,
        total: updatedPayments.length,
        completed,
        pending,
        cancelled,
        totalAmount
      }));

      toast.success('تم حذف المدفوعة بنجاح');
      setShowDeleteDialog(false);
      setDeletingPayment(null);
    } catch (error) {
      console.error('خطأ في حذف المدفوعة:', error);
      toast.error('فشل في حذف المدفوعة');
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // تحديث الإحصائيات عند تغيير messageHistory
  useEffect(() => {
    const messageStats = calculateMessageStats();
    setStats(prev => ({
      ...prev,
      messagesSent: messageStats.totalMessages,
      customersWithMessages: messageStats.customersWithMessages
    }));
  }, [messageHistory]);

  // حفظ حالة الإشعارات في localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminNotificationsEnabled', JSON.stringify(adminNotificationsEnabled));
    }
  }, [adminNotificationsEnabled]);

  useEffect(() => {
    applyFilters();
  }, [payments, filters, itemsPerPage]);

  useEffect(() => {
    setShowBulkActions(selectedRows.length > 0);
  }, [selectedRows]);

  // تنظيف قائمة الإشعارات المرسلة كل ساعة
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setSentNotifications(new Set());
      console.log('تم تنظيف قائمة الإشعارات المرسلة');
    }, 60 * 60 * 1000); // كل ساعة

    return () => clearInterval(cleanupInterval);
  }, []);

  // التحقق من الصلاحيات
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-semibold">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md mx-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح لك</h2>
          <p className="text-gray-600">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-semibold">جاري تحميل بيانات المدفوعات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* العنوان */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">إدارة المدفوعات</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            مراقبة وإدارة جميع عمليات الدفع مع إمكانية التواصل مع العملاء
          </p>
          <div className="mt-4">
            <button
              onClick={testWhatsAppShareFeature}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              title="اختبار WhatsApp Share"
            >
              🧪 اختبار WhatsApp
            </button>
            <div className="mt-4 flex flex-col items-center gap-2">
              <Link
                href="/dashboard/admin/invoices"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 py-2 rounded-lg font-semibold shadow hover:shadow-md transition"
                title="الانتقال إلى إدارة الفواتير"
              >
                📄 الانتقال إلى صفحة الفواتير
              </Link>
              <p className="text-sm text-gray-600">
                هذه الصفحة مربوطة بالكامل مع صفحة الفواتير لتتبع إصدار الفواتير ومتابعة المدفوعات.
              </p>
            </div>
          </div>

          {/* معلومات رابط Callback من جيديا */}
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🔗</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">رابط Callback من جيديا</h3>
                <p className="text-sm text-gray-600 mb-4">
                  استخدم هذا الرابط في إعدادات جيديا (Geidea Dashboard) كـ Callback URL:
                </p>
                <div className="bg-white rounded-lg p-4 border-2 border-purple-300 shadow-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="flex-1 text-sm font-mono text-purple-700 bg-purple-50 px-3 py-2 rounded border border-purple-200 break-all">
                      {typeof window !== 'undefined' 
                        ? `${window.location.origin}/api/geidea/callback`
                        : 'https://el7lm-backup.vercel.app/api/geidea/callback'}
                    </code>
                    <button
                      onClick={() => {
                        const callbackUrl = typeof window !== 'undefined' 
                          ? `${window.location.origin}/api/geidea/callback`
                          : 'https://el7lm-backup.vercel.app/api/geidea/callback';
                        navigator.clipboard.writeText(callbackUrl);
                        toast.success('تم نسخ رابط Callback إلى الحافظة');
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm whitespace-nowrap"
                      title="نسخ الرابط"
                    >
                      📋 نسخ الرابط
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>💡 ملاحظة:</strong> تأكد من إضافة هذا الرابط في لوحة تحكم جيديا (Geidea Merchant Dashboard) 
                    في قسم Webhook/Callback Settings. هذا الرابط يستقبل إشعارات الدفع تلقائياً من جيديا.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الإحصائيات السريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-2xl font-bold mb-1">{stats.total}</p>
              <p className="text-xs opacity-90">إجمالي المدفوعات</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-2xl font-bold mb-1">{stats.completed}</p>
              <p className="text-xs opacity-90">مكتملة</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-2xl font-bold mb-1">{stats.pending}</p>
              <p className="text-xs opacity-90">قيد الانتظار</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-2xl mb-2">❌</div>
              <p className="text-2xl font-bold mb-1">{stats.cancelled}</p>
              <p className="text-xs opacity-90">ملغية</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-2xl mb-2">💰</div>
              <p className="text-lg font-bold mb-1">{stats.totalAmount.toLocaleString()}</p>
              <p className="text-xs opacity-90">إجمالي المبالغ</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-2xl font-bold mb-1">{stats.messagesSent}</p>
              <p className="text-xs opacity-90">الرسائل المرسلة</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-2xl mb-2">👥</div>
              <p className="text-2xl font-bold mb-1">{stats.customersWithMessages}</p>
              <p className="text-xs opacity-90">عملاء تم التواصل معهم</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
            adminNotificationsEnabled
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          }`}>
            <div className="text-center">
              <div className="text-2xl mb-2">{adminNotificationsEnabled ? '🔔' : '🔕'}</div>
              <p className="text-lg font-bold mb-1">{adminNotificationsEnabled ? 'مفعلة' : 'معطلة'}</p>
              <p className="text-xs opacity-90">إشعارات المدير</p>
              <p className="text-xs opacity-75 mt-1">
                {sentNotifications.size > 0 ? `تم إرسال ${sentNotifications.size} إشعار` : 'لا توجد إشعارات مرسلة'}
              </p>
            </div>
          </div>
        </div>

        {/* فلاتر البحث والترتيب */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800">🔍 فلاتر البحث والترتيب</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📋 عرض الكروت
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📊 عرض الجدول
              </button>
              <button
                onClick={() => {
                  const newState = !adminNotificationsEnabled;
                  setAdminNotificationsEnabled(newState);
                  toast.success(newState ? 'تم تفعيل إشعارات المدير' : 'تم إيقاف إشعارات المدير');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  adminNotificationsEnabled
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={adminNotificationsEnabled ? 'إيقاف إشعارات المدير' : 'تشغيل إشعارات المدير'}
              >
                {adminNotificationsEnabled ? '🔔 إشعارات مفعلة' : '🔕 إشعارات معطلة'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            {/* البحث */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🔍 البحث</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="ابحث بالاسم، الهاتف، طريقة الدفع..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* فلتر الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📊 الحالة</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                title="اختر حالة الدفع"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="completed">مكتملة</option>
                <option value="pending">قيد الانتظار</option>
                <option value="cancelled">ملغية</option>
              </select>
            </div>

            {/* فلتر طريقة الدفع */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">💳 طريقة الدفع</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => updateFilter('paymentMethod', e.target.value)}
                title="اختر طريقة الدفع"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">جميع الطرق</option>
                <option value="geidea">جيديا</option>
                <option value="fawry">فوري</option>
                <option value="vodafone">فودافون كاش</option>
                <option value="orange">أورنج موني</option>
                <option value="etisalat">اتصالات</option>
                <option value="paymob">باي موب</option>
                <option value="paypal">باي بال</option>
                <option value="stripe">سترايب</option>
              </select>
            </div>

            {/* الترتيب */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🔄 الترتيب</label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  updateFilter('sortBy', sortBy);
                  updateFilter('sortOrder', sortOrder);
                }}
                title="اختر طريقة الترتيب"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="createdAt-desc">الأحدث أولاً</option>
                <option value="createdAt-asc">الأقدم أولاً</option>
                <option value="amount-desc">الأعلى مبلغاً</option>
                <option value="amount-asc">الأقل مبلغاً</option>
                <option value="playerName-asc">الاسم (أ-ي)</option>
                <option value="playerName-desc">الاسم (ي-أ)</option>
                <option value="status-asc">الحالة</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* تاريخ من */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 من تاريخ</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                title="اختر تاريخ البداية"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* تاريخ إلى */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 إلى تاريخ</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                title="اختر تاريخ النهاية"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                🗑️ مسح الفلاتر
              </button>
              <span className="text-sm text-gray-600 flex items-center">
                عرض {filteredPayments.length} من {payments.length} دفعة
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">عناصر في الصفحة:</label>
              <select
                value={itemsPerPage === -1 ? 'all' : itemsPerPage}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setItemsPerPage(-1);
                    setCurrentPage(1);
                  } else {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }
                }}
                title="اختر عدد العناصر في الصفحة"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value="all">عرض الكل</option>
              </select>
            </div>
          </div>
        </div>

        {/* عرض البيانات */}
        {filteredPayments.length > 0 ? (
          viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getCurrentPageData().map((payment) => (
              <div key={payment.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col">
                {/* العنوان والحالة */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4 sm:mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                        {payment.playerName}
                      </h3>
                      {/* مؤشر الرسائل */}
                      {hasMessages(payment.id) ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-green-500 text-sm">💬</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                            {getMessageCount(payment.id)} رسالة
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm flex-shrink-0">📭</span>
                      )}
                    </div>
                    {payment.userName && (
                      <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1 truncate">
                        👤 {payment.userName}
                      </p>
                    )}
                    {payment.isBulkPayment && payment.playersCount && payment.playersCount > 1 && (
                      <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1">
                        👥 دفع جماعي ({payment.playersCount} لاعب)
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{payment.collection}</p>
                  </div>
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                    payment.status === 'completed' || payment.status === 'success' || payment.status === 'paid'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : payment.status === 'pending' || payment.status === 'processing' || payment.status === 'waiting'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {payment.status}
                  </span>
                </div>

                {/* تفاصيل الدفعة */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 sm:p-4 rounded-lg border border-green-200">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-green-600 font-medium mb-1">المبلغ</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-700 break-words">
                        {payment.amount?.toLocaleString()} {payment.currency}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">طريقة الدفع</p>
                      <p className="text-base sm:text-lg font-bold text-blue-700 break-words truncate">{payment.paymentMethod}</p>
                    </div>
                  </div>
                </div>

                {/* معلومات إضافية */}
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">📱 رقم الهاتف:</span>
                    <span className="font-medium text-xs sm:text-sm text-purple-600 break-words text-right">{payment.playerPhone}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">📅 التاريخ:</span>
                    <span className="font-medium text-xs sm:text-sm text-gray-700">
                      {payment.createdAt?.toDate ?
                        payment.createdAt.toDate().toLocaleDateString('en-GB') :
                        new Date(payment.createdAt).toLocaleDateString('en-GB')
                      }
                    </span>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 mt-auto">
                  <button
                    onClick={() => handleDetails(payment)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-xs">👁️</span>
                    <span className="hidden sm:inline">التفاصيل</span>
                  </button>
                  <button
                    onClick={() => handleReceipt(payment)}
                    className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-xs">📄</span>
                    <span className="hidden sm:inline">الإيصال</span>
                  </button>
                  <button
                    onClick={() => handleMessage(payment)}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-xs">💬</span>
                    <span className="hidden sm:inline">رسالة</span>
                  </button>
                  <button
                    onClick={() => showMessageHistoryDialog(payment)}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      hasMessages(payment.id)
                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!hasMessages(payment.id)}
                  >
                    <span className="text-xs">📋</span>
                    <span className="hidden sm:inline">تاريخ الرسائل</span>
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(payment)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-xs">⚙️</span>
                    <span className="hidden sm:inline">تحديث</span>
                  </button>
                  <button
                    onClick={() => generateInvoice(payment)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-xs">📄</span>
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button
                    onClick={() => sendPaymentViaWhatsApp(payment)}
                    className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                    title="إرسال عبر WhatsApp"
                  >
                    <span className="text-xs">📱</span>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleDeletePayment(payment)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-xs">🗑️</span>
                    <span className="hidden sm:inline">حذف</span>
                  </button>
                </div>
              </div>
              ))}
            </div>
          ) : (
            /* عرض الجدول */
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right">
                        <input
                          type="checkbox"
                          checked={selectedRows.length === getCurrentPageData().length && getCurrentPageData().length > 0}
                          onChange={toggleSelectAll}
                          title="تحديد/إلغاء تحديد الكل"
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">رقم الهاتف</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المبلغ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">طريقة الدفع</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحالة</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الرسائل</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المصدر</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getCurrentPageData().map((payment) => (
                      <tr
                        key={payment.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedRows.includes(payment.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleRowSelection(payment.id)}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(payment.id)}
                            onChange={() => toggleRowSelection(payment.id)}
                            title="تحديد/إلغاء تحديد هذا الصف"
                            className="rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {payment.playerName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {payment.playerPhone}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600">
                          {payment.amount?.toLocaleString()} {payment.currency}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          {payment.paymentMethod}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'completed' || payment.status === 'success' || payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending' || payment.status === 'processing' || payment.status === 'waiting'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasMessages(payment.id) ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-green-500 text-sm">💬</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                {getMessageCount(payment.id)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">📭</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {payment.createdAt?.toDate ?
                            payment.createdAt.toDate().toLocaleDateString('ar-EG') :
                            new Date(payment.createdAt).toLocaleDateString('ar-EG')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-orange-600">
                          {payment.collection}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDetails(payment);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="التفاصيل"
                            >
                              👁️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceipt(payment);
                              }}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="الإيصال"
                            >
                              📄
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateInvoice(payment);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="فاتورة PDF"
                            >
                              🧾
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMessage(payment);
                              }}
                              className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                              title="رسالة"
                            >
                              💬
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showMessageHistoryDialog(payment);
                              }}
                              className={`p-1 rounded ${
                                hasMessages(payment.id)
                                  ? 'text-indigo-600 hover:bg-indigo-100'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                              title="تاريخ الرسائل"
                              disabled={!hasMessages(payment.id)}
                            >
                              📋
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(payment);
                              }}
                              className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                              title="تحديث الحالة"
                            >
                              ⚙️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePayment(payment);
                              }}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="حذف المدفوعة"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-600 text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد مدفوعات</h3>
            <p className="text-gray-500">لم يتم العثور على مدفوعات في النظام</p>
          </div>
        )}

        {/* الإجراءات الجماعية */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-blue-800 font-medium">
                  تم تحديد {selectedRows.length} دفعة
                </span>
                <button
                  onClick={() => setSelectedRows([])}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  إلغاء التحديد
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // إرسال رسالة جماعية
                    const selectedPayments = getCurrentPageData().filter(p => selectedRows.includes(p.id));
                    const phoneNumbers = selectedPayments
                      .filter(p => p.playerPhone && p.playerPhone !== 'غير محدد')
                      .map(p => p.playerPhone);

                    if (phoneNumbers.length > 0) {
                      // هنا يمكن إضافة منطق إرسال رسالة جماعية
                      toast.success(`تم إرسال رسالة إلى ${phoneNumbers.length} عميل`);
                    } else {
                      toast.error('لا توجد أرقام هواتف صالحة للرسائل المحددة');
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  📱 إرسال رسالة جماعية
                </button>
                <button
                  onClick={() => {
                    // تصدير البيانات المحددة
                    const selectedPayments = getCurrentPageData().filter(p => selectedRows.includes(p.id));
                    const csvData = selectedPayments.map(p => ({
                      الاسم: p.playerName,
                      الهاتف: p.playerPhone,
                      المبلغ: p.amount,
                      العملة: p.currency,
                      الحالة: p.status,
                      طريقة_الدفع: p.paymentMethod,
                      التاريخ: p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(p.createdAt).toLocaleDateString('ar-EG'),
                      المصدر: p.collection
                    }));

                    const csv = Object.keys(csvData[0]).join(',') + '\n' +
                               csvData.map(row => Object.values(row).join(',')).join('\n');

                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();

                    toast.success('تم تصدير البيانات بنجاح');
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  📊 تصدير البيانات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* نظام الصفحات */}
        {itemsPerPage !== -1 && totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-4 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                عرض {((currentPage - 1) * itemsPerPage) + 1} إلى {Math.min(currentPage * itemsPerPage, filteredPayments.length)} من {filteredPayments.length} دفعة
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏮️ الأولى
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏪ السابقة
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالية ⏩
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                الأخيرة ⏭️
              </button>
            </div>
          </div>
        )}
        {itemsPerPage === -1 && (
          <div className="flex items-center justify-center bg-white rounded-xl shadow-lg p-4 mt-6">
            <span className="text-sm text-gray-600">
              عرض جميع {filteredPayments.length} دفعة
            </span>
          </div>
        )}

        {/* موديول التفاصيل */}
        {showDetailsDialog && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">تفاصيل الدفعة</h2>
                <button
                  onClick={() => setShowDetailsDialog(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium text-gray-700">اسم العميل:</label>
                    <p className="text-gray-900">{selectedPayment.playerName}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">رقم الهاتف:</label>
                    <p className="text-gray-900">{selectedPayment.playerPhone}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">المبلغ:</label>
                    <p className="text-gray-900 font-semibold">
                      {selectedPayment.amount?.toLocaleString()} {selectedPayment.currency}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">الحالة:</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPayment.status === 'completed' || selectedPayment.status === 'success' || selectedPayment.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : selectedPayment.status === 'pending' || selectedPayment.status === 'processing' || selectedPayment.status === 'waiting'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedPayment.status}
                    </span>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">طريقة الدفع:</label>
                    <p className="text-gray-900">{selectedPayment.paymentMethod}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">المصدر:</label>
                    <p className="text-gray-900">{selectedPayment.collection}</p>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">التاريخ:</label>
                  <p className="text-gray-900">
                    {selectedPayment.createdAt?.toDate ?
                      selectedPayment.createdAt.toDate().toLocaleString('ar-EG') :
                      new Date(selectedPayment.createdAt).toLocaleString('ar-EG')
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* موديول معاينة الإيصال */}
        {showReceiptDialog && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">📄 معاينة الإيصال</h2>
                <button
                  onClick={() => setShowReceiptDialog(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl p-1 hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* معلومات الدفعة */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">العميل:</span>
                      <p className="text-gray-900 font-semibold">{selectedPayment.playerName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">المبلغ:</span>
                      <p className="text-green-600 font-bold">
                        {selectedPayment.amount?.toLocaleString()} {selectedPayment.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">طريقة الدفع:</span>
                      <p className="text-blue-600">{selectedPayment.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">التاريخ:</span>
                      <p className="text-gray-700">
                        {selectedPayment.createdAt?.toDate ?
                          selectedPayment.createdAt.toDate().toLocaleDateString('en-GB') :
                          new Date(selectedPayment.createdAt).toLocaleDateString('en-GB')
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* صورة الإيصال */}
                <div>
                  <label className="font-medium text-gray-700 mb-2 block text-sm">صورة الإيصال:</label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    {(selectedPayment.receiptImage || selectedPayment.receiptUrl) ? (
                      <div className="text-center">
                        <img
                          src={selectedPayment.receiptImage || selectedPayment.receiptUrl}
                          alt="صورة الإيصال"
                          className="max-w-full h-auto max-h-96 rounded-lg shadow-md mx-auto"
                        />
                        <div className="mt-3 flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedPayment.receiptImage || selectedPayment.receiptUrl;
                              link.download = `receipt_${selectedPayment.playerName}_${new Date().toISOString().split('T')[0]}.jpg`;
                              link.click();
                            }}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                          >
                            📥 تحميل
                          </button>
                          <button
                            onClick={() => {
                              window.open(selectedPayment.receiptImage || selectedPayment.receiptUrl, '_blank');
                            }}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                          >
                            🔍 فتح في تبويب جديد
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-6">
                        <span className="text-3xl">📄</span>
                        <p className="mt-2 text-sm">لا توجد صورة إيصال متوفرة</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowReceiptDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    إغلاق
                  </button>
                  {(selectedPayment.receiptImage || selectedPayment.receiptUrl) && (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedPayment.receiptImage || selectedPayment.receiptUrl;
                        link.download = `receipt_${selectedPayment.playerName}_${new Date().toISOString().split('T')[0]}.jpg`;
                        link.click();
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      📥 تحميل الإيصال
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* موديول تحديث حالة المدفوعة */}
        {showStatusUpdateDialog && updatingPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">⚙️ تحديث حالة المدفوعة</h2>
                <button
                  onClick={() => setShowStatusUpdateDialog(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl p-1 hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* معلومات الدفعة */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">معلومات الدفعة</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">العميل:</span>
                      <p className="font-semibold">{updatingPayment.playerName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">المبلغ:</span>
                      <p className="font-semibold text-green-600">
                        {updatingPayment.amount?.toLocaleString()} {updatingPayment.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">الحالة الحالية:</span>
                      <p className="font-semibold">{updatingPayment.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">طريقة الدفع:</span>
                      <p className="font-semibold">{updatingPayment.paymentMethod}</p>
                    </div>
                  </div>
                </div>

                {/* معلومات الباقة */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">معلومات الباقة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اسم الباقة</label>
                      <input
                        type="text"
                        value={packageInfo.name}
                        onChange={(e) => setPackageInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="مثال: باقة مميزة"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">مدة الاشتراك</label>
                      <input
                        type="text"
                        value={packageInfo.duration}
                        onChange={(e) => setPackageInfo(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="مثال: شهر واحد"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">سعر الباقة</label>
                      <input
                        type="number"
                        value={packageInfo.price}
                        onChange={(e) => setPackageInfo(prev => ({ ...prev, price: Number(e.target.value) }))}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* تحديث الحالة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحالة الجديدة</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    title="اختر الحالة الجديدة للمدفوعة"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">اختر الحالة الجديدة</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="processing">قيد المعالجة</option>
                    <option value="completed">مكتملة</option>
                    <option value="accepted">مقبولة</option>
                    <option value="success">نجحت</option>
                    <option value="cancelled">ملغية</option>
                    <option value="failed">فشلت</option>
                    <option value="rejected">مرفوضة</option>
                  </select>
                </div>

                {/* تحذير تفعيل الاشتراك */}
                {(newStatus === 'completed' || newStatus === 'accepted' || newStatus === 'success') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-xl">✅</span>
                      <div>
                        <h4 className="font-semibold text-green-800">سيتم تفعيل الاشتراك تلقائياً</h4>
                        <p className="text-sm text-green-700">
                          عند حفظ هذه الحالة، سيتم تفعيل الاشتراك للعميل وإرسال إشعار له
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* أزرار الإجراءات */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowStatusUpdateDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={saveStatusUpdate}
                    disabled={!newStatus}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💾 حفظ التحديث
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* موديول إرسال الرسالة مع نماذج الرسائل */}
        {showMessageDialog && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">إرسال رسالة للعميل</h2>
                <button
                  onClick={() => setShowMessageDialog(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium text-gray-700">اسم العميل:</label>
                    <p className="text-gray-900">{selectedPayment.playerName}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">رقم الهاتف:</label>
                    <p className="text-gray-900">{selectedPayment.playerPhone}</p>
                  </div>
                </div>

                {/* نماذج الرسائل الجاهزة */}
                <div>
                  <label className="font-medium text-gray-700 mb-2 block">نماذج الرسائل الجاهزة:</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => selectTemplate('paymentSuccess')}
                      className="text-right p-2 text-sm bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      ✅ نجح الدفع
                    </button>
                    <button
                      onClick={() => selectTemplate('paymentPending')}
                      className="text-right p-2 text-sm bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      ⏳ قيد المعالجة
                    </button>
                    <button
                      onClick={() => selectTemplate('paymentFailed')}
                      className="text-right p-2 text-sm bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      ❌ فشل الدفع
                    </button>
                    <button
                      onClick={() => selectTemplate('welcome')}
                      className="text-right p-2 text-sm bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      👋 رسالة ترحيب
                    </button>
                    <button
                      onClick={() => selectTemplate('reminder')}
                      className="text-right p-2 text-sm bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      🔔 تذكير
                    </button>
                    <button
                      onClick={() => selectTemplate('support')}
                      className="text-right p-2 text-sm bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      🆘 مساعدة
                    </button>
                    <button
                      onClick={() => selectTemplate('subscriptionActivated')}
                      className="text-right p-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      🎊 تفعيل الاشتراك
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-gray-700 mb-2 block">نص الرسالة:</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="اكتب رسالتك هنا أو اختر نموذج جاهز..."
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    عدد الأحرف: {messageText.length}/160
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowMessageDialog(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  {selectedPayment.playerPhone && selectedPayment.playerPhone !== 'غير محدد' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={sendSMS}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                      >
                        📱 إرسال SMS
                      </button>
                      <button
                        onClick={sendWhatsApp}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        💬 إرسال WhatsApp
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      رقم الهاتف غير متوفر للإرسال
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* موديول تاريخ الرسائل */}
        {showMessageHistory && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">📋 تاريخ الرسائل المرسلة</h2>
                <button
                  onClick={() => setShowMessageHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl p-1 hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* معلومات العميل */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">معلومات العميل</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">الاسم:</span>
                      <p className="font-semibold">{selectedPayment.playerName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">رقم الهاتف:</span>
                      <p className="font-semibold text-purple-600">{selectedPayment.playerPhone}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">المبلغ:</span>
                      <p className="font-semibold text-green-600">
                        {selectedPayment.amount?.toLocaleString()} {selectedPayment.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">الحالة:</span>
                      <p className="font-semibold">{selectedPayment.status}</p>
                    </div>
                  </div>
                </div>

                {/* قائمة الرسائل */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">الرسائل المرسلة</h3>
                  {messageHistory[selectedPayment.id] && messageHistory[selectedPayment.id].length > 0 ? (
                    <div className="space-y-4">
                      {messageHistory[selectedPayment.id].map((message, index) => (
                        <div key={message.id || index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                message.type === 'sms'
                                  ? 'bg-blue-100 text-blue-800'
                                  : message.type === 'whatsapp'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {message.type === 'sms' ? '📱 SMS' :
                                 message.type === 'whatsapp' ? '💬 WhatsApp' :
                                 '📧 إشعار'}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                message.status === 'sent' || message.status === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : message.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {message.status === 'sent' ? '✅ تم الإرسال' :
                                 message.status === 'delivered' ? '📨 تم التسليم' :
                                 message.status === 'failed' ? '❌ فشل الإرسال' :
                                 '⏳ قيد الإرسال'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {message.createdAt?.toLocaleDateString('ar-EG')} - {message.createdAt?.toLocaleTimeString('ar-EG')}
                            </span>
                          </div>

                          <div className="bg-white border border-gray-100 rounded-lg p-3">
                            <p className="text-gray-800 whitespace-pre-wrap">{message.message || message.content || 'لا يوجد محتوى'}</p>
                          </div>

                          {message.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>خطأ:</strong> {message.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-lg font-medium">لا توجد رسائل مرسلة لهذا العميل</p>
                      <p className="text-sm">لم يتم إرسال أي رسائل SMS أو WhatsApp لهذا العميل بعد</p>
                    </div>
                  )}
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowMessageHistory(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={() => {
                      setShowMessageHistory(false);
                      handleMessage(selectedPayment);
                    }}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    💬 إرسال رسالة جديدة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* موديول تأكيد الحذف */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h2>
              <p className="text-gray-600 mb-6">
                هل أنت متأكد من حذف هذه المدفوعة؟<br/>
                <span className="font-semibold text-red-600">
                  {deletingPayment?.playerName} - {deletingPayment?.amount?.toLocaleString()} {deletingPayment?.currency}
                </span>
              </p>
              <p className="text-sm text-red-600 mb-6">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه وسيتم خصم قيمة المدفوعة من الإجمالي
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeletingPayment(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDeletePayment}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  حذف نهائياً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
