import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, target } = await request.json();

    if (!text || !target) {
      return NextResponse.json(
        { error: 'Missing text or target language parameter' },
        { status: 400 }
      );
    }

    // Target translation languages supported
    const supportedTargets = ['ar', 'en', 'es', 'pt'];
    if (!supportedTargets.includes(target)) {
      return NextResponse.json(
        { error: `Unsupported target language: ${target}` },
        { status: 400 }
      );
    }

    // Free keyless Google Translate API call
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // cache translation results for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Google Translate response status: ${response.status}`);
    }

    const data = await response.json();
    let translatedText = '';

    // Google Translate returns format: [[["translated", "original", ...]]]
    if (data && data[0] && Array.isArray(data[0])) {
      translatedText = data[0].map((sentence: any) => sentence[0]).join('');
    } else {
      translatedText = text; // fallback to original
    }

    return NextResponse.json({ translatedText });
  } catch (error: any) {
    console.error('Translation API error:', error.message);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}
