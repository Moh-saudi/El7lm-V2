'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { OrganizationReferral } from '@/types/organization-referral';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, Copy, Share2, QrCode, ToggleLeft, ToggleRight,
  RefreshCw, X, ChevronDown, ChevronUp, Building, GraduationCap,
  Briefcase, Target, Users, Calendar, Infinity, Link2,
  CheckCircle2, Clock, Zap, Gift, ShieldCheck, BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrgName(userData: any, accountType: string): string {
  if (!userData) return '';
  switch (accountType) {
    case 'club':     return userData.club_name     || userData.full_name || userData.name || '';
    case 'academy':  return userData.academy_name  || userData.full_name || userData.name || '';
    case 'trainer':  return userData.trainer_name  || userData.full_name || userData.name || '';
    case 'agent':    return userData.agent_name    || userData.full_name || userData.name || '';
    case 'marketer': return userData.full_name     || userData.name      || '';
    default:         return userData.full_name     || userData.name      || '';
  }
}

function isOrgAccount(accountType: string) {
  return ['club', 'academy', 'trainer', 'agent', 'marketer'].includes(accountType);
}

const TYPE_LABELS: Record<string, string> = {
  club: 'نادي', academy: 'أكاديمية', trainer: 'مدرب', agent: 'وكيل', marketer: 'مسوّق', player: 'لاعب',
};
const TYPE_ICONS: Record<string, React.ElementType> = {
  club: Building, academy: GraduationCap, trainer: Target, agent: Briefcase, marketer: Zap,
};

// ─── Create Code Sheet ────────────────────────────────────────────────────────

interface CreateSheetProps {
  onClose: () => void;
  onCreated: () => void;
  organizationId: string;
  organizationType: string;
  organizationName: string;
}

function CreateSheet({ onClose, onCreated, organizationId, organizationType, organizationName }: CreateSheetProps) {
  const [description, setDescription] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await organizationReferralService.createOrganizationReferral(
        organizationId,
        organizationType,
        organizationName,
        {
          description: description || undefined,
          maxUsage: maxUsage ? parseInt(maxUsage) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        }
      );
      toast.success('تم إنشاء كود الدعوة بنجاح');
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">إنشاء كود دعوة جديد</h2>
              <p className="text-sm text-gray-500 mt-0.5">سيتم توليد كود فريد تلقائياً</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Org badge */}
          <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-indigo-900 text-sm">{organizationName}</p>
              <p className="text-xs text-indigo-500">{TYPE_LABELS[organizationType] || organizationType}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">وصف الكود <span className="text-gray-400 font-normal">(اختياري)</span></label>
              <Input
                placeholder="مثال: كود الموسم الجديد 2025"
                className="rounded-xl h-12 border-gray-200 text-gray-900"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ fontSize: '16px' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">الحد الأقصى للاستخدام</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    placeholder="غير محدود"
                    className="rounded-xl h-12 border-gray-200 pr-10"
                    value={maxUsage}
                    onChange={e => setMaxUsage(e.target.value)}
                    style={{ fontSize: '16px' }}
                  />
                  <Infinity className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">تاريخ الانتهاء</label>
                <Input
                  type="date"
                  className="rounded-xl h-12 border-gray-200"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  style={{ fontSize: '16px' }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> كيف تستخدم الكود؟
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>شارك الكود مع اللاعبين الذين تريد دعوتهم</li>
              <li>يدخل اللاعب الكود في صفحة "كود الانضمام" في حسابه</li>
              <li>يصلك طلب انضمام للموافقة عليه أو رفضه</li>
            </ul>
          </div>

          {/* Action */}
          <Button
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-100"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> جاري الإنشاء...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" /> إنشاء كود الدعوة
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Code Card ────────────────────────────────────────────────────────────────

function CodeCard({ code, onToggle }: { code: OrganizationReferral; onToggle: (id: string, active: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    toast.success(type === 'code' ? 'تم نسخ الكود' : 'تم نسخ الرابط');
  };

  const pct = code.maxUsage ? Math.min((code.currentUsage / code.maxUsage) * 100, 100) : 0;
  const expDate = code.expiresAt
    ? new Date((code.expiresAt as any).toDate ? (code.expiresAt as any).toDate() : code.expiresAt)
    : null;
  const isExpired = expDate ? expDate < new Date() : false;

  return (
    <motion.div
      layout
      className={cn(
        'bg-white rounded-3xl border-2 overflow-hidden transition-all',
        code.isActive && !isExpired ? 'border-indigo-100 shadow-sm hover:shadow-md' : 'border-gray-100 opacity-60',
      )}
    >
      {/* Top bar */}
      <div className={cn('h-1.5', code.isActive && !isExpired ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-200')} />

      <div className="p-5 space-y-4">
        {/* Code + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-black text-gray-900 tracking-widest">{code.referralCode}</span>
              <button
                onClick={() => copy(code.referralCode, 'code')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  copied ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-gray-100 text-gray-400',
                )}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {code.description && (
              <p className="text-xs text-gray-500 font-medium">{code.description}</p>
            )}
          </div>

          {/* Toggle */}
          <button
            onClick={() => onToggle(code.id, code.isActive)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all',
              code.isActive && !isExpired
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
            )}
          >
            {code.isActive && !isExpired
              ? <><ToggleRight className="w-3.5 h-3.5" /> نشط</>
              : <><ToggleLeft className="w-3.5 h-3.5" /> {isExpired ? 'منتهي' : 'معطل'}</>}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-400 font-bold mb-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> استُخدم</p>
            <p className="font-black text-gray-900 text-lg">{code.currentUsage}</p>
            {code.maxUsage && <p className="text-[10px] text-gray-400">من {code.maxUsage}</p>}
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-400 font-bold mb-1 flex items-center justify-center gap-1"><Infinity className="w-3 h-3" /> المتاح</p>
            <p className="font-black text-gray-900 text-lg">
              {code.maxUsage ? Math.max(0, code.maxUsage - code.currentUsage) : '∞'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-400 font-bold mb-1 flex items-center justify-center gap-1"><Calendar className="w-3 h-3" /> ينتهي</p>
            <p className="font-black text-gray-900 text-xs leading-tight">
              {expDate ? expDate.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : 'مفتوح'}
            </p>
          </div>
        </div>

        {/* Progress bar (if maxUsage set) */}
        {code.maxUsage && code.maxUsage > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-gray-400">
              <span>{code.currentUsage} مستخدم</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', pct >= 90 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-indigo-500')}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Expand for invite link */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center justify-between w-full text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors pt-1"
        >
          <span className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> رابط الدعوة</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                <p className="flex-1 text-xs text-gray-600 font-mono truncate">{code.inviteLink}</p>
                <button
                  onClick={() => copy(code.inviteLink, 'link')}
                  className={cn('p-1.5 rounded-lg flex-shrink-0 transition-colors',
                    copiedLink ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-white text-gray-400')}
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) navigator.share({ title: 'رابط الدعوة', url: code.inviteLink });
                    else copy(code.inviteLink, 'link');
                  }}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Player Join Form ─────────────────────────────────────────────────────────

function PlayerJoinForm() {
  const { user, userData } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<any>(null);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const ref = await organizationReferralService.findReferralByCode(code.trim().toUpperCase());
      if (ref) {
        setFound(ref);
      } else {
        toast.error('الكود غير صحيح أو منتهي الصلاحية');
        setFound(null);
      }
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!found || !user?.id || !userData) return;
    setLoading(true);
    try {
      await organizationReferralService.createJoinRequest(user.id, userData, code.trim().toUpperCase());
      toast.success(`تم إرسال طلب الانضمام إلى ${found.organizationName} بنجاح`);
      setCode('');
      setFound(null);
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white text-center space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
          <QrCode className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black">أدخل كود الانضمام</h2>
        <p className="text-indigo-200 text-sm leading-relaxed">
          هل لديك كود دعوة من نادٍ أو أكاديمية؟ أدخله هنا للانضمام إليهم.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-700">كود الدعوة</label>
        <div className="flex gap-3">
          <Input
            placeholder="مثال: CLB4A2X9"
            className="flex-1 h-14 rounded-2xl border-gray-200 text-center text-xl font-mono font-black tracking-widest uppercase"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setFound(null); }}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            maxLength={9}
            style={{ fontSize: '18px', letterSpacing: '0.15em' }}
          />
          <Button
            className="h-14 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold"
            onClick={handleVerify}
            disabled={loading || !code.trim()}
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'تحقق'}
          </Button>
        </div>
      </div>

      {/* Found result */}
      <AnimatePresence>
        {found && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-5 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                {found.organizationType === 'academy'
                  ? <GraduationCap className="w-7 h-7 text-emerald-600" />
                  : found.organizationType === 'trainer'
                  ? <Target className="w-7 h-7 text-emerald-600" />
                  : found.organizationType === 'agent'
                  ? <Briefcase className="w-7 h-7 text-emerald-600" />
                  : <Building className="w-7 h-7 text-emerald-600" />}
              </div>
              <div>
                <p className="font-black text-gray-900 text-lg">{found.organizationName}</p>
                <p className="text-sm text-emerald-600 font-bold">{TYPE_LABELS[found.organizationType] || found.organizationType}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 ml-auto flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 bg-white/70 rounded-2xl p-3">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{found.currentUsage} لاعب انضمّ بهذا الكود</span>
            </div>
            <Button
              className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base"
              onClick={handleJoin}
              disabled={loading}
            >
              {loading
                ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />جاري الإرسال...</span>
                : <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />إرسال طلب الانضمام</span>}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
      <div className="space-y-3">
        <p className="text-sm font-black text-gray-700">كيف تعمل؟</p>
        {[
          { icon: QrCode, label: 'أدخل الكود الذي أرسله لك النادي أو الأكاديمية', color: 'bg-indigo-50 text-indigo-600' },
          { icon: CheckCircle2, label: 'تحقق من البيانات ثم أرسل طلب الانضمام', color: 'bg-emerald-50 text-emerald-600' },
          { icon: Clock, label: 'انتظر موافقة المنظمة على طلبك', color: 'bg-amber-50 text-amber-600' },
          { icon: Gift, label: 'بعد القبول ستنضم رسمياً إلى المنظمة', color: 'bg-purple-50 text-purple-600' },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', step.color)}>
              <step.icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-gray-700 font-medium">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InviteCodePage() {
  const params = useParams();
  const accountType = (params?.accountType as string) || 'player';
  const { user, userData } = useAuth();

  const isOrg = isOrgAccount(accountType);
  const OrgIcon = TYPE_ICONS[accountType] || Building;

  const [codes, setCodes] = useState<OrganizationReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const orgName = getOrgName(userData, accountType);

  const loadCodes = useCallback(async () => {
    if (!user?.id || !isOrg) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await organizationReferralService.getOrganizationReferrals(user.id);
      setCodes(list);
    } catch {
      toast.error('حدث خطأ في تحميل الأكواد');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isOrg]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await organizationReferralService.updateOrganizationReferral(id, user!.id, { isActive: !currentActive });
      setCodes(prev => prev.map(c => c.id === id ? { ...c, isActive: !currentActive } : c));
      toast.success(!currentActive ? 'تم تفعيل الكود' : 'تم تعطيل الكود');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const activeCount = codes.filter(c => c.isActive).length;
  const totalUsage = codes.reduce((s, c) => s + c.currentUsage, 0);

  // ─── Player View ───────────────────────────────────────────────────────────
  if (!isOrg) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">كود الانضمام</h1>
            <p className="text-sm text-gray-500">انضم إلى نادٍ أو أكاديمية بكود الدعوة</p>
          </div>
        </header>
        <PlayerJoinForm />
      </div>
    );
  }

  // ─── Org View ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <OrgIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">أكواد الدعوة</h1>
            <p className="text-sm text-gray-500">أنشئ أكواداً لدعوة اللاعبين للانضمام إليك</p>
          </div>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 h-11 font-bold shadow-lg shadow-indigo-100 flex-shrink-0"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4 ml-1.5" />
          كود جديد
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'إجمالي الأكواد', value: codes.length, icon: QrCode, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'أكواد نشطة',     value: activeCount,    icon: Zap,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'إجمالي الانضمامات', value: totalUsage,  icon: Users,  color: 'text-purple-600',  bg: 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2', s.bg)}>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Code List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-300 animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <p className="font-black text-gray-700 text-lg">لا يوجد أكواد بعد</p>
            <p className="text-sm text-gray-400 mt-1">أنشئ أول كود لدعوة اللاعبين للانضمام إليك</p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 h-12 font-bold"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 ml-2" /> إنشاء أول كود
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {codes.map(code => (
            <CodeCard key={code.id} code={code} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Create Sheet */}
      <AnimatePresence>
        {showCreate && user?.id && orgName && (
          <CreateSheet
            onClose={() => setShowCreate(false)}
            onCreated={loadCodes}
            organizationId={user.id}
            organizationType={accountType}
            organizationName={orgName}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
