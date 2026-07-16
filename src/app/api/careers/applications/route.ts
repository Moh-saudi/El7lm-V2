import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAdmin(request);
    if (!authorization.ok) return authorization.response;

    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return withPrivateResponseHeaders(NextResponse.json({ success: true, items: [] }));
    }

    const db = getSupabaseAdmin();
    const tables = ['career_applications', 'careerApplications'];
    const allItems: unknown[] = [];

    for (const table of tables) {
      try {
        const { data } = await db.from(table).select('*').order('createdAt', { ascending: false });
        const items = (data ?? []).filter((row: Record<string, unknown>) => row.fullName || row.email || row.phone);
        if (items.length > 0) allItems.push(...items);
      } catch {}
    }

    allItems.sort((a: unknown, b: unknown) => {
      const aRow = a as Record<string, unknown>;
      const bRow = b as Record<string, unknown>;
      return new Date(String(bRow.createdAt ?? 0)).getTime() - new Date(String(aRow.createdAt ?? 0)).getTime();
    });

    return withPrivateResponseHeaders(NextResponse.json({ success: true, items: allItems }));
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch applications', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requiredFields = ['fullName', 'email', 'phone'];
    const missing = requiredFields.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one role must be selected' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const applicationData = {
      id,
      fullName: body.fullName, email: body.email, phone: body.phone,
      country: body.country || '', governorate: body.governorate || '',
      experience: body.experience || '', linkedin: body.linkedin || '',
      facebook: body.facebook || '', notes: body.notes || '',
      roles: body.roles, role: body.role || body.roles[0],
      createdAt: now, status: 'pending',
    };

    const { error } = await db.from('career_applications').insert(applicationData);
    if (error) throw error;

    return NextResponse.json({ success: true, id, message: 'Application submitted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to submit application', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
