import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

export async function GET(_req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const { data: cfgRows } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);
    const config = cfgRows?.length ? cfgRows[0] as Record<string, unknown> : null;

    if (!config) {
      return NextResponse.json({ success: false, error: 'Config document chataman_config not found' });
    }

    const targetUrl = `${String(config.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '')}/api/templates`;

    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${String(config.apiKey).trim()}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      const text = await response.text();
      return NextResponse.json({ success: true, url: targetUrl, status: response.status, body: text.substring(0, 500) });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Unknown');
      return NextResponse.json({ success: false, error: `Fetch Crash: ${err.message}` });
    }
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
