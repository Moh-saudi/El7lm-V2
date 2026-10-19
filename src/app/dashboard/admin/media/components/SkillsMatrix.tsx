'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem, FootballSkills, detectMediaSource } from '../types';
import {
    Sliders, Sparkles, AlertCircle, Award,
    Activity, ShieldAlert, CheckCircle2, Bot, Zap, BarChart3,
    UserCheck, ExternalLink, ImageIcon, Crosshair
} from 'lucide-react';
import {
    checkIsGoalkeeper, getSkillDefinitions, getSkillBadgeColor,
    calculateOverall, DEFAULT_SKILLS_GK
} from './studio-utils';
import { RadarChart } from './RadarChart';
import { MediaAvatar } from './MediaAvatar';

interface Props {
    item: MediaItem;
    skills: FootballSkills;
    onSkillChange: (key: keyof FootballSkills, val: number) => void;
    dominantFoot: string;
    onDominantFootChange: (foot: string) => void;
    analystNotes: string;
    onAnalystNotesChange: (notes: string) => void;
    /** تحديد أو وصف اللاعب المستهدف في المقطع لتوجيه الـ AI */
    targetPlayerCue?: string;
    onTargetPlayerCueChange?: (cue: string) => void;
    analyzing: boolean;
    aiError: string | null;
    onAnalyze: () => void;
    aiTelemetry?: {
        observedActivity?: string;
        ageCategory?: string;
        visionConfidence?: number;
        movementNotes?: string;
    } | null;
    /** عداد الاستخدامات اليومية للذكاء الاصطناعي */
    aiDailyUsed?: number;
    aiDailyLimit?: number;
}

export function SkillsMatrix({
    item, skills, onSkillChange,
    dominantFoot, onDominantFootChange,
    analystNotes, onAnalystNotesChange,
    targetPlayerCue = '', onTargetPlayerCueChange,
    analyzing, aiError, onAnalyze,
    aiTelemetry,
    aiDailyUsed = 0,
    aiDailyLimit = 20,
}: Props) {
    const isGK = useMemo(() => checkIsGoalkeeper(item.position), [item.position]);
    const skillDefs = useMemo(() => getSkillDefinitions(isGK), [isGK]);
    const calculatedOverall = useMemo(() => calculateOverall(skills, isGK), [skills, isGK]);
    const mediaSource = useMemo(() => detectMediaSource(item), [item]);

    // هل يمكن للذكاء الاصطناعي تحليل هذا المحتوى؟
    const isAnalyzable = mediaSource === 'direct';
    const isExternalLink = ['tiktok', 'youtube', 'vimeo', 'external'].includes(mediaSource);
    const isImage = mediaSource === 'image';

    const sourceLabel: Record<string, string> = {
        tiktok: 'TikTok', youtube: 'YouTube', vimeo: 'Vimeo',
        external: 'رابط خارجي', image: 'صورة', direct: 'فيديو مباشر'
    };

    const inferredCategory = item.age
        ? item.age <= 12 ? 'براعم U-11' : item.age <= 17 ? 'ناشئين U-17' : 'كبار'
        : item.category || 'موهبة';

    const aiLimitReached = aiDailyUsed >= aiDailyLimit;
    const aiRemaining = Math.max(0, aiDailyLimit - aiDailyUsed);
    const aiUsagePct = Math.min(100, Math.round((aiDailyUsed / aiDailyLimit) * 100));

    return (
        <div className="space-y-3 text-right">

            {/* ══════════════════════════════════════════════ */}
            {/* 1. قسم الذكاء الاصطناعي                      */}
            {/* ══════════════════════════════════════════════ */}
            <div className="bg-cyan-50/60 border border-cyan-200/80 rounded-xl overflow-hidden">

                {/* ─── رأس قسم AI ─── */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-cyan-200/60 bg-cyan-100/40">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-cyan-600/10 border border-cyan-300 text-cyan-700 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-black text-cyan-950 leading-tight">رؤية حاسوبية AI</p>
                            <p className="text-[9px] text-cyan-700 font-mono leading-tight">El7lm Vision Engine</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* عداد يومي */}
                        <div className="flex flex-col items-end gap-0.5">
                            <div className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                aiLimitReached
                                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                                    : aiUsagePct >= 70
                                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            }`}>
                                <Zap className="w-2.5 h-2.5" />
                                <span>{aiDailyUsed}/{aiDailyLimit}</span>
                                <span className="opacity-70">اليوم</span>
                            </div>
                            <div className="w-16 h-1 bg-cyan-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        aiLimitReached ? 'bg-rose-500' : aiUsagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${aiUsagePct}%` }}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={onAnalyze}
                            disabled={analyzing || aiLimitReached || !isAnalyzable}
                            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-black h-7 px-2.5 text-[10px] gap-1 shadow-xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
                            title={!isAnalyzable ? 'لا يمكن تحليل الروابط الخارجية — يلزم تدخل بشري' : ''}
                        >
                            <Sparkles className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} />
                            <span>
                                {analyzing ? 'جاري الفحص...' : aiLimitReached ? 'انتهى الحد اليومي' : !isAnalyzable ? 'غير متاح' : 'فحص AI ⚡'}
                            </span>
                        </Button>
                    </div>
                </div>

                {/* ─── نتيجة / حالة الذكاء الاصطناعي ─── */}
                <div className="p-2.5">

                    {/* ─ حقل تحديد اللاعب في المقطع (لتوجيه الـ AI والكشاف) ─ */}
                    {isAnalyzable && !analyzing && (
                        <div className="bg-white border border-cyan-200/90 rounded-lg p-2.5 mb-2.5 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                                <label className="text-[10px] font-black text-cyan-950 flex items-center gap-1">
                                    <Crosshair className="w-3.5 h-3.5 text-cyan-600" />
                                    <span>تحديد اللاعب المستهدف في المقطع:</span>
                                </label>
                                <span className="text-[9px] text-slate-400 font-medium">لتوجيه الـ AI بدقة</span>
                            </div>
                            <input
                                type="text"
                                value={targetPlayerCue || ''}
                                onChange={(e) => onTargetPlayerCueChange?.(e.target.value)}
                                placeholder="مثلاً: تيشيرت أحمر / حذاء أصفر / حامل الكرة في أول ثانيتين..."
                                className="w-full text-[10px] bg-slate-50 border border-cyan-200 rounded px-2.5 py-1 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all text-right"
                                dir="rtl"
                            />
                            {/* اقتراحات سريعة بنقرة واحدة */}
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="text-[8.5px] text-slate-400 font-bold">اقتراحات:</span>
                                {[
                                    { label: 'حامل الكرة ⚽', val: 'اللاعب الذي يستحوذ على الكرة في بداية المقطع' },
                                    { label: 'حارس المرمى 🧤', val: 'حارس المرمى المتواجد داخل منطقة الجزاء' },
                                    { label: 'تيشيرت أسود ⚫', val: 'اللاعب بالتيشيرت الأسود' },
                                    { label: 'تيشيرت أبيض ⚪', val: 'اللاعب بالتيشيرت الأبيض' },
                                    { label: 'حذاء فسفوري/ملون 👟', val: 'اللاعب الذي يرتدي حذاءً ملوناً' },
                                ].map((tag) => (
                                    <button
                                        key={tag.label}
                                        type="button"
                                        onClick={() => onTargetPlayerCueChange?.(targetPlayerCue === tag.val ? '' : tag.val)}
                                        className={`text-[8.5px] px-1.5 py-0.5 rounded border transition-all cursor-pointer font-bold ${
                                            targetPlayerCue === tag.val
                                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                                                : 'bg-white hover:bg-cyan-50 text-slate-600 border-slate-200 hover:border-cyan-300'
                                        }`}
                                    >
                                        {tag.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─ جاري التحليل ─ */}
                    {analyzing && (
                        <div className="flex items-center justify-center gap-2 py-3 text-cyan-700">
                            <Sparkles className="w-4 h-4 animate-spin" />
                            <span className="text-[11px] font-bold">جاري تحليل الفيديو...</span>
                        </div>
                    )}

                    {/* ─ رابط خارجي / صورة → تعذر التحليل → توصية بشرية ─ */}
                    {!analyzing && (isExternalLink || isImage) && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                <div className="flex-shrink-0">
                                    {isImage
                                        ? <ImageIcon className="w-4 h-4 text-amber-600" />
                                        : <ExternalLink className="w-4 h-4 text-amber-600" />
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-amber-900">
                                        {isImage ? 'محتوى صورة — لا يوجد فيديو' : `رابط ${sourceLabel[mediaSource] || 'خارجي'} — لا يمكن الوصول`}
                                    </p>
                                    <p className="text-[9px] text-amber-700 mt-0.5 leading-snug">
                                        {isImage
                                            ? 'الصور لا تحتوي على حركة قابلة للتحليل'
                                            : 'الذكاء الاصطناعي لا يستطيع فتح الروابط الخارجية أو استخراج إطاراتها'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* توصية بالتدخل البشري */}
                            <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
                                <UserCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-indigo-900">🧑‍⚖️ يُوصى بالتقييم البشري المباشر</p>
                                    <p className="text-[9px] text-indigo-700 mt-0.5 leading-snug">
                                        افتح الرابط الخارجي وشاهد الفيديو يدوياً، ثم أدخل درجات المهارات أدناه بناءً على ملاحظتك.
                                    </p>
                                </div>
                            </div>

                            <p className="text-[9px] text-slate-400 text-center">* التحليل الآلي يعمل فقط مع الفيديوهات المرفوعة مباشرة</p>
                        </div>
                    )}

                    {/* ─ فيديو مباشر: نتائج AI ─ */}
                    {!analyzing && isAnalyzable && aiTelemetry && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span className="text-[10px] font-black text-emerald-800">اكتمل التحليل — نتائج الرؤية الحاسوبية:</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                <div className="bg-white border border-cyan-200 rounded-lg p-2 text-center">
                                    <Activity className="w-3 h-3 text-cyan-600 mx-auto mb-0.5" />
                                    <p className="text-[9px] text-slate-500 leading-tight">النشاط</p>
                                    <p className="text-[10px] font-black text-slate-800 leading-tight truncate">
                                        {aiTelemetry.observedActivity || '—'}
                                    </p>
                                </div>
                                <div className="bg-white border border-amber-200 rounded-lg p-2 text-center">
                                    <ShieldAlert className="w-3 h-3 text-amber-600 mx-auto mb-0.5" />
                                    <p className="text-[9px] text-slate-500 leading-tight">الفئة</p>
                                    <p className="text-[10px] font-black text-amber-800 leading-tight truncate">
                                        {aiTelemetry.ageCategory || inferredCategory}
                                    </p>
                                </div>
                                <div className="bg-white border border-emerald-200 rounded-lg p-2 text-center">
                                    <BarChart3 className="w-3 h-3 text-emerald-600 mx-auto mb-0.5" />
                                    <p className="text-[9px] text-slate-500 leading-tight">دقة AI</p>
                                    <p className="text-[10px] font-black text-emerald-700 leading-tight font-mono">
                                        {aiTelemetry.visionConfidence ?? '—'}%
                                    </p>
                                </div>
                            </div>
                            {aiTelemetry.movementNotes && (
                                <div className="bg-cyan-50 border border-cyan-200/60 rounded-lg p-2 text-[10px] text-cyan-900 leading-relaxed">
                                    <span className="font-bold text-cyan-700">ملاحظات: </span>
                                    {aiTelemetry.movementNotes}
                                </div>
                            )}
                            <p className="text-[9px] text-slate-400 text-center">* رصد آلي مساعد — القرار للكشاف</p>
                        </div>
                    )}

                    {/* ─ فيديو مباشر: لم يُفحص بعد ─ */}
                    {!analyzing && isAnalyzable && !aiTelemetry && (
                        <div className="flex flex-col items-center justify-center py-3 gap-1.5">
                            <div className="w-8 h-8 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-cyan-500" />
                            </div>
                            <p className="text-[10px] text-slate-500 text-center">لم يتم فحص الفيديو بعد</p>
                            {!aiLimitReached ? (
                                <p className="text-[9px] text-cyan-600 font-bold">متبقي {aiRemaining} فحص اليوم</p>
                            ) : (
                                <p className="text-[9px] text-rose-600 font-bold">⚠️ انتهى الحد اليومي ({aiDailyLimit} فحص)</p>
                            )}
                        </div>
                    )}

                    {aiError && (
                        <div className="flex items-start gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-2 mt-1.5">
                            <AlertCircle className="w-3 h-3 text-rose-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-rose-700 leading-snug">{aiError}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════ */}
            {/* 2. تقييم الكشاف البشري                        */}
            {/* ══════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                {/* ─── رأس القسم ─── */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50/80">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
                            <Award className="w-3 h-3" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-900 leading-tight">تقييم الكشاف المعتمد</p>
                            <p className="text-[9px] text-slate-500 leading-tight">Wyscout Scale 30–99</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                        <span className="text-lg font-black font-mono text-emerald-700 leading-none">{calculatedOverall}</span>
                        <span className="text-[9px] font-bold text-emerald-600">OVR</span>
                    </div>
                </div>

                {/* ─── بطاقة اللاعب + رادار ─── */}
                <div className="p-2.5 flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MediaAvatar src={item.userImage} alt={item.userName} size="md" />
                        <div className="min-w-0">
                            <p className="font-black text-slate-900 text-xs truncate">{item.userName}</p>
                            <p className="text-[10px] text-slate-600 font-bold truncate">
                                {isGK ? '🧤 حارس' : (item.position || 'لاعب')} • {item.age ? `${item.age}ي` : inferredCategory}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                                {item.organization || item.country || 'لاعب حر'}
                            </p>
                        </div>
                    </div>
                    <div className="flex-shrink-0 bg-white rounded-lg border border-slate-200 p-1">
                        <RadarChart skills={skills} isGK={isGK} size={110} baseline={DEFAULT_SKILLS_GK} />
                    </div>
                </div>

                {/* ─── القدم المفضلة ─── */}
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] text-slate-600 font-bold">القدم المفضلة:</span>
                    <div className="flex items-center gap-1">
                        {['يمين', 'يسار', 'كلتا القدمين'].map(f => (
                            <button
                                key={f} type="button"
                                onClick={() => onDominantFootChange(f)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                                    dominantFoot === f
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── 6 شرائح المهارات ─── */}
                <div className="p-2.5 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-900">
                                {isGK ? 'مصفوفة الحراسة' : 'القدرات الست'}
                            </span>
                        </div>
                        <span className="text-[9px] text-slate-400">+ / − أو اسحب</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {skillDefs.map(s => {
                            const val = skills[s.key];
                            const badgeCls = getSkillBadgeColor(val);
                            const pct = Math.round(((val - 30) / (99 - 30)) * 100);
                            return (
                                <div key={s.key} className="bg-slate-50 border border-slate-200 rounded-lg p-2 hover:border-slate-300 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span className="text-[11px] leading-none">{s.icon}</span>
                                            <span className="text-[10px] font-bold text-slate-800 truncate">{s.label}</span>
                                            <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">({s.short})</span>
                                        </div>
                                        <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded border ${badgeCls}`}>
                                            {val} <span className="text-[8px] opacity-60">{pct}%</span>
                                        </span>
                                    </div>
                                    <input
                                        type="range" min="30" max="99" value={val}
                                        onChange={e => onSkillChange(s.key, parseInt(e.target.value) || 50)}
                                        className="w-full accent-emerald-600 cursor-pointer h-1 rounded-lg"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">{s.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── ملاحظات الكشاف ─── */}
                <div className="px-2.5 pb-2.5 space-y-1 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-900">توصيات الكشاف الرسمية</span>
                        </div>
                        <span className="text-[9px] text-slate-400">تظهر في بروفايل اللاعب</span>
                    </div>
                    <Textarea
                        rows={3}
                        value={analystNotes}
                        onChange={e => onAnalystNotesChange(e.target.value)}
                        placeholder={isGK
                            ? 'التوصيات الفنية لحارس المرمى (تمركز، رد فعل، توزيع)...'
                            : 'التوصيات الفنية والتكتيكية للاعب...'
                        }
                        className="text-[11px] bg-white border-slate-200 text-slate-900 leading-relaxed resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg"
                    />
                </div>
            </div>

        </div>
    );
}
