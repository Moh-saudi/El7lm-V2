import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const SAFE_PUBLIC_PLAYER_COLUMNS = [
  'id',
  'uid',
  'full_name',
  'name',
  'primary_position',
  'secondary_position',
  'position',
  'birth_date',
  'nationality',
  'country',
  'city',
  'height',
  'weight',
  'preferred_foot',
  'profile_image',
  'profile_image_url',
  'current_club',
  'brief',
  'isDeleted',
  'isActive',
  'created_at',
  'updated_at',
].join(',');

function calculateAge(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age < 100 ? age : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Pagination parameters
    const rawLimit = parseInt(searchParams.get('limit') || '25', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 25 : rawLimit), 50);
    const page = parseInt(searchParams.get('page') || '1', 10);

    // 2. Filter parameters
    const position = searchParams.get('position')?.trim();
    const city = searchParams.get('city')?.trim();
    const country = searchParams.get('country')?.trim();
    const search = searchParams.get('search')?.trim();

    const admin = getSupabaseAdmin();

    let query = admin
      .from('players')
      .select(SAFE_PUBLIC_PLAYER_COLUMNS, { count: 'exact' });

    // Exclude deleted records safely (where isDeleted is null or false)
    query = query.or('isDeleted.is.null,isDeleted.eq.false');

    // Apply filters on physical columns
    if (position) {
      query = query.or(`position.ilike.%${position}%,primary_position.ilike.%${position}%,secondary_position.ilike.%${position}%`);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (country) {
      query = query.ilike('country', `%${country}%`);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,name.ilike.%${search}%,brief.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by updated_at or id
    query = query.order('updated_at', { ascending: false, nullsFirst: false });

    const { data: rows, count: totalCount, error } = await query;

    if (error) {
      console.error('Error fetching players:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    const items: any[] = (rows as any[]) || [];
    const hasMore = (page * limit) < (totalCount || 0);

    // Normalize data shape for frontend & mobile consumers
    const formattedPlayers = items.map((p: any) => {
      const displayName = p.full_name || p.name || 'لاعب';
      const displayAvatar = p.profile_image_url || p.profile_image || null;
      const displayPosition = p.position || p.primary_position || 'لاعب';
      const displayClub = p.current_club || null;
      const displayFoot = p.preferred_foot || null;
      const calculatedAge = calculateAge(p.birth_date);
      const isActive = p.isActive !== false;

      return {
        id: p.id,
        uid: p.uid || p.id,
        name: displayName,
        fullName: displayName,
        position: displayPosition,
        secondaryPosition: p.secondary_position || null,
        age: calculatedAge,
        dateOfBirth: p.birth_date || null,
        birthDate: p.birth_date || null,
        nationality: p.nationality || p.country || '',
        country: p.country || '',
        city: p.city || '',
        height: p.height || null,
        weight: p.weight || null,
        preferredFoot: displayFoot,
        avatar: displayAvatar,
        profileImageUrl: displayAvatar,
        currentClub: displayClub,
        bio: p.brief || '',
        isActive,
        createdAt: p.created_at || p.updated_at || null,
        updatedAt: p.updated_at || null,
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
          page,
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
