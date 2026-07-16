import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/api/admin-auth';

function getChatAmanBaseUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value || ''));
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

    const { payload, apiKey, baseUrl } = await req.json();

    if (!payload || !apiKey || !baseUrl) {
      return NextResponse.json({ success: false, error: 'Missing required parameters: payload, apiKey, or baseUrl' }, { status: 400 });
    }

    const cleanBaseUrl = getChatAmanBaseUrl(baseUrl);
    if (!cleanBaseUrl) {
      return NextResponse.json({ success: false, error: 'Invalid ChatAman URL' }, { status: 400 });
    }
    const targetUrl = `${cleanBaseUrl}/api/send/template`;

    console.log(`[Proxy] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let data;
    const text = await response.text();
    try {
      if (text) {
        data = JSON.parse(text);
      } else {
        data = { success: response.ok, message: 'Empty response from provider' };
      }
    } catch (e) {
      console.log(`[Proxy] Raw text response from ChatAman:`, text);
      data = { success: response.ok, message: text || 'Invalid JSON response from provider' };
    }
    
    console.log(`[Proxy] Response from ChatAman:`, JSON.stringify(data, null, 2));

    const innerSuccess = data?.data?.success;
    if (!response.ok || data.status === 'error' || data.success === false || innerSuccess === false) {
      return NextResponse.json({
        success: false,
        message: data.message || data?.data?.data?.error?.message || 'Failed to send template through provider',
        error: data
      }, { status: response.ok ? 400 : response.status });
    }

    return NextResponse.json({ success: true, data: data });

  } catch (error: any) {
    console.error('ChatAman Messenger Proxy Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
