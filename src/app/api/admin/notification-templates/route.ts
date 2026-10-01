import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const EVENT_TYPES = [
  'profile_view',
  'video_view',
  'video_like',
  'video_comment',
  'video_share',
  'message_received',
  'follow',
] as const;

type EventType = typeof EVENT_TYPES[number];

function sanitizeEntry(value: unknown): { templateName: string; params: string[] } | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const templateName = typeof row.templateName === 'string' ? row.templateName.trim().slice(0, 200) : '';
  const params = Array.isArray(row.params)
    ? row.params.filter((item): item is string => typeof item === 'string').map(item => item.slice(0, 80)).slice(0, 20)
    : [];

  return templateName ? { templateName, params } : null;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('system_configs')
      .select('*')
      .eq('id', 'notification_templates')
      .maybeSingle();

    if (error) throw error;

    const mapping: Partial<Record<EventType, { templateName: string; params: string[] } | null>> = {};
    for (const eventType of EVENT_TYPES) {
      mapping[eventType] = sanitizeEntry((data as Record<string, unknown> | null)?.[eventType]);
    }

    return withPrivateResponseHeaders(
      NextResponse.json({ success: true, data: mapping })
    );
  } catch (error) {
    console.error('[admin/notification-templates] GET failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to load notification templates' }, { status: 500 })
    );
  }
}

export async function PUT(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const payload: Record<string, unknown> = { id: 'notification_templates' };

    for (const eventType of EVENT_TYPES) {
      payload[eventType] = sanitizeEntry(body?.[eventType]);
    }

    const db = getSupabaseAdmin();
    const { error } = await db
      .from('system_configs')
      .upsert(payload);

    if (error) throw error;

    return withPrivateResponseHeaders(
      NextResponse.json({ success: true })
    );
  } catch (error) {
    console.error('[admin/notification-templates] PUT failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to save notification templates' }, { status: 500 })
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
