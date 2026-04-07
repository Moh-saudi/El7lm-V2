'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/config';
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

        // Initial fetch
        const fetchTournament = async () => {
            const { data, error: fetchError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !data) {
                setError('البطولة غير موجودة');
                setTournament(null);
            } else {
                setTournament({
                    id: data.id,
                    ...data,
                    isActive: data.isActive === true,
                    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
                    registrations: data.registrations || [],
                    currency: data.currency || 'EGP',
                    paymentMethods: data.paymentMethods || ['credit_card', 'bank_transfer'],
                    ageGroups: data.ageGroups || [],
                    categories: data.categories || [],
                } as Tournament);
            }
            setLoading(false);
        };

        fetchTournament();

        // Realtime subscription
        const channel = supabase
            .channel(`tournament-${id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        setError('البطولة غير موجودة');
                        setTournament(null);
                    } else {
                        const data = payload.new as any;
                        setTournament({
                            id: data.id,
                            ...data,
                            isActive: data.is_active === true,
                            createdAt: data.created_at ? new Date(data.created_at) : new Date(),
                            updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
                            registrations: data.registrations || [],
                            currency: data.currency || 'EGP',
                            paymentMethods: data.payment_methods || ['credit_card', 'bank_transfer'],
                            ageGroups: data.age_groups || [],
                            categories: data.categories || [],
                        } as Tournament);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    return (
        <TournamentContext.Provider value={{ tournament, loading, error }}>
            {children}
        </TournamentContext.Provider>
    );
}
