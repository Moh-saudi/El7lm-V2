/**
 * Hook لإدارة وعرض إشعارات الإدارة
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import {
    AdminNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '@/lib/notifications/admin-notifications';

interface UseAdminNotificationsResult {
    notifications: AdminNotification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    refresh: () => void;
}

export function useAdminNotifications(limitCount: number = 30): UseAdminNotificationsResult {
    const { user, userData } = useAuth();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // التحقق من أن المستخدم هو المدير الرئيسي (وليس موظف)
    const isMainAdmin = userData?.accountType === 'admin' && !userData?.employeeId;

    // تحميل الإشعارات واشتراك Realtime
    useEffect(() => {
        if (!user?.id || !isMainAdmin) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Initial fetch
        supabase
            .from('admin_notifications')
            .select('*')
            .order('createdAt', { ascending: false })
            .limit(limitCount)
            .then(({ data, error: fetchError }) => {
                if (fetchError) {
                    console.error('Error loading notifications:', fetchError);
                    setError('حدث خطأ في تحميل الإشعارات');
                } else {
                    setNotifications((data || []) as AdminNotification[]);
                }
                setLoading(false);
            });

        // Realtime subscription
        const channel = supabase
            .channel(`admin-notifications-${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'admin_notifications'
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setNotifications(prev => [payload.new as AdminNotification, ...prev].slice(0, limitCount));
                } else if (payload.eventType === 'UPDATE') {
                    setNotifications(prev =>
                        prev.map(n => n.id === (payload.new as AdminNotification).id ? payload.new as AdminNotification : n)
                    );
                } else if (payload.eventType === 'DELETE') {
                    setNotifications(prev => prev.filter(n => n.id !== (payload.old as AdminNotification).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, isMainAdmin, limitCount]);

    // عدد الإشعارات غير المقروءة
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // تحديد إشعار كمقروء
    const handleMarkAsRead = useCallback(async (notificationId: string) => {
        if (!user?.id) return;

        const success = await markAsRead(notificationId, user.id);
        if (success) {
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
        }
    }, [user?.id]);

    // تحديد الكل كمقروء
    const handleMarkAllAsRead = useCallback(async () => {
        if (!user?.id) return;

        const success = await markAllAsRead(user.id);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    }, [user?.id]);

    // حذف إشعار
    const handleDelete = useCallback(async (notificationId: string) => {
        const success = await deleteNotification(notificationId);
        if (success) {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
    }, []);

    // تحديث يدوي
    const refresh = useCallback(() => {
        console.log('Notifications refreshed via realtime listener');
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDelete,
        refresh
    };
}
