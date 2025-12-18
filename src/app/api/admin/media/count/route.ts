import { getAdminDb } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching media counts...');

    // Skip Firebase calls during build time
    if (process.env.NODE_ENV === 'production' && (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'build_project')) {
      console.log('🚫 [Admin API] Skipping Firebase calls during build phase');
      return NextResponse.json(emptyStats());
    }

    let adminDb;
    try {
      adminDb = getAdminDb();
    } catch (error) {
      console.warn('⚠️ [Admin API] Firebase Admin not configured, returning empty stats');
      return NextResponse.json(emptyStats());
    }

    // Get videos collection
    const videosSnapshot = await adminDb.collection('videos').get();

    const totalVideos = videosSnapshot.size;
    let pendingVideos = 0;
    let approvedVideos = 0;
    let rejectedVideos = 0;

    // Process each video to get status counts
    videosSnapshot.forEach((doc) => {
      const video = doc.data();

      switch (video.status) {
        case 'pending':
          pendingVideos++;
          break;
        case 'approved':
          approvedVideos++;
          break;
        case 'rejected':
          rejectedVideos++;
          break;
      }
    });

    // Get images collection (if exists)
    let totalImages = 0;
    let pendingImages = 0;
    let approvedImages = 0;
    let rejectedImages = 0;

    try {
      const imagesSnapshot = await adminDb.collection('images').get();
      totalImages = imagesSnapshot.size;

      imagesSnapshot.forEach((doc) => {
        const image = doc.data();

        switch (image.status) {
          case 'pending':
            pendingImages++;
            break;
          case 'approved':
            approvedImages++;
            break;
          case 'rejected':
            rejectedImages++;
            break;
        }
      });
    } catch (error) {
      console.log('ℹ️ [Admin API] Images collection not found or empty');
    }

    const response = {
      success: true,
      data: {
        totalVideos,
        totalImages,
        pendingVideos,
        pendingImages,
        approvedVideos,
        approvedImages,
        rejectedVideos,
        rejectedImages,
        totalMedia: totalVideos + totalImages,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('✅ [Admin API] Media counts fetched successfully:', response.data);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error fetching media counts:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch media counts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function emptyStats() {
  return {
    success: true,
    data: {
      totalVideos: 0,
      totalImages: 0,
      pendingVideos: 0,
      pendingImages: 0,
      approvedVideos: 0,
      approvedImages: 0,
      rejectedVideos: 0,
      rejectedImages: 0,
      totalMedia: 0,
      lastUpdated: new Date().toISOString()
    }
  };
}
