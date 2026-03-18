import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ success: false, error: 'Admin DB not available' }, { status: 503 });
    const db = adminDb as any;
    const docSnap = await db.collection('system_configs').doc('chataman_config').get() as any;

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Config not found' });
    }

    const config = docSnap.data();
    if (!config || !config.apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is missing' });
    }

    const apiKey = config.apiKey.trim();
    const cleanBaseUrl = (config.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '');

    const payloadTemplate = {
      phone: "+201026567954", // A valid dummy or just real number if not sent
      template: {
        name: "our_website",
        language: { code: "ar" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "اختبار" }
            ]
          }
        ]
      }
    };

    const endpoints = [
      '/api/send/template',
      '/api/send-template',
      '/api/v1/send-template'
    ];

    const results: any[] = [];

    for (const endpoint of endpoints) {
      const targetUrl = `${cleanBaseUrl}${endpoint}`;
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payloadTemplate)
        });

        const text = await response.text();
        results.push({
          endpoint: targetUrl,
          statusCode: response.status,
          responseText: text
        });
      } catch (e: any) {
        results.push({
          endpoint: targetUrl,
          statusCode: 'error',
          responseText: e.message
        });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
