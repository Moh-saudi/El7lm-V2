'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayerTournamentsRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/tournaments/unified-registration'); }, [router]);
    return null;
}
