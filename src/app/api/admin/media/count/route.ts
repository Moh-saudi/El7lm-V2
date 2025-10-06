import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching media counts...');

    // Get videos collection
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
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
      const imagesRef = collection(db, 'images');
      const imagesSnapshot = await getDocs(imagesRef);
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
