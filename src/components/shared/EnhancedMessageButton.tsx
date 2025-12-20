'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { MessageCircle, Settings, Edit, Search, Check, MoreHorizontal, Trash2, Maximize2, CheckCheck, Send } from 'lucide-react';
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
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data Fetching ---
  useEffect(() => {
    if (!user?.uid) return;

    // In a real chat app, you'd likely fetch "conversations" or "threads"
    // Here we query 'messages' to simulate a recent chats list
    // We group by senderId manually to create "conversation" views
    const q = query(collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const uniqueSenders = new Map<string, MessageItem>();

      snap.forEach((d) => {
        const data = d.data();
        const senderId = data.senderId;
        if (!uniqueSenders.has(senderId)) {
          uniqueSenders.set(senderId, {
            id: d.id,
            senderId,
            senderName: data.senderName || 'مستخدم',
            senderAvatar: data.senderAvatar,
            lastMessage: data.content || 'رسالة', // simplified
            isRead: data.read || false,
            createdAt: data.timestamp?.toDate() || new Date(),
            isOnline: Math.random() > 0.7 // Mock online status for vitality
          });
        }
      });

      const items = Array.from(uniqueSenders.values());
      setMessages(items);
      setUnreadCount(items.filter(m => !m.isRead).length);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Determine Dashboard Path
  const dashboardPath = user?.accountType === 'admin' ? '/dashboard/admin' :
    user?.accountType === 'club' ? '/dashboard/club' :
      user?.accountType === 'academy' ? '/dashboard/academy' : '/dashboard/trainer';

  const filtered = messages.filter(m => m.senderName.includes(searchQuery));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-10 h-10">
          <MessageCircle className={cn("w-6 h-6 transition-colors", isOpen ? "text-blue-600 fill-blue-600" : "text-gray-600")} />

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

      <PopoverContent className="w-[95vw] sm:w-[360px] p-0 shadow-2xl border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-2 sm:mb-0" align="end" sideOffset={8}>

        {/* Header */}
        <div className="p-3 px-4 flex items-center justify-between border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h3 className="font-bold text-xl text-gray-900 tracking-tight">الدردشات</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث في الماسنجر"
              className="bg-gray-100 border-none rounded-full h-9 pr-9 text-sm focus-visible:ring-0 focus-visible:bg-gray-50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content List */}
        <ScrollArea className="h-[60vh] sm:h-[400px] bg-white">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1 pt-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-blue-300" />
              </div>
              <p className="text-gray-900 font-bold">لا توجد رسائل</p>
              <p className="text-sm text-gray-500 mt-1">تواصل مع اللاعبين والمدربين الآن</p>
            </div>
          ) : (
            <div className="pb-2">
              {filtered.map((msg) => (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={msg.id}
                  className="group relative flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer rounded-lg mx-1"
                >
                  {/* Avatar + Online Badge */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-14 h-14 border border-gray-100">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback>{msg.senderName?.[0]}</AvatarFallback>
                    </Avatar>
                    {msg.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex justify-between items-baseline">
                      <h4 className={cn("text-[15px] truncate", !msg.isRead ? "font-bold text-gray-900" : "font-medium text-gray-900")}>
                        {msg.senderName}
                      </h4>
                      <span className={cn("text-[11px]", !msg.isRead ? "text-blue-600 font-bold" : "text-gray-400")}>
                        {formatDistanceToNow(msg.createdAt, { locale: ar, addSuffix: false }).replace('منذ', '')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className={cn(
                        "text-[13px] truncate max-w-[180px]",
                        !msg.isRead ? "font-bold text-gray-900" : "text-gray-500"
                      )}>
                        {!msg.isRead && <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-1" />}
                        {msg.lastMessage}
                      </p>
                      {/* Hover Actions (Mark read / Delete) */}
                      {/* Could add mini action buttons here */}
                    </div>
                  </div>

                  {/* Unread Large Dot (Facebook Style) */}
                  {!msg.isRead && (
                    <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0 mr-1 shadow-sm shadow-blue-200"></div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-gray-50 bg-white">
          <Link href={`${dashboardPath}/chat`} onClick={() => setIsOpen(false)}>
            <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold text-sm">
              عرض الكل في الماسنجر
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
