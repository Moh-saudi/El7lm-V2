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

function pcmToWavBuffer(pcmBuf: Buffer, sampleRate = 16000, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuf.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22); // Channels (mono)
  header.writeUInt32LE(sampleRate, 24); // Sample rate (16kHz)
  header.writeUInt32LE(sampleRate * channels * 2, 28); // Byte rate
  header.writeUInt16LE(channels * 2, 32); // Block align
  header.writeUInt16LE(16, 34); // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcmBuf.length, 40);
  return Buffer.concat([header, pcmBuf]);
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

  return `You are "NISR" (نسر), an elite AI Football Mentor, Tactical Analyst, and Comprehensive Football Encyclopedia on the EL7LM (الحلم) sports platform.
You are the player's personal companion, technical scout, and dedicated mentor on their journey toward their ultimate dream of global professional stardom (الاحتراف العالمي).

Strict Rules:
1. Target Language: You MUST reply strictly in ${current.langName}. Under NO circumstances reply in any other language unless explicitly requested by the player.
2. Respectful Coach Greeting: Always open your reply addressing the player respectfully: "${current.greeting}".
3. Audio Recording & Clarity (CRITICAL):
   - When an audio recording is sent, listen to it carefully.
   - If the audio is silence, static noise, corrupted, background chatter, or unintelligible words:
     DO NOT GUESS or make up a random training or diet plan!
     Instead, immediately reply stating that the audio was not clear:
     "${current.audioUnclear}"
4. Deep Player Profile Integration:
   - You have intimate access to the player's full athletic profile: primary/secondary position, preferred foot, physical stats, match goals, assists, matches played, medical conditions/injuries, and career ambitions/target clubs.
   - Tailor your coaching, drills, tactical tips, and words of encouragement directly to their specific stats, career goals, and medical conditions (protecting them from injury flare-ups).
5. Comprehensive Football & Match Fixtures Knowledge:
   - You are a passionate football expert and encyclopedic authority on world and Arab football (Egyptian Premier League الدوري المصري الممتاز, Saudi Pro League دوري روشن, European leagues, UEFA Champions League, CAF Champions League, international tournaments).
   - When the player asks about football matches, upcoming rounds, Egyptian League clashes, derbies, or football schedules:
     * NEVER dodge, deflect, or say "my only focus is your personal fitness" or "check daily TV guides".
     * Provide direct, enthusiastic, and knowledgeable answers immediately! Share major team clashes (Al Ahly, Zamalek, Pyramids, Al Hilal, Al Nassr, etc.), current season gameweek details, and major broadcasting channels (OnTime Sports أون تايم سبورتس, SSC, beIN Sports).
     * Connect the match to their development (e.g., recommend observing how top fullbacks/wingers position themselves).
6. Platform Tournaments & Scouting Opportunities:
   - When the player asks about tournaments (البطولات), scouting trials (الاختبارات), or opportunities (الفرص):
     * Directly recommend the active tournaments and opportunities available on the platform from the list below.
     * Highlight key details: tournament name, city/venue, start date, whether it is free or paid, and direct them to visit the "البطولات" or "الفرص" screen in the app to register.
7. Administration & Customer Support Inquiries:
   - If the player asks about contacting administration, management, technical support, or making an inquiry/complaint (التواصل مع الإدارة / الدعم الفني):
     * Inform them that the El7lm administration is always available to help.
     * Direct contact email: support@el7lm.com
     * In-App: From the side menu ☰, choose "تواصل معنا" (Contact Us) or WhatsApp support.
8. Short & Direct Responses: Keep your answers CONCISE, energetic, and focused (3 to 5 sentences or 3 brief practical bullet points). Do not write lengthy generic essays.
9. Professional Football Passion: Speak like a real elite European/Arab football coach and scout. NEVER mention JSON, databases, code variables, or system IDs.`;
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
    if (skillsList) lines.push(`- Physical & Technical Attributes: ${skillsList}`);
  }
  if (ctx.careerStats && (ctx.careerStats.goals || ctx.careerStats.assists || ctx.careerStats.matchesPlayed)) {
    const stats: string[] = [];
    if (ctx.careerStats.matchesPlayed) stats.push(`Matches: ${ctx.careerStats.matchesPlayed}`);
    if (ctx.careerStats.goals) stats.push(`Goals: ${ctx.careerStats.goals}`);
    if (ctx.careerStats.assists) stats.push(`Assists: ${ctx.careerStats.assists}`);
    if (stats.length) lines.push(`- Match Record & Performance: ${stats.join(' | ')}`);
  }
  if (ctx.medicalHistory) {
    lines.push(`- Medical History & Health Conditions: ${ctx.medicalHistory} (CRITICAL: Guide drills to prevent re-injury)`);
  }
  if (ctx.dreamClub) {
    lines.push(`- Target / Dream Club: ${ctx.dreamClub}`);
  }
  if (ctx.careerGoals) {
    lines.push(`- Ambitions & Professional Aspirations: ${ctx.careerGoals}`);
  }
  if (ctx.bio) {
    lines.push(`- Player Biography: ${ctx.bio}`);
  }
  if (ctx.recentOpportunities?.length) {
    const opps = ctx.recentOpportunities.map((o) => `* ${o.title} (${[o.city, o.country].filter(Boolean).join(', ')})`).join('\n');
    lines.push(`- Available Platform Opportunities (فرص المنصة الحالية):\n${opps}`);
  }
  if (ctx.recentTournaments?.length) {
    const tourneys = ctx.recentTournaments.map((t) => `* ${t.name} (${t.location || t.country || 'مصر'}) - Starts: ${t.startDate || 'قريباً'} - Fee: ${t.entryFee === 0 ? 'مجانية (Free)' : `${t.entryFee} ${t.currency}`}`).join('\n');
    lines.push(`- Available Platform Tournaments (بطولات المنصة الحالية):\n${tourneys}`);
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
    if (lowerMsg.includes('بطول') || lowerMsg.includes('مسابق')) {
      if (ctx.recentTournaments?.length) {
        const list = ctx.recentTournaments.map((t) => `• ${t.name} (${t.location || 'مصر'}) - تبدأ: ${t.startDate || 'قريباً'} [${t.entryFee === 0 ? 'مجانية' : `${t.entryFee} ${t.currency}`}]`).join('\n');
        return `أهلاً كابتن ${pName}، لدينا حالياً بطولات كروية قوية على منصة الحلم:\n${list}\n\nيمكنك الانتقال إلى شاشة "البطولات" في التطبيق لاستعراض التفاصيل والتسجيل فوراً!`;
      }
      return `أهلاً كابتن ${pName}، تقام على منصة الحلم بطولات دورية واختبارات لاكتشاف المواهب. يمكنك متابعة جدول البطولات المتاحة والتسجيل مباشرة من شاشة "البطولات" في القائمة الرئيسية!`;
    }
    if (lowerMsg.includes('فرص') || lowerMsg.includes('اختبار') || lowerMsg.includes('كشاف')) {
      if (ctx.recentOpportunities?.length) {
        const list = ctx.recentOpportunities.map((o) => `• ${o.title} (${[o.city, o.country].filter(Boolean).join(', ')})`).join('\n');
        return `أهلاً كابتن ${pName}، هذه أبرز الفرص الاستكشافية المتاحة حالياً على المنصة:\n${list}\n\nتفضل بزيارة شاشة "الفرص" للتقديم وعرض ملفك الرياضي على الكشافين!`;
      }
      return `أهلاً كابتن ${pName}، شاشة "الفرص" تضم أحدث معايشات الأندية واختبارات الكشافين. احرص على إكمال بيانات ملفك الشخصي لزيادة فرص ترشيحك للأندية والكشافين!`;
    }
    if (lowerMsg.includes('تواصل') || lowerMsg.includes('إدار') || lowerMsg.includes('دعم') || lowerMsg.includes('مساعد') || lowerMsg.includes('شكو')) {
      return `أهلاً كابتن ${pName}، يسعد فريق إدارة منصة "الحلم" دائماً بخدمتك:\n` +
        `• البريد الرسمي للإدارة والدعم الفني: support@el7lm.com\n` +
        `• عبر التطبيق: افتح القائمة الجانبية (☰) ثم اضغط على "تواصل معنا" أو زر الدعم المباشر عبر واتساب.\n` +
        `فريق الإدارة يتابع جميع طلبات اللاعبين ويجيبك في أسرع وقت!`;
    }
    if (lowerMsg.includes('مبار') || lowerMsg.includes('ماتش') || lowerMsg.includes('دوري') || lowerMsg.includes('جدول')) {
      return `أهلاً كابتن ${pName}، مباريات الدوري المصري الممتاز والبطولات الكبرى تُنقل مباشرة عبر قنوات أون تايم سبورتس (OnTime Sports) وSSC.\n` +
        `أنصحك دائماً بمتابعة مواجهات الفرق الكبرى والتركيز على تحركات وتحولات اللاعبين في مركزك كـ ${pos} للتعلم من قراراتهم التكتيكية في التمركز والتغطية!`;
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
  const totalStartTime = performance.now();

  const authStartTime = performance.now();
  const authorization = await authorizeUser(request);
  const authDurationMs = Math.round(performance.now() - authStartTime);
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
  const rawAudioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
  const audioBase64 = rawAudioBase64.replace(/\s+/g, '');
  const hasAudio = audioBase64.length > 0;
  if ((!message && !hasAudio) || message.length > MAX_MESSAGE_LENGTH) {
    return failure('NISR_EMPTY_REQUEST', 400);
  }
  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    return failure('NISR_AUDIO_TOO_LARGE', 413);
  }
  if (hasAudio && (
    (body.audioMimeType !== 'audio/l16' && body.audioMimeType !== 'audio/wav') ||
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
    const contextStartTime = performance.now();
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
          recentTournaments: [],
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
        recentTournaments: [],
      };
    }
    const contextDurationMs = Math.round(performance.now() - contextStartTime);

    if (playerContext.name) {
      playerContext.name = playerContext.name.replace(/^(كابتن|captain)\s+/i, '').trim() || 'الحلم';
    }

    const sysInstruction = buildSystemInstruction(locale);

    const now = new Date();
    const currentDateContext = `[Current Real-Time Context]:\nToday's Date: ${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${now.toISOString().split('T')[0]}). Football Season: 2026/2027.\n`;

    let promptText = '';
    if (hasAudio && !message) {
      promptText = `${currentDateContext}[Voice Note from Player]:\nThe player sent an audio recording. Listen to the audio and respond according to your instructions. If the audio is unclear, background noise, or unintelligible, politely inform the player that the audio wasn't clear and ask them to repeat or type their question in ${locale.toUpperCase()}.\n\n[Player Profile & Tactical Facts]:\n${formatPlayerSummary(playerContext)}`;
    } else if (hasAudio && message) {
      promptText = `${currentDateContext}[Voice Note and Text]:\nThe player attached an audio note with the following text: "${message}". Respond in ${locale.toUpperCase()}.\n\n[Player Profile & Tactical Facts]:\n${formatPlayerSummary(playerContext)}`;
    } else {
      promptText = `${currentDateContext}[Player Question/Request]:\n${message}\n\n[Player Profile & Tactical Facts]:\n${formatPlayerSummary(playerContext)}`;
    }

    const parts: Array<Record<string, unknown>> = [{ text: promptText }];
    if (hasAudio) {
      let finalAudioBase64 = audioBase64;
      let mimeType = 'audio/wav';

      if (body.audioMimeType === 'audio/l16') {
        const pcmBuf = Buffer.from(audioBase64, 'base64');
        const wavBuf = pcmToWavBuffer(pcmBuf, 16000, 1);
        finalAudioBase64 = wavBuf.toString('base64');
      } else if (typeof body.audioMimeType === 'string' && body.audioMimeType.includes('wav')) {
        mimeType = 'audio/wav';
      } else {
        mimeType = (body.audioMimeType as string) || 'audio/wav';
      }

      parts.push({
        inlineData: {
          mimeType,
          data: finalAudioBase64,
        },
      });
    }

    const configuredModel = process.env.GEMINI_NISR_MODEL?.trim();
    const candidateModels = Array.from(new Set([
      ...(configuredModel ? [configuredModel] : []),
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
    ]));

    let answer = '';
    let successfulModel: string | null = null;
    let failedAttempts = 0;
    const geminiStartTime = performance.now();

    for (const candModel of candidateModels) {
      // 1. Google Search Grounding is strictly opt-in (requires a paid billing account)
      // When false/unset, Nisr runs 100% free with lightning-fast native football intelligence
      if (!hasAudio && process.env.GEMINI_ENABLE_SEARCH === 'true') {
        const searchController = new AbortController();
        const searchTimeout = setTimeout(() => searchController.abort(), 4_000);
        try {
          const searchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${candModel}:generateContent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: sysInstruction }] },
              contents: [{ role: 'user', parts }],
              tools: [{ googleSearch: {} }],
              generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
              },
            }),
            signal: searchController.signal,
          });

          if (searchRes.ok) {
            const searchJson = await searchRes.json();
            answer = extractAnswer(searchJson);
            if (answer) {
              successfulModel = `${candModel}+search`;
              break;
            }
          }
        } catch {
          // search grounding quota or network issue, proceed to standard generation
        } finally {
          clearTimeout(searchTimeout);
        }
      }

      // 2. Direct standard generation (fast path for voice & fallback)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
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
              maxOutputTokens: 2048,
              temperature: 0.7,
            },
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const json = await res.json();
          answer = extractAnswer(json);
          if (answer) {
            successfulModel = candModel;
            break;
          } else {
            failedAttempts++;
          }
        } else {
          failedAttempts++;
          console.warn(`[nisr] Model ${candModel} returned ${res.status}, trying next fallback...`);
        }
      } catch (err) {
        failedAttempts++;
        console.warn(`[nisr] Model ${candModel} error:`, err instanceof Error ? err.message : err);
      } finally {
        clearTimeout(timeout);
      }
    }
    const geminiDurationMs = Math.round(performance.now() - geminiStartTime);

    const usedLocalFallback = !answer;
    if (!answer) {
      answer = generateCoachFallback(message, playerContext, locale);
    }

    let audioBase64Reply: string | undefined;
    let ttsDurationMs = 0;
    // Generate voice speech whenever user sends voice OR explicitly requests audio
    if (hasAudio || body.wantAudio === true) {
      const ttsStartTime = performance.now();
      try {
        const ttsModels = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
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
      ttsDurationMs = Math.round(performance.now() - ttsStartTime);
    }

    const totalDurationMs = Math.round(performance.now() - totalStartTime);

    // Logging timing metrics to console without affecting behavior or response
    console.log(
      `[nisr-timing] total=${totalDurationMs}ms | auth=${authDurationMs}ms | playerContext=${contextDurationMs}ms | gemini=${geminiDurationMs}ms (model=${successfulModel ?? 'none'}, failedAttempts=${failedAttempts}, localFallback=${usedLocalFallback}) | tts=${ttsDurationMs}ms`
    );

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
