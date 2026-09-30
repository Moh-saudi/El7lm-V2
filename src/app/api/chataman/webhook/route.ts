import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ChatAmanService } from '@/lib/services/chataman-service';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function getWebhookSecret(): string | null {
  const value = process.env.CHATAMAN_WEBHOOK_SECRET?.trim();
  return value || null;
}

export async function GET(req: NextRequest) {
  const secret = getWebhookSecret();
  if (!secret) return new NextResponse('Webhook not configured', { status: 503 });

  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && challenge && safeEqual(token, secret)) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  const secret = getWebhookSecret();
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

  const suppliedSecret =
    req.headers.get('x-chataman-webhook-secret')?.trim()
    || req.headers.get('x-webhook-secret')?.trim();

  if (!suppliedSecret || !safeEqual(suppliedSecret, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await req.text();
    if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > 64 * 1024) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const result = await ChatAmanService.handleWebhook(body as Record<string, unknown>);

    if (result.success) {
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    console.warn('ChatAman webhook processing warning:', result.error);
    return NextResponse.json({ status: 'received_with_warning' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error processing ChatAman webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
