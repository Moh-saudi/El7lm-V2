import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, baseUrl } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing Required API key' }, { status: 400 });
    }

    const cleanBaseUrl = (baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '');
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
