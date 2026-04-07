'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Target,
  Plus,
  Eye,
  Trash2,
  Edit3,
  Users,
  Star,
  MapPin,
  Calendar,
  ChevronLeft,
  Search,
  Filter,
  X,
  CheckCircle,
  Clock,
  Home,
  Loader2,
  Share2,
  Copy,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import {
  getMyOpportunities,
  deleteOpportunity,
  getExploreOpportunities,
  applyToOpportunity,
  incrementViewCount,
} from '@/lib/firebase/opportunities';
import { notifyNewApplication } from '@/lib/opportunities/notifications';
import { getSupabaseImageUrl } from '@/lib/supabase/image-utils';
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/config';
import { Opportunity, OpportunityType } from '@/types/opportunities';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeConfig(type: OpportunityType) {
  return OPPORTUNITY_TYPES[type] ?? { label: type, emoji: '📌', color: '#6B7280' };
}

function statusLabel(status: string) {
  const map: Record<string, { text: string; bg: string; text2: string }> = {
    active:    { text: 'نشط',    bg: 'bg-green-100',  text2: 'text-green-700'  },
    draft:     { text: 'مسودة',  bg: 'bg-yellow-100', text2: 'text-yellow-700' },
    closed:    { text: 'مغلق',   bg: 'bg-gray-100',   text2: 'text-gray-600'   },
    cancelled: { text: 'ملغى',   bg: 'bg-red-100',    text2: 'text-red-700'    },
  };
  return map[status] ?? { text: status, bg: 'bg-gray-100', text2: 'text-gray-600' };
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return diff;
}

// ─── Loading Spinner ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
        <p className="text-gray-500 text-sm">جارٍ التحميل...</p>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  colorClass,
}: {
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1">
      <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ─── Publisher View ────────────────────────────────────────────────────────────

function PublisherView({
  user,
  userData,
}: {
  user: any;
  userData: any;
}) {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'closed'>('active');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const data = await getMyOpportunities(user.id);
      setOpportunities(data);
    } catch (err) {
      toast.error('حدث خطأ أثناء تحميل الفرص');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [user.id]);

  const activeCount     = opportunities.filter(o => o.status === 'active').length;
  const draftCount      = opportunities.filter(o => o.status === 'draft').length;
  const totalApplicants = opportunities.reduce((s, o) => s + (o.currentApplicants || 0), 0);
  const totalViews      = opportunities.reduce((s, o) => s + (o.viewCount || 0), 0);

  const filtered = opportunities.filter(o => o.status === activeTab);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفرصة؟')) return;
    try {
      setDeletingId(id);
      await deleteOpportunity(id);
      toast.success('تم حذف الفرصة');
      await loadOpportunities();
    } catch {
      toast.error('فشل حذف الفرصة');
    } finally {
      setDeletingId(null);
    }
  };

  const tabs: { key: 'active' | 'draft' | 'closed'; label: string }[] = [
    { key: 'active', label: 'نشطة' },
    { key: 'draft',  label: 'مسودة' },
    { key: 'closed', label: 'مغلقة' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir="rtl">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">مركز الفرص</h1>
            <p className="text-xs text-gray-400 hidden sm:block">إدارة فرصك وتتبع المتقدمين</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/opportunities/create')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">نشر فرصة جديدة</span>
            <span className="sm:hidden">فرصة جديدة</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { value: activeCount,     label: 'نشطة',             color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
            { value: totalApplicants, label: 'المتقدمون',        color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100'  },
            { value: totalViews,      label: 'المشاهدات',        color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100'},
            { value: draftCount,      label: 'المسودات',         color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100'},
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 sm:p-4 flex flex-col gap-0.5`}>
              <span className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.key === 'active' && activeCount > 0 && (
                <span className="mr-1 inline-flex items-center justify-center w-4 h-4 bg-green-500 text-white rounded-full text-[10px]">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">لا توجد فرص في هذه الحالة</p>
            <button
              onClick={() => router.push('/dashboard/opportunities/create')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              نشر فرصة جديدة
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(opp => {
              const cfg    = getTypeConfig(opp.opportunityType);
              const status = statusLabel(opp.status);
              const pct    = opp.maxApplicants > 0
                ? Math.min(100, Math.round((opp.currentApplicants / opp.maxApplicants) * 100))
                : 0;

              return (
                <div
                  key={opp.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
                  style={{ borderRightWidth: '4px', borderRightColor: cfg.color }}
                >
                  <div className="p-3 sm:p-4 space-y-3">

                    {/* Row 1: type + status + featured */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: cfg.color }}
                      >
                        <span>{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text2}`}>
                        {status.text}
                      </span>
                      {opp.isFeatured && (
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 mr-auto" />
                      )}
                    </div>

                    {/* Row 2: title */}
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                      {opp.title}
                    </h3>

                    {/* Row 3: progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>المتقدمون</span>
                        <span className="font-medium">{opp.currentApplicants} / {opp.maxApplicants}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Row 4: meta chips */}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        {formatDate(opp.applicationDeadline)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 flex-shrink-0" />
                        {opp.viewCount}
                      </span>
                      {opp.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {opp.city}
                        </span>
                      )}
                    </div>

                    {/* Row 5: actions — responsive */}
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      <button
                        onClick={() => router.push(`/dashboard/opportunities/${opp.id}/applications`)}
                        className="col-span-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden sm:inline">الطلبات </span>
                        <span>({opp.currentApplicants})</span>
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/opportunities/create?edit=${opp.id}`)}
                        className="flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">تعديل</span>
                      </button>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        disabled={deletingId === opp.id}
                        className="flex items-center justify-center gap-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {deletingId === opp.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <><Trash2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">حذف</span></>
                        }
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Explore View ──────────────────────────────────────────────────────────────

function ExploreView({
  user,
  userData,
}: {
  user: any;
  userData: any;
}) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedType, setSelectedType]   = useState<'all' | OpportunityType>('all');
  const [search, setSearch]               = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedOpp, setSelectedOpp]     = useState<Opportunity | null>(null);
  const [applyMessage, setApplyMessage]   = useState('');
  const [applyPosition, setApplyPosition] = useState('');
  const [applying, setApplying]           = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getExploreOpportunities();
        setOpportunities(data);
      } catch {
        toast.error('حدث خطأ أثناء تحميل الفرص');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const typeKeys = Object.keys(OPPORTUNITY_TYPES) as OpportunityType[];

  const filtered = opportunities.filter(o => {
    const matchType   = selectedType === 'all' || o.opportunityType === selectedType;
    const matchSearch = !search || o.title.includes(search) || o.organizerName.includes(search);
    return matchType && matchSearch;
  });

  const handleCardClick = async (opp: Opportunity) => {
    try {
      await incrementViewCount(opp.id);
    } catch {
      // silent
    }
  };

  const openApplyModal = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setApplyMessage('');
    setApplyPosition('');
    setShowApplyModal(true);
  };

  const handleApply = async () => {
    if (!selectedOpp || !user) return;
    try {
      setApplying(true);

      // Fetch full player profile from Supabase
      let playerDoc: any = {};
      try {
        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('id', user.id)
          .single();
        if (playerData) playerDoc = playerData;
      } catch { /* use userData fallback */ }

      const p = playerDoc;
      const birthDate = p.birth_date || p.birthDate;
      const age = birthDate
        ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400000))
        : undefined;

      const rawAvatar = p.image || p.profile_image_url || p.profile_image || p.photoURL;
      const avatarUrl = rawAvatar ? getSupabaseImageUrl(rawAvatar, 'avatars') : undefined;

      await applyToOpportunity(selectedOpp.id, user.id, {
        playerName:          p.name || p.full_name || userData?.full_name || userData?.displayName || 'لاعب',
        playerPhone:         p.phone || p.whatsapp || userData?.phone || undefined,
        playerPosition:      applyPosition || p.position || undefined,
        playerCountry:       p.country || userData?.country || undefined,
        playerNationality:   p.nationality || undefined,
        playerAge:           age,
        playerHeight:        p.height || undefined,
        playerWeight:        p.weight || undefined,
        playerFoot:          p.foot || undefined,
        playerCurrentClub:   p.current_club || undefined,
        playerContractStatus: p.contract_status || undefined,
        playerAvatarUrl:     avatarUrl,
        playerStats: {
          pace:      p.stats_pace,
          shooting:  p.stats_shooting,
          passing:   p.stats_passing,
          dribbling: p.stats_dribbling,
          defending: p.stats_defending,
          physical:  p.stats_physical,
        },
        opportunityTitle: selectedOpp.title,
        organizerName:    selectedOpp.organizerName,
        organizerType:    selectedOpp.organizerType,
        message:          applyMessage || undefined,
      });
      await notifyNewApplication(
        selectedOpp.organizerId,
        selectedOpp.organizerType,
        p.name || p.full_name || userData?.full_name || 'لاعب',
        selectedOpp.title,
        selectedOpp.id
      );
      toast.success('تم تقديم طلبك بنجاح!');
      setShowApplyModal(false);
      // Optimistically increment local count
      setOpportunities(prev =>
        prev.map(o =>
          o.id === selectedOpp.id
            ? { ...o, currentApplicants: o.currentApplicants + 1 }
            : o
        )
      );
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء التقديم');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">استكشاف الفرص</h1>
          <p className="text-xs text-gray-400 hidden sm:block">اكتشف الفرص المتاحة وقدم الآن</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن فرصة أو منظم..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedType('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedType === 'all'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
            }`}
          >
            الكل
          </button>
          {typeKeys.map(k => {
            const cfg = OPPORTUNITY_TYPES[k];
            const active = selectedType === k;
            return (
              <button
                key={k}
                onClick={() => setSelectedType(k)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={active ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد فرص متاحة حالياً</p>
            <p className="text-sm mt-1">جرب تغيير الفلتر أو ابحث بكلمة مختلفة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(opp => {
              const cfg        = getTypeConfig(opp.opportunityType);
              const days       = daysUntil(opp.applicationDeadline);
              const urgentDeadline = days <= 3 && days >= 0;
              const slotsLeft  = opp.maxApplicants - opp.currentApplicants;

              return (
                <div
                  key={opp.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleCardClick(opp)}
                >
                  {/* Top color bar */}
                  <div className="h-1.5" style={{ backgroundColor: cfg.color }} />

                  <div className="p-4 space-y-3">
                    {/* Organizer */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{opp.organizerName}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {opp.organizerType}
                      </span>
                      {opp.isFeatured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> مميزة
                        </span>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/dashboard/opportunities?id=${opp.id}`;
                          navigator.clipboard.writeText(link).catch(() => {});
                          const text = `${opp.title} — ${opp.organizerName}\n${link}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="mr-auto p-1 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="مشاركة الفرصة"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{opp.title}</h3>

                    {/* Dates */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(opp.startDate)}</span>
                      <ChevronLeft className="w-3 h-3" />
                      <span>{formatDate(opp.endDate)}</span>
                    </div>

                    {/* Benefits */}
                    {(opp.providesAccommodation || opp.providesMeals || opp.providesTransport) && (
                      <div className="flex flex-wrap gap-1.5">
                        {opp.providesAccommodation && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">🏠 إقامة</span>
                        )}
                        {opp.providesMeals && (
                          <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">🍽️ وجبات</span>
                        )}
                        {opp.providesTransport && (
                          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">🚌 مواصلات</span>
                        )}
                      </div>
                    )}

                    {/* Bottom row */}
                    <div className="flex items-center flex-wrap gap-2 pt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          urgentDeadline
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        آخر تقديم: {formatDate(opp.applicationDeadline)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                        {slotsLeft > 0 ? `${slotsLeft} مقعد متاح` : 'مكتمل'}
                      </span>
                      {opp.isPaid ? (
                        <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">
                          {opp.fee} {opp.currency}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                          مجاني
                        </span>
                      )}
                    </div>

                    {/* Apply button */}
                    <button
                      onClick={e => { e.stopPropagation(); openApplyModal(opp); }}
                      disabled={slotsLeft <= 0}
                      className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {slotsLeft <= 0 ? 'المقاعد مكتملة' : 'تقدم الآن'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply Modal — bottom sheet */}
      {showApplyModal && selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-end" dir="rtl">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowApplyModal(false)}
          />
          {/* Sheet */}
          <div className="relative w-full bg-white rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                التقديم على: {selectedOpp.title}
              </h2>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Position */}
              <div>
                <label className="text-xs text-gray-600 font-medium mb-1 block">
                  مركز اللعب (اختياري)
                </label>
                <input
                  type="text"
                  value={applyPosition}
                  onChange={e => setApplyPosition(e.target.value)}
                  placeholder="مثال: ST أو GK"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs text-gray-600 font-medium mb-1 block">
                  رسالة إضافية (اختياري، بحد أقصى 500 حرف)
                </label>
                <textarea
                  value={applyMessage}
                  onChange={e => setApplyMessage(e.target.value.slice(0, 500))}
                  placeholder="اكتب أي معلومات إضافية تريد مشاركتها..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
                <p className="text-xs text-gray-400 text-left mt-0.5">{applyMessage.length}/500</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارٍ التقديم...
                  </>
                ) : (
                  'تأكيد التقديم'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const { user, userData } = useAuth();
  const accountType = userData?.accountType;

  if (!userData || !user) return <LoadingSpinner />;

  if (accountType === 'player') {
    return <ExploreView user={user} userData={userData} />;
  }

  return <PublisherView user={user} userData={userData} />;
}
