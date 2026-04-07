'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    ConfigProvider, Table, Tabs, Card, Button, Input, Select, DatePicker,
    Tag, Drawer, Modal, Space, Typography, Row, Col, Statistic, Tooltip,
    Progress, Empty, Avatar,
} from 'antd';
import {
    BankOutlined, SearchOutlined,
    ReloadOutlined, PrinterOutlined, WhatsAppOutlined, CheckCircleOutlined,
    CloseCircleOutlined, EyeOutlined, DownloadOutlined, ExportOutlined,
    StarOutlined, ClockCircleOutlined,
    TeamOutlined, CopyOutlined, LinkOutlined,
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { supabase } from '@/lib/supabase/config';
import { PricingService } from '@/lib/pricing/pricing-service';
import { SubscriptionPlan } from '@/types/pricing';
import { toast } from 'sonner';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';
import { ChatAmanService } from '@/lib/services/chataman-service';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const ANTD_THEME = {
    token: { colorPrimary: '#1e40af', borderRadius: 8, fontFamily: 'inherit' },
};

// --- Types ---
type InvoiceStatus = 'paid' | 'pending' | 'pending_review' | 'cancelled' | 'refunded' | 'overdue' | string;

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
    packageType?: string;
    reference: { orderId?: string | null; transactionId?: string | null };
    // بيانات الاشتراك
    subscriptionStart?: Date | null;
    subscriptionEnd?: Date | null;
    subscriptionStatus?: string | null;
    // خصم وبرومو كود
    discountAmount?: number | null;
    discountPercent?: number | null;
    promoCode?: string | null;
    originalAmount?: number | null;
    raw: any;
}

// --- Constants ---
const COLLECTIONS = [
    { name: 'invoices',            orderBy: 'created_at', label: 'فواتير' },
    { name: 'geidea_payments',     orderBy: 'createdAt',  label: 'جيديا' },
    { name: 'bulkPayments',        orderBy: 'createdAt',  label: 'دفع جماعي' },
    { name: 'bulk_payments',       orderBy: 'createdAt',  label: 'دفع جماعي 2' },
    { name: 'wallet',              orderBy: 'createdAt',  label: 'محفظة' },
    { name: 'instapay',            orderBy: 'createdAt',  label: 'إنستا باي' },
    { name: 'payments',            orderBy: 'createdAt',  label: 'مدفوعات' },
    { name: 'payment_results',     orderBy: 'createdAt',  label: 'نتائج الدفع' },
    { name: 'tournament_payments', orderBy: 'createdAt',  label: 'بطولات' },
];

const SOURCE_LABELS: Record<string, string> = {
    invoices: 'فواتير', geidea_payments: 'جيديا', bulkPayments: 'دفع جماعي',
    bulk_payments: 'دفع جماعي 2', wallet: 'محفظة', instapay: 'إنستا باي',
    payments: 'مدفوعات', payment_results: 'نتائج الدفع', tournament_payments: 'بطولات',
};

const METHOD_DETAILS: Record<string, { label: string; color: string }> = {
    geidea:        { label: 'جيديا (بطاقة)',   color: 'purple' },
    geidea_payments:{ label: 'جيديا (بطاقة)',  color: 'purple' },
    wallet:        { label: 'محفظة إلكترونية', color: 'gold' },
    instapay:      { label: 'إنستا باي',        color: 'cyan' },
    cash:          { label: 'نقدي',             color: 'default' },
    transfer:      { label: 'تحويل بنكي',       color: 'green' },
    card:          { label: 'بطاقة بنكية',      color: 'blue' },
    vodafone_cash: { label: 'فودافون كاش',      color: 'red' },
    fawran:        { label: 'فوراً (قطر)',       color: 'orange' },
    stc_pay:       { label: 'STC Pay',          color: 'purple' },
    bank_transfer: { label: 'تحويل بنكي',       color: 'blue' },
    skipcash:      { label: 'SkipCash',         color: 'geekblue' },
    payments:      { label: 'مدفوعات',          color: 'default' },
    payment_results:{ label: 'نتيجة دفع',       color: 'default' },
    tournament_payments:{ label: 'بطولة',       color: 'volcano' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    paid:           { label: 'تم الدفع',           color: 'success' },
    pending:        { label: 'بانتظار الدفع',       color: 'warning' },
    pending_review: { label: 'قيد مراجعة الإيصال', color: 'processing' },
    cancelled:      { label: 'ملغي',                color: 'error' },
    refunded:       { label: 'مسترد',               color: 'default' },
    overdue:        { label: 'متأخر',               color: 'orange' },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
    EGP: 'ج.م', QAR: 'ر.ق', SAR: 'ر.س', KWD: 'د.ك', AED: 'د.إ', IQD: 'د.ع',
};

// --- Helpers ---
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeStatus = (value?: string | null): InvoiceStatus => {
    const s = (value || '').toLowerCase();
    if (['paid', 'completed', 'success', 'accepted'].includes(s)) return 'paid';
    if (['refunded', 'refund'].includes(s)) return 'refunded';
    if (['cancelled', 'failed', 'rejected', 'void'].includes(s)) return 'cancelled';
    if (['overdue', 'late'].includes(s)) return 'overdue';
    if (['pending_review', 'review', 'uploaded'].includes(s)) return 'pending_review';
    return s || 'pending';
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
    if (curr === 'IQD') return 'IQ';
    return 'GLOBAL';
};

const getFlag = (country?: string) => {
    const flags: Record<string, string> = { EG: '🇪🇬', QA: '🇶🇦', SA: '🇸🇦', KW: '🇰🇼', AE: '🇦🇪', IQ: '🇮🇶' };
    return flags[country || ''] || '🌍';
};

const formatCurrency = (amount: number, currency = 'EGP') => {
    try {
        return Intl.NumberFormat('ar-EG', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount || 0);
    } catch {
        return `${amount} ${CURRENCY_SYMBOLS[currency] || currency}`;
    }
};

const formatDate = (value?: Date | null) =>
    value ? value.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const resolveImageUrl = (url?: string | null): string => {
    if (!url || url === 'null' || url === 'undefined') return '';
    if (url.includes('firebasestorage.googleapis.com')) return url;
    if (url.includes('assets.el7lm.com')) return url;
    if (url.includes('supabase.co')) return fixReceiptUrl(url) || url;
    if (!url.startsWith('http')) return `https://assets.el7lm.com/${url.replace(/^\//, '')}`;
    return url;
};

const normalizeRecord = (source: string, id: string, data: any): InvoiceRecord => {
    const createdAt = toDate(data?.created_at || data?.createdAt || data?.timestamp || data?.date) || new Date();
    const paidAt    = toDate(data?.paid_at || data?.paidAt || data?.paymentDate || data?.completedAt);
    const amount    = Number(data?.amount ?? data?.total ?? data?.total_amount ?? data?.value ?? data?.price ?? 0) || 0;
    const currency  = data?.currency || data?.currencyCode || 'EGP';
    // الخصم والبرومو كود
    const discountAmount  = Number(data?.discount_amount || data?.discountAmount || data?.discount || 0) || null;
    const discountPercent = Number(data?.discount_percent || data?.discountPercent || data?.discount_rate || 0) || null;
    const promoCode       = data?.promo_code || data?.promoCode || data?.coupon_code || data?.couponCode || data?.promotional_code || null;
    const originalAmount  = Number(data?.original_amount || data?.originalAmount || data?.base_amount || 0) || null;
    return {
        id, source,
        invoiceNumber: data?.invoice_number || data?.invoiceNumber || data?.orderId || `INV-${id.slice(0, 6)}`,
        paymentMethod: (data?.paymentMethod || data?.method || source).toLowerCase(),
        amount, currency,
        status: normalizeStatus(data?.status || data?.paymentStatus || data?.state),
        createdAt, paidAt,
        country: inferCountry(data, currency),
        customerName:  data?.customerName || data?.full_name || data?.name || data?.playerName || 'غير محدد',
        customerEmail: data?.customerEmail || data?.email || data?.user_email || '',
        customerPhone: data?.customerPhone || data?.phone || data?.mobile || data?.phoneNumber || '',
        customerImage: '',
        planName:      data?.planName || data?.plan_name || data?.packageName || data?.selectedPackage || '',
        packageDuration: data?.packageDuration || data?.package_duration || '',
        customerId: data?.userId || data?.user_id || data?.uid || data?.playerId || data?.player_id || data?.customerId || data?.customer_id || '',
        reference: { orderId: data?.orderId || null, transactionId: data?.transactionId || data?.sessionId || null },
        receiptUrl: resolveImageUrl(data?.receiptUrl || data?.receipt_url || data?.receiptImage || data?.image || null),
        discountAmount, discountPercent, promoCode, originalAmount,
        subscriptionStart: null, subscriptionEnd: null, subscriptionStatus: null,
        raw: { ...data, collection: source, id },
    };
};

// --- تصدير CSV ---
const exportToCSV = (rows: InvoiceRecord[]) => {
    const headers = ['رقم الفاتورة', 'العميل', 'الهاتف', 'الإيميل', 'المبلغ', 'العملة', 'طريقة الدفع', 'الحالة', 'المصدر', 'التاريخ'];
    const csv = [
        headers.join(','),
        ...rows.map(r => [
            r.invoiceNumber,
            `"${r.customerName || ''}"`,
            r.customerPhone || '',
            r.customerEmail || '',
            r.amount,
            r.currency,
            METHOD_DETAILS[r.paymentMethod]?.label || r.paymentMethod,
            STATUS_CONFIG[r.status]?.label || r.status,
            SOURCE_LABELS[r.source] || r.source,
            formatDate(r.createdAt),
        ].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `invoices-${dayjs().format('YYYY-MM-DD')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التقرير بنجاح');
};

// --- Main Page ---
export default function AdminInvoicesListPage() {
    const [loading, setLoading]               = useState(false);
    const [records, setRecords]               = useState<InvoiceRecord[]>([]);
    const [search, setSearch]                 = useState('');
    const [statusFilter, setStatusFilter]     = useState('all');
    const [sourceFilter, setSourceFilter]     = useState('all');
    const [dateRange, setDateRange]           = useState<[any, any] | null>(null);
    const [activeTab, setActiveTab]           = useState('all');
    const [plans, setPlans]                   = useState<SubscriptionPlan[]>([]);


    const [selectedRecord, setSelectedRecord] = useState<InvoiceRecord | null>(null);
    const [previewUrl, setPreviewUrl]         = useState<string | null>(null);
    const [isActivating, setIsActivating]     = useState(false);
    const [isCancelling, setIsCancelling]     = useState(false);
    const [rejectOpen, setRejectOpen]         = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

    // --- استخراج صورة المستخدم ---
    const resolveUserImage = (user: any): string => {
        if (!user) return '';
        const extract = (v: any): string => {
            if (!v) return '';
            if (typeof v === 'string') return v.trim();
            if (typeof v === 'object') return v.url || v.uri || v.path || v.src || '';
            return '';
        };
        const candidates = [
            user.profile_image_url, extract(user.profile_image),
            user.image, user.profileImage, user.profile_photo,
            user.photo, user.photoURL, user.photo_url,
            user.avatar, user.logo, user.club_logo, user.academy_logo, user.profilePicture,
        ];
        for (const c of candidates) {
            if (c && typeof c === 'string' && c.trim() && c !== 'null' && c !== 'undefined') {
                return resolveImageUrl(c);
            }
        }
        return '';
    };

    // --- Enrich: جلب بيانات المستخدمين دفعة واحدة ---
    const enrichInvoices = async (initialRecords: InvoiceRecord[]) => {
        type Info = { name: string; image: string; phone: string; email: string; plan: string };
        const infoMap = new Map<string, Info>();

        const toInfo = (row: any): Info => ({
            name:  row.full_name || row.name || row.displayName || '',
            image: resolveUserImage(row),
            phone: row.phone || row.phoneNumber || '',
            email: row.email || '',
            plan:  row.selectedPackage || row.plan_name || '',
        });

        const allIds    = [...new Set(initialRecords.map(r => r.customerId).filter(Boolean))] as string[];
        const allEmails = [...new Set(initialRecords.map(r => r.customerEmail?.toLowerCase().trim()).filter(Boolean))] as string[];
        const allPhones = [...new Set(initialRecords.map(r => r.customerPhone?.replace(/\D/g, '')).filter(Boolean))] as string[];

        // 1. جلب من players بالـ ID دفعة واحدة (الصور موجودة هنا)
        if (allIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < allIds.length; i += 500) chunks.push(allIds.slice(i, i + 500));
            for (const chunk of chunks) {
                const { data } = await supabase.from('players')
                    .select('id, uid, full_name, name, email, phone, profile_image_url, profile_image, image, selectedPackage')
                    .in('id', chunk);
                (data || []).forEach((p: any) => {
                    const info = toInfo(p);
                    if (p.id) infoMap.set(p.id, info);
                    if (p.uid && p.uid !== p.id) infoMap.set(p.uid, info);
                });
            }
        }

        // 2. جلب من users بالـ ID دفعة واحدة (للأسماء)
        if (allIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < allIds.length; i += 500) chunks.push(allIds.slice(i, i + 500));
            for (const chunk of chunks) {
                const { data } = await supabase.from('users')
                    .select('id, uid, full_name, name, displayName, email, phone, phoneNumber, selectedPackage')
                    .in('id', chunk);
                (data || []).forEach((u: any) => {
                    const existing = infoMap.get(u.id);
                    const info = toInfo(u);
                    const merged: Info = {
                        name:  existing?.name || info.name,
                        image: existing?.image || info.image,
                        phone: existing?.phone || info.phone,
                        email: existing?.email || info.email,
                        plan:  existing?.plan  || info.plan,
                    };
                    if (u.id) infoMap.set(u.id, merged);
                    if (u.uid && u.uid !== u.id) infoMap.set(u.uid, merged);
                });
            }
        }

        // 3. جلب بالإيميل (batch) للفواتير بدون userId
        const missingEmails = allEmails.filter(e => ![...infoMap.values()].some(v => v.email?.toLowerCase() === e));
        if (missingEmails.length > 0) {
            const { data } = await supabase.from('players')
                .select('id, full_name, name, email, phone, profile_image_url, profile_image, image, selectedPackage')
                .in('email', missingEmails);
            (data || []).forEach((p: any) => {
                if (p.email) infoMap.set(p.email.toLowerCase(), toInfo(p));
            });
        }

        // 4. جلب بالهاتف (batch) - آخر خيار
        const missingPhones = allPhones.filter(ph => ![...infoMap.values()].some(v => (v.phone || '').replace(/\D/g, '') === ph));
        if (missingPhones.length > 0) {
            const { data } = await supabase.from('players')
                .select('id, full_name, name, email, phone, profile_image_url, profile_image, image, selectedPackage')
                .in('phone', missingPhones);
            (data || []).forEach((p: any) => {
                if (p.phone) infoMap.set(p.phone.replace(/\D/g, ''), toInfo(p));
            });
        }

        // 5. جلب تواريخ الاشتراك من subscriptions
        // يدعم: user_id / userId / id / customer_email
        const subMap = new Map<string, { start: Date | null; end: Date | null; status: string }>();

        const mergeSub = (key: string, s: any) => {
            if (!key) return;
            const end   = toDate(s.end_date || s.endDate || s.expires_at || s.expiresAt);
            const start = toDate(s.start_date || s.startDate || s.activated_at || s.activatedAt);
            const existing = subMap.get(key);
            if (!existing) {
                subMap.set(key, { start, end, status: s.status || '' });
            } else {
                subMap.set(key, {
                    start: existing.start ?? start,
                    end: end && (!existing.end || end.getTime() > existing.end.getTime()) ? end : existing.end,
                    status: s.status === 'active' ? 'active' : (existing.status || s.status || ''),
                });
            }
        };

        const SUB_SELECT = 'id, user_id, userId, customer_email, start_date, startDate, activated_at, activatedAt, end_date, endDate, expires_at, expiresAt, status';

        // بحث بالـ userId
        if (allIds.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < allIds.length; i += 500) chunks.push(allIds.slice(i, i + 500));
            for (const chunk of chunks) {
                const [r1, r2, r3] = await Promise.all([
                    supabase.from('subscriptions').select(SUB_SELECT).in('user_id', chunk),
                    supabase.from('subscriptions').select(SUB_SELECT).in('userId', chunk),
                    supabase.from('subscriptions').select(SUB_SELECT).in('id', chunk),
                ]);
                [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])].forEach((s: any) => {
                    const uid = s.user_id || s.userId || s.id;
                    mergeSub(uid, s);
                    // أيضاً نفهرس بالإيميل إذا توفر
                    if (s.customer_email) mergeSub(s.customer_email.toLowerCase(), s);
                });
            }
        }

        // بحث بالإيميل للفواتير التي ليس لها userId (مثل geidea_payments)
        const emailsWithoutId = allEmails.filter(e => {
            const rec = initialRecords.find(r => r.customerEmail?.toLowerCase().trim() === e);
            return rec && !rec.customerId;
        });
        if (emailsWithoutId.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < emailsWithoutId.length; i += 200) chunks.push(emailsWithoutId.slice(i, i + 200));
            for (const chunk of chunks) {
                const { data } = await supabase.from('subscriptions').select(SUB_SELECT).in('customer_email', chunk);
                (data || []).forEach((s: any) => {
                    if (s.customer_email) mergeSub(s.customer_email.toLowerCase(), s);
                    const uid = s.user_id || s.userId || s.id;
                    if (uid) mergeSub(uid, s);
                });
            }
        }

        return initialRecords.map(r => {
            const info = infoMap.get(r.customerId || '')
                || infoMap.get(r.customerEmail?.toLowerCase().trim() || '')
                || infoMap.get(r.customerPhone?.replace(/\D/g, '') || '');
            // البحث بالـ customerId أولاً، ثم بالإيميل
            const sub = subMap.get(r.customerId || '')
                     || subMap.get(r.customerEmail?.toLowerCase().trim() || '');
            return {
                ...r,
                customerName:  (r.customerName && r.customerName !== 'غير محدد') ? r.customerName : (info?.name || 'مستخدم مسجل'),
                customerImage: info?.image || '',
                planName:      r.planName || info?.plan || '',
                customerPhone: r.customerPhone || info?.phone || '',
                customerEmail: r.customerEmail || info?.email || '',
                subscriptionStart:  sub?.start  ?? null,
                subscriptionEnd:    sub?.end    ?? null,
                subscriptionStatus: sub?.status ?? null,
            };
        });
    };

    // --- إزالة التكرار ---
    const deduplicateRecords = (rows: InvoiceRecord[]): InvoiceRecord[] => {
        const seen = new Map<string, InvoiceRecord>();
        for (const r of rows) {
            // المفتاح: orderId أو transactionId أو (invoiceNumber + amount + customerId)
            const key = r.reference.orderId || r.reference.transactionId
                || `${r.invoiceNumber}-${r.amount}-${r.customerId}`;
            if (!seen.has(key)) {
                seen.set(key, r);
            } else {
                // الأفضلية للسجل من bulkPayments على bulk_payments
                const existing = seen.get(key)!;
                if (r.source === 'bulkPayments' && existing.source === 'bulk_payments') {
                    seen.set(key, r);
                }
            }
        }
        return [...seen.values()];
    };

    const load = async () => {
        setLoading(true);
        try {
            const aggregated: InvoiceRecord[] = [];
            await Promise.all(COLLECTIONS.map(async cfg => {
                try {
                    const { data: rows } = await supabase
                        .from(cfg.name).select('*')
                        .order(cfg.orderBy || 'created_at', { ascending: false })
                        .limit(2000);
                    (rows || []).forEach(row => aggregated.push(normalizeRecord(cfg.name, row.id, row)));
                } catch {}
            }));

            const allPlans = await PricingService.getAllPlans();
            setPlans(allPlans);

            let clean = aggregated.filter(r => r.customerEmail !== 'contact@fakhracademy.com');
            clean = deduplicateRecords(clean);
            clean.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            clean = await enrichInvoices(clean);
            clean = clean.map(r => {
                const pkgType = r.raw?.packageType || r.raw?.package_type || r.raw?.selectedPackage;
                const best = PricingService.getBestMatchedPlan(Number(r.amount || 0), pkgType, allPlans);
                return { ...r, planName: r.planName || best.title, packageDuration: r.packageDuration || best.period, packageType: pkgType || best.plan?.id };
            });
            setRecords(clean);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // --- Actions ---
    const activateSubscription = async (record: InvoiceRecord) => {
        if (isActivating) return;
        setIsActivating(true);
        try {
            const userId = record.customerId || record.raw?.userId || record.raw?.user_id;
            if (!userId) { toast.error('لا يمكن تحديد هوية المستخدم للتفعيل'); return; }
            const pkgType = record.raw?.packageType || record.packageType || '';
            const best = PricingService.getBestMatchedPlan(Number(record.amount || 0), pkgType, plans);
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + best.months);

            await supabase.from('subscriptions').upsert({
                id: userId, userId, status: 'active',
                plan_name: best.title, packageType: best.plan?.id || pkgType,
                package_duration: best.period, package_price: Number(record.amount || 0),
                activated_at: new Date().toISOString(), expires_at: expiresAt.toISOString(),
                end_date: expiresAt.toISOString(), payment_id: record.id,
                amount: record.amount, currency: record.currency, updated_at: new Date().toISOString(),
            });
            await supabase.from('users').update({
                subscriptionStatus: 'active', subscriptionExpiresAt: expiresAt.toISOString(),
                packageType: best.plan?.id || pkgType, selectedPackage: best.title,
                updatedAt: new Date().toISOString(),
            }).eq('id', userId);
            await supabase.from(record.source || 'invoices').update({
                status: 'paid', paidAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            }).eq('id', record.id);

            toast.success(`✅ تم تفعيل اشتراك ${record.customerName} حتى ${formatDate(expiresAt)}`);
            // إعادة تحميل كاملة لجلب بيانات الاشتراك المحدثة
            await load();
        } catch (e: any) {
            toast.error('فشل تفعيل الاشتراك: ' + (e?.message || ''));
        } finally { setIsActivating(false); }
    };

    const cancelInvoice = async (record: InvoiceRecord) => {
        if (isCancelling || !rejectionReason.trim()) return;
        setIsCancelling(true);

        const isRefund = record.status === 'paid';
        const newStatus = isRefund ? 'refunded' : 'cancelled';
        const now = new Date().toISOString();
        const reason = rejectionReason.trim();
        const userId = record.customerId || record.raw?.userId || record.raw?.user_id;

        try {
            // 1. تحديث حالة الفاتورة في المصدر
            await supabase.from(record.source || 'invoices').update({
                status: newStatus,
                updatedAt: now,
                adminNotes: reason,
                notes: reason,
            }).eq('id', record.id);

            // 2. إذا كان استرداداً → وقف الاشتراك وتحديث المستخدم
            if (isRefund && userId) {
                // وقف الاشتراك
                await supabase.from('subscriptions')
                    .update({ status: 'cancelled', updated_at: now, updatedAt: now })
                    .or(`user_id.eq.${userId},userId.eq.${userId},id.eq.${userId}`);

                // تحديث حالة المستخدم
                await supabase.from('users')
                    .update({ subscriptionStatus: 'inactive', updatedAt: now })
                    .eq('id', userId);

                // تحديث في players أيضاً إن وُجد
                await supabase.from('players')
                    .update({ subscriptionStatus: 'inactive', updatedAt: now })
                    .eq('id', userId);
            }

            // 3. تحديث الواجهة
            setRecords(prev => prev.map(r =>
                r.id === record.id && r.source === record.source
                    ? { ...r, status: newStatus, notes: reason, subscriptionStatus: isRefund ? 'cancelled' : r.subscriptionStatus }
                    : r
            ));
            setSelectedRecord(prev => prev?.id === record.id
                ? { ...prev, status: newStatus, notes: reason, subscriptionStatus: isRefund ? 'cancelled' : prev?.subscriptionStatus }
                : prev
            );

            toast.success(isRefund ? '↩️ تم استرداد الفاتورة وإيقاف الاشتراك' : '🚫 تم إلغاء الفاتورة');
            setRejectOpen(false);
            setRejectionReason('');
        } catch (e: any) {
            toast.error('فشل العملية: ' + (e?.message || ''));
        } finally {
            setIsCancelling(false);
        }
    };

    const sendWhatsAppReminder = async (record: InvoiceRecord) => {
        if (isSendingWhatsApp) return;
        const phone = record.customerPhone || record.raw?.phone;
        if (!phone || phone.replace(/\D/g, '').length < 8) { toast.error('لم يتم العثور على رقم هاتف صحيح'); return; }
        setIsSendingWhatsApp(true);
        try {
            const result = await ChatAmanService.sendActivationReminder(phone, record.customerName || 'كابتن', 'El7lm2026');
            if (result.success) toast.success('تم إرسال تذكير التفعيل عبر واتساب');
            else toast.error(result.error || 'فشل إرسال التذكير');
        } catch { toast.error('حدث خطأ أثناء الاتصال بخدمة واتساب'); }
        finally { setIsSendingWhatsApp(false); }
    };

    const openWhatsApp = (phone?: string) => {
        const clean = phone?.replace(/\D/g, '');
        if (!clean || clean.length < 8) { toast.error('رقم الهاتف غير صحيح'); return; }
        window.open(`https://wa.me/${clean}`, '_blank');
    };

    const handlePrint = (record: InvoiceRecord) => {
        const st = STATUS_CONFIG[record.status] || { label: record.status, color: 'default' };
        const stColors: Record<string, { color: string; bg: string }> = {
            success:  { color: '#16a34a', bg: '#dcfce7' },
            warning:  { color: '#d97706', bg: '#fef3c7' },
            processing:{ color: '#2563eb', bg: '#dbeafe' },
            error:    { color: '#dc2626', bg: '#fee2e2' },
            orange:   { color: '#ea580c', bg: '#ffedd5' },
            default:  { color: '#6b7280', bg: '#f3f4f6' },
        };
        const stStyle = stColors[st.color] || stColors.default;
        const method  = METHOD_DETAILS[record.paymentMethod]?.label || record.paymentMethod || '—';
        const src     = SOURCE_LABELS[record.source] || record.source;
        const refNum  = record.reference.transactionId || record.reference.orderId || null;
        const printDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        // دائماً رابط الإنتاج — لا يُظهر localhost للعميل أبداً
        const prodBase = 'https://el7lm.com';
        const invoiceUrl = `${prodBase}/invoice/${record.id}`;
        const logoUrl = `${window.location.origin}/el7lm-logo.png`;
        // تقصير رقم الفاتورة: إذا كان UUID أو طويلاً أكثر من 20 حرفاً نُظهر أول 8 أحرف فقط
        const rawNum = record.invoiceNumber || record.id;
        const shortNum = rawNum.length > 20 ? `INV-${rawNum.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : rawNum;

        const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>فاتورة ${record.invoiceNumber} - منصة الحلم</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cairo',Arial,sans-serif;background:#f1f5f9;color:#1e293b;padding:32px 16px}
    .wrap{max-width:720px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
    .top{background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:26px 32px;display:flex;justify-content:space-between;align-items:center}
    .brand{color:#fff}.brand h1{font-size:22px;font-weight:900;margin-bottom:4px}.brand p{font-size:12px;opacity:.8}
    .logo img{height:52px;object-fit:contain}
    .status-bar{background:#f8fafc;padding:13px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0}
    .inv-num{font-size:14px;font-weight:700;color:#1e293b}.inv-num span{color:#3b82f6;font-family:monospace}
    .badge{padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700;color:${stStyle.color};background:${stStyle.bg};border:1px solid ${stStyle.color}40}
    .body{padding:26px 32px}
    h2{font-size:14px;font-weight:700;color:#1e3a8a;margin:20px 0 10px;padding-right:10px;border-right:3px solid #3b82f6}
    table{width:100%;border-collapse:collapse;font-size:13px}
    tr:nth-child(even) th,tr:nth-child(even) td{background:#f8fafc}
    th{padding:10px 14px;text-align:right;font-weight:600;color:#475569;width:36%;border:1px solid #e2e8f0}
    td{padding:10px 14px;color:#1e293b;border:1px solid #e2e8f0}
    .amount-row td{font-size:20px;font-weight:900;color:#1e3a8a}
    .verify{margin:20px 0 0;padding:13px;background:#eff6ff;border-radius:10px;text-align:center;font-size:12px;color:#475569}
    .verify a{color:#2563eb;font-weight:600}
    .footer{padding:16px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8}
    .footer-brand{font-size:13px;font-weight:700;color:#1e3a8a}
    .no-print{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:999}
    .btn{background:#1e3a8a;color:#fff;border:none;padding:12px 26px;border-radius:12px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:14px}
    .btn-close{background:#f1f5f9;color:#475569}
    @media print{body{background:#fff;padding:0}.wrap{box-shadow:none;border-radius:0}.no-print{display:none!important}@page{margin:15mm 12mm}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div class="brand">
      <h1>فاتورة رسمية</h1>
      <p>منصة الحلم الرياضية — المركز المالي</p>
    </div>
    <div class="logo">
      <img src="${logoUrl}" alt="El7lm" onerror="this.style.display='none'"/>
    </div>
  </div>

  <div class="status-bar">
    <div class="inv-num">رقم الفاتورة: <span>${shortNum}</span></div>
    <div class="badge">${st.label}</div>
  </div>

  <div class="body">
    <h2>تفاصيل الفاتورة</h2>
    <table>
      <tr><th>الخدمة / الباقة</th><td>${record.planName || '—'}</td></tr>
      ${record.packageDuration ? `<tr><th>مدة الاشتراك</th><td>${record.packageDuration}</td></tr>` : ''}
      <tr><th>بوابة الدفع</th><td>${method}</td></tr>
      <tr><th>مصدر المعاملة</th><td>${src}</td></tr>
      ${refNum ? `<tr><th>الرقم المرجعي</th><td style="font-family:monospace">${refNum}</td></tr>` : ''}
      <tr><th>تاريخ الإنشاء</th><td>${formatDate(record.createdAt)}</td></tr>
      ${record.paidAt ? `<tr><th>تاريخ السداد</th><td>${formatDate(record.paidAt)}</td></tr>` : ''}
      ${record.subscriptionStart ? `<tr><th>بداية الاشتراك</th><td style="color:#16a34a;font-weight:700">${formatDate(record.subscriptionStart)}</td></tr>` : ''}
      ${record.subscriptionEnd ? `<tr><th>انتهاء الاشتراك</th><td style="color:#dc2626;font-weight:700">${formatDate(record.subscriptionEnd)}</td></tr>` : ''}
      ${(record.promoCode) ? `<tr><th>كود الخصم</th><td style="font-family:monospace;color:#7c3aed;font-weight:700">${record.promoCode}</td></tr>` : ''}
      ${(record.discountAmount && record.discountAmount > 0) ? `<tr><th>قيمة الخصم</th><td style="color:#059669;font-weight:700">- ${formatCurrency(record.discountAmount, record.currency)}</td></tr>` : ''}
      <tr class="amount-row"><th>المبلغ الإجمالي</th><td>${formatCurrency(record.amount, record.currency)}</td></tr>
    </table>

    <h2>بيانات العميل</h2>
    <table>
      <tr><th>الاسم</th><td>${record.customerName || 'غير محدد'}</td></tr>
      ${record.customerPhone ? `<tr><th>الهاتف</th><td>${record.customerPhone}</td></tr>` : ''}
      ${record.customerEmail ? `<tr><th>البريد الإلكتروني</th><td>${record.customerEmail}</td></tr>` : ''}
      ${record.country ? `<tr><th>الدولة</th><td>${getFlag(record.country)} ${record.country}</td></tr>` : ''}
    </table>

    <div class="verify">
      <p>رابط الفاتورة للتحقق أو المشاركة مع العميل:</p>
      <p style="margin-top:5px"><a href="${invoiceUrl}">${invoiceUrl}</a></p>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="footer-brand">منصة الحلم</div>
      <div>info@el7lm.com | www.el7lm.com</div>
    </div>
    <div style="text-align:center;color:#475569;font-size:12px">هذه فاتورة رسمية — لا تحتاج إلى توقيع أو ختم</div>
    <div style="text-align:left">طُبعت: ${printDate}</div>
  </div>
</div>

<div class="no-print">
  <button class="btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <button class="btn btn-close" onclick="window.close()">✕ إغلاق</button>
</div>
</body>
</html>`;
        const w = window.open('', '_blank', 'width=900,height=1000');
        if (w) { w.document.write(html); w.document.close(); w.focus(); }
        else toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
    };

    // --- Filters ---
    const filtered = useMemo(() => {
        return records.filter(r => {
            const term = search.toLowerCase();
            if (term && !r.invoiceNumber.toLowerCase().includes(term)
                && !(r.customerName || '').toLowerCase().includes(term)
                && !(r.customerPhone || '').includes(term)
                && !(r.customerEmail || '').toLowerCase().includes(term)) return false;
            if (activeTab !== 'all' && r.country !== activeTab) return false;
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
            if (dateRange?.[0] && r.createdAt < dateRange[0].toDate()) return false;
            if (dateRange?.[1] && r.createdAt > dateRange[1].toDate()) return false;
            return true;
        });
    }, [records, search, statusFilter, sourceFilter, dateRange, activeTab]);

    // --- Stats: مجمعة بالعملة ---
    const stats = useMemo(() => {
        const byCurrency: Record<string, number> = {};
        filtered.forEach(r => {
            if (r.status === 'paid') byCurrency[r.currency] = (byCurrency[r.currency] || 0) + r.amount;
        });
        return {
            byCurrency,
            count:   filtered.length,
            paid:    filtered.filter(r => r.status === 'paid').length,
            pending: filtered.filter(r => r.status === 'pending' || r.status === 'pending_review').length,
            unique:  new Set(filtered.map(r => r.customerId || r.customerEmail).filter(Boolean)).size,
        };
    }, [filtered]);

    // --- Table Columns ---
    const columns: ColumnsType<InvoiceRecord> = [
        {
            title: 'الفاتورة',
            key: 'invoice',
            width: 160,
            render: (_, r) => (
                <Space>
                    <span style={{ fontSize: 20 }}>{getFlag(r.country)}</span>
                    <div>
                        <Text strong style={{ fontFamily: 'monospace', display: 'block', fontSize: 12 }}>#{r.invoiceNumber}</Text>
                        <Tag style={{ fontSize: 10, marginTop: 2 }}>{SOURCE_LABELS[r.source] || r.source}</Tag>
                    </div>
                </Space>
            ),
        },
        {
            title: 'العميل',
            key: 'customer',
            render: (_, r) => {
                const imgUrl = resolveImageUrl(r.customerImage);
                const initials = (r.customerName && r.customerName !== 'غير محدد')
                    ? r.customerName[0].toUpperCase() : '?';
                return (
                    <Space>
                        <Avatar size={36} src={imgUrl || undefined}
                            style={{ borderRadius: 8, background: imgUrl ? undefined : '#e0e7ff', color: '#4f46e5', fontWeight: 900 }}
                            onError={() => true}>
                            {!imgUrl ? initials : undefined}
                        </Avatar>
                        <div>
                            <Text strong style={{ display: 'block', maxWidth: 130 }} ellipsis>{r.customerName}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{r.customerPhone || r.customerEmail || '—'}</Text>
                        </div>
                    </Space>
                );
            },
        },
        {
            title: 'المبلغ',
            key: 'amount',
            sorter: (a, b) => a.amount - b.amount,
            width: 130,
            render: (_, r) => (
                <div>
                    <Text strong style={{ fontSize: 14, display: 'block' }}>{formatCurrency(r.amount, r.currency)}</Text>
                    {r.planName && <Text type="secondary" style={{ fontSize: 11 }}><StarOutlined style={{ color: '#f59e0b' }} /> {r.planName}</Text>}
                </div>
            ),
        },
        {
            title: 'الدفع',
            key: 'method',
            width: 120,
            render: (_, r) => {
                const m = METHOD_DETAILS[r.paymentMethod] || METHOD_DETAILS[r.source] || { label: r.paymentMethod, color: 'default' };
                return <Tag color={m.color} style={{ fontSize: 11 }}>{m.label}</Tag>;
            },
        },
        {
            title: 'الحالة',
            key: 'status',
            width: 130,
            filters: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
            onFilter: (value, r) => r.status === value,
            render: (_, r) => {
                const s = STATUS_CONFIG[r.status] || { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        {
            title: 'التاريخ',
            key: 'date',
            width: 110,
            sorter: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
            defaultSortOrder: 'descend',
            render: (_, r) => (
                <div>
                    <Text style={{ display: 'block', fontSize: 12 }}>{formatDate(r.createdAt)}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.createdAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</Text>
                </div>
            ),
        },
        {
            title: 'فترة الاشتراك',
            key: 'subscription',
            width: 160,
            render: (_, r) => {
                if (!r.subscriptionStart && !r.subscriptionEnd) {
                    return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                }
                const now = Date.now();
                const isActive = r.subscriptionEnd && r.subscriptionEnd.getTime() > now;
                const daysLeft = r.subscriptionEnd
                    ? Math.ceil((r.subscriptionEnd.getTime() - now) / 86400000)
                    : null;
                return (
                    <div>
                        {r.subscriptionStart && (
                            <Text style={{ display: 'block', fontSize: 11 }}>
                                <span style={{ color: '#16a34a', fontWeight: 600 }}>▶</span> {formatDate(r.subscriptionStart)}
                            </Text>
                        )}
                        {r.subscriptionEnd && (
                            <Text style={{ display: 'block', fontSize: 11 }}>
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>■</span> {formatDate(r.subscriptionEnd)}
                            </Text>
                        )}
                        {daysLeft !== null && (
                            <Tag
                                color={isActive ? (daysLeft <= 7 ? 'orange' : 'green') : 'red'}
                                style={{ fontSize: 10, marginTop: 2, padding: '0 5px' }}
                            >
                                {isActive ? `${daysLeft} يوم` : 'منتهي'}
                            </Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: '',
            key: 'actions',
            width: 80,
            render: (_, r) => (
                <Space size={4}>
                    <Tooltip title="واتساب مباشر">
                        <Button type="text" size="small" icon={<WhatsAppOutlined style={{ color: '#25D366' }} />}
                            onClick={e => { e.stopPropagation(); openWhatsApp(r.customerPhone); }} />
                    </Tooltip>
                    <Tooltip title="تفاصيل">
                        <Button type="text" size="small" icon={<EyeOutlined style={{ color: '#4f46e5' }} />}
                            onClick={e => { e.stopPropagation(); setSelectedRecord(r); }} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <ConfigProvider direction="rtl" locale={arEG} theme={ANTD_THEME}>
            <div style={{ padding: '24px 32px', background: '#f8fafc', minHeight: '100vh' }}>

                {/* ─── Header ──────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                    <Space align="center">
                        <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #1e40af, #4f46e5)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BankOutlined style={{ color: '#fff', fontSize: 22 }} />
                        </div>
                        <div>
                            <Title level={3} style={{ margin: 0, fontWeight: 900 }}>المركز المالي</Title>
                            <Text type="secondary">إدارة الفواتير والعمليات المالية — {records.length} سجل</Text>
                        </div>
                    </Space>
                    <Space>
                        <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>تحديث</Button>
                        <Button icon={<ExportOutlined />} onClick={() => exportToCSV(filtered)}>تصدير CSV</Button>
                        <Button icon={<PrinterOutlined />} type="primary" onClick={() => {
                            const now = new Date();
                            const printDate = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const totalByCurrency: Record<string, number> = {};
                            filtered.forEach(r => { if (r.status === 'paid') totalByCurrency[r.currency] = (totalByCurrency[r.currency] || 0) + r.amount; });
                            const revenueRows = Object.entries(totalByCurrency).map(([c, t]) => `<span style="margin-left:16px;font-weight:700">${formatCurrency(t, c)}</span>`).join('') || '<span>—</span>';
                            const paidCount = filtered.filter(r => r.status === 'paid').length;
                            const pendingCount = filtered.filter(r => r.status === 'pending' || r.status === 'pending_review').length;
                            const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>كشف الفواتير - منصة الحلم</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cairo',Arial,sans-serif;background:#fff;color:#1e293b;font-size:13px}
    .page{max-width:1100px;margin:0 auto;padding:32px}
    /* ── HEADER ── */
    .header{background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#fff;padding:24px 32px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center}
    .header-brand h1{font-size:24px;font-weight:900;margin-bottom:4px}
    .header-brand p{font-size:12px;opacity:.8}
    .header-logo img{height:48px;object-fit:contain}
    .header-meta{text-align:left;font-size:12px;opacity:.9;line-height:1.8}
    /* ── SUMMARY ── */
    .summary{display:flex;gap:12px;background:#f8fafc;padding:16px 32px;border:1px solid #e2e8f0;border-top:none}
    .summary-card{flex:1;text-align:center;padding:12px 8px;background:#fff;border-radius:10px;border:1px solid #e2e8f0}
    .summary-card .val{font-size:20px;font-weight:900}
    .summary-card .lbl{font-size:11px;color:#64748b;margin-top:2px}
    .val-green{color:#059669}.val-yellow{color:#d97706}.val-blue{color:#1e3a8a}.val-purple{color:#7c3aed}
    /* ── FILTERS INFO ── */
    .filter-info{background:#eff6ff;padding:10px 32px;font-size:12px;color:#1e3a8a;border:1px solid #bfdbfe;border-top:none}
    /* ── TABLE ── */
    .table-wrap{border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;overflow:hidden}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#1e3a8a}
    thead th{color:#fff;padding:11px 14px;text-align:right;font-size:12px;font-weight:700}
    tbody tr:nth-child(even){background:#f8fafc}
    tbody tr:hover{background:#eff6ff}
    tbody td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:middle}
    .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700}
    .badge-paid{color:#059669;background:#dcfce7;border:1px solid #86efac}
    .badge-pending{color:#d97706;background:#fef3c7;border:1px solid #fcd34d}
    .badge-review{color:#2563eb;background:#dbeafe;border:1px solid #93c5fd}
    .badge-cancelled{color:#6b7280;background:#f3f4f6;border:1px solid #d1d5db}
    .num{font-family:monospace;font-size:11px;color:#475569}
    .amount{font-weight:700;color:#1e3a8a}
    /* ── FOOTER ── */
    .footer{margin-top:24px;display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-top:2px solid #e2e8f0;font-size:11px;color:#94a3b8}
    .footer-brand{font-weight:700;color:#1e3a8a;font-size:13px}
    .no-print{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:999}
    .btn{background:#1e3a8a;color:#fff;border:none;padding:12px 28px;border-radius:12px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:14px}
    .btn-close{background:#f1f5f9;color:#475569}
    @media print{.no-print{display:none!important}body{background:#fff}@page{margin:16mm 12mm;size:A4 landscape}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-brand">
      <h1>كشف الفواتير الإداري</h1>
      <p>منصة الحلم الرياضية — المركز المالي</p>
    </div>
    <div class="header-logo">
      <img src="${window.location.origin}/el7lm-logo.png" alt="El7lm" onerror="this.style.display='none'"/>
    </div>
    <div class="header-meta">
      <div>📅 تاريخ الطباعة: ${printDate}</div>
      <div>📊 عدد السجلات: ${filtered.length}</div>
      <div>💰 الإيرادات المحصلة: ${revenueRows}</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="val val-blue">${filtered.length}</div><div class="lbl">إجمالي السجلات</div></div>
    <div class="summary-card"><div class="val val-green">${paidCount}</div><div class="lbl">مدفوع</div></div>
    <div class="summary-card"><div class="val val-yellow">${pendingCount}</div><div class="lbl">قيد المراجعة</div></div>
    <div class="summary-card"><div class="val val-purple">${new Set(filtered.map(r => r.customerId || r.customerEmail).filter(Boolean)).size}</div><div class="lbl">عملاء فريدون</div></div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>رقم الفاتورة</th>
          <th>العميل</th>
          <th>الهاتف</th>
          <th>الباقة</th>
          <th>المبلغ</th>
          <th>الحالة</th>
          <th>تاريخ الفاتورة</th>
          <th>بداية الاشتراك</th>
          <th>انتهاء الاشتراك</th>
          <th>الأيام المتبقية</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((r, i) => {
            const st = r.status === 'paid' ? 'badge-paid' : r.status === 'pending_review' ? 'badge-review' : r.status === 'cancelled' ? 'badge-cancelled' : 'badge-pending';
            const stLabel = STATUS_CONFIG[r.status]?.label || r.status;
            const daysLeft = r.subscriptionEnd ? Math.ceil((r.subscriptionEnd.getTime() - Date.now()) / 86400000) : null;
            const daysStyle = daysLeft === null ? 'color:#94a3b8' : daysLeft <= 0 ? 'color:#dc2626;font-weight:700' : daysLeft <= 30 ? 'color:#d97706;font-weight:700' : 'color:#16a34a;font-weight:700';
            const daysText = daysLeft === null ? '—' : daysLeft <= 0 ? 'منتهي' : `${daysLeft} يوم`;
            return `<tr>
              <td style="color:#94a3b8">${i + 1}</td>
              <td class="num">${r.invoiceNumber}</td>
              <td><strong>${r.customerName || '—'}</strong>${r.customerEmail ? `<br/><span style="color:#94a3b8;font-size:10px">${r.customerEmail}</span>` : ''}</td>
              <td>${r.customerPhone || '—'}</td>
              <td>${r.planName || '—'}</td>
              <td class="amount">${formatCurrency(r.amount, r.currency)}</td>
              <td><span class="badge ${st}">${stLabel}</span></td>
              <td>${formatDate(r.createdAt)}</td>
              <td style="color:#16a34a;font-weight:600">${r.subscriptionStart ? formatDate(r.subscriptionStart) : '—'}</td>
              <td style="color:#dc2626;font-weight:600">${r.subscriptionEnd ? formatDate(r.subscriptionEnd) : '—'}</td>
              <td style="${daysStyle}">${daysText}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div>
      <div class="footer-brand">منصة الحلم الرياضية</div>
      <div>info@el7lm.com | www.el7lm.com</div>
    </div>
    <div style="text-align:center;color:#475569">
      هذا الكشف سري وللاستخدام الداخلي فقط
    </div>
    <div style="text-align:left">
      <div>صفحة 1 من 1</div>
      <div>طُبع بتاريخ: ${printDate}</div>
    </div>
  </div>
</div>

<div class="no-print">
  <button class="btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <button class="btn btn-close" onclick="window.close()">✕ إغلاق</button>
</div>
</body>
</html>`;
                            const w = window.open('', '_blank', 'width=1200,height=900');
                            if (w) { w.document.write(html); w.document.close(); w.focus(); }
                            else toast.error('يرجى السماح بالنوافذ المنبثقة');
                        }}>طباعة الكشف</Button>
                    </Space>
                </div>

                {/* ─── Stats ───────────────────────────────────────── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {/* الإيرادات مجمعة بالعملة */}
                    <Col xs={24} sm={10}>
                        <Card bordered={false} style={{ borderRadius: 16, background: '#0f172a', boxShadow: '0 4px 20px rgba(15,23,42,0.2)', height: '100%' }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>الإيرادات المحصلة (مدفوعة)</Text>
                            {Object.keys(stats.byCurrency).length === 0 ? (
                                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>—</Text>
                            ) : (
                                Object.entries(stats.byCurrency).map(([curr, total]) => (
                                    <div key={curr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>{getFlag(inferCountry({}, curr))} {curr}</Text>
                                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>{formatCurrency(total, curr)}</Text>
                                    </div>
                                ))
                            )}
                        </Card>
                    </Col>
                    <Col xs={12} sm={5}>
                        <Card bordered={false} style={{ borderRadius: 16 }}>
                            <Statistic title="العمليات المدفوعة" value={stats.paid}
                                suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {stats.count}</Text>}
                                prefix={<CheckCircleOutlined style={{ color: '#059669' }} />}
                                valueStyle={{ color: '#059669', fontWeight: 900 }} />
                            <Progress percent={stats.count ? Math.round((stats.paid / stats.count) * 100) : 0}
                                showInfo={false} strokeColor="#059669" size="small" style={{ marginTop: 8 }} />
                        </Card>
                    </Col>
                    <Col xs={12} sm={5}>
                        <Card bordered={false} style={{ borderRadius: 16 }}>
                            <Statistic title="قيد المراجعة" value={stats.pending}
                                prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
                                valueStyle={{ color: '#f59e0b', fontWeight: 900 }} />
                            <Text type="secondary" style={{ fontSize: 11 }}>تتطلب تدخل فوري</Text>
                        </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                        <Card bordered={false} style={{ borderRadius: 16, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', height: '100%' }}>
                            <Statistic title={<Text style={{ color: '#c4b5fd', fontSize: 11 }}>المستخدمون الفريدون</Text>}
                                value={stats.unique}
                                prefix={<TeamOutlined style={{ color: '#fff' }} />}
                                valueStyle={{ color: '#fff', fontWeight: 900 }} />
                        </Card>
                    </Col>
                </Row>

                {/* ─── Filters + Country Tabs ───────────────────────── */}
                <Card bordered={false} style={{ borderRadius: 16, marginBottom: 20 }}>
                    <Tabs activeKey={activeTab} onChange={setActiveTab}
                        items={[
                            { key: 'all', label: `🌍 الكل (${records.length})` },
                            { key: 'EG',  label: `🇪🇬 مصر (${records.filter(r => r.country === 'EG').length})` },
                            { key: 'QA',  label: `🇶🇦 قطر (${records.filter(r => r.country === 'QA').length})` },
                            { key: 'SA',  label: `🇸🇦 السعودية (${records.filter(r => r.country === 'SA').length})` },
                            { key: 'KW',  label: `🇰🇼 الكويت (${records.filter(r => r.country === 'KW').length})` },
                            { key: 'IQ',  label: `🇮🇶 العراق (${records.filter(r => r.country === 'IQ').length})` },
                        ]}
                    />
                    <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                        <Col xs={24} sm={8}>
                            <Input prefix={<SearchOutlined />} placeholder="ابحث بالاسم / رقم الفاتورة / الهاتف / الإيميل..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear />
                        </Col>
                        <Col xs={12} sm={4}>
                            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: '100%' }}>
                                <Select.Option value="all">كل الحالات</Select.Option>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <Select.Option key={k} value={k}>{v.label}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={12} sm={4}>
                            <Select value={sourceFilter} onChange={setSourceFilter} style={{ width: '100%' }}>
                                <Select.Option value="all">كل المصادر</Select.Option>
                                {COLLECTIONS.map(c => (
                                    <Select.Option key={c.name} value={c.name}>{c.label}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={6}>
                            <RangePicker value={dateRange as any} onChange={v => setDateRange(v as any)}
                                placeholder={['من تاريخ', 'إلى تاريخ']} style={{ width: '100%' }} />
                        </Col>
                        <Col xs={24} sm={2}>
                            <Button icon={<ReloadOutlined />} style={{ width: '100%' }}
                                onClick={() => { setStatusFilter('all'); setSourceFilter('all'); setDateRange(null); setSearch(''); setActiveTab('all'); }} />
                        </Col>
                    </Row>
                </Card>

                {/* ─── Payments Table ──────────────────────────────── */}
                <Card bordered={false} style={{ borderRadius: 16 }}>
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey={r => `${r.source}-${r.id}`}
                        loading={loading}
                        size="middle"
                        onRow={record => ({ onClick: () => setSelectedRecord(record), style: { cursor: 'pointer' } })}
                        locale={{ emptyText: <Empty description="لا توجد فواتير مطابقة" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        pagination={{ pageSize: 20, showTotal: total => `${total} فاتورة`, showSizeChanger: true, pageSizeOptions: ['20', '50', '100', '200'] }}
                        scroll={{ x: 900 }}
                        footer={() => (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                عرض <strong>{filtered.length}</strong> من إجمالي <strong>{records.length}</strong> فاتورة
                                {filtered.length !== records.length && <> — <Text type="warning" style={{ fontSize: 12 }}>الفلاتر نشطة</Text></>}
                            </Text>
                        )}
                    />
                </Card>
                {/* ─── Detail Drawer ───────────────────────────────── */}
                <Drawer open={!!selectedRecord} onClose={() => setSelectedRecord(null)}
                    placement="left" width={480} styles={{ body: { padding: 0 } }} title={null} closeIcon={null}>
                    {selectedRecord && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Banner */}
                            <div style={{ height: 90, background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
                                <div>
                                    <Text style={{ color: '#fff', fontWeight: 900, fontSize: 15, display: 'block' }}>تفاصيل الفاتورة</Text>
                                    <Text style={{ color: '#93c5fd', fontSize: 12 }}>#{selectedRecord.invoiceNumber}</Text>
                                </div>
                                <Space>
                                    <Tag color={(STATUS_CONFIG[selectedRecord.status] || STATUS_CONFIG.pending).color}>
                                        {(STATUS_CONFIG[selectedRecord.status] || STATUS_CONFIG.pending).label}
                                    </Tag>
                                    <Button type="text" onClick={() => setSelectedRecord(null)} style={{ color: '#fff', fontSize: 18, lineHeight: 1 }}>✕</Button>
                                </Space>
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                                {/* Customer */}
                                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                    <Avatar size={76}
                                        src={resolveImageUrl(selectedRecord.customerImage) || undefined}
                                        style={{ borderRadius: 18, background: '#e0e7ff', color: '#4f46e5', fontWeight: 900, fontSize: 28, marginBottom: 10 }}
                                        onError={() => true}>
                                        {!resolveImageUrl(selectedRecord.customerImage)
                                            ? ((selectedRecord.customerName && selectedRecord.customerName !== 'غير محدد') ? selectedRecord.customerName[0].toUpperCase() : '?')
                                            : undefined}
                                    </Avatar>
                                    <Title level={4} style={{ margin: '0 0 2px' }}>{selectedRecord.customerName}</Title>
                                    <Space size={4}>
                                        {selectedRecord.customerPhone && (
                                            <Text type="secondary" style={{ fontSize: 13 }}>{selectedRecord.customerPhone}</Text>
                                        )}
                                        {selectedRecord.customerId && (
                                            <Tooltip title="فتح الملف الشخصي">
                                                <Button type="link" size="small" icon={<LinkOutlined />}
                                                    href={`/dashboard/shared/player-profile/${selectedRecord.customerId}`}
                                                    target="_blank" style={{ padding: 0, fontSize: 12 }}>
                                                    الملف الشخصي
                                                </Button>
                                            </Tooltip>
                                        )}
                                    </Space>
                                    {selectedRecord.customerEmail && (
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{selectedRecord.customerEmail}</Text>
                                    )}
                                </div>

                                {/* Amount + Plan */}
                                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                                    <Row justify="space-between" align="middle">
                                        <Col>
                                            <Text style={{ color: '#c4b5fd', fontSize: 11, display: 'block' }}>المبلغ المدفوع</Text>
                                            <Text style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>{formatCurrency(selectedRecord.amount, selectedRecord.currency)}</Text>
                                        </Col>
                                        <Col style={{ textAlign: 'left' }}>
                                            <Text style={{ color: '#c4b5fd', fontSize: 11, display: 'block' }}>خطة الاشتراك</Text>
                                            <Text style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{selectedRecord.planName || '—'}</Text>
                                            <Text style={{ color: '#a5b4fc', fontSize: 12, display: 'block' }}>{selectedRecord.packageDuration || ''}</Text>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Details */}
                                <Card size="small" bordered={false} style={{ background: '#f8fafc', borderRadius: 12, marginBottom: 16 }}>
                                    {[
                                        { label: 'رقم المرجع', value: selectedRecord.invoiceNumber, mono: true },
                                        { label: 'مصدر الدفع', value: SOURCE_LABELS[selectedRecord.source] || selectedRecord.source },
                                        { label: 'بوابة الدفع', value: METHOD_DETAILS[selectedRecord.paymentMethod]?.label || selectedRecord.paymentMethod },
                                        { label: 'تاريخ الإنشاء', value: formatDate(selectedRecord.createdAt) },
                                        { label: 'تاريخ الدفع', value: formatDate(selectedRecord.paidAt) },
                                        { label: 'معرف المعاملة', value: selectedRecord.reference.transactionId || selectedRecord.reference.orderId, mono: true },
                                    ].filter(item => item.value && item.value !== '—' && item.value !== '-').map((item, i, arr) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                                            <Space size={4}>
                                                <Text strong style={{ fontSize: 12, fontFamily: item.mono ? 'monospace' : 'inherit' }}>{item.value}</Text>
                                                {item.mono && item.value && (
                                                    <Button type="text" size="small" icon={<CopyOutlined />}
                                                        onClick={() => { navigator.clipboard.writeText(item.value!); toast.success('تم النسخ'); }}
                                                        style={{ padding: 0, height: 'auto', color: '#9ca3af' }} />
                                                )}
                                            </Space>
                                        </div>
                                    ))}
                                </Card>

                                {/* فترة الاشتراك */}
                                {(selectedRecord.subscriptionStart || selectedRecord.subscriptionEnd) && (
                                    <Card size="small" bordered={false} style={{ background: '#f0fdf4', borderRadius: 12, marginBottom: 16, border: '1px solid #bbf7d0' }}>
                                        <Text style={{ fontSize: 12, fontWeight: 700, color: '#15803d', display: 'block', marginBottom: 8 }}>📅 فترة الاشتراك</Text>
                                        {[
                                            { label: 'تاريخ التفعيل', value: formatDate(selectedRecord.subscriptionStart) },
                                            { label: 'تاريخ الانتهاء', value: formatDate(selectedRecord.subscriptionEnd) },
                                            ...(selectedRecord.subscriptionEnd ? [{
                                                label: 'الأيام المتبقية',
                                                value: (() => {
                                                    const diff = Math.ceil((selectedRecord.subscriptionEnd!.getTime() - Date.now()) / 86400000);
                                                    return diff > 0 ? `${diff} يوم` : 'منتهي';
                                                })(),
                                            }] : []),
                                            ...(selectedRecord.subscriptionStatus ? [{ label: 'حالة الاشتراك', value: selectedRecord.subscriptionStatus === 'active' ? 'نشط ✅' : selectedRecord.subscriptionStatus }] : []),
                                        ].filter(x => x.value && x.value !== 'غير محدد').map((item, i, arr) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid #dcfce7' : 'none' }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                                                <Text strong style={{ fontSize: 12 }}>{item.value}</Text>
                                            </div>
                                        ))}
                                    </Card>
                                )}

                                {/* خصم وبرومو كود */}
                                {(selectedRecord.promoCode || selectedRecord.discountAmount || selectedRecord.discountPercent) && (
                                    <Card size="small" bordered={false} style={{ background: '#fffbeb', borderRadius: 12, marginBottom: 16, border: '1px solid #fde68a' }}>
                                        <Text style={{ fontSize: 12, fontWeight: 700, color: '#b45309', display: 'block', marginBottom: 8 }}>🎟️ خصم / برومو كود</Text>
                                        {[
                                            ...(selectedRecord.promoCode ? [{ label: 'كود الخصم', value: selectedRecord.promoCode, mono: true }] : []),
                                            ...(selectedRecord.discountPercent ? [{ label: 'نسبة الخصم', value: `${selectedRecord.discountPercent}%` }] : []),
                                            ...(selectedRecord.discountAmount ? [{ label: 'قيمة الخصم', value: formatCurrency(selectedRecord.discountAmount, selectedRecord.currency) }] : []),
                                            ...(selectedRecord.originalAmount ? [{ label: 'السعر قبل الخصم', value: formatCurrency(selectedRecord.originalAmount, selectedRecord.currency) }] : []),
                                        ].map((item: any, i, arr) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid #fef3c7' : 'none' }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                                                <Space size={4}>
                                                    <Text strong style={{ fontSize: 12, fontFamily: item.mono ? 'monospace' : 'inherit', color: '#b45309' }}>{item.value}</Text>
                                                    {item.mono && (
                                                        <Button type="text" size="small" icon={<CopyOutlined />}
                                                            onClick={() => { navigator.clipboard.writeText(item.value); toast.success('تم النسخ'); }}
                                                            style={{ padding: 0, height: 'auto', color: '#9ca3af' }} />
                                                    )}
                                                </Space>
                                            </div>
                                        ))}
                                    </Card>
                                )}

                                {/* ملاحظات الرفض */}
                                {selectedRecord.notes && selectedRecord.status === 'cancelled' && (
                                    <Card size="small" bordered={false} style={{ background: '#fef2f2', borderRadius: 12, marginBottom: 16 }}>
                                        <Text type="danger" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>سبب الإلغاء</Text>
                                        <Text style={{ fontSize: 13 }}>{selectedRecord.notes}</Text>
                                    </Card>
                                )}

                                {/* إيصال الدفع */}
                                {selectedRecord.receiptUrl && (
                                    <div style={{ marginBottom: 16 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>إيصال الدفع المرفق</Text>
                                        <div style={{ borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #e5e7eb' }}
                                            onClick={() => setPreviewUrl(resolveImageUrl(selectedRecord.receiptUrl))}>
                                            <img src={resolveImageUrl(selectedRecord.receiptUrl)!}
                                                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ─── Footer Actions ─── */}
                            <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Row gutter={8}>
                                    <Col span={8}>
                                        <Button icon={<PrinterOutlined />} block onClick={() => handlePrint(selectedRecord)}>طباعة</Button>
                                    </Col>
                                    <Col span={8}>
                                        <Button icon={<WhatsAppOutlined />} block
                                            style={{ background: '#25D366', color: '#fff', border: 'none' }}
                                            onClick={() => openWhatsApp(selectedRecord.customerPhone)}>
                                            واتساب
                                        </Button>
                                    </Col>
                                    <Col span={8}>
                                        <Button icon={<WhatsAppOutlined />} block loading={isSendingWhatsApp}
                                            style={{ background: '#128C7E', color: '#fff', border: 'none' }}
                                            onClick={() => sendWhatsAppReminder(selectedRecord)}>
                                            تذكير
                                        </Button>
                                    </Col>
                                </Row>

                                {/* تفعيل — يظهر فقط لغير المدفوعة */}
                                {selectedRecord.status !== 'paid' && (
                                    <Button type="primary" block size="large" loading={isActivating}
                                        icon={<CheckCircleOutlined />}
                                        onClick={() => activateSubscription(selectedRecord)}
                                        style={{ borderRadius: 12, fontWeight: 900, height: 50 }}>
                                        تفعيل العضوية فوراً
                                    </Button>
                                )}

                                {/* إعادة تفعيل — للمدفوعة */}
                                {selectedRecord.status === 'paid' && (
                                    <Button block size="large" loading={isActivating}
                                        icon={<CheckCircleOutlined />}
                                        onClick={() => activateSubscription(selectedRecord)}
                                        style={{ borderRadius: 12, fontWeight: 700, height: 50 }}>
                                        إعادة تفعيل الاشتراك
                                    </Button>
                                )}

                                {/* إلغاء — لغير الملغية */}
                                {selectedRecord.status !== 'cancelled' && (
                                    <Button block danger disabled={isActivating || isCancelling}
                                        icon={<CloseCircleOutlined />}
                                        onClick={() => setRejectOpen(true)}
                                        style={{ borderRadius: 12 }}>
                                        {selectedRecord.status === 'paid' ? 'إلغاء / استرداد' : 'رفض الطلب'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Drawer>

                {/* ─── Receipt Preview Modal ──────────────────────── */}
                <Modal open={!!previewUrl} onCancel={() => setPreviewUrl(null)} footer={null}
                    width={820} styles={{ body: { padding: 0, background: '#000', borderRadius: 12 } }} title={null}>
                    {previewUrl && (
                        <div style={{ position: 'relative', textAlign: 'center', padding: 16 }}>
                            <Space style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                                <Button size="small" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}
                                    icon={<ExportOutlined />} onClick={() => window.open(previewUrl, '_blank')}>فتح</Button>
                                <Button size="small" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}
                                    icon={<DownloadOutlined />} onClick={() => { const a = document.createElement('a'); a.href = previewUrl; a.download = 'receipt'; a.click(); }} />
                            </Space>
                            <img src={previewUrl} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />
                            {selectedRecord && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                    <Text style={{ color: '#fff', fontWeight: 700 }}>{selectedRecord.customerName}</Text>
                                    <Text style={{ color: '#60a5fa', fontWeight: 900, fontSize: 16 }}>{formatCurrency(selectedRecord.amount, selectedRecord.currency)}</Text>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>

                {/* ─── Cancel / Refund Modal ─────────────────────── */}
                {selectedRecord && (
                <Modal
                    open={rejectOpen}
                    onCancel={() => { setRejectOpen(false); setRejectionReason(''); }}
                    onOk={() => cancelInvoice(selectedRecord)}
                    okText={selectedRecord.status === 'paid' ? 'تأكيد الاسترداد' : 'تأكيد الإلغاء'}
                    cancelText="تراجع"
                    okButtonProps={{ danger: true, loading: isCancelling, disabled: !rejectionReason.trim() }}
                    title={
                        <Space>
                            <CloseCircleOutlined style={{ color: '#dc2626' }} />
                            {selectedRecord.status === 'paid' ? 'استرداد المبلغ وإيقاف الاشتراك' : 'إلغاء الفاتورة'}
                        </Space>
                    }
                    destroyOnClose>

                    {selectedRecord.status === 'paid' ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                            <Text type="danger" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>⚠️ تحذير — هذا الإجراء سيقوم بـ:</Text>
                            <ul style={{ margin: 0, paddingRight: 20, color: '#dc2626', fontSize: 13, lineHeight: 2 }}>
                                <li>تغيير حالة الفاتورة إلى <strong>مسترد</strong></li>
                                <li>إيقاف الاشتراك النشط للعميل فوراً</li>
                                <li>تغيير حالة الحساب إلى <strong>غير مشترك</strong></li>
                            </ul>
                        </div>
                    ) : (
                        <p style={{ color: '#6b7280', marginBottom: 12 }}>
                            سيتم إلغاء الفاتورة وحفظ السبب في السجل.
                        </p>
                    )}

                    <Text style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                        {selectedRecord.status === 'paid' ? 'سبب الاسترداد *' : 'سبب الإلغاء *'}
                    </Text>
                    <TextArea
                        rows={4}
                        placeholder={selectedRecord.status === 'paid'
                            ? 'مثال: طلب العميل استرداد المبلغ، أو تم الدفع مرتين...'
                            : 'مثال: الإيصال غير واضح، أو المبلغ لا يتطابق مع سعر الباقة...'}
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                    />
                </Modal>
                )}

            </div>
        </ConfigProvider>
    );
}
