import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/api/admin-auth';

function getChatAmanBaseUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value || 'https://chataman.com'));
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'chataman.com' && !url.hostname.endsWith('.chataman.com')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;

    const rawBody = await req.text();
    if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > 64 * 1024) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
    let body: { apiKey?: unknown; baseUrl?: unknown };
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
      body = parsed as { apiKey?: unknown; baseUrl?: unknown };
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed JSON body' }, { status: 400 });
    }
    const { apiKey, baseUrl } = body;

    if (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 4096) {
      return NextResponse.json({ success: false, error: 'Missing Required API key' }, { status: 400 });
    }

    const cleanBaseUrl = getChatAmanBaseUrl(baseUrl);
    if (!cleanBaseUrl) {
      return NextResponse.json({ success: false, error: 'Invalid ChatAman URL' }, { status: 400 });
    }
    const targetUrl = `${cleanBaseUrl}/api/templates?per_page=100`;

    console.log(`[Proxy-GetTemplates] Fetching from: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000),
    });

    let data;
    const text = await response.text();
    try {
      if (text) {
        data = JSON.parse(text);
      } else {
        data = [];
      }
    } catch {
      console.warn('[Proxy-GetTemplates] Provider returned a non-JSON response');
      data = [];
    }

    if (!response.ok) {
       return NextResponse.json({ success: false, error: 'Failed to fetch templates from provider', data: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data: data });

  } catch (error: unknown) {
    console.error('ChatAman GetTemplates Proxy Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
