'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem, FootballSkills, detectMediaSource } from '../types';
import { Sliders, Sparkles, AlertCircle, Award, User } from 'lucide-react';
import {
    checkIsGoalkeeper, getSkillDefinitions, getSkillBadgeColor,
    getScoreTier, calculateOverall, DEFAULT_SKILLS_GK
} from './studio-utils';
import { RadarChart } from './RadarChart';

interface Props {
    item: MediaItem;
    skills: FootballSkills;
    onSkillChange: (key: keyof FootballSkills, val: number) => void;
    dominantFoot: string;
    onDominantFootChange: (foot: string) => void;
    analystNotes: string;
    onAnalystNotesChange: (notes: string) => void;
    analyzing: boolean;
    aiError: string | null;
    onAnalyze: () => void;
}

export function SkillsMatrix({
    item, skills, onSkillChange,
    dominantFoot, onDominantFootChange,
    analystNotes, onAnalystNotesChange,
    analyzing, aiError, onAnalyze,
}: Props) {
    const isGK = useMemo(() => checkIsGoalkeeper(item.position), [item.position]);
    const skillDefs = useMemo(() => getSkillDefinitions(isGK), [isGK]);
    const calculatedOverall = useMemo(() => calculateOverall(skills, isGK), [skills, isGK]);
    const tier = getScoreTier(calculatedOverall);
    const detectedSource = useMemo(() => detectMediaSource(item), [item]);

    return (
        <div className="space-y-4">
            {/* AI Quick Analysis Bar */}
            <div className="bg-white border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">
                                {detectedSource === 'direct'
                                    ? 'مساعد الكشاف — فحص اللقطات المباشرة (Computer Vision)'
                                    : detectedSource === 'youtube'
                                        ? 'مساعد الكشاف — فحص لقطات YouTube 🔴'
                                        : 'مساعد الكشاف — التقييم التكتيكي التخصصي 🌐'}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-2xs">
                                {isGK ? 'تحليل حراسة المرمى 🧤' : 'تحليل الأداء الرياضي ⚽'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                            {detectedSource === 'direct'
                                ? `فيديو مرفوع سحابياً • استخراج الإطارات لمركز (${item.position || 'اللاعب'})`
                                : detectedSource === 'youtube'
                                    ? `رابط YouTube • تقرير كشفي لمركز (${item.position || 'اللاعب'})`
                                    : `رابط خارجي • معايير الكشافة لمركز (${item.position || 'اللاعب'})`}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={onAnalyze}
                    disabled={analyzing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8.5 px-3.5 text-xs gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
                >
                    <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                    <span>
                        {analyzing ? 'جاري الفحص التكتيكي...'
                            : detectedSource === 'direct' ? 'تشغيل الفحص البصري ⚡'
                            : detectedSource === 'youtube' ? 'تحليل لقطات YouTube ⚡'
                            : 'تطبيق التقييم المقترح 📋'}
                    </span>
                </Button>
            </div>

            {aiError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold">تنبيه أثناء التحليل:</p>
                        <p className="mt-0.5 text-rose-700">{aiError}</p>
                    </div>
                </div>
            )}

            {/* ═══ Player Card + Radar Chart ═══ */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex flex-col lg:flex-row items-start gap-4">
                    {/* Player Info + OVR */}
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                                {item.userImage ? (
                                    <img src={item.userImage} alt={item.userName} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-sm">{item.userName}</h3>
                                <p className="text-xs text-slate-500 font-bold">{isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب كرة قدم')} • {item.age ? `${item.age} سنة` : 'موهبة صاعدة'}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{item.organization || item.country || 'لاعب حر'}</p>
                            </div>
                        </div>

                        {/* OVR Score */}
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-emerald-600">{calculatedOverall}</span>
                                <span className="text-[10px] font-bold text-slate-400">/ 99</span>
                            </div>
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.bgCls}`}>{tier.label}</span>
                            </div>
                        </div>

                        {/* Dominant Foot */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-bold">القدم المفضلة:</span>
                            <div className="flex items-center gap-1.5">
                                {['يمين', 'يسار', 'كلتا القدمين'].map(f => (
                                    <button
                                        key={f} type="button"
                                        onClick={() => onDominantFootChange(f)}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                            dominantFoot === f
                                                ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ═══ Radar Chart (مستوحى من Wyscout) ═══ */}
                    <div className="flex-shrink-0">
                        <RadarChart
                            skills={skills}
                            isGK={isGK}
                            size={200}
                            baseline={DEFAULT_SKILLS_GK}
                        />
                    </div>
                </div>
            </div>

            {/* ═══ Skill Sliders Grid ═══ */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-black text-slate-900">
                            {isGK ? 'مصفوفة حراسة المرمى الدولية (GK Core Matrix)' : 'مصفوفة المهارات الكروية (معايير الحلم الدولية)'}
                        </h4>
                    </div>
                    <span className="text-[11px] text-slate-500">اسحب للضبط اليدوي</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {skillDefs.map(s => {
                        const val = skills[s.key];
                        const badgeCls = getSkillBadgeColor(val);
                        return (
                            <div key={s.key} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs">{s.icon}</span>
                                        <span className="text-xs font-bold text-slate-800">{s.label}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({s.short})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-mono font-black px-1.5 py-0.2 rounded border ${badgeCls}`}>{val}</span>
                                        <button type="button" onClick={() => onSkillChange(s.key, Math.min(99, val + 1))} className="w-5 h-5 text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded flex items-center justify-center text-xs font-black cursor-pointer">+</button>
                                        <button type="button" onClick={() => onSkillChange(s.key, Math.max(30, val - 1))} className="w-5 h-5 text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded flex items-center justify-center text-xs font-black cursor-pointer">-</button>
                                    </div>
                                </div>
                                <input
                                    type="range" min="30" max="99" value={val}
                                    onChange={e => onSkillChange(s.key, parseInt(e.target.value) || 50)}
                                    className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                                />
                                <span className="text-[10px] text-slate-500 mt-1 truncate">{s.desc}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Analyst Notes ═══ */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-black text-slate-900">توصيات وملاحظات الكشاف المعتمد</h4>
                    </div>
                    <span className="text-[11px] text-slate-500">تظهر في تقرير اللاعب والبروفايل</span>
                </div>
                <Textarea
                    rows={3}
                    value={analystNotes}
                    onChange={e => onAnalystNotesChange(e.target.value)}
                    placeholder={isGK ? "اكتب التوصيات التكتيكية لمركز حراسة المرمى..." : "اكتب التوصيات الفنية أو الملاحظات التكتيكية..."}
                    className="text-xs bg-slate-50 border-slate-200 text-slate-800 leading-relaxed resize-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
            </div>
        </div>
    );
}
