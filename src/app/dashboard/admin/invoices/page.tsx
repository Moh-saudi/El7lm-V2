'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import {
  Banknote,
  CreditCard,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  Receipt,
  RefreshCcw,
  Search,
  Wallet2,
  Mail,
  Printer,
  MessageCircle,
  X,
  Info,
  RotateCcw,
  Send,
  FileDown,
  Eye,
  Download,
  MessageSquare,
  Share2,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { db } from '@/lib/firebase/config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatPhoneNumber as formatWhatsAppPhone } from '@/lib/whatsapp/babaservice-config';
import { updatePaymentStatus, activateSubscription, deactivateSubscription } from '@/lib/utils/subscription-manager';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

type InvoiceStatus = 'paid' | 'pending' | 'cancelled' | 'overdue' | string;

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  source: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: Date;
  paidAt?: Date | null;
  expiryDate?: Date | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  planName?: string;
  packageDuration?: string;
  customerId?: string;
  notes?: string;
  receiptUrl?: string | null;
  invoiceUrl?: string | null;
  reference: {
    orderId?: string | null;
    merchantReferenceId?: string | null;
    paymentId?: string | null;
    transactionId?: string | null;
  };
  raw: any;
}

interface CollectionConfig {
  name: string;
  orderBy?: string;
  label: string;
}

const COLLECTIONS: CollectionConfig[] = [
  { name: 'invoices', orderBy: 'created_at', label: 'Invoices' },
  { name: 'geidea_payments', orderBy: 'createdAt', label: 'Geidea' },
  { name: 'bulkPayments', orderBy: 'createdAt', label: 'Bulk Payments' },
  { name: 'bulk_payments', orderBy: 'createdAt', label: 'Bulk Payments 2' },
  { name: 'wallet', orderBy: 'createdAt', label: 'Wallet' },
  { name: 'instapay', orderBy: 'createdAt', label: 'InstaPay' },
  { name: 'payments', orderBy: 'createdAt', label: 'Payments' },
  { name: 'payment_results', orderBy: 'createdAt', label: 'Payment Results' },
  { name: 'tournament_payments', orderBy: 'createdAt', label: 'Tournament' },
];

const METHOD_DETAILS: Record<
  string,
  { label: string; icon: any; badgeClass: string }
> = {
  geidea: { label: 'جيديا (بطاقة)', icon: CreditCard, badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  wallet: { label: 'محفظة', icon: Wallet2, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  instapay: { label: 'إنستا باي', icon: Banknote, badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  cash: { label: 'نقدي', icon: Banknote, badgeClass: 'bg-gray-100 text-gray-800 border-gray-200' },
  transfer: { label: 'تحويل بنكي', icon: Banknote, badgeClass: 'bg-green-100 text-green-800 border-green-200' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: 'مدفوع', color: 'bg-green-100 text-green-800 border-green-200' },
  pending: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700 border-red-200' },
  overdue: { label: 'متأخر', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeStatus = (value?: string | null): InvoiceStatus => {
  const status = (value || '').toLowerCase();
  if (['paid', 'completed', 'success', 'accepted'].includes(status)) return 'paid';
  if (['cancelled', 'failed', 'rejected', 'void'].includes(status)) return 'cancelled';
  if (['overdue', 'late'].includes(status)) return 'overdue';
  if (status) return status as InvoiceStatus;
  return 'pending';
};

const normalizePaymentMethod = (source: string, value?: string | null) => {
  if (value) return value.toLowerCase();
  if (source.includes('wallet')) return 'wallet';
  if (source.includes('instapay')) return 'instapay';
  if (source.includes('geidea')) return 'geidea';
  if (source.includes('bulk')) return 'geidea';
  return source;
};

const formatCurrency = (amount: number, currency: string = 'EGP') =>
  Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

// حساب مدة الباقة بالشهور من اسم الباقة
const getPackageDurationMonths = (planName?: string | null, packageType?: string | null): number => {
  // البحث في packageType أولاً (أكثر دقة)
  const type = (packageType || '').toLowerCase();
  if (type.includes('annual') || type.includes('yearly') || type.includes('سنوي') || type.includes('12') || type.includes('subscription_12')) {
    return 12;
  } else if (type.includes('6months') || type.includes('6 شهور') || type.includes('ستة') || type.includes('subscription_6')) {
    return 6;
  } else if (type.includes('3months') || type.includes('3 شهور') || type.includes('ثلاثة') || type.includes('subscription_3')) {
    return 3;
  }

  // البحث في planName
  if (!planName) return 0;
  const plan = planName.toLowerCase();

  if (plan.includes('annual') || plan.includes('yearly') || plan.includes('سنوي') || plan.includes('12') || plan.includes('subscription_12')) {
    return 12;
  } else if (plan.includes('6months') || plan.includes('6 شهور') || plan.includes('ستة') || plan.includes('subscription_6')) {
    return 6;
  } else if (plan.includes('3months') || plan.includes('3 شهور') || plan.includes('ثلاثة') || plan.includes('subscription_3')) {
    return 3;
  }

  return 0;
};

// استخراج مدة الباقة بصيغة نصية واضحة
const getPackageDurationLabel = (planName?: string | null, packageType?: string | null): string => {
  const months = getPackageDurationMonths(planName, packageType);
  if (months === 12) return '12 شهر (سنوي)';
  if (months === 6) return '6 شهور';
  if (months === 3) return '3 شهور';
  return 'غير محدد';
};

// حساب تاريخ الانتهاء بناءً على الباقة وتاريخ الدفع
const calculateExpiryDate = (data: any, createdAt: Date): Date | null => {
  // أولاً: محاولة استخراج تاريخ الانتهاء من البيانات
  const expiresAt =
    toDate(data?.expires_at) ||
    toDate(data?.end_date) ||
    toDate(data?.endDate) ||
    toDate(data?.subscription_expires_at) ||
    toDate(data?.subscriptionExpiresAt) ||
    null;

  if (expiresAt) {
    return expiresAt;
  }

  // ثانياً: حساب تاريخ الانتهاء بناءً على الباقة
  const planName = data?.plan_name || data?.planName || data?.package_name || data?.packageName || data?.selectedPackage || '';
  const packageType = data?.packageType || data?.package_type || data?.package_type_name || '';
  const durationMonths = getPackageDurationMonths(planName, packageType);

  console.log('🔍 [Invoice] حساب تاريخ الانتهاء:', {
    planName,
    packageType,
    durationMonths,
    createdAt: createdAt.toISOString(),
    dataKeys: Object.keys(data || {})
  });

  if (durationMonths > 0) {
    // استخدام تاريخ الدفع (paidAt) إذا كان موجوداً، وإلا استخدام تاريخ التفعيل (activated_at)، وإلا تاريخ الإنشاء
    const startDate =
      toDate(data?.paid_at) ||
      toDate(data?.paidAt) ||
      toDate(data?.paymentDate) ||
      toDate(data?.activated_at) ||
      toDate(data?.activatedAt) ||
      toDate(data?.activationDate) ||
      createdAt;

    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

    console.log('✅ [Invoice] تم حساب تاريخ الانتهاء:', {
      startDate: startDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      durationMonths
    });

    return expiryDate;
  }

  console.log('⚠️ [Invoice] لم يتم العثور على مدة الباقة');
  return null;
};

const extractCustomerPhone = (data: any, source?: string): string => {
  // الأولوية للمدفوعات الجماعية - البحث عن رقم الهاتف من حقل players
  if (source === 'bulkPayments' || source === 'bulk_payments') {
    if (data.players && Array.isArray(data.players) && data.players.length > 0) {
      // إذا كان هناك لاعب واحد فقط
      if (data.players.length === 1) {
        const player = data.players[0];
        const phone = player.phone || player.phoneNumber || player.mobile || player.whatsapp || '';
        if (phone && phone.trim()) {
          console.log(`Found phone from bulkPayments players array (single): ${phone}`);
          return phone.trim();
        }
      } else {
        // إذا كان هناك أكثر من لاعب، نأخذ رقم الهاتف من اللاعب الأول
        const firstPlayer = data.players[0];
        const phone = firstPlayer.phone || firstPlayer.phoneNumber || firstPlayer.mobile || firstPlayer.whatsapp || '';
        if (phone && phone.trim()) {
          console.log(`Found phone from bulkPayments players array (first player): ${phone}`);
          return phone.trim();
        }
      }
    }
  }

  // قائمة شاملة من الحقول المحتملة للهاتف
  const directPhoneFields = [
    'phone', 'whatsapp', 'mobile', 'telephone', 'contact',
    'phoneNumber', 'mobileNumber', 'contactNumber',
    'customer_phone', 'user_phone', 'phone_number', 'mobile_number',
    'customerMobile', 'userMobile', 'customerTel', 'userTel',
    'customer_phone_number', 'user_phone_number', 'contact_phone',
    'player_phone', 'customer_phone_number', 'user_phone_number',
    'tel', 'customerPhone', 'userPhone', 'recipientPhone', 'buyerPhone',
    'clientPhone', 'accountPhone', 'holderPhone',
    'recipient_phone', 'buyer_phone', 'client_phone',
    'account_phone', 'holder_phone', 'phone_no', 'mobile_no',
    'contact_no', 'tel_no', 'phoneNum', 'mobileNum', 'contactNum',
    'customer_phone_no', 'user_phone_no', 'recipient_phone_no',
    'buyer_phone_no', 'client_phone_no', 'account_phone_no',
    'holder_phone_no', 'customerPhoneNumber', 'userPhoneNumber', 'recipientPhoneNumber',
    'buyerPhoneNumber', 'clientPhoneNumber', 'accountPhoneNumber',
    'holderPhoneNumber', 'phone_number', 'mobile_number', 'contact_number',
    'customer_phone_number', 'user_phone_number', 'recipient_phone_number',
    'buyer_phone_number', 'client_phone_number', 'account_phone_number',
    'holder_phone_number', 'phoneNo', 'mobileNo', 'contactNo',
    'customerPhoneNo', 'userPhoneNo', 'recipientPhoneNo',
    'buyerPhoneNo', 'clientPhoneNo', 'accountPhoneNo', 'holderPhoneNo'
  ];

  // البحث في الحقول المحددة أولاً
  for (const field of directPhoneFields) {
    if (data?.[field] && data[field].toString().trim() !== '') {
      const phone = data[field].toString().trim();
      console.log(`Found phone directly in data: ${field} = ${phone}`);
      return phone;
    }
  }

  // البحث في جميع الحقول التي قد تحتوي على رقم هاتف
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'string') {
        const text = value.trim();
        const lowerKey = key.toLowerCase();

        // البحث في الحقول التي قد تحتوي على أرقام هواتف
        if ((lowerKey.includes('phone') || lowerKey.includes('mobile') ||
          lowerKey.includes('tel') || lowerKey.includes('whatsapp') ||
          lowerKey.includes('contact')) &&
          text.length >= 7 && text.length <= 15 &&
          /^\d+$/.test(text.replace(/[\s\-\(\)]/g, ''))) {

          const cleanPhone = text.replace(/[\s\-\(\)]/g, '');
          console.log(`Found phone in field: ${key} = ${cleanPhone}`);
          return cleanPhone;
        }
      }
    }
  }

  // إذا لم نجد رقم الهاتف، نبحث في الإيميل ونستخرج الرقم منه
  const email = data?.email || data?.user_email || data?.userEmail || data?.customerEmail;
  if (email && typeof email === 'string' && email.includes('@')) {
    const phoneMatch = email.match(/\d{7,15}/);
    if (phoneMatch) {
      console.log(`Extracted phone from email: ${phoneMatch[0]}`);
      return phoneMatch[0];
    }
  }

  return '';
};

const extractCustomerName = (data: any, source: string): string => {
  let playerName = 'غير محدد';

  // الأولوية للمدفوعات الجماعية - البحث عن أسماء اللاعبين من حقل players في bulkPayments
  if (source === 'bulkPayments' || source === 'bulk_payments') {
    if (data.players && Array.isArray(data.players) && data.players.length > 0) {
      // إذا كان هناك لاعب واحد فقط
      if (data.players.length === 1) {
        const player = data.players[0];
        if (player.name && typeof player.name === 'string' && player.name.trim()) {
          playerName = player.name.trim();
          console.log(`Found player name from bulkPayments players array (single): ${playerName}`);
          return playerName;
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
          return playerName;
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
        return playerName;
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
          return playerName;
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
            return playerName;
          }
        }
      }
    }
  }

  // إذا لم نجد الاسم، نبحث في الإيميل ونستخرج الاسم منه (كحل أخير فقط)
  if (playerName === 'غير محدد') {
    const email = data?.email || data?.user_email || data?.userEmail || data?.customerEmail;
    if (email && typeof email === 'string' && email.includes('@')) {
      const nameFromEmail = email.split('@')[0];
      // تنظيف الاسم من الأرقام والرموز
      const cleanName = nameFromEmail.replace(/[0-9_\-\.]/g, ' ').trim();

      // التحقق من أن الاسم يبدو كاسم حقيقي (يحتوي على أحرف وليس أرقام فقط)
      if (cleanName && cleanName.length > 2 && /[a-zA-Z\u0600-\u06FF]/.test(cleanName)) {
        playerName = cleanName;
        console.log(`Extracted name from email: ${playerName}`);
        return playerName;
      } else {
        // إذا لم يكن يبدو كاسم حقيقي، نتركه "غير محدد"
        console.log(`Email prefix doesn't look like a real name: ${nameFromEmail}`);
      }
    }
  }

  return playerName;
};

const normalizeRecord = (source: string, id: string, data: any): InvoiceRecord => {
  const createdAt =
    toDate(data?.created_at) ||
    toDate(data?.createdAt) ||
    toDate(data?.timestamp) ||
    toDate(data?.date) ||
    new Date();
  const paidAt =
    toDate(data?.paid_at) ||
    toDate(data?.paidAt) ||
    toDate(data?.paymentDate) ||
    toDate(data?.completedAt) ||
    null;

  const amount =
    Number(
      data?.amount ??
      data?.total ??
      data?.total_amount ??
      data?.value ??
      data?.price ??
      data?.finalPrice ??
      0,
    ) || 0;
  const currency =
    data?.currency ||
    data?.currencyCode ||
    data?.currency_symbol ||
    'EGP';

  const paymentMethod = normalizePaymentMethod(source, data?.paymentMethod || data?.method || data?.gateway);
  const status = normalizeStatus(data?.status || data?.paymentStatus || data?.invoiceStatus || data?.state);

  return {
    id,
    source,
    invoiceNumber:
      data?.invoice_number ||
      data?.invoiceNumber ||
      data?.invoice_no ||
      data?.orderId ||
      data?.merchantReferenceId ||
      `INV-${id.slice(0, 8)}`,
    paymentMethod,
    amount,
    currency,
    status,
    createdAt,
    paidAt,
    expiryDate: calculateExpiryDate(data, createdAt),
    customerName: extractCustomerName(data, source),
    customerEmail:
      data?.user_email ||
      data?.userEmail ||
      data?.customerEmail ||
      data?.email ||
      '',
    customerPhone: extractCustomerPhone(data, source),
    planName:
      data?.plan_name ||
      data?.planName ||
      data?.package ||
      data?.packageName ||
      data?.selectedPackage ||
      data?.packageType ||
      data?.package_type ||
      data?.subscription ||
      '',
    packageDuration: getPackageDurationLabel(
      data?.plan_name || data?.planName || data?.package_name || data?.packageName || data?.selectedPackage || '',
      data?.packageType || data?.package_type || data?.package_type_name || ''
    ),
    customerId: data?.userId || data?.user_id || data?.playerId || data?.player_id || '',
    notes: data?.notes || data?.description || data?.memo || '',
    receiptUrl: fixReceiptUrl(
      data?.receiptUrl ||
      data?.receiptImage ||
      data?.proofUrl ||
      data?.attachment
    ),
    invoiceUrl:
      data?.invoice_pdf_url ||
      data?.invoiceUrl ||
      data?.pdfUrl ||
      null,
    reference: {
      orderId: data?.orderId || null,
      merchantReferenceId: data?.merchantReferenceId || null,
      paymentId: data?.payment_id || data?.paymentId || id,
      transactionId: data?.transactionId || data?.sessionId || data?.reference || null,
    },
    raw: { ...data, collection: source, id },
  };
};

const sanitizePhone = (value?: string | null) => (value || '').replace(/\D+/g, '');

const formatDate = (value?: Date | null) => {
  if (!value) return 'غير محدد';
  return value.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInvoiceDownloadUrl = (record: InvoiceRecord): string => {
  // في وضع التطوير: window.location.origin = "http://localhost:3000"
  // في الإنتاج: window.location.origin = "https://www.el7lm.com" (تلقائياً من النطاق الفعلي)
  // fallback: استخدام NEXT_PUBLIC_BASE_URL من البيئة أو القيمة الافتراضية
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin  // ✅ في الإنتاج سيأخذ النطاق الفعلي تلقائياً
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://www.el7lm.com';

  // استخدام ID الفاتورة أو invoiceNumber أو orderId أو merchantReferenceId
  const invoiceId = record.id || record.invoiceNumber || record.reference.orderId || record.reference.merchantReferenceId;

  if (!invoiceId) return '';

  // رابط صفحة الفاتورة العامة للعميل (ليست في لوحة الإدارة)
  // في التطوير: http://localhost:3000/invoice/[id]
  // في الإنتاج: https://www.el7lm.com/invoice/[id]
  return `${baseUrl}/invoice/${encodeURIComponent(invoiceId)}`;
};

const buildShareMessage = (record: InvoiceRecord, includeDownloadLink: boolean = true) => {
  const statusLabel = STATUS_LABELS[record.status]?.label || record.status;
  const lines = [
    `مرحباً ${record.customerName || 'صديقنا العزيز'} 🌟`,
    'يسعد فريق منصة الحلم أن يشاركك تفاصيل فاتورتك الأخيرة ونؤكد أننا معك في كل خطوة نحو نجاحك الرياضي.',
    `رقم الفاتورة: ${record.invoiceNumber}`,
    `المبلغ المستحق: ${formatCurrency(record.amount, record.currency)}`,
  ];

  if (record.packageDuration && record.packageDuration !== 'غير محدد') {
    lines.push(`مدة الاشتراك: ${record.packageDuration}`);
  }

  if (record.expiryDate) {
    const expiryText = record.expiryDate < new Date()
      ? `تاريخ الانتهاء: ${formatDate(record.expiryDate)} (منتهي)`
      : `تاريخ الانتهاء: ${formatDate(record.expiryDate)}`;
    lines.push(expiryText);
  }

  lines.push(`الحالة الحالية: ${statusLabel}`);

  if (includeDownloadLink) {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://www.el7lm.com';
    const subscriptionStatusUrl = `${baseUrl}/dashboard/shared/subscription-status`;

    lines.push('');
    lines.push('يمكنك الآن الوصول إلى الفاتورة عبر صفحة حالة الاشتراك:');
    lines.push(subscriptionStatusUrl);
    lines.push('');
    lines.push('يمكنك فتح وطباعة الفاتورة أو حفظها كملف PDF من المتصفح.');
  }

  lines.push('');
  lines.push('إذا احتجت أي مساعدة أو استفسار فنحن جاهزون فوراً لدعمك ومواصلة العمل على نجاحاتنا المشتركة 💪.');

  return lines.join('\n');
};

const formatPhoneForApi = (phone?: string | null) => {
  if (!phone) return '';
  const formatted = formatWhatsAppPhone(phone);
  return formatted?.trim() || '';
};

const generateInvoiceHTML = (record: InvoiceRecord) => `
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>فاتورة ${record.invoiceNumber}</title>
      <style>
        body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 24px; background: #f5f7fb; color: #1f2933; }
        .invoice-container { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); padding: 32px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eef2ff; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { height: 64px; }
        .company-info { text-align: left; font-size: 14px; color: #475569; }
        .title { font-size: 28px; margin: 0; color: #312e81; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; background: #eef2ff; color: #4338ca; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-size: 14px; }
        th { background: #f8fafc; color: #0f172a; }
        .section-title { font-size: 18px; margin: 24px 0 12px; color: #0f172a; }
        .footer { margin-top: 32px; text-align: center; color: #475569; font-size: 15px; }
        .footer strong { color: #0f172a; }
        @media print { body { background: #fff; } .invoice-container { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div>
            <h1 class="title">فاتورة موحدة - منصة الحلم</h1>
            <span class="badge">${record.invoiceNumber}</span>
            ${record.packageDuration && record.packageDuration !== 'غير محدد' ? `
            <div style="margin-top: 12px; padding: 8px 16px; background: #f3e8ff; border-radius: 8px; display: inline-block;">
              <span style="color: #7c3aed; font-weight: bold; font-size: 16px;">📅 مدة الاشتراك: ${record.packageDuration}</span>
            </div>
            ` : ''}
          </div>
          <img src="/el7lm-logo.png" alt="El7lm" class="logo" />
        </div>

        <p>${buildShareMessage(record).replace(/\n/g, '<br/>')}</p>

        <h2 class="section-title">تفاصيل الفاتورة</h2>
        <table>
          <tbody>
            <tr>
              <th>المصدر</th>
              <td>${record.source}</td>
            </tr>
            <tr>
              <th>الخدمة / الباقة</th>
              <td>${record.planName || '—'}</td>
            </tr>
            ${record.packageDuration && record.packageDuration !== 'غير محدد' ? `
            <tr>
              <th>مدة الاشتراك</th>
              <td style="color: #7c3aed; font-weight: bold; font-size: 15px;">📅 ${record.packageDuration}</td>
            </tr>
            ` : ''}
            <tr>
              <th>طريقة الدفع</th>
              <td>${METHOD_DETAILS[record.paymentMethod]?.label || record.paymentMethod || record.source}</td>
            </tr>
            <tr>
              <th>المبلغ</th>
              <td>${formatCurrency(record.amount, record.currency)}</td>
            </tr>
            <tr>
              <th>حالة الفاتورة</th>
              <td>${STATUS_LABELS[record.status]?.label || record.status}</td>
            </tr>
            <tr>
              <th>تاريخ الإنشاء</th>
              <td>${formatDate(record.createdAt)}</td>
            </tr>
            <tr>
              <th>تاريخ التحصيل</th>
              <td>${record.paidAt ? formatDate(record.paidAt) : '—'}</td>
            </tr>
            ${record.expiryDate ? `
            <tr>
              <th>تاريخ الانتهاء</th>
              <td>${formatDate(record.expiryDate)}${record.expiryDate < new Date() ? ' <span style="color: #dc2626;">(منتهي)</span>' : ''}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>

        <h2 class="section-title">بيانات العميل</h2>
        <table>
          <tbody>
            <tr>
              <th>الاسم</th>
              <td>${record.customerName || 'غير محدد'}</td>
            </tr>
            <tr>
              <th>البريد الإلكتروني</th>
              <td>${record.customerEmail || 'غير متوفر'}</td>
            </tr>
            <tr>
              <th>الهاتف</th>
              <td>${record.customerPhone || 'غير متوفر'}</td>
            </tr>
          </tbody>
        </table>

        <h2 class="section-title">مراجع الدفع</h2>
        <table>
          <tbody>
            <tr>
              <th>Order ID</th>
              <td>${record.reference.orderId || '—'}</td>
            </tr>
            <tr>
              <th>Merchant Reference</th>
              <td>${record.reference.merchantReferenceId || '—'}</td>
            </tr>
            <tr>
              <th>Transaction ID</th>
              <td>${record.reference.transactionId || '—'}</td>
            </tr>
            <tr>
              <th>Payment ID</th>
              <td>${record.reference.paymentId || '—'}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p><strong>منصة الحلم</strong> - نعمل معك لبناء رحلة رياضية مُلهمة ومتكاملة.</p>
          <p>📧 info@el7lm.com &nbsp; | &nbsp; 🌐 www.el7lm.com &nbsp; | &nbsp; 📱 +20 101 779 9580</p>
        </div>
      </div>
    </body>
  </html>
`;

export default function AdminInvoicesListPage() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    source: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [selected, setSelected] = useState<InvoiceRecord | null>(null);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
  const [showMessagePreview, setShowMessagePreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [selectedRecordForWhatsApp, setSelectedRecordForWhatsApp] = useState<InvoiceRecord | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoiceRecord, setPreviewInvoiceRecord] = useState<InvoiceRecord | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  /**
   * إثراء معلومات الباقة لسجلات جيديا من بيانات المستخدمين
   */
  const enrichPackageInfoForInvoices = async (records: InvoiceRecord[]) => {
    // فقط لسجلات جيديا التي لا تحتوي على معلومات الباقة
    const geideaRecordsNeedingEnrichment = records.filter(
      (r) => r.source === 'geidea_payments' && !r.planName && (r.customerEmail || r.customerPhone)
    );

    if (geideaRecordsNeedingEnrichment.length === 0) {
      return;
    }

    console.log(`📦 [Invoices] Enriching ${geideaRecordsNeedingEnrichment.length} Geidea records with package info...`);

    // جلب معلومات المستخدمين بناءً على الإيميل أو الهاتف
    const uniqueEmails = [...new Set(geideaRecordsNeedingEnrichment.map((r) => r.customerEmail).filter(Boolean))];
    const uniquePhones = [...new Set(geideaRecordsNeedingEnrichment.map((r) => r.customerPhone).filter(Boolean))];

    const emailToUserMap: Record<string, any> = {};
    const phoneToUserMap: Record<string, any> = {};

    // البحث بالإيميل
    for (const email of uniqueEmails) {
      if (!email) continue;

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          emailToUserMap[email] = userData;
          console.log(`✅ [Invoices] Found user by email: ${email}`);
        }
      } catch (error) {
        console.warn(`⚠️ [Invoices] Failed to fetch user data for email ${email}:`, error);
      }
    }

    // البحث بالهاتف
    for (const phone of uniquePhones) {
      if (!phone) continue;

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', phone));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          phoneToUserMap[phone] = userData;
          console.log(`✅ [Invoices] Found user by phone: ${phone}`);
        }
      } catch (error) {
        console.warn(`⚠️ [Invoices] Failed to fetch user data for phone ${phone}:`, error);
      }
    }

    // تحديث السجلات بمعلومات الباقة والاسم
    geideaRecordsNeedingEnrichment.forEach((record) => {
      let userData = null;

      // البحث بالإيميل أولاً
      if (record.customerEmail && emailToUserMap[record.customerEmail]) {
        userData = emailToUserMap[record.customerEmail];
      }
      // إذا لم نجد بالإيميل، نبحث بالهاتف
      else if (record.customerPhone && phoneToUserMap[record.customerPhone]) {
        userData = phoneToUserMap[record.customerPhone];
      }

      if (userData) {
        // تحديث اسم العميل
        if (!record.customerName || record.customerName === 'غير محدد') {
          record.customerName = userData.full_name || userData.name || userData.displayName || record.customerName;
        }

        // تحديث معلومات الباقة
        const packageType = userData.selectedPackage || userData.packageType || userData.package_type;
        const planName = userData.plan_name || packageType;

        if (packageType || planName) {
          record.planName = planName || packageType || '';
          record.packageDuration = getPackageDurationLabel(planName, packageType);

          // حساب expiryDate بناءً على الباقة
          record.expiryDate = calculateExpiryDate(
            { ...record.raw, packageType: packageType, plan_name: planName },
            record.createdAt
          );

          console.log(`✅ [Invoices] Enriched record for ${record.customerEmail || record.customerPhone}: ${planName}`);
        }
      }
    });

    console.log(`✨ [Invoices] Enrichment complete!`);
  };

  const load = async () => {
    setLoading(true);
    try {
      const aggregated: InvoiceRecord[] = [];
      for (const cfg of COLLECTIONS) {
        try {
          const ref = collection(db, cfg.name);
          const snap = cfg.orderBy
            ? await getDocs(query(ref, orderBy(cfg.orderBy, 'desc')))
            : await getDocs(ref);
          snap.forEach((docSnap) =>
            aggregated.push(normalizeRecord(cfg.name, docSnap.id, docSnap.data())),
          );
        } catch (error) {
          console.warn(`⚠️ Failed to load ${cfg.name}:`, error);
        }
      }

      // ✅ استبعاد الفواتير الخاصة بـ contact@fakhracademy.com
      const filteredRecords = aggregated.filter(
        (record) => record.customerEmail !== 'contact@fakhracademy.com'
      );

      filteredRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // ✨ إثراء معلومات الباقة لسجلات جيديا
      await enrichPackageInfoForInvoices(filteredRecords);

      setRecords(filteredRecords);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const text = [
        record.invoiceNumber,
        record.customerName,
        record.customerEmail,
        record.customerPhone,
        record.planName,
        record.reference.orderId,
        record.reference.transactionId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (term && !text.includes(term)) return false;
      if (filters.status !== 'all' && record.status !== filters.status) return false;
      if (filters.method !== 'all' && record.paymentMethod !== filters.method) return false;
      if (filters.source !== 'all' && record.source !== filters.source) return false;

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (record.createdAt < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (record.createdAt > to) return false;
      }
      return true;
    });
  }, [records, search, filters]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters]);


  const stats = useMemo(() => {
    const totalAmount = records.reduce((sum, rec) => sum + rec.amount, 0);
    const paidAmount = records
      .filter((rec) => rec.status === 'paid')
      .reduce((sum, rec) => sum + rec.amount, 0);
    const paidCount = records.filter((rec) => rec.status === 'paid').length;
    const pendingAmount = records
      .filter((rec) => rec.status === 'pending')
      .reduce((sum, rec) => sum + rec.amount, 0);
    const pendingCount = records.filter((rec) => rec.status === 'pending').length;
    const cancelledAmount = records
      .filter((rec) => rec.status === 'cancelled')
      .reduce((sum, rec) => sum + rec.amount, 0);
    const cancelledCount = records.filter((rec) => rec.status === 'cancelled').length;
    const uniqueClients = new Set(
      records.map((rec) => rec.customerEmail || rec.customerPhone || rec.customerName),
    ).size;

    // إحصائيات جيديا
    const geideaRecords = records.filter((rec) => rec.source === 'geidea_payments');
    const geideaCount = geideaRecords.length;
    const geideaAmount = geideaRecords.reduce((sum, rec) => sum + rec.amount, 0);

    // إحصائيات المحفظة
    const walletRecords = records.filter((rec) =>
      rec.source === 'wallet' || rec.source === 'bulkPayments' || rec.source === 'bulk_payments'
    );
    const walletCount = walletRecords.length;
    const walletAmount = walletRecords.reduce((sum, rec) => sum + rec.amount, 0);

    // إحصائيات إنستا باي
    const instapayRecords = records.filter((rec) => rec.source === 'instapay');
    const instapayCount = instapayRecords.length;
    const instapayAmount = instapayRecords.reduce((sum, rec) => sum + rec.amount, 0);

    // متوسط قيمة الفاتورة
    const averageAmount = records.length > 0 ? totalAmount / records.length : 0;

    return {
      count: records.length,
      totalAmount,
      paidAmount,
      paidCount,
      pendingAmount,
      pendingCount,
      cancelledAmount,
      cancelledCount,
      uniqueClients,
      geideaCount,
      geideaAmount,
      walletCount,
      walletAmount,
      instapayCount,
      instapayAmount,
      averageAmount,
    };
  }, [records]);

  const methodOptions = useMemo(() => {
    const methods = Array.from(new Set(records.map((rec) => rec.paymentMethod))).filter(Boolean);
    return methods;
  }, [records]);

  const sourceOptions = useMemo(() => {
    const sources = Array.from(new Set(records.map((rec) => rec.source))).filter(Boolean);
    return sources;
  }, [records]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const statusDisplay = (status: InvoiceStatus) => {
    const config = STATUS_LABELS[status] || STATUS_LABELS.pending;
    return (
      <Badge className={`border ${config.color} capitalize`}>
        {config.label || status}
      </Badge>
    );
  };

  const paymentDisplay = (record: InvoiceRecord) => {
    const details = METHOD_DETAILS[record.paymentMethod] || {
      label: record.paymentMethod || record.source,
      icon: CreditCard,
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    const Icon = details.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold ${details.badgeClass}`}>
        <Icon className="w-3.5 h-3.5" />
        {details.label}
      </span>
    );
  };

  const handlePreviewInvoice = (record: InvoiceRecord) => {
    setPreviewInvoiceRecord(record);
    setShowInvoicePreview(true);
  };

  const handlePrintInvoice = (record: InvoiceRecord) => {
    if (typeof window === 'undefined') return;
    const html = generateInvoiceHTML(record);
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handlePrintFromPreview = () => {
    if (!previewInvoiceRecord) return;
    handlePrintInvoice(previewInvoiceRecord);
  };

  const handleSendEmail = (record: InvoiceRecord) => {
    if (!record.customerEmail) {
      toast.error('لا يوجد بريد إلكتروني محدث لهذا العميل');
      return;
    }
    const subject = `فاتورة ${record.invoiceNumber} - منصة الحلم`;
    const bodyLines = [
      buildShareMessage(record, true), // يتضمن رابط تحميل الفاتورة
      '',
      record.receiptUrl ? `رابط الإيصال: ${record.receiptUrl}` : '',
      '',
      'مع خالص التقدير،',
      'فريق منصة الحلم 🤝',
    ].filter(Boolean);
    const mailtoUrl = `mailto:${record.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.open(mailtoUrl, '_blank');
    toast.success('تم فتح البريد الإلكتروني لإرسال الفاتورة');
  };

  const handleSendWhatsApp = (record: InvoiceRecord) => {
    const phone = sanitizePhone(record.customerPhone);
    if (!phone) {
      toast.error('لا يوجد رقم هاتف صالح لهذا العميل');
      return;
    }
    const shareLines = [
      buildShareMessage(record, true), // يتضمن رابط تحميل الفاتورة
      '',
      record.receiptUrl ? `رابط الإيصال: ${record.receiptUrl}` : '',
    ].filter(Boolean);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(shareLines.join('\n'))}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success('تم فتح WhatsApp مع الرسالة المحددة');
  };

  const buildWhatsAppMessage = (record: InvoiceRecord): string => {
    const shareLines = [
      buildShareMessage(record, true), // يتضمن رابط التحميل
      '',
      record.receiptUrl ? `رابط الإيصال: ${record.receiptUrl}` : '',
    ].filter(Boolean);
    return shareLines.join('\n');
  };

  const handleSendWhatsAppApi = (record: InvoiceRecord) => {
    if (sendingWhatsAppId) return;
    const phone = formatPhoneForApi(record.customerPhone);
    if (!phone || phone.length < 7) {
      toast.error('لا يوجد رقم هاتف دولي صالح لإرسال رسالة رسمية');
      return;
    }

    const message = buildWhatsAppMessage(record);
    setSelectedRecordForWhatsApp(record);
    setPreviewMessage(message);
    setShowMessagePreview(true);
  };

  const sendWhatsAppApiConfirmed = async () => {
    if (!selectedRecordForWhatsApp || !previewMessage.trim()) {
      toast.error('الرسالة فارغة');
      return;
    }

    const phone = formatPhoneForApi(selectedRecordForWhatsApp.customerPhone);
    if (!phone || phone.length < 7) {
      toast.error('لا يوجد رقم هاتف دولي صالح');
      return;
    }

    setSendingWhatsAppId(selectedRecordForWhatsApp.id);
    setShowMessagePreview(false);

    try {
      const response = await fetch('/api/whatsapp/send-official', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          message: previewMessage.trim(),
          playerName: selectedRecordForWhatsApp.customerName || undefined,
          organizationName: 'منصة الحلم - الفواتير',
          accountType: 'admin',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result?.error || result?.details || 'فشل إرسال رسالة الواتساب الرسمية';
        console.error('❌ [Invoices] WhatsApp API send failed:', {
          status: response.status,
          error: errorMsg,
          result
        });
        toast.error(`فشل الإرسال: ${errorMsg}`, {
          duration: 5000,
        });
        return;
      }

      console.log('✅ [Invoices] WhatsApp API send success:', result);
      toast.success('✅ تم إرسال رسالة واتساب الرسمية بنجاح', {
        duration: 4000,
        description: `تم الإرسال إلى ${phone}`,
      });
    } catch (error: any) {
      console.error('❌ [Invoices] WhatsApp API send exception:', error);
      toast.error(`خطأ في الإرسال: ${error?.message || 'حدث خطأ غير متوقع'}`, {
        duration: 5000,
      });
    } finally {
      setSendingWhatsAppId(null);
      setSelectedRecordForWhatsApp(null);
      setPreviewMessage('');
    }
  };

  /**
   * تصدير البيانات إلى Excel (CSV format)
   */
  const handleExportToExcel = () => {
    try {
      console.log('🔄 [Export] Starting Excel export...', {
        totalRecords: records.length,
        filteredRecords: filtered.length,
        filters: filters,
        search: search
      });

      // إعداد البيانات للتصدير
      const dataToExport = filtered.map((record, index) => ({
        '#': index + 1,
        'رقم الفاتورة': record.invoiceNumber || '-',
        'الحالة': record.status === 'paid' ? 'مدفوع' :
          record.status === 'pending' ? 'قيد المراجعة' :
            record.status === 'cancelled' ? 'ملغي' :
              record.status === 'overdue' ? 'متأخر' : record.status,
        'اسم العميل': record.customerName || '-',
        'البريد الإلكتروني': record.customerEmail || '-',
        'رقم الهاتف': record.customerPhone || '-',
        'الخدمة/الباقة': record.planName || '-',
        'مدة الباقة': record.packageDuration || '-',
        'المبلغ': record.amount || 0,
        'العملة': record.currency || 'EGP',
        'طريقة الدفع': record.paymentMethod || '-',
        'المصدر': record.source || '-',
        'تاريخ الإنشاء': record.createdAt ? formatDate(record.createdAt) : '-',
        'تاريخ الدفع': record.paidAt ? formatDate(record.paidAt) : '-',
        'تاريخ الانتهاء': record.expiryDate ? formatDate(record.expiryDate) : '-',
        'Order ID': record.reference.orderId || '-',
        'Merchant Reference': record.reference.merchantReferenceId || '-',
        'Transaction ID': record.reference.transactionId || '-',
        'Payment ID': record.reference.paymentId || '-',
        'ملاحظات': record.notes || '-'
      }));

      // إضافة صف الإحصائيات في الأعلى
      const statsRow = {
        '#': '',
        'رقم الفاتورة': '📊 إحصائيات',
        'الحالة': `إجمالي: ${filtered.length}`,
        'اسم العميل': `مدفوع: ${filtered.filter(r => r.status === 'paid').length}`,
        'البريد الإلكتروني': `قيد المراجعة: ${filtered.filter(r => r.status === 'pending').length}`,
        'رقم الهاتف': `ملغي: ${filtered.filter(r => r.status === 'cancelled').length}`,
        'الخدمة/الباقة': '',
        'مدة الباقة': '',
        'المبلغ': stats.totalAmount,
        'العملة': 'EGP',
        'طريقة الدفع': `متوسط: ${stats.averageAmount.toFixed(2)}`,
        'المصدر': '',
        'تاريخ الإنشاء': '',
        'تاريخ الدفع': '',
        'تاريخ الانتهاء': '',
        'Order ID': '',
        'Merchant Reference': '',
        'Transaction ID': '',
        'Payment ID': '',
        'ملاحظات': `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`
      };

      const emptyRow = {
        '#': '', 'رقم الفاتورة': '', 'الحالة': '', 'اسم العميل': '',
        'البريد الإلكتروني': '', 'رقم الهاتف': '', 'الخدمة/الباقة': '',
        'مدة الباقة': '', 'المبلغ': '', 'العملة': '', 'طريقة الدفع': '',
        'المصدر': '', 'تاريخ الإنشاء': '', 'تاريخ الدفع': '', 'تاريخ الانتهاء': '',
        'Order ID': '', 'Merchant Reference': '', 'Transaction ID': '',
        'Payment ID': '', 'ملاحظات': ''
      };

      // دمج البيانات مع الإحصائيات
      const finalData = [statsRow, emptyRow, ...dataToExport];

      // تحويل إلى CSV
      const headers = Object.keys(finalData[0]);
      const csvContent = [
        headers.join(','),
        ...finalData.map(row =>
          headers.map(header => {
            const value = row[header];
            // معالجة القيم التي تحتوي على فواصل أو أحرف خاصة
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // إضافة BOM لدعم UTF-8 في Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // إنشاء رابط التحميل
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      // اسم الملف مع التاريخ
      const filterSuffix = filters.status !== 'all' ? `_${filters.status}` :
        filters.method !== 'all' ? `_${filters.method}` :
          filters.source !== 'all' ? `_${filters.source}` : '';
      const fileName = `invoices_${new Date().toISOString().split('T')[0]}${filterSuffix}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ [Export] Excel export completed:', {
        fileName,
        recordsExported: filtered.length,
        fileSize: blob.size
      });

      toast.success(`✅ تم تصدير ${filtered.length} فاتورة إلى Excel`, {
        description: `اسم الملف: ${fileName}`,
        duration: 5000
      });
    } catch (error) {
      console.error('❌ [Export] Error exporting to Excel:', error);
      toast.error('❌ فشل تصدير البيانات', {
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        duration: 5000
      });
    }
  };

  /**
   * تصدير البيانات إلى JSON
   */
  const handleExportToJSON = () => {
    try {
      const dataToExport = filtered.map((record, index) => ({
        index: index + 1,
        invoiceNumber: record.invoiceNumber,
        status: record.status,
        customerName: record.customerName,
        customerEmail: record.customerEmail,
        customerPhone: record.customerPhone,
        planName: record.planName,
        packageDuration: record.packageDuration,
        amount: record.amount,
        currency: record.currency,
        paymentMethod: record.paymentMethod,
        source: record.source,
        createdAt: record.createdAt?.toISOString(),
        paidAt: record.paidAt?.toISOString(),
        expiryDate: record.expiryDate?.toISOString(),
        reference: record.reference,
        notes: record.notes
      }));

      const exportData = {
        exportDate: new Date().toISOString(),
        totalRecords: filtered.length,
        filters: {
          status: filters.status,
          method: filters.method,
          source: filters.source,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          search: search
        },
        statistics: {
          totalAmount: stats.totalAmount,
          paidAmount: stats.paidAmount,
          pendingAmount: stats.pendingAmount,
          averageAmount: stats.averageAmount,
          uniqueClients: stats.uniqueClients
        },
        records: dataToExport
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const fileName = `invoices_${new Date().toISOString().split('T')[0]}.json`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`✅ تم تصدير ${filtered.length} فاتورة إلى JSON`, {
        description: `اسم الملف: ${fileName}`,
        duration: 5000
      });
    } catch (error) {
      console.error('❌ [Export] Error exporting to JSON:', error);
      toast.error('❌ فشل تصدير البيانات');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 px-4 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-800">
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold">لوحة التحكم في الفواتير</h1>
              <p className="text-sm text-gray-500">
                عرض كل الفواتير والمدفوعات من جميع القنوات في مكان واحد
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1">
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                disabled={loading || filtered.length === 0}
                className="gap-2 bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              >
                <FileDown className="w-4 h-4" />
                Excel ({filtered.length})
              </Button>
              <Button
                variant="outline"
                onClick={handleExportToJSON}
                disabled={loading || filtered.length === 0}
                className="gap-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <FileDown className="w-4 h-4" />
                JSON
              </Button>
            </div>
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              تحديث البيانات
            </Button>
            <Link href="/dashboard/admin/payments" className="inline-flex items-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow hover:shadow-md">
              الانتقال لصفحة المدفوعات
            </Link>
          </div>
        </div>

        {/* الصف الأول: الإحصائيات الرئيسية */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="p-4 bg-white/30 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg">
            <p className="text-sm text-gray-500">إجمالي الفواتير</p>
            <p className="text-3xl font-bold text-gray-900">{stats.count}</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="p-4 bg-white/30 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg">
            <p className="text-sm text-gray-500">إجمالي المبالغ</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalAmount)}</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="p-4 bg-white/30 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg">
            <p className="text-sm text-gray-500">متوسط الفاتورة</p>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.averageAmount)}</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="p-4 bg-white/30 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg">
            <p className="text-sm text-gray-500">عملاء فريدون</p>
            <p className="text-3xl font-bold text-purple-600">{stats.uniqueClients}</p>
          </motion.div>
        </div>

        {/* الصف الثاني: تفصيل الحالات */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4 bg-green-50 border border-green-200">
            <p className="text-sm text-green-700 font-semibold">✅ مدفوع</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
            <p className="text-xs text-green-500 mt-1">{stats.paidCount} فاتورة</p>
          </Card>
          <Card className="p-4 bg-yellow-50 border border-yellow-200">
            <p className="text-sm text-yellow-700 font-semibold">⏳ قيد المراجعة</p>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
            <p className="text-xs text-yellow-500 mt-1">{stats.pendingCount} فاتورة</p>
          </Card>
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-semibold">❌ ملغي</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.cancelledAmount)}</p>
            <p className="text-xs text-red-500 mt-1">{stats.cancelledCount} فاتورة</p>
          </Card>
        </div>

        {/* الصف الثالث: تفصيل المصادر */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4 bg-purple-50 border border-purple-300">
            <p className="text-sm text-purple-700 font-semibold">💳 جيديا</p>
            <p className="text-xl font-bold text-purple-600">{stats.geideaCount} معاملة</p>
            <p className="text-sm text-purple-500 mt-1">{formatCurrency(stats.geideaAmount)}</p>
          </Card>
          <Card className="p-4 bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-700 font-semibold">👛 المحفظة</p>
            <p className="text-xl font-bold text-amber-600">{stats.walletCount} معاملة</p>
            <p className="text-sm text-amber-500 mt-1">{formatCurrency(stats.walletAmount)}</p>
          </Card>
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700 font-semibold">📲 إنستا باي</p>
            <p className="text-xl font-bold text-blue-600">{stats.instapayCount} معاملة</p>
            <p className="text-sm text-blue-500 mt-1">{formatCurrency(stats.instapayAmount)}</p>
          </Card>
        </div>

        <Card className="p-5 space-y-4 border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 text-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الفاتورة، العميل، البريد، الهاتف أو المرجع"
              className="flex-1 min-w-[220px] border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">كل الحالات</option>
              <option value="paid">مدفوع</option>
              <option value="pending">قيد المراجعة</option>
              <option value="overdue">متأخر</option>
              <option value="cancelled">ملغي</option>
            </select>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">كل الطرق</option>
              {methodOptions.map((method) => (
                <option key={method} value={method}>
                  {METHOD_DETAILS[method]?.label || method}
                </option>
              ))}
            </select>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">كل المصادر</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              من:
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="border rounded px-2 py-1 focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center gap-2">
              إلى:
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="border rounded px-2 py-1 focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <button
              onClick={() =>
                setFilters({
                  status: 'all',
                  method: 'all',
                  source: 'all',
                  dateFrom: '',
                  dateTo: '',
                })
              }
              className="text-xs text-purple-600 hover:underline"
            >
              مسح الفلاتر
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="sticky top-0 z-10">
                  <th className="px-3 py-3 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[200px] border-r border-gray-200">إجراءات</th>
                  <th className="px-4 py-3 font-semibold">الفاتورة</th>
                  <th className="px-4 py-3 font-semibold">العميل</th>
                  <th className="px-4 py-3 font-semibold">الخدمة / الباقة</th>
                  <th className="px-4 py-3 font-semibold">المبلغ</th>
                  <th className="px-4 py-3 font-semibold">طريقة الدفع</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">تاريخ الانتهاء</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      لا توجد بيانات مطابقة حالياً
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((record) => (
                    <tr key={`${record.source}-${record.id}`} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-3 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-sm">
                        <div className="flex flex-row gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-7 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                            onClick={() => setSelected(record)}
                            title="عرض التفاصيل"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-7 border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
                            onClick={() => handlePreviewInvoice(record)}
                            title="معاينة الفاتورة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-7 border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400"
                            onClick={() => handlePrintInvoice(record)}
                            title="طباعة PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-7 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                            onClick={() => handleSendEmail(record)}
                            title="إرسال بريد إلكتروني"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-7 border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400"
                            onClick={() => handleSendWhatsApp(record)}
                            title="إرسال واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-7 border-teal-300 text-teal-600 hover:bg-teal-50 hover:border-teal-400 disabled:opacity-50"
                            disabled={sendingWhatsAppId === record.id}
                            onClick={() => handleSendWhatsAppApi(record)}
                            title="إرسال واتساب API"
                          >
                            {sendingWhatsAppId === record.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          {record.receiptUrl && (
                            <a
                              href={record.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded border border-cyan-300 bg-cyan-50 px-2 py-1 h-7 text-xs text-cyan-700 hover:bg-cyan-100 hover:border-cyan-400 transition"
                              title="عرض الإيصال"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {record.invoiceUrl && (
                            <a
                              href={record.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded border border-indigo-300 bg-indigo-50 px-2 py-1 h-7 text-xs text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition"
                              title="عرض الفاتورة"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{record.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">المصدر: {record.source}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{record.customerName}</div>
                        <div className="text-xs text-gray-500">{record.customerEmail || record.customerPhone || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium">{record.planName || '-'}</div>
                        {record.packageDuration && record.packageDuration !== 'غير محدد' && (
                          <div className="text-xs font-semibold text-purple-600 mt-1">
                            📅 المدة: {record.packageDuration}
                          </div>
                        )}
                        {record.notes && (
                          <div className="text-xs text-gray-500 truncate max-w-[180px] mt-1">
                            {record.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatCurrency(record.amount, record.currency)}
                      </td>
                      <td className="px-4 py-3">{paymentDisplay(record)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(record.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {record.expiryDate ? (
                          <div>
                            <div className="font-medium">{formatDate(record.expiryDate)}</div>
                            {record.expiryDate < new Date() && (
                              <div className="text-xs text-red-600">منتهي</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusDisplay(record.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Mobile Card View */}
            <div className="hidden grid gap-4 md:hidden">
              {filtered.length === 0 ? (
                <p className="text-center text-gray-500">لا توجد بيانات مطابقة حالياً</p>
              ) : (
                filtered.map((record) => (
                  <Card key={`${record.source}-${record.id}`} className="p-4 bg-white/30 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">{record.invoiceNumber}</div>
                      <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-7 border-blue-300 text-blue-600" onClick={() => setSelected(record)}><Info className="w-3.5 h-3.5" /></Button>
                    </div>
                    <div className="text-sm text-gray-500 mb-1">المصدر: {record.source}</div>
                    <div className="text-sm text-gray-800">{record.customerName}</div>
                    <div className="text-xs text-gray-500">{record.customerEmail || record.customerPhone || '-'}</div>
                    <div className="mt-2 text-gray-900 font-bold">{formatCurrency(record.amount, record.currency)}</div>
                    <div className="text-xs text-gray-600">{formatDate(record.createdAt)}</div>
                    <div className="mt-1">{statusDisplay(record.status)}</div>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {filtered.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-lg">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">عرض:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-700">
                    عرض {startIndex + 1} - {Math.min(endIndex, filtered.length)} من {filtered.length}
                  </span>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    الأولى
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-md ${currentPage === pageNum
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    الأخيرة
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div >


      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center px-4 py-8 z-50 overflow-y-auto"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-3xl w-full p-8 border border-white/20 my-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">{selected.invoiceNumber}</h2>
                    <div className="mt-1">{statusDisplay(selected.status)}</div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">المصدر: {selected.source}</p>
                </div>
                <button
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                  onClick={() => setSelected(null)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Client Info Card */}
                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Wallet2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">بيانات العميل</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500 text-sm">الاسم</span>
                      <span className="font-semibold text-gray-900 text-left">{selected.customerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500 text-sm">البريد الإلكتروني</span>
                      <span className="font-medium text-gray-900 text-left break-all">{selected.customerEmail || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">رقم الهاتف</span>
                      <span className="font-medium text-gray-900 text-left" dir="ltr">{selected.customerPhone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info Card */}
                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">تفاصيل الدفع</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500 text-sm">المبلغ</span>
                      <span className="font-bold text-emerald-600 text-lg">{formatCurrency(selected.amount, selected.currency)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500 text-sm">طريقة الدفع</span>
                      <span>{paymentDisplay(selected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">تاريخ الإنشاء</span>
                      <span className="font-medium text-gray-700">{formatDate(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Package Info Card */}
                {(selected.planName || selected.packageDuration) && (
                  <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-purple-900 text-lg">تفاصيل الباقة والاشتراك</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selected.planName && (
                        <div className="flex items-center gap-2">
                          <span className="text-purple-700 font-medium">الخدمة/الباقة:</span>
                          <span className="font-bold text-purple-900">{selected.planName}</span>
                        </div>
                      )}
                      {selected.packageDuration && (
                        <div className="flex items-center gap-2">
                          <span className="text-purple-700 font-medium">المدة:</span>
                          <span className="font-bold text-purple-900">{selected.packageDuration}</span>
                        </div>
                      )}
                      {selected.expiryDate && (
                        <div className="flex items-center gap-2 md:col-span-2">
                          <span className="text-purple-700 font-medium">تاريخ الانتهاء:</span>
                          <span className={`font-bold ${selected.expiryDate < new Date() ? 'text-red-600' : 'text-purple-900'
                            }`}>
                            {formatDate(selected.expiryDate)}
                            {selected.expiryDate < new Date() && ' (منتهي)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical Info */}
                <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                  <button
                    onClick={(e) => {
                      const details = e.currentTarget.nextElementSibling;
                      details?.classList.toggle('hidden');
                    }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors w-full text-right"
                  >
                    <Info className="w-4 h-4" />
                    عرض التفاصيل التقنية والمرجعيات
                  </button>
                  <div className="hidden grid md:grid-cols-2 gap-4 text-xs text-gray-600 bg-gray-50 p-4 rounded-lg mt-2 transition-all">
                    <p><span className="font-semibold block text-gray-800">Order ID:</span> {selected.reference.orderId || '—'}</p>
                    <p><span className="font-semibold block text-gray-800">Merchant Ref:</span> {selected.reference.merchantReferenceId || '—'}</p>
                    <p><span className="font-semibold block text-gray-800">Transaction ID:</span> {selected.reference.transactionId || '—'}</p>
                    <p><span className="font-semibold block text-gray-800">Payment ID:</span> {selected.reference.paymentId || '—'}</p>
                    {selected.notes && (
                      <div className="md:col-span-2 mt-2 pt-2 border-t border-gray-200">
                        <span className="font-semibold block text-gray-800">ملاحظات داخلية:</span>
                        <p className="mt-1 whitespace-pre-wrap">{selected.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100 justify-end">
                {/* أزرار الإدارة الجديدة */}
                {selected.status === 'pending' && (
                  <Button
                    onClick={async () => {
                      try {
                        await updatePaymentStatus(selected.raw, 'completed', true);
                        setSelected({ ...selected, status: 'paid' });
                        toast.success('تم التفعيل بنجاح');
                      } catch (err) { console.error(err); }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    موافقة وتفعيل
                  </Button>
                )}

                {selected.status === 'paid' && (
                  <Button
                    onClick={async () => {
                      if (confirm('هل أنت متأكد من رغبتك في إيقاف هذا الاشتراك؟')) {
                        try {
                          const userId = selected.customerId;
                          if (!userId) {
                            toast.error('لم يتم العثور على معرف المستخدم');
                            return;
                          }
                          await deactivateSubscription(userId);
                          setSelected({ ...selected, status: 'cancelled' });
                        } catch (err) { console.error(err); }
                      }
                    }}
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    إيقاف الاشتراك
                  </Button>
                )}

                <div className="w-px h-8 bg-gray-200 mx-2"></div>

                <Button
                  onClick={() => handlePreviewInvoice(selected)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <FileText className="w-4 h-4 ml-2" />
                  معاينة الفاتورة
                </Button>
                <Button
                  onClick={() => handlePrintInvoice(selected)}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Printer className="w-4 h-4 ml-2" />
                  طباعة
                </Button>

                <div className="w-px h-8 bg-gray-300 mx-1 hidden sm:block"></div>

                <Button variant="outline" onClick={() => handleSendEmail(selected)} className="hover:bg-gray-50">
                  <Mail className="w-4 h-4 ml-2 text-gray-600" />
                  إرسال بريد
                </Button>
                <Button variant="outline" onClick={() => handleSendWhatsApp(selected)} className="hover:bg-gray-50">
                  <MessageCircle className="w-4 h-4 ml-2 text-green-600" />
                  واتساب
                </Button>

                {selected.receiptUrl && (
                  <a
                    href={selected.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    <Receipt className="w-4 h-4" />
                    الإيصال
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMessagePreview && selectedRecordForWhatsApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50"
            dir="rtl"
            onClick={() => {
              if (!sendingWhatsAppId) {
                setShowMessagePreview(false);
                setSelectedRecordForWhatsApp(null);
                setPreviewMessage('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#f0f2f5] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col h-[600px] border border-gray-200"
            >
              {/* Header */}
              <div className="bg-[#008069] text-white p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">معاينة الرسالة</h2>
                    <p className="text-xs text-white/80">
                      إلى: {selectedRecordForWhatsApp.customerName || 'غير محدد'} ({formatPhoneForApi(selectedRecordForWhatsApp.customerPhone) || '—'})
                    </p>
                  </div>
                </div>
                <button
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                  onClick={() => {
                    if (!sendingWhatsAppId) {
                      setShowMessagePreview(false);
                      setSelectedRecordForWhatsApp(null);
                      setPreviewMessage('');
                    }
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Area (Simulation) */}
              <div className="flex-1 p-4 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                <div className="flex flex-col gap-2">
                  <div className="self-center bg-[#e1f3fb] text-gray-800 text-xs px-3 py-1 rounded-lg shadow-sm mb-4">
                    {formatDate(new Date())}
                  </div>

                  <div className="self-end bg-[#d9fdd3] text-gray-900 status-paid p-3 rounded-lg rounded-tl-none shadow-sm max-w-[90%] text-sm whitespace-pre-wrap relative">
                    {previewMessage}
                    <span className="text-[10px] text-gray-500 block text-left mt-1 flex items-center justify-end gap-1">
                      <span>12:00 م</span>
                      <span className="text-blue-500">✓✓</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Editor & Actions */}
              <div className="bg-white p-3 border-t border-gray-200">
                <label className="block text-xs font-semibold text-gray-500 mb-2 px-1">
                  تعديل نص الرسالة:
                </label>
                <textarea
                  value={previewMessage}
                  onChange={(e) => setPreviewMessage(e.target.value)}
                  className="w-full h-32 p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-[#00a884] resize-none text-sm"
                  placeholder="اكتب رسالتك هنا..."
                />

                <div className="flex items-center justify-between mt-3 gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const originalMessage = buildWhatsAppMessage(selectedRecordForWhatsApp);
                        setPreviewMessage(originalMessage);
                        toast.success('تم استعادة الرسالة الأصلية');
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      استعادة الأصل
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!sendingWhatsAppId) {
                          setShowMessagePreview(false);
                          setSelectedRecordForWhatsApp(null);
                          setPreviewMessage('');
                        }
                      }}
                      disabled={!!sendingWhatsAppId}
                      className="text-gray-600 hover:bg-gray-100"
                    >
                      إلغاء
                    </Button>
                    <Button
                      onClick={sendWhatsAppApiConfirmed}
                      disabled={!previewMessage.trim() || sendingWhatsAppId === selectedRecordForWhatsApp.id}
                      className="bg-[#00a884] hover:bg-[#008f6f] text-white px-6 shadow-md"
                    >
                      {sendingWhatsAppId === selectedRecordForWhatsApp.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          جاري الإرسال
                        </>
                      ) : (
                        <>
                          إرسال
                          <Send className="w-4 h-4 mr-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoicePreview && previewInvoiceRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center px-4 py-8 z-50"
            dir="rtl"
            onClick={() => {
              setShowInvoicePreview(false);
              setPreviewInvoiceRecord(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border border-white/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">معاينة الفاتورة</h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      رقم الفاتورة:
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded ml-1">{previewInvoiceRecord.invoiceNumber}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePrintFromPreview}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة الآن
                  </Button>
                  <button
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    onClick={() => {
                      setShowInvoicePreview(false);
                      setPreviewInvoiceRecord(null);
                    }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Invoice Content */}
              <div className="flex-1 overflow-hidden bg-gray-100/50 p-4 sm:p-8 flex items-center justify-center">
                <div className="w-full h-full bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    srcDoc={generateInvoiceHTML(previewInvoiceRecord)}
                    className="w-full h-full border-0"
                    title={`معاينة فاتورة ${previewInvoiceRecord.invoiceNumber}`}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white text-sm">
                <div className="flex gap-4 text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">المصدر:</span> {previewInvoiceRecord.source}
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    <span className="font-medium">التاريخ:</span> {formatDate(previewInvoiceRecord.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setShowInvoicePreview(false);
                    setPreviewInvoiceRecord(null);
                  }}>
                    إغلاق
                  </Button>
                  <Button
                    onClick={handlePrintFromPreview}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInvoicePreview(false);
                      setSelected(previewInvoiceRecord);
                      setPreviewInvoiceRecord(null);
                    }}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    عرض التفاصيل
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}