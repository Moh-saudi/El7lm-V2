import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching user counts...');

    // Get counts from all user collections
    const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
    const counts: Record<string, number> = {};
    let totalUsers = 0;

    for (const collectionName of collections) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        const count = snapshot.size;
        counts[collectionName] = count;
        totalUsers += count;
        console.log(`📊 [Admin API] ${collectionName}: ${count} users`);
      } catch (error) {
        console.error(`❌ [Admin API] Error counting ${collectionName}:`, error);
        counts[collectionName] = 0;
      }
    }

    // Get active users count
    let activeUsers = 0;
    try {
      const activeQuery = query(collection(db, 'users'), where('isActive', '==', true));
      const activeSnapshot = await getDocs(activeQuery);
      activeUsers = activeSnapshot.size;
    } catch (error) {
      console.error('❌ [Admin API] Error counting active users:', error);
    }

    const response = {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        breakdown: counts,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('✅ [Admin API] User counts fetched successfully:', response.data);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error fetching user counts:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user counts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
