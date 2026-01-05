import { db } from './src/lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function checkData() {
    const playersRef = collection(db, 'players');
    const q = query(playersRef, limit(10));
    const snap = await getDocs(q);

    snap.forEach(doc => {
        const data = doc.data();
        console.log(`Player: ${data.full_name || data.name} (${doc.id})`);
        if (data.videos) {
            console.log('Videos:', JSON.stringify(data.videos, null, 2));
        }
    });
}

checkData();
