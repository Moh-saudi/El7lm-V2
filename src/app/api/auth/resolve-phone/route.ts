import { NextRequest, NextResponse } from 'next/server';

import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';

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
        error: 'Account verification is temporarily unavailable.',
        code: 'ACCOUNT_LOOKUP_UNAVAILABLE',
      },
      { status: 500 },
    );
  }
}
