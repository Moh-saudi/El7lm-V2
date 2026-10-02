import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:employees');
  if (!authorization.ok) return authorization.response;

  return withPrivateResponseHeaders(
    NextResponse.json(
      {
        success: false,
        error: 'Legacy employee-to-users synchronization has been retired.',
      },
      { status: 410 },
    ),
  );
}
