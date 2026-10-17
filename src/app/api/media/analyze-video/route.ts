import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authorizeUser } from '@/lib/api/user-auth';
import { rateLimiter } from '@/lib/security/rate-limit';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) {
            console.warn('[analyze-video] fetch failed:', url, res.status);
            return null;
        }
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
        return { inlineData: { data: base64, mimeType } };
    } catch (e) {
        console.warn('[analyze-video] urlToBase64Part error:', url, e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!apiKey) {
            return NextResponse.json(
                { error: 'مفتاح Gemini API غير مهيأ في الخادم' },
                { status: 500 }
            );
        }

        // 1. التحقق من المصادقة (Auth Check)
        const authResult = await authorizeUser(req);
        if (!authResult.ok) {
            return authResult.response;
        }

        const isAdmin =
            authResult.user.user_metadata?.account_type === 'admin' ||
            (authResult.user as any).accountType === 'admin' ||
            (authResult.user as any).role === 'admin' ||
            authResult.user.email?.startsWith('admin@');

        // 2. تقييد المعدل (لغير المشرفين فقط)
        if (!isAdmin) {
            const rateCheck = rateLimiter.check(`ai_analyze:${authResult.user.id}`, {
                windowMs: 10 * 60 * 1000,
                max: 10,
                minIntervalMs: 3000,
            });

            if (!rateCheck.allowed) {
                const waitSeconds = Math.max(1, Math.ceil(rateCheck.retryAfterMs / 1000));
                return NextResponse.json(
                    { error: `تجاوزت الحد المسموح به من طلبات التحليل. يرجى الانتظار ${waitSeconds} ثانية.` },
                    { status: 429, headers: { 'Retry-After': String(waitSeconds) } }
                );
            }
        }

        const body = await req.json();
        const {
            videoUrl,
            frameUrls,
            thumbnailUrl,
            mediaType,
            playerName,
            playerPosition,
            playerAge,
            playerCountry,
            category
        } = body;

        if (!videoUrl && (!frameUrls || frameUrls.length === 0) && !thumbnailUrl) {
            return NextResponse.json({ error: 'يجب تقديم رابط الفيديو أو لقطات منه' }, { status: 400 });
        }

        // ── تجهيز الصور لـ Gemini ──
        const imageParts: any[] = [];

        // أ) فحص frames المرسلة من العميل
        if (Array.isArray(frameUrls) && frameUrls.length > 0) {
            for (const url of frameUrls.slice(0, 6)) {
                if (!url) continue;
                if (url.startsWith('data:')) {
                    imageParts.push(dataUrlToPart(url));
                } else if (!url.startsWith('/')) {
                    const part = await urlToBase64Part(url);
                    if (part) imageParts.push(part);
                }
            }
        }

        // ب) فحص روابط يوتيوب التلقائية
        if (imageParts.length === 0 && videoUrl) {
            const ytId = extractYouTubeId(videoUrl);
            if (ytId) {
                const maxRes = await urlToBase64Part(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`);
                if (maxRes) {
                    imageParts.push(maxRes);
                } else {
                    const hqRes = await urlToBase64Part(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
                    if (hqRes) imageParts.push(hqRes);
                }
            }
        }

        // ج) فحص صورة الغلاف الممررة (thumbnailUrl)
        if (imageParts.length === 0 && thumbnailUrl && !thumbnailUrl.startsWith('/')) {
            const part = await urlToBase64Part(thumbnailUrl);
            if (part) imageParts.push(part);
        }

        // د) fallback أخير: محاولة تحميل الرابط المباشر إذا كان صورة
        if (imageParts.length === 0 && videoUrl && !videoUrl.startsWith('/') && mediaType === 'image') {
            const part = await urlToBase64Part(videoUrl);
            if (part) imageParts.push(part);
        }

        // ── بناء معلومات وسياق اللاعب ──
        const playerContext = [
            playerName      ? `اسم اللاعب: ${playerName}`           : 'اسم اللاعب: موهبة كروية صاعدة',
            playerPosition  ? `المركز الأساسي: ${playerPosition}`     : '',
            playerAge       ? `العمر: ${playerAge} سنة`               : '',
            playerCountry   ? `الدولة: ${playerCountry}`             : '',
            category        ? `نوع الفيديو: ${category}`             : 'مهارات كروية',
        ].filter(Boolean).join(' | ');

        // ── برومبت المحلل الرياضي المتخصص (JSON مهيكل) ──
        const prompt = `أنت كبير كشافي ومحللي الأداء الرياضي في منصة "الحلم" الدولية لاكتشاف ورعاية المواهب الرياضية.
مهمتك تحليل الفيديو/اللقطات المرفوعة للاعب كرة قدم، وتقديم تقييم احترافي دقيق ومعايير مهارات رقمية (من 40 إلى 99 نقطة مثل معايير EA Sports و Wyscout و Opta).

${playerContext}

حلل اللقطات بعين خبيرة، وقدم إجابتك حصراً بصيغة JSON نظيفة بدون أي علامات ماركداون إضافية، متوافقة مع هذا المخطط:
{
  "overallScore": 82,
  "skills": {
    "pace": 84,
    "shooting": 78,
    "passing": 80,
    "dribbling": 85,
    "defending": 58,
    "physical": 76
  },
  "dominantFoot": "يمين",
  "tacticalStrengths": [
    "التحكم بالكرة والمراوغة في المساحات الضيقة",
    "سرعة تغيير الاتجاه والانطلاق الهجومي"
  ],
  "developmentAreas": [
    "دقة التمرير الطويل تحت الضغط العالي",
    "المساندة الدفاعية والافتكاك"
  ],
  "scoutRecommendation": "لاعب هجومي يمتلك مرونة ورشاقة عالية، يوصى بالتركيز على التمارين التكتيكية لزيادة الفاعلية أمام المرمى.",
  "analysisReport": "تقرير تحليلي مفصل من فقرتين يوضح الملاحظات التكتيكية على الأداء وحركة الجسد والتمركز."
}

قواعد التقييم:
1. درجات المهارات الست (pace, shooting, passing, dribbling, defending, physical) يجب أن تكون أرقاماً صحيحة بين 45 و 95 تتناسب مع مركز اللاعب وعمره.
2. overallScore هو التقييم الإجمالي العام الموزون للمركز.
3. dominantFoot تكون "يمين" أو "يسار" أو "كلتا القدمين".
4. الرد بالعربية الرياضية الفصيحة، وبصيغة JSON صالحة فقط.`;

        // ── استدعاء Gemini بنماذج احتياطية مرنة وسريعة ──
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        let rawResponse = '';
        let usedModel = candidateModels[0];
        let lastError: any = null;

        for (const m of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: m,
                    generationConfig: {
                        temperature: 0.3,
                        responseMimeType: 'application/json',
                    }
                });

                const contentParts = imageParts.length > 0 ? [prompt, ...imageParts] : [prompt];
                const result = await model.generateContent(contentParts);
                rawResponse = result.response.text();
                usedModel = m;
                if (rawResponse) break;
            } catch (mErr: any) {
                lastError = mErr;
                console.warn(`[analyze-video] Model ${m} failed, trying fallback:`, mErr?.message || mErr);
            }
        }

        if (!rawResponse) {
            throw lastError || new Error('تعذر توليد تحليل الأداء بالذكاء الاصطناعي');
        }

        // تنظيف ومطابقة JSON
        let parsedData: any = {};
        try {
            const cleanJson = rawResponse.replace(/```json\s*|```/g, '').trim();
            parsedData = JSON.parse(cleanJson);
        } catch {
            // محاولة استخراج الكائن عبر Regex
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('فشل تفسير صيغة استجابة التحليل');
            }
        }

        const skills = {
            pace: Math.min(99, Math.max(40, Number(parsedData?.skills?.pace) || 75)),
            shooting: Math.min(99, Math.max(40, Number(parsedData?.skills?.shooting) || 72)),
            passing: Math.min(99, Math.max(40, Number(parsedData?.skills?.passing) || 74)),
            dribbling: Math.min(99, Math.max(40, Number(parsedData?.skills?.dribbling) || 78)),
            defending: Math.min(99, Math.max(40, Number(parsedData?.skills?.defending) || 60)),
            physical: Math.min(99, Math.max(40, Number(parsedData?.skills?.physical) || 70)),
        };

        const overallScore = Math.min(99, Math.max(40, Number(parsedData?.overallScore) || Math.round(
            (skills.pace + skills.shooting + skills.passing + skills.dribbling + skills.defending + skills.physical) / 6
        )));

        const rating = Number((overallScore / 10).toFixed(1));

        return NextResponse.json({
            success: true,
            model: usedModel,
            rating,
            overallScore,
            skills,
            dominantFoot: parsedData?.dominantFoot || 'يمين',
            tacticalStrengths: Array.isArray(parsedData?.tacticalStrengths) ? parsedData.tacticalStrengths : [],
            developmentAreas: Array.isArray(parsedData?.developmentAreas) ? parsedData.developmentAreas : [],
            scoutRecommendation: parsedData?.scoutRecommendation || 'أداء إيجابي مع إمكانات واعدة للتطوير المستمر.',
            analysis: parsedData?.analysisReport || parsedData?.scoutRecommendation || rawResponse,
        });

    } catch (err: any) {
        console.error('[analyze-video] error:', err);

        if (err?.status === 429 || err?.message?.includes('quota')) {
            return NextResponse.json(
                { error: 'تجاوزت سعة Gemini مؤقتاً — يرجى المحاولة بعد دقيقة واحدة.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: err?.message || 'حدث خطأ أثناء إجراء التحليل الرياضي الذكي' },
            { status: 500 }
        );
    }
}
