import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const BEON_CONFIG_DOC_ID = 'beon_config';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching BeOn account info...');

    // Get BeOn configuration
    const configRef = doc(db, 'admin_config', BEON_CONFIG_DOC_ID);
    const configDoc = await getDoc(configRef);

    if (!configDoc.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: 'BeOn configuration not found',
          details: 'Please configure BeOn settings first'
        },
        { status: 404 }
      );
    }

    const config = configDoc.data();
    
    if (!config.apiKey || !config.senderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'BeOn not properly configured',
          details: 'API Key and Sender ID are required'
        },
        { status: 400 }
      );
    }

    // Mock account info (in real implementation, this would call BeOn API)
    const accountInfo = {
      accountId: config.senderId,
      accountName: 'El7lm Platform',
      status: 'active',
      balance: {
        sms: 1000,
        whatsapp: 500,
        currency: 'SAR'
      },
      limits: {
        dailySms: 10000,
        dailyWhatsapp: 5000,
        monthlySms: 300000,
        monthlyWhatsapp: 150000
      },
      usage: {
        todaySms: 45,
        todayWhatsapp: 12,
        thisMonthSms: 1250,
        thisMonthWhatsapp: 320
      },
      lastUpdated: new Date().toISOString()
    };

    const response = {
      success: true,
      data: accountInfo
    };

    console.log('✅ [Admin API] BeOn account info fetched successfully');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error fetching BeOn account info:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch BeOn account info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
