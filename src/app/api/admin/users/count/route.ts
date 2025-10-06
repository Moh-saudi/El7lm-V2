import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching user counts...');

    // Skip Firebase calls during build time only
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('🚫 [Admin API] Skipping Firebase calls during build phase');
      return NextResponse.json({
        success: true,
        data: {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          breakdown: {
            users: 0,
            players: 0,
            clubs: 0,
            academies: 0,
            agents: 0,
            trainers: 0
          },
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // Get counts from all user collections with timeout
    const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
    const counts: Record<string, number> = {};
    let totalUsers = 0;

    for (const collectionName of collections) {
      try {
        // Add timeout for each collection query
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 5000); // 5 second timeout
        });

        const collectionRef = collection(db, collectionName);
        const queryPromise = getDocs(collectionRef);

        const snapshot = await Promise.race([queryPromise, timeoutPromise]);
        const count = snapshot.size;
        counts[collectionName] = count;
        totalUsers += count;
        console.log(`📊 [Admin API] ${collectionName}: ${count} users`);
      } catch (error) {
        console.error(`❌ [Admin API] Error counting ${collectionName}:`, error);
        counts[collectionName] = 0;
      }
    }

    // Get active users count with timeout
    let activeUsers = 0;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Active users query timeout')), 5000);
      });

      const activeQuery = query(collection(db, 'users'), where('isActive', '==', true));
      const queryPromise = getDocs(activeQuery);

      const activeSnapshot = await Promise.race([queryPromise, timeoutPromise]);
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
