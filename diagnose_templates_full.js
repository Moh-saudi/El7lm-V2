const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');

const serviceAccount = require('./service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
    try {
        const docRef = db.collection('system_configs').doc('chataman_config');
        const snap = await docRef.get();
        if (!snap.exists) {
            console.log('❌ Config not found on Firestore');
            return;
        }
        const config = snap.data();
        const apiKey = config.apiKey;
        const baseUrl = config.baseUrl || 'https://chataman.com';

        console.log(`🔗 Base URL: ${baseUrl}`);

        const response = await fetch(`${baseUrl}/api/templates`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Accept': 'application/json'
          }
        });

        const text = await response.text();
        console.log(`📡 Response Status: ${response.status}`);
        console.log('📡 Response text (Full Layout):');
        console.log(text.substring(0, 5000)); // print first 5000 chars

    } catch (e) {
        console.error('❌ Error testing:', e);
    }
}

run();
