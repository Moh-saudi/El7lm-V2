import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching ads counts...');

    // Skip Firebase calls during build time
    if (process.env.NODE_ENV === 'production' && !process.env.FIREBASE_PROJECT_ID) {
      console.log('🚫 [Admin API] Skipping Firebase calls during build phase');
      return NextResponse.json({
        success: true,
        data: {
          totalAds: 0,
          activeAds: 0,
          inactiveAds: 0,
          totalViews: 0,
          totalClicks: 0,
          clickThroughRate: 0,
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // Get ads collection
    const adsRef = collection(db, 'ads');
    const snapshot = await getDocs(adsRef);

    const totalAds = snapshot.size;
    let activeAds = 0;
    let totalViews = 0;
    let totalClicks = 0;

    // Process each ad to get detailed stats
    snapshot.forEach((doc) => {
      const ad = doc.data();

      if (ad.isActive) {
        activeAds++;
      }

      if (ad.views) {
        totalViews += ad.views;
      }

      if (ad.clicks) {
        totalClicks += ad.clicks;
      }
    });

    const response = {
      success: true,
      data: {
        totalAds,
        activeAds,
        inactiveAds: totalAds - activeAds,
        totalViews,
        totalClicks,
        clickThroughRate: totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(2) : 0,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('✅ [Admin API] Ads counts fetched successfully:', response.data);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error fetching ads counts:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch ads counts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
