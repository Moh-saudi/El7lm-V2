import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

async function run() {
  const db = getFirestore();
  const docSnap = await db.collection('system_configs').doc('chataman_config').get();
  const config = docSnap.exists ? docSnap.data() : null;

  if (!config) {
     console.log('No config');
     return;
  }

  const response = await fetch('http://localhost:3000/api/chataman/get-templates', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
         apiKey: config.apiKey,
         baseUrl: config.baseUrl || 'https://chataman.com'
     })
  });

  const text = await response.text();
  console.log('STATUS:', response.status);
  console.log('BODY:', text.substring(0, 500));
}

run();
