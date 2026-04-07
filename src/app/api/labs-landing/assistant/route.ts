import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const platformContext = `
EL7LM is a Qatar-based company operating under Mesk LLC.
EL7LM presents a digital sports ecosystem that combines:
1. EL7LM for talent discovery and professional athlete presentation.
2. VLab Sports for advanced and real-time video analysis that supports technical review and decision-making.
3. Hagzz for booking, attendance, and sports service operations, especially for academies and sports centers in Qatar and Egypt.

The landing page assistant must only answer questions related to:
- EL7LM
- VLab Sports
- Hagzz
- talent discovery
- athlete development opportunities
- technical video analysis
- academy operations
- sports bookings
- partnerships, demos, and institutional inquiries

If the user asks about topics outside these areas, politely redirect them to the relevant sports ecosystem scope and suggest contacting the team for tailored support.
Never invent contracts, prices, partnerships, countries, or guaranteed outcomes.
Keep answers concise, clear, and commercially appropriate.
`;

function buildSystemPrompt(lang: 'ar' | 'en') {
  if (lang === 'ar') {
    return `
أنت مساعد رقمي رسمي خاص بمنظومة EL7LM.

${platformContext}

قواعد الرد:
- اكتب بالعربية الفصحى الواضحة.
- تحدث فقط عن خدمات EL7LM وVLab Sports وHagzz وما يرتبط بها.
- لا تدّع معلومات غير مؤكدة.
- لا تعط وعودًا قطعية مثل ضمان الاحتراف أو التعاقد.
- إذا كان السؤال خارج النطاق، وضّح ذلك بلطف ثم وجّه المستخدم إلى التواصل مع الفريق.
- اجعل الرد من 2 إلى 5 جمل غالبًا.
- إن أمكن، اختم بسطر قصير يدعو إلى طلب عرض توضيحي أو التواصل.
`;
  }

  return `
You are the official digital assistant for the EL7LM ecosystem.

${platformContext}

Response rules:
- Reply in clear professional English.
- Only discuss EL7LM, VLab Sports, Hagzz, and closely related ecosystem use cases.
- Do not invent pricing, guarantees, partnerships, or unsupported facts.
- Do not promise outcomes such as guaranteed contracts or professional opportunities.
- If the question is out of scope, politely redirect the user to the relevant ecosystem services and recommend contacting the team.
- Keep answers concise, usually 2 to 5 sentences.
- When appropriate, end with a short call to request a demo or contact the team.
`;
}

function fallbackReply(prompt: string, lang: 'ar' | 'en') {
  const normalized = prompt.toLowerCase();

  if (lang === 'ar') {
    if (normalized.includes('تحليل') || normalized.includes('فيديو')) {
      return {
        title: 'مسار مقترح عبر VLab Sports',
        answer:
          'يمكن توجيه هذا الاحتياج إلى VLab Sports، حيث تدعم الخدمة تحليل الفيديو بصورة تساعد الأجهزة الفنية والكشفية على فهم الأداء واتخاذ القرار بصورة أسرع. يمكنكم طلب عرض توضيحي لتحديد آلية الاستخدام المناسبة.',
      };
    }

    if (normalized.includes('حجز') || normalized.includes('حضور') || normalized.includes('أكاديمية')) {
      return {
        title: 'مسار مقترح عبر Hagzz',
        answer:
          'يمكن معالجة هذا النوع من الاحتياج عبر Hagzz، إذ يوفر إطارًا منظمًا لإدارة الحجز والخدمات الرياضية والحضور بما يتناسب مع الأكاديميات والمراكز الرياضية. يمكن للفريق توضيح السيناريو الأنسب حسب طبيعة التشغيل.',
      };
    }

    return {
      title: 'مسار مقترح عبر EL7LM',
      answer:
        'يمكن أن تدعم EL7LM هذا النوع من الاحتياج من خلال تقديم الملف الرياضي بصورة أكثر احترافية وربطه بالمسار الأنسب داخل المنظومة. لمزيد من الدقة، يمكنكم مشاركة الهدف المطلوب وسيقوم الفريق بتوجيهكم إلى الخدمة المناسبة.',
    };
  }

  if (normalized.includes('analysis') || normalized.includes('video')) {
    return {
      title: 'Suggested route through VLab Sports',
      answer:
        'This type of need can typically be addressed through VLab Sports, which supports faster video review and clearer technical insight for evaluation and decision-making. A tailored demo can help identify the best workflow.',
    };
  }

  if (
    normalized.includes('booking') ||
    normalized.includes('attendance') ||
    normalized.includes('academy')
  ) {
    return {
      title: 'Suggested route through Hagzz',
      answer:
        'This need is typically aligned with Hagzz, which supports booking, attendance, and sports service operations for academies and sports centers. The team can recommend the most suitable setup based on your operating model.',
    };
  }

  return {
    title: 'Suggested route through EL7LM',
    answer:
      'This request can usually begin through EL7LM by structuring the sports profile and connecting the user to the most relevant path within the ecosystem. Share your objective and the team can guide you toward the right service.',
  };
}

export async function POST(request: NextRequest) {
  let lang: 'ar' | 'en' = 'ar';
  let prompt = '';

  try {
    const body = await request.json();
    prompt = String(body?.prompt || '').trim();
    lang = body?.lang === 'en' ? 'en' : 'ar';

    if (!prompt) {
      return NextResponse.json(
        { error: lang === 'ar' ? 'يرجى إدخال الطلب أولًا.' : 'Please enter a prompt first.' },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(fallbackReply(prompt, lang));
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 350,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(lang),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json(fallbackReply(prompt, lang));
    }

    return NextResponse.json({
      title: lang === 'ar' ? 'رد مخصص من EL7LM Assistant' : 'Tailored response from EL7LM Assistant',
      answer,
    });
  } catch (error) {
    console.error('[labs-landing-assistant] error', error);

    const fallback = fallbackReply(prompt, lang);
    return NextResponse.json(
      {
        title: fallback.title,
        answer: fallback.answer,
      },
      { status: 200 }
    );
  }
}
