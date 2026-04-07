import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/chataman/test-video-notification
 * Quick test: send video_notfiation template directly to a phone
 * Body: { phone, playerName, viewerName, apiKey?, baseUrl? }
 * If apiKey is omitted, reads from Supabase system_configs/chataman_config
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, playerName, viewerName, apiKey: bodyApiKey, baseUrl: bodyBaseUrl } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });
    }

    // Use provided apiKey or read from Supabase
    let apiKey = bodyApiKey;
    let baseUrl = bodyBaseUrl || 'https://chataman.com';

    if (!apiKey) {
      const db = getSupabaseAdmin();
      const { data: cfgRows } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);
      if (!cfgRows?.length) {
        return NextResponse.json({ success: false, error: 'ChatAman config not found' }, { status: 400 });
      }
      const cfg = cfgRows[0] as Record<string, unknown>;
      apiKey = cfg.apiKey;
      baseUrl = String(cfg.baseUrl || baseUrl);
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'apiKey missing in config' }, { status: 400 });
      }
    }

    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
    else if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = `966${cleaned.substring(1)}`;
    else if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.substring(1);
    const formattedPhone = `+${cleaned}`;

    const payload = {
      phone: formattedPhone,
      template: {
        name: 'video_notfiation',
        language: { code: 'ar' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: playerName || 'اللاعب' },
            { type: 'text', text: viewerName || 'زائر' },
          ],
        }],
      },
    };

    const cleanBaseUrl = String(baseUrl).trim().replace(/\/+$/, '');
    const targetUrl = `${cleanBaseUrl}/api/send/template`;

    console.log(`[test-video-notification] → ${targetUrl}`);
    console.log(`[test-video-notification] phone: ${formattedPhone}`);
    console.log(`[test-video-notification] payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${String(apiKey).trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    console.log(`[test-video-notification] HTTP ${response.status}:`, text);

    if (!response.ok || data.success === false || data.status === 'error') {
      return NextResponse.json({ success: false, phone: formattedPhone, error: data }, { status: 200 });
    }

    return NextResponse.json({ success: true, phone: formattedPhone, data });
  } catch (err: unknown) {
    console.error('[test-video-notification] error:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
