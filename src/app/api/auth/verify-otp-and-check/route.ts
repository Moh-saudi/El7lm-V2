import { NextResponse } from 'next/server';

/**
 * Retired legacy OTP endpoint.
 *
 * OTP authentication is handled by /api/auth/otp-login, which exchanges a
 * verified OTP for a one-time Supabase session token without changing the
 * user's password.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      code: 'ENDPOINT_RETIRED',
      error: 'This legacy OTP endpoint has been retired.',
    },
    { status: 410 },
  );
}
