import { supabase } from '@/lib/supabase/config';

export interface LandingStats {
    players: number;
    countries: number;
    successRate: number;
    countriesList?: string[];
}

const DEFAULTS: LandingStats = { players: 1240, countries: 6, successRate: 89 };

export const getLandingStats = async (): Promise<LandingStats> => {
    try {
        const { data } = await supabase.from('content').select('*').eq('id', 'landing-stats').limit(1);
        if (data?.length) return data[0] as LandingStats;
        return DEFAULTS;
    } catch (error) {
        console.error('Error fetching landing stats:', error);
        throw error;
    }
};

export const updateLandingStats = async (stats: LandingStats): Promise<void> => {
    try {
        await supabase.from('content').upsert({ id: 'landing-stats', ...stats });
    } catch (error) {
        console.error('Error updating landing stats:', error);
        throw error;
    }
};

export const subscribeToLandingStats = (callback: (stats: LandingStats) => void) => {
    const channel = supabase
        .channel('landing-stats-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'content', filter: 'id=eq.landing-stats' }, payload => {
            if (payload.new) callback(payload.new as LandingStats);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};
