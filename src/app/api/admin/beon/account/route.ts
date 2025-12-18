import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // BeOn service is deprecated/disabled as per user request
  return NextResponse.json({
    success: true,
    data: {
      status: 'disabled',
      message: 'BeOn service is no longer valid',
      balance: 0
    }
  });
}
