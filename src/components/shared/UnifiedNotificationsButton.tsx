'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { Bell, Settings, MoreHorizontal, Check, Trash2, CheckCheck, Sparkles } from 'lucide-react';
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
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const senderCache = useRef<Map<string, SenderContext>>(new Map());
  const fetchSenderInfo = async (senderId: string): Promise<SenderContext | null> => {
    if (senderCache.current.has(senderId)) return senderCache.current.get(senderId)!;
    try {
      for (const col of ['users', 'players', 'clubs', 'academies', 'employees', 'admins']) {
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

  const isBroadcastSeen = (id: string) =>
    typeof window !== 'undefined' && localStorage.getItem(`bc_seen_${id}_${user?.uid}`) === '1';
  const markBroadcastSeen = (id: string) => {
    if (typeof window !== 'undefined' && user?.uid)
      localStorage.setItem(`bc_seen_${id}_${user.uid}`, '1');
  };

  useEffect(() => {
    if (!user?.uid) return;

    const NOTIF_LIMIT = 20;
    const q1 = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(NOTIF_LIMIT));
    const q2 = query(collection(db, 'interaction_notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(NOTIF_LIMIT));
    const q3 = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(10));

    const enrichAndMerge = async (docs1: any[], docs2: any[], docs3: any[]) => {
      const broadcastItems = docs3.map(d => {
        const data = d.data();
        return {
          id: `bc_${d.id}`,
          title: 'فرصة جديدة 🎯',
          message: `${data.organizerName} نشر: ${data.opportunityTitle}`,
          isRead: isBroadcastSeen(d.id),
          createdAt: data.createdAt?.toDate() || new Date(),
          senderName: data.organizerName || 'النظام',
          senderAvatar: undefined,
          type: 'opportunity',
          category: 'system' as const,
          actionUrl: data.actionUrl || '/dashboard/opportunities',
        };
      });

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
        if (!avatar && name) avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;

        return {
          id: item.id,
          title: item.title,
          message: item.message,
          isRead: item.isRead || false,
          createdAt: item.createdAt?.toDate() || new Date(),
          senderName: name || 'System',
          senderAvatar: avatar,
          type: item.type || 'info',
          category: item.category as any,
          actionUrl: item.actionUrl || item.link || metadata?.link
        };
      }));

      const combined = [...processed, ...broadcastItems];
      combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotifications(combined);
      setUnreadCount(combined.filter(n => !n.isRead).length);
      setLoading(false);
    };

    let unsub1: any, unsub2: any, unsub3: any;
    let d1: any[] = [], d2: any[] = [], d3: any[] = [];

    unsub1 = onSnapshot(q1, (s) => { d1 = s.docs; enrichAndMerge(d1, d2, d3); });
    unsub2 = onSnapshot(q2, (s) => { d2 = s.docs; enrichAndMerge(d1, d2, d3); });
    unsub3 = onSnapshot(q3, (s) => { d3 = s.docs; enrichAndMerge(d1, d2, d3); });

    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [user]);

  const markAllRead = async () => {
    if (!user?.uid) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.isRead).forEach(n => {
        if (n.id.startsWith('bc_')) {
          markBroadcastSeen(n.id.slice(3));
        } else {
          const coll = n.category === 'system' ? 'notifications' : 'interaction_notifications';
          batch.update(doc(db, coll, n.id), { isRead: true });
        }
      });
      await batch.commit();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  const markRead = async (id: string, category: string) => {
    try {
      if (id.startsWith('bc_')) {
        markBroadcastSeen(id.slice(3));
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        const coll = category === 'system' ? 'notifications' : 'interaction_notifications';
        await updateDoc(doc(db, coll, id), { isRead: true });
      }
    } catch (e) { console.error(e); }
  };

  const filtered = notifications.filter(n => activeTab === 'all' || !n.isRead);
  const dashboardPath = userData?.accountType === 'admin' ? '/dashboard/admin' :
    userData?.accountType === 'player' ? '/dashboard/player' :
      userData?.accountType === 'club' ? '/dashboard/club' :
        userData?.accountType === 'academy' ? '/dashboard/academy' : '/dashboard/trainer';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "group relative w-10 h-10 md:w-11 md:h-11 rounded-2xl transition-all duration-300",
            isOpen ? "bg-blue-500/10 text-blue-600 shadow-inner" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          )}
        >
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, repeat: unreadCount > 0 ? 3 : 0, repeatDelay: 5 }}
            className="relative"
          >
            <Bell className={cn("w-5 h-5 md:w-6 md:h-6 transition-all", isOpen && "fill-blue-600")} />
          </motion.div>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-1.5 right-1.5 flex h-5 w-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg border-2 border-white dark:border-slate-900 items-center justify-center text-[9px] font-black text-white shadow-lg"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[85vw] sm:w-[240px] p-0 shadow-lg border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-slate-950/95"
        align="end"
        sideOffset={12}
        collisionPadding={16}
      >
        <div className="p-3 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">الإشعارات</h3>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button onClick={markAllRead} variant="ghost" size="sm" className="h-6 gap-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md px-2">
                <CheckCheck className="w-3 h-3" />
                قراءة الكل
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex p-2 m-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex-1 py-1.5 text-xs font-black rounded-xl transition-all",
              activeTab === 'all'
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              "flex-1 py-1.5 text-xs font-black rounded-xl transition-all",
              activeTab === 'unread'
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <ScrollArea className="h-[50vh] sm:h-[300px]">
          {loading ? (
            <div className="p-6 space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-premium shadow-blue-500/5"
              >
                <Sparkles className="w-10 h-10 text-blue-300 dark:text-blue-800" />
              </motion.div>
              <h4 className="text-slate-900 dark:text-white font-black text-xl mb-2">No notifications</h4>
              <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed font-medium">
                {activeTab === 'unread' ? "You're all caught up!" : "New updates will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/50 dark:divide-white/5">
              <AnimatePresence initial={false}>
                {filtered.map((notif) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: 50 }}
                    key={notif.id}
                    className={cn(
                      "group relative flex items-start gap-2 p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer",
                      !notif.isRead && "bg-blue-500/5"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700">
                        <AvatarImage src={notif.senderAvatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-bold text-xs">
                          {notif.senderName?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      {notif.type === 'success' && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-lg border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg"><Check className="w-3 h-3 text-white" /></div>}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate pr-1">{notif.title}</span>
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0">
                          {formatDistanceToNow(notif.createdAt, { locale: ar, addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mb-2">{notif.message}</p>

                      <div className="flex items-center gap-2">
                        {notif.actionUrl && (
                          <Link href={notif.actionUrl} onClick={() => { setIsOpen(false); markRead(notif.id, notif.category); }} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md transition-colors">
                            عرض التفاصيل
                          </Link>
                        )}
                        {!notif.isRead && (
                          <button onClick={() => markRead(notif.id, notif.category)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-1 transition-colors">
                            تحديد كمقروء
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="absolute top-5 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="w-4 h-4 text-slate-400" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-100 dark:border-white/10 shadow-premium">
                          <DropdownMenuItem className="text-xs font-bold text-red-600 focus:text-red-700"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Notification</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Global Footer */}
        <div className="p-4 bg-gradient-to-t from-slate-50/50 to-transparent dark:from-slate-900/50">
          <Link href={`${dashboardPath}/notifications`} onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full flex items-center justify-between px-6 h-12 rounded-2xl font-black text-sm border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-900 shadow-sm transition-all group">
              <span>عرض جميع التنبيهات</span>
              <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
