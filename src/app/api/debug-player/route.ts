import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  return withPrivateResponseHeaders(
    NextResponse.json({ success: false, error: 'Debug endpoint retired.' }, { status: 410 }),
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}
