'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tournament } from '@/app/dashboard/admin/tournaments/utils';
import { useParams } from 'next/navigation';

interface TournamentContextType {
    tournament: Tournament | null;
    loading: boolean;
    error: string | null;
}

const TournamentContext = createContext<TournamentContextType>({
    tournament: null,
    loading: true,
    error: null,
});

export function useTournament() {
    return useContext(TournamentContext);
}

export function TournamentProvider({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const id = params.id as string;
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'tournaments', id);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
            } else {
                setError('البطولة غير موجودة');
                setTournament(null);
            }
            setLoading(false);
        }, (err) => {
            console.error('Error fetching tournament:', err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    return (
        <TournamentContext.Provider value={{ tournament, loading, error }}>
            {children}
        </TournamentContext.Provider>
    );
}
