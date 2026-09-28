import { NextRequest, NextResponse } from 'next/server';
import { getCardProviderForCountry } from '@/lib/payments/provider-routing-service';
import { POST as createGeideaSession } from '@/app/api/geidea/create-session/route';
import { POST as createSkipCashSession } from '@/app/api/skipcash/create-session/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Canonical card checkout entry point.
 * The client selects a country, never a provider. Provider routing is server-owned.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const countryCode = String(body.countryCode || '').trim().toUpperCase();
    if (!countryCode) {
      return NextResponse.json({ success: false, error: 'countryCode is required' }, { status: 400 });
    }

    const provider = await getCardProviderForCountry(countryCode);
    const forwarded = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ ...body, countryCode }),
    });

    if (provider === 'geidea') {
      return createGeideaSession(forwarded);
    }

    if (provider === 'skipcash') {
      return createSkipCashSession(forwarded);
    }

    return NextResponse.json(
      { success: false, error: `Unsupported card provider configured for ${countryCode}` },
      { status: 400 },
    );
  } catch (error) {
    console.error('❌ [Canonical Checkout Router] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
