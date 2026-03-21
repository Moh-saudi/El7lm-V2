import { getAdminDb } from '../src/lib/firebase-admin';
import fetch from 'node-fetch';

async function test() {
  try {
    const db = getAdminDb();
    const docSnap = await db.collection('system_configs').doc('chataman_config').get();
    
    if (!docSnap.exists) {
      console.log('Config not found inside Firestore!');
      return;
    }
    
    const config = docSnap.data();
    const apiKey = config?.apiKey;
    const cleanBaseUrl = (config?.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '');
    
    if (!apiKey) {
      console.log('API Key not found!');
      return;
    }

    console.log('Using API Key:', apiKey.substring(0, 10) + '...');
    console.log('Base URL:', cleanBaseUrl);

    const payloadTemplate = {
      phone: "+201026567954", // A valid dummy or just real number if not sent
      template: {
        name: "our_website",
        language: { code: "ar" },
        components: [
          {
            type: "body",
            parameters: [ { type: "text", text: "اختبار" } ]
          }
        ]
      }
    };

    const endpoints = [
      '/api/send/template',
      '/api/send-template',
      '/api/send_template',
      '/api/v1/send-template'
    ];

    for (const endpoint of endpoints) {
      const url = `${cleanBaseUrl}${endpoint}`;
      console.log(`\n--- Testing Endpoint: ${url} ---`);
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payloadTemplate)
        });
        
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, text);
      } catch (e: any) {
        console.log(`Fetch error:`, e.message);
      }
    }

  } catch (e) {
    console.error('Test Crash:', e);
  }
}

test();
