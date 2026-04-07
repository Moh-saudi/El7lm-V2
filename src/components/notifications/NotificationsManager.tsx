'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import NotificationsList from './NotificationsList';
import { playNotificationSound, getSoundTypeFromNotificationType, enableSoundForMobile } from '@/lib/notifications/sound-notifications';
import { resolveAvatarUrl, normalizeNotificationMetadata, SenderContext } from '@/lib/notifications/sender-utils';
import { getSupabaseImageUrl } from '@/lib/supabase/image-utils';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  scope: 'system' | 'club' | 'academy' | 'trainer' | string;
  organizationId?: string;
  createdAt: any;
  updatedAt: any;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderAccountType?: string;
  actionType?: 'profile_view' | 'message_sent' | 'connection_request' | 'follow' | 'like' | 'comment';
}

type SenderInfo = {
  senderName: string | null;
  senderAvatar: string | null;
  senderAccountType?: string;
};

interface NotificationsManagerProps {
  title?: string;
  description?: string;
  showSenderInfo?: boolean;
  showStats?: boolean;
  showFilters?: boolean;
  showTestButtons?: boolean;
  accountType?: string;
}

const generateAvatarFromName = (name?: string | null) => {
  if (!name) return null;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=FFFFFF`;
};

// الحصول على معلومات المرسل المبدئية من بيانات الإشعار
const getInitialSenderInfo = (data: Notification): SenderInfo => {
  const metadata = normalizeNotificationMetadata(data.metadata) || {};
  const fallbackName =
    data.senderName ||
    metadata.senderName ||
    metadata.viewerName ||
    metadata.profileOwnerName ||
    metadata.userName ||
    metadata.title ||
    'مستخدم';

  const fallbackAvatar =
    data.senderAvatar ||
    metadata.senderAvatar ||
    metadata.viewerAvatar ||
    metadata.profileImage ||
    metadata.userAvatar ||
    metadata.authorAvatar ||
    null;

  const fallbackAccountType =
    data.senderAccountType ||
    metadata.senderAccountType ||
    metadata.viewerAccountType ||
    metadata.accountType ||
    metadata.profileType ||
    undefined;

  return {
    senderName: fallbackName,
    senderAvatar: resolveAvatarUrl(fallbackAvatar, {
      metadata,
      senderAccountType:
        data.senderAccountType ||
        metadata.senderAccountType ||
        metadata.viewerAccountType ||
        metadata.profileType
    }) || generateAvatarFromName(fallbackName) || null,
    senderAccountType: fallbackAccountType
  };
};

const mergeSenderInfo = (
  base: SenderInfo,
  extra?: Partial<SenderInfo> | null
): SenderInfo => {
  if (!extra) return base;
  return {
    senderName: extra.senderName ?? base.senderName,
    senderAvatar: extra.senderAvatar ?? base.senderAvatar,
    senderAccountType: extra.senderAccountType || base.senderAccountType
  };
};

export default function NotificationsManager({
  title = "الإشعارات",
  description = "تابع جميع الإشعارات والتنبيهات المهمة",
  showSenderInfo = true,
  showStats = true,
  showFilters = true,
  showTestButtons = false,
  accountType
}: NotificationsManagerProps) {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);
  const [interactionNotifications, setInteractionNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const previousNotificationsRef = useRef<Set<string>>(new Set());

  // جلب معلومات المرسل
  const fetchSenderInfo = async (senderId: string): Promise<SenderContext | null> => {
    try {
      // محاولة جلب من users أولاً
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', senderId)
        .single();

      if (userData) {
        const avatar =
          userData.photoURL ||
          userData.avatar ||
          userData.profileImage ||
          userData.logo ||
          null;
        return {
          senderId,
          senderName: userData.displayName || userData.name || userData.fullName || null,
          senderAvatar: resolveAvatarUrl(avatar, { senderAccountType: userData.accountType }),
          senderAccountType: userData.accountType || undefined
        };
      }

      // إذا لم نجد في users، نحاول البحث في players
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', senderId)
        .single();

      if (playerData) {
        const avatar = playerData.avatar || playerData.photoURL || playerData.image || null;
        return {
          senderId,
          senderName: playerData.full_name || playerData.name || null,
          senderAvatar: resolveAvatarUrl(avatar, { senderAccountType: 'player' }),
          senderAccountType: 'player'
        };
      }

      // محاولة البحث في clubs
      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', senderId)
        .single();

      if (clubData) {
        const avatar = clubData.logo || clubData.avatar || clubData.image || null;
        return {
          senderId,
          senderName: clubData.name || null,
          senderAvatar: resolveAvatarUrl(avatar, { senderAccountType: 'club' }),
          senderAccountType: 'club'
        };
      }

      // محاولة البحث في academies
      const { data: academyData } = await supabase
        .from('academies')
        .select('*')
        .eq('id', senderId)
        .single();

      if (academyData) {
        const avatar = academyData.logo || academyData.avatar || academyData.image || null;
        return {
          senderId,
          senderName: academyData.name || null,
          senderAvatar: resolveAvatarUrl(avatar, { senderAccountType: 'academy' }),
          senderAccountType: 'academy'
        };
      }

      // محاولة البحث في employees
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', senderId)
        .single();

      if (empData) {
        const avatar = empData.avatar || empData.photoURL || empData.image || null;
        return {
          senderId,
          senderName: empData.full_name || empData.name || null,
          senderAvatar: resolveAvatarUrl(avatar, { senderAccountType: 'employee' }),
          senderAccountType: 'employee'
        };
      }

      // محاولة البحث في admins
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('id', senderId)
        .single();

      if (adminData) {
        const avatar = adminData.avatar || adminData.photoURL || adminData.image || null;
        return {
          senderId,
          senderName: adminData.full_name || adminData.name || null,
          senderAvatar: resolveAvatarUrl(avatar, { senderAccountType: 'admin' }),
          senderAccountType: 'admin'
        };
      }
    } catch (error) {
      console.error('خطأ في جلب معلومات المرسل:', error);
    }
    return null;
  };

  // معالجة صفوف الإشعارات النظامية
  const processSystemNotificationRows = async (rows: any[]): Promise<Notification[]> => {
    return Promise.all(
      rows.map(async (row) => {
        const data = row as Notification;
        const normalizedMetadata = normalizeNotificationMetadata(data.metadata);
        const dataWithMetadata = { ...data, metadata: normalizedMetadata };

        let senderInfo = getInitialSenderInfo(dataWithMetadata);
        const metadata = normalizedMetadata || {};
        const senderId = data.senderId
          || metadata.senderId
          || metadata.viewerId
          || metadata.profileOwnerId
          || metadata.userId;

        if (senderId) {
          const senderData = await fetchSenderInfo(senderId);
          if (senderData) {
            senderInfo = mergeSenderInfo(senderInfo, senderData);
          }
        }

        if (!senderInfo.senderAvatar && senderInfo.senderName) {
          senderInfo.senderAvatar = generateAvatarFromName(senderInfo.senderName);
        }

        return {
          ...dataWithMetadata,
          senderId: senderId || data.senderId,
          ...senderInfo
        } as Notification;
      })
    );
  };

  // جلب الإشعارات
  useEffect(() => {
    if (!user) {
      console.log('⚠️ NotificationsManager: لا يوجد مستخدم مسجل دخول');
      return;
    }

    if (!userData) {
      console.log('⚠️ NotificationsManager: بيانات المستخدم غير متوفرة بعد، انتظار...');
      return;
    }

    console.log('✅ NotificationsManager: بدء جلب الإشعارات للمستخدم:', user.id);

    // جلب الإشعارات النظامية
    const fetchSystemNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .limit(100);

      if (error) {
        console.error('خطأ في جلب الإشعارات النظامية:', error);
        return;
      }

      const processed = await processSystemNotificationRows(data ?? []);

      // ترتيب البيانات حسب التاريخ
      const sortedData = processed.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setSystemNotifications(sortedData);
    };

    // جلب الإشعارات التفاعلية
    const fetchInteractionNotifications = async () => {
      const { data, error } = await supabase
        .from('interaction_notifications')
        .select('*')
        .eq('userId', user.id)
        .limit(100);

      if (error) {
        console.error('خطأ في جلب الإشعارات التفاعلية:', error);
        return;
      }

      const rows = data ?? [];

      const interactionNotificationsData = await Promise.all(
        rows.map(async (row) => {
          const normalizedMetadata = normalizeNotificationMetadata(row.metadata);
          const enrichedData = { ...row, metadata: normalizedMetadata };

          let senderInfo = getInitialSenderInfo(enrichedData as Notification);
          const senderCandidateId = row.viewerId || row.senderId || row.profileOwnerId;

          if (senderCandidateId) {
            const senderData = await fetchSenderInfo(senderCandidateId);
            if (senderData) {
              senderInfo = mergeSenderInfo(senderInfo, senderData);
            }
          }

          if (!senderInfo.senderAvatar && senderInfo.senderName) {
            senderInfo.senderAvatar = generateAvatarFromName(senderInfo.senderName);
          }

          return {
            id: row.id,
            userId: row.userId,
            title: row.title || 'إشعار تفاعلي',
            message: row.message || 'لا توجد تفاصيل',
            type: row.type === 'profile_view' ? 'info' :
              row.type === 'message_sent' ? 'success' :
                row.type === 'connection_request' ? 'warning' : 'info',
            isRead: row.isRead || false,
            link: row.actionUrl,
            metadata: {
              ...enrichedData,
              profileOwnerId: row.profileOwnerId,
              viewerId: row.viewerId,
              profileType: row.profileType || 'player'
            },
            scope: 'system',
            createdAt: row.createdAt,
            updatedAt: row.createdAt,
            actionType: row.type,
            senderId: senderCandidateId || row.senderId,
            ...senderInfo
          } as Notification;
        })
      );

      // ترتيب البيانات يدوياً حسب التاريخ
      const sortedData = interactionNotificationsData.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setInteractionNotifications(sortedData);
    };

    fetchSystemNotifications();
    fetchInteractionNotifications();

    // Supabase realtime: notifications
    const notificationsChannel = supabase.channel('notifications_mgr_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `userId=eq.${user.id}`
      }, () => {
        fetchSystemNotifications();
      })
      .subscribe();

    // Supabase realtime: interaction_notifications
    const interactionChannel = supabase.channel('interaction_notifications_mgr_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interaction_notifications',
        filter: `userId=eq.${user.id}`
      }, () => {
        fetchInteractionNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(interactionChannel);
    };
  }, [user, userData]);

  // تفعيل الصوت للموبايل عند تحميل الصفحة
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      // تفعيل الصوت بعد تفاعل المستخدم (click أو touch)
      const enableSound = async () => {
        await enableSoundForMobile();
      };

      // محاولة تفعيل الصوت عند أول تفاعل
      const handleFirstInteraction = () => {
        enableSound();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };

      document.addEventListener('click', handleFirstInteraction, { once: true });
      document.addEventListener('touchstart', handleFirstInteraction, { once: true });

      return () => {
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };
    }
  }, [user]);

  // دمج الإشعارات وتشغيل الصوت عند وصول إشعار جديد
  useEffect(() => {
    const allNotifications = [...systemNotifications, ...interactionNotifications];
    const sortedNotifications = allNotifications.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    // التحقق من وجود إشعارات جديدة
    const currentNotificationIds = new Set(sortedNotifications.map(n => n.id));

    // العثور على الإشعارات الجديدة
    const newNotifications = sortedNotifications.filter(
      n => !previousNotificationsRef.current.has(n.id)
    );

    // تشغيل الصوت وإظهار إشعار منبثق لكل إشعار جديد غير مقروء
    // (فقط إذا كان هناك إشعارات سابقة - لتجنب التشغيل عند التحميل الأول)
    if (newNotifications.length > 0 && previousNotificationsRef.current.size > 0) {
      newNotifications.forEach((notification) => {
        if (!notification.isRead) {
          // تشغيل الصوت
          const soundType = getSoundTypeFromNotificationType(notification.type, notification.actionType);
          playNotificationSound(soundType);

          // إظهار إشعار منبثق
          toast(
            (t) => (
              <div className="flex items-start gap-3 w-full">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{notification.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  {notification.senderName && (
                    <p className="text-xs text-blue-600 mt-1">من: {notification.senderName}</p>
                  )}
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            ),
            {
              duration: 5000,
              position: 'top-right',
              icon: notification.type === 'success' ? '✅' :
                notification.type === 'warning' ? '⚠️' :
                  notification.type === 'error' ? '❌' : 'ℹ️',
            }
          );
        }
      });
    }

    // تحديث المرجع بالإشعارات الحالية (بعد معالجة الإشعارات الجديدة)
    previousNotificationsRef.current = currentNotificationIds;

    setNotifications(sortedNotifications);
    setLoading(false);
  }, [systemNotifications, interactionNotifications]);

  // تحديد الإشعار كمقروء
  const markAsRead = async (notificationId: string) => {
    try {
      // محاولة تحديث في notifications أولاً
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ isRead: true, updatedAt: new Date().toISOString() })
        .eq('id', notificationId);

      if (notifError) {
        // إذا فشل، جرب interaction_notifications
        await supabase
          .from('interaction_notifications')
          .update({ isRead: true })
          .eq('id', notificationId);
      }

      toast.success('تم تحديد الإشعار كمقروء');
    } catch (error) {
      console.error('خطأ في تحديث حالة الإشعار:', error);
      toast.error('حدث خطأ في تحديث الإشعار');
    }
  };

  // أرشفة الإشعار
  const archiveNotification = async (notificationId: string) => {
    try {
      // هنا يمكن إضافة منطق الأرشفة في Supabase
      toast.success('تم أرشفة الإشعار');
    } catch (error) {
      console.error('خطأ في أرشفة الإشعار:', error);
      toast.error('حدث خطأ في أرشفة الإشعار');
    }
  };

  // حذف الإشعار
  const deleteNotification = async (notificationId: string) => {
    try {
      // هنا يمكن إضافة منطق الحذف في Supabase
      toast.success('تم حذف الإشعار');
    } catch (error) {
      console.error('خطأ في حذف الإشعار:', error);
      toast.error('حدث خطأ في حذف الإشعار');
    }
  };

  // الرد على الإشعار
  const replyToNotification = (notification: Notification) => {
    // هنا يمكن إضافة منطق الرد
    toast.success('سيتم فتح صفحة الرد');
  };

  // إعادة توجيه الإشعار
  const forwardNotification = (notification: Notification) => {
    // هنا يمكن إضافة منطق إعادة التوجيه
    toast.success('سيتم فتح صفحة إعادة التوجيه');
  };

  // تحديد جميع الإشعارات كمقروءة
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const updatePromises = unreadNotifications.map(async (notification) => {
        const { error: notifError } = await supabase
          .from('notifications')
          .update({ isRead: true, updatedAt: new Date().toISOString() })
          .eq('id', notification.id);

        if (notifError) {
          // إذا فشل، جرب interaction_notifications
          await supabase
            .from('interaction_notifications')
            .update({ isRead: true })
            .eq('id', notification.id);
        }
      });

      await Promise.all(updatePromises);
      toast.success('تم تحديد جميع الإشعارات كمقروءة');
    } catch (error) {
      console.error('خطأ في تحديث جميع الإشعارات:', error);
      toast.error('حدث خطأ في تحديث الإشعارات');
    }
  };

  // الانتقال لصفحة المرسل أو صاحب الملف الشخصي
  const navigateToSender = async (senderId: string) => {
    // البحث عن الإشعار المرتبط
    const notification = notifications.find(n => n.senderId === senderId || n.metadata?.viewerId === senderId);

    // في حالة profile_view، نعرض ملف صاحب الملف الشخصي (profileOwnerId)
    if (notification?.actionType === 'profile_view' && notification.metadata?.profileOwnerId) {
      const profileOwnerId = notification.metadata.profileOwnerId;
      const profileType = notification.metadata.profileType || 'player';

      // تحديد المسار حسب نوع الملف الشخصي
      if (profileType === 'player') {
        router.push(`/dashboard/shared/player-profile/${profileOwnerId}`);
      } else if (profileType === 'club') {
        router.push(`/dashboard/club/profile?id=${profileOwnerId}`);
      } else if (profileType === 'academy') {
        router.push(`/dashboard/academy/profile?id=${profileOwnerId}`);
      } else if (profileType === 'trainer') {
        router.push(`/dashboard/trainer/profile?id=${profileOwnerId}`);
      } else if (profileType === 'agent') {
        router.push(`/dashboard/agent/profile?id=${profileOwnerId}`);
      } else {
        router.push(`/dashboard/shared/player-profile/${profileOwnerId}`);
      }
      return;
    }

    // في الحالات الأخرى، نعرض ملف المرسل/المشاهد
    let senderAccountType = notification?.senderAccountType;

    // إذا لم نجد نوع الحساب من الإشعار، نحاول جلبها من Supabase
    if (!senderAccountType) {
      try {
        const senderInfo = await fetchSenderInfo(senderId);
        if (senderInfo?.senderAccountType) {
          senderAccountType = senderInfo.senderAccountType;
        }
      } catch (error) {
        console.error('خطأ في جلب معلومات المرسل:', error);
      }
    }

    // تحديد المسار حسب نوع الحساب
    if (senderAccountType === 'player') {
      // للاعبين، نستخدم صفحة تقارير اللاعب
      router.push(`/dashboard/shared/player-profile/${senderId}`);
    } else if (senderAccountType === 'club') {
      router.push(`/dashboard/club/profile?id=${senderId}`);
    } else if (senderAccountType === 'academy') {
      router.push(`/dashboard/academy/profile?id=${senderId}`);
    } else if (senderAccountType === 'trainer') {
      router.push(`/dashboard/trainer/profile?id=${senderId}`);
    } else if (senderAccountType === 'agent') {
      router.push(`/dashboard/agent/profile?id=${senderId}`);
    } else {
      // افتراضياً، إذا كان لاعب أو غير معروف، نستخدم صفحة تقارير اللاعب
      router.push(`/dashboard/shared/player-profile/${senderId}`);
    }
  };

  // الانتقال لصفحة الإجراء
  const navigateToAction = (notification: Notification) => {
    if (notification.link) {
      if (notification.link.startsWith('http')) {
        window.open(notification.link, '_blank');
      } else {
        router.push(notification.link);
      }
    } else if (notification.metadata?.actionUrl) {
      if (notification.metadata.actionUrl.startsWith('http')) {
        window.open(notification.metadata.actionUrl, '_blank');
      } else {
        router.push(notification.metadata.actionUrl);
      }
    }
  };

  // إنشاء إشعارات تجريبية
  const createTestNotifications = async () => {
    if (!user?.id) return;

    try {
      // استيراد ديناميكي لتجنب مشاكل في وقت البناء
      const {
        createTestNotification,
        createTestInteractionNotification,
        createTestPaymentNotification,
        createTestWarningNotification
      } = await import('@/lib/firebase/test-notifications');

      await Promise.all([
        createTestNotification(user.id),
        createTestInteractionNotification(user.id),
        createTestPaymentNotification(user.id),
        createTestWarningNotification(user.id)
      ]);

      toast.success('تم إنشاء الإشعارات التجريبية بنجاح');
    } catch (error) {
      console.error('خطأ في إنشاء الإشعارات التجريبية:', error);
      toast.error('حدث خطأ في إنشاء الإشعارات التجريبية');
    }
  };

  // إنشاء إشعارات متعددة
  const createMultipleNotifications = async () => {
    if (!user?.id) return;

    try {
      const { createTestNotification } = await import('@/lib/firebase/test-notifications');

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(createTestNotification(user.id));
      }

      await Promise.all(promises);
      toast.success('تم إنشاء 10 إشعارات تجريبية بنجاح');
    } catch (error) {
      console.error('خطأ في إنشاء الإشعارات المتعددة:', error);
      toast.error('حدث خطأ في إنشاء الإشعارات المتعددة');
    }
  };

  // معالجة حالة عدم وجود مستخدم
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            يجب تسجيل الدخول أولاً
          </h3>
          <p className="text-gray-600">
            يرجى تسجيل الدخول لعرض الإشعارات
          </p>
        </div>
      </div>
    );
  }

  // معالجة حالة عدم وجود بيانات المستخدم
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            جاري تحميل البيانات
          </h3>
          <p className="text-gray-600">
            يرجى الانتظار قليلاً...
          </p>
        </div>
      </div>
    );
  }

  return (
    <NotificationsList
      notifications={notifications}
      loading={loading}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onNavigateToSender={navigateToSender}
      onNavigateToAction={navigateToAction}
      onArchive={archiveNotification}
      onDelete={deleteNotification}
      onReply={replyToNotification}
      onForward={forwardNotification}
      onCreateTestNotifications={showTestButtons ? createTestNotifications : undefined}
      onCreateMultipleNotifications={showTestButtons ? createMultipleNotifications : undefined}
      showSenderInfo={showSenderInfo}
      title={title}
      description={description}
      showStats={showStats}
      showFilters={showFilters}
      showTestButtons={showTestButtons}
    />
  );
}
