import { supabase } from '@/lib/supabase/config';
import { storageManager } from '@/lib/storage';

export interface AdItem {
    id: string;
    title: string;
    category?: string;
    description?: string;
    linkUrl: string;
    imageUrl: string;
    active: boolean;
}

export const getAds = async (): Promise<AdItem[]> => {
    try {
        const { data } = await supabase.from('content').select('items').eq('id', 'ads').limit(1);
        if (data?.length && data[0].items) return data[0].items as AdItem[];
        return [];
    } catch (error) {
        console.error('Error fetching ads:', error);
        return [];
    }
};

export const saveAds = async (ads: AdItem[]): Promise<void> => {
    try {
        await supabase.from('content').upsert({ id: 'ads', items: ads });
    } catch (error) {
        console.error('Error saving ads:', error);
        throw error;
    }
};
