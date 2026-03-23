import { db } from './src/lib/firebase/config.js';
import { doc, getDoc } from 'firebase/firestore';

async function test() {
  try {
    const docRef = doc(db, 'system_configs', 'chataman_config');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.log("Config not found!");
      return;
    }
    const config = docSnap.data();
    console.log("Config Found. BaseUrl:", config.baseUrl);

    const response = await fetch(`${config.baseUrl || 'https://chataman.com'}/api/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey.trim()}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    console.log("\n--- Full Templates Data ---");
    console.log(JSON.stringify(data, null, 2).substring(0, 4000)); // print first 4000 chars

  } catch (e) {
    console.error("Test error:", e);
  }
}

test();
