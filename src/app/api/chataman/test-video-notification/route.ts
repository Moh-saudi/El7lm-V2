import { NextResponse } from 'next/server';

function retired() {
  return NextResponse.json(
    { success: false, error: 'ChatAman diagnostic endpoint retired' },
    { status: 410, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  );
}

export async function GET() {
  return retired();
}

export async function POST() {
  return retired();
}
