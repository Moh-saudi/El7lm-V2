
import { supabase } from '@/lib/supabase/config';

export interface BrandingData {
    logoUrl: string;
    darkLogoUrl?: string;
    footerLogoUrl?: string;
    siteName: string;
    slogan: string;
}

const DEFAULT_BRANDING: BrandingData = {
    logoUrl: '',
    darkLogoUrl: '',
    footerLogoUrl: '',
    siteName: 'El7lm',
    slogan: 'منصة الحلم لاكتشاف المواهب',
};

export const getBrandingData = async (): Promise<BrandingData> => {
    try {
        const { data } = await supabase.from('content').select('*').eq('id', 'branding').limit(1);
        if (data?.length) return { ...DEFAULT_BRANDING, ...data[0] } as BrandingData;
        return DEFAULT_BRANDING;
    } catch (error) {
        console.error('Error fetching branding:', error);
        return DEFAULT_BRANDING;
    }
};

export const saveBrandingData = async (data: BrandingData) => {
    try {
        await supabase.from('content').upsert({ id: 'branding', ...data });
        return true;
    } catch (error) {
        console.error('Error saving branding:', error);
        throw error;
    }
};

export const subscribeToBranding = (callback: (data: BrandingData) => void) => {
    const channel = supabase
        .channel('branding-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'content', filter: 'id=eq.branding' }, payload => {
            if (payload.new) callback({ ...DEFAULT_BRANDING, ...payload.new } as BrandingData);
            else callback(DEFAULT_BRANDING);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};
