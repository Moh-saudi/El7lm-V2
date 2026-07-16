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

    const { apiKey, baseUrl } = await req.json();

    if (!apiKey) {
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
      }
    });

    let data;
    const text = await response.text();
    try {
      if (text) {
        data = JSON.parse(text);
      } else {
        data = [];
      }
    } catch (e) {
      console.log(`[Proxy-GetTemplates] Raw text response from ChatAman:`, text);
      data = []; // Fallback empty
    }

    if (!response.ok) {
       return NextResponse.json({ success: false, error: 'Failed to fetch templates from provider', data: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data: data });

  } catch (error: any) {
    console.error('ChatAman GetTemplates Proxy Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
