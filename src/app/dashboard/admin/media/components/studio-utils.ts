'use client';

import { FootballSkills, MediaItem } from '../types';

// ─── Status Colors & Labels ──────────────────────────────────
export const STATUS_COLOR: Record<string, string> = {
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    flagged:  'bg-orange-50 text-orange-700 border-orange-200',
};

export const STATUS_LABEL: Record<string, string> = {
    pending: 'بانتظار التحليل',
    approved: 'معتمد ومزامَن',
    rejected: 'مرفوض',
    flagged: 'تنبيه / إعادة',
};

// ─── Skill Badge Colors ──────────────────────────────────────
export function getSkillBadgeColor(val: number) {
    if (val >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (val >= 75) return 'text-teal-700 bg-teal-50 border-teal-200';
    if (val >= 65) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
}

// ─── Score Tier Classification ───────────────────────────────
export function getScoreTier(ovr: number) {
    if (ovr >= 85) return { label: 'نخبة ELITE', textCls: 'text-amber-800', bgCls: 'bg-amber-50 border-amber-200 text-amber-800' };
    if (ovr >= 75) return { label: 'محترف PRO', textCls: 'text-emerald-800', bgCls: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
    if (ovr >= 65) return { label: 'واعد PROMISING', textCls: 'text-sky-800', bgCls: 'bg-sky-50 border-sky-200 text-sky-800' };
    return { label: 'تحت التطوير', textCls: 'text-slate-600', bgCls: 'bg-slate-100 border-slate-200 text-slate-700' };
}

// ─── Goalkeeper Detection ────────────────────────────────────
export function checkIsGoalkeeper(position?: string): boolean {
    const p = (position || '').toLowerCase();
    return p.includes('حارس') || p.includes('gk') || p.includes('keeper') || p.includes('مرمى');
}

// ─── Skill Definitions (Field Player vs Goalkeeper) ──────────
export interface SkillDefinition {
    key: keyof FootballSkills;
    label: string;
    short: string;
    icon: string;
    desc: string;
}

export function getSkillDefinitions(isGK: boolean): SkillDefinition[] {
    if (isGK) {
        return [
            { key: 'pace',      label: 'الارتماء والتصدي المباشر', short: 'DIV', icon: '🧤', desc: 'التصدي للتسديدات وزوايا المرمى الصعبة' },
            { key: 'shooting',  label: 'الإمساك والتعامل مع الكرة', short: 'HAN', icon: '🤲', desc: 'الإمساك ومنع الارتداد والتقاط العرضيات' },
            { key: 'passing',   label: 'التوزيع وبناء اللعب بالقدم', short: 'KIC', icon: '🎯', desc: 'دقة ركل وتوزيع الكرات الطويلة والقصيرة' },
            { key: 'dribbling', label: 'سرعة ردود الفعل الخاطفة', short: 'REF', icon: '⚡', desc: 'الاستجابة الفورية في الانفرادات والتسديد القريب' },
            { key: 'defending', label: 'الخروج والتغطية كحارس قشاش', short: 'SPD', icon: '🏃', desc: 'توقيت الخروج لقطع الانفرادات وخارج الصندوق' },
            { key: 'physical',  label: 'التمركز وتوجيه خط الدفاع', short: 'POS', icon: '🛡️', desc: 'حسن التمركز بين القائمين والقيادة للمدافعين' },
        ];
    }
    return [
        { key: 'pace',      label: 'السرعة والتسارع والانطلاق', short: 'PAC', icon: '⚡', desc: 'الانطلاق وسرعة الجري بالكرة في المساحات' },
        { key: 'shooting',  label: 'التسديد وإنهاء الهجمات',    short: 'SHO', icon: '⚽', desc: 'قوة ودقة إنهاء الكرات في الشباك' },
        { key: 'passing',   label: 'التمرير وصناعة اللعب',      short: 'PAS', icon: '🎯', desc: 'دقة التمرير وصناعة الفرص وكسر الخطوط' },
        { key: 'dribbling', label: 'المراوغة والتحكم بالكرة',   short: 'DRI', icon: '👟', desc: 'الرشاقة وحفظ الكرة وتجاوز المنافسين' },
        { key: 'defending', label: 'التمركز والواجب الدفاعي',   short: 'DEF', icon: '🛡️', desc: 'التمركز السليم وافتكاك الكرة والضغط' },
        { key: 'physical',  label: 'القوة البدنية والالتحامات',  short: 'PHY', icon: '💪', desc: 'الصراعات البدنية والارتقاء والتحمل' },
    ];
}

// ─── Default Skills ──────────────────────────────────────────
export const DEFAULT_SKILLS_PLAYER: FootballSkills = {
    pace: 75, shooting: 70, passing: 72,
    dribbling: 78, defending: 65, physical: 74,
};

export const DEFAULT_SKILLS_GK: FootballSkills = {
    pace: 82, shooting: 78, passing: 74,
    dribbling: 85, defending: 72, physical: 80,
};

// ─── Calculate Overall Score ─────────────────────────────────
export function calculateOverall(skills: FootballSkills, isGK: boolean): number {
    if (isGK) {
        const avg = Math.round(
            (skills.pace * 0.22) +      // DIV
            (skills.shooting * 0.20) +   // HAN
            (skills.passing * 0.14) +    // KIC
            (skills.dribbling * 0.22) +  // REF
            (skills.defending * 0.10) +  // SPD
            (skills.physical * 0.12)     // POS
        );
        return Math.min(99, Math.max(40, avg));
    }
    const avg = Math.round(
        (skills.pace * 0.20) +
        (skills.shooting * 0.18) +
        (skills.passing * 0.20) +
        (skills.dribbling * 0.20) +
        (skills.defending * 0.10) +
        (skills.physical * 0.12)
    );
    return Math.min(99, Math.max(40, avg));
}

// ─── Time Formatter ──────────────────────────────────────────
export function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ─── Frame Capture from Video ────────────────────────────────
export async function captureFrames(videoUrl: string): Promise<string[]> {
    return new Promise(resolve => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.preload = 'auto';
        video.muted = true;

        video.addEventListener('loadedmetadata', () => {
            const dur = video.duration;
            const count = Math.min(6, Math.max(2, Math.floor(dur / 4)));
            const times = Array.from({ length: count }, (_, i) => (dur / (count + 1)) * (i + 1));
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext('2d')!;
            const frames: string[] = [];
            let i = 0;

            const next = () => {
                if (i >= times.length) {
                    resolve(frames);
                    return;
                }
                video.currentTime = times[i];
            };
            video.addEventListener('seeked', () => {
                ctx.drawImage(video, 0, 0, 640, 360);
                frames.push(canvas.toDataURL('image/jpeg', 0.7));
                i++;
                next();
            });
            next();
        });
        video.addEventListener('error', () => resolve([]));
        video.load();
    });
}

// ─── Generate El7lm Pro Scouting Dossier ─────────────────────
export function generateEl7lmDossier(
    item: MediaItem,
    skills: FootballSkills,
    overallScore: number,
    dominantFoot: string,
    notes: string,
    analysisText: string,
    strengths: string[],
    areas: string[]
): string {
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const tier = getScoreTier(overallScore).label;
    const isGK = checkIsGoalkeeper(item.position);

    const strengthsText = strengths.length > 0
        ? strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : isGK
            ? '1. سرعة رد الفعل والتصدي في المواقف الفردية (1v1)\n2. التمركز السليم بين القائمين وحماية زوايا المرمى'
            : '1. التحكم الإيجابي بالكرة والسرعة في تغيير الاتجاه\n2. الرؤية الميدانية والتحرك الواعي في المساحات';

    const areasText = areas.length > 0
        ? areas.map((d, i) => `${i + 1}. ${d}`).join('\n')
        : isGK
            ? '1. دقة التمرير بالقدمين تحت الضغط لبناء الهجمة من الخلف\n2. زيادة التواصل الصوتي المستمر مع قلبي الدفاع'
            : '1. رفع الكثافة البدنية في الالتحامات القوية\n2. دقة إنهاء الكرات تحت الضغط العالي';

    const matrixSection = isGK
        ? `📊 مصفوفة الحلم لحراسة المرمى (El7lm Goalkeeper Performance Matrix):
🧤 الارتماء والتصدي المباشر (DIV): ${skills.pace}/100
🤲 الإمساك والتعامل مع الكرة (HAN): ${skills.shooting}/100
🎯 التوزيع وبناء اللعب بالقدم (KIC): ${skills.passing}/100
⚡ سرعة ردود الفعل الخاطفة (REF): ${skills.dribbling}/100
🏃 الخروج والتغطية كحارس قشاش (SPD): ${skills.defending}/100
🛡️ التمركز وتوجيه خط الدفاع (POS): ${skills.physical}/100`
        : `📊 مصفوفة الحلم للأداء الكروي (El7lm Performance Matrix):
⚡ السرعة والتسارع والانطلاق (PAC): ${skills.pace}/100
⚽ التسديد وإنهاء الهجمات (SHO): ${skills.shooting}/100
🎯 التمرير وصناعة اللعب (PAS): ${skills.passing}/100
👟 المراوغة والتحكم بالكرة (DRI): ${skills.dribbling}/100
🛡️ التمركز والواجب الدفاعي (DEF): ${skills.defending}/100
💪 القوة البدنية والالتحامات (PHY): ${skills.physical}/100`;

    const defaultRecommendation = isGK
        ? 'حارس مرمى واعد يمتلك ردود أفعال رشيقة وشجاعة في المواجهات المباشرة. يُوصى بالتركيز على تدريبات بناء اللعب بالقدمين لتطويره إلى حارس قشاش عصري.'
        : 'لاعب واعد يمتلك أساسيات فنية ممتازة تؤهله للاندماج السريع في التمارين التكتيكية التخصصية للأندية المحترفة.';

    const defaultAnalysis = isGK
        ? `التقرير الفني التكتيكي (تحليل حراسة المرمى):
أظهر الحارس ثباتاً انفعالياً مميزاً وسرعة استجابة عالية في الذود عن مرماه، مع قدرة لافتة على تقدير مسار الكرات العرضية وسرعة العودة لخط المرمى.
يتميز الحارس بالمرونة والتوازن الحركي أثناء الارتقاء، ويحتاج إلى مواصلة العمل على توقيت الخروج خارج منطقة الجزاء والتعامل بالقدمين.`
        : `التقرير الفني التكتيكي:
أظهر اللاعب مستوى واعداً في التحكم بالكرة والمرونة الحركية، مع قدرة واضحة على قراءة مجريات اللعب والتفاعل الإيجابي مع زملائه في الملعب.
يوصى بتكثيف الحصص التدريبية لرفع اللياقة البدنية والسرعة التكتيكية.`;

    return `📋 تقرير التقييم الكشفي المعتمد — منصة الحلم (El7lm Pro Scouting Dossier)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 بيانات اللاعب الأساسية:
• اسم اللاعب: ${item.userName}
• المركز التكتيكي: ${item.position || 'لاعب كرة قدم'}
• العمر: ${item.age ? `${item.age} سنة` : 'موهبة صاعدة'}
• الدولة: ${item.country || 'مصر'}
• النادي / الأكاديمية: ${item.organization || 'لاعب حر'}
• القدم المفضلة: ${dominantFoot}
• التقييم الكروي الإجمالي: ${overallScore} OVR (${tier})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${matrixSection}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ أبرز نقاط القوة التكتيكية (Key Strengths):
${strengthsText}

🎯 جوانب التطوير المستهدفة (Areas for Development):
${areasText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 التقييم الفني والتوصية الكشفية (Scout Recommendation):
${notes.trim() || defaultRecommendation}

📝 التقرير التحليلي للأداء:
${analysisText.trim() || defaultAnalysis}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 تاريخ التحليل: ${today}
🏷️ جهة التقييم: استوديو الأداء الرياضي الذكي — منصة الحلم (El7lm AI Studio)
🌐 بروفايل اللاعب: https://www.el7lm.com/profile/${item.userId}
`.trim();
}
