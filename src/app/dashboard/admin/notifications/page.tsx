'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import {
  Bell,
  CheckCircle,
  MessageSquare,
  Settings,
  Shield,
  Trash2,
  X,
  Zap,
  MoreHorizontal,
  Heart,
  UserPlus,
  ArrowUp,
  Image as ImageIcon,
  Reply
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useAnimation, PanInfo } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'react-hot-toast';
import { normalizeNotificationMetadata, resolveAvatarUrl, SenderContext } from '@/lib/notifications/sender-utils';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// --- Types ---
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: any;
  senderName?: string;
  senderAvatar?: string;
  senderAccountType?: string;
  actionUrl?: string;
  metadata?: any;
  category: 'system' | 'interaction';
  senderId?: string;
  groupedCount?: number;
  groupedSenders?: Array<{ name: string; avatar: string }>;
}

// --- Skeleton Component ---
const NotificationSkeleton = () => (
  <div className="p-4 flex gap-4 border-b border-gray-50">
    <Skeleton className="w-12 h-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
);

// --- Reusable Notification Feed Component ---
export function NotificationFeed() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showNewPill, setShowNewPill] = useState(false);

  // Ref for scroll handling
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Stats ---
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // --- Sender Info Utilities (Cached) ---
  const senderCache = useRef<Map<string, SenderContext>>(new Map());

  const fetchSenderInfo = async (senderId: string): Promise<SenderContext | null> => {
    if (senderCache.current.has(senderId)) return senderCache.current.get(senderId)!;

    try {
      const tables = ['users', 'players', 'clubs', 'academies'];
      for (const tableName of tables) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', senderId)
          .single();
        if (!error && data) {
          const name = data.displayName || data.name || data.full_name || data.fullName;
          const avatar = data.photoURL || data.avatar || data.image || data.logo || data.profileImage;
          const type = data.accountType || (tableName === 'users' ? undefined : tableName.slice(0, -1));

          const result = {
            senderId,
            senderName: name || null,
            senderAvatar: resolveAvatarUrl(avatar, { senderAccountType: type }),
            senderAccountType: type
          };
          senderCache.current.set(senderId, result);
          return result;
        }
      }
    } catch (e) {
      console.error("Error fetching sender info", e);
    }
    return null;
  };

  // --- Data Fetching & Real-time via Supabase ---
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    const enrichNotification = async (row: any, category: 'system' | 'interaction') => {
      const metadata = normalizeNotificationMetadata(row.metadata);

      let senderInfo = {
        senderName: row.senderName || metadata?.senderName || 'مستخدم',
        senderAvatar: row.senderAvatar || metadata?.senderAvatar || null,
        senderAccountType: row.senderAccountType || null
      };
      const senderId = row.senderId || metadata?.senderId;

      if (senderId) {
        const fetched = await fetchSenderInfo(senderId);
        if (fetched) {
          senderInfo = {
            senderName: fetched.senderName || senderInfo.senderName,
            senderAvatar: fetched.senderAvatar || senderInfo.senderAvatar,
            senderAccountType: fetched.senderAccountType || senderInfo.senderAccountType
          };
        }
      }

      if (!senderInfo.senderAvatar && senderInfo.senderName) {
        senderInfo.senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderInfo.senderName)}&background=0D8ABC&color=FFFFFF`;
      }

      return {
        id: row.id,
        ...row,
        category,
        isRead: row.isRead || false,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        metadata,
        senderId,
        actionUrl: row.link || row.actionUrl || metadata?.actionUrl || null
      } as Notification;
    };

    const loadAll = async () => {
      const [{ data: sysDocs }, { data: intDocs }] = await Promise.all([
        supabase.from('notifications').select('*').eq('userId', user.id).order('createdAt', { ascending: false }).limit(50),
        supabase.from('interaction_notifications').select('*').eq('userId', user.id).order('createdAt', { ascending: false }).limit(50)
      ]);

      const p1 = (sysDocs || []).map(d => enrichNotification(d, 'system'));
      const p2 = (intDocs || []).map(d => enrichNotification(d, 'interaction'));
      const results = await Promise.all([...p1, ...p2]);

      // Sorting
      const sorted = results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // --- Intelligent Grouping Logic ---
      const grouped: Notification[] = [];
      let currentGroup: Notification | null = null;

      for (const notif of sorted) {
        if (currentGroup &&
          currentGroup.type === notif.type &&
          currentGroup.category === notif.category &&
          ['success', 'warning'].includes(notif.type)
        ) {
          currentGroup.groupedCount = (currentGroup.groupedCount || 1) + 1;
          if (!currentGroup.groupedSenders) currentGroup.groupedSenders = [{ name: currentGroup.senderName!, avatar: currentGroup.senderAvatar! }];
          if (currentGroup.groupedSenders.length < 3) {
            currentGroup.groupedSenders.push({ name: notif.senderName!, avatar: notif.senderAvatar! });
          }
        } else {
          grouped.push(notif);
          currentGroup = notif;
        }
      }

      setNotifications(grouped);
      setLoading(false);
    };

    loadAll();

    // Realtime subscription for notifications
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `userId=eq.${user.id}`
      }, () => {
        setShowNewPill(true);
        loadAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- Filtering ---
  const filteredList = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'system') return n.category === 'system';
      if (activeTab === 'mentions') return n.category === 'interaction';
      return true;
    });
  }, [notifications, activeTab]);

  // --- Actions ---
  const handleMarkRead = async (id: string, category: string) => {
    try {
      const table = category === 'interaction' ? 'interaction_notifications' : 'notifications';
      await supabase.from(table).update({ isRead: true }).eq('id', id);
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { }
  };

  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id)); // Optimistic delete
    toast.success("تم الحذف");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNewPill(false);
  };

  // --- Render Helpers ---
  const getActionIcon = (type: string, category: string) => {
    if (category === 'system') return <Shield className="w-3.5 h-3.5 fill-white text-white" />;
    switch (type) {
      case 'success': return <Heart className="w-3.5 h-3.5 fill-white text-white" />;
      case 'warning': return <UserPlus className="w-3.5 h-3.5 fill-white text-white" />;
      case 'info': return <MessageSquare className="w-3.5 h-3.5 fill-white text-white" />;
      default: return <Bell className="w-3.5 h-3.5 fill-white text-white" />;
    }
  };

  const getActionColor = (type: string, category: string) => {
    if (category === 'system') return 'bg-sky-500 shadow-sky-200';
    switch (type) {
      case 'success': return 'bg-rose-500 shadow-rose-200';
      case 'warning': return 'bg-indigo-500 shadow-indigo-200';
      case 'info': return 'bg-emerald-500 shadow-emerald-200';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900" dir="rtl">

      {/* 1. New Updates Pill (Sticky) */}
      <AnimatePresence>
        {showNewPill && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
          >
            <Button
              onClick={scrollToTop}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 px-6 h-9 text-sm font-medium gap-2"
            >
              <ArrowUp className="w-4 h-4" />
              إشعارات جديدة
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">الإشعارات</h1>
          <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-900">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="max-w-xl mx-auto flex px-2">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'mentions', label: 'التفاعلات' },
            { id: 'system', label: 'النظام' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 pb-3 pt-2 text-sm font-medium relative text-slate-500 hover:text-slate-900 transition-colors"
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-full mx-8"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Feed */}
      <div className="max-w-xl mx-auto min-h-screen pb-20">
        {loading ? (
          <div className="pt-4">
            {[1, 2, 3, 4, 5].map(i => <NotificationSkeleton key={i} />)}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">كل شيء هادئ هنا</h3>
            <p className="text-slate-500 max-w-xs mt-2 leading-relaxed">لم تتلق أي إشعارات جديدة مؤخراً. سنخبرك بمجرد حدوث شيء ما.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredList.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                getActionIcon={getActionIcon}
                getActionColor={getActionColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Notification Item Component (Interactions & Animations) ---
const NotificationItem = ({ notification, onMarkRead, onDelete, getActionIcon, getActionColor }: any) => {

  // Swipe Handler (Simplified for web, typically meaningful on mobile)
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x < -100) {
      onDelete(notification.id); // Swipe Left to delete
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={cn(
        "relative p-4 pl-12 group transition-all cursor-pointer overflow-hidden",
        notification.isRead ? "bg-white" : "bg-sky-50/30"
      )}
      onClick={() => onMarkRead(notification.id, notification.category)}
    >
      {/* Status Line */}
      {!notification.isRead && (
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-600 rounded-tr-xl rounded-br-xl" />
      )}

      <div className="flex items-start gap-4">
        {/* Avatar Section */}
        <div className="relative flex-shrink-0 mt-1">
          {notification.groupedCount && notification.groupedSenders ? (
            // Grouped Avatars Stack
            <div className="relative w-12 h-12">
              {notification.groupedSenders.slice(0, 2).map((s: any, i: number) => (
                <Avatar key={i} className={cn(
                  "absolute w-9 h-9 border-2 border-white shadow-sm transition-transform",
                  i === 0 ? "top-0 right-0 z-20" : "bottom-0 left-0 z-10 scale-90 opacity-90"
                )}>
                  <AvatarImage src={s.avatar} />
                  <AvatarFallback>{s.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            // Single Avatar
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                <AvatarImage src={notification.senderAvatar} />
                <AvatarFallback>{notification.senderName?.[0]}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-white",
                getActionColor(notification.type, notification.category)
              )}>
                {getActionIcon(notification.type, notification.category)}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 pt-0.5">
          {/* Header */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[15px] leading-6">
              <span className="font-bold text-slate-900 hover:underline decoration-slate-300 underline-offset-4">
                {notification.groupedCount
                  ? `${notification.senderName} و ${notification.groupedCount - 1} آخرين`
                  : notification.senderName}
              </span>
              <span className="text-slate-600 mx-1.5">
                {notification.title}
              </span>
              <span className="text-slate-400 text-sm font-normal">
                {formatDistanceToNow(notification.createdAt, { locale: ar, addSuffix: true })}
              </span>
            </div>

            {/* Tiny Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDelete(notification.id)} className="text-rose-600 focus:text-rose-700">
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Message Body */}
          <p className="text-slate-500 text-[15px] mt-0.5 leading-relaxed line-clamp-2">
            {notification.message}
          </p>

          {/* Rich Content Preview (If available - mocked) */}
          {notification.category === 'interaction' && notification.type === 'success' && (
            <div className="mt-3 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden max-w-[80%]">
              <div className="h-32 bg-slate-200 flex items-center justify-center text-slate-400">
                <ImageIcon className="w-8 h-8" />
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          {notification.category === 'interaction' && (
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-semibold px-4 border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                رد
              </Button>
              {notification.type === 'warning' && (
                <Button size="sm" className="h-8 rounded-full text-xs font-semibold px-4 bg-slate-900 hover:bg-slate-800">
                  متابعة
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function AdminNotificationsPage() {
  return <NotificationFeed />;
}
