/**
 * /api/notifications/interaction - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';
import { NextRequest, NextResponse } from 'next/server';

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
    const body: NotificationData = await request.json();

    if (!body.type) {
      return NextResponse.json({ error: 'نوع الإشعار مطلوب' }, { status: 400 });
    }
    if (!body.profileOwnerId && !body.viewerId) {
      return NextResponse.json({ error: 'معرف المالك أو المشاهد مطلوب' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const notificationData = {
      id,
      type: body.type,
      profileOwnerId: body.profileOwnerId,
      viewerId: body.viewerId,
      viewerName: body.viewerName || 'مستخدم',
      viewerType: body.viewerType || 'user',
      viewerAccountType: body.viewerAccountType || 'player',
      videoId: body.videoId,
      message: body.message || getDefaultMessage(body.type, body.viewerName),
      actionUrl: body.actionUrl || getDefaultActionUrl(body.type, body.profileOwnerId, body.videoId),
      metadata: {
        ...(body.metadata || {}),
        profileType: body.metadata?.profileType || 'player',
        profileOwnerId: body.profileOwnerId,
        viewerId: body.viewerId,
      },
      isRead: false,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('interaction_notifications').insert(notificationData);
    if (error) throw error;

    if (body.type === 'profile_view' && body.profileOwnerId) {
      try {
        await sendSMSNotification(body.profileOwnerId, notificationData.message);
      } catch (smsError) {
        console.warn('⚠️ فشل في إرسال SMS:', smsError);
      }
    }

    return NextResponse.json({ success: true, message: 'تم إرسال الإشعار بنجاح', notificationId: id, type: body.type });
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error);
    return NextResponse.json({ error: 'حدث خطأ في إرسال الإشعار' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { notificationId, isRead } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 });
    }

    const { error } = await supabase
      .from('interaction_notifications')
      .update({ isRead: isRead !== undefined ? isRead : true, updatedAt: new Date().toISOString() })
      .eq('id', notificationId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'تم تحديث الإشعار بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في تحديث الإشعار:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث الإشعار' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    let query = supabase
      .from('interaction_notifications')
      .select('*')
      .eq('profileOwnerId', userId)
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

async function sendSMSNotification(profileOwnerId: string, message: string) {
  try {
    const { data } = await supabase.from('users').select('phone').eq('id', profileOwnerId).limit(1);
    if (!data?.length) return;

    const phoneNumber = (data[0] as Record<string, unknown>).phone;
    if (!phoneNumber) return;

    await fetch('/api/notifications/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, message, type: 'interaction_notification' }),
    });
  } catch (error) {
    console.error('❌ خطأ في إرسال SMS:', error);
  }
}
