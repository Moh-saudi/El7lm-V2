import { NextResponse } from 'next/server';

function retired() {
  return NextResponse.json(
    {
      success: false,
      error: 'Legacy interaction notification API retired. Use /api/notifications/dispatch.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET() { return retired(); }
export async function POST() { return retired(); }
export async function PUT() { return retired(); }
