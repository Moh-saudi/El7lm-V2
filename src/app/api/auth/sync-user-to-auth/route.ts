import { NextResponse } from 'next/server';

const retiredResponse = () =>
  NextResponse.json(
    {
      success: false,
      code: 'LEGACY_AUTH_SYNC_RETIRED',
      error: 'This legacy authentication migration endpoint has been retired.',
    },
    { status: 410 },
  );

export async function POST() {
  return retiredResponse();
}

export async function GET() {
  return retiredResponse();
}
