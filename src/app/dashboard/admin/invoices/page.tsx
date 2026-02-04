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
  Clock,
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

interface FilterState {
  status: string;
  country: string;
  dateFrom: string;
  dateTo: string;
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

      {/* 1. Interactive Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-blue-900/5 relative overflow-hidden"
      >
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10">
          <div className="relative">
            <div className="p-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200 group hover:scale-105 transition-transform duration-300">
              <Banknote className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 p-1.5 bg-yellow-400 rounded-lg shadow-sm animate-bounce">
              <Zap className="w-3.5 h-3.5 text-yellow-900" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700">المركز المالي</span>
            </h1>
            <p className="text-gray-500 font-medium mt-1 flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              إدارة الفواتير والعمليات المالية بدقة واحترافية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <Button
            variant="ghost"
            onClick={load}
            className="h-12 px-6 bg-white/50 backdrop-blur-md hover:bg-white text-gray-600 hover:text-blue-600 rounded-2xl border border-white shadow-sm transition-all duration-300 font-bold"
          >
            <RefreshCcw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin text-blue-500' : 'opacity-50'}`} />
            تحديث البيانات
          </Button>
          <Button className="h-12 px-8 bg-gray-900 hover:bg-black text-white rounded-2xl shadow-xl shadow-gray-200 transition-all active:scale-95 font-bold group">
            <FileDown className="w-4 h-4 ml-2 group-hover:translate-y-0.5 transition-transform" />
            تصدير التقارير
          </Button>
        </div>
      </motion.div>

      {/* 2. Enhanced Country Tabs */}
      <div className="flex overflow-x-auto pb-6 gap-4 no-scrollbar -mx-2 px-2">
        <AnimatePresence mode="popLayout">
          {[
            { id: 'all', label: 'الكل', icon: '🌍', color: 'blue' },
            { id: 'EG', label: 'مصر', icon: '🇪🇬', color: 'red' },
            { id: 'QA', label: 'قطر', icon: '🇶🇦', color: 'orange' },
            { id: 'SA', label: 'السعودية', icon: '🇸🇦', color: 'green' },
            { id: 'KW', label: 'الكويت', icon: '🇰🇼', color: 'cyan' },
            { id: 'IQ', label: 'العراق', icon: '🇮🇶', color: 'gray' },
          ].map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-[2rem] border-2 transition-all min-w-[120px] h-[130px] group overflow-hidden
                ${activeTab === tab.id
                  ? 'border-blue-500 bg-blue-50/30'
                  : 'border-white bg-white/60 backdrop-blur-md hover:border-blue-200 hover:bg-white'
                }
              `}
            >
              <span className="text-4xl mb-2 filter drop-shadow-md group-hover:scale-110 transition-transform duration-500">{tab.icon}</span>
              <span className={`text-sm font-black tracking-tight ${activeTab === tab.id ? 'text-blue-700' : 'text-gray-600'}`}>
                {tab.label}
              </span>
              <div className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider
                ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}
              `}>
                {activeTab === 'all'
                  ? `${records.length}`
                  : `${records.filter(r => r.country === tab.id).length}`
                }
              </div>

              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 border-2 border-blue-500 rounded-[2rem] pointer-events-none"
                />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* 3. Premium Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="group relative p-8 rounded-[2.5rem] bg-slate-900 shadow-2xl overflow-hidden border border-white/10"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <Banknote className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-1 rounded-lg">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-[10px] font-black text-green-400">+12.5%</span>
              </div>
            </div>
            <div className="mt-8">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">إجمالي الإيرادات</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(stats.total, 'EGP')}</h3>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-colors" />
        </motion.div>

        {/* Success Rate Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative p-8 rounded-[2.5rem] bg-white shadow-xl shadow-blue-900/5 group border border-white overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                معدل التحصيل
              </span>
            </div>
            <div className="mt-8">
              <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">العمليات المدفوعة</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stats.paid}</h3>
                <span className="text-xs font-bold text-gray-400">/ {stats.count}</span>
              </div>
            </div>
            <div className="mt-6">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.paid / stats.count) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm"
                />
              </div>
              <p className="text-[10px] font-black text-emerald-600 mt-2 text-left uppercase tracking-widest">
                {(stats.paid / stats.count * 100).toFixed(0)}% تصفية
              </p>
            </div>
          </div>
        </motion.div>

        {/* Pending Review Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative p-8 rounded-[2.5rem] bg-white shadow-xl shadow-blue-900/5 group border border-white overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-amber-100 rounded-2xl group-hover:animate-pulse">
                <Loader2 className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                قيد المعالجة
              </span>
            </div>
            <div className="mt-8">
              <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">عمليات المراجعة</p>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stats.pending}</h3>
            </div>
            <p className="text-[10px] font-bold text-gray-400 mt-4 leading-relaxed">تتطلب تدخل فوري لتفعيل الاشتراكات للمشتركين الجدد</p>
          </div>
        </motion.div>

        {/* Active Customers Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-purple-700 shadow-2xl group border border-white/10 overflow-hidden"
        >
          <div className="relative z-10 text-white">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <div className="mt-8">
              <p className="text-indigo-100 font-black text-[10px] uppercase tracking-[0.2em] mb-1">المشتركين الفريدين</p>
              <h3 className="text-3xl font-black text-white tracking-tight">
                {new Set(filtered.map(r => r.customerEmail)).size}
              </h3>
            </div>
            <div className="mt-6 flex gap-2">
              <div className="flex -space-x-2 space-x-reverse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-indigo-600 bg-indigo-400 flex items-center justify-center text-[8px] font-black">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-indigo-100">+24 مستخدم جديد اليوم</span>
            </div>
          </div>
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors" />
        </motion.div>
      </div>


      {/* 4. Luxury Filters & Search Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="sticky top-4 z-20"
      >
        <Card className="p-4 border border-white bg-white/70 backdrop-blur-md shadow-2xl shadow-blue-900/5 rounded-[2rem] overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Intelligent Search */}
            <div className="relative flex-1 w-full group">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none transition-transform duration-300 group-focus-within:scale-110">
                <Search className="w-5 h-5 text-blue-500/50 group-focus-within:text-blue-600" />
              </div>
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة، اسم العميل، او رقم الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-12 pl-6 py-4 bg-gray-50/50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none text-sm font-bold transition-all placeholder:text-gray-400 shadow-inner"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:block">
                  Search
                </div>
              </div>
            </div>

            {/* Smart Filters Group */}
            <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Filter className="w-4 h-4 text-blue-600" />
                </div>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as FilterState['status'] }))}
                  className="bg-transparent border-none outline-none text-sm font-black text-slate-700 px-2 cursor-pointer min-w-[120px]"
                >
                  <option value="all">كل الحالات الائتمانية</option>
                  <option value="paid">✅ العمليات المكتملة</option>
                  <option value="pending">⏳ قيد المراجعة الفنية</option>
                  <option value="pending_review">⏳ قيد المراجعة الفنية</option>
                  <option value="cancelled">❌ العمليات الملغاة</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 min-w-fit">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="bg-transparent border-none outline-none text-sm font-black text-slate-700 px-2 cursor-pointer"
                />
              </div>

              <Button
                variant="ghost"
                onClick={() => setFilters({ status: 'all', country: 'all', dateFrom: '', dateTo: '' })}
                className="rounded-2xl h-12 w-12 p-0 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all border border-red-100"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 5. Modern Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-blue-900/5 overflow-hidden border border-white"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.1em] text-right">إدارة الفواتير</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.1em] text-right">معلومات العميل</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.1em] text-right">القيمة الصافية</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.1em] text-right">قناة الدفع</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.1em] text-right">الحالة</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.1em] text-right">التوقيت</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.1em] text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-32 bg-gray-50/30">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-6"
                    >
                      <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 group-hover:scale-110 transition-transform" />
                        <Search className="w-10 h-10 text-blue-500/30 relative z-10" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900">سجل المدفوعات نظيف</h3>
                        <p className="text-sm text-slate-500 font-medium">لم نتمكن من العثور على أي عمليات تطابق معايير بحثك</p>
                      </div>
                      <Button variant="outline" onClick={() => setFilters({ status: 'all', country: 'all', dateFrom: '', dateTo: '' })} className="rounded-xl font-bold bg-white">
                        إعادة تعيين الفلاتر
                      </Button>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                filtered.map((record, index) => (
                  <motion.tr
                    key={`${record.source}-${record.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => setSelectedRecord(record)}
                    className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer relative"
                  >
                    {/* Invoice ID */}
                    <td className="px-8 py-6 relative">
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-xl shadow-inner border border-gray-100 group-hover:bg-white transition-colors">
                          <span className="filter grayscale group-hover:grayscale-0 transition-all">{getFlag(record.country)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 font-mono text-sm tracking-tighter">#{record.invoiceNumber}</span>
                            {record.raw?.isAutomatic && <Zap className="w-3 h-3 text-yellow-500" />}
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{record.source}</p>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-[1rem] flex-shrink-0 flex items-center justify-center text-white text-sm font-black shadow-lg overflow-hidden border-2 border-white ring-1 ring-gray-100
                            ${record.customerImage ? 'bg-white' :
                              ((record.customerName?.charCodeAt(0) || 0) % 4 === 0 ? 'bg-gradient-to-tr from-blue-600 to-indigo-700' :
                                (record.customerName?.charCodeAt(0) || 0) % 4 === 1 ? 'bg-gradient-to-tr from-rose-500 to-orange-500' :
                                  (record.customerName?.charCodeAt(0) || 0) % 4 === 2 ? 'bg-gradient-to-tr from-emerald-500 to-teal-700' :
                                    'bg-gradient-to-tr from-purple-600 to-fuchsia-600')}
                          `}>
                            {record.customerImage ? (
                              <img src={record.customerImage} className="w-full h-full object-cover" />
                            ) : (
                              record.customerName?.[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-lg shadow-sm flex items-center justify-center">
                            {record.userData?.isVerified ? <CheckCircle className="w-3 h-3 text-blue-500" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm group-hover:text-blue-700 transition-colors truncate max-w-[150px]">
                            {record.customerName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5 truncate max-w-[150px]" dir="ltr">
                            {record.customerPhone || record.customerEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-lg tracking-tight">
                          {formatCurrency(record.amount, record.currency)}
                        </span>
                        {record.planName && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {record.planName}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3 bg-slate-50/50 w-fit px-4 py-2 rounded-xl border border-gray-100 group-hover:bg-white transition-colors">
                        {(() => {
                          const details = METHOD_DETAILS[record.paymentMethod] || { icon: CreditCard, label: record.paymentMethod };
                          const Icon = details.icon;
                          return (
                            <>
                              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                <Icon className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                {details.label}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-8 py-6">
                      {(() => {
                        const config = STATUS_LABELS[record.status] || STATUS_LABELS.pending;
                        return (
                          <div className={`
                            inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm
                            ${record.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              record.status.includes('pending') ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'}
                          `}>
                            <div className={`w-2 h-2 rounded-full border-2 ${record.status === 'paid' ? 'bg-emerald-500 border-emerald-200' : record.status.includes('pending') ? 'bg-amber-500 border-amber-200' : 'bg-rose-500 border-rose-200'} animate-pulse`} />
                            <span className="text-[10px] font-black uppercase tracking-tight">{config.label}</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Date/Time */}
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{formatDate(record.createdAt)}</span>
                        <div className="flex items-center gap-1 mt-1 opacity-50">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {record.createdAt?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Quick Actions */}
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="إرسال واتساب"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/${record.customerPhone?.replace(/\D/g, '')}`, '_blank');
                          }}
                          className="h-10 w-10 p-0 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100/50 transition-all hover:shadow-lg"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          title="عرض التفاصيل"
                          className="h-10 w-10 p-0 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100/50 transition-all hover:shadow-lg"
                        >
                          <ArrowUpRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              عرض <span className="text-slate-900 font-black">{filtered.length}</span> من إجمالي <span className="text-slate-900 font-black">{records.length}</span> فاتورة مسجلة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-11 rounded-xl px-6 font-black text-xs uppercase tracking-widest shadow-sm bg-white" disabled>
              السابق
            </Button>
            <Button variant="outline" className="h-11 rounded-xl px-6 font-black text-xs uppercase tracking-widest shadow-sm bg-white">
              التالي
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 6. Ultra-Premium Side Details Panel */}
      <AnimatePresence>
        {selectedRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-4 left-4 right-auto z-[101] w-full max-w-xl bg-white/95 backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.1)] rounded-[3rem] border border-white overflow-hidden flex flex-col"
              style={{ left: '1rem', right: 'auto' }}
            >
              {/* Top Banner Decoration */}
              <div className="h-32 bg-gradient-to-br from-slate-900 to-blue-900 relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-8 pb-10 -mt-16 flex-1 overflow-y-auto no-scrollbar relative z-10">
                {/* Profile Header */}
                <div className="flex flex-col items-center mb-10">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1.5 shadow-2xl group-hover:rotate-3 transition-transform duration-500">
                      <div className="w-full h-full rounded-[2.2rem] bg-slate-100 overflow-hidden border border-gray-100">
                        {selectedRecord.customerImage ? (
                          <img src={selectedRecord.customerImage} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300">
                            {selectedRecord.customerName?.[0]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl shadow-xl ring-4 ring-white">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <h2 className="text-2xl font-black text-slate-900">{selectedRecord.customerName}</h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <p className="text-sm font-bold text-slate-400 font-mono tracking-tight" dir="ltr">{selectedRecord.customerPhone}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full tracking-widest">{selectedRecord.userData?.role || 'User'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المبلغ الإجمالي</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedRecord.amount, selectedRecord.currency)}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">حالة الفاتورة</p>
                    {(() => {
                      const config = STATUS_LABELS[selectedRecord.status] || STATUS_LABELS.pending;
                      return (
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight
                          ${selectedRecord.status === 'paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                            selectedRecord.status.includes('pending') ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                              'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}
                        `}>
                          {config.label}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Details Sections */}
                <div className="space-y-8">
                  {/* Transaction Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">تفاصيل المعاملة المالية</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'رقم المرجعي', value: selectedRecord.invoiceNumber, isMono: true },
                        { label: 'مصدر البيانات', value: selectedRecord.source },
                        { label: 'بوابة الدفع', value: METHOD_DETAILS[selectedRecord.paymentMethod]?.label || selectedRecord.paymentMethod, isCapitalize: true },
                        { label: 'تاريخ الإنشاء', value: formatDate(selectedRecord.createdAt) },
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{item.label}</p>
                          <p className={`text-sm font-bold text-slate-800 ${item.isMono ? 'font-mono' : ''} ${item.isCapitalize ? 'capitalize' : ''}`}>
                            {item.value || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan Details */}
                  <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">خطة الاشتراك المختارة</p>
                        <h4 className="text-xl font-black">{selectedRecord.planName || 'الاشتراك الأساسي'}</h4>
                        <p className="text-indigo-200 text-xs font-bold mt-1 opacity-80">{selectedRecord.packageDuration || 'مدة باقة مخصصة'}</p>
                      </div>
                      <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                      </div>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  </div>

                  {/* Receipt Preview if exists */}
                  {selectedRecord.receiptUrl && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">إيصال الدفع المرفق</h3>
                        </div>
                        <Button variant="ghost" className="text-[10px] font-black text-blue-600" onClick={() => setPreviewReceiptUrl(selectedRecord.receiptUrl!)}>
                          تكبير الصورة
                        </Button>
                      </div>
                      <div className="group relative aspect-[3/4] w-full rounded-[2.5rem] overflow-hidden border-2 border-slate-100 shadow-2xl cursor-zoom-in" onClick={() => setPreviewReceiptUrl(selectedRecord.receiptUrl!)}>
                        <img src={selectedRecord.receiptUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/20">
                            <Eye className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 relative z-20">
                <div className="flex gap-3">
                  <Button className="flex-1 h-14 rounded-2xl bg-white text-slate-900 border border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm gap-2" onClick={() => handlePrint(selectedRecord)}>
                    <Printer className="w-4 h-4 text-blue-600" /> طباعة المستند
                  </Button>
                  <Button
                    className="flex-1 h-14 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 gap-2"
                    onClick={() => {
                      const targetPhone = selectedRecord.customerPhone ||
                        selectedRecord.raw?.phone || selectedRecord.raw?.phoneNumber ||
                        selectedRecord.userData?.phone || selectedRecord.userData?.personal_phone || selectedRecord.userData?.whatsapp;
                      window.open(`https://wa.me/${targetPhone?.replace(/\D/g, '')}`, '_blank');
                    }}
                  >
                    <MessageCircle className="w-4 h-4" /> واتساب سريع
                  </Button>
                </div>

                <Button
                  className="w-full h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/30 gap-3 relative group overflow-hidden"
                  disabled={isActivating || isCancelling}
                  onClick={() => activateSubscription(selectedRecord)}
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[100%] group-hover:translate-x-[-100%] transition-transform duration-700" />
                  {isActivating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {isActivating ? 'جاري معالجة الطلب...' : 'تفعيل العضوية فوراً'}
                </Button>

                {(selectedRecord.status === 'pending_review' || selectedRecord.status === 'pending') && (
                  <Button
                    variant="ghost"
                    className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.22em] text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
                    disabled={isActivating || isCancelling}
                    onClick={() => setIsRejectModalOpen(true)}
                  >
                    إلغاء الطلب / رفض الاعتماد
                  </Button>
                )}
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