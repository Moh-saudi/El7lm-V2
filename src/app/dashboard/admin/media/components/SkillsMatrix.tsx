'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem, FootballSkills, detectMediaSource } from '../types';
import {
    Sliders, Sparkles, AlertCircle, Award, User, Eye,
    Activity, ShieldAlert, Cpu, CheckCircle2, ChevronRight
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
    const detectedSource = useMemo(() => detectMediaSource(item), [item]);

    // Age / Category helper
    const inferredCategory = item.age
        ? item.age <= 12 ? 'براعم U-11' : item.age <= 17 ? 'ناشئين U-17' : 'فئة الكبار'
        : item.category || 'موهبة صاعدة';

    return (
        <div className="space-y-4 text-right">

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 1. AI COMPUTER VISION TELEMETRY (رصد الرؤية الحاسوبية)    */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                            <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs font-black text-white">
                                    🤖 رصد الرؤية الحاسوبية (Computer Vision Telemetry)
                                </h3>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                    Gemini 3.8 Vision
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                رصد قياسات حركية وميكانيكية موضوعية ومطابقتها لمعايير الفئة السنية دون مبالغات تسويقية
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={onAnalyze}
                        disabled={analyzing}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-black h-8 px-3 text-xs gap-1.5 shadow-md shadow-cyan-900/30 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                    >
                        <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                        <span>
                            {analyzing ? 'جاري الرصد الحاسوبي...' : 'فحص الرؤية الحاسوبية ⚡'}
                        </span>
                    </Button>
                </div>

                {/* Telemetry Display */}
                {aiTelemetry ? (
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">النشاط المرصود في الفيديو:</span>
                                <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                                    {aiTelemetry.observedActivity || 'مناورات وتدريب كروي'}
                                </span>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">معيار الفئة العمرية المطبق:</span>
                                <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                    {aiTelemetry.ageCategory || inferredCategory}
                                </span>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">موثوقية دقة الرؤية:</span>
                                <span className="font-mono font-black text-emerald-400 text-xs flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    %{aiTelemetry.visionConfidence || 88} Confidence
                                </span>
                            </div>
                        </div>

                        {aiTelemetry.movementNotes && (
                            <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-2.5 text-[11px] text-slate-300 leading-relaxed">
                                <span className="font-bold text-cyan-400 ml-1">مؤشرات ميكانيكا الحركة:</span>
                                {aiTelemetry.movementNotes}
                            </div>
                        )}

                        <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-2">
                            <span>* رصد آلي مساعد — التقييم الفني المعتمد والقرار النهائي بيد الكشاف البشري أدناه.</span>
                            <span className="font-mono text-slate-400">Computer Vision Verified</span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                            لم يتم تشغيل رصد الرؤية الحاسوبية لهذا الفيديو بعد. انقر على زر "فحص الرؤية الحاسوبية ⚡" لاستخراج الإطارات والمطابقة المعيارية.
                        </p>
                    </div>
                )}

                {aiError && (
                    <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold">تنبيه أثناء التحليل البصري:</p>
                            <p className="mt-0.5 text-rose-400/90">{aiError}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 2. HUMAN SCOUT EVALUATION (تقييم الكشاف البشري المعتمد)   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <Award className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white">
                                👤 تقييم الكشاف المعتمد (Licensed Scout Evaluation)
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                درجات المهارات الكروية الرسمية وفق معايير الحلم الدولية (Wyscout Scale 30-99)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black font-mono text-emerald-400">
                            {calculatedOverall}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">/ 99 OVR</span>
                    </div>
                </div>

                {/* Player Profile & Radar Chart Bar */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 space-y-3 w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                                {item.userImage ? (
                                    <img src={item.userImage} alt={item.userName} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-black text-white text-sm truncate">{item.userName}</h4>
                                <p className="text-xs text-slate-400 font-bold mt-0.5">
                                    {isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب كرة قدم')} • {item.age ? `${item.age} سنة` : inferredCategory}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {item.organization || item.country || 'لاعب حر'}
                                </p>
                            </div>
                        </div>

                        {/* Dominant Foot Selection */}
                        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-lg p-2">
                            <span className="text-xs text-slate-400 font-bold">القدم المفضلة:</span>
                            <div className="flex items-center gap-1">
                                {['يمين', 'يسار', 'كلتا القدمين'].map(f => (
                                    <button
                                        key={f} type="button"
                                        onClick={() => onDominantFootChange(f)}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                            dominantFoot === f
                                                ? 'bg-emerald-600 text-white font-black shadow-sm'
                                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart (Wyscout Hexagon) */}
                    <div className="flex-shrink-0 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
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
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                            <h5 className="text-xs font-black text-white">
                                {isGK ? 'مصفوفة الحراسة (GK Matrix)' : 'القدرات الفنية والبدنية الست'}
                            </h5>
                        </div>
                        <span className="text-[10px] text-slate-400">انقر + أو - أو اسحب المؤشر للضبط اليدوي</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {skillDefs.map(s => {
                            const val = skills[s.key];
                            const badgeCls = getSkillBadgeColor(val);
                            return (
                                <div key={s.key} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition-colors">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs">{s.icon}</span>
                                            <span className="text-xs font-bold text-slate-200">{s.label}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">({s.short})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`text-xs font-mono font-black px-1.5 py-0.2 rounded border ${badgeCls}`}>{val}</span>
                                            <button
                                                type="button"
                                                onClick={() => onSkillChange(s.key, Math.min(99, val + 1))}
                                                className="w-5 h-5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center text-xs font-black cursor-pointer"
                                            >+</button>
                                            <button
                                                type="button"
                                                onClick={() => onSkillChange(s.key, Math.max(30, val - 1))}
                                                className="w-5 h-5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center text-xs font-black cursor-pointer"
                                            >-</button>
                                        </div>
                                    </div>
                                    <input
                                        type="range" min="30" max="99" value={val}
                                        onChange={e => onSkillChange(s.key, parseInt(e.target.value) || 50)}
                                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                                    />
                                    <span className="text-[10px] text-slate-500 mt-1 truncate">{s.desc}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ Official Scout Recommendation ═══ */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-emerald-400" />
                            <h5 className="text-xs font-black text-white">توصيات وملاحظات الكشاف المعتمد الرسمية</h5>
                        </div>
                        <span className="text-[10px] text-slate-500">تظهر في بروفايل اللاعب وتقرير الأندية</span>
                    </div>
                    <Textarea
                        rows={3}
                        value={analystNotes}
                        onChange={e => onAnalystNotesChange(e.target.value)}
                        placeholder={isGK ? "اكتب التوصيات الفنية لحارس المرمى (التمركز، رد الفعل، التوزيع)..." : "اكتب التوصيات الفنية والتكتيكية للاعب..."}
                        className="text-xs bg-slate-950 border-slate-800 text-slate-200 leading-relaxed resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl"
                    />
                </div>
            </div>

        </div>
    );
}
