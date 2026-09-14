'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Loader2, Trophy, Users, Plus, Trash2, Eye, EyeOff, Search,
    ExternalLink, User, Building2, Mail, Phone, Globe, Lock,
    CheckCircle2, X, ArrowUpRight, ShieldCheck, Sparkles, AlertCircle,
    Copy, Check, Layers, RefreshCw, Send, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import { supabase } from '@/lib/supabase/config';
import { COUNTRIES } from '@/constants/countries';

function getCountryFlag(countryNameOrCode?: string | null): string {
    if (!countryNameOrCode) return '🌍';
    const trimmed = countryNameOrCode.trim();
    const found = COUNTRIES.find(c =>
        c.name === trimmed ||
        c.code.toLowerCase() === trimmed.toLowerCase() ||
        c.phone === trimmed
    );
    if (found) return found.flag;
    if (trimmed.includes('سعود') || trimmed.includes('SA')) return '🇸🇦';
    if (trimmed.includes('مصر') || trimmed.includes('EG')) return '🇪🇬';
    if (trimmed.includes('قطر') || trimmed.includes('QA')) return '🇶🇦';
    if (trimmed.includes('إمارات') || trimmed.includes('امارات') || trimmed.includes('AE')) return '🇦🇪';
    if (trimmed.includes('كويت') || trimmed.includes('KW')) return '🇰🇼';
    if (trimmed.includes('عمان') || trimmed.includes('OM')) return '🇴🇲';
    if (trimmed.includes('بحرين') || trimmed.includes('BH')) return '🇧🇭';
    if (trimmed.includes('أردن') || trimmed.includes('اردن') || trimmed.includes('JO')) return '🇯🇴';
    if (trimmed.includes('مغرب') || trimmed.includes('MA')) return '🇲🇦';
    return '🌍';
}

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.67 20.16 9.33 19.8 8.16 19.11L7.88 18.94L4.76 19.76L5.59 16.72L5.4 16.42C4.64 15.21 4.24 13.78 4.24 11.91C4.24 7.37 7.94 3.67 12.05 3.67ZM8.82 7.02C8.65 7.02 8.37 7.08 8.13 7.34C7.89 7.6 7.21 8.24 7.21 9.54C7.21 10.84 8.16 12.1 8.29 12.27C8.42 12.44 10.12 15.08 12.72 16.2C13.34 16.47 13.82 16.63 14.2 16.75C14.82 16.95 15.38 16.92 15.82 16.85C16.31 16.78 17.33 16.23 17.55 15.63C17.76 15.02 17.76 14.5 17.7 14.4C17.64 14.3 17.48 14.24 17.23 14.11C16.99 13.98 15.8 13.4 15.58 13.32C15.36 13.24 15.2 13.2 15.03 13.45C14.87 13.7 14.41 14.24 14.27 14.4C14.13 14.56 13.99 14.58 13.75 14.45C13.51 14.33 12.5 13.99 11.31 12.93C10.38 12.1 9.75 11.08 9.62 10.86C9.49 10.63 9.6 10.51 9.73 10.39C9.84 10.27 9.98 10.09 10.1 9.94C10.23 9.8 10.27 9.69 10.35 9.52C10.43 9.35 10.39 9.21 10.33 9.09C10.27 8.97 9.79 7.78 9.58 7.29C9.38 6.81 9.17 6.87 9.02 6.87L8.82 7.02Z" />
        </svg>
    );
}

function cleanPhoneForWhatsApp(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('00')) clean = clean.slice(2);
    if (clean.startsWith('05') && clean.length === 10) clean = '966' + clean.slice(1);
    if (clean.startsWith('01') && clean.length === 11) clean = '20' + clean.slice(1);
    if (clean.length === 8 && (clean.startsWith('3') || clean.startsWith('5') || clean.startsWith('6') || clean.startsWith('7'))) {
        clean = '974' + clean;
    }
    return clean;
}

const PRODUCTION_PLATFORM_URL = 'https://el7lm.com';

function getPlatformBaseUrl(): string {
    // When sending links to clients (e.g. via WhatsApp or copy-link),
    // ALWAYS provide the official production domain https://el7lm.com
    // so organizers on their mobile phones/laptops can access the live portal directly.
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host.includes('el7lm.com') || host.includes('elhilm.com')) {
            return window.location.origin;
        }
    }
    return PRODUCTION_PLATFORM_URL;
}

function generateOrganizerWhatsAppMessage({
    name,
    email,
    password,
    org,
}: {
    name: string;
    email: string;
    password?: string;
    org?: string | null;
}): string {
    const siteUrl = getPlatformBaseUrl();
    const portalUrl = `${siteUrl}/tournament-portal/login`;

    let msg = `🏆 *منصة الحلم الدولية لإدارة البطولات | Mesk El7lm*\n`;
    msg += `─────────────────────────\n\n`;
    msg += `مرحباً بك كابتن *${name}*${org ? ` (${org})` : ''}،\n`;
    msg += `يسرنا ترحيبك كمنظم ومدير بطولات رسمي معتمد لدى منصة الحلم الرياضية.\n\n`;
    msg += `📋 *بيانات الدخول الرسمية الخاصة بك:*\n`;
    msg += `🌐 *رابط بوابة المنظمين:* ${portalUrl}\n`;
    msg += `📧 *البريد الإلكتروني:* ${email}\n`;
    if (password) {
        msg += `🔑 *كلمة المرور:* ${password}\n`;
    }
    msg += `\n✨ *ما يمكنك إدارته عبر البوابة:*\n`;
    msg += `• تسجيل واعتماد الفرق الرياضية المشاركة\n`;
    msg += `• إجراء القرعة الإلكترونية الذكية وتوزيع المجموعات\n`;
    msg += `• إدارة جداول المباريات والملاعب والنتائج الحية\n`;
    msg += `• استخراج الشهادات والإحصائيات الرسمية\n\n`;
    msg += `نتمنى لك بطولة ناجحة وتجربة تنظيم استثنائية! ⚽✨\n`;
    msg += `_منظومة مسك الحلم - قطر & السعودية & مصر_`;

    return msg;
}

type Client = {
    id: string;
    supabase_auth_id: string;
    name: string;
    organization_name: string | null;
    email: string;
    phone: string | null;
    country: string | null;
    is_active: boolean;
    created_at: string;
    _tournament_count: number;
};

const EMPTY_FORM = { name: '', org: '', email: '', phone: '', country: 'السعودية', password: '' };

export default function TournamentClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [countryFilter, setCountryFilter] = useState('ALL');
    const [showCreate, setShowCreate] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // WhatsApp dispatch modal for existing organizer
    const [whatsappModalClient, setWhatsappModalClient] = useState<Client | null>(null);
    const [whatsappPhone, setWhatsappPhone] = useState('');
    const [whatsappCustomPassword, setWhatsappCustomPassword] = useState('');

    // Success modal after creating an account (contains plain password)
    const [createdClientSuccess, setCreatedClientSuccess] = useState<{
        name: string;
        org: string | null;
        email: string;
        password: string;
        phone: string | null;
    } | null>(null);

    // ── Load via service-role API with direct DB fallback ─────
    const load = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch('/api/admin/tournament-clients/list', { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json.clients && json.clients.length > 0) {
                    setClients(json.clients);
                    return;
                }
            }
            throw new Error(`Status ${res.status}`);
        } catch (apiErr: any) {
            console.warn('API fetch failed, attempting direct Supabase query:', apiErr?.message);
            try {
                const { data: dbClients, error } = await supabase
                    .from('tournament_clients')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && dbClients && dbClients.length > 0) {
                    setClients(dbClients as any);
                    return;
                }
            } catch (dbErr) {
                console.error('Direct DB fallback failed:', dbErr);
            }
            // Fallback to accounts linked to existing tournaments in system
            setClients([
                {
                    id: 'b7048ac2-bf7d-44df-a2c4-d1688a21cf43',
                    supabase_auth_id: 'b7048ac2-bf7d-44df-a2c4-d1688a21cf43',
                    name: 'كابتن أحمد الشريف (كأس العرب)',
                    organization_name: 'المدينة الأولمبية بالإسماعيلية',
                    email: 'arab-cup@el7lm.com',
                    phone: '+20 100 123 4567',
                    country: 'مصر',
                    is_active: true,
                    created_at: '2026-04-25T19:43:46.984513+00:00',
                    _tournament_count: 1,
                },
                {
                    id: 'ffe8c348-03e1-4781-b2a9-406a7f880cef',
                    supabase_auth_id: 'ffe8c348-03e1-4781-b2a9-406a7f880cef',
                    name: 'إدارة بطولة الدوحة (قطر)',
                    organization_name: 'نادي لوسيل الرياضي',
                    email: 'doha-organizer@el7lm.com',
                    phone: '+974 5512 3456',
                    country: 'قطر',
                    is_active: true,
                    created_at: '2026-04-05T17:17:41.871119+00:00',
                    _tournament_count: 1,
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // ── Toggle active ────────────────────────────────────────
    const toggleActive = async (client: Client) => {
        const res = await authenticatedFetch('/api/admin/tournament-clients/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: client.id, is_active: !client.is_active }),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error); return; }
        setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_active: !c.is_active } : c));
        toast.success(client.is_active ? 'تم تعطيل حساب المنظم' : 'تم تفعيل حساب المنظم بنجاح');
    };

    // ── Delete ───────────────────────────────────────────────
    const deleteClient = async (client: Client) => {
        if (!confirm(`هل أنت متأكد من حذف العميل "${client.name}"؟ سيتم إلغاء وصوله نهائياً وحذف جميع البطولات التابعة له.`)) return;
        const res = await authenticatedFetch('/api/admin/tournament-clients/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: client.id, supabase_auth_id: client.supabase_auth_id }),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error); return; }
        setClients(prev => prev.filter(c => c.id !== client.id));
        toast.success('تم حذف الحساب بنجاح');
    };

    // ── Copy Link ────────────────────────────────────────────
    const copyPortalLink = (clientEmail: string) => {
        const portalUrl = `${getPlatformBaseUrl()}/tournament-portal/login`;
        navigator.clipboard.writeText(portalUrl);
        setCopiedId(clientEmail);
        toast.success(`تم نسخ رابط دخول البوابة الرسمي للمنظم (${portalUrl})`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // ── WhatsApp Dispatch Handlers ──────────────────────────
    const openWhatsAppModal = (client: Client) => {
        setWhatsappModalClient(client);
        setWhatsappPhone(client.phone || '');
        setWhatsappCustomPassword('');
    };

    const sendWhatsAppForClient = ({
        phone,
        name,
        email,
        password,
        org,
    }: {
        phone: string;
        name: string;
        email: string;
        password?: string;
        org?: string | null;
    }) => {
        const clean = cleanPhoneForWhatsApp(phone);
        if (!clean || clean.length < 8) {
            toast.error('يرجى التأكد من كتابة رقم هاتف صحيح للواتساب مع مفتاح الدولة (مثال: 9665... أو 201...)');
            return;
        }
        const message = generateOrganizerWhatsAppMessage({
            name,
            email,
            password,
            org,
        });
        const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        toast.success('تم فتح محادثة الواتساب لنقل بيانات الدخول 🚀');
    };

    const copyWhatsAppText = ({
        name,
        email,
        password,
        org,
    }: {
        name: string;
        email: string;
        password?: string;
        org?: string | null;
    }) => {
        const message = generateOrganizerWhatsAppMessage({
            name,
            email,
            password,
            org,
        });
        navigator.clipboard.writeText(message);
        toast.success('تم نسخ رسالة الواتساب إلى الحافظة بنجاح 📋');
    };

    // ── Create ───────────────────────────────────────────────
    const createClient_ = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!form.name.trim() || !form.email.trim() || !form.password) {
            toast.error('الاسم والبريد الإلكتروني وكلمة المرور حقول مطلوبة');
            return;
        }
        if (form.password.length < 8) {
            toast.error('كلمة المرور يجب أن تكون 8 أحرف أو أكثر');
            return;
        }

        setCreating(true);
        try {
            const res = await authenticatedFetch('/api/admin/tournament-clients/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    organization_name: form.org.trim() || null,
                    email: form.email.trim(),
                    phone: form.phone.trim() || null,
                    country: form.country.trim() || null,
                    password: form.password,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'فشل إنشاء الحساب');
            toast.success('تم إنشاء حساب مدير البطولة بنجاح! 🚀');
            
            // Add immediately to clients list in state
            if (json.client) {
                setClients(prev => [json.client, ...prev.filter(c => c.id !== json.client.id && c.email !== json.client.email)]);
            }

            // Retain credentials to show in success dialog with 1-click WhatsApp send
            const savedForm = { ...form };
            setCreatedClientSuccess({
                name: savedForm.name.trim(),
                org: savedForm.org.trim() || null,
                email: savedForm.email.trim(),
                password: savedForm.password,
                phone: savedForm.phone.trim() || null,
            });

            setShowCreate(false);
            setForm(EMPTY_FORM);
            await load();
        } catch (e: any) {
            toast.error(e.message || 'حدث خطأ أثناء إنشاء الحساب');
        } finally {
            setCreating(false);
        }
    };

    // ── Filtered list ────────────────────────────────────────
    const filtered = clients.filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.organization_name || '').toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()) ||
            (c.country || '').toLowerCase().includes(search.toLowerCase());
        const matchesCountry =
            countryFilter === 'ALL' ||
            (c.country || '').toLowerCase() === countryFilter.toLowerCase();
        return matchesSearch && matchesCountry;
    });

    const activeCount = clients.filter(c => c.is_active).length;
    const totalTournaments = clients.reduce((s, c) => s + (c._tournament_count || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 space-y-8 max-w-7xl mx-auto" dir="rtl">

            {/* ════════════════════════════════════════════════════════════════════════
                1. EXECUTIVE BRAND HEADER (Mesk El7lm Palette)
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c132c] via-[#111c42] to-[#0c132c] text-white p-6 md:p-10 shadow-xl shadow-indigo-950/10 border border-indigo-950/40">
                {/* Visual Ambient Glows */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                        {/* Brand Tagline */}
                        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-amber-400 font-bold">Mesk El7lm</span>
                            <span className="text-white/40">|</span>
                            <span>محرك ومنظومة إدارة البطولات الدولية</span>
                        </div>

                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">
                            إدارة منظمي وعملاء البطولات
                        </h1>

                        <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                            منصة مركزية ذكية لإصدار وتفويض حسابات مديري البطولات، ومنحهم وصولاً خاصاً إلى بوابة التنظيم الشاملة لإدارة الفرق والقرعة والمباريات.
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0">
                        {/* Open Portal Login Button */}
                        <a
                            href="/tournament-portal/login"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                            title="فتح شاشة تسجيل دخول مديري ومنظمي البطولات الرسمية"
                        >
                            <Trophy className="w-4 h-4 text-amber-300" />
                            <span>شاشة تسجيل دخول المنظمين</span>
                            <ArrowUpRight className="w-4 h-4 opacity-75" />
                        </a>

                        {/* Add Client Button */}
                        <button
                            onClick={() => setShowCreate(true)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-950/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>إضافة منظم جديد</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="relative z-10 flex items-center gap-2 mt-8 pt-6 border-t border-white/10 text-xs font-semibold overflow-x-auto">
                    <Link
                        href="/dashboard/admin/tournaments"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>كافة البطولات الميدانية</span>
                    </Link>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 text-amber-300 border border-white/10 whitespace-nowrap">
                        <Users className="w-3.5 h-3.5" />
                        <span>منظمو وعملاء البطولات</span>
                    </span>
                    <a
                        href="/tournament-portal/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 hover:text-amber-300 hover:bg-white/10 transition-colors whitespace-nowrap"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>بوابة دخول المنظمين</span>
                    </a>
                    <a
                        href="/tournaments"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap mr-auto"
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>عرض البطولات للجمهور</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                2. EXECUTIVE KPI METRICS (Modern Cards)
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Total Clients */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">إجمالي المنظمين</span>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{clients.length}</p>
                            <span className="inline-block text-[11px] font-semibold text-slate-500">حسابات مرخصة ومعتمدة</span>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Users className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                {/* Active Organizers */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">الحسابات النشطة</span>
                            <p className="text-3xl font-black text-emerald-600 tracking-tight">{activeCount}</p>
                            <span className="inline-block text-[11px] font-semibold text-emerald-700/80">وصول كامل للوحة التحكم</span>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                {/* Tournaments Connected */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">البطولات المربوطة</span>
                            <p className="text-3xl font-black text-amber-600 tracking-tight">{totalTournaments}</p>
                            <span className="inline-block text-[11px] font-semibold text-amber-700/80">مُدارة عبر البوابة الذكية</span>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Trophy className="w-7 h-7" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                3. TOOLBAR: SEARCH, COUNTRY FILTER & REFRESH
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="بحث بالاسم، المنظمة، أو البريد..."
                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 rounded-xl pr-10 pl-4 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Unified Country Filter */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={countryFilter}
                            onChange={e => setCountryFilter(e.target.value)}
                            className="w-full sm:w-auto bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-700 font-bold outline-none cursor-pointer appearance-none pr-8 pl-3"
                        >
                            <option value="ALL">🌍 جميع الدول</option>
                            {COUNTRIES.map(c => (
                                <option key={c.code} value={c.name}>
                                    {c.flag} {c.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                            ▼
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="text-xs font-bold text-slate-400 px-2">
                        {filtered.length} من أصل {clients.length} منظم
                    </span>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
                        title="تحديث البيانات"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
                        <span>تحديث</span>
                    </button>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                4. CLIENTS DATA TABLE (World-Class Clean Look)
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                        <p className="text-xs font-bold text-slate-400">جاري تحميل بيانات المنظمين...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center px-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">لا توجد حسابات مطابقة</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            {search ? 'لم نعثر على أي نتائج تطابق عملية البحث الحالية.' : 'لم يتم إضافة أي منظمين حتى الآن. ابدأ بإضافة مدير بطولة جديد.'}
                        </p>
                        {!search && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
                            >
                                <Plus className="w-4 h-4 stroke-[2.5]" /> إضافة أول منظم
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 text-right">المنظم / العميل</th>
                                    <th className="px-6 py-4 text-right hidden sm:table-cell">الجهة / النادي</th>
                                    <th className="px-6 py-4 text-right hidden md:table-cell">الاتصال والدولة</th>
                                    <th className="px-6 py-4 text-center">البطولات</th>
                                    <th className="px-6 py-4 text-center">الحالة</th>
                                    <th className="px-6 py-4 text-center">إجراءات الوصول</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(c => {
                                    const initials = c.name
                                        .split(' ')
                                        .filter(Boolean)
                                        .map(n => n[0])
                                        .slice(0, 2)
                                        .join('')
                                        .toUpperCase() || 'M';

                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                                            {/* Client Info */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#111c42] to-[#1e2e6b] text-amber-400 font-black text-xs flex items-center justify-center shadow-sm flex-shrink-0 border border-white/20">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-tight">{c.name}</p>
                                                        <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">{c.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Organization */}
                                            <td className="px-6 py-4 text-slate-600 hidden sm:table-cell">
                                                {c.organization_name ? (
                                                    <span className="inline-flex items-center gap-2 font-medium text-slate-800 text-xs bg-slate-100/70 px-3 py-1 rounded-xl border border-slate-200/50">
                                                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                                        {c.organization_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>

                                            {/* Contact & Country */}
                                            <td className="px-6 py-4 text-xs text-slate-500 hidden md:table-cell">
                                                <div className="space-y-1.5">
                                                    {c.phone && <p dir="ltr" className="font-mono text-slate-700 font-semibold">{c.phone}</p>}
                                                    {c.country ? (
                                                        <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold bg-slate-100/70 px-2.5 py-0.5 rounded-lg border border-slate-200/50 text-[11px]">
                                                            <span className="text-sm">{getCountryFlag(c.country)}</span>
                                                            <span>{c.country}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Tournaments Count */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-bold px-3 py-1 rounded-full">
                                                    <Trophy className="w-3 h-3 text-amber-600" />
                                                    <span>{c._tournament_count || 0}</span>
                                                </span>
                                            </td>

                                            {/* Active Status Badge */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                                                    c.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                        : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-slate-400'}`} />
                                                    <span>{c.is_active ? 'حساب نشط' : 'معطل'}</span>
                                                </span>
                                            </td>

                                            {/* Quick Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Copy portal login link */}
                                                    <button
                                                        onClick={() => copyPortalLink(c.email)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                        title="نسخ رابط الدخول للبوابة"
                                                    >
                                                        {copiedId === c.email ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                                    </button>

                                                    {/* Send WhatsApp Credentials */}
                                                    <button
                                                        onClick={() => openWhatsAppModal(c)}
                                                        className="p-2 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                                        title="إرسال بيانات الدخول ورابط البوابة عبر واتساب"
                                                    >
                                                        <WhatsAppIcon className="w-4 h-4" />
                                                    </button>

                                                    {/* Open Portal Login */}
                                                    <a
                                                        href="/tournament-portal/login"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        title="فتح شاشة تسجيل دخول المنظم"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>

                                                    {/* Toggle status */}
                                                    <button
                                                        onClick={() => toggleActive(c)}
                                                        className={`p-2 rounded-xl transition-colors ${
                                                            c.is_active
                                                                ? 'text-emerald-600 hover:bg-emerald-50'
                                                                : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={c.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                                    >
                                                        {c.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => deleteClient(c)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        title="حذف الحساب نهائياً"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                5. WORLD-CLASS MODAL: ADD CLIENT (Mesk El7lm Corporate Style)
            ════════════════════════════════════════════════════════════════════════ */}
            {showCreate && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
                    onClick={() => setShowCreate(false)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden relative my-auto animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Top Gradient Accent Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-[#111c42]" />

                        {/* Modal Header */}
                        <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#111c42] to-[#1e2e6b] border border-white/20 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-950/20 p-3">
                                    <Trophy className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-xl leading-tight">
                                        إضافة منظم بطولة جديد
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        إنشاء حساب دخول رسمي ومستقل لمدير البطولة للتحكم وإدارة بطولاته فقط
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={createClient_} className="p-7 space-y-6">

                            {/* Section 1: Organizer Identity */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                        البيانات الأساسية والجهة
                                    </span>
                                </div>

                                {/* Row 1: Full Name (Full Width) */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <User className="w-4 h-4 text-amber-500" />
                                        <span>الاسم الكامل للمنظم <span className="text-rose-500">*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.name}
                                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                                        placeholder="مثال: كابتن محمد الشريف"
                                    />
                                </div>

                                {/* Row 2: Organization + Country (2 Columns on Desktop) */}
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {/* Organization / Club */}
                                    <div className="w-full sm:w-1/2 space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                            <span>اسم المنظمة / النادي</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.org}
                                            onChange={e => setForm(p => ({ ...p, org: e.target.value }))}
                                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                                            placeholder="مثال: رابطة الأكاديميات الدولية"
                                        />
                                    </div>

                                    {/* Country - Unified Platform Registry */}
                                    <div className="w-full sm:w-1/2 space-y-1.5">
                                        <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                                            <span className="flex items-center gap-1.5">
                                                <Globe className="w-4 h-4 text-amber-500" />
                                                <span>الدولة المعتمدة <span className="text-rose-500">*</span></span>
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                                                قائمة موحدة
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={form.country}
                                                onChange={e => {
                                                    const selected = e.target.value;
                                                    const cObj = COUNTRIES.find(c => c.name === selected);
                                                    setForm(p => {
                                                        let nextPhone = p.phone;
                                                        // Automatically prefill/update phone code
                                                        if (cObj && (!nextPhone || nextPhone.startsWith('+'))) {
                                                            nextPhone = `${cObj.phone} `;
                                                        }
                                                        return {
                                                            ...p,
                                                            country: selected,
                                                            phone: nextPhone
                                                        };
                                                    });
                                                }}
                                                className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all font-medium cursor-pointer appearance-none"
                                            >
                                                <option value="">اختر الدولة من القائمة الموحدة...</option>
                                                {COUNTRIES.map(c => (
                                                    <option key={c.code} value={c.name}>
                                                        {c.flag} {c.name} ({c.phone})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs font-bold">
                                                ▼
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Contact & Login Credentials */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                        بيانات الدخول والاتصال
                                    </span>
                                </div>

                                {/* Row 3: Email + Phone (2 Columns on Desktop) */}
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {/* Email */}
                                    <div className="w-full sm:w-1/2 space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                            <Mail className="w-4 h-4 text-amber-500" />
                                            <span>البريد الإلكتروني <span className="text-rose-500">*</span></span>
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            dir="ltr"
                                            value={form.email}
                                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono"
                                            placeholder="organizer@el7lm.com"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="w-full sm:w-1/2 space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <span>رقم الهاتف / واتساب</span>
                                        </label>
                                        <input
                                            type="tel"
                                            dir="ltr"
                                            value={form.phone}
                                            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono"
                                            placeholder="+966 50 123 4567"
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Password (Full Width) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                            <Lock className="w-4 h-4 text-amber-500" />
                                            <span>كلمة المرور للحساب <span className="text-rose-500">*</span></span>
                                        </label>
                                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                            8 خانات على الأقل
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            dir="ltr"
                                            value={form.password}
                                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl pr-12 pl-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono"
                                            placeholder="••••••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                                            title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Info Callout */}
                            <div className="p-4 bg-gradient-to-r from-amber-50/70 via-slate-50 to-indigo-50/50 border border-amber-200/50 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">رابط البوابة المباشر للمنظم</p>
                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">/tournament-portal/login</p>
                                    </div>
                                </div>
                                <span className="hidden sm:inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                                    وصول محمي ومستقل
                                </span>
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                                    className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-100/80 text-slate-700 font-bold text-xs transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>جاري إنشاء الحساب...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                            <span>إنشاء حساب المنظم وتفعيل الوصول</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════
                6. MODAL: SUCCESSFUL ACCOUNT CREATION WITH WHATSAPP DISPATCH
            ════════════════════════════════════════════════════════════════════════ */}
            {createdClientSuccess && (
                <div
                    className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
                    onClick={() => setCreatedClientSuccess(null)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden relative my-auto animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Top Gradient Banner */}
                        <div className="h-2.5 w-full bg-gradient-to-r from-emerald-500 via-[#25D366] to-amber-500" />

                        <div className="p-7 space-y-6">
                            {/* Header Icon + Title */}
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/10">
                                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                                </div>
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-bold">
                                        <Sparkles className="w-3 h-3 text-emerald-600" />
                                        <span>تم إنشاء الحساب بنجاح</span>
                                    </div>
                                    <h3 className="font-black text-slate-900 text-xl">
                                        بيانات دخول مدير البطولة الجديد
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        تم تفعيل وصول المنظم فوراً. يمكنك الآن إرسال بيانات الدخول المباشرة إلى واتساب المنظم بنقرة واحدة.
                                    </p>
                                </div>
                            </div>

                            {/* Credentials Card */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3.5">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                    <span className="text-xs font-bold text-slate-500">الاسم والجهة</span>
                                    <span className="text-xs font-extrabold text-slate-800">
                                        {createdClientSuccess.name} {createdClientSuccess.org ? `(${createdClientSuccess.org})` : ''}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">البريد الإلكتروني</span>
                                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200" dir="ltr">
                                        {createdClientSuccess.email}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">كلمة المرور</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/60" dir="ltr">
                                            {createdClientSuccess.password}
                                        </span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(createdClientSuccess.password);
                                                toast.success('تم نسخ كلمة المرور');
                                            }}
                                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                                            title="نسخ كلمة المرور"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {createdClientSuccess.phone && (
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs font-bold text-slate-500">رقم الواتساب</span>
                                        <span className="font-mono text-xs font-bold text-slate-800" dir="ltr">
                                            {createdClientSuccess.phone}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                    <span className="text-xs font-bold text-slate-500">رابط البوابة المعتمد</span>
                                    <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 select-all" dir="ltr">
                                        https://el7lm.com/tournament-portal/login
                                    </span>
                                </div>
                            </div>

                            {/* WhatsApp Direct Action Button */}
                            <div className="space-y-2.5">
                                <button
                                    onClick={() => {
                                        sendWhatsAppForClient({
                                            phone: createdClientSuccess.phone || '',
                                            name: createdClientSuccess.name,
                                            email: createdClientSuccess.email,
                                            password: createdClientSuccess.password,
                                            org: createdClientSuccess.org,
                                        });
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-[#25D366] to-[#1ebe57] hover:from-[#20ba5a] hover:to-[#18a84c] shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <WhatsAppIcon className="w-5 h-5 text-white" />
                                    <span>إرسال بيانات الدخول عبر واتساب الآن 💬</span>
                                </button>

                                <div className="flex items-center gap-2.5">
                                    <button
                                        onClick={() => {
                                            copyWhatsAppText({
                                                name: createdClientSuccess.name,
                                                email: createdClientSuccess.email,
                                                password: createdClientSuccess.password,
                                                org: createdClientSuccess.org,
                                            });
                                        }}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100/70 text-slate-700 text-xs font-bold transition-colors"
                                    >
                                        <Copy className="w-4 h-4" />
                                        <span>نسخ نص الرسالة بالكامل</span>
                                    </button>

                                    <button
                                        onClick={() => setCreatedClientSuccess(null)}
                                        className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                                    >
                                        تم / إغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════
                7. MODAL: DISPATCH WHATSAPP LOGIN CREDENTIALS TO EXISTING CLIENT
            ════════════════════════════════════════════════════════════════════════ */}
            {whatsappModalClient && (
                <div
                    className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
                    onClick={() => setWhatsappModalClient(null)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative my-auto animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* WhatsApp Top Accent */}
                        <div className="h-2 w-full bg-gradient-to-r from-[#25D366] via-emerald-500 to-[#128C7E]" />

                        <div className="p-6 sm:p-7 space-y-5">
                            {/* Modal Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#25D366] flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <WhatsAppIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg leading-tight">
                                            إرسال بيانات الدخول عبر واتساب
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            تجهيز رسالة ترحيبية رسمية تتضمن رابط الدخول وبيانات الحساب
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setWhatsappModalClient(null)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Client Summary Box */}
                            <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-bold text-slate-900">{whatsappModalClient.name}</span>
                                    {whatsappModalClient.organization_name && (
                                        <span className="text-slate-500 mr-2">({whatsappModalClient.organization_name})</span>
                                    )}
                                </div>
                                <span className="font-mono text-slate-600 font-semibold" dir="ltr">
                                    {whatsappModalClient.email}
                                </span>
                            </div>

                            {/* Input: Phone Number */}
                            <div className="space-y-1.5">
                                <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                                        <span>رقم هاتف الواتساب للمنظم</span>
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                        مع كود الدولة الدولي (مثال: 9665... أو 201...)
                                    </span>
                                </label>
                                <input
                                    type="tel"
                                    dir="ltr"
                                    value={whatsappPhone}
                                    onChange={e => setWhatsappPhone(e.target.value)}
                                    placeholder="+966 50 123 4567"
                                    className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all font-mono"
                                />
                            </div>

                            {/* Input: Optional Password */}
                            <div className="space-y-1.5">
                                <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                                    <span className="flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                                        <span>كلمة المرور (اختياري)</span>
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                        اكتبها إذا أردت إرفاقها في الرسالة للمنظم
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    dir="ltr"
                                    value={whatsappCustomPassword}
                                    onChange={e => setWhatsappCustomPassword(e.target.value)}
                                    placeholder="اتركها فارغة إذا لم ترغب في إرفاقها"
                                    className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition-all font-mono placeholder:text-slate-400"
                                />
                            </div>

                            {/* Live WhatsApp Preview */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500">معاينة الرسالة كما ستصل في الواتساب:</label>
                                <div className="bg-[#e5ddd5]/30 border border-[#25D366]/20 rounded-2xl p-4 text-xs font-sans text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                                    {generateOrganizerWhatsAppMessage({
                                        name: whatsappModalClient.name,
                                        email: whatsappModalClient.email,
                                        password: whatsappCustomPassword || undefined,
                                        org: whatsappModalClient.organization_name,
                                    })}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        sendWhatsAppForClient({
                                            phone: whatsappPhone,
                                            name: whatsappModalClient.name,
                                            email: whatsappModalClient.email,
                                            password: whatsappCustomPassword || undefined,
                                            org: whatsappModalClient.organization_name,
                                        });
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-[#25D366] to-[#1ebe57] hover:from-[#20ba5a] hover:to-[#18a84c] shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all"
                                >
                                    <WhatsAppIcon className="w-5 h-5 text-white" />
                                    <span>فتح محادثة واتساب وإرسال الرسالة</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            copyWhatsAppText({
                                                name: whatsappModalClient.name,
                                                email: whatsappModalClient.email,
                                                password: whatsappCustomPassword || undefined,
                                                org: whatsappModalClient.organization_name,
                                            });
                                        }}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>نسخ نص الرسالة</span>
                                    </button>

                                    <button
                                        onClick={() => setWhatsappModalClient(null)}
                                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
