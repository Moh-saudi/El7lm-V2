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

    const payload = {
      phone: "+201017799580",
      template: {
        name: "account_suspension_warning",
        language: { code: "ar" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: "سالم محمود سالم" }]
          }
        ]
      }
    };

    console.log("Sending backend fetch request...");
    const response = await fetch(`${config.baseUrl || 'https://chataman.com'}/api/send/template`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${config.apiKey.trim()}`,
         'Content-Type': 'application/json',
         'Accept': 'application/json'
       },
       body: JSON.stringify(payload)
    });

    console.log("Response Status:", response.status);
    const text = await response.text();
    console.log("Response Text:", text);

  } catch (e: any) {
    console.error("Fetch Crash Dump Stack:", e);
  }
}

test();
