'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MediaItem, FootballSkills } from '../types';
import { FileText, Share2, Copy, CheckCheck, CheckCircle, Target } from 'lucide-react';
import { toast } from 'sonner';
import {
    checkIsGoalkeeper, getSkillDefinitions, getSkillBadgeColor,
    getScoreTier, calculateOverall, generateEl7lmDossier
} from './studio-utils';
import { RadarChart } from './RadarChart';

import { ChatAmanService } from '@/lib/services/chataman-service';
import { Send, MessageSquareText, PhoneCall, Loader2 } from 'lucide-react';

interface Props {
    item: MediaItem;
    skills: FootballSkills;
    dominantFoot: string;
    analystNotes: string;
    aiText: string;
    tacticalStrengths: string[];
    developmentAreas: string[];
}

export function ScoutDossier({
    item, skills, dominantFoot, analystNotes, aiText,
    tacticalStrengths, developmentAreas,
}: Props) {
    const [copiedReport, setCopiedReport] = useState(false);
    const [showRawDossier, setShowRawDossier] = useState(false);
    const [targetPhone, setTargetPhone] = useState(item.userPhone || '');
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [showPhoneEditor, setShowPhoneEditor] = useState(false);

    const isGK = useMemo(() => checkIsGoalkeeper(item.position), [item.position]);
    const skillDefs = useMemo(() => getSkillDefinitions(isGK), [isGK]);
    const calculatedOverall = useMemo(() => calculateOverall(skills, isGK), [skills, isGK]);
    const tier = getScoreTier(calculatedOverall);

    const currentDossierText = generateEl7lmDossier(
        item, skills, calculatedOverall, dominantFoot,
        analystNotes, aiText, tacticalStrengths, developmentAreas
    );

    const handleCopyDossier = () => {
        navigator.clipboard.writeText(currentDossierText);
        setCopiedReport(true);
        toast.success('تم نسخ التقرير الكشفي المعتمد بنجاح!');
        setTimeout(() => setCopiedReport(false), 3000);
    };

    // إرسال مباشر عبر ChatAman API الرسمي دون فتح نوافذ خارجية
    const handleSendChatAmanWhatsApp = async () => {
        const phone = targetPhone.trim() || item.userPhone?.trim();
        if (!phone) {
            toast.error('يرجى تحديد رقم الهاتف لإرسال التقرير عبر واتساب');
            setShowPhoneEditor(true);
            return;
        }

        setSendingWhatsApp(true);
        try {
            const res = await ChatAmanService.sendMessage(phone, currentDossierText);
            if (res.success) {
                toast.success(`تم إرسال التقرير الكشفي بنجاح عبر خدمة ChatAman WhatsApp إلى (${phone})`);
                setShowPhoneEditor(false);
            } else {
                toast.error('فشل إرسال واتساب عبر ChatAman: ' + (res.error || 'خطأ غير معروف'));
            }
        } catch (e: any) {
            toast.error('خطأ في الاتصال بخدمة واتساب: ' + e.message);
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const handleManualWhatsAppFallback = () => {
        const phone = targetPhone.trim().replace(/\D/g, '') || item.userPhone?.replace(/\D/g, '') || '';
        const url = phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(currentDossierText)}`
            : `https://wa.me/?text=${encodeURIComponent(currentDossierText)}`;
        window.open(url, '_blank');
    };

    const defaultStrengths = isGK
        ? ['سرعة رد الفعل والتصدي في المواقف الفردية (1v1)', 'التمركز السليم بين القائمين']
        : ['التحكم الإيجابي بالكرة والسرعة في تغيير الاتجاه', 'الرؤية الميدانية والتحرك في المساحات'];

    const defaultAreas = isGK
        ? ['دقة التوزيع بالقدمين تحت الضغط لبناء الهجمة من الخلف', 'توجيه المدافعين والتواصل الصوتي']
        : ['رفع الكثافة البدنية في الالتحامات', 'دقة إنهاء الكرات تحت الضغط العالي'];

    return (
        <div className="space-y-4">
            {/* Dossier Header Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex items-center justify-between gap-3 flex-wrap text-white">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white">ملف الكشاف المعتمد — منصة الحلم الدولية</h3>
                        <p className="text-[10px] text-slate-400 font-mono">El7lm Executive Scouting Dossier (Wyscout Grade)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        onClick={handleSendChatAmanWhatsApp}
                        disabled={sendingWhatsApp}
                        size="sm"
                        className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                        title="إرسال التقرير رسمياً عبر ChatAman WhatsApp API"
                    >
                        {sendingWhatsApp ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <MessageSquareText className="w-3.5 h-3.5" />
                        )}
                        <span>{sendingWhatsApp ? 'جاري الإرسال...' : 'إرسال واتساب (ChatAman API)'}</span>
                    </Button>

                    <Button
                        onClick={() => setShowPhoneEditor(prev => !prev)}
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs font-bold border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
                        title="تعديل رقم المستلم"
                    >
                        <PhoneCall className="w-3 h-3 text-slate-400" />
                        <span className="hidden sm:inline">تعديل الرقم</span>
                    </Button>

                    <Button
                        onClick={handleCopyDossier}
                        size="sm"
                        variant="outline"
                        className={`h-8 px-2.5 text-xs font-bold gap-1.5 transition-all cursor-pointer border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 ${copiedReport ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300' : ''}`}
                    >
                        {copiedReport ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedReport ? 'تم النسخ!' : 'نسخ 📋'}</span>
                    </Button>
                </div>
            </div>

            {/* Phone Editor / Target WhatsApp Bar */}
            {showPhoneEditor && (
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-white">
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">رقم واتساب المستلم (لاعب / نادي):</span>
                        <input
                            type="text"
                            value={targetPhone}
                            onChange={e => setTargetPhone(e.target.value)}
                            placeholder="+2010... أو +974..."
                            className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-white font-mono flex-1 max-w-xs focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSendChatAmanWhatsApp}
                            disabled={sendingWhatsApp}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                            إرسال الآن 🚀
                        </button>
                        <button
                            onClick={handleManualWhatsAppFallback}
                            className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
                            title="فتح نافذة واتساب العادية في المتصفح"
                        >
                            أو عبر الرابط المباشر
                        </button>
                    </div>
                </div>
            )}

            {/* Dossier Sheet */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                {/* Sheet Header */}
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">📋 بطاقة التقييم الكشفي الرسمي</span>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {isGK ? 'تحليل حراسة مرمى معتمد' : 'معتمد رسمياً'}
                        </span>
                    </div>
                    <button type="button" onClick={() => setShowRawDossier(prev => !prev)} className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer">
                        {showRawDossier ? 'عرض النموذج المنسق' : 'عرض كود التقرير المباشر'}
                    </button>
                </div>

                {showRawDossier ? (
                    <div className="bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto select-all">
                        {currentDossierText}
                    </div>
                ) : (
                    <div className="space-y-4 text-xs">
                        {/* Player Bio + Radar */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 grid grid-cols-2 gap-2.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                                <div><span className="text-[10px] text-slate-400 block">اسم اللاعب</span><span className="font-black text-slate-900">{item.userName}</span></div>
                                <div><span className="text-[10px] text-slate-400 block">المركز التكتيكي</span><span className="font-bold text-slate-800">{isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب كرة قدم')}</span></div>
                                <div><span className="text-[10px] text-slate-400 block">العمر والدولة</span><span className="font-bold text-slate-800">{item.age ? `${item.age} سنة` : 'موهبة صاعدة'} • {item.country || 'مصر'}</span></div>
                                <div><span className="text-[10px] text-slate-400 block">النادي / الأكاديمية</span><span className="font-bold text-slate-800">{item.organization || 'لاعب حر'}</span></div>
                                <div><span className="text-[10px] text-slate-400 block">القدم المفضلة</span><span className="font-bold text-emerald-700">{dominantFoot}</span></div>
                                <div><span className="text-[10px] text-slate-400 block">التقييم العام</span><span className="font-black text-emerald-700">{calculatedOverall} OVR ({tier.label})</span></div>
                            </div>
                            {/* Mini Radar Chart in Dossier */}
                            <div className="flex-shrink-0 flex items-center justify-center">
                                <RadarChart skills={skills} isGK={isGK} size={160} />
                            </div>
                        </div>

                        {/* Skills Badges */}
                        <div className="space-y-1.5">
                            <span className="text-xs font-black text-slate-800 block">
                                {isGK ? 'مصفوفة الحراسة (El7lm GK Matrix):' : 'مصفوفة الأداء الكروي (معايير الحلم الدولية):'}
                            </span>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {skillDefs.map(s => {
                                    const val = skills[s.key];
                                    const badgeCls = getSkillBadgeColor(val);
                                    return (
                                        <div key={s.key} className="bg-slate-50 border border-slate-200/80 p-2 rounded-xl text-center">
                                            <span className="text-[10px] text-slate-500 font-bold block">{s.short}</span>
                                            <span className={`text-sm font-black font-mono block mt-0.5 rounded px-1 py-0.5 border ${badgeCls}`}>{val}</span>
                                            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{s.label.split(' ')[0]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Strengths & Development Areas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                                <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> نقاط القوة التكتيكية:
                                </p>
                                <div className="space-y-1">
                                    {(tacticalStrengths.length > 0 ? tacticalStrengths : defaultStrengths).map((str, idx) => (
                                        <p key={idx} className="text-[11px] text-emerald-950 font-medium leading-tight">• {str}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                                <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5 text-amber-600" /> جوانب التطوير المستهدفة:
                                </p>
                                <div className="space-y-1">
                                    {(developmentAreas.length > 0 ? developmentAreas : defaultAreas).map((dev, idx) => (
                                        <p key={idx} className="text-[11px] text-amber-950 font-medium leading-tight">• {dev}</p>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Scout Recommendation */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                            <span className="text-xs font-bold text-slate-800 block">التوصية الفنية للكشاف:</span>
                            <p className="text-xs text-slate-700 leading-relaxed">
                                {analystNotes.trim() || (isGK
                                    ? 'حارس مرمى واعد يمتلك ردود أفعال رشيقة وشجاعة في المواجهات المباشرة.'
                                    : 'لاعب واعد يمتلك أساسيات فنية ممتازة تؤهله للاندماج في تمارين الأندية المحترفة.'
                                )}
                            </p>
                        </div>

                        {/* AI Full Report */}
                        {aiText && (
                            <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                <span className="text-xs font-bold text-emerald-700 block mb-1">التقرير التحليلي المستخرج:</span>
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">{aiText}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
