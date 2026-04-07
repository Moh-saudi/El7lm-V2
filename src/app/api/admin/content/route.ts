import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({ success: true, data: { items: [], total: 0, lastUpdated: new Date().toISOString() } });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('content')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { items: data ?? [], total: (data ?? []).length, lastUpdated: new Date().toISOString() },
    });
  } catch (error) {
    console.error('❌ [Admin API] Error fetching content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content, type, status } = await request.json();
    if (!title || !content || !type) {
      return NextResponse.json({ success: false, error: 'Title, content, and type are required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newContent = { id, title, content, type, status: status || 'draft', createdAt: now, updatedAt: now };

    const { error } = await db.from('content').insert(newContent);
    if (error) throw error;

    return NextResponse.json({ success: true, data: newContent, message: 'Content created successfully' });
  } catch (error) {
    console.error('❌ [Admin API] Error creating content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, title, content, type, status } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });

    const db = getSupabaseAdmin();
    const updatedContent = {
      ...(title && { title }), ...(content && { content }),
      ...(type && { type }), ...(status && { status }),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await db.from('content').update(updatedContent).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, data: { id, ...updatedContent }, message: 'Content updated successfully' });
  } catch (error) {
    console.error('❌ [Admin API] Error updating content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { error } = await db.from('content').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('❌ [Admin API] Error deleting content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
