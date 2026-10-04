import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const SAFE_PUBLIC_PLAYER_COLUMNS = [
  'id',
  'uid',
  'name',
  'full_name',
  'position',
  'primary_position',
  'secondary_position',
  'age',
  'date_of_birth',
  'birth_date',
  'birthDate',
  'nationality',
  'country',
  'city',
  'height',
  'weight',
  'preferred_foot',
  'preferredFoot',
  'profile_image',
  'profile_image_url',
  'profileImageUrl',
  'avatar_url',
  'rating',
  'market_value',
  'marketValue',
  'current_club',
  'currentClub',
  'bio',
  'is_verified',
  'isVerified',
  'isActive',
  'createdAt',
  'created_at',
].join(',');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Pagination parameters
    const rawLimit = parseInt(searchParams.get('limit') || '25', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 25 : rawLimit), 50);
    const cursor = searchParams.get('cursor');
    const page = parseInt(searchParams.get('page') || '1', 10);

    // 2. Filter parameters
    const position = searchParams.get('position')?.trim();
    const city = searchParams.get('city')?.trim();
    const country = searchParams.get('country')?.trim();
    const search = searchParams.get('search')?.trim();
    const minAge = parseInt(searchParams.get('minAge') || '', 10);
    const maxAge = parseInt(searchParams.get('maxAge') || '', 10);

    const admin = getSupabaseAdmin();

    let query = admin
      .from('players')
      .select(SAFE_PUBLIC_PLAYER_COLUMNS, { count: 'exact' });

    // Exclude deleted or soft-deleted records
    query = query.neq('isDeleted', true);

    // Apply filters
    if (position) {
      query = query.or(`position.ilike.%${position}%,primary_position.ilike.%${position}%`);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (country) {
      query = query.ilike('country', `%${country}%`);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,name.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    if (!isNaN(minAge)) {
      query = query.gte('age', minAge);
    }

    if (!isNaN(maxAge)) {
      query = query.lte('age', maxAge);
    }

    // Cursor pagination (by createdAt)
    if (cursor) {
      query = query.lt('createdAt', cursor);
    } else if (page > 1) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    } else {
      query = query.limit(limit + 1);
    }

    query = query.order('createdAt', { ascending: false });

    const { data: rows, count: totalCount, error } = await query;

    if (error) {
      console.error('Error fetching players:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    let items: any[] = (rows as any[]) || [];
    let hasMore = false;
    let nextCursor: string | null = null;

    if (!cursor && page <= 1) {
      if (items.length > limit) {
        hasMore = true;
        items = items.slice(0, limit);
        nextCursor = items[items.length - 1]?.createdAt || null;
      }
    } else if (cursor) {
      hasMore = items.length === limit;
      nextCursor = items.length > 0 ? items[items.length - 1]?.createdAt : null;
    } else {
      hasMore = (page * limit) < (totalCount || 0);
    }

    // Normalize data shape for frontend & mobile consumers
    const formattedPlayers = items.map((p: any) => {
      const displayName = p.full_name || p.name || 'لاعب';
      const displayAvatar = p.profile_image_url || p.profile_image || p.profileImageUrl || p.avatar_url || null;
      const displayPosition = p.position || p.primary_position || 'لاعب';
      const displayClub = p.current_club || p.currentClub || null;
      const displayFoot = p.preferred_foot || p.preferredFoot || null;
      const isVerified = p.is_verified ?? p.isVerified ?? false;
      const isActive = p.isActive !== false;

      return {
        id: p.id,
        uid: p.uid || p.id,
        name: displayName,
        fullName: displayName,
        position: displayPosition,
        secondaryPosition: p.secondary_position || null,
        age: p.age || null,
        dateOfBirth: p.date_of_birth || p.birth_date || p.birthDate || null,
        nationality: p.nationality || p.country || '',
        country: p.country || '',
        city: p.city || '',
        height: p.height || null,
        weight: p.weight || null,
        preferredFoot: displayFoot,
        avatar: displayAvatar,
        profileImageUrl: displayAvatar,
        rating: p.rating || null,
        marketValue: p.market_value || p.marketValue || null,
        currentClub: displayClub,
        bio: p.bio || '',
        isVerified,
        isActive,
        createdAt: p.createdAt || p.created_at || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: formattedPlayers,
        pagination: {
          count: formattedPlayers.length,
          total: totalCount ?? formattedPlayers.length,
          hasMore,
          nextCursor,
          limit,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/players:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
