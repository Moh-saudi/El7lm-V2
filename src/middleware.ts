import { NextRequest, NextResponse } from 'next/server';
import {
    authorizeTournamentClient,
    tournamentAccessDenied,
    tournamentBelongsToClient,
} from '@/lib/api/tournament-auth';

const ALLOWED_API_ORIGINS = new Set([
    'https://el7lm.com',
    'https://www.el7lm.com',
]);

const MOBILE_API_PATHS = new Set([
    '/api/otp/send',
    '/api/auth/verify-otp-and-check',
    '/api/auth/create-user-with-phone',
    '/api/auth/otp-login',
    '/api/players/videos',
    '/api/opportunities',
    '/api/opportunities/apply',
]);

function isAllowedApiOrigin(origin: string | null) {
    if (!origin) return false;
    if (ALLOWED_API_ORIGINS.has(origin)) return true;

    try {
        const url = new URL(origin);
        return (
            url.protocol === 'http:' &&
            (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
        );
    } catch {
        return false;
    }
}

function addCorsHeaders(response: NextResponse, origin: string | null) {
    if (!isAllowedApiOrigin(origin)) return response;

    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    response.headers.set(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept',
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.append('Vary', 'Origin');
    return response;
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const origin = request.headers.get('origin');
    const isMobileApiPath = MOBILE_API_PATHS.has(pathname);

    if (isMobileApiPath && request.method === 'OPTIONS') {
        return addCorsHeaders(new NextResponse(null, { status: 204 }), origin);
    }

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

    const response = NextResponse.next();
    return isMobileApiPath ? addCorsHeaders(response, origin) : response;
}

export const config = {
    matcher: [
        '/tournament-portal/:path*',
        '/api/tournament-portal/:path*',
        '/api/otp/send',
        '/api/auth/verify-otp-and-check',
        '/api/auth/create-user-with-phone',
        '/api/auth/otp-login',
        '/api/players/videos',
        '/api/opportunities',
        '/api/opportunities/apply',
    ],
};
