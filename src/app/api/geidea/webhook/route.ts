import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Disabled until Geidea's exact webhook signature contract is configured.
 * Provider notifications must never mutate financial state without cryptographic
 * verification or an authoritative server-to-server verification request.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Geidea webhook is disabled; use the verified callback flow.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
