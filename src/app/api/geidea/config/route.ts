import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('⚙️ [Geidea Config] Getting configuration');

    // إعدادات Geidea العامة (بدون معلومات حساسة)
    const config = {
      environment: process.env.GEIDEA_ENVIRONMENT || 'sandbox',
      baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.geidea.net',
      supportedCurrencies: ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'EGP'],
      supportedLanguages: ['ar', 'en'],
      supportedCountries: ['SA', 'AE', 'EG', 'KW', 'QA', 'BH', 'OM'],
      features: {
        applePay: process.env.GEIDEA_APPLE_PAY_ENABLED === 'true',
        googlePay: process.env.GEIDEA_GOOGLE_PAY_ENABLED === 'true',
        stcPay: process.env.GEIDEA_STC_PAY_ENABLED === 'true',
        mada: process.env.GEIDEA_MADA_ENABLED === 'true',
        visa: process.env.GEIDEA_VISA_ENABLED === 'true',
        mastercard: process.env.GEIDEA_MASTERCARD_ENABLED === 'true'
      },
      limits: {
        minAmount: 1,
        maxAmount: 100000,
        defaultCurrency: 'SAR'
      }
    };

    console.log('✅ [Geidea Config] Configuration retrieved:', {
      environment: config.environment,
      supportedCurrencies: config.supportedCurrencies.length,
      features: Object.keys(config.features).length
    });

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('❌ [Geidea Config] Error getting configuration:', error);

    return NextResponse.json(
      {
        error: 'Failed to get configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// دعم OPTIONS للـ CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
