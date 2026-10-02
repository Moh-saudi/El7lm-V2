import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'Tournament organizer self-registration is retired. Accounts are provisioned by administrators.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
