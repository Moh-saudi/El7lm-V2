'use client';

import { redirect, useParams } from 'next/navigation';
import { useLayoutEffect } from 'react';

export default function TournamentRootPage() {
    const params = useParams();
    // Redirect to overview
    // Note: In a client component we use router or redirect from next/navigation (server/client compat)
    // But direct redirect() usually works in simple page components if not async.
    // Or just return null and useLayoutEffect.

    useLayoutEffect(() => {
        if (params && params.id) {
            redirect(`/dashboard/admin/tournaments/${params.id}/overview`);
        }
    }, [params]);

    return null;
}
