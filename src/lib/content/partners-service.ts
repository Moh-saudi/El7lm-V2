import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { storageManager } from '@/lib/storage';

export interface PartnerItem {
    id: string;
    name: string;
    logoUrl: string;
    order: number;
}

const DOC_PATH = 'content/partners';

export const getPartners = async (): Promise<PartnerItem[]> => {
    try {
        const docRef = doc(db, 'content', 'partners');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().items) {
            return docSnap.data().items as PartnerItem[];
        }
        return [];
    } catch (error) {
        console.error('Error fetching partners:', error);
        return [];
    }
};

export const savePartners = async (partners: PartnerItem[]): Promise<void> => {
    try {
        const docRef = doc(db, 'content', 'partners');
        await setDoc(docRef, { items: partners }, { merge: true });
    } catch (error) {
        console.error('Error saving partners:', error);
        throw error;
    }
};

export const uploadPartnerLogo = async (file: File): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `partners/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to 'content' bucket (or similar)
        const result = await storageManager.upload('content', fileName, file, {
            contentType: file.type,
            upsert: true
        });

        if (!result?.publicUrl) throw new Error('Upload failed');
        return result.publicUrl;
    } catch (error) {
        console.error('Error uploading partner logo:', error);
        throw error;
    }
};
