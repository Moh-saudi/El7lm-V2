import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
    // Auth protection for tournament-portal is handled client-side in the layout
    return NextResponse.next();
}

export const config = {
    matcher: ['/tournament-portal/:path*'],
};
