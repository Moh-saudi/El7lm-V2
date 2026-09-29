import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authorizeUser } from '@/lib/api/user-auth';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function dataUrlToPart(dataUrl: string) {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || '';
    if (!ALLOWED_IMAGE_TYPES.has(mimeType) || !data) return null;
    const estimatedBytes = Math.ceil(data.length * 0.75);
    if (estimatedBytes > MAX_IMAGE_BYTES) return null;
    return { inlineData: { data, mimeType } };
}

function isTrustedMediaUrl(value: string): boolean {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return false;
        const configuredOrigins = [
            process.env.CLOUDFLARE_R2_PUBLIC_URL,
            process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL,
            process.env.NEXT_PUBLIC_SUPABASE_URL,
        ].filter(Boolean).flatMap((entry) => {
            try { return [new URL(String(entry)).origin]; } catch { return []; }
        });
        const trustedOrigins = new Set(['https://assets.el7lm.com', ...configuredOrigins]);
        return trustedOrigins.has(url.origin);
    } catch {
        return false;
    }
}

async function urlToBase64Part(url: string) {
    if (!isTrustedMediaUrl(url)) return null;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer':    'https://el7lm.com',
            },
            // @ts-ignore
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        const mimeType = (res.headers.get('content-type') || '').split(';')[0];
        if (!ALLOWED_IMAGE_TYPES.has(mimeType)) return null;
        const contentLength = Number(res.headers.get('content-length') || 0);
        if (contentLength > MAX_IMAGE_BYTES) return null;
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_BYTES) return null;
        return { inlineData: { data: Buffer.from(buffer).toString('base64'), mimeType } };
    } catch (e) {
        console.warn('[analyze] urlToBase64Part error:', url, e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    const authorization = await authorizeUser(req);
    if (!authorization.ok) return authorization.response;
    try {
        const { videoUrl, frameUrls, mediaType, playerName, playerPosition, playerAge } = await req.json();

        if (!videoUrl && (!frameUrls || frameUrls.length === 0)) {
            return NextResponse.json({ error: 'يجب تقديم رابط أو frames' }, { status: 400 });
        }

        const isImage = mediaType === 'image';

        // ── بناء معلومات اللاعب ──
        const playerInfo = [
            playerName     ? `اسم اللاعب: ${playerName}`     : '',
            playerPosition ? `المركز: ${playerPosition}`       : '',
            playerAge      ? `العمر: ${playerAge} سنة`         : '',
        ].filter(Boolean).join(' | ');

        // ── الـ prompt ──
        const prompt = isImage
            ? `أنت محلل رياضي متخصص في كرة القدم وتقييم اللاعبين.
${playerInfo ? `معلومات اللاعب: ${playerInfo}` : ''}

حلل هذه الصورة الرياضية وقدّم تقريراً احترافياً بالعربية يتضمن:

1. **وصف المشهد** — ما الذي تراه في الصورة؟
2. **الوضعية والأسلوب** — تقييم وضعية الجسم والأسلوب الرياضي
3. **نقاط القوة** — ما يميز اللاعب في هذه الصورة
4. **ملاحظات تقنية** — أي ملاحظات تقنية مفيدة
5. **التقييم العام** — تقييم من 10 مع مبرر
6. **توصية** — جملة توصية واحدة مختصرة

الرد بالعربية فقط.`
            : `أنت محلل رياضي متخصص في كرة القدم وتقييم اللاعبين.
${playerInfo ? `معلومات اللاعب: ${playerInfo}` : ''}

حلل ما تراه في هذه اللقطات من الفيديو وقدّم تقريراً رياضياً احترافياً بالعربية يتضمن:

1. **المهارات الملاحظة** — ما المهارات التي يظهرها اللاعب؟
2. **نقاط القوة** — ما أبرز نقاط قوته؟
3. **نقاط التطوير** — ما الجوانب التي تحتاج تحسيناً؟
4. **التقييم العام** — تقييم من 10 مع مبرر مختصر
5. **توصية للمدرب** — جملة توصية واحدة مباشرة

اجعل التقرير واضحاً ومفيداً للمدرب واللاعب. الرد بالعربية فقط.`;

        // ── تجهيز الصور لـ Gemini ──
        const imageParts: any[] = [];

        if (frameUrls && frameUrls.length > 0) {
            // frames مستخرجة (base64 data URLs أو روابط مباشرة)
            for (const url of frameUrls.slice(0, 6)) {
                if (!url) continue;
                if (url.startsWith('data:')) {
                    const part = dataUrlToPart(url);
                    if (part) imageParts.push(part);
                } else if (!url.startsWith('/')) {
                    // رابط مطلق فقط — لا روابط نسبية
                    const part = await urlToBase64Part(url);
                    if (part) imageParts.push(part);
                }
            }
        }

        // fallback: إذا ما في frames صالحة — جرّب videoUrl مباشرة
        if (imageParts.length === 0 && videoUrl && !videoUrl.startsWith('/')) {
            const part = await urlToBase64Part(videoUrl);
            if (part) imageParts.push(part);
        }

        if (imageParts.length === 0) {
            return NextResponse.json(
                { error: 'لم نتمكن من تحميل الميديا. تأكد أن الرابط عام وقابل للوصول.' },
                { status: 400 }
            );
        }

        // ── استدعاء Gemini ──
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const result = await model.generateContent([prompt, ...imageParts]);
        const analysis = result.response.text();

        // استخراج التقييم من النص (رقم من 10)
        const ratingMatch = analysis.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*10|من\s*10|من10|\s*عشرة)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        return NextResponse.json({
            success: true,
            analysis,
            rating,
            model: 'gemini-1.5-flash-latest',
        });

    } catch (err: any) {
        console.error('[analyze-video] Gemini error:', err);

        if (err?.status === 429 || err?.message?.includes('quota')) {
            return NextResponse.json(
                { error: 'تجاوزت الحد المسموح — حاول مرة أخرى بعد قليل' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: err?.message || 'حدث خطأ أثناء التحليل' },
            { status: 500 }
        );
    }
}
