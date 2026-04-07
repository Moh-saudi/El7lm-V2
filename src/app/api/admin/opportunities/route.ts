import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const DB_COLUMNS = [
  'id', 'organizerId', 'organizerName', 'organizerType', 'organizerAvatar', 
  'title', 'description', 'opportunityType', 'country', 'city', 'salary', 
  'contractDuration', 'requirements', 'positions', 'ageRange', 'deadline', 
  'status', 'isActive', 'isFeatured', 'viewCount', 'currentApplicants', 
  'maxApplicants', 'tags', 'metadata', 'createdAt', 'updatedAt', 'ageMax', 'ageMin', 
  'applicationDeadline', 'durationDays'
];

function preparePayload(body: any, isUpdate = false) {
  const dbPayload: any = {};
  const metadata: any = body.metadata || {};

  // Explicit mappings
  if ('targetPositions' in body && !body.positions) dbPayload.positions = body.targetPositions;

  for (const [key, value] of Object.entries(body)) {
    if (DB_COLUMNS.includes(key)) {
      dbPayload[key] = value;
    } else {
      metadata[key] = value;
    }
  }

  if (Object.keys(metadata).length > 0) {
    dbPayload.metadata = metadata;
  }

  return dbPayload;
}

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    
    // Fetch all opportunities (bypasses RLS)
    const { data: opportunities, error } = await admin
      .from('opportunities')
      .select('*');
    
    if (error) {
      console.error('❌ Admin API: fetch opportunities error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort and restore metadata to root for UI compatibility
    const processed = (opportunities || []).map((opp: any) => ({
      ...(opp.metadata || {}),
      ...opp
    })).sort((a: any, b: any) => {
      const dateA = a.createdAt || a.created_at || '';
      const dateB = b.createdAt || b.created_at || '';
      return dateB > dateA ? 1 : -1;
    });

    return NextResponse.json({ items: processed, count: processed.length });
  } catch (err: any) {
    console.error('❌ Admin API: unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const body = await req.json();
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const initialPayload = {
      id,
      ...body,
      currentApplicants: 0,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const finalPayload = preparePayload(initialPayload);

    const { data, error } = await admin
      .from('opportunities')
      .insert([finalPayload])
      .select()
      .single();

    if (error) {
      console.error('❌ Admin API: create opportunity error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const item = { ...(data.metadata || {}), ...data };
    return NextResponse.json({ item, id });
  } catch (err: any) {
    console.error('❌ Admin API: create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const payload = preparePayload({ ...updates, updatedAt: new Date().toISOString() }, true);

    const { error } = await admin
      .from('opportunities')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('❌ Admin API: update opportunity error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await admin
      .from('opportunities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Admin API: delete opportunity error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
