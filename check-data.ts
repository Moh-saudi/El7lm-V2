import { db } from './src/lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function checkData() {
    const q = query(collection(db, 'players'), limit(5));
    const snap = await getDocs(q);
    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`User: ${data.name || data.fullName}, ID: ${doc.id}`);
        if (data.videos) {
            console.log(`  Videos: ${JSON.stringify(data.videos.slice(0, 2))}`);
        }
    });
}

checkData();
