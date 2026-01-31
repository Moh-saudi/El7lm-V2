'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Globe, TrendingUp, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getLandingStats, updateLandingStats, LandingStats } from '@/lib/content/stats-service';

export default function StatsManager() {
    const [stats, setStats] = useState<LandingStats>({
        players: 0,
        countries: 0,
        successRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await getLandingStats();
            setStats(data);
        } catch (error) {
            toast.error('فشل تحميل الإحصائيات');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateLandingStats(stats);
            toast.success('تم تحديث الإحصائيات بنجاح');
        } catch (error) {
            toast.error('حدث خطأ أثناء الحفظ');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof LandingStats, value: string) => {
        setStats({ ...stats, [field]: Number(value) });
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">جاري تحميل البيانات...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                {/* Players Stat */}
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center hover:border-blue-400 transition-colors">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                        <Users size={24} />
                    </div>
                    <label className="text-sm text-slate-500 mb-2 font-medium">عدد اللاعبين المسجلين</label>
                    <input
                        type="number"
                        value={stats.players}
                        onChange={(e) => handleChange('players', e.target.value)}
                        className="text-3xl font-bold bg-transparent border-b-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none w-32 text-center pb-1 transition-colors"
                    />
                </div>

                {/* Countries Stat */}
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center hover:border-purple-400 transition-colors">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-4">
                        <Globe size={24} />
                    </div>
                    <label className="text-sm text-slate-500 mb-2 font-medium">عدد الدول النشطة</label>
                    <input
                        type="number"
                        value={stats.countries}
                        onChange={(e) => handleChange('countries', e.target.value)}
                        className="text-3xl font-bold bg-transparent border-b-2 border-slate-100 dark:border-slate-700 focus:border-purple-500 outline-none w-32 text-center pb-1 transition-colors"
                    />
                    <p className="text-[10px] text-slate-400 mt-2">سيتم تحديث القائمة في الواجهة</p>
                </div>

                {/* Success Rate Stat */}
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center hover:border-green-400 transition-colors">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                        <TrendingUp size={24} />
                    </div>
                    <label className="text-sm text-slate-500 mb-2 font-medium">نسبة نجاح التسويق</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={stats.successRate}
                            onChange={(e) => handleChange('successRate', e.target.value)}
                            className="text-3xl font-bold bg-transparent border-b-2 border-slate-100 dark:border-slate-700 focus:border-green-500 outline-none w-24 text-center pb-1 transition-colors pl-6"
                        />
                        <span className="absolute right-0 top-1 text-xl font-bold text-slate-400">%</span>
                    </div>
                </div>

            </div>

            <div className="flex justify-end border-t border-slate-100 dark:border-slate-700 pt-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-bold"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    حفظ التعديلات
                </button>
            </div>
        </div>
    );
}
