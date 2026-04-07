import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const { data: cfgRows } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);

    if (!cfgRows?.length) {
      return NextResponse.json({ success: false, error: 'Config not found' });
    }

    const config = cfgRows[0] as Record<string, unknown>;
    if (!config || !config.apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is missing' });
    }

    const apiKey = String(config.apiKey).trim();
    const cleanBaseUrl = String(config.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '');

    const payloadTemplate = {
      phone: "+201026567954",
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

    const results: Record<string, unknown>[] = [];

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
      } catch (e: unknown) {
        results.push({
          endpoint: targetUrl,
          statusCode: 'error',
          responseText: e instanceof Error ? e.message : 'Unknown'
        });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
