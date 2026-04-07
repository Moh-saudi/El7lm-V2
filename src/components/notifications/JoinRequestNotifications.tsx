'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { JoinRequestNotification } from '@/types/organization-referral';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';

export default function JoinRequestNotifications() {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<JoinRequestNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user?.id || (userData as any)?.accountType === 'player') return;

    // جلب أولي
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('join_request_notifications')
        .select('*')
        .eq('organizationId', user.id)
        .eq('isRead', false)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('خطأ في جلب إشعارات طلبات الانضمام:', error);
        return;
      }

      const notifs = (data ?? []) as JoinRequestNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    };

    fetchNotifications();

    // Supabase realtime subscription
    const channel = supabase.channel('join_request_notifications_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'join_request_notifications',
        filter: `organizationId=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userData]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('join_request_notifications')
        .update({ isRead: true })
        .eq('id', notificationId);
    } catch (err) {
      console.error('خطأ في تحديث الإشعار:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.map(n =>
          supabase
            .from('join_request_notifications')
            .update({ isRead: true })
            .eq('id', n.id)
        )
      );
      toast.success('تم تحديد جميع الإشعارات كمقروءة');
    } catch (err) {
      toast.error('فشل في تحديث الإشعارات');
    }
  };

  if ((userData as any)?.accountType === 'player') return null;

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="relative" onClick={() => setShowNotifications(!showNotifications)}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">إشعارات طلبات الانضمام</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setShowNotifications(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-gray-500">لا توجد إشعارات جديدة</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt as any).toLocaleString('ar')}
                      </p>
                    </div>
                    {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
