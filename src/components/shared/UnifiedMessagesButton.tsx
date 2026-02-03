'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Settings, Check, CheckCheck, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface ConversationItem {
    id: string;
    senderName: string;
    senderAvatar?: string;
    lastMessage: string;
    updatedAt: Date;
    unread: boolean;
    participantId: string;
}

export default function UnifiedMessagesButton() {
    const { user } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => {
                const data = doc.data();
                const otherParticipantId = data.participants.find((id: string) => id !== user.uid);

                return {
                    id: doc.id,
                    senderName: data.participantNames?.[otherParticipantId] || 'User',
                    senderAvatar: data.participantAvatars?.[otherParticipantId],
                    lastMessage: data.lastMessage || 'No messages',
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    unread: (data.unreadCount?.[user.uid] || 0) > 0,
                    participantId: otherParticipantId
                };
            });

            setConversations(items);
            const count = items.reduce((acc, curr) => curr.unread ? acc + 1 : acc, 0);
            setUnreadCount(count);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleMarkRead = async (convId: string) => {
        if (!user?.uid) return;
        try {
            const ref = doc(db, 'conversations', convId);
            await updateDoc(ref, {
                [`unreadCount.${user.uid}`]: 0
            });
        } catch (e) {
            console.error('Error marking message as read:', e);
        }
    };

    const handleConversationClick = (conv: ConversationItem) => {
        handleMarkRead(conv.id);
        setIsOpen(false);
        router.push('/dashboard/messages');
    };

    const filtered = conversations.filter(c => activeTab === 'all' || c.unread);

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
                        animate={unreadCount > 0 ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 5 }}
                    >
                        <MessageSquare className={cn("w-5 h-5 md:w-6 md:h-6 transition-all", isOpen && "fill-blue-600")} />
                    </motion.div>

                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute top-1.5 right-1.5 flex h-5 w-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg border-2 border-white dark:border-slate-900 items-center justify-center text-[9px] font-black text-white shadow-lg shadow-blue-500/20"
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
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">الرسائل</h3>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex p-1 m-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={cn(
                            "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                            activeTab === 'all'
                                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        المحادثات
                    </button>
                    <button
                        onClick={() => setActiveTab('unread')}
                        className={cn(
                            "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                            activeTab === 'unread'
                                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        غير مقروءة ({unreadCount})
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
                        <div className="flex flex-col items-center justify-center h-[380px] text-center p-8">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-24 h-24 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-premium shadow-blue-500/5"
                            >
                                <Sparkles className="w-10 h-10 text-blue-300 dark:text-blue-800" />
                            </motion.div>
                            <h4 className="text-slate-900 dark:text-white font-black text-xl mb-2">لا توجد رسائل</h4>
                            <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed font-medium">
                                {activeTab === 'unread' ? "لقد قرأت جميع رسائلك!" : "ابدأ محادثة جديدة الآن."}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100/50 dark:divide-white/5">
                            <AnimatePresence initial={false}>
                                {filtered.map((conv) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, x: 50 }}
                                        key={conv.id}
                                        className={cn(
                                            "group relative flex items-start gap-2 p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer",
                                            conv.unread && "bg-blue-500/5"
                                        )}
                                        onClick={() => handleConversationClick(conv)}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <AvatarImage src={conv.senderAvatar} />
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-bold text-xs">
                                                    {conv.senderName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>

                                            {conv.unread && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate pr-1">{conv.senderName}</span>
                                                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0">
                                                    {formatDistanceToNow(conv.updatedAt, { locale: ar, addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-xs truncate",
                                                conv.unread ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 dark:text-slate-400"
                                            )}>
                                                {conv.lastMessage}
                                            </p>
                                        </div>

                                        {!conv.unread && (
                                            <div className="ml-auto flex self-center">
                                                <CheckCheck className="w-4 h-4 text-blue-500 opacity-50" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </ScrollArea>

                <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        onClick={() => { setIsOpen(false); router.push('/dashboard/messages'); }}
                        variant="ghost"
                        size="sm"
                        className="w-full flex items-center justify-center gap-2 h-8 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                        <span>عرض كل الرسائل</span>
                        <MessageSquare className="w-3 h-3" />
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
