import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface SuccessStory {
    id: number;
    name: string;
    role: string;
    image: string;
    club: string;
    flag: string;
    quote?: string;
}

const DOC_PATH = 'content/success-stories';

export const getSuccessStories = async (): Promise<SuccessStory[]> => {
    try {
        const docRef = doc(db, 'content', 'success-stories');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().items) {
            return docSnap.data().items as SuccessStory[];
        }
        // Return default/mock data if empty to keep the UI looking good initially
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
        const docRef = doc(db, 'content', 'success-stories');
        await setDoc(docRef, { items: stories }, { merge: true });
    } catch (error) {
        console.error('Error saving success stories:', error);
        throw error;
    }
};
