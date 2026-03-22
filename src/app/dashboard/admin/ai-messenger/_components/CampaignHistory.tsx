'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, orderBy, query, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, Send, Radio } from 'lucide-react';
import { useCampaign } from '@/lib/campaign/campaign-context';

interface CampaignLog {
  id: string;
  templateName: string;
  templateBody?: string;
  segment: string;
  countries: string[];
  total: number;
  success: number;
  failed: number;
  failedEntries: { phone: string; name: string; reason?: string }[];
  status: 'running' | 'completed';
  startedAt: any;
  finishedAt: any;
}

const formatDate = (ts: any): string => {
  if (!ts) return '—';
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
};

const durationStr = (start: any, end: any): string => {
  if (!start || !end) return '—';
  const s = start instanceof Timestamp ? start.toDate() : new Date(start);
  const e = end instanceof Timestamp ? end.toDate() : new Date(end);
  const diffMs = e.getTime() - s.getTime();
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return mins > 0 ? `${mins}د ${secs}ث` : `${secs}ث`;
};

export const CampaignHistory: React.FC = () => {
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { campaign } = useCampaign();

  const isActiveCampaign = campaign.status === 'running' || campaign.status === 'completed';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try with orderBy first (requires index)
      const snap = await getDocs(
        query(collection(db, 'campaign_logs'), orderBy('startedAt', 'desc'), limit(50))
      );
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as CampaignLog)));
    } catch (e: any) {
      // Fallback: fetch without ordering (no index required)
      try {
        const snap2 = await getDocs(collection(db, 'campaign_logs'));
        const items = snap2.docs.map(d => ({ id: d.id, ...d.data() } as CampaignLog));
        items.sort((a, b) => {
          const ta = a.startedAt?.toDate?.()?.getTime?.() ?? 0;
          const tb = b.startedAt?.toDate?.()?.getTime?.() ?? 0;
          return tb - ta;
        });
        setLogs(items);
      } catch (e2: any) {
        setError(e2?.message || 'خطأ في تحميل السجلات');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-40 text-rose-400 text-xs gap-2 p-4 text-center" dir="rtl">
      <History className="w-8 h-8 opacity-30" />
      <p className="font-bold text-sm">خطأ في تحميل السجلات</p>
      <p className="text-[10px] text-slate-400 break-all max-w-xs">{error}</p>
      <button onClick={load} className="mt-1 text-[10px] text-emerald-600 font-bold underline">إعادة المحاولة</button>
    </div>
  );

  if (logs.length === 0 && !isActiveCampaign) return (
    <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2" dir="rtl">
      <History className="w-10 h-10 opacity-20" />
      <p className="font-semibold">لا توجد حملات مسجّلة بعد</p>
      <p className="text-[10px] text-slate-300">ستظهر الحملات هنا بعد إطلاق أول حملة</p>
      <button onClick={load} className="mt-1 text-[10px] text-emerald-600 font-bold underline">تحديث</button>
    </div>
  );

  return (
    <div className="space-y-3 overflow-y-auto max-h-full custom-scrollbar" dir="rtl">

      {/* Header with count + refresh */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-slate-400">{logs.length} حملة مسجّلة</span>
        <button onClick={load} className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1">
          <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : 'opacity-0'}`} />
          تحديث
        </button>
      </div>

      {/* ── Live campaign (from context) ─────────────────────────── */}
      {isActiveCampaign && (
        <Card className="border-2 border-emerald-200 bg-emerald-50/40 rounded-xl shadow-sm">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {campaign.status === 'running'
                  ? <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  : <Send className="w-3.5 h-3.5 text-emerald-500" />}
                <span className="text-xs font-bold text-emerald-700">
                  {campaign.status === 'running' ? '🔴 حملة جارية الآن' : '✅ اكتملت للتو'}
                </span>
                <Badge className="text-[9px] px-1.5 py-0 border-none bg-emerald-100 text-emerald-700">
                  {campaign.templateName}
                </Badge>
              </div>
              <span className="text-[10px] font-bold text-emerald-600">{campaign.progress}%</span>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {/* Progress bar */}
            <div className="w-full bg-emerald-100 h-1.5 rounded-full">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${campaign.progress}%` }} />
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'الإجمالي', val: campaign.total,   cls: 'text-slate-700' },
                { label: 'نجح',      val: campaign.success, cls: 'text-emerald-600' },
                { label: 'فشل',      val: campaign.failed,  cls: 'text-rose-500'   },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-1.5 text-center border border-emerald-100">
                  <div className={`text-sm font-black ${s.cls}`}>{s.val}</div>
                  <div className="text-[9px] text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Failed entries live */}
            {campaign.failedEntries.length > 0 && (
              <details>
                <summary className="text-[10px] text-rose-500 font-bold cursor-pointer">
                  تفاصيل الفشل ({campaign.failedEntries.length})
                </summary>
                <div className="mt-1 max-h-28 overflow-y-auto space-y-1">
                  {campaign.failedEntries.map((f, i) => (
                    <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg px-2 py-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-semibold text-rose-700">{f.name}</span>
                        <span className="font-mono text-rose-400">{f.phone}</span>
                      </div>
                      {f.reason && <p className="text-[9px] text-rose-400 mt-0.5 break-words">{f.reason}</p>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Past campaigns from Firestore ────────────────────────── */}
      {logs.map(log => {
        const successRate = log.total > 0 ? Math.round((log.success / log.total) * 100) : 0;
        const isExpanded = expanded === log.id;
        return (
          <Card key={log.id} className="border border-slate-100 shadow-sm rounded-xl">
            <CardHeader
              className="p-3 pb-2 cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : log.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Send className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 truncate">{log.templateName}</span>
                  <Badge className={`text-[9px] px-1.5 py-0 border-none shrink-0 ${log.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {log.status === 'completed' ? 'مكتملة' : 'جارية'}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{formatDate(log.startedAt)}</span>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-3 pt-0 space-y-3 text-xs">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'الإجمالي', val: log.total, cls: 'text-slate-700' },
                    { label: 'نجح',      val: log.success, cls: 'text-emerald-600' },
                    { label: 'فشل',      val: log.failed,  cls: 'text-rose-500' },
                  ].map((s, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className={`text-base font-black ${s.cls}`}>{s.val}</div>
                      <div className="text-[10px] text-slate-400">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>معدل النجاح</span>
                    <span className="font-bold text-emerald-600">{successRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: `${successRate}%` }} />
                  </div>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500">
                  <span>الفئة: <span className="font-semibold text-slate-700">{log.segment === 'all' ? 'الكل' : log.segment}</span></span>
                  <span>المدة: <span className="font-semibold text-slate-700">{durationStr(log.startedAt, log.finishedAt)}</span></span>
                  <span>الدول: <span className="font-semibold text-slate-700">{log.countries?.length ? log.countries.join('، ') : 'الكل'}</span></span>
                  <span>انتهت: <span className="font-semibold text-slate-700">{formatDate(log.finishedAt)}</span></span>
                </div>

                {/* Template body */}
                {log.templateBody && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px] text-slate-500 leading-relaxed">
                    {log.templateBody}
                  </div>
                )}

                {/* Failed entries */}
                {log.failedEntries?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-rose-500 mb-1">الأرقام الفاشلة ({log.failedEntries.length})</p>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {log.failedEntries.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-rose-50 rounded-lg px-2 py-1">
                          <span className="text-[10px] text-rose-700 font-medium">{f.name}</span>
                          <span className="text-[10px] font-mono text-rose-500">{f.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
