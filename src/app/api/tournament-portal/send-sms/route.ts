import { NextRequest, NextResponse } from 'next/server';

// Twilio credentials (optional — set in .env to enable real SMS)
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;

export async function POST(req: NextRequest) {
  const { phones, message } = await req.json() as { phones: string[]; message: string };
  if (!phones?.length || !message) {
    return NextResponse.json({ error: 'phones and message required' }, { status: 400 });
  }

  // If Twilio is not configured, return a helpful guide
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return NextResponse.json({
      sent: 0,
      warning: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env to enable real SMS.',
      phones,
    });
  }

  const results: { phone: string; success: boolean; error?: string }[] = [];

  for (const rawPhone of phones) {
    const phone = rawPhone.replace(/\D/g, '');
    if (!phone) { results.push({ phone: rawPhone, success: false, error: 'invalid phone' }); continue; }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: `+${phone}`, From: TWILIO_FROM, Body: message }),
        }
      );
      const json = await res.json();
      if (json.error_code) results.push({ phone, success: false, error: json.message });
      else results.push({ phone, success: true });
    } catch (e: any) {
      results.push({ phone, success: false, error: e.message });
    }
  }

  const sent = results.filter(r => r.success).length;
  return NextResponse.json({ sent, total: phones.length, results });
}
