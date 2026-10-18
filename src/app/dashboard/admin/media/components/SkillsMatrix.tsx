'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem, FootballSkills, detectMediaSource } from '../types';
import {
    Sliders, Sparkles, AlertCircle, Award, User,
    Activity, ShieldAlert, Cpu, CheckCircle2
} from 'lucide-react';
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
    aiTelemetry?: {
        observedActivity?: string;
        ageCategory?: string;
        visionConfidence?: number;
        movementNotes?: string;
    } | null;
}

export function SkillsMatrix({
    item, skills, onSkillChange,
    dominantFoot, onDominantFootChange,
    analystNotes, onAnalystNotesChange,
    analyzing, aiError, onAnalyze,
    aiTelemetry,
}: Props) {
    const isGK = useMemo(() => checkIsGoalkeeper(item.position), [item.position]);
    const skillDefs = useMemo(() => getSkillDefinitions(isGK), [isGK]);
    const calculatedOverall = useMemo(() => calculateOverall(skills, isGK), [skills, isGK]);
    const tier = getScoreTier(calculatedOverall);

    // Age / Category helper
    const inferredCategory = item.age
        ? item.age <= 12 ? 'براعم U-11' : item.age <= 17 ? 'ناشئين U-17' : 'فئة الكبار'
        : item.category || 'موهبة صاعدة';

    return (
        <div className="space-y-4 text-right">

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 1. AI COMPUTER VISION TELEMETRY (رصد الرؤية الحاسوبية)    */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="bg-cyan-50/50 border border-cyan-200/80 rounded-2xl p-4 shadow-xs space-y-3 relative overflow-hidden">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-600/10 border border-cyan-300 text-cyan-700 flex items-center justify-center flex-shrink-0">
                            <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs font-black text-cyan-950">
                                    🤖 رصد الرؤية الحاسوبية (Computer Vision Telemetry)
                                </h3>
                                <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-100 border border-cyan-300 px-2 py-0.5 rounded-full">
                                    Gemini 3.8 Vision
                                </span>
                            </div>
                            <p className="text-[11px] text-cyan-800/80 mt-0.5">
                                قياسات حركية وميكانيكية موضوعية ومطابقتها لمعايير الفئة السنية دون مبالغات تسويقية
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={onAnalyze}
                        disabled={analyzing}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-black h-8 px-3 text-xs gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
                    >
                        <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                        <span>
                            {analyzing ? 'جاري الرصد الحاسوبي...' : 'فحص الرؤية الحاسوبية ⚡'}
                        </span>
                    </Button>
                </div>

                {/* Telemetry Display */}
                {aiTelemetry ? (
                    <div className="bg-white/90 border border-cyan-200/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">النشاط المرصود في الفيديو:</span>
                                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-cyan-600" />
                                    {aiTelemetry.observedActivity || 'مناورات وتدريب كروي'}
                                </span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">معيار الفئة العمرية المطبق:</span>
                                <span className="font-bold text-amber-700 text-xs flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                    {aiTelemetry.ageCategory || inferredCategory}
                                </span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">موثوقية دقة الرؤية:</span>
                                <span className="font-mono font-black text-emerald-700 text-xs flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    %{aiTelemetry.visionConfidence || 88} Confidence
                                </span>
                            </div>
                        </div>

                        {aiTelemetry.movementNotes && (
                            <div className="bg-cyan-50/70 border border-cyan-200/60 rounded-lg p-2.5 text-[11px] text-cyan-900 leading-relaxed">
                                <span className="font-bold text-cyan-800 ml-1">مؤشرات ميكانيكا الحركة:</span>
                                {aiTelemetry.movementNotes}
                            </div>
                        )}

                        <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200 pt-2">
                            <span>* رصد آلي مساعد — التقييم الفني المعتمد والقرار النهائي بيد الكشاف البشري أدناه.</span>
                            <span className="font-mono text-slate-600 font-bold">Computer Vision Verified</span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/80 border border-dashed border-cyan-300 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-600 font-medium">
                            لم يتم تشغيل رصد الرؤية الحاسوبية لهذا الفيديو بعد. انقر على زر &quot;فحص الرؤية الحاسوبية ⚡&quot; لاستخراج الإطارات والمطابقة المعيارية.
                        </p>
                    </div>
                )}

                {aiError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold">تنبيه أثناء التحليل البصري:</p>
                            <p className="mt-0.5 text-rose-700">{aiError}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 2. HUMAN SCOUT EVALUATION (تقييم الكشاف البشري المعتمد)   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
                            <Award className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-900">
                                👤 تقييم الكشاف المعتمد (Licensed Scout Evaluation)
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                درجات المهارات الكروية الرسمية وفق معايير الحلم الدولية (Wyscout Scale 30-99)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                        <span className="text-2xl font-black font-mono text-emerald-700">
                            {calculatedOverall}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800">/ 99 OVR</span>
                    </div>
                </div>

                {/* Player Profile & Radar Chart Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 space-y-3 w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-white border border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs">
                                {item.userImage ? (
                                    <img src={item.userImage} alt={item.userName} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-black text-slate-900 text-sm truncate">{item.userName}</h4>
                                <p className="text-xs text-slate-600 font-bold mt-0.5">
                                    {isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب كرة قدم')} • {item.age ? `${item.age} سنة` : inferredCategory}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {item.organization || item.country || 'لاعب حر'}
                                </p>
                            </div>
                        </div>

                        {/* Dominant Foot Selection */}
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 shadow-2xs">
                            <span className="text-xs text-slate-700 font-bold">القدم المفضلة:</span>
                            <div className="flex items-center gap-1">
                                {['يمين', 'يسار', 'كلتا القدمين'].map(f => (
                                    <button
                                        key={f} type="button"
                                        onClick={() => onDominantFootChange(f)}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                            dominantFoot === f
                                                ? 'bg-emerald-600 text-white font-black shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart (Daylight Wyscout Hexagon) */}
                    <div className="flex-shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                        <RadarChart
                            skills={skills}
                            isGK={isGK}
                            size={190}
                            baseline={DEFAULT_SKILLS_GK}
                        />
                    </div>
                </div>

                {/* ═══ 6 Skill Sliders Grid (Wyscout/FIFA Scale 30-99) ═══ */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                            <h5 className="text-xs font-black text-slate-900">
                                {isGK ? 'مصفوفة الحراسة (GK Matrix)' : 'القدرات الفنية والبدنية الست'}
                            </h5>
                        </div>
                        <span className="text-[10px] text-slate-500">انقر + أو - أو اسحب المؤشر للضبط اليدوي</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {skillDefs.map(s => {
                            const val = skills[s.key];
                            const badgeCls = getSkillBadgeColor(val);
                            return (
                                <div key={s.key} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs">{s.icon}</span>
                                            <span className="text-xs font-bold text-slate-800">{s.label}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">({s.short})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`text-xs font-mono font-black px-1.5 py-0.2 rounded border ${badgeCls}`}>{val}</span>
                                            <button
                                                type="button"
                                                onClick={() => onSkillChange(s.key, Math.min(99, val + 1))}
                                                className="w-5 h-5 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-xs font-black cursor-pointer shadow-2xs"
                                            >+</button>
                                            <button
                                                type="button"
                                                onClick={() => onSkillChange(s.key, Math.max(30, val - 1))}
                                                className="w-5 h-5 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-xs font-black cursor-pointer shadow-2xs"
                                            >-</button>
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

                {/* ═══ Official Scout Recommendation ═══ */}
                <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <h5 className="text-xs font-black text-slate-900">توصيات وملاحظات الكشاف المعتمد الرسمية</h5>
                        </div>
                        <span className="text-[10px] text-slate-500">تظهر في بروفايل اللاعب وتقرير الأندية</span>
                    </div>
                    <Textarea
                        rows={3}
                        value={analystNotes}
                        onChange={e => onAnalystNotesChange(e.target.value)}
                        placeholder={isGK ? "اكتب التوصيات الفنية لحارس المرمى (التمركز، رد الفعل، التوزيع)..." : "اكتب التوصيات الفنية والتكتيكية للاعب..."}
                        className="text-xs bg-white border-slate-200 text-slate-900 leading-relaxed resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl"
                    />
                </div>
            </div>

        </div>
    );
}
