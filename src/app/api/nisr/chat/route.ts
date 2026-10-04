import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { loadNisrPlayerContext, NisrContextError } from '@/lib/nisr/player-context';
import { rateLimiter } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const supportedLocales = new Set(['ar', 'en', 'es', 'pt', 'fr']);
const MAX_MESSAGE_LENGTH = 800;
const MAX_AUDIO_BASE64_LENGTH = 3_000_000;
type Locale = 'ar' | 'en' | 'es' | 'pt' | 'fr';

const titles: Record<Locale, string> = {
  ar: 'نسر — مساعدك الرياضي',
  en: 'NISR — Your Sports Assistant',
  es: 'NISR — Tu Asistente Deportivo',
  pt: 'NISR — O Teu Assistente Desportivo',
  fr: 'NISR — Votre Assistant Sportif',
};

function cleanText(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim()
    : '';
}

function buildSystemInstruction(locale: Locale): string {
  const languageRules: Record<Locale, { greeting: string; langName: string; audioUnclear: string; dietMissing: string; trainMissing: string }> = {
    ar: {
      greeting: 'أهلاً كابتن [الاسم]',
      langName: 'اللغة العربية حصراً',
      audioUnclear: 'عذراً كابتن، لم أتمكن من سماع رسالتك الصوتية بوضوح بسبب تشويش أو انخفاض الصوت. هل يمكنك إعادة تسجيلها أو كتابة سؤالك وسأجيبك فوراً؟',
      dietMissing: 'حتى أضع لك خطة غذائية دقيقة تحقق أهدافك الرياضية، أحتاج معرفة طولك ووزنك الحالي وأي تفاصيل صحية. هل يمكنك تزويدي بها لنبدأ؟',
      trainMissing: 'لنبني خطة تدريبية احترافية تناسب بنيتك ومركزك، أحتاج معرفة طولك ووزنك ومستواك البدني الحالي. شاركني هذه الأرقام لنصمم برنامجك بدقة!',
    },
    en: {
      greeting: 'Hello Captain [Name]',
      langName: 'English ONLY',
      audioUnclear: 'Sorry Captain, I could not hear your voice note clearly due to background noise or low volume. Could you please re-record or type your question so I can help right away?',
      dietMissing: 'To build an accurate nutrition plan that fits your athletic goals, I need to know your current height, weight, and any dietary conditions. Could you share them with me?',
      trainMissing: 'To design a professional training plan tailored to your physique and position, I need your height, weight, and current fitness level. Share these details and let us start!',
    },
    es: {
      greeting: '¡Hola, Capitán [Nombre]!',
      langName: 'Español EXCLUSIVAMENTE',
      audioUnclear: 'Disculpa Capitán, no pude escuchar tu mensaje de voz con claridad debido a interferencias o bajo volumen. ¿Podrías grabarlo de nuevo o escribir tu consulta para ayudarte de inmediato?',
      dietMissing: 'Para diseñar un plan nutricional exacto según tus metas deportivas, necesito conocer tu estatura, peso actual y condiciones de salud. ¿Podrías compartirlos?',
      trainMissing: 'Para estructurar un entrenamiento profesional a la medida de tu posición y físico, necesito tu estatura, peso y nivel físico actual. ¡Compártelos y arrancamos!',
    },
    pt: {
      greeting: 'Olá, Capitão [Nome]!',
      langName: 'Português EXCLUSIVAMENTE',
      audioUnclear: 'Desculpa Capitão, não consegui ouvir a tua mensagem de voz com clareza devido a ruído. Podes gravar novamente ou escrever a tua pergunta?',
      dietMissing: 'Para criar um plano nutricional preciso para os teus objetivos, preciso de saber a tua altura, peso e detalhes de saúde. Podes partilhar comigo?',
      trainMissing: 'Para montar um treino profissional adequado à tua posição, preciso da tua altura, peso e condição física atual. Partilha comigo e começamos!',
    },
    fr: {
      greeting: 'Bonjour Capitaine [Nom] !',
      langName: 'Français EXCLUSIVEMENT',
      audioUnclear: 'Désolé Capitaine, je n\'ai pas pu entendre clairement votre message vocal en raison de bruits de fond ou d\'un volume faible. Pourriez-vous le réenregistrer ou l\'écrire ?',
      dietMissing: 'Pour établir un plan nutritionnel précis adapté à vos objectifs, j\'ai besoin de votre taille, de votre poids et de détails sur votre santé. Pouvez-vous me les indiquer ?',
      trainMissing: 'Pour concevoir un entraînement professionnel adapté à votre poste et votre gabarit, j\'ai besoin de votre taille, poids et niveau physique actuel. Partagez-les pour commencer !',
    },
  };

  const current = languageRules[locale] || languageRules.ar;

  return `You are "NISR" (نسر), an elite, motivating personal football coach on the EL7LM (الحلم) sports platform.

Strict Rules:
1. Target Language: You MUST reply strictly in ${current.langName}. Under NO circumstances reply in any other language unless explicitly requested by the player.
2. Respectful Coach Greeting: Always open your reply addressing the player respectfully: "${current.greeting}".
3. Audio Recording & Clarity (CRITICAL):
   - When an audio recording is sent, listen to it carefully.
   - If the audio is silence, static noise, corrupted, background chatter, or unintelligible words:
     DO NOT GUESS or make up a random training or diet plan!
     Instead, immediately reply stating that the audio was not clear:
     "${current.audioUnclear}"
4. Short & Direct Responses: Keep your answers CONCISE and focused (3 to 5 sentences or 3 brief practical bullet points). Do not write lengthy generic essays.
5. Profile Facts Verification:
   - When asked for Nutrition: If height or weight is missing, ask: "${current.dietMissing}"
   - When asked for Training: If physical facts are missing, ask: "${current.trainMissing}"
   - If facts ARE available in the profile, refer directly to them and give specific advice.
6. Professional Football Passion: Speak like a real elite European/Arab football coach. NEVER mention JSON, databases, code variables, or system IDs.`;
}

function formatPlayerSummary(ctx: import('@/lib/nisr/player-context').NisrPlayerContext): string {
  const lines: string[] = [];
  if (ctx.name) lines.push(`- Player Name: ${ctx.name}`);
  if (ctx.position) lines.push(`- Primary Position: ${ctx.position}`);
  if (ctx.secondaryPosition) lines.push(`- Secondary Position: ${ctx.secondaryPosition}`);
  if (ctx.preferredFoot) lines.push(`- Preferred Foot: ${ctx.preferredFoot}`);
  if (ctx.age) lines.push(`- Age: ${ctx.age} years old`);
  if (ctx.heightCm) lines.push(`- Height: ${ctx.heightCm} cm`);
  if (ctx.weightKg) lines.push(`- Weight: ${ctx.weightKg} kg`);
  if (ctx.organization) lines.push(`- Current Club / Academy: ${ctx.organization}`);
  if (ctx.country || ctx.city) lines.push(`- Location: ${[ctx.city, ctx.country].filter(Boolean).join(', ')}`);
  if (ctx.profileCompletion) lines.push(`- Profile Completion: ${ctx.profileCompletion}%`);
  if (ctx.skills && Object.keys(ctx.skills).length > 0) {
    const skillsList = Object.entries(ctx.skills).filter(([, v]) => Boolean(v)).map(([k, v]) => `${k}: ${v}`).join(', ');
    if (skillsList) lines.push(`- Known Attributes: ${skillsList}`);
  }
  if (ctx.recentOpportunities?.length) {
    const opps = ctx.recentOpportunities.map((o) => `* ${o.title} (${[o.city, o.country].filter(Boolean).join(', ')})`).join('\n');
    lines.push(`- Available Platform Opportunities:\n${opps}`);
  }
  return lines.length > 0 ? lines.join('\n') : 'No specific profile facts recorded yet.';
}

function generateCoachFallback(
  message: string,
  ctx: import('@/lib/nisr/player-context').NisrPlayerContext,
  locale: Locale,
): string {
  const pName = ctx.name || (locale === 'ar' ? 'البطل' : 'Champion');
  const pos = ctx.position || (locale === 'ar' ? 'لاعب كرة قدم' : 'Football Player');
  const lowerMsg = (message || '').toLowerCase();

  if (locale === 'ar') {
    if (lowerMsg.includes('غذا') || lowerMsg.includes('اكل') || lowerMsg.includes('وجب') || lowerMsg.includes('وزن') || lowerMsg.includes('دايت')) {
      return `أهلاً كابتن ${pName}، بصفتك ${pos}، خطتك الغذائية هي أساس أدائك العالي:\n` +
        `• قبل التمرين (بـ 3 ساعات): وجبة غنية بالكربوهيدرات المعقدة (أرز مسلوق، بطاطا، أو شوفان) مع بروتين خفيف قليل الدهون.\n` +
        `• بعد التمرين (خلال 45 دقيقة): بروتين عالي الجودة (صدور دجاج، تونة، أو بيض) لترميم العضلات مع شرب كمية وفيرة من الماء.\n` +
        `• الترطيب: حافظ على شرب 3 لترات ماء يومياً وتجنب السكريات والمقليات لتبقى دائماً في قمة رشاقتك وخفتك بالملعب!`;
    }
    if (lowerMsg.includes('سرع') || lowerMsg.includes('سبرنت') || lowerMsg.includes('انطلاق')) {
      return `أهلاً كابتن ${pName}، لتطوير سرعتك وانطلاقتك كـ ${pos}، التزم بهذا البرنامج الأسبوعي:\n` +
        `1. تدريبات البليومتريكس (Plyometrics): قفز الحواجز المنخفضة والقفز الانفجاري على الصندوق (Box Jumps) مرتين أسبوعياً.\n` +
        `2. سبرنتات متدرجة: 6 انطلاقات لمسافة 25 متراً بأقصى سرعة مع راحة 60 ثانية بين كل تكرار.\n` +
        `3. سلم الرشاقة (Agility Ladder): لتحسين توافق القدمين وسرعة رد الفعل وتغيير الاتجاه.`;
    }
    if (lowerMsg.includes('مهار') || lowerMsg.includes('مراوغ') || lowerMsg.includes('كنترول') || lowerMsg.includes('تمرير')) {
      return `أهلاً كابتن ${pName}، صقل المهارة الفردية لـ ${pos} يتطلب تركيزاً وتكراراً يومياً:\n` +
        `• تدريب الحائط (Wall Passing): 15 دقيقة يومياً بكلتا القدمين للمسة أولى متقنة وسريعة تحت الضغط.\n` +
        `• المراوغة في المساحات الضيقة: تدرب بين الأقماع وركّز على تغيير الإيقاع المفاجئ بين البطء والانفجار.\n` +
        `• مسح الملعب (Scanning): عوّد عينيك على النظر للأمام ورفع الرأس قبل استلام الكرة لاتخاذ القرار الأفضل.`;
    }
    return `أهلاً كابتن ${pName}، يسعدني دائماً مساعدتك في تطوير مستواك في مركز ${pos}:\n` +
      `• ابدأ دائماً بإحماء ديناميكي 10 دقائق لتجهيز العضلات وتجنب أي إصابات مفاجئة.\n` +
      `• ركز على تدريبات التمركز والضغط العالي لتكون جاهزاً لكل سيناريوهات المباريات.\n` +
      `• حافظ على النوم الكافي (8 ساعات) والالتزام، وسأكون معك خطوة بخطوة للوصول لأعلى جاهزية فنية وبدنية!`;
  }

  return `Hello Captain ${pName}! As a ${pos}, here is my tactical recommendation for you:\n` +
    `• Consistency in training, dynamic warm-ups, and active recovery are the keys to elite performance.\n` +
    `• Focus on high-intensity interval drills and first-touch precision tailored to your position.\n` +
    `• Keep up the dedication, and let me know if you need specific drills or nutrition tips!`;
}

function extractAnswer(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const obj = payload as Record<string, unknown>;

  // 1. Interactions API format
  const steps = obj.steps;
  if (Array.isArray(steps)) {
    const text = steps
      .filter((step) => step?.type === 'model_output' && Array.isArray(step.content))
      .flatMap((step) => step.content)
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join('\n')
      .slice(0, 4000);
    if (text) return text;
  }

  // 2. generateContent API format
  const candidates = obj.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const candidate = candidates[0] as Record<string, unknown>;
    const content = candidate.content as Record<string, unknown> | undefined;
    const parts = content?.parts;
    if (Array.isArray(parts)) {
      return parts
        .map((p) => (typeof p?.text === 'string' ? p.text.trim() : ''))
        .filter(Boolean)
        .join('\n')
        .slice(0, 4000);
    }
  }

  return '';
}

function failure(code: string, status: number) {
  return NextResponse.json(
    { code, error: 'NISR is unavailable for this request.' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  const userId = authorization.ok ? authorization.user.id : null;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return failure('NISR_EMPTY_REQUEST', 400);
    }
  } catch {
    return failure('NISR_EMPTY_REQUEST', 400);
  }

  const locale: Locale = supportedLocales.has(body.locale as string)
    ? body.locale as Locale
    : 'ar';
  const message = cleanText(body.message);
  const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
  const hasAudio = audioBase64.length > 0;
  if ((!message && !hasAudio) || message.length > MAX_MESSAGE_LENGTH) {
    return failure('NISR_EMPTY_REQUEST', 400);
  }
  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    return failure('NISR_AUDIO_TOO_LARGE', 413);
  }
  if (hasAudio && (
    body.audioMimeType !== 'audio/l16' || body.audioSampleRate !== 16000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64)
  )) {
    return failure('NISR_INVALID_AUDIO', 400);
  }

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const rateKey = userId ? `nisr:${userId}` : `nisr:guest:${clientIp}`;
  const rate = rateLimiter.check(rateKey, {
    windowMs: 60_000,
    max: 10,
    minIntervalMs: 500,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { code: 'NISR_RATE_LIMITED', error: 'Please try again shortly.' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return failure('NISR_NOT_CONFIGURED', 503);

  try {
    let playerContext: import('@/lib/nisr/player-context').NisrPlayerContext;
    if (userId) {
      try {
        playerContext = await loadNisrPlayerContext(userId, locale);
      } catch {
        playerContext = {
          name: authorization.user?.user_metadata?.full_name || authorization.user?.user_metadata?.name || 'كابتن الحلم',
          position: 'لاعب كرة قدم',
          secondaryPosition: '',
          preferredFoot: '',
          heightCm: '',
          weightKg: '',
          country: '',
          city: '',
          contractStatus: '',
          organization: '',
          profileCompletion: 40,
          skills: {},
          recentOpportunities: [],
        };
      }
    } else {
      playerContext = {
        name: 'كابتن الحلم',
        position: 'لاعب كرة قدم',
        secondaryPosition: '',
        preferredFoot: '',
        heightCm: '',
        weightKg: '',
        country: '',
        city: '',
        contractStatus: '',
        organization: '',
        profileCompletion: 40,
        skills: {},
        recentOpportunities: [],
      };
    }

    if (playerContext.name) {
      playerContext.name = playerContext.name.replace(/^(كابتن|captain)\s+/i, '').trim() || 'الحلم';
    }

    const sysInstruction = buildSystemInstruction(locale);

    let promptText = '';
    if (hasAudio && !message) {
      promptText = `[Voice Note from Player]:\nThe player sent an audio recording. Listen to the audio and respond according to your instructions. If the audio is unclear, background noise, or unintelligible, politely inform the player that the audio wasn't clear and ask them to repeat or type their question in ${locale.toUpperCase()}.\n\n[Player Profile & Tactical Facts]:\n${formatPlayerSummary(playerContext)}`;
    } else if (hasAudio && message) {
      promptText = `[Voice Note and Text]:\nThe player attached an audio note with the following text: "${message}". Respond in ${locale.toUpperCase()}.\n\n[Player Profile & Tactical Facts]:\n${formatPlayerSummary(playerContext)}`;
    } else {
      promptText = `[Player Question/Request]:\n${message}\n\n[Player Profile & Tactical Facts]:\n${formatPlayerSummary(playerContext)}`;
    }

    const parts: Array<Record<string, unknown>> = [{ text: promptText }];
    if (hasAudio) {
      parts.push({
        inline_data: {
          mime_type: 'audio/l16',
          data: audioBase64,
        },
      });
    }

    const configuredModel = process.env.GEMINI_NISR_MODEL?.trim();
    const candidateModels = Array.from(new Set([
      ...(configuredModel ? [configuredModel] : []),
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ]));

    let answer = '';

    for (const candModel of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6_000);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${candModel}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: sysInstruction }] },
            contents: [{ role: 'user', parts }],
            generationConfig: {
              maxOutputTokens: 600,
              temperature: 0.7,
            },
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const json = await res.json();
          answer = extractAnswer(json);
          if (answer) break;
        } else {
          console.warn(`[nisr] Model ${candModel} returned ${res.status}, trying next fallback...`);
        }
      } catch (err) {
        console.warn(`[nisr] Model ${candModel} error:`, err instanceof Error ? err.message : err);
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!answer) {
      answer = generateCoachFallback(message, playerContext, locale);
    }

    let audioBase64Reply: string | undefined;
    // Generate voice speech whenever user sends voice OR explicitly requests audio
    if (hasAudio || body.wantAudio === true) {
      try {
        const ttsModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
        for (const ttsModel of ttsModels) {
          const ttsController = new AbortController();
          const ttsTimeout = setTimeout(() => ttsController.abort(), 6_000);
          try {
            const ttsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify({
                contents: [{ parts: [{ text: answer.slice(0, 450) }] }],
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                },
              }),
              signal: ttsController.signal,
            });
            clearTimeout(ttsTimeout);

            if (ttsRes.ok) {
              const ttsData = await ttsRes.json();
              const inlineAudio = ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData;
              if (inlineAudio?.data) {
                if (inlineAudio.mimeType && inlineAudio.mimeType.toLowerCase().includes('wav')) {
                  audioBase64Reply = inlineAudio.data;
                } else {
                  const pcmBuf = Buffer.from(inlineAudio.data, 'base64');
                  const header = Buffer.alloc(44);
                  header.write('RIFF', 0);
                  header.writeUInt32LE(36 + pcmBuf.length, 4);
                  header.write('WAVE', 8);
                  header.write('fmt ', 12);
                  header.writeUInt32LE(16, 16);
                  header.writeUInt16LE(1, 20); // PCM
                  header.writeUInt16LE(1, 22); // mono
                  header.writeUInt32LE(24000, 24); // 24kHz
                  header.writeUInt32LE(48000, 28); // byte rate (24000 * 1 * 2)
                  header.writeUInt16LE(2, 32); // block align
                  header.writeUInt16LE(16, 34); // bits per sample
                  header.write('data', 36);
                  header.writeUInt32LE(pcmBuf.length, 40);
                  audioBase64Reply = Buffer.concat([header, pcmBuf]).toString('base64');
                }
                break;
              }
            } else {
              console.warn(`[nisr] TTS model ${ttsModel} returned status:`, ttsRes.status);
            }
          } catch (innerErr) {
            console.warn(`[nisr] TTS model ${ttsModel} failed:`, innerErr instanceof Error ? innerErr.message : innerErr);
          } finally {
            clearTimeout(ttsTimeout);
          }
        }
      } catch (e) {
        console.warn('[nisr] TTS generation non-critical error:', e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json(
      { title: titles[locale], answer, audioBase64: audioBase64Reply, mode: 'ai' },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    if (error instanceof NisrContextError) {
      return failure(error.code, error.code === 'NISR_NOT_CONFIGURED' ? 503 : 403);
    }
    console.error('[nisr] provider request failed:', error instanceof Error ? error.name : 'unknown');
    return failure('NISR_UPSTREAM_UNAVAILABLE', 502);
  }
}
