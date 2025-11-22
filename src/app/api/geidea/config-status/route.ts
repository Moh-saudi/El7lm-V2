import { NextResponse } from 'next/server';

import { getGeideaEnvConfig, getGeideaMode } from '@/lib/geidea/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const summarize = (mode: 'live' | 'test') => {
  const env = getGeideaEnvConfig(mode);
  return {
    hasMerchantKey: Boolean(env.merchantPublicKey),
    hasApiPassword: Boolean(env.apiPassword),
    baseUrl: env.baseUrl,
    callbackUrl: env.callbackUrl || 'غير محدد',
  };
};

export async function GET() {
  try {
    const activeMode = await getGeideaMode();

    return NextResponse.json({
      success: true,
      mode: activeMode,
      config: {
        live: summarize('live'),
        test: summarize('test'),
      },
    });
  } catch (error) {
    console.error('❌ [Geidea Config Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read Geidea configuration',
      },
      { status: 500 }
    );
  }
}

