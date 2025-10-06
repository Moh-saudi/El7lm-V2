import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

const BEON_CONFIG_DOC_ID = 'beon_config';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching BeOn configuration...');

    const configRef = doc(db, 'admin_config', BEON_CONFIG_DOC_ID);
    const configDoc = await getDoc(configRef);

    let config = {
      baseUrl: process.env.BEON_BASE_URL || 'https://api.beon.tech',
      apiKey: process.env.BEON_API_KEY || '',
      senderId: process.env.BEON_SENDER_ID || '',
      isConfigured: false,
      lastUpdated: new Date().toISOString()
    };

    if (configDoc.exists()) {
      const data = configDoc.data();
      config = {
        ...config,
        ...data,
        // Don't expose sensitive data in GET request
        apiKey: data.apiKey ? '***' + data.apiKey.slice(-4) : '',
        isConfigured: !!(data.apiKey && data.senderId)
      };
    }

    const response = {
      success: true,
      data: config
    };

    console.log('✅ [Admin API] BeOn configuration fetched successfully');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error fetching BeOn config:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch BeOn configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Updating BeOn configuration...');

    const body = await request.json();
    const { baseUrl, apiKey, senderId, reset } = body;

    if (reset) {
      // Reset to default configuration
      const defaultConfig = {
        baseUrl: process.env.BEON_BASE_URL || 'https://api.beon.tech',
        apiKey: process.env.BEON_API_KEY || '',
        senderId: process.env.BEON_SENDER_ID || '',
        isConfigured: false,
        lastUpdated: new Date().toISOString()
      };

      const configRef = doc(db, 'admin_config', BEON_CONFIG_DOC_ID);
      await setDoc(configRef, defaultConfig);

      return NextResponse.json({
        success: true,
        data: defaultConfig,
        message: 'BeOn configuration reset to defaults'
      });
    }

    if (!apiKey || !senderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'API Key and Sender ID are required'
        },
        { status: 400 }
      );
    }

    const configRef = doc(db, 'admin_config', BEON_CONFIG_DOC_ID);
    const updatedConfig = {
      baseUrl: baseUrl || 'https://api.beon.tech',
      apiKey,
      senderId,
      isConfigured: true,
      lastUpdated: new Date().toISOString()
    };

    await setDoc(configRef, updatedConfig);

    const response = {
      success: true,
      data: {
        ...updatedConfig,
        // Don't expose full API key in response
        apiKey: '***' + apiKey.slice(-4)
      },
      message: 'BeOn configuration updated successfully'
    };

    console.log('✅ [Admin API] BeOn configuration updated successfully');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error updating BeOn config:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update BeOn configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
