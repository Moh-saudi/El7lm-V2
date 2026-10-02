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

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('system_configs')
      .select('baseUrl,isActive,senderName,defaultCountryCode,apiKey')
      .eq('id', 'chataman_config')
      .maybeSingle();

    if (error) throw error;

    return withPrivateResponseHeaders(
      NextResponse.json({
        success: true,
        data: data
          ? {
              baseUrl: String(data.baseUrl || 'https://chataman.com'),
              isActive: Boolean(data.isActive),
              senderName: data.senderName || '',
              defaultCountryCode: data.defaultCountryCode || '',
              hasApiKey: Boolean(String(data.apiKey || '').trim()),
            }
          : null,
      })
    );
  } catch (error) {
    console.error('[chataman/config] GET failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to load provider configuration' }, { status: 500 })
    );
  }
}

export async function PUT(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const baseUrl = normalizeBaseUrl(body?.baseUrl);
    if (!baseUrl) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Invalid ChatAman URL' }, { status: 400 })
      );
    }

    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
    if (apiKey.length > 4096) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'API key is too long' }, { status: 400 })
      );
    }

    const db = getSupabaseAdmin();
    const { data: existing, error: existingError } = await db
      .from('system_configs')
      .select('apiKey')
      .eq('id', 'chataman_config')
      .maybeSingle();
    if (existingError) throw existingError;

    const payload = {
      id: 'chataman_config',
      baseUrl,
      isActive: Boolean(body?.isActive),
      senderName: typeof body?.senderName === 'string' ? body.senderName.trim().slice(0, 120) : '',
      defaultCountryCode: typeof body?.defaultCountryCode === 'string' ? body.defaultCountryCode.trim().slice(0, 16) : '',
      apiKey: apiKey || String(existing?.apiKey || '').trim(),
    };

    if (!payload.apiKey) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 })
      );
    }

    const { error } = await db.from('system_configs').upsert(payload);
    if (error) throw error;

    return withPrivateResponseHeaders(
      NextResponse.json({ success: true, hasApiKey: true })
    );
  } catch (error) {
    console.error('[chataman/config] PUT failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to save provider configuration' }, { status: 500 })
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
