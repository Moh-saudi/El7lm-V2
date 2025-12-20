'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { Bell, Settings, MoreHorizontal, Check, Trash2, Maximize2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { normalizeNotificationMetadata, resolveAvatarUrl, SenderContext } from '@/lib/notifications/sender-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  senderName?: string;
  senderAvatar?: string;
  type: string;
  category: 'system' | 'interaction';
  actionUrl?: string;
}

export default function UnifiedNotificationsButton() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  // Sound Effect Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Sender Fetching Logic (Cached) ---
  const senderCache = useRef<Map<string, SenderContext>>(new Map());
  const fetchSenderInfo = async (senderId: string): Promise<SenderContext | null> => {
    if (senderCache.current.has(senderId)) return senderCache.current.get(senderId)!;
    try {
      // Check likely collections first based on ID format if possible, otherwise generic check
      for (const col of ['users', 'players', 'clubs', 'academies']) {
        const d = await getDoc(doc(db, col, senderId));
        if (d.exists()) {
          const data = d.data();
          const name = data.displayName || data.name || data.full_name || data.fullName;
          const avatar = data.photoURL || data.avatar || data.image || data.logo;
          const res = { senderId, senderName: name, senderAvatar: avatar };
          senderCache.current.set(senderId, res);
          return res;
        }
      }
    } catch (e) { console.error(e); }
    return null;
  };

  /* 
  useEffect(() => {
    // Audio feature temporarily disabled
    // audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);
  */

  useEffect(() => {
    if (!user?.uid) return;

    // Limits
    const NOTIF_LIMIT = 20;

    const q1 = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(NOTIF_LIMIT));
    const q2 = query(collection(db, 'interaction_notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(NOTIF_LIMIT));

    const enrichAndMerge = async (docs1: any[], docs2: any[]) => {
      const rawItems = [
        ...docs1.map(d => ({ ...d.data(), id: d.id, category: 'system' })),
        ...docs2.map(d => ({ ...d.data(), id: d.id, category: 'interaction' }))
      ];

      const processed = await Promise.all(rawItems.map(async (item: any) => {
        const metadata = normalizeNotificationMetadata(item.metadata);
        let senderId = item.senderId || metadata?.senderId;
        let avatar = item.senderAvatar;
        let name = item.senderName;

        if (senderId && (!name || !avatar)) {
          const info = await fetchSenderInfo(senderId);
          if (info) {
            name = info.senderName || name;
            avatar = info.senderAvatar || avatar;
          }
        }
        // Fallback Avatar
        if (!avatar && name) avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;

        return {
          id: item.id,
          title: item.title,
          message: item.message,
          isRead: item.isRead || false,
          createdAt: item.createdAt?.toDate() || new Date(),
          senderName: name || 'النظام',
          senderAvatar: avatar,
          type: item.type || 'info',
          category: item.category as any,
          actionUrl: item.actionUrl || item.link
        };
      }));

      const sorted = processed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, NOTIF_LIMIT);

      // Check for NEW notification to play sound
      setNotifications(prev => {
        if (prev.length > 0 && sorted.length > 0 && sorted[0].id !== prev[0]?.id && !sorted[0].isRead) {
          // Play sound if supported and interacting
          // audioRef.current?.play().catch(() => {});
        }
        return sorted;
      });

      setUnreadCount(sorted.filter(n => !n.isRead).length);
      setLoading(false);
    };

    const unsub1 = onSnapshot(q1, async (snap1) => {
      const snap2 = await import('firebase/firestore').then(mod => mod.getDocs(q2));
      enrichAndMerge(snap1.docs, snap2.docs);
    });

    return () => unsub1();
  }, [user]);

  const handleMarkRead = async (id: string, category: string) => {
    try {
      const col = category === 'interaction' ? 'interaction_notifications' : 'notifications';
      await updateDoc(doc(db, col, id), { isRead: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { }
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    const unread = notifications.filter(n => !n.isRead);
    unread.forEach(n => {
      const col = n.category === 'interaction' ? 'interaction_notifications' : 'notifications';
      const ref = doc(db, col, n.id);
      batch.update(ref, { isRead: true });
    });
    await batch.commit();

    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const filtered = notifications.filter(n => activeTab === 'all' || !n.isRead);

  // Determine Dashboard Path
  const dashboardPath = user?.accountType === 'admin' ? '/dashboard/admin' :
    user?.accountType === 'club' ? '/dashboard/club' :
      user?.accountType === 'academy' ? '/dashboard/academy' : '/dashboard/trainer';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-10 h-10">
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 0] } : {}}
            transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 5 }}
          >
            <Bell className={cn("w-6 h-6 transition-colors", isOpen ? "text-blue-600 fill-blue-600" : "text-gray-600")} />
          </motion.div>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1.5 right-1.5 flex h-4 w-4 bg-red-500 rounded-full border-2 border-white items-center justify-center text-[9px] font-bold text-white shadow-sm"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[95vw] sm:w-[380px] p-0 shadow-2xl border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-2 sm:mb-0" align="end" sideOffset={8}>

        {/* Header */}
        <div className="p-3 px-4 flex items-center justify-between border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h3 className="font-bold text-lg text-gray-900">الإشعارات</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-lg"
                onClick={markAllRead}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                قراءة الكل
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100"
              title="الإعدادات"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Categories / Tabs */}
        <div className="flex px-2 pt-1 gap-2 bg-white">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-full transition-all",
              activeTab === 'all'
                ? "bg-blue-50 text-blue-600"
                : "bg-transparent text-gray-500 hover:bg-gray-50"
            )}
          >
            الكل
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-full transition-all",
              activeTab === 'unread'
                ? "bg-blue-50 text-blue-600"
                : "bg-transparent text-gray-500 hover:bg-gray-50"
            )}
          >
            غير مقروءة
          </button>
        </div>

        {/* Content List */}
        <ScrollArea className="h-[60vh] sm:h-[420px] bg-white">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[350px] text-center p-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4"
              >
                <Bell className="w-8 h-8 text-gray-300" />
              </motion.div>
              <p className="text-gray-900 font-bold text-lg">لا توجد إشعارات حالياً</p>
              <p className="text-sm text-gray-500 mt-2 max-w-[200px] leading-relaxed">
                {activeTab === 'unread' ? "لقد قرأت جميع إشعاراتك، رائع!" : "سنخبرك عندما يصلك شيء جديد."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <AnimatePresence initial={false}>
                {filtered.map((notification) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    key={notification.id}
                    className={cn(
                      "group relative flex items-start gap-3 p-4 hover:bg-gray-50/80 transition-colors cursor-pointer",
                      !notification.isRead ? "bg-blue-50/30" : "bg-white"
                    )}
                    onClick={() => {
                      handleMarkRead(notification.id, notification.category);
                      if (notification.actionUrl) window.location.href = notification.actionUrl;
                    }}
                  >
                    <div className="relative flex-shrink-0 mt-1">
                      {notification.senderAvatar ? (
                        <Avatar className="w-12 h-12 border border-gray-100 shadow-sm">
                          <AvatarImage src={notification.senderAvatar} />
                          <AvatarFallback>{notification.senderName?.[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
                          {notification.senderName?.[0] || 'N'}
                        </div>
                      )}

                      {/* Unread Indicator - Icon Style */}
                      {!notification.isRead && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-[14px] leading-snug break-words">
                        <span className="font-bold text-gray-900">{notification.senderName}</span>
                        <span className="text-gray-600 mx-1">{notification.message}</span>
                      </div>
                      <span className={cn(
                        "text-xs font-medium mt-1.5 block",
                        !notification.isRead ? "text-blue-600" : "text-gray-400"
                      )}>
                        {formatDistanceToNow(notification.createdAt, { locale: ar, addSuffix: true })}
                      </span>
                    </div>

                    {/* Hover Menu */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkRead(notification.id, notification.category); }}>
                            <Check className="w-4 h-4 ml-2" />
                            تحديد كمقروء
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); /* Remove */ }}>
                            <Trash2 className="w-4 h-4 ml-2" />
                            إزالة من الإشعارات
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 bg-gray-50/80 border-t border-gray-100">
          <Link href={`${dashboardPath}/notifications`} onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 border-gray-200 shadow-sm h-10 font-bold text-sm rounded-lg transition-all">
              عرض كل الإشعارات
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
