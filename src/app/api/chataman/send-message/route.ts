import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { payload, apiKey, baseUrl } = await req.json();

    if (!payload || !apiKey || !baseUrl) {
      return NextResponse.json({ success: false, error: 'Missing required parameters: payload, apiKey, or baseUrl' }, { status: 400 });
    }

    const targetUrl = `${baseUrl}/api/send`;

    console.log(`[Proxy-Message] Forwarding to: ${targetUrl}`);
    console.log(`[Proxy-Message] Payload:`, JSON.stringify(payload, null, 2));

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
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      console.log(`[Proxy-Message] Raw text response from ChatAman:`, text);
      data = { success: response.ok, message: text || 'Empty response from provider' };
    }
    
    console.log(`[Proxy-Message] Response from ChatAman:`, JSON.stringify(data, null, 2));

    if (!response.ok || data.status === 'error' || data.success === false) {
      return NextResponse.json({ 
        success: false, 
        message: data.message || 'Failed to send message through provider', 
        error: data 
      }, { status: response.ok ? 400 : response.status });
    }

    return NextResponse.json({ success: true, data: data });

  } catch (error: any) {
    console.error('ChatAman Messenger Proxy Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
