import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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
  const authorization = await authorizeAdmin(req, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const db = getSupabaseAdmin();
    const { data: config, error: configError } = await db
      .from('system_configs')
      .select('apiKey,baseUrl,isActive')
      .eq('id', 'chataman_config')
      .maybeSingle();

    const apiKey = String(config?.apiKey || '').trim();
    const baseUrl = getChatAmanBaseUrl(config?.baseUrl);

    if (configError || !config?.isActive || !apiKey || !baseUrl) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Messaging provider is not configured' }, { status: 503 })
      );
    }

    const targetUrl = `${baseUrl}/api/templates?per_page=100`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    let data: unknown = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      console.warn('[chataman/get-templates] Provider returned non-JSON response');
    }

    if (!response.ok) {
      return withPrivateResponseHeaders(
        NextResponse.json(
          { success: false, error: 'Failed to fetch templates from provider' },
          { status: 502 }
        )
      );
    }

    return withPrivateResponseHeaders(
      NextResponse.json({ success: true, data })
    );
  } catch (error) {
    console.error('[chataman/get-templates] failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
