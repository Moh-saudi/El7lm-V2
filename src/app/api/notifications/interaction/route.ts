/**
 * /api/notifications/interaction - Canonical Notifications Edition
 * Backward-compatible adapter routing to the unified 'notifications' table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';

type NotificationType = 'profile_view' | 'video_view' | 'search_result' | 'connection_request' | 'message_sent';

interface NotificationData {
  type: NotificationType;
  profileOwnerId?: string;
  viewerId?: string;
  viewerName?: string;
  viewerType?: string;
  viewerAccountType?: string;
  videoId?: string;
  message?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request);
    if (!authResult.ok) return authResult.response;
    const authUser = authResult.user;

    const body: NotificationData = await request.json();

    if (!body.type) {
      return NextResponse.json({ error: 'نوع الإشعار مطلوب' }, { status: 400 });
    }
    if (!body.profileOwnerId) {
      return NextResponse.json({ error: 'معرف المالك مطلوب' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const db = getSupabaseAdmin();
    const viewerName = body.viewerName || authUser.user_metadata?.full_name || 'مستخدم';

    const notificationRecord = {
      id,
      userId: body.profileOwnerId,
      title: getDefaultTitle(body.type),
      message: body.message || getDefaultMessage(body.type, viewerName),
      type: body.type,
      priority: 'medium',
      read: false,
      isRead: false,
      actionUrl: body.actionUrl || getDefaultActionUrl(body.type, body.profileOwnerId, body.videoId),
      data: {
        viewerId: authUser.id,
        viewerName,
        viewerType: body.viewerType || 'user',
        viewerAccountType: body.viewerAccountType || 'player',
        videoId: body.videoId,
        profileType: body.metadata?.profileType || 'player',
        ...(body.metadata || {}),
      },
      metadata: {
        viewerId: authUser.id,
        viewerName,
        ...(body.metadata || {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await db.from('notifications').insert(notificationRecord);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'تم إرسال الإشعار بنجاح', notificationId: id, type: body.type });
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error);
    return NextResponse.json({ error: 'حدث خطأ في إرسال الإشعار' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request);
    if (!authResult.ok) return authResult.response;
    const authUser = authResult.user;

    const { notificationId, notificationIds, isRead } = await request.json();
    const db = getSupabaseAdmin();
    const readVal = isRead !== undefined ? isRead : true;
    const updatedAt = new Date().toISOString();

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      const { error } = await db
        .from('notifications')
        .update({ isRead: readVal, read: readVal, updatedAt })
        .in('id', notificationIds)
        .eq('userId', authUser.id);
      if (error) throw error;

      return NextResponse.json({ success: true, message: 'تم تحديث الإشعارات بنجاح' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    const { error } = await db
      .from('notifications')
      .update({ isRead: readVal, read: readVal, updatedAt })
      .eq('id', notificationId)
      .eq('userId', authUser.id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'تم تحديث الإشعار بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في تحديث الإشعار:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث الإشعار' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request);
    if (!authResult.ok) return authResult.response;
    const authUser = authResult.user;

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const targetUserId = requestedUserId && requestedUserId === authUser.id ? requestedUserId : authUser.id;
    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');

    const db = getSupabaseAdmin();
    let query = db
      .from('notifications')
      .select('*')
      .eq('userId', targetUserId)
      .order('createdAt', { ascending: false })
      .limit(50);

    if (type) query = query.eq('type', type);
    if (isRead !== null) query = query.eq('isRead', isRead === 'true');

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, notifications: data ?? [], count: (data ?? []).length });
  } catch (error) {
    console.error('❌ خطأ في جلب الإشعارات:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب الإشعارات' }, { status: 500 });
  }
}

function getDefaultTitle(type: NotificationType): string {
  switch (type) {
    case 'profile_view': return 'زيارة جديدة للملف الشخصي 👀';
    case 'video_view': return 'مشاهدة جديدة لفيديوك 🎬';
    case 'search_result': return 'ظهور في نتائج البحث 🔍';
    case 'connection_request': return 'طلب تواصل جديد 🤝';
    case 'message_sent': return 'رسالة جديدة 💬';
    default: return 'إشعار جديد 🔔';
  }
}

function getDefaultMessage(type: NotificationType, viewerName?: string): string {
  const name = viewerName || 'مستخدم';
  switch (type) {
    case 'profile_view': return `شاهد ${name} ملفك الشخصي على منصة الحلم!`;
    case 'video_view': return `شاهد ${name} فيديو من ملفك الشخصي!`;
    case 'search_result': return `ظهر ملفك في نتائج البحث لـ ${name}!`;
    case 'connection_request': return `طلب ${name} التواصل معك!`;
    case 'message_sent': return `أرسل لك ${name} رسالة جديدة!`;
    default: return `إشعار جديد من ${name}!`;
  }
}

function getDefaultActionUrl(type: NotificationType, profileOwnerId?: string, videoId?: string): string {
  switch (type) {
    case 'profile_view': return `/dashboard/player/search/profile/${profileOwnerId}`;
    case 'video_view': return videoId ? `/dashboard/player/videos/${videoId}` : '/dashboard/player/videos';
    case 'search_result': return '/dashboard/player/search';
    case 'connection_request': return '/dashboard/player/messages';
    case 'message_sent': return '/dashboard/player/messages';
    default: return '/dashboard/player';
  }
}
