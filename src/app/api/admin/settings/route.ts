import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const SETTINGS_DOC_ID = 'admin_settings';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching admin settings...');

    // Skip Firebase calls during build time
    if (process.env.NODE_ENV === 'production' && (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'build_project')) {
      console.log('🚫 [Admin API] Skipping Firebase calls during build phase');
      return NextResponse.json({
        success: true,
        data: {
          siteName: 'El7lm',
          siteDescription: 'Football Platform',
          maintenanceMode: false,
          lastUpdated: new Date().toISOString()
        }
      });
    }

    const settingsRef = doc(db, 'admin_settings', SETTINGS_DOC_ID);
    const settingsDoc = await getDoc(settingsRef);

    let settings = {
      siteName: 'El7lm - منصة كرة القدم',
      siteDescription: 'منصة شاملة لإدارة كرة القدم والرياضة',
      maintenanceMode: false,
      registrationEnabled: true,
      emailNotifications: true,
      smsNotifications: true,
      analyticsEnabled: true,
      debugMode: false,
      lastUpdated: new Date().toISOString()
    };

    if (settingsDoc.exists()) {
      settings = { ...settings, ...settingsDoc.data() };
    } else {
      // Create default settings document
      await setDoc(settingsRef, settings);
    }

    const response = {
      success: true,
      data: settings
    };

    console.log('✅ [Admin API] Settings fetched successfully');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error fetching settings:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Updating admin settings...');

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Settings data is required'
        },
        { status: 400 }
      );
    }

    const settingsRef = doc(db, 'admin_settings', SETTINGS_DOC_ID);
    const updatedSettings = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };

    await updateDoc(settingsRef, updatedSettings);

    const response = {
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    };

    console.log('✅ [Admin API] Settings updated successfully');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error updating settings:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
