'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { MessageCircle, Settings, Edit, Search, Check, MoreHorizontal, Trash2, CheckCheck, Send, Sparkles, ChevronLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  lastMessage: string;
  isRead: boolean;
  createdAt: Date;
  isOnline?: boolean;
}

export default function EnhancedMessageButton() {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data Fetching ---
  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('receiverId', user.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (data) {
        const uniqueSenders = new Map<string, MessageItem>();
        data.forEach((d: any) => {
          const senderId = d.senderId;
          if (!uniqueSenders.has(senderId)) {
            uniqueSenders.set(senderId, {
              id: d.id,
              senderId,
              senderName: d.senderName || 'مستخدم',
              senderAvatar: d.senderAvatar,
              lastMessage: d.content || 'رسالة',
              isRead: d.read || false,
              createdAt: d.timestamp ? new Date(d.timestamp) : new Date(),
              isOnline: Math.random() > 0.7
            });
          }
        });
        const items = Array.from(uniqueSenders.values());
        setMessages(items);
        setUnreadCount(items.filter(m => !m.isRead).length);
      }
      setLoading(false);
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `receiverId=eq.${user.id}` },
        () => { fetchMessages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const dashboardPath = userData?.accountType === 'admin' ? '/dashboard/admin' :
    userData?.accountType === 'club' ? '/dashboard/club' :
      userData?.accountType === 'academy' ? '/dashboard/academy' : '/dashboard/trainer';

  const filtered = messages.filter(m => m.senderName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "group relative w-10 h-10 md:w-11 md:h-11 rounded-2xl transition-all duration-300",
            isOpen ? "bg-emerald-500/10 text-emerald-600 shadow-inner" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          )}
        >
          <motion.div animate={unreadCount > 0 ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
            <MessageSquare className={cn("w-5 h-5 md:w-6 md:h-6 transition-all", isOpen && "fill-emerald-600")} />
          </motion.div>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-1.5 right-1.5 flex h-5 w-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg border-2 border-white dark:border-slate-900 items-center justify-center text-[9px] font-black text-white shadow-lg shadow-emerald-500/20"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
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
        {/* Modern Header */}
        <div className="p-5 px-6 flex items-center justify-between border-b border-white/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white">الدردشات</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 bg-white/50 dark:bg-transparent">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input
              placeholder="البحث في المحادثات..."
              className="bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl h-10 pr-10 text-sm focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="h-[60vh] sm:h-[450px]">
          {loading ? (
            <div className="p-6 space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div className="space-y-2 flex-1 pt-1">
                    <Skeleton className="h-4 w-1/3 rounded-lg" />
                    <Skeleton className="h-3 w-3/4 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[380px] text-center p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-premium shadow-emerald-500/5"
              >
                <Sparkles className="w-10 h-10 text-emerald-300 dark:text-emerald-800" />
              </motion.div>
              <h4 className="text-slate-900 dark:text-white font-black text-xl mb-2">ابدأ القصة..</h4>
              <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed font-medium">
                تواصل مع المجتمع الرياضي الآن وشارك شغفك.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/50 dark:divide-white/5">
              {filtered.map((msg) => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={msg.id}
                  className={cn(
                    "group relative flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer",
                    !msg.isRead && "bg-emerald-500/5"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-14 h-14 rounded-2xl border-2 border-white dark:border-slate-800 shadow-premium transition-transform group-hover:scale-105">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback className="bg-slate-200 text-slate-600 font-black">
                        {msg.senderName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {msg.isOnline && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white dark:border-slate-900 rounded-lg shadow-lg"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className={cn("text-sm truncate", !msg.isRead ? "font-black text-slate-900 dark:text-white" : "font-bold text-slate-600")}>
                        {msg.senderName}
                      </h4>
                      <span className={cn("text-[10px] whitespace-nowrap", !msg.isRead ? "text-emerald-600 font-black" : "text-slate-400 font-bold")}>
                        {formatDistanceToNow(msg.createdAt, { locale: ar, addSuffix: false }).replace('منذ', '')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={cn(
                        "text-xs truncate max-w-[200px] font-medium leading-normal",
                        !msg.isRead ? "text-slate-900 dark:text-white" : "text-slate-400"
                      )}>
                        {msg.lastMessage}
                      </p>
                      {!msg.isRead && (
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20 animate-pulse" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Global Footer */}
        <div className="p-4 bg-gradient-to-t from-slate-50/50 to-transparent dark:from-slate-900/50">
          <Link href={`${dashboardPath}/chat`} onClick={() => setIsOpen(false)}>
            <Button className="w-full flex items-center justify-between px-6 h-12 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all group">
              <span>عرض جميع المحادثات</span>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
