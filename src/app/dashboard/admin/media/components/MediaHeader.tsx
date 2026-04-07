'use client';
import { RefreshCw, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    onRefresh: () => void;
    loading: boolean;
    lastFetched: Date | null;
}

export function MediaHeader({ onRefresh, loading, lastFetched }: Props) {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow">
                        <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 leading-none">مركز الوسائط</h1>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {lastFetched ? `آخر تحديث: ${lastFetched.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : 'جاري التحميل...'}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    className="gap-2 h-9 text-xs font-medium"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    تحديث
                </Button>
            </div>
        </header>
    );
}
