import { NextRequest, NextResponse } from 'next/server';
import {
    authorizeTournamentClient,
    tournamentAccessDenied,
    tournamentBelongsToClient,
} from '@/lib/api/tournament-auth';

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    if (
        pathname.startsWith('/api/tournament-portal/') &&
        pathname !== '/api/tournament-portal/complete-registration' &&
        pathname !== '/api/tournament-portal/debug-tables'
    ) {
        const authorization = await authorizeTournamentClient(request);
        if (!authorization.client) return authorization.response!;

        let tournamentId = request.nextUrl.searchParams.get('tournament_id');
        if (!tournamentId && request.method !== 'GET') {
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const body = await request.clone().json().catch(() => null);
                tournamentId = typeof body?.tournament_id === 'string' ? body.tournament_id : null;
            }
        }

        const ownershipRequired = ![
            '/api/tournament-portal/search-platform-users',
            '/api/tournament-portal/update-last-login',
        ].includes(pathname);

        if (ownershipRequired && !tournamentId) {
            return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });
        }

        if (
            tournamentId &&
            !(await tournamentBelongsToClient(tournamentId, authorization.client.id))
        ) {
            return tournamentAccessDenied();
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/tournament-portal/:path*', '/api/tournament-portal/:path*'],
};
