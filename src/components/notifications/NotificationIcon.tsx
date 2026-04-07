'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import Link from 'next/link';

export default function NotificationIcon() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('isRead', false)
        .order('createdAt', { ascending: false })
        .limit(50);

      setUnreadCount(data?.length ?? 0);
    } catch (error) {
      console.error('خطأ في جلب عدد الإشعارات:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // تحديث العدد كل 30 ثانية
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="relative">
        <Link href="/dashboard/admin/notifications" className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
          🔔
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href="/dashboard/admin/notifications"
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors relative block"
        title="الإشعارات"
      >
        <span className="text-lg sm:text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
