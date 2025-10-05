import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      pong: true,
      timestamp: new Date().toISOString()
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );
}
