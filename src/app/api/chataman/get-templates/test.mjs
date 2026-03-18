import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('C:/Users/HP/Desktop/el7lm-saudi-firebase-adminsdk-m8q6k-12a84d081f.json', 'utf8'));

if (serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function run() {
  const docSnap = await db.collection('system_configs').doc('chataman_config').get();
  if (docSnap.exists) {
     const data = docSnap.data();
     console.log('--- FOUND CONFIG ---');
     console.log('ApiKey:', data.apiKey);
     console.log('BaseUrl:', data.baseUrl);
     
     const targetUrl = `${(data.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '')}/api/templates`;
     console.log('Target URL:', targetUrl);
     
     try {
       const response = await fetch(targetUrl, {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${data.apiKey.trim()}`,
           'Accept': 'application/json'
         }
       });
       console.log('Status:', response.status);
       const text = await response.text();
       console.log('Body:', text.substring(0, 500));
     } catch (e) {
       console.error('Fetch Crash:', e);
     }
  } else {
     console.log('Config document not found');
  }
}

run();
