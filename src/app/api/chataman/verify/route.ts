import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function normalizeBaseUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value || 'https://chataman.com'));
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'chataman.com' && !url.hostname.endsWith('.chataman.com')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json().catch(() => ({}));
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('system_configs')
      .select('apiKey,baseUrl')
      .eq('id', 'chataman_config')
      .maybeSingle();
    if (error) throw error;

    const apiKey =
      (typeof body?.apiKey === 'string' ? body.apiKey.trim() : '') ||
      String(data?.apiKey || '').trim();
    const baseUrl = normalizeBaseUrl(body?.baseUrl || data?.baseUrl);

    if (!apiKey || !baseUrl) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Messaging provider is not configured' }, { status: 503 })
      );
    }

    const response = await fetch(`${baseUrl}/api/templates?per_page=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    return withPrivateResponseHeaders(
      NextResponse.json({ success: response.ok }, { status: response.ok ? 200 : 502 })
    );
  } catch (error) {
    console.error('[chataman/verify] failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
