import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { loadNisrPlayerContext, NisrContextError } from '@/lib/nisr/player-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authorization = await authorizeUser(request);
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ar';
  const safeLocale = ['ar', 'en', 'es', 'pt', 'fr'].includes(locale) ? locale : 'ar';
  
  if (authorization.ok) {
    try {
      const context = await loadNisrPlayerContext(authorization.user.id, safeLocale);
      return NextResponse.json(context, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch {
      // Fallback below
    }
  }

  const fallbackContext = {
    name: authorization.ok ? (authorization.user.user_metadata?.full_name || authorization.user.user_metadata?.name || 'كابتن الحلم') : 'كابتن الحلم',
    position: 'لاعب كرة قدم',
    secondaryPosition: '',
    preferredFoot: '',
    heightCm: '',
    weightKg: '',
    country: '',
    city: '',
    contractStatus: '',
    organization: '',
    profileCompletion: 40,
    skills: {},
    recentOpportunities: [],
  };

  return NextResponse.json(fallbackContext, { headers: { 'Cache-Control': 'no-store' } });
}
