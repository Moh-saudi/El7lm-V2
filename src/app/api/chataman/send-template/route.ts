import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendChatAmanTemplate } from '@/lib/server/chataman-provider';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const { payload } = await req.json();
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Missing payload' }, { status: 400 });
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
