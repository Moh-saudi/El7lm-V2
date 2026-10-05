import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

interface SendNotificationBody {
  target: 'all' | 'players' | 'clubs' | 'academies' | 'trainers' | 'agents' | 'custom';
  targetUserIds?: string[];
  title: string;
  message: string;
  type?: string;
  priority?: string;
  actionUrl?: string;
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body: SendNotificationBody = await req.json();
    const { target, targetUserIds, title, message, type = 'system', priority = 'normal', actionUrl } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ success: false, error: 'العنوان ونص الإشعار مطلوبان' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    let recipientIds: string[] = [];

    if (target === 'custom' && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      recipientIds = Array.from(new Set(targetUserIds));
    } else if (target === 'players') {
      const [{ data: uRows }, { data: pRows }] = await Promise.all([
        db.from('users').select('id').eq('accountType', 'player'),
        db.from('players').select('id'),
      ]);
      const set = new Set<string>();
      (uRows || []).forEach(r => r.id && set.add(r.id));
      (pRows || []).forEach(r => r.id && set.add(r.id));
      recipientIds = Array.from(set);
    } else if (target === 'clubs') {
      const { data } = await db.from('clubs').select('id');
      recipientIds = (data || []).map(r => r.id).filter(Boolean);
    } else if (target === 'academies') {
      const { data } = await db.from('academies').select('id');
      recipientIds = (data || []).map(r => r.id).filter(Boolean);
    } else if (target === 'trainers') {
      const { data } = await db.from('trainers').select('id');
      recipientIds = (data || []).map(r => r.id).filter(Boolean);
    } else if (target === 'agents') {
      const { data } = await db.from('agents').select('id');
      recipientIds = (data || []).map(r => r.id).filter(Boolean);
    } else {
      // 'all'
      const { data } = await db.from('users').select('id');
      recipientIds = (data || []).map(r => r.id).filter(Boolean);
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على أي مستخدمين مستهدفين' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
      const batchIds = recipientIds.slice(i, i + BATCH_SIZE);
      const batchRecords = batchIds.map(uid => ({
        id: crypto.randomUUID(),
        userId: uid,
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        read: false,
        isRead: false,
        actionUrl: actionUrl?.trim() || undefined,
        data: actionUrl?.trim() ? { actionUrl: actionUrl.trim() } : {},
        metadata: actionUrl?.trim() ? { actionUrl: actionUrl.trim() } : {},
        createdAt: now,
        updatedAt: now,
      }));

      const { error } = await db.from('notifications').insert(batchRecords);
      if (error) {
        console.error('Batch notification insert error:', error);
      } else {
        insertedCount += batchRecords.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال الإشعار بنجاح إلى ${insertedCount} مستخدم`,
      count: insertedCount,
    });
  } catch (error: any) {
    console.error('Admin send notification error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'فشل في إرسال الإشعارات' }, { status: 500 });
  }
}
