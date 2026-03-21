'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, Users, CheckCircle, XCircle, Clock,
  Loader2, MapPin, MessageSquare, ExternalLink,
  Download, Search, Filter, SquareCheck, Square,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import {
  getOpportunityById,
  getOpportunityApplications,
  updateApplicationStatus,
} from '@/lib/firebase/opportunities';
import {
  notifyApplicationAccepted,
  notifyApplicationRejected,
} from '@/lib/opportunities/notifications';
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/config';
import { Opportunity, OpportunityApplication, ApplicationStatus, OpportunityType } from '@/types/opportunities';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'أمس';
    if (diff < 7) return `منذ ${diff} أيام`;
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase();
}

function nameToColor(name: string) {
  const colors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500','bg-indigo-500','bg-teal-500','bg-red-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const STATUS_CFG: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  pending:    { label: 'قيد المراجعة', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  reviewed:   { label: 'تمت المراجعة', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  accepted:   { label: 'مقبول ✓',      bg: 'bg-green-100',  text: 'text-green-700'  },
  rejected:   { label: 'مرفوض',        bg: 'bg-red-100',    text: 'text-red-700'    },
  waitlisted: { label: 'قائمة الانتظار', bg: 'bg-gray-100', text: 'text-gray-600'   },
};

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  returnPath,
  onAccept,
  onReject,
  isProcessing,
  selected,
  onToggleSelect,
}: {
  app: OpportunityApplication;
  returnPath: string;
  onAccept: () => void;
  onReject: (note: string) => void;
  isProcessing: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const statusCfg = STATUS_CFG[app.status];
  const isPending = app.status === 'pending';

  const profileUrl = `/dashboard/shared/player-profile/${app.playerId}?returnPath=${encodeURIComponent(returnPath)}`;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${selected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      {/* Status stripe */}
      <div className={`h-1 w-full ${
        app.status === 'accepted' ? 'bg-green-400'
        : app.status === 'rejected' ? 'bg-red-400'
        : app.status === 'pending' ? 'bg-yellow-400'
        : 'bg-gray-200'
      }`} />

      <div className="p-4 space-y-3">
        {/* Checkbox + Avatar + name + status */}
        <div className="flex items-start gap-3">
          <button
            onClick={onToggleSelect}
            className="mt-1 flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
          >
            {selected
              ? <SquareCheck className="w-5 h-5 text-blue-500" />
              : <Square className="w-5 h-5" />
            }
          </button>
          {app.playerAvatarUrl ? (
            <img
              src={app.playerAvatarUrl}
              alt={app.playerName}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`w-12 h-12 rounded-xl ${nameToColor(app.playerName)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
              {getInitials(app.playerName)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-gray-900">{app.playerName}</span>
              {app.playerPosition && (
                <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-semibold">
                  {app.playerPosition}
                </span>
              )}
              <span className={`mr-auto text-xs px-2 py-0.5 rounded-full font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {app.playerCountry && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" /> {app.playerCountry}
                </span>
              )}
              {app.playerAge && (
                <span className="text-xs text-gray-500">{app.playerAge} سنة</span>
              )}
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <Clock className="w-3 h-3" /> {formatDate(app.appliedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Player message */}
        {app.message && (
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> رسالة اللاعب
            </p>
            <p className="text-sm text-gray-700 line-clamp-2">{app.message}</p>
          </div>
        )}

        {/* Review note */}
        {app.reviewNote && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2 text-xs text-yellow-700">
            <span className="font-semibold">ملاحظة: </span>{app.reviewNote}
          </div>
        )}

        {/* View full profile */}
        <a
          href={profileUrl}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          عرض الملف الكامل (صورة — فيديوهات — إحصائيات)
        </a>

        {/* Actions — pending only */}
        {isPending && (
          <div className="space-y-2">
            {showReject && (
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="سبب الرفض (اختياري)..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={onAccept}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                قبول
              </button>
              {!showReject ? (
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> رفض
                </button>
              ) : (
                <button
                  onClick={() => { onReject(rejectNote); setShowReject(false); }}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  تأكيد الرفض
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(applications: OpportunityApplication[], title: string) {
  const headers = ['الاسم', 'المركز', 'الدولة', 'العمر', 'تاريخ التقديم', 'الحالة', 'الرسالة'];
  const rows = applications.map(a => [
    a.playerName,
    a.playerPosition || '',
    a.playerCountry || '',
    a.playerAge?.toString() || '',
    new Date(a.appliedAt).toLocaleDateString('ar-SA'),
    STATUS_CFG[a.status]?.label || a.status,
    (a.message || '').replace(/,/g, ' ').replace(/\n/g, ' '),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `applicants_${title}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'accepted' | 'rejected';

export default function ApplicationsPage() {
  const params  = useParams();
  const router  = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [opportunity, setOpportunity]   = useState<Opportunity | null>(null);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterTab, setFilterTab]       = useState<FilterTab>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Applicant filters
  const [searchName, setSearchName]   = useState('');
  const [filterPos, setFilterPos]     = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterAgeMin, setFilterAgeMin]   = useState('');
  const [filterAgeMax, setFilterAgeMax]   = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Return path so the shared profile page knows where to go back
  const returnPath = typeof window !== 'undefined' ? window.location.pathname : `/dashboard/opportunities/${id}/applications`;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [opp, apps] = await Promise.all([
          getOpportunityById(id),
          getOpportunityApplications(id),
        ]);
        setOpportunity(opp);
        setApplications(apps);
      } catch {
        toast.error('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAccept = async (app: OpportunityApplication) => {
    if (!user || !opportunity) return;
    try {
      setProcessingId(app.id);
      await updateApplicationStatus(app.id, 'accepted', user.uid);
      await notifyApplicationAccepted(app.playerId, opportunity.title, opportunity.organizerName);
      toast.success('تم قبول الطلب');
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'accepted' } : a));
    } catch { toast.error('فشل تحديث الطلب'); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (app: OpportunityApplication, note: string) => {
    if (!user || !opportunity) return;
    try {
      setProcessingId(app.id);
      await updateApplicationStatus(app.id, 'rejected', user.uid, note || undefined);
      await notifyApplicationRejected(app.playerId, opportunity.title, opportunity.organizerName);
      toast.success('تم رفض الطلب');
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected', reviewNote: note } : a));
    } catch { toast.error('فشل تحديث الطلب'); }
    finally { setProcessingId(null); }
  };

  // Bulk actions
  const handleBulkAccept = async () => {
    if (!user || !opportunity || selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const targets = applications.filter(a => selectedIds.has(a.id) && a.status === 'pending');
      await Promise.all(targets.map(async app => {
        await updateApplicationStatus(app.id, 'accepted', user.uid);
        await notifyApplicationAccepted(app.playerId, opportunity.title, opportunity.organizerName);
      }));
      setApplications(prev => prev.map(a =>
        selectedIds.has(a.id) && a.status === 'pending' ? { ...a, status: 'accepted' } : a
      ));
      toast.success(`تم قبول ${targets.length} طلب`);
      setSelectedIds(new Set());
    } catch { toast.error('حدث خطأ أثناء المعالجة الجماعية'); }
    finally { setBulkProcessing(false); }
  };

  const handleBulkReject = async () => {
    if (!user || !opportunity || selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const targets = applications.filter(a => selectedIds.has(a.id) && a.status === 'pending');
      await Promise.all(targets.map(async app => {
        await updateApplicationStatus(app.id, 'rejected', user.uid);
        await notifyApplicationRejected(app.playerId, opportunity.title, opportunity.organizerName);
      }));
      setApplications(prev => prev.map(a =>
        selectedIds.has(a.id) && a.status === 'pending' ? { ...a, status: 'rejected' } : a
      ));
      toast.success(`تم رفض ${targets.length} طلب`);
      setSelectedIds(new Set());
    } catch { toast.error('حدث خطأ أثناء المعالجة الجماعية'); }
    finally { setBulkProcessing(false); }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'الكل'         },
    { key: 'pending',  label: 'قيد المراجعة' },
    { key: 'accepted', label: 'مقبول'         },
    { key: 'rejected', label: 'مرفوض'         },
  ];

  // Unique positions and countries for filter selects
  const uniquePositions = useMemo(() =>
    [...new Set(applications.map(a => a.playerPosition).filter(Boolean) as string[])], [applications]);
  const uniqueCountries = useMemo(() =>
    [...new Set(applications.map(a => a.playerCountry).filter(Boolean) as string[])], [applications]);

  const filtered = applications.filter(a => {
    if (filterTab !== 'all' && a.status !== filterTab) return false;
    if (searchName && !a.playerName.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (filterPos && a.playerPosition !== filterPos) return false;
    if (filterCountry && a.playerCountry !== filterCountry) return false;
    if (filterAgeMin && a.playerAge !== undefined && a.playerAge < Number(filterAgeMin)) return false;
    if (filterAgeMax && a.playerAge !== undefined && a.playerAge > Number(filterAgeMax)) return false;
    return true;
  });

  const stats = {
    total:    applications.length,
    pending:  applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const acceptanceRate = stats.total > 0
    ? Math.round((stats.accepted / stats.total) * 100)
    : 0;

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" dir="rtl">
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
    </div>
  );

  if (!opportunity) return (
    <div className="flex items-center justify-center min-h-screen text-gray-500" dir="rtl">
      <p>لم يتم العثور على الفرصة</p>
    </div>
  );

  const cfg = OPPORTUNITY_TYPES[opportunity.opportunityType] ?? { label: opportunity.opportunityType, emoji: '📌', color: '#6B7280' };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{opportunity.title}</h1>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white mt-0.5"
              style={{ backgroundColor: cfg.color }}
            >
              {cfg.emoji} {cfg.label}
            </span>
          </div>
          <button
            onClick={() => exportCSV(applications, opportunity.title)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير CSV
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { value: stats.total,       label: 'الكل',         color: 'text-gray-700'   },
            { value: stats.pending,     label: 'معلق',         color: 'text-yellow-600' },
            { value: stats.accepted,    label: 'مقبول',        color: 'text-green-600'  },
            { value: stats.rejected,    label: 'مرفوض',        color: 'text-red-600'    },
            { value: `${acceptanceRate}%`, label: 'نسبة القبول', color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilterTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Panel Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterPanel(p => !p)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            تصفية المتقدمين
          </button>
          {filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {selectedIds.size === filtered.length ? 'إلغاء التحديد' : 'تحديد الكل'}
            </button>
          )}
          {selectedIds.size > 0 && (
            <span className="text-xs text-blue-600 font-bold">
              {selectedIds.size} محدد
            </span>
          )}
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="بحث بالاسم..."
                className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterPos}
                onChange={e => setFilterPos(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
              >
                <option value="">كل المراكز</option>
                {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
              >
                <option value="">كل الدول</option>
                {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={filterAgeMin}
                onChange={e => setFilterAgeMin(e.target.value)}
                placeholder="العمر من"
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <input
                type="number"
                value={filterAgeMax}
                onChange={e => setFilterAgeMax(e.target.value)}
                placeholder="العمر إلى"
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <button
              onClick={() => { setSearchName(''); setFilterPos(''); setFilterCountry(''); setFilterAgeMin(''); setFilterAgeMax(''); }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              مسح الفلاتر
            </button>
          </div>
        )}

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد طلبات في هذه الحالة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                returnPath={returnPath}
                onAccept={() => handleAccept(app)}
                onReject={(note) => handleReject(app, note)}
                isProcessing={processingId === app.id}
                selected={selectedIds.has(app.id)}
                onToggleSelect={() => toggleSelect(app.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 right-0 left-0 z-20 bg-white border-t border-gray-200 shadow-lg px-4 py-3" dir="rtl">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <span className="text-sm font-bold text-gray-700 flex-1">
              {selectedIds.size} طلب محدد
            </span>
            <button
              onClick={handleBulkAccept}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              قبول {selectedIds.size}
            </button>
            <button
              onClick={handleBulkReject}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              رفض {selectedIds.size}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
