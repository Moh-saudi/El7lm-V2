import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    MessageSquare,
    AlertCircle,
    Clock,
    CheckCircle,
    TrendingUp,
    BarChart3
} from 'lucide-react';

interface SupportStatsProps {
    stats: {
        totalConversations: number;
        openConversations: number;
        inProgressConversations: number;
        resolvedToday: number;
        avgResponseTime: string;
    };
}

export const SupportStats: React.FC<SupportStatsProps> = ({ stats }) => {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <CardContent className="p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-3xl font-bold tracking-tight">{stats.totalConversations}</p>
                            <p className="text-xs text-blue-100 mt-1 font-medium">إجمالي المحادثات</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <MessageSquare className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-blue-100">
                        <BarChart3 className="h-3 w-3" />
                        <span>+12% عن الشهر الماضي</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <CardContent className="p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-3xl font-bold tracking-tight">{stats.openConversations}</p>
                            <p className="text-xs text-indigo-100 mt-1 font-medium">محادثات مفتوحة</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-indigo-100">
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">تتطلب اهتمام</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <CardContent className="p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-3xl font-bold tracking-tight">{stats.inProgressConversations}</p>
                            <p className="text-xs text-amber-100 mt-1 font-medium">قيد المعالجة</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <Clock className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-amber-100">
                        <span>جاري العمل عليها</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <CardContent className="p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-3xl font-bold tracking-tight">{stats.resolvedToday}</p>
                            <p className="text-xs text-emerald-100 mt-1 font-medium">محلولة اليوم</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-emerald-100">
                        <span>أداء ممتاز 🚀</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <CardContent className="p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-2xl font-bold tracking-tight flex items-end gap-1">
                                {stats.avgResponseTime}
                                <span className="text-xs font-normal mb-1 opacity-70">دقيقة</span>
                            </p>
                            <p className="text-xs text-slate-300 mt-1 font-medium">متوسط الرد</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-slate-300">
                        <span className="text-emerald-400 font-bold">-2 دقيقة</span>
                        <span>عن المعدل</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
