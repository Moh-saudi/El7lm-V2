'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, Target, Clock, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, Star, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { getPlayerApplications, rateApplication } from '@/lib/firebase/opportunities';
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/config';
import { OpportunityApplication, ApplicationStatus, OpportunityType } from '@/types/opportunities';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; icon: any; bg: string; text: string; border: string }> = {
  pending:    { label: 'قيد المراجعة', icon: Clock,         bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
  reviewed:   { label: 'تمت المراجعة', icon: AlertCircle,   bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200'   },
  accepted:   { label: 'مقبول ✓',      icon: CheckCircle,   bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200'  },
  rejected:   { label: 'مرفوض',        icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200'    },
  waitlisted: { label: 'قائمة الانتظار', icon: Clock,       bg: 'bg-gray-50',    text: 'text-gray-600',   border: 'border-gray-200'   },
};

// ─── Star Rating Component ─────────────────────────────────────────────────────

function StarRating({
  appId,
  existingRating,
  onRated,
}: {
  appId: string;
  existingRating?: number;
  onRated: (id: string, rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleRate = async (rating: number) => {
    if (existingRating) return;
    try {
      setSaving(true);
      await rateApplication(appId, rating);
      onRated(appId, rating);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const display = existingRating ?? hovered;

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 font-medium">
        {existingRating ? 'تقييمك لهذه الفرصة:' : 'قيّم هذه الفرصة:'}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            disabled={!!existingRating || saving}
            onClick={() => handleRate(star)}
            onMouseEnter={() => !existingRating && setHovered(star)}
            onMouseLeave={() => !existingRating && setHovered(0)}
            className="disabled:cursor-default"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                star <= display
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {saving && <Loader2 className="w-4 h-4 text-gray-400 animate-spin ms-1" />}
        {existingRating ? (
          <span className="text-xs text-gray-500 ms-1">{existingRating}/5</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | ApplicationStatus>('all');

  useEffect(() => {
    if (!user?.uid) return;
    getPlayerApplications(user.uid)
      .then(setApplications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const tabs: { key: 'all' | ApplicationStatus; label: string }[] = [
    { key: 'all',       label: 'الكل'           },
    { key: 'pending',   label: 'قيد المراجعة'   },
    { key: 'accepted',  label: 'مقبولة'          },
    { key: 'rejected',  label: 'مرفوضة'          },
  ];

  const filtered = activeTab === 'all'
    ? applications
    : applications.filter(a => a.status === activeTab);

  const counts = {
    pending:  applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  // Deadline warning: find applications with deadline within 3 days
  const urgentDeadlines = applications.filter(a => {
    if (!a.opportunityDeadline) return false;
    const days = daysUntil(a.opportunityDeadline);
    return days >= 0 && days <= 3;
  });

  const handleRated = (appId: string, rating: number) => {
    setApplications(prev =>
      prev.map(a => a.id === appId ? { ...a, rating } : a)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir="rtl">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 p-1">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">طلباتي</h1>
            <p className="text-xs text-gray-400">تتبع طلبات التقديم على الفرص</p>
          </div>
          <Link
            href="/dashboard/opportunities"
            className="text-xs text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
          >
            استكشاف فرص
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">

        {/* Deadline Warning Banner */}
        {urgentDeadlines.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-yellow-800 mb-1">تنبيه: اقتراب موعد الإغلاق</p>
              {urgentDeadlines.map(a => {
                const days = daysUntil(a.opportunityDeadline!);
                return (
                  <p key={a.id} className="text-xs text-yellow-700">
                    <span className="font-semibold">{a.opportunityTitle || 'فرصة'}</span>
                    {' — '}
                    {days === 0 ? 'ينتهي اليوم' : `${days} ${days === 1 ? 'يوم' : 'أيام'} متبقية`}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'قيد المراجعة', value: counts.pending,  bg: 'bg-yellow-50', text: 'text-yellow-700' },
            { label: 'مقبولة',       value: counts.accepted, bg: 'bg-green-50',  text: 'text-green-700'  },
            { label: 'مرفوضة',       value: counts.rejected, bg: 'bg-red-50',    text: 'text-red-700'    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">لا توجد طلبات في هذا التصنيف</p>
            <Link
              href="/dashboard/opportunities"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
            >
              استكشاف الفرص المتاحة
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(app => {
              const st = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = st.icon;

              return (
                <div
                  key={app.id}
                  className={`bg-white rounded-xl border ${st.border} overflow-hidden shadow-sm`}
                >
                  {/* Status bar */}
                  <div className={`${st.bg} px-4 py-2 flex items-center justify-between`}>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {st.label}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(app.appliedAt)}</span>
                  </div>

                  <div className="p-4 space-y-2">
                    {/* Title */}
                    <h3 className="text-sm font-bold text-gray-900 leading-snug">
                      {app.opportunityTitle || 'فرصة رياضية'}
                    </h3>

                    {/* Organizer */}
                    {app.organizerName && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {app.organizerName}
                        {app.organizerType && (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded-full ms-1">
                            {app.organizerType}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Position submitted */}
                    {app.playerPosition && (
                      <p className="text-xs text-gray-500">
                        المركز المقدم: <span className="font-semibold text-gray-700">{app.playerPosition}</span>
                      </p>
                    )}

                    {/* Deadline */}
                    {app.opportunityDeadline && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        آخر موعد: {formatDate(app.opportunityDeadline)}
                        {daysUntil(app.opportunityDeadline) >= 0 && daysUntil(app.opportunityDeadline) <= 3 && (
                          <span className="text-yellow-600 font-semibold">
                            ({daysUntil(app.opportunityDeadline) === 0 ? 'اليوم' : `${daysUntil(app.opportunityDeadline)} أيام`})
                          </span>
                        )}
                      </p>
                    )}

                    {/* Message */}
                    {app.message && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 line-clamp-2">
                        "{app.message}"
                      </p>
                    )}

                    {/* Review note if accepted/rejected */}
                    {app.reviewNote && (
                      <div className={`text-xs px-3 py-2 rounded-lg ${st.bg} ${st.text}`}>
                        <span className="font-semibold">ملاحظة المراجع: </span>
                        {app.reviewNote}
                      </div>
                    )}

                    {/* Accepted congratulations */}
                    {app.status === 'accepted' && (
                      <div className="bg-green-500 text-white text-xs font-semibold text-center py-2 rounded-lg">
                        تهانينا! تم قبول طلبك. ستُتواصل معك قريباً.
                      </div>
                    )}

                    {/* Star rating for accepted applications */}
                    {app.status === 'accepted' && (
                      <StarRating
                        appId={app.id}
                        existingRating={app.rating}
                        onRated={handleRated}
                      />
                    )}
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
