'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, orderBy, query, where, limit, updateDoc, doc, setDoc } from 'firebase/firestore';
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
  Globe,
  Calendar,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  Users,
  Smartphone,
  Zap,
  Landmark
} from 'lucide-react';

import { db } from '@/lib/firebase/config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PricingService } from '@/lib/pricing/pricing-service';
import { SubscriptionPlan } from '@/types/pricing';
import { toast } from 'sonner';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';
import { ChatAmanService } from '@/lib/services/chataman-service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

// --- Types & Interfaces ---

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
  customerImage?: string;
  planName?: string;
  packageDuration?: string;
  country?: string;
  customerId?: string;
  notes?: string;
  receiptUrl?: string | null;
  invoiceUrl?: string | null;
  packageType?: string;
  reference: {
    orderId?: string | null;
    merchantReferenceId?: string | null;
    paymentId?: string | null;
    transactionId?: string | null;
  };
  raw: any;
  userData?: any;
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

const METHOD_DETAILS: Record<string, { label: string; icon: any; badgeClass: string }> = {
  geidea: { label: 'جيديا (بطاقة)', icon: CreditCard, badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  wallet: { label: 'محفظة إلكترونية', icon: Wallet2, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  instapay: { label: 'إنستا باي', icon: Banknote, badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  cash: { label: 'نقدي', icon: Banknote, badgeClass: 'bg-gray-100 text-gray-800 border-gray-200' },
  transfer: { label: 'تحويل بنكي', icon: Banknote, badgeClass: 'bg-green-100 text-green-800 border-green-200' },
  card: { label: 'بطاقة بنكية', icon: CreditCard, badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  vodafone_cash: { label: 'فودافون كاش', icon: Smartphone, badgeClass: 'bg-red-100 text-red-800 border-red-200' },
  etisalat_cash: { label: 'اتصالات كاش', icon: Smartphone, badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  fawran: { label: 'فوراً (قطر)', icon: Zap, badgeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  stc_pay: { label: 'STC Pay', icon: Smartphone, badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  bank_transfer: { label: 'تحويل بنكي', icon: Landmark, badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: 'تم الدفع', color: 'bg-green-100 text-green-800 border-green-200' },
  pending: { label: 'بانتظار الدفع', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pending_review: { label: 'قيد مراجعة الإيصال', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700 border-red-200' },
  overdue: { label: 'متأخر', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

// --- Helpers ---

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

const inferCountry = (data: any, currency: string): string => {
  if (data?.country) return data.country;
  if (data?.countryCode) return data.countryCode;

  const curr = (currency || '').toUpperCase();
  if (curr === 'EGP') return 'EG';
  if (curr === 'QAR') return 'QA';
  if (curr === 'SAR') return 'SA';
  if (curr === 'AED') return 'AE';
  if (curr === 'KWD') return 'KW';
  if (curr === 'USD') return 'GLOBAL';

  return 'GLOBAL';
};

const getFlag = (country?: string) => {
  if (country === 'EG') return '🇪🇬';
  if (country === 'QA') return '🇶🇦';
  if (country === 'SA') return '🇸🇦';
  if (country === 'KW') return '🇰🇼';
  if (country === 'AE') return '🇦🇪';
  if (country === 'IQ') return '🇮🇶';
  if (!country || country === 'GLOBAL') return '🌍';
  return country;
};

const formatCurrency = (amount: number, currency: string = 'EGP') =>
  Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (value?: Date | null) => {
  if (!value) return '-';
  return value.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// --- Data Normalization ---

const normalizeRecord = (source: string, id: string, data: any): InvoiceRecord => {
  const createdAt = toDate(data?.created_at || data?.createdAt || data?.timestamp || data?.date) || new Date();
  const paidAt = toDate(data?.paid_at || data?.paidAt || data?.paymentDate || data?.completedAt);

  const amount = Number(data?.amount ?? data?.total ?? data?.total_amount ?? data?.value ?? data?.price ?? 0) || 0;
  const currency = data?.currency || data?.currencyCode || 'EGP';

  return {
    id,
    source,
    invoiceNumber: data?.invoice_number || data?.invoiceNumber || data?.orderId || `INV-${id.slice(0, 6)}`,
    paymentMethod: (data?.paymentMethod || data?.method || source).toLowerCase(),
    amount,
    currency,
    status: normalizeStatus(data?.status || data?.paymentStatus || data?.state),
    createdAt,
    paidAt,
    country: inferCountry(data, currency),
    customerName: data?.customerName || data?.full_name || data?.name || data?.user_name || data?.userName || data?.playerName || data?.player_name || data?.clientName || data?.billing_details?.name || 'غير محدد',
    customerImage: data?.customerImage || data?.photoURL || data?.avatar || data?.userImage || '',
    customerEmail: data?.customerEmail || data?.email || data?.user_email || data?.userEmail || '',
    customerPhone: data?.customerPhone || data?.phone || data?.mobile || data?.phoneNumber || '',
    planName: data?.planName || data?.plan_name || data?.packageName || data?.package_name || data?.package || data?.subscription || data?.selectedPackage || '',
    packageDuration: data?.packageDuration || data?.package_duration || '',
    customerId: data?.userId || data?.user_id || data?.playerId || data?.player_id || data?.customerId || data?.customer_id || '',
    reference: {
      orderId: data?.orderId || null,
      transactionId: data?.transactionId || data?.sessionId || null,
    },
    receiptUrl: data?.receiptUrl || data?.receipt_url || data?.receiptImage || data?.image || null,
    raw: { ...data, collection: source, id },
  };
};


// --- Main Page Component ---

export default function AdminInvoicesListPage() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    country: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const [activeTab, setActiveTab] = useState('all');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<InvoiceRecord | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Helper to fetch missing user details
  const enrichInvoices = async (initialRecords: InvoiceRecord[]) => {
    const missingNameRecords = initialRecords.filter(r =>
      (r.customerName === 'غير محدد' || !r.customerName) &&
      (r.customerEmail || r.customerPhone)
    );

    if (missingNameRecords.length === 0) return initialRecords;

    console.log(`🔍 [Invoices] Attempting to find names for ${missingNameRecords.length} records...`);

    // Collect Keys
    const emails = [...new Set(missingNameRecords.map(r => r.customerEmail?.toLowerCase().trim()).filter(Boolean))];
    const phones = [...new Set(missingNameRecords.map(r => r.customerPhone?.replace(/\D/g, '')).filter(Boolean))];

    console.log('🔍 [Invoices] Searching Keys:', { emails, phones });

    const userMap = new Map<string, any>();

    // Fetch helper
    const fetchUser = async (field: string, value: string) => {
      try {
        // Basic Query
        let q = query(collection(db, 'users'), where(field, '==', value), limit(1));
        let snap = await getDocs(q);
        if (!snap.empty) {
          console.log(`✅ Found user by ${field}: ${value} -> ${snap.docs[0].id}`);
          return snap.docs[0].data();
        }

        // Smart Phone Retry: If phone starts with 20, try 0. If 0, try +20.
        if (field === 'phone') {
          let altValue = '';
          if (value.startsWith('20')) altValue = '0' + value.substring(2);
          else if (value.startsWith('0')) altValue = '2' + value; // simplified

          if (altValue) {
            q = query(collection(db, 'users'), where(field, '==', altValue), limit(1));
            snap = await getDocs(q);
            if (!snap.empty) {
              console.log(`✅ Found user by alt phone: ${altValue}`);
              return snap.docs[0].data();
            }
          }
        }

      } catch (e) { console.error(`Error fetching user ${field}:${value}`, e); }
      return null;
    };

    // Execution
    // 1. Emails
    for (const email of emails) {
      if (!email) continue;
      const user = await fetchUser('email', email);
      if (user) userMap.set(email, user);
    }

    // 2. Phones
    for (const phone of phones) {
      if (!phone) continue;
      // Search by pure digits first
      const user = await fetchUser('phone', phone); // Assuming DB stores digits
      if (user) userMap.set(phone, user);

      // Also try with + if not found? (Depends on DB)
    }

    return initialRecords.map(record => {
      if (record.customerName && record.customerName !== 'غير محدد') return record;

      // Lookup
      const cleanEmail = record.customerEmail?.toLowerCase().trim();
      const cleanPhone = record.customerPhone?.replace(/\D/g, '');

      const user = userMap.get(cleanEmail) || userMap.get(cleanPhone);

      if (user) {
        const enrichedName = user.playerName || user.full_name || user.displayName || user.name || user.fullName || (user.firstName ? `${user.firstName} ${user.lastName}` : '') || 'مستخدم مسجل';
        console.log(`✨ Enriched ${record.id} with name: ${enrichedName}`);

        return {
          ...record,
          customerName: enrichedName,
          customerImage: user.personalPhoto || user.photoURL || user.avatar || user.image || user.profilePicture || record.customerImage || '',
          planName: record.planName || user.selectedPackage || user.planName || '',
          customerPhone: record.customerPhone || user.phone || '',
          userData: user
        };
      }
      return record;
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const aggregated: InvoiceRecord[] = [];
      for (const cfg of COLLECTIONS) {
        try {
          const ref = collection(db, cfg.name);
          const snap = await getDocs(query(ref, orderBy(cfg.orderBy || 'createdAt', 'desc')));
          snap.forEach((docSnap) =>
            aggregated.push(normalizeRecord(cfg.name, docSnap.id, docSnap.data())),
          );
        } catch (error) {
          console.warn(`Failed to load ${cfg.name}`);
        }
      }

      // Fetch Plans
      const allPlans = await PricingService.getAllPlans();
      setPlans(allPlans);

      // Filter out test/admin emails if needed
      let cleanRecords = aggregated.filter(r => r.customerEmail !== 'contact@fakhracademy.com');
      cleanRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Enrich with User Data
      cleanRecords = await enrichInvoices(cleanRecords);

      // Map Plan Names Dynamically
      cleanRecords = cleanRecords.map(r => {
        const pkgType = r.raw?.packageType || r.raw?.package_type || r.raw?.package || r.raw?.selectedPackage;
        const bestMatch = PricingService.getBestMatchedPlan(Number(r.amount || 0), pkgType, allPlans);

        return {
          ...r,
          planName: r.planName || bestMatch.title,
          packageDuration: r.packageDuration || bestMatch.period,
          packageType: pkgType || bestMatch.plan?.id
        };
      });

      setRecords(cleanRecords);
    } finally {
      setLoading(false);
    }
  };

  const activateSubscription = async (record: InvoiceRecord) => {
    if (isActivating) return;
    setIsActivating(true);
    try {
      const userId = record.customerId || record.userData?.uid || record.userData?.id || record.raw?.userId || record.raw?.user_id;
      if (!userId || userId === 'unknown') {
        toast.error('لا يمكن تحديد هوية المستخدم للتفعيل');
        return;
      }

      const pkgType = record.raw?.packageType || record.raw?.package_type || record.packageType || '';
      const bestMatch = PricingService.getBestMatchedPlan(Number(record.amount || 0), pkgType, plans);

      const planName = bestMatch.title;
      const packageType = bestMatch.plan?.id || pkgType || 'subscription_3months';
      const durationStr = bestMatch.period;
      const monthsToAdd = bestMatch.months;

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + monthsToAdd);

      // Create subscription data
      const subData = {
        userId,
        status: 'active',
        plan_name: planName,
        package_name: planName,
        packageType,
        package_duration: durationStr,
        package_price: Number(record.amount || 0),
        activated_at: new Date(),
        expires_at: expiresAt,
        end_date: expiresAt,
        payment_id: record.id,
        amount: record.amount,
        currency: record.currency,
        updated_at: new Date()
      };

      await setDoc(doc(db, 'subscriptions', userId), subData, { merge: true });
      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
        packageType: packageType,
        selectedPackage: planName,
        updatedAt: new Date()
      });

      // Update the invoice status itself to 'paid'
      await updateDoc(doc(db, record.source || 'invoices', record.id), {
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      });

      // Update local state
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: 'paid', paidAt: new Date() } : r));

      toast.success('تم تفعيل الاشتراك بنجاح');
      setSelectedRecord(null); // Close panel
    } catch (error) {
      console.error('Activation error:', error);
      toast.error('فشل تفعيل الاشتراك');
    } finally {
      setIsActivating(false);
    }
  };

  const cancelInvoice = async (record: InvoiceRecord) => {
    if (isCancelling || !rejectionReason.trim()) return;

    setIsCancelling(true);
    try {
      // Use the dynamic source collection (bulkPayments, invoices, receipts, etc.)
      const sourceCollection = record.source || 'invoices';

      await updateDoc(doc(db, sourceCollection, record.id), {
        status: 'cancelled',
        updatedAt: new Date(),
        rejectionDate: new Date(),
        adminNotes: rejectionReason.trim(),
        notes: rejectionReason.trim(), // Use as display notes
        statusLabel: 'تم الرفض'
      });

      // Update local state status
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: 'cancelled', notes: rejectionReason.trim() } : r));
      toast.success('تم إلغاء الفاتورة وإرسال السبب للمستخدم');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setSelectedRecord(null); // Close panel
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error('فشل إلغاء الفاتورة');
    } finally {
      setIsCancelling(false);
    }
  };

  const sendWhatsAppReminder = async (record: InvoiceRecord) => {
    if (isSendingWhatsApp) return;

    // Resolve phone number priority: record field > raw data > user data
    const targetPhone = record.customerPhone ||
      record.raw?.phone || record.raw?.phoneNumber ||
      record.userData?.phone || record.userData?.personal_phone || record.userData?.whatsapp;

    if (!targetPhone || targetPhone.replace(/\D/g, '').length < 8) {
      toast.error('لم يتم العثور على رقم هاتف صحيح لهذا المشترك');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const result = await ChatAmanService.sendActivationReminder(
        targetPhone,
        record.customerName || 'كابتن',
        '꿈2026' // كود الخصم الافتراضي في القالب
      );

      if (result.success) {
        toast.success('تم إرسال تذكير التفعيل بنجاح');
      } else {
        toast.error(result.error || 'فشل إرسال التذكير');
      }
    } catch (error) {
      console.error('WhatsApp Error:', error);
      toast.error('حدث خطأ أثناء الاتصال بخدمة واتساب');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handlePrint = (record: InvoiceRecord) => {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <title>فاتورة ${record.invoiceNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 40px; background: #fff; color: #1e293b; }
      .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 20px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9; }
      .title { font-size: 32px; font-weight: 900; color: #1e3a8a; margin: 0; }
      .invoice-info { text-align: left; }
      .invoice-info p { margin: 4px 0; font-size: 14px; color: #64748b; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
      .section-title { font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 12px; border-right: 4px solid #3b82f6; padding-right: 12px; }
      .info-box { background: #f8fafc; padding: 20px; border-radius: 12px; }
      .info-item { margin-bottom: 8px; display: flex; justify-content: space-between; }
      .info-label { color: #64748b; font-size: 13px; }
      .info-value { font-weight: 700; color: #1e293b; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #1e3a8a; color: #fff; padding: 12px; text-align: right; font-size: 14px; }
      td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
      .total-row { background: #f8fafc; font-weight: 900; font-size: 18px; color: #1e3a8a; }
      .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
      @media print { .no-print { display: none; } body { padding: 0; } .invoice-container { border: none; } }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <div class="header">
        <div>
          <h1 class="title">منصة الحلم</h1>
          <p style="color: #64748b; margin-top: 4px; font-weight: 700;">EL7LM PLATFORM</p>
        </div>
        <div class="invoice-info">
          <p>رقم الفاتورة: <strong>${record.invoiceNumber}</strong></p>
          <p>التاريخ: <strong>${formatDate(record.createdAt)}</strong></p>
          <p>الحالة: <strong style="color: ${record.status === 'paid' ? '#10b981' : '#f59e0b'}">${STATUS_LABELS[record.status]?.label || record.status}</strong></p>
        </div>
      </div>

      <div class="grid">
        <div>
          <h2 class="section-title">بيانات العميل</h2>
          <div class="info-box">
            <div class="info-item"><span class="info-label">الاسم:</span> <span class="info-value">${record.customerName || '—'}</span></div>
            <div class="info-item"><span class="info-label">البريد:</span> <span class="info-value">${record.customerEmail || '—'}</span></div>
            <div class="info-item"><span class="info-label">الهاتف:</span> <span class="info-value">${record.customerPhone || '—'}</span></div>
          </div>
        </div>
        <div>
          <h2 class="section-title">تفاصيل الدفع</h2>
          <div class="info-box">
            <div class="info-item"><span class="info-label">طريقة الدفع:</span> <span class="info-value">${METHOD_DETAILS[record.paymentMethod]?.label || record.paymentMethod}</span></div>
            <div class="info-item"><span class="info-label">المصدر:</span> <span class="info-value">${record.source}</span></div>
            <div class="info-item"><span class="info-label">المعرف:</span> <span class="info-value" style="font-size: 10px;">${record.id}</span></div>
          </div>
        </div>
      </div>

      <h2 class="section-title">البنود والخدمات</h2>
      <table>
        <thead>
          <tr>
            <th>الوصف</th>
            <th>المدة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: 700;">${record.planName || 'الاشتراك الأساسي'}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">تفعيل كافة مزايا المنصة والوصول للكشافين</div>
            </td>
            <td>${record.packageDuration || '—'}</td>
            <td style="font-weight: 700;">${formatCurrency(record.amount, record.currency)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2" style="text-align: left; padding-left: 40px;">الإجمالي الكلي</td>
            <td>${formatCurrency(record.amount, record.currency)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>هذه الفاتورة صدرت إلكترونياً من منصة الحلم والاشتراك يخضع للشروط والأحكام.</p>
        <p>www.el7lm.com | info@el7lm.com</p>
      </div>
    </div>
    <div class="no-print" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);">
       <button onclick="window.print()" style="background: #1e3a8a; color: #fff; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-family: 'Cairo', sans-serif; font-weight: 700; box-shadow: 0 10px 15px -3px rgba(30, 58, 138, 0.3);">تأكيد الطباعة أو الحفظ</button>
    </div>
  </body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    } else {
      toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      // Search
      const term = search.toLowerCase();
      const searchMatch = !term ||
        record.invoiceNumber.toLowerCase().includes(term) ||
        (record.customerName || '').toLowerCase().includes(term) ||
        (record.customerPhone || '').includes(term);

      if (!searchMatch) return false;

      // Tabs (Country)
      if (activeTab !== 'all' && record.country !== activeTab) return false;

      // Filters
      if (filters.status !== 'all' && record.status !== filters.status) return false;
      if (filters.country !== 'all' && record.country !== filters.country) return false;

      if (filters.dateFrom && record.createdAt < new Date(filters.dateFrom)) return false;
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59);
        if (record.createdAt > to) return false;
      }

      return true;
    });
  }, [records, search, filters, activeTab]);

  const stats = useMemo(() => {
    return {
      total: filtered.reduce((sum, r) => sum + r.amount, 0), // Note: Mixing currencies is bad, but for overview ok
      count: filtered.length,
      paid: filtered.filter(r => r.status === 'paid').length,
      pending: filtered.filter(r => r.status === 'pending' || r.status === 'pending_review').length,
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-8" dir="rtl">

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
              <Banknote className="w-8 h-8" />
            </span>
            المدفوعات والفواتير
          </h1>
          <p className="mt-2 text-gray-500 font-medium">نظرة شاملة على جميع العمليات المالية والمبيعات</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={load} className="gap-2 bg-white hover:bg-gray-50 border-gray-200 shadow-sm text-gray-700">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button className="gap-2 bg-gray-900 hover:bg-black text-white shadow-xl shadow-gray-200">
            <FileDown className="w-4 h-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* 2. Country Tabs */}
      <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
        {[
          { id: 'all', label: 'الكل', icon: '🌍' },
          { id: 'EG', label: 'مصر', icon: '🇪🇬' },
          { id: 'QA', label: 'قطر', icon: '🇶🇦' },
          { id: 'SA', label: 'السعودية', icon: '🇸🇦' },
          { id: 'KW', label: 'الكويت', icon: '🇰🇼' },
          { id: 'IQ', label: 'العراق', icon: '🇮🇶' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
                relative flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all min-w-[160px] group
                ${activeTab === tab.id
                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                : 'border-white bg-white hover:border-gray-200 hover:bg-gray-50'
              }
             `}
          >
            <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{tab.icon}</span>
            <div className="flex flex-col items-start">
              <span className={`text-sm font-bold ${activeTab === tab.id ? 'text-blue-700' : 'text-gray-700'}`}>
                {tab.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {activeTab === 'all'
                  ? `${records.length} فاتورة`
                  : `${records.filter(r => r.country === tab.id).length} فاتورة`
                }
              </span>
            </div>
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute inset-0 border-2 border-blue-600 rounded-2xl" />
            )}
          </button>
        ))}
      </div>

      {/* 3. Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 font-medium text-sm mb-1">إجمالي الإيرادات</p>
            <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(stats.total, 'EGP')}</h3>
            <div className="mt-4 flex items-center gap-2 text-xs bg-white/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
              <TrendingUp className="w-3 h-3" />
              <span>+12% عن الشهر الماضي</span>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        </Card>

        <Card className="p-6 border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">العمليات الناجحة</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.paid}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(stats.paid / stats.count) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-left">معدل نجاح {(stats.paid / stats.count * 100).toFixed(0)}%</p>
        </Card>

        <Card className="p-6 border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">قيد المراجعة</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.pending}</h3>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Loader2 className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">العملاء النشطين</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {new Set(filtered.map(r => r.customerEmail)).size}
              </h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>


      {/* 4. Filters & Search Bar */}
      <Card className="p-4 border-none shadow-sm sticky top-4 z-20 bg-white/80 backdrop-blur-md">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة، اسم العميل، او رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as FilterState['status'] }))}
              className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="paid">✅ مدفوع</option>
              <option value="pending">⏳ قيد المراجعة</option>
              <option value="pending_review">⏳ قيد المراجعة</option>
              <option value="cancelled">❌ ملغي</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </Card>

      {/* 5. Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4 w-[15%]">تفاصيل الفاتورة</th>
                <th className="px-6 py-4 w-[20%]">العميل</th>
                <th className="px-6 py-4 w-[10%]">القيمة</th>
                <th className="px-6 py-4 w-[15%]">طريقة الدفع</th>
                <th className="px-6 py-4 w-[12%]">الحالة</th>
                <th className="px-6 py-4 w-[13%]">التاريخ</th>
                <th className="px-6 py-4 w-[15%] text-left">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 bg-gray-50/20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-lg font-medium text-gray-900">لا توجد نتائج</p>
                      <p className="text-sm">جرب تغيير الفلاتر أو البحث عن شيء آخر</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(record => (
                  <tr
                    key={`${record.source}-${record.id}`}
                    onClick={() => setSelectedRecord(record)}
                    className="group hover:bg-blue-50/30 transition-all duration-200 cursor-pointer"
                  >
                    {/* Invoice Details */}
                    <td className="px-6 py-4 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shadow-inner">
                          {record.currency === 'EGP' ? '🇪🇬' :
                            record.currency === 'QAR' ? '🇶🇦' :
                              record.currency === 'SAR' ? '🇸🇦' : '🌍'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 font-mono text-sm group-hover:text-blue-600 transition-colors">
                            #{record.invoiceNumber}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{record.source}</p>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden
                                              ${record.customerImage ? 'bg-white' :
                            ((record.customerName?.charCodeAt(0) || 0) % 3 === 0 ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                              (record.customerName?.charCodeAt(0) || 0) % 3 === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                'bg-gradient-to-br from-emerald-500 to-teal-600')}
                                          `}>
                          {record.customerImage ? (
                            <img src={record.customerImage} alt={record.customerName} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            record.customerName?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm truncate" title={record.customerName}>
                            {record.customerName}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5 tracking-tight truncate" title={record.customerPhone || record.customerEmail}>
                            {record.customerPhone || record.customerEmail || 'No Contact'}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Amount */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-base">
                          {formatCurrency(record.amount, record.currency)}
                        </span>
                        {record.planName && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded w-fit mt-1">
                            {record.planName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Method */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {record.paymentMethod.includes('wallet') && <Wallet2 className="w-4 h-4 text-amber-600" />}
                        {record.paymentMethod.includes('card') && <CreditCard className="w-4 h-4 text-purple-600" />}
                        {record.paymentMethod.includes('instapay') && <Banknote className="w-4 h-4 text-blue-600" />}
                        <span className="text-sm text-gray-700 capitalize">
                          {record.paymentMethod || 'Unknown'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {(() => {
                        const config = STATUS_LABELS[record.status] || STATUS_LABELS.pending;
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.color.replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'text-').replace('border-', 'border-opacity-20 border-')}`}>
                            <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
                            {config.label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-gray-500">
                        <span className="font-medium text-gray-900">{formatDate(record.createdAt)}</span>
                        <span>{record.createdAt?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <button
                          title="إرسال واتساب"
                          onClick={() => window.open(`https://wa.me/${record.customerPhone?.replace(/\D/g, '')}`, '_blank')}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-green-200 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          title="نسخ التفاصيل"
                          onClick={() => {
                            navigator.clipboard.writeText(`فاتورة #${record.invoiceNumber}\nمبلغ: ${record.amount}\nالعميل: ${record.customerName}`);
                            toast.success('تم النسخ');
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-all shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          title="عرض المزيد"
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Simplified) */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/30">
          <p>عرض {filtered.length} من {records.length} فاتورة</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border border-gray-200 rounded-md disabled:opacity-50" disabled>السابق</button>
            <button className="px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50">التالي</button>
          </div>
        </div>
      </div>

      {/* Side Details Panel */}
      <AnimatePresence>
        {selectedRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-white shadow-2xl border-r border-gray-100 overflow-y-auto"
              style={{ left: 0, right: 'auto' }}
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">تفاصيل الفاتورة</h2>
                  <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status & Amount */}
                <div className="p-4 bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-2 border border-gray-100">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {formatCurrency(selectedRecord.amount, selectedRecord.currency)}
                  </span>
                  {(() => {
                    const config = STATUS_LABELS[selectedRecord.status] || STATUS_LABELS.pending;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
                        {config.label}
                      </span>
                    );
                  })()}
                </div>

                {/* User Info Expanded */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">بيانات العميل الشاملة</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden shrink-0 border-2 border-white shadow-sm ring-2 ring-blue-100">
                      {selectedRecord.customerImage ? (
                        <img src={selectedRecord.customerImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-gray-500 font-bold">
                          {selectedRecord.customerName?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">{selectedRecord.customerName} {selectedRecord.userData?.isVerified && '✅'}</p>
                      <p className="text-sm text-gray-500 font-mono" dir="ltr">{selectedRecord.customerPhone}</p>
                      <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1">
                        {selectedRecord.userData?.role || 'User'}
                      </p>
                    </div>
                  </div>

                  {/* Detailed User Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">الدولة</p>
                      <p className="font-medium flex items-center gap-2">
                        <span className="text-lg">{getFlag(selectedRecord.userData?.country || selectedRecord.country)}</span>
                        <span>{selectedRecord.userData?.country || selectedRecord.country || '-'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">البريد الإلكتروني</p>
                      <p className="font-medium truncate text-xs" title={selectedRecord.customerEmail}>{selectedRecord.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">الباقة الحالية</p>
                      <p className="font-medium text-purple-700">{selectedRecord.planName || selectedRecord.userData?.selectedPackage || 'غير محدد'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">المعرف (ID)</p>
                      <p className="font-mono text-xs truncate" title={selectedRecord.userData?.dId || selectedRecord.userData?.uid || selectedRecord.customerId}>
                        {selectedRecord.userData?.dId || selectedRecord.userData?.uid?.slice(0, 8) || selectedRecord.customerId || '-'}
                      </p>
                    </div>
                    {selectedRecord.userData?.birthDate && (
                      <div>
                        <p className="text-xs text-gray-400">تاريخ الميلاد</p>
                        <p className="font-medium">{selectedRecord.userData.birthDate}</p>
                      </div>
                    )}
                    {selectedRecord.userData?.gender && (
                      <div>
                        <p className="text-xs text-gray-400">الجنس</p>
                        <p className="font-medium">{selectedRecord.userData.gender}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Data */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">تفاصيل المعاملة</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">رقم الفاتورة</p>
                      <p className="font-mono font-medium">{selectedRecord.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">المصدر</p>
                      <p className="font-medium">{selectedRecord.source}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">طريقة الدفع</p>
                      <p className="font-medium capitalize">{selectedRecord.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">التاريخ</p>
                      <p className="font-medium">{formatDate(selectedRecord.createdAt)}</p>
                    </div>
                  </div>

                  {selectedRecord.receiptUrl && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-blue-600 font-bold mb-1">إيصال الدفع المرفوع</p>

                      {/* Interactive Image Preview */}
                      <div
                        className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-blue-100 shadow-lg cursor-zoom-in group"
                        onClick={() => setPreviewReceiptUrl(selectedRecord.receiptUrl!)}
                      >
                        <img
                          src={selectedRecord.receiptUrl}
                          alt="Receipt Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-white border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm h-10"
                          onClick={() => setPreviewReceiptUrl(selectedRecord.receiptUrl!)}
                        >
                          <Eye className="w-4 h-4 ml-2" />
                          تكبير المعاينة
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl h-10 w-10 p-0"
                          onClick={() => window.open(selectedRecord.receiptUrl!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>



                {/* Footer Actions */}
                <div className="sticky bottom-0 pt-4 bg-white border-t mt-auto flex flex-col gap-3 pb-4">
                  <div className="flex gap-3">
                    <Button className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl" onClick={() => handlePrint(selectedRecord)}>
                      <Printer className="w-4 h-4" /> طباعة الاحترافية
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-green-200 text-green-700 hover:bg-green-50"
                      disabled={isSendingWhatsApp}
                      onClick={() => {
                        const targetPhone = selectedRecord.customerPhone ||
                          selectedRecord.raw?.phone || selectedRecord.raw?.phoneNumber ||
                          selectedRecord.userData?.phone || selectedRecord.userData?.personal_phone || selectedRecord.userData?.whatsapp;

                        if (!targetPhone || targetPhone.replace(/\D/g, '').length < 8) {
                          toast.error('عذراً، رقم الهاتف غير متوفر لهذا المستخدم');
                          return;
                        }

                        if (selectedRecord.status === 'pending') {
                          sendWhatsAppReminder(selectedRecord);
                        } else {
                          window.open(`https://wa.me/${targetPhone.replace(/\D/g, '')}`, '_blank');
                        }
                      }}
                    >
                      {isSendingWhatsApp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                      {selectedRecord.status === 'pending' ? 'إرسال تذكير' : 'واتساب'}
                    </Button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg h-12 rounded-xl"
                      disabled={isActivating || isCancelling}
                      onClick={() => activateSubscription(selectedRecord)}
                    >
                      {isActivating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {isActivating ? 'جاري التفعيل...' : 'تفعيل الاشتراك يدوياً'}
                    </Button>

                    {(selectedRecord.status === 'pending_review' || selectedRecord.status === 'pending') && (
                      <Button
                        variant="ghost"
                        className="w-full gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 h-11 rounded-xl border border-transparent hover:border-red-100 transition-all font-bold"
                        disabled={isActivating || isCancelling}
                        onClick={() => setIsRejectModalOpen(true)}
                      >
                        <XCircle className="w-4 h-4" />
                        رفض الإيصال / إلغاء الطلب
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Receipt Preview Modal */}
      <Dialog open={!!previewReceiptUrl} onOpenChange={(open) => !open && setPreviewReceiptUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>معاينة الإيصال</DialogTitle>
            <DialogDescription>عرض صورة إيصال الدفع المرفوعة للمراجعة</DialogDescription>
          </DialogHeader>

          <div className="relative w-full h-full flex flex-col min-h-[70vh] max-h-[90vh]">
            {/* Action Bar */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md rounded-xl h-10 px-4"
                onClick={() => window.open(previewReceiptUrl!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                فتح في تبويب جديد
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md rounded-xl h-10 w-10 p-0"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewReceiptUrl!;
                  link.download = `receipt-${selectedRecord?.invoiceNumber || 'file'}`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border-red-500/30 backdrop-blur-md rounded-xl h-10 w-10 p-0"
                onClick={() => setPreviewReceiptUrl(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Image View */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <img
                src={previewReceiptUrl || ''}
                alt="Receipt Full View"
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
            </div>

            {/* Info Footer */}
            <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-xl flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Receipt className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">{selectedRecord?.customerName}</p>
                  <p className="text-[10px] text-gray-400 font-mono" dir="ltr">{selectedRecord?.invoiceNumber}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xl font-black text-blue-400">{formatCurrency(selectedRecord?.amount || 0, selectedRecord?.currency)}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject/Cancel Modal with Notes */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem]">
          <div className="p-8 text-right" dir="rtl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 leading-none mb-1">رفض الطلب</DialogTitle>
                <DialogDescription className="text-slate-500 font-bold text-xs uppercase tracking-wider">Reject payment receipt</DialogDescription>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 font-medium leading-relaxed">
                يرجى كتابة سبب رفض الإيصال. سيظهر هذا السبب للمستخدم في صفحة حالة الاشتراك لمساعدته على حل المشكلة.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 mr-1 uppercase opacity-60">سبب الرفض (ملاحظات للإدارة والعميل)</label>
                <Textarea
                  placeholder="مثال: الإيصال غير واضح، أو المبلغ المدفوع لا يتطابق مع سعر الباقة..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-red-500 text-right font-medium resize-none transition-all"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 rounded-xl h-12 font-bold text-slate-400 hover:bg-slate-100"
              >
                تراجع
              </Button>
              <Button
                onClick={() => cancelInvoice(selectedRecord!)}
                disabled={isCancelling || !rejectionReason.trim()}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 font-black shadow-lg shadow-red-100 transition-all active:scale-95 gap-2"
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 ml-1 rotate-180" />
                )}
                تأكيد الرفض والإلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}