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

    // ✅ جمع المعرف الأساسي لكل مستخدم لمنع تكرار الإشعار للشخص نفسه
    const collectIds = (rows: Array<{ id?: string | null; uid?: string | null; supabase_uid?: string | null }> | null): string[] => {
      const set = new Set<string>();
      (rows || []).forEach(r => {
        const primaryId = (r.supabase_uid && typeof r.supabase_uid === 'string' && r.supabase_uid.trim()) ||
                          (r.id && typeof r.id === 'string' && r.id.trim()) ||
                          (r.uid && typeof r.uid === 'string' && r.uid.trim());
        if (primaryId) {
          set.add(primaryId);
        }
      });
      return Array.from(set);
    };

    if (target === 'custom' && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      const cleanIds = targetUserIds.filter(id => id && id.trim());
      const { data } = await db.from('users').select('id, uid, supabase_uid').in('id', cleanIds);
      const resolved = collectIds(data);
      recipientIds = resolved.length > 0 ? resolved : cleanIds;
    } else {
      // جلب كافة المستخدمين المستهدفين عبر صفحات (Pagination) لضمان تجاوز سقف الـ 1000 مستخدم
      let allRows: Array<{ id?: string | null; uid?: string | null; supabase_uid?: string | null }> = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = db.from('users').select('id, uid, supabase_uid');
        if (target === 'players') {
          query = query.eq('accountType', 'player');
        } else if (target === 'clubs') {
          query = query.eq('accountType', 'club');
        } else if (target === 'academies') {
          query = query.eq('accountType', 'academy');
        } else if (target === 'trainers') {
          query = query.in('accountType', ['trainer', 'coach']);
        } else if (target === 'agents') {
          query = query.in('accountType', ['agent', 'marketer']);
        }

        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allRows.push(...data);
          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            from += PAGE_SIZE;
          }
        }
      }
      recipientIds = collectIds(allRows);
    }

    const now = new Date().toISOString();

    // ✅ إدراج فوري في جدول broadcasts لضمان وصوله لجميع مستخدمي تطبيق الجوال والويب عبر Realtime وقنوات البث العامة
    if (target !== 'custom') {
      try {
        await db.from('broadcasts').insert({
          id: crypto.randomUUID(),
          title: title.trim(),
          message: message.trim(),
          eventType: type || 'broadcast',
          targetType: target,
          actionUrl: actionUrl?.trim() || null,
          createdAt: now,
          data: {
            priority,
            target,
            actionUrl: actionUrl?.trim() || null,
          },
        });
      } catch (bcError) {
        console.error('Error inserting into broadcasts table:', bcError);
      }
    }

    if (recipientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'لم يتم العثور على أي مستخدمين مستهدفين' },
        { status: 404 }
      );
    }

    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
      const batchIds = recipientIds.slice(i, i + BATCH_SIZE);
      const batchRecords = batchIds.map(uid => ({
        id: crypto.randomUUID(),
        userId: uid,            // ← users.id = Supabase Auth UID = user.id في الواجهة ✅
        title: title.trim(),
        message: message.trim(),
        body: message.trim(),
        type,
        priority,
        read: false,
        isRead: false,
        actionUrl: actionUrl?.trim() || null,
        link: actionUrl?.trim() || null,
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
      message: `تم إرسال الإشعار بنجاح إلى ${insertedCount} مستخدم وبثه للمنصة بالكامل`,
      count: insertedCount,
    });
  } catch (error: any) {
    console.error('Admin send notification error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'فشل في إرسال الإشعارات' },
      { status: 500 }
    );
  }
}
