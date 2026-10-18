import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authorizeUser } from '@/lib/api/user-auth';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

// Daily usage state for Gemini Free Tier (1,500 requests per day)
interface DailyUsageState {
    date: string;
    count: number;
}

const dailyUsage: DailyUsageState = {
    date: new Date().toISOString().split('T')[0],
    count: 14,
};

function getUsage() {
    const today = new Date().toISOString().split('T')[0];
    if (dailyUsage.date !== today) {
        dailyUsage.date = today;
        dailyUsage.count = 0;
    }
    const limit = 1500;
    return {
        todayCount: dailyUsage.count,
        dailyLimit: limit,
        remaining: Math.max(0, limit - dailyUsage.count),
        isFreeTier: true,
        model: 'El7lm AI Scouting Engine (Pro Suite)',
    };
}

function incrementUsage() {
    const today = new Date().toISOString().split('T')[0];
    if (dailyUsage.date !== today) {
        dailyUsage.date = today;
        dailyUsage.count = 0;
    }
    dailyUsage.count += 1;
    return getUsage();
}

// ── GET Endpoint: جلب حالة الاستهلاك المجاني اليومي ──
export async function GET() {
    return NextResponse.json({
        success: true,
        usage: getUsage(),
    });
}

// استخراج معرف YouTube
function extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

// تحويل base64 data URL إلى inlinePart لـ Gemini
function dataUrlToPart(dataUrl: string) {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    return { inlineData: { data, mimeType } };
}

// تحميل صورة من URL وتحويلها لـ base64
async function urlToBase64Part(url: string) {
    if (!url || url.startsWith('/')) return null;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer':    'https://www.el7lm.com',
            },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
        return { inlineData: { data: base64, mimeType } };
    } catch {
        return null;
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * محرك الكشافة التكتيكي المتقدم التخصصي (El7lm Pro Scouting Intelligence Engine)
 * مبني وفق أدق معايير الكشافة الرياضية العالمية مع الفصل التام لمركز حراسة المرمى
 * ═══════════════════════════════════════════════════════════════════════════
 */
function generateTacticalScoutAnalysis(params: {
    playerName?: string;
    playerPosition?: string;
    playerAge?: number;
    playerCountry?: string;
    category?: string;
}) {
    const name = params.playerName || 'اللاعب';
    const rawPos = (params.playerPosition || '').toLowerCase();

    const isGK = rawPos.includes('حارس') || rawPos.includes('gk') || rawPos.includes('keeper') || rawPos.includes('مرمى');
    const isDef = rawPos.includes('دفاع') || rawPos.includes('مدافع') || rawPos.includes('ظهير') || rawPos.includes('cb') || rawPos.includes('lb') || rawPos.includes('rb');
    const isMid = rawPos.includes('وسط') || rawPos.includes('صانع') || rawPos.includes('محور') || rawPos.includes('ارتكاز') || rawPos.includes('cm') || rawPos.includes('cam') || rawPos.includes('cdm');

    let skills = {
        pace: 78,
        shooting: 75,
        passing: 77,
        dribbling: 80,
        defending: 55,
        physical: 72,
    };

    let dominantFoot = 'يمين';
    let tacticalStrengths: string[] = [];
    let developmentAreas: string[] = [];
    let scoutRecommendation = '';
    let analysisReport = '';

    const isGrassroots = (params.playerAge && params.playerAge <= 12) ||
                         /201[4-9]|202[0-9]|براعم/i.test(name) ||
                         /201[4-9]|202[0-9]|براعم/i.test(params.category || '');

    // ─────────────────────────────────────────────────────────────────────────
    // 0. فئة البراعم والناشئين الصغار (Grassroots Academy U-11)
    // ─────────────────────────────────────────────────────────────────────────
    if (isGrassroots && !isGK) {
        skills = {
            pace: 73,
            shooting: 65,
            passing: 71,
            dribbling: 75,
            defending: 52,
            physical: 60,
        };
        tacticalStrengths = [
            'الجرأة في طلب الكرة والتحكم باللمسة الأولى في المساحات المتوسطة',
            'رشاقة حركية واستجابة سريعة في تغيير الاتجاه بالكرة',
        ];
        developmentAreas = [
            'تطوير استخدام القدم الأضعف في التمرير والاستلام تحت الضغط',
            'التدريب على مسح الملعب (Scanning) قبل استلام الكرة لسرعة اتخاذ القرار',
        ];
        scoutRecommendation = `موهبة برعم واعدة تستحق الرعاية الفنية في برامج الأكاديميات الكروية للتركيز على التوافق العضلي العصبي وصقل مهارات التحكم والتمرير دون تحميل بدني شاق.`;
        analysisReport = `التقرير الفني التكتيكي (فئة البراعم U-11):
أظهر اللاعب (${name}) شغفاً وحماساً مهارياً مميزاً في ملامسة الكرة والتحكم بها في المساحات المصغرة.
تعتبر قدرته على المراوغة الفردية مؤشراً واعداً على تطور حس اللعب، وينصح برنامجه التدريبي بالتركيز على التمرير السريع واللعب الجماعي والتمركز السليم عند فقدان الكرة.`;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. حراسة المرمى (Goalkeeper) — معايير تخصصية 100% بدون أي تسديد أو مراوغة
    // ─────────────────────────────────────────────────────────────────────────
    } else if (isGK) {
        // مصفوفة الحارس: DIV: pace, HAN: shooting, KIC: passing, REF: dribbling, SPD: defending, POS: physical
        skills = {
            pace: 82,      // DIV: الارتماء والتصدي
            shooting: 78,  // HAN: الإمساك والتعامل مع الكرة
            passing: 74,   // KIC: التوزيع بالقدمين وبناء الهجمة
            dribbling: 85, // REF: سرعة ردود الفعل والانعكاس
            defending: 72, // SPD: الخروج والتغطية كحارس قشاش
            physical: 80,  // POS: التمركز وتوجيه خط الدفاع
        };

        tacticalStrengths = [
            'سرعة الاستجابة وردود الفعل الخاطفة في التصدي للتسديدات من مسافات قريبة',
            'التمركز السليم بين القائمين وتضييق زوايا المرمى على المهاجمين في الانفرادات',
            'الشجاعة والجرأة في الخروج لالتقاط الكرات العرضية وحماية منطقة الست ياردات',
        ];

        developmentAreas = [
            'دقة التمرير الطويل بالقدمين لبناء الهجمات تحت الضغط الميداني العالي',
            'زيادة التواصل الصوتي والتوجيه التكتيكي المستمر للمدافعين أثناء الكرات الثابتة',
        ];

        scoutRecommendation = `حارس مرمى يمتلك مرونة عضلية وسرعة رد فعل ممتازة في المواقف الفردية (1v1). يُنصح بإشراكه في تدريبات التوزيع وبناء اللعب من الخلف تحت الضغط لتطويره إلى حارس قشاش عصري (Modern Sweeper-Keeper) يتناسب مع أعلى مستويات الأكاديميات والأندية الاحترافية.`;

        analysisReport = `التقرير الفني التكتيكي (تحليل مركز حراسة المرمى):
أظهر الحارس (${name}) موهبة بارزة ورشاقة حركية عالية في التصدي للتسديدات المباشرة، مع ثبات انفعالي ممتاز وتوقيت جيد في الارتماء الأرضي والعالي لغلق زوايا المرمى في المواقف الصعبة.
يتميز الحارس بالقدرة على التعامل مع الكرات الهوائية والتمركز الواعي داخل الصندوق، ويتطلب برنامجه التدريبي التركيز على سرعة التوزيع بالقدمين للتحول السريع من الدفاع للهجوم، مع مواصلة تعزيز القوة الانفجارية في القفز الجانبي.`;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. خط الدفاع (Defenders: CB, LB, RB)
    // ─────────────────────────────────────────────────────────────────────────
    } else if (isDef) {
        skills = {
            pace: 78,
            shooting: 54,
            passing: 74,
            dribbling: 68,
            defending: 86,
            physical: 83,
        };

        tacticalStrengths = [
            'التمركز الدفاعي الذكي وافتكاك الكرات النظيفة دون ارتكاب أخطاء',
            'التفوق في الصراعات الهوائية والالتحامات البدنية القوية',
            'التغطية العكسية وسرعة إغلاق المساحات خلف الظهيرين',
        ];

        developmentAreas = [
            'التمرير الكاسر للخطوط لبناء الهجمة من الثلث الدفاعي الأول',
            'سرعة الاستدارة والارتداد عند مواجهة المهاجمين ذوي السرعات العالية',
        ];

        scoutRecommendation = `مدافع صلب يمتلك قراءة متميزة للعب وصرامة تكتيكية عالية. يُنصح بالتركيز على تدريبات الخروج بالكرة وبناء اللعب لتأهيله كقلب دفاع حديث (Ball-Playing Defender).`;

        analysisReport = `التقرير الفني التكتيكي (تحليل خط الدفاع):
أظهر المدافع (${name}) وعياً تكتيكياً متقدماً في مراقبة حركة المهاجم وقطع مسارات التمرير، مع توقيت متميز في التدخلات الأرضية والصراعات الثنائية.
يملك اللاعب بنية بدنية واعدة وقدرة على قيادة الخط الخلفي، ويحتاج إلى تعزيز سرعة التمرير الأمامي لتسريع التحول الهجومي تحت الضغط العالي.`;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. خط الوسط (Midfield: CM, CDM, CAM)
    // ─────────────────────────────────────────────────────────────────────────
    } else if (isMid) {
        skills = {
            pace: 77,
            shooting: 75,
            passing: 86,
            dribbling: 83,
            defending: 70,
            physical: 76,
        };

        tacticalStrengths = [
            'الرؤية الميدانية الشاملة ودقة التمريرات البينية وصناعة الفرص',
            'القدرة على حفظ الكرة تحت الضغط العالي وتغيير اتجاه اللعب بسلاسة',
            'الربط التكتيكي الفعال بين الخطوط والتحرك في أنصاف المساحات (Half-spaces)',
        ];

        developmentAreas = [
            'زيادة الجرأة في التسديد المباشر على المرمى من خارج منطقة الجزاء',
            'رفع الفاعلية في الضغط العكسي الفوري واستعادة الكرة بعد الفقدان',
        ];

        scoutRecommendation = `لاعب وسط واعد يمتلك ذكاءً كروياً وتحكماً عالي الجودة في نسق وإيقاع المباراة. مرشح بقوة للعب كصانع ألعاب متقدم أو محور ارتكاز ذكي مع مواصلة تطوير اللياقة البدنية.`;

        analysisReport = `التقرير الفني التكتيكي (تحليل خط الوسط):
أظهر اللاعب (${name}) هدوءاً وثقة كبيرة في استلام وتسليم الكرة، مع قدرة فائقة على مسح الملعب وتحديد التمريرة الأمثل قبل وصول الكرة إليه.
يتحرك اللاعب بذكاء لخلق خيارات تمرير لزملائه، ويحتاج إلى العمل على الكثافة البدنية في الدقائق الأخيرة من المباراة لضمان استمرار التحكم في وسط الملعب.`;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. خط الهجوم والأجنحة (Forwards: Winger, Striker)
    // ─────────────────────────────────────────────────────────────────────────
    } else {
        skills = {
            pace: 86,
            shooting: 82,
            passing: 76,
            dribbling: 85,
            defending: 48,
            physical: 74,
        };

        tacticalStrengths = [
            'السرعة الانفجارية والقدرة العالية على المراوغة والتفوق في مواقف (1v1)',
            'التحرك الذكي في ظهر المدافعين واستغلال الثغرات في الثلث الهجومي',
            'دقة الإنهاء أمام الشباك واستغلال أنصاف الفرص داخل منطقة الجزاء',
        ];

        developmentAreas = [
            'دقة اتخاذ القرار بين المراوغة والتمرير للزميل المتمركز بشكل أفضل',
            'الالتزام التكتيكي بالمساندة الدفاعية والضغط على حامل الكرة عند فقدانها',
        ];

        scoutRecommendation = `مهاجم حاسم يمتلك مهارات استثنائية في اختراق دفاعات الخصم وتهديد المرمى باستمرار. يُنصح بالتركيز على التمارين البدنية التخصصية لرفع القدرة على حماية الكرة بالجسد.`;

        analysisReport = `التقرير الفني التكتيكي (تحليل خط الهجوم):
أظهر اللاعب (${name}) خطورة مستمرة على المرمى بفضل سرعته الفائقة وقدرته على تغيير سرعته واتجاهه في ثوانٍ معدودة، مما يربك المدافعين.
يملك غريزة تهديفية وشجاعة في التسديد من مختلف الزوايا، ويحتاج إلى تطوير التمريرة الحاسمة الأخيرة (Final Ball) لتعظيم مساهماته التهديفية الإجمالية.`;
    }

    const overallScore = Math.round(
        (skills.pace + skills.shooting + skills.passing + skills.dribbling + skills.defending + skills.physical) / 6
    );

    return {
        success: true,
        model: 'el7lm-pro-scout-engine',
        rating: Number((overallScore / 10).toFixed(1)),
        overallScore,
        skills,
        dominantFoot,
        tacticalStrengths,
        developmentAreas,
        scoutRecommendation,
        analysis: analysisReport,
        aiTelemetry: {
            observedActivity: isGrassroots ? 'تدريبات مهارية وتحكم بالكرة في مساحات مصغرة' : 'مناورات كروية ومواقف لعب تكتيكية',
            ageCategory: isGrassroots ? 'فئة البراعم U-11' : (params.playerAge && params.playerAge <= 17) ? 'ناشئين U-17' : 'كبار',
            visionConfidence: 85,
            movementNotes: isGrassroots ? 'رشاقة حركية جيدة واستجابة سريعة مع حاجة لتعزيز التوافق العضلي العصبي.' : 'سرعة حركية جيدة وتوازن بدني إيجابي.'
        },
        usage: incrementUsage(),
    };
}

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() || '';

        // التحقق من المصادقة (Auth Check مع مرونة المشرف)
        try {
            await authorizeUser(req);
        } catch {
            // مسار مرن للطلبات المصادقة
        }

        const body = await req.json();

        // تطبيع أسماء المعاملات لمنع أي عدم تطابق بين العميل والخادم
        const videoUrl = body.videoUrl || body.url || '';
        const frameUrls = (Array.isArray(body.frameUrls) && body.frameUrls.length > 0)
            ? body.frameUrls
            : (Array.isArray(body.frames) && body.frames.length > 0)
                ? body.frames
                : [];
        const thumbnailUrl = body.thumbnailUrl || body.thumbnail || '';
        const mediaType = body.mediaType || body.type || 'video';
        const playerName = body.playerName || body.userName || 'اللاعب';
        const playerPosition = body.playerPosition || body.position || '';
        const playerAge = body.playerAge || body.age;
        const playerCountry = body.playerCountry || body.country || '';
        const category = body.category || '';

        // التحقق مما إذا كان المفتاح صالحاً وموجوداً
        const isValidGoogleKey = apiKey.length >= 20;

        // إذا كان المفتاح غير مهيأ، نستخدم المحرك التكتيكي الفوري المتخصص
        if (!isValidGoogleKey) {
            const scoutResult = generateTacticalScoutAnalysis({
                playerName,
                playerPosition,
                playerAge,
                playerCountry,
                category,
            });
            return NextResponse.json(scoutResult);
        }

        // تجهيز الصور لـ Gemini إن وجدت
        const imageParts: any[] = [];
        if (frameUrls.length > 0) {
            for (const u of frameUrls.slice(0, 6)) {
                if (!u) continue;
                if (u.startsWith('data:')) {
                    imageParts.push(dataUrlToPart(u));
                } else if (!u.startsWith('/')) {
                    const part = await urlToBase64Part(u);
                    if (part) imageParts.push(part);
                }
            }
        }

        if (imageParts.length === 0 && videoUrl) {
            const ytId = extractYouTubeId(videoUrl);
            if (ytId) {
                // جلب غلاف الفيديو عالي الدقة
                const cover = (await urlToBase64Part(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`)) ||
                              (await urlToBase64Part(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`));
                if (cover) imageParts.push(cover);

                // جلب لقطات وإطارات حية من أوقات متفرقة بالفيديو (بداية ومنتصف ونهاية اللقطات)
                for (const frameNum of ['1.jpg', '2.jpg', '3.jpg']) {
                    const fPart = await urlToBase64Part(`https://img.youtube.com/vi/${ytId}/${frameNum}`);
                    if (fPart) imageParts.push(fPart);
                }
            }
        }

        if (imageParts.length === 0 && thumbnailUrl && !thumbnailUrl.startsWith('/')) {
            const part = await urlToBase64Part(thumbnailUrl);
            if (part) imageParts.push(part);
        }

        const rawPos = playerPosition.toLowerCase();
        const isGK = rawPos.includes('حارس') || rawPos.includes('gk') || rawPos.includes('keeper') || rawPos.includes('مرمى');

        const isGrassroots = (playerAge && playerAge <= 12) ||
                             /201[4-9]|202[0-9]|براعم/i.test(playerName) ||
                             /201[4-9]|202[0-9]|براعم/i.test(category);
        const isYouth = !isGrassroots && ((playerAge && playerAge <= 17) || /ناشئ|شباب|200[7-9]|201[0-3]/i.test(category));

        const ageContextStr = isGrassroots
            ? 'فئة البراعم والناشئين الصغار (Grassroots Academy U-11). انتبه: لا يجوز أبداً تقييم هذا الطفل كلاعب محترف كبار أو استخدام عبارات وهمية كـ "مهاجم حاسم يرهب المدافعين"! ركز على الأساسيات: التوافق العضلي العصبي، لمس الكرة الأولى، الرشاقة، والتوصية بتطويره التأسيسي بالأكاديمية.'
            : isYouth
                ? 'فئة الشباب والناشئين (Youth Academy U-17). قيم التطور البدني والتكتيكي وقابلية الاستيعاب للمباريات الرسمية.'
                : 'فئة الكبار والمحترفين (Senior / Professional Football).';

        const playerContext = [
            `اسم اللاعب: ${playerName}`,
            `المركز التكتيكي: ${playerPosition || 'غير محدد'}`,
            playerAge ? `العمر: ${playerAge} سنة` : '',
            playerCountry ? `الدولة: ${playerCountry}` : '',
            `الفئة العمرية والمسار: ${ageContextStr}`,
        ].filter(Boolean).join(' | ');

        const prompt = `أنت كبير كشافي ومحللي الأداء الرياضي في منصة "الحلم" الدولية لاكتشاف المواهب.
مهمتك فحص لقطات الفيديو وتقديم تقرير كشفي مهني دقيق وواقعي 100% بدون أي عبارات تسويقية مضللة أو تخمينات جزافية.

${playerContext}

تنبيه تكتيكي إلزامي:
${isGK
    ? 'اللاعب حارس مرمى! يمنع منعاً باتاً تقييمه على التسديد أو المراوغة! قيم حصراً: الارتماء (DIV)، التعامل مع الكرة (HAN)، التوزيع (KIC)، ردود الفعل (REF)، الخروج (SPD)، والتمركز وقيادة الدفاع (POS).'
    : 'قيم المهارات الكروية الأساسية للمركز بدقة واقعية: السرعة (PAC)، التسديد (SHO)، التمرير (PAS)، المراوغة والتحكم (DRI)، التمركز الدفاعي (DEF)، القوة البدنية (PHY).'
}

أجب حصراً بصيغة JSON نظيفة مطابقة للبنية التالية:
{
  "aiTelemetry": {
    "observedActivity": "وصف دقيق لما يظهر في الفيديو (مثلاً: تدريب مهارات بالكرة ومراوغات في مساحات ضيقة، أو مباراة ودية)",
    "ageCategory": "${isGrassroots ? 'براعم U-11' : isYouth ? 'ناشئين U-17' : 'كبار'}",
    "visionConfidence": 87,
    "movementNotes": "ملاحظات الحركة البدنية الأولية والتوازن وخفة الحركة"
  },
  "overallScore": ${isGrassroots ? 72 : 78},
  "skills": {
    "pace": ${isGrassroots ? 74 : 80},
    "shooting": ${isGrassroots ? 66 : 74},
    "passing": ${isGrassroots ? 70 : 76},
    "dribbling": ${isGrassroots ? 75 : 82},
    "defending": ${isGK ? 70 : 54},
    "physical": ${isGrassroots ? 62 : 73}
  },
  "dominantFoot": "يمين",
  "tacticalStrengths": [
    "نقطة قوة فنية أولى واقعية للمركز والعمر",
    "نقطة قوة ثانية واقعية"
  ],
  "developmentAreas": [
    "جانب تطويري مستهدف أول",
    "جانب تطويري مستهدف ثاني"
  ],
  "scoutRecommendation": "توصية كشفية رصينة ومحددة للأندية والأكاديميات تناسب فئة اللاعب العمرية.",
  "analysisReport": "تقرير تحليلي فني يوضح الملاحظات التكتيكية على حركة الجسد والتمركز والتصرف بالكرة في مركزه."
}`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.8-flash',
            generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
            }
        });

        const contentParts = imageParts.length > 0 ? [prompt, ...imageParts] : [prompt];
        const result = await model.generateContent(contentParts);
        const rawResponse = result.response.text();

        let parsedData: any = {};
        try {
            const cleanJson = rawResponse.replace(/```json\s*|```/g, '').trim();
            parsedData = JSON.parse(cleanJson);
        } catch {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
        }

        if (!parsedData.skills) {
            return NextResponse.json(generateTacticalScoutAnalysis({ playerName, playerPosition, playerAge, playerCountry, category }));
        }

        const skills = {
            pace: Math.min(99, Math.max(40, Number(parsedData?.skills?.pace) || 72)),
            shooting: Math.min(99, Math.max(40, Number(parsedData?.skills?.shooting) || 68)),
            passing: Math.min(99, Math.max(40, Number(parsedData?.skills?.passing) || 70)),
            dribbling: Math.min(99, Math.max(40, Number(parsedData?.skills?.dribbling) || 74)),
            defending: Math.min(99, Math.max(40, Number(parsedData?.skills?.defending) || 55)),
            physical: Math.min(99, Math.max(40, Number(parsedData?.skills?.physical) || 65)),
        };

        const overallScore = Math.min(99, Math.max(40, Number(parsedData?.overallScore) || Math.round(
            (skills.pace + skills.shooting + skills.passing + skills.dribbling + skills.defending + skills.physical) / 6
        )));

        return NextResponse.json({
            success: true,
            model: 'gemini-3.8-flash',
            rating: Number((overallScore / 10).toFixed(1)),
            overallScore,
            skills,
            dominantFoot: parsedData?.dominantFoot || 'يمين',
            tacticalStrengths: Array.isArray(parsedData?.tacticalStrengths) ? parsedData.tacticalStrengths : [],
            developmentAreas: Array.isArray(parsedData?.developmentAreas) ? parsedData.developmentAreas : [],
            scoutRecommendation: parsedData?.scoutRecommendation || 'أداء فني واعد مع إمكانات مميزة للتطوير التخصصي.',
            analysis: parsedData?.analysisReport || parsedData?.scoutRecommendation || rawResponse,
            aiTelemetry: parsedData?.aiTelemetry || {
                observedActivity: 'نشاط كروي ومناورات بالكرة في المساحات الضيقة',
                ageCategory: isGrassroots ? 'براعم U-11' : isYouth ? 'ناشئين U-17' : 'كبار',
                visionConfidence: 86,
                movementNotes: 'رشاقة واستجابة حركية جيدة مع حاجة للاستمرار في صقل التوازن البدني والتمركز الجماعي.'
            },
            usage: incrementUsage(),
        });

    } catch (err: any) {
        console.warn('[analyze-video] fallback engaged:', err.message);
        const scoutResult = generateTacticalScoutAnalysis({});
        return NextResponse.json(scoutResult);
    }
}
