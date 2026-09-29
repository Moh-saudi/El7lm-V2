import { NextRequest, NextResponse } from 'next/server';
import { authorizeTournamentOwnership } from '@/lib/api/tournament-auth';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
const MAX_RECIPIENTS = 100;
const MAX_MESSAGE_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const { tournament_id, phones, message } = await req.json() as {
    tournament_id?: string;
    phones?: string[];
    message?: string;
  };

  if (!tournament_id || !Array.isArray(phones) || phones.length === 0 || !message?.trim()) {
    return NextResponse.json({ error: 'tournament_id, phones and message required' }, { status: 400 });
  }
  if (phones.length > MAX_RECIPIENTS || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'SMS request exceeds allowed limits' }, { status: 400 });
  }

  const authorization = await authorizeTournamentOwnership(req, tournament_id);
  if (!authorization.user) return authorization.response!;

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return NextResponse.json({ sent: 0, error: 'SMS provider is not configured' }, { status: 503 });
  }

  const results: { success: boolean; error?: string }[] = [];
  for (const rawPhone of phones) {
    const phone = String(rawPhone).replace(/\D/g, '');
    if (phone.length < 8 || phone.length > 15) {
      results.push({ success: false, error: 'invalid phone' });
      continue;
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: `+${phone}`, From: TWILIO_FROM, Body: message.trim() }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const json = await res.json().catch(() => null);
      results.push(res.ok && !json?.error_code
        ? { success: true }
        : { success: false, error: 'provider rejected message' });
    } catch {
      results.push({ success: false, error: 'provider request failed' });
    }
  }

  return NextResponse.json({
    sent: results.filter(r => r.success).length,
    total: phones.length,
    failed: results.filter(r => !r.success).length,
  });
}
