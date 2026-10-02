import { NextRequest, NextResponse } from 'next/server';

import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';
import { consumePhoneLookupRateLimit } from '@/lib/auth/phone-lookup-rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const phoneNumber = String(body?.phoneNumber ?? body?.phone ?? '').trim();
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400 },
      );
    }

    const allowed = await consumePhoneLookupRateLimit(request, phoneNumber);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many lookup attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    }

    const account = await findAccountByPhone(phoneNumber);
    if (!account.found) {
      return NextResponse.json({
        success: true,
        found: false,
        canLogin: false,
        canRegister: true,
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      canLogin: true,
      canRegister: false,
      accountType: account.accountType,
    });
  } catch (error: unknown) {
    console.error('[resolve-phone]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'تعذر التحقق من رقم الهاتف حالياً. يرجى المحاولة مرة أخرى.',
        code: 'ACCOUNT_LOOKUP_UNAVAILABLE',
      },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
