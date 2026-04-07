import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// cache بسيط في الذاكرة لتجنب تكرار الطلبات
const cache = new Map<string, string>();

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    // تحقق من الكاش
    if (cache.has(url)) {
        return NextResponse.json({ thumbnail: cache.get(url) });
    }

    try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const res = await fetch(oembedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) throw new Error(`oEmbed failed: ${res.status}`);

        const data = await res.json();
        const thumbnail = data.thumbnail_url || null;

        if (thumbnail) cache.set(url, thumbnail);

        return NextResponse.json({ thumbnail });
    } catch (e: any) {
        return NextResponse.json({ thumbnail: null, error: e.message }, { status: 200 });
    }
}
