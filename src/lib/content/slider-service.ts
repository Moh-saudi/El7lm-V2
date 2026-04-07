import { supabase } from '@/lib/supabase/config';

export interface SliderItem {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    active: boolean;
    order: number;
}

export const getSliderItems = async (): Promise<SliderItem[]> => {
    try {
        const { data } = await supabase.from('content').select('items').eq('id', 'slider').limit(1);
        if (data?.length && data[0].items) return data[0].items as SliderItem[];
        return [];
    } catch (error) {
        console.error('Error fetching slider items:', error);
        return [];
    }
};

export const saveSliderItems = async (items: SliderItem[]): Promise<void> => {
    try {
        await supabase.from('content').upsert({ id: 'slider', items });
    } catch (error) {
        console.error('Error saving slider items:', error);
        throw error;
    }
};
