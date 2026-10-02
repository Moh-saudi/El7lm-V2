import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Retired: provider order payloads must be verified server-side through the
 * canonical callback/verification flow. Client-submitted provider responses
 * are never authoritative financial events.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been retired. Use the verified payment callback flow.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
