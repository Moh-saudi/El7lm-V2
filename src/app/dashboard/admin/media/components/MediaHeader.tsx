'use client';

import { RefreshCw, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    onRefresh: () => void;
    loading: boolean;
    lastFetched: Date | null;
}

export function MediaHeader({ onRefresh, loading, lastFetched }: Props) {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-6 h-18 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/10">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base md:text-lg font-black text-slate-900 leading-tight">
                                استوديو تحليل أداء اللاعبين والوسائط
                            </h1>
                            <span className="hidden sm:inline-flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200/60 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <Sparkles className="w-3 h-3 text-emerald-600" /> هجين AI + محلل بشري
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                            <span>تحليل المهارات الست والتقييم الكروي المعتمد</span>
                            <span>•</span>
                            <span>
                                {lastFetched
                                    ? `آخر تحديث: ${lastFetched.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                                    : 'جاري جلب الفيديوهات...'}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={loading}
                        className="gap-2 h-9 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                        <span>تحديث</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
