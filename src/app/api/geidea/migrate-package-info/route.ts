import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

function retired() {
  return withPrivateResponseHeaders(
    NextResponse.json(
      {
        success: false,
        error: 'Legacy Geidea payment migration has been retired. Canonical payment data lives in payments/payment_targets.',
      },
      { status: 410 },
    ),
  );
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'read:financials');
  if (!authorization.ok) return authorization.response;
  return retired();
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:financials');
  if (!authorization.ok) return authorization.response;
  return retired();
}
