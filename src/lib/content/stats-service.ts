import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export interface LandingStats {
    players: number;
    countries: number;
    successRate: number;
    countriesList?: string[]; // Optional: list of country names
}

const STATS_DOC_PATH = 'content/landing-stats';

export const getLandingStats = async (): Promise<LandingStats> => {
    try {
        const statsRef = doc(db, 'content', 'landing-stats');
        const docSnap = await getDoc(statsRef);

        if (docSnap.exists()) {
            return docSnap.data() as LandingStats;
        } else {
            // Return defaults if not found
            return {
                players: 1240,
                countries: 6,
                successRate: 89
            };
        }
    } catch (error) {
        console.error('Error fetching landing stats:', error);
        throw error;
    }
};

export const updateLandingStats = async (stats: LandingStats): Promise<void> => {
    try {
        const statsRef = doc(db, 'content', 'landing-stats');
        // Use setDoc with merge to create if not exists or update
        await setDoc(statsRef, stats, { merge: true });
    } catch (error) {
        console.error('Error updating landing stats:', error);
        throw error;
    }
};

// Real-time listener hook helper (to be used in components if needed)
export const subscribeToLandingStats = (callback: (stats: LandingStats) => void) => {
    const statsRef = doc(db, 'content', 'landing-stats');
    return onSnapshot(statsRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as LandingStats);
        }
    });
};
