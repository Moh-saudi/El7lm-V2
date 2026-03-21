import { getAdminDb } from '../src/lib/firebase-admin';
import fetch from 'node-fetch';

async function test() {
  try {
    const db = getAdminDb();
    const docSnap = await db.collection('system_configs').doc('chataman_config').get();
    
    if (!docSnap.exists) {
      console.log('Config not found!');
      return;
    }
    
    const config = docSnap.data();
    const apiKey = config.apiKey;
    const cleanBaseUrl = (config.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '');
    
    console.log('Using API Key:', apiKey.substring(0, 10) + '...');
    console.log('Base URL:', cleanBaseUrl);

    const payload = {
      phone: "+201200000000", // dummy valid number
      template: {
        name: "our_website",
        language: { code: "ar" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: "تحديث" }]
          }
        ]
      }
    };

    const endpoints = [
      '/api/send/template',
      '/api/send-template',
      '/api/v1/send-template'
    ];

    for (const endpoint of endpoints) {
      const url = `${cleanBaseUrl}${endpoint}`;
      console.log(`\n--- Testing Endpoint: ${url} ---`);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response:`, text);
    }

  } catch (e) {
    console.error('Test Crash:', e);
  }
}

test();
