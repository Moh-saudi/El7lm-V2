import { supabase } from '@/lib/supabase/config';
import { storageManager } from '@/lib/storage';

export interface PartnerItem {
    id: string;
    name: string;
    logoUrl: string;
    order: number;
}

export const getPartners = async (): Promise<PartnerItem[]> => {
    try {
        const { data } = await supabase.from('content').select('items').eq('id', 'partners').limit(1);
        if (data?.length && data[0].items) return data[0].items as PartnerItem[];
        return [];
    } catch (error) {
        console.error('Error fetching partners:', error);
        return [];
    }
};

export const savePartners = async (partners: PartnerItem[]): Promise<void> => {
    try {
        await supabase.from('content').upsert({ id: 'partners', items: partners });
    } catch (error) {
        console.error('Error saving partners:', error);
        throw error;
    }
};

export const uploadPartnerLogo = async (file: File): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `partners/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const result = await storageManager.upload('content', fileName, file, {
            contentType: file.type,
            upsert: true,
        });

        if (!result?.publicUrl) throw new Error('Upload failed');
        return result.publicUrl;
    } catch (error) {
        console.error('Error uploading partner logo:', error);
        throw error;
    }
};
