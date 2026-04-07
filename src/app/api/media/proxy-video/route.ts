import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const R2_BASE = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://assets.el7lm.com';

const ALLOWED = [
    'assets.el7lm.com',
    'el7lm.com',
    'r2.dev',
    'cloudflarestorage.com',
    'supabase.co/storage',
    'pub-',
];

export async function GET(req: NextRequest) {
    let url = req.nextUrl.searchParams.get('url') || '';
    if (!url) return new NextResponse('url required', { status: 400 });

    // مسار نسبي → Cloudflare R2
    if (!url.startsWith('http')) {
        url = `${R2_BASE}/${url.replace(/^\//, '')}`;
    }

    if (!ALLOWED.some(d => url.includes(d))) {
        return new NextResponse('forbidden', { status: 403 });
    }

    try {
        const range = req.headers.get('range');
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0',
        };
        if (range) headers['Range'] = range;

        const res = await fetch(url, {
            headers,
            // @ts-ignore
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok && res.status !== 206) {
            return new NextResponse(`error: ${res.status}`, { status: res.status });
        }

        const out: Record<string, string> = {
            'Content-Type': res.headers.get('content-type') || 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        };
        const cl = res.headers.get('content-length');
        const cr = res.headers.get('content-range');
        if (cl) out['Content-Length'] = cl;
        if (cr)  out['Content-Range']  = cr;

        return new NextResponse(res.body, { status: res.status, headers: out });
    } catch (e: any) {
        return new NextResponse(e.message || 'error', { status: 500 });
    }
}
