'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Users,
  Building2,
  GraduationCap,
  UserCheck,
  Phone,
  Sparkles,
  ChevronLeft,
  Settings,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MessageNotification {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  message: string;
  timestamp: any;
  isRead: boolean;
  senderAvatar?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantTypes: Record<string, string>;
  unreadCount: Record<string, number>;
  lastMessage: string;
  lastMessageTime: any;
}

const USER_TYPES: Record<string, any> = {
  club: { name: 'نادي', icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  academy: { name: 'أكاديمية', icon: GraduationCap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  trainer: { name: 'مدرب', icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  agent: { name: 'وكيل', icon: Phone, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  player: { name: 'لاعب', icon: Users, color: 'text-slate-500', bg: 'bg-slate-500/10' }
};

const getUserDisplayName = (notification: any, userType: string) => {
  if (!notification) return 'مستخدم غير معروف';
  if (userType === 'player') {
    return notification.senderName || 'لاعب';
  }
  return notification.senderName || USER_TYPES[userType]?.name || 'مستخدم';
};

const MessageNotifications: React.FC = () => {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userData) return;

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const conversationsUnsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const conversationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];

      const totalUnreadCount = conversationsData.reduce((total, conv) => {
        return total + (conv.unreadCount[user.uid] || 0);
      }, 0);

      setTotalUnread(totalUnreadCount);
    });

    const messagesQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('isRead', '==', false),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageNotification[];

      setNotifications(messagesData);
      setLoading(false);
    });

    return () => {
      conversationsUnsubscribe();
      messagesUnsubscribe();
    };
  }, [user, userData]);

  const dashboardPath = userData?.accountType === 'admin' ? '/dashboard/admin' :
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
            isOpen ? "bg-emerald-500/10 text-emerald-600" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          )}
        >
          <motion.div animate={totalUnread > 0 ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}>
            <MessageSquare className={cn("w-5 h-5 md:w-6 md:h-6 transition-all", isOpen && "fill-emerald-600")} />
          </motion.div>
          <AnimatePresence>
            {totalUnread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg border-2 border-white dark:border-slate-900 text-[9px] font-black text-white shadow-lg shadow-emerald-500/20"
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[95vw] sm:w-[400px] p-0 shadow-premium border-white/20 dark:border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-3xl bg-white/95 dark:bg-slate-950/95"
        align="end"
        sideOffset={12}
        collisionPadding={16}
      >
        <div className="p-5 px-6 flex items-center justify-between border-b border-white/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white">الرسائل القادمة</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[60vh] sm:h-[420px]">
          {loading ? (
            <div className="p-6 space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-1/3 rounded-lg" />
                    <Skeleton className="h-3 w-3/4 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-slate-100/50 dark:divide-white/5">
              {notifications.map((notif) => {
                const typeInfo = USER_TYPES[notif.senderType] || USER_TYPES.player;
                const Icon = typeInfo.icon;
                return (
                  <Link
                    key={notif.id}
                    href={`${dashboardPath}/chat`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-4 p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14 rounded-2xl border-2 border-white dark:border-slate-800 shadow-premium transition-transform group-hover:scale-105">
                        <AvatarImage src={notif.senderAvatar} />
                        <AvatarFallback className="bg-slate-200 text-slate-600 font-black">
                          {notif.senderName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg", typeInfo.bg)}>
                        <Icon className={cn("w-3 h-3", typeInfo.color)} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-black text-slate-900 dark:text-white truncate text-sm">
                          {getUserDisplayName(notif, notif.senderType)}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatDistanceToNow(notif.timestamp?.toDate?.() || new Date(), { addSuffix: false, locale: ar })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                      <Badge variant="outline" className="mt-2 text-[8px] font-black border-slate-100 dark:border-white/10 h-4 uppercase">
                        {typeInfo.name}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[380px] text-center p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-premium shadow-emerald-500/5">
                <MessageSquare className="w-10 h-10 text-emerald-300 dark:text-emerald-800" />
              </div>
              <h4 className="text-slate-900 dark:text-white font-black text-xl mb-2">هدوء تام..</h4>
              <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed font-medium">ليس هناك رسائل حالياً. ابدأ محادثة مع اللاعبين والأندية الآن.</p>
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-gradient-to-t from-slate-50/50 to-transparent dark:from-slate-900/50">
          <Link href={`${dashboardPath}/chat`} onClick={() => setIsOpen(false)}>
            <Button className="w-full flex items-center justify-between px-6 h-12 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all group">
              <span>عرض الماسنجر</span>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MessageNotifications;
