'use client';

import { RefreshCw, Activity, Cpu, MessageSquareText } from 'lucide-react';
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
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/10 border border-emerald-200/40">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-base md:text-lg font-black text-slate-900 leading-tight">
                                استوديو الكشافة الفني وتحليل الأداء (معايير الحلم الدولية)
                            </h1>
                            <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <Cpu className="w-3 h-3 text-emerald-600" /> رصد حاسوبي + كشاف معتمد
                            </span>
                            <span className="hidden lg:inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                <MessageSquareText className="w-3 h-3 text-emerald-600" /> مراسلة واتساب مباشرة 💬
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                            <span>تقييم المهارات الست ومزامنة بروفايل اللاعبين</span>
                            <span>•</span>
                            <span>
                                {lastFetched
                                    ? `آخر مزامنة: ${lastFetched.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
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
                        className="gap-2 h-9 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                        <span>تحديث</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
