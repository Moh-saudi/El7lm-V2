import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
        const docRef = doc(db, 'content', 'slider');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().items) {
            return docSnap.data().items as SliderItem[];
        }
        return [];
    } catch (error) {
        console.error('Error fetching slider items:', error);
        return [];
    }
};

export const saveSliderItems = async (items: SliderItem[]): Promise<void> => {
    try {
        const docRef = doc(db, 'content', 'slider');
        await setDoc(docRef, { items }, { merge: true });
    } catch (error) {
        console.error('Error saving slider items:', error);
        throw error;
    }
};
