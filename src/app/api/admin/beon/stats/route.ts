import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [BeOn Stats API] Request received');

    // Mock stats data for now
    const stats = {
      totalMessages: 1250,
      activeUsers: 45,
      successRate: 98.5,
      lastUpdate: new Date().toISOString(),
      platform: 'BeOn V3',
      status: 'active'
    };

    console.log('📊 [BeOn Stats API] Returning stats:', stats);

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'BeOn stats retrieved successfully'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('❌ [BeOn Stats API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve BeOn stats'
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
