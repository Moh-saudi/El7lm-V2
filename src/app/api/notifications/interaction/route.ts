import { db } from '@/lib/firebase/config';
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// أنواع الإشعارات المدعومة
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
  metadata?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationData = await request.json();

    console.log('📨 استلام طلب إشعار تفاعلي:', body);

    // التحقق من البيانات المطلوبة
    if (!body.type) {
      return NextResponse.json(
        { error: 'نوع الإشعار مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود معرف المالك أو المشاهد
    if (!body.profileOwnerId && !body.viewerId) {
      return NextResponse.json(
        { error: 'معرف المالك أو المشاهد مطلوب' },
        { status: 400 }
      );
    }

    // إنشاء بيانات الإشعار
    const notificationData = {
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
        // إضافة profileType من metadata أو من body مباشرة
        profileType: body.metadata?.profileType || (body as any).profileType || 'player',
        profileOwnerId: body.profileOwnerId,
        viewerId: body.viewerId
      },
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // إضافة الإشعار إلى Firestore
    const notificationsRef = collection(db, 'interaction_notifications');
    const docRef = await addDoc(notificationsRef, notificationData);

    console.log('✅ تم إنشاء الإشعار بنجاح:', docRef.id);

    // إرسال إشعار SMS إذا كان نوع مشاهدة الملف الشخصي
    if (body.type === 'profile_view' && body.profileOwnerId) {
      try {
        await sendSMSNotification(body.profileOwnerId, notificationData.message);
      } catch (smsError) {
        console.warn('⚠️ فشل في إرسال SMS:', smsError);
        // لا نوقف العملية إذا فشل SMS
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      notificationId: docRef.id,
      type: body.type
    });

  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إرسال الإشعار' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { notificationId, isRead } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: 'معرف الإشعار مطلوب' },
        { status: 400 }
      );
    }

    // تحديث حالة القراءة
    const notificationRef = doc(db, 'interaction_notifications', notificationId);
    await updateDoc(notificationRef, {
      isRead: isRead !== undefined ? isRead : true,
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث الإشعار بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث الإشعار:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث الإشعار' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    // بناء الاستعلام
    let q = query(collection(db, 'interaction_notifications'));

    if (type) {
      q = query(q, where('type', '==', type));
    }

    if (isRead !== null) {
      q = query(q, where('isRead', '==', isRead === 'true'));
    }

    // جلب الإشعارات
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('❌ خطأ في جلب الإشعارات:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب الإشعارات' },
      { status: 500 }
    );
  }
}

// دالة للحصول على الرسالة الافتراضية
function getDefaultMessage(type: NotificationType, viewerName?: string): string {
  const name = viewerName || 'مستخدم';

  switch (type) {
    case 'profile_view':
      return `شاهد ${name} ملفك الشخصي على منصة الحلم!`;
    case 'video_view':
      return `شاهد ${name} فيديو من ملفك الشخصي!`;
    case 'search_result':
      return `ظهر ملفك في نتائج البحث لـ ${name}!`;
    case 'connection_request':
      return `طلب ${name} التواصل معك!`;
    case 'message_sent':
      return `أرسل لك ${name} رسالة جديدة!`;
    default:
      return `إشعار جديد من ${name}!`;
  }
}

// دالة للحصول على رابط العمل الافتراضي
function getDefaultActionUrl(type: NotificationType, profileOwnerId?: string, videoId?: string): string {
  switch (type) {
    case 'profile_view':
      return `/dashboard/player/search/profile/${profileOwnerId}`;
    case 'video_view':
      return videoId ? `/dashboard/player/videos/${videoId}` : '/dashboard/player/videos';
    case 'search_result':
      return '/dashboard/player/search';
    case 'connection_request':
      return '/dashboard/player/messages';
    case 'message_sent':
      return '/dashboard/player/messages';
    default:
      return '/dashboard/player';
  }
}

// دالة لإرسال إشعار SMS
async function sendSMSNotification(profileOwnerId: string, message: string) {
  try {
    // جلب بيانات المالك
    const userRef = collection(db, 'users');
    const userQuery = query(userRef, where('uid', '==', profileOwnerId));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      console.warn('⚠️ لم يتم العثور على المستخدم:', profileOwnerId);
      return;
    }

    const userData = userSnapshot.docs[0].data();
    const phoneNumber = userData.phone;

    if (!phoneNumber) {
      console.warn('⚠️ لا يوجد رقم هاتف للمستخدم:', profileOwnerId);
      return;
    }

    // إرسال SMS
    const smsResponse = await fetch('/api/notifications/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        message: message,
        type: 'interaction_notification'
      })
    });

    if (smsResponse.ok) {
      console.log('✅ تم إرسال SMS بنجاح للمستخدم:', profileOwnerId);
    } else {
      console.warn('⚠️ فشل في إرسال SMS:', await smsResponse.text());
    }

  } catch (error) {
    console.error('❌ خطأ في إرسال SMS:', error);
  }
}
