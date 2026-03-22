'use client';
import React from 'react';
import { useCampaign } from '@/lib/campaign/campaign-context';
import { CheckCircle2, X, Loader2 } from 'lucide-react';

export const CampaignProgressFloat: React.FC = () => {
  const { campaign, dismissResult } = useCampaign();

  if (campaign.status === 'idle') return null;

  const isRunning = campaign.status === 'running';

  return (
    <div className="fixed bottom-6 left-6 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-2" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning
            ? <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          <span className="text-xs font-bold text-slate-700">
            {isRunning ? 'حملة جارية...' : 'اكتملت الحملة ✅'}
          </span>
        </div>
        {!isRunning && (
          <button onClick={dismissResult} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
          style={{ width: `${campaign.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>القالب: <span className="font-semibold text-slate-700">{campaign.templateName}</span></span>
        <span className="font-bold">{campaign.progress}%</span>
      </div>

      <div className="flex gap-3 text-[10px]">
        <span className="text-emerald-600 font-bold">✅ {campaign.success} نجح</span>
        <span className="text-rose-500 font-bold">❌ {campaign.failed} فشل</span>
        <span className="text-slate-400">من {campaign.total}</span>
      </div>

      {campaign.failedEntries.length > 0 && (
        <details className="text-[10px]" open={!isRunning && campaign.failed > 0}>
          <summary className="cursor-pointer text-rose-500 font-semibold select-none">
            {isRunning ? `❌ ${campaign.failed} فشل حتى الآن` : `تفاصيل الفشل (${campaign.failedEntries.length})`}
          </summary>
          <div className="mt-1 max-h-36 overflow-y-auto space-y-1 pr-1">
            {campaign.failedEntries.map((f, i) => (
              <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg p-1.5 space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-rose-700 truncate max-w-[120px]">{f.name}</span>
                  <span className="font-mono text-rose-500 text-[9px]">{f.phone}</span>
                </div>
                {f.reason && (
                  <p className="text-[9px] text-rose-400 leading-tight break-words">{f.reason}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
