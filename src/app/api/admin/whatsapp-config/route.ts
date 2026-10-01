import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type Body = {
  resource?: unknown;
  id?: unknown;
  label?: unknown;
  number?: unknown;
  type?: unknown;
  content?: unknown;
  isActive?: unknown;
};

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function activeFlag(value: unknown): boolean {
  return value !== false;
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as Body;
    const resource = cleanString(body.resource, 32);
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    if (resource === 'number') {
      const label = cleanString(body.label, 120);
      const number = cleanString(body.number, 40).replace(/\D/g, '');
      if (!label || !number) {
        return withPrivateResponseHeaders(
          NextResponse.json({ success: false, error: 'label and number are required' }, { status: 400 })
        );
      }

      const { error } = await db.from('whatsappNumbers').insert({
        id,
        label,
        number,
        isActive: activeFlag(body.isActive),
        createdAt: now,
        updatedAt: now,
      });
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true, id }));
    }

    if (resource === 'message') {
      const type = cleanString(body.type, 120);
      const messageContent = cleanString(body.content, 4000);
      if (!type || !messageContent) {
        return withPrivateResponseHeaders(
          NextResponse.json({ success: false, error: 'type and content are required' }, { status: 400 })
        );
      }

      const { error } = await db.from('whatsappMessages').insert({
        id,
        type,
        content: messageContent,
        isActive: activeFlag(body.isActive),
        createdAt: now,
        updatedAt: now,
      });
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true, id }));
    }

    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Unsupported resource' }, { status: 400 })
    );
  } catch (error) {
    console.error('[admin/whatsapp-config] create failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to create WhatsApp configuration' }, { status: 500 })
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as Body;
    const resource = cleanString(body.resource, 32);
    const id = cleanString(body.id, 160);
    if (!id) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
      );
    }

    const db = getSupabaseAdmin();
    const updatedAt = new Date().toISOString();

    if (resource === 'number') {
      const label = cleanString(body.label, 120);
      const number = cleanString(body.number, 40).replace(/\D/g, '');
      if (!label || !number) {
        return withPrivateResponseHeaders(
          NextResponse.json({ success: false, error: 'label and number are required' }, { status: 400 })
        );
      }

      const { error } = await db.from('whatsappNumbers').update({
        label,
        number,
        isActive: activeFlag(body.isActive),
        updatedAt,
      }).eq('id', id);
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true }));
    }

    if (resource === 'message') {
      const type = cleanString(body.type, 120);
      const messageContent = cleanString(body.content, 4000);
      if (!type || !messageContent) {
        return withPrivateResponseHeaders(
          NextResponse.json({ success: false, error: 'type and content are required' }, { status: 400 })
        );
      }

      const { error } = await db.from('whatsappMessages').update({
        type,
        content: messageContent,
        isActive: activeFlag(body.isActive),
        updatedAt,
      }).eq('id', id);
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true }));
    }

    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Unsupported resource' }, { status: 400 })
    );
  } catch (error) {
    console.error('[admin/whatsapp-config] update failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to update WhatsApp configuration' }, { status: 500 })
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as Body;
    const resource = cleanString(body.resource, 32);
    const id = cleanString(body.id, 160);
    if (!id) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
      );
    }

    const table = resource === 'number'
      ? 'whatsappNumbers'
      : resource === 'message'
        ? 'whatsappMessages'
        : '';

    if (!table) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Unsupported resource' }, { status: 400 })
      );
    }

    const db = getSupabaseAdmin();
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) throw error;

    return withPrivateResponseHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('[admin/whatsapp-config] delete failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to delete WhatsApp configuration' }, { status: 500 })
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
