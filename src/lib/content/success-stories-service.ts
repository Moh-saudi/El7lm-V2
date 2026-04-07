import { supabase } from '@/lib/supabase/config';

export interface SuccessStory {
    id: number;
    name: string;
    role: string;
    image: string;
    club: string;
    flag: string;
    quote?: string;
}

export const getSuccessStories = async (): Promise<SuccessStory[]> => {
    try {
        const { data } = await supabase.from('content').select('items').eq('id', 'success-stories').limit(1);
        if (data?.length && data[0].items) return data[0].items as SuccessStory[];
        return [
            { id: 1, name: "Ahmed Hassan", role: "Midfielder", image: "/images/player1.jpg", club: "Al Ahly", flag: "🇪🇬" },
            { id: 2, name: "Omar Al-Soma", role: "Striker", image: "/images/player2.jpg", club: "Al Arabi", flag: "🇸🇾" },
            { id: 3, name: "Salem Al-Dawsari", role: "Winger", image: "/images/player3.jpg", club: "Al Hilal", flag: "🇸🇦" },
        ];
    } catch (error) {
        console.error('Error fetching success stories:', error);
        return [];
    }
};

export const saveSuccessStories = async (stories: SuccessStory[]): Promise<void> => {
    try {
        await supabase.from('content').upsert({ id: 'success-stories', items: stories });
    } catch (error) {
        console.error('Error saving success stories:', error);
        throw error;
    }
};
