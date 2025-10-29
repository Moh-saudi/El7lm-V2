import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

const db = getApps().length ? getFirestore() : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📊 [Analytics API] Request received:', body);

    // استخراج معلومات الزائر
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'Unknown';

    // تحديد الموقع من IP (بشكل بسيط)
    let country = 'غير محدد';
    let city = 'غير محدد';

    // يمكن إضافة خدمة GeoIP لاحقاً
    if (request.geo) {
      country = request.geo.country || 'غير محدد';
      city = request.geo.city || 'غير محدد';
    }

    const analyticsData = {
      event: body.event || 'unknown',
      route: body.route || '/',
      timestamp: new Date(),
      sessionId: body.sessionId || 'unknown',
      userId: body.userId || null,
      country: country,
      city: city,
      ip: ip,
      userAgent: userAgent,
      page: body.route || body.page || '/',
      device: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      processed: true
    };

    console.log('📊 [Analytics API] Processing analytics:', analyticsData);

    // حفظ في Firestore
    if (db) {
      try {
        await db.collection('analytics').add(analyticsData);
        console.log('✅ [Analytics API] Saved to Firestore');
      } catch (firestoreError) {
        console.error('❌ [Analytics API] Firestore error:', firestoreError);
      }
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      message: 'Analytics data processed successfully'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('❌ [Analytics API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to process analytics data'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('📊 [Analytics API] GET request received');

    // Mock analytics summary
    const summary = {
      totalEvents: 1250,
      uniqueUsers: 45,
      lastUpdate: new Date().toISOString(),
      status: 'active'
    };

    return NextResponse.json({
      success: true,
      data: summary,
      message: 'Analytics summary retrieved successfully'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('❌ [Analytics API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve analytics summary'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
