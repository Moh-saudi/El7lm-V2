import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const DEFAULT_SETTINGS = {
  siteName: 'El7lm - منصة كرة القدم',
  siteDescription: 'منصة شاملة لإدارة كرة القدم والرياضة',
  maintenanceMode: false,
  registrationEnabled: true,
  emailNotifications: true,
  smsNotifications: true,
  analyticsEnabled: true,
  debugMode: false,
};

export async function GET() {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({ success: true, data: { ...DEFAULT_SETTINGS, lastUpdated: new Date().toISOString() } });
    }

    const db = getSupabaseAdmin();
    const { data } = await db.from('settings').select('*').limit(1).single();

    const settings = { ...DEFAULT_SETTINGS, ...(data || {}), lastUpdated: new Date().toISOString() };

    if (!data) {
      try { await db.from('settings').insert({ id: 'admin_settings', ...DEFAULT_SETTINGS }); } catch { /* ignore duplicate */ }
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();
    if (!settings) return NextResponse.json({ success: false, error: 'Settings data is required' }, { status: 400 });

    const db = getSupabaseAdmin();
    const updatedSettings = { ...settings, lastUpdated: new Date().toISOString() };

    await db.from('settings').upsert({ id: 'admin_settings', ...updatedSettings });

    return NextResponse.json({ success: true, data: updatedSettings, message: 'Settings updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update settings', details: error.message }, { status: 500 });
  }
}
