import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const manifest = {
      "name": "El7lm - منصة كرة القدم",
      "short_name": "El7lm",
      "description": "منصة شاملة لإدارة كرة القدم والرياضة",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#6d28d9",
      "orientation": "portrait-primary",
      "scope": "/",
      "lang": "ar",
      "dir": "rtl",
      "categories": ["sports", "business", "lifestyle"],
      "icons": [
        {
          "src": "/favicon.ico",
          "sizes": "32x32",
          "type": "image/x-icon"
        },
        {
          "src": "/favicon.ico",
          "sizes": "16x16",
          "type": "image/x-icon"
        },
        {
          "src": "/favicon.ico",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any maskable"
        },
        {
          "src": "/favicon.ico",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any maskable"
        }
      ],
      "shortcuts": [
        {
          "name": "لوحة التحكم",
          "short_name": "Dashboard",
          "description": "الوصول السريع للوحة التحكم",
          "url": "/dashboard",
          "icons": [
            {
              "src": "/favicon.ico",
              "sizes": "96x96"
            }
          ]
        },
        {
          "name": "اللاعبين",
          "short_name": "Players",
          "description": "إدارة اللاعبين",
          "url": "/dashboard/players",
          "icons": [
            {
              "src": "/favicon.ico",
              "sizes": "96x96"
            }
          ]
        },
        {
          "name": "الأندية",
          "short_name": "Clubs",
          "description": "إدارة الأندية",
          "url": "/dashboard/clubs",
          "icons": [
            {
              "src": "/favicon.ico",
              "sizes": "96x96"
            }
          ]
        }
      ]
    };

    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error serving manifest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
