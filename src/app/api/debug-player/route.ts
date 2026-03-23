import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import dns from 'dns';

// 🌐 Force IPv4 looking purely for local Next node socket buffers on Windows
dns.setDefaultResultOrder('ipv4first');

export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();
    const configSnap = await db.collection('system_configs').doc('chataman_config').get();
    const config = configSnap.exists ? configSnap.data() : null;
    
    if (!config) {
       return NextResponse.json({ success: false, error: 'Config document chataman_config not found' });
    }

    const targetUrl = `${(config.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '')}/api/templates`;
    
    try {
       // 🚨 Bypass SSL verification strictly on dev server network buffers
       process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

       const response = await fetch(targetUrl, {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${config.apiKey.trim()}`,
           'Accept': 'application/json',
           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
         }
       });
       const text = await response.text();
       return NextResponse.json({ 
         success: true, 
         url: targetUrl, 
         status: response.status, 
         body: text.substring(0, 500) 
       });
    } catch (e: any) {
       return NextResponse.json({ success: false, error: `Fetch Crash: ${e.message}`, stack: e.stack, cause: e.cause ? e.cause.message : 'No cause' });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
