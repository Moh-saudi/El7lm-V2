import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendChatAmanTemplate } from '@/lib/server/chataman-provider';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const rawBody = await req.text();
    if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > 64 * 1024) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
    let body: { payload?: unknown };
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
      body = parsed as { payload?: unknown };
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed JSON body' }, { status: 400 });
    }
    const payload = body.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('system_configs')
      .select('apiKey,baseUrl,isActive')
      .eq('id', 'chataman_config')
      .maybeSingle();

    if (error || !data?.isActive || !data.apiKey || !data.baseUrl) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Messaging provider is not configured' }, { status: 503 }),
      );
    }

    const success = await sendChatAmanTemplate(payload, {
      apiKey: String(data.apiKey),
      baseUrl: String(data.baseUrl),
    });

    return withPrivateResponseHeaders(
      NextResponse.json(
        { success, error: success ? undefined : 'Failed to send template through provider' },
        { status: success ? 200 : 502 },
      ),
    );
  } catch (error) {
    console.error('[chataman/send-template] failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 }),
    );
  }
}
