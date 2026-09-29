import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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
  const authorization = await authorizeAdmin(req, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const { payload } = await req.json();
    if (!payload) return NextResponse.json({ success: false, error: 'Missing payload' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('system_configs')
      .select('apiKey,baseUrl,isActive')
      .eq('id', 'chataman_config')
      .maybeSingle();

    const baseUrl = getChatAmanBaseUrl(data?.baseUrl);
    const apiKey = String(data?.apiKey || '').trim();
    if (error || !data?.isActive || !baseUrl || !apiKey) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Messaging provider is not configured' }, { status: 503 }),
      );
    }

    const response = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const providerData = await response.json().catch(() => null);
    const success = response.ok && providerData?.status !== 'error' && providerData?.success !== false;

    return withPrivateResponseHeaders(
      NextResponse.json(
        { success, data: success ? providerData : undefined, error: success ? undefined : 'Failed to send message through provider' },
        { status: success ? 200 : 502 },
      ),
    );
  } catch (error) {
    console.error('[chataman/send-message] failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 }),
    );
  }
}
