'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
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
  FileDown,
  X,
} from 'lucide-react';

import { db } from '@/lib/firebase/config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
    notes: data?.notes || data?.description || data?.memo || '',
    receiptUrl:
      data?.receiptUrl ||
      data?.receiptImage ||
      data?.proofUrl ||
      data?.attachment ||
      null,
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
    raw: data,
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

const buildShareMessage = (record: InvoiceRecord) => {
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
  
  lines.push(
    `الحالة الحالية: ${statusLabel}`,
    'إذا احتجت أي مساعدة أو استفسار فنحن جاهزون فوراً لدعمك ومواصلة العمل على نجاحاتنا المشتركة 💪.'
  );
  
  return lines.join('\n');
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
      aggregated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setRecords(aggregated);
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

  const stats = useMemo(() => {
    const totalAmount = records.reduce((sum, rec) => sum + rec.amount, 0);
    const paidAmount = records
      .filter((rec) => rec.status === 'paid')
      .reduce((sum, rec) => sum + rec.amount, 0);
    const pendingAmount = records
      .filter((rec) => rec.status === 'pending')
      .reduce((sum, rec) => sum + rec.amount, 0);
    const uniqueClients = new Set(
      records.map((rec) => rec.customerEmail || rec.customerPhone || rec.customerName),
    ).size;

    return {
      count: records.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      uniqueClients,
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

  const handleSendEmail = (record: InvoiceRecord) => {
    if (!record.customerEmail) {
      toast.error('لا يوجد بريد إلكتروني محدث لهذا العميل');
      return;
    }
    const subject = `فاتورة ${record.invoiceNumber} - منصة الحلم`;
    const bodyLines = [
      buildShareMessage(record),
      '',
      `رابط الفاتورة: ${record.invoiceUrl || 'غير متوفر حالياً'}`,
      `رابط الإيصال: ${record.receiptUrl || 'غير متوفر'}`,
      '',
      'مع خالص التقدير،',
      'فريق منصة الحلم 🤝',
    ];
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
      buildShareMessage(record),
      '',
      `رابط الفاتورة: ${record.invoiceUrl || 'غير متوفر حالياً'}`,
      record.receiptUrl ? `رابط الإيصال: ${record.receiptUrl}` : '',
    ].filter(Boolean);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(shareLines.join('\n'))}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success('تم فتح WhatsApp مع الرسالة المحددة');
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
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              تحديث البيانات
            </Button>
            <Link href="/dashboard/admin/payments" className="inline-flex items-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow hover:shadow-md">
              الانتقال لصفحة المدفوعات
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 bg-white/80 shadow-sm border border-slate-200">
            <p className="text-sm text-gray-500">إجمالي الفواتير</p>
            <p className="text-3xl font-bold text-gray-900">{stats.count}</p>
          </Card>
          <Card className="p-4 bg-white/80 shadow-sm border border-slate-200">
            <p className="text-sm text-gray-500">إجمالي المبالغ</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalAmount)}</p>
          </Card>
          <Card className="p-4 bg-white/80 shadow-sm border border-slate-200">
            <p className="text-sm text-gray-500">المبالغ المدفوعة</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.paidAmount)}</p>
          </Card>
          <Card className="p-4 bg-white/80 shadow-sm border border-slate-200">
            <p className="text-sm text-gray-500">عملاء فريدون</p>
            <p className="text-3xl font-bold text-purple-600">{stats.uniqueClients}</p>
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
                <tr>
                  <th className="px-4 py-3 font-semibold">الفاتورة</th>
                  <th className="px-4 py-3 font-semibold">العميل</th>
                  <th className="px-4 py-3 font-semibold">الخدمة / الباقة</th>
                  <th className="px-4 py-3 font-semibold">المبلغ</th>
                  <th className="px-4 py-3 font-semibold">طريقة الدفع</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">تاريخ الانتهاء</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      لا توجد بيانات مطابقة حالياً
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => (
                    <tr key={`${record.source}-${record.id}`} className="hover:bg-gray-50 transition">
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
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => setSelected(record)}
                          >
                            التفاصيل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => handlePrintInvoice(record)}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => handleSendEmail(record)}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            بريد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => handleSendWhatsApp(record)}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            واتساب
                          </Button>
                          {record.receiptUrl && (
                            <a
                              href={record.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              إيصال
                            </a>
                          )}
                          {record.invoiceUrl && (
                            <a
                              href={record.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-purple-600 hover:bg-purple-50"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              عرض الفاتورة
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 relative">
            <button
              className="absolute left-4 top-4 text-gray-500 hover:text-gray-700"
              onClick={() => setSelected(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm text-gray-500">تفاصيل الفاتورة</p>
              <h2 className="text-2xl font-bold text-gray-900">{selected.invoiceNumber}</h2>
              <p className="text-sm text-gray-500">المصدر: {selected.source}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800">معلومات العميل</h3>
                <p>الاسم: {selected.customerName}</p>
                <p>البريد: {selected.customerEmail || 'غير متوفر'}</p>
                <p>الهاتف: {selected.customerPhone || 'غير متوفر'}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800">تفاصيل الدفع</h3>
                <p>المبلغ: {formatCurrency(selected.amount, selected.currency)}</p>
                <p>طريقة الدفع: {METHOD_DETAILS[selected.paymentMethod]?.label || selected.paymentMethod}</p>
                {selected.planName && (
                  <p>
                    <span className="font-semibold">الخدمة / الباقة:</span> {selected.planName}
                  </p>
                )}
                {selected.packageDuration && selected.packageDuration !== 'غير محدد' && (
                  <p className="text-purple-600 font-semibold">
                    📅 <span className="font-semibold">مدة الاشتراك:</span> {selected.packageDuration}
                  </p>
                )}
                <p>الحالة: {STATUS_LABELS[selected.status]?.label || selected.status}</p>
                <p>تاريخ الإنشاء: {formatDate(selected.createdAt)}</p>
                {selected.paidAt && <p>تاريخ التحصيل: {formatDate(selected.paidAt)}</p>}
                {selected.expiryDate && (
                  <p className={selected.expiryDate < new Date() ? 'text-red-600 font-semibold' : ''}>
                    تاريخ الانتهاء: {formatDate(selected.expiryDate)}
                    {selected.expiryDate < new Date() && ' (منتهي)'}
                  </p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-gray-800">المرجعيات</h3>
                <p>Order ID: {selected.reference.orderId || '—'}</p>
                <p>Merchant Reference: {selected.reference.merchantReferenceId || '—'}</p>
                <p>Transaction ID: {selected.reference.transactionId || '—'}</p>
                <p>Payment ID: {selected.reference.paymentId || '—'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">ملاحظات داخلية</h3>
                <p className="text-gray-700 whitespace-pre-wrap min-h-[80px] bg-gray-50 rounded-lg p-3">
                  {selected.notes || 'لا توجد ملاحظات'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handlePrintInvoice(selected)}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 text-white px-4 py-2 text-sm font-semibold"
              >
                <Printer className="w-4 h-4" />
                طباعة PDF
              </Button>
              <Button
                variant="outline"
                className="inline-flex items-center gap-2 text-sm font-semibold"
                onClick={() => handleSendEmail(selected)}
              >
                <Mail className="w-4 h-4" />
                إرسال بريد
              </Button>
              <Button
                variant="outline"
                className="inline-flex items-center gap-2 text-sm font-semibold"
                onClick={() => handleSendWhatsApp(selected)}
              >
                <MessageCircle className="w-4 h-4" />
                إرسال واتساب
              </Button>
              <Link
                href="/dashboard/admin/payments"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
              >
                مراجعة في صفحة المدفوعات
              </Link>
              {selected.receiptUrl && (
                <a
                  href={selected.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  <Receipt className="w-4 h-4" />
                  فتح الإيصال
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}