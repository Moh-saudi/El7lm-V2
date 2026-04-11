import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';

    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json({ country_code: null }, { status: 200 });

    const data = await res.json();
    return NextResponse.json({ country_code: data.country_code || null });
  } catch {
    return NextResponse.json({ country_code: null }, { status: 200 });
  }
}
