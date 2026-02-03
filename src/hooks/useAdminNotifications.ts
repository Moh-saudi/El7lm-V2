/**
 * Hook لإدارة وعرض إشعارات الإدارة
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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

    // الاستماع للإشعارات في الوقت الفعلي
    useEffect(() => {
        if (!user?.uid || !isMainAdmin) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const q = query(
            collection(db, 'admin_notifications'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const notificationsList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as AdminNotification));

                setNotifications(notificationsList);
                setLoading(false);
            },
            (err) => {
                console.error('Error listening to notifications:', err);
                setError('حدث خطأ في تحميل الإشعارات');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid, isMainAdmin, limitCount]);

    // عدد الإشعارات غير المقروءة
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // تحديد إشعار كمقروء
    const handleMarkAsRead = useCallback(async (notificationId: string) => {
        if (!user?.uid) return;

        const success = await markAsRead(notificationId, user.uid);
        if (success) {
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
        }
    }, [user?.uid]);

    // تحديد الكل كمقروء
    const handleMarkAllAsRead = useCallback(async () => {
        if (!user?.uid) return;

        const success = await markAllAsRead(user.uid);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    }, [user?.uid]);

    // حذف إشعار
    const handleDelete = useCallback(async (notificationId: string) => {
        const success = await deleteNotification(notificationId);
        if (success) {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
    }, []);

    // تحديث يدوي
    const refresh = useCallback(() => {
        // الـ onSnapshot يحدث تلقائياً
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
