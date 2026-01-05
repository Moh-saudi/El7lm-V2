import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Clock, CheckCircle, XCircle } from "lucide-react";

interface MediaStatsProps {
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

export const MediaStats: React.FC<MediaStatsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: 'إجمالي المحتوى', value: stats.total, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'بانتظار المراجعة', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                { label: 'تمت الموافقة', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'طلبات مرفوضة', value: stats.rejected, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
            ].map((item, i) => (
                <Card key={i} className={`${item.bg} ${item.border} border shadow-sm rounded-xl`}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{item.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg bg-white shadow-sm ${item.color}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
