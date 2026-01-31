
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface BrandingData {
    logoUrl: string;
    darkLogoUrl?: string; // For dark mode
    footerLogoUrl?: string;
    siteName: string;
    slogan: string;
}

const DEFAULT_BRANDING: BrandingData = {
    logoUrl: '',
    darkLogoUrl: '',
    footerLogoUrl: '',
    siteName: 'El7lm',
    slogan: 'منصة الحلم لاكتشاف المواهب'
};

export const getBrandingData = async (): Promise<BrandingData> => {
    try {
        const docRef = doc(db, 'content', 'branding');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { ...DEFAULT_BRANDING, ...docSnap.data() } as BrandingData;
        }
        return DEFAULT_BRANDING;
    } catch (error) {
        console.error('Error fetching branding:', error);
        return DEFAULT_BRANDING;
    }
};

export const saveBrandingData = async (data: BrandingData) => {
    try {
        const docRef = doc(db, 'content', 'branding');
        await setDoc(docRef, data, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving branding:', error);
        throw error;
    }
};

export const subscribeToBranding = (callback: (data: BrandingData) => void) => {
    const docRef = doc(db, 'content', 'branding');
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback({ ...DEFAULT_BRANDING, ...doc.data() } as BrandingData);
        } else {
            callback(DEFAULT_BRANDING);
        }
    });
};
