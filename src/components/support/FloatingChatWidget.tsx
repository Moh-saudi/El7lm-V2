'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Headphones,
  User,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { buildSenderInfo, normalizeNotificationPayload } from '@/lib/notifications/sender-utils';

interface SupportMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  message: string;
  timestamp: any;
  isRead: boolean;
  attachments?: string[];
}

interface SupportConversation {
  id: string;
  userId: string;
  userName: string;
  userType: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'general' | 'bug_report' | 'feature_request';
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
  assignedTo?: string;
  createdAt: any;
  updatedAt: any;
}

const FloatingChatWidget: React.FC = () => {
  const { user, userData } = useAuth();
  const pathname = usePathname();

  const [hasLogged, setHasLogged] = useState(false);

  useEffect(() => {
    if (!hasLogged) {
      console.log('🔧 FloatingChatWidget - Component loaded', {
        pathname,
        user: !!user,
        userData: !!userData,
        accountType: userData?.accountType
      });
      setHasLogged(true);
    }
  }, [pathname, user, userData, hasLogged]);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [category, setCategory] = useState<string>('general');
  const [priority, setPriority] = useState<string>('medium');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hiddenPages = [
    '/auth/login',
    '/auth/register',
    '/admin/login',
    '/admin/login-advanced',
    '/admin/login-new',
    '/',
    '/about',
    '/contact',
    '/privacy'
  ];

  const shouldHideWidget = () => {
    if (hiddenPages.includes(pathname)) return true;
    if (pathname.startsWith('/dashboard/admin')) return true;
    if (!user) return true;
    if (userData?.accountType === 'admin') return true;
    if (!userData?.accountType) return true;
    return false;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  useEffect(() => {
    if (user && userData?.accountType) {
      loadExistingConversation();
    }
  }, [user, userData?.accountType]);

  useEffect(() => {
    if (!conversation || !user) return;

    // Initial fetch
    loadMessagesManually();

    // Realtime subscription
    const channel = supabase
      .channel(`support-messages-${conversation.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_messages',
        filter: `conversationId=eq.${conversation.id}`
      }, () => {
        loadMessagesManually();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation, user]);

  const loadMessagesManually = async () => {
    if (!conversation) return;

    try {
      const { data: allMessages } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversationId', conversation.id)
        .order('timestamp', { ascending: true });

      if (!allMessages) return;

      setMessages(allMessages as SupportMessage[]);

      const unread = allMessages.filter(
        (msg: SupportMessage) => !msg.isRead && msg.senderId !== user?.id
      ).length;
      setUnreadCount(unread);

      markMessagesAsRead(allMessages as SupportMessage[]);
    } catch (error) {
      console.error('خطأ في تحميل الرسائل:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadExistingConversation = async () => {
    if (!user) return;

    try {
      const { data: allConversations } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('userId', user.id);

      if (!allConversations || allConversations.length === 0) return;

      const sortedConversations = [...allConversations].sort((a, b) => {
        if (!a.updatedAt || !b.updatedAt) return 0;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      const activeConversation = sortedConversations.find(conv =>
        conv.status === 'open' || conv.status === 'in_progress'
      );

      if (activeConversation) {
        setConversation(activeConversation as SupportConversation);
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل المحادثة:', error);
    }
  };

  const createNewConversation = async () => {
    if (!user || !userData) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const newId = crypto.randomUUID();
      const newConversation = {
        id: newId,
        userId: user.id,
        userName: userData.name || userData.displayName || userData.full_name || 'مستخدم',
        userType: userData.accountType || 'player',
        status: 'open',
        priority,
        category,
        lastMessage: '',
        lastMessageTime: now,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now
      };

      await supabase.from('support_conversations').insert(newConversation);

      setConversation(newConversation as SupportConversation);
      await sendWelcomeMessage(newId);
      toast.success('تم إنشاء محادثة دعم فني جديدة');
    } catch (error) {
      console.error('❌ خطأ في إنشاء المحادثة:', error);
      toast.error('فشل في إنشاء محادثة الدعم');
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeMessage = async (conversationId: string) => {
    try {
      await supabase.from('support_messages').insert({
        id: crypto.randomUUID(),
        conversationId,
        senderId: 'system',
        senderName: 'نظام الدعم الفني',
        senderType: 'system',
        message: 'مرحباً بك في الدعم الفني لـ الحلم el7lm! 👋\n\nكيف يمكننا مساعدتك اليوم؟ فريق الدعم سيرد عليك في أقرب وقت ممكن.',
        timestamp: new Date().toISOString(),
        isRead: true
      });
    } catch (error) {
      console.error('❌ خطأ في إرسال رسالة الترحيب:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || !userData) return;
    if (loading) return;

    if (!conversation) {
      await createNewConversation();
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const newMessage = {
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        senderId: user.id,
        senderName: userData.name || userData.displayName || userData.full_name || 'مستخدم',
        senderType: userData.accountType || 'player',
        message: message.trim(),
        timestamp: now,
        isRead: false
      };

      await supabase.from('support_messages').insert(newMessage);

      await supabase.from('support_conversations').update({
        lastMessage: message.trim(),
        lastMessageTime: now,
        updatedAt: now,
        status: conversation.status === 'resolved' ? 'open' : conversation.status
      }).eq('id', conversation.id);

      await sendAdminNotification(newMessage);

      setMessage('');
      toast.success('تم إرسال الرسالة');
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      toast.error('فشل في إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const sendAdminNotification = async (messageData: any) => {
    try {
      const senderInfo = buildSenderInfo({
        user,
        userData,
        fallbackName: messageData.senderName,
        fallbackAccountType: messageData.senderType
      });

      const notificationData = {
        userId: 'system',
        title: 'رسالة دعم فني جديدة',
        body: `${messageData.senderName}: ${messageData.message.substring(0, 50)}${messageData.message.length > 50 ? '...' : ''}`,
        type: 'support',
        senderName: messageData.senderName,
        senderId: messageData.senderId,
        senderType: messageData.senderType,
        conversationId: messageData.conversationId,
        link: `/dashboard/admin/support?conversation=${messageData.conversationId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: conversation?.priority || 'medium',
        category: conversation?.category || 'general',
        metadata: {
          senderId: senderInfo.senderId || messageData.senderId,
          senderName: senderInfo.senderName || messageData.senderName,
          senderAccountType: senderInfo.senderAccountType || messageData.senderType,
          senderAvatar: senderInfo.senderAvatar,
          senderBucket: senderInfo.senderBucket
        }
      };

      const normalizedNotification = normalizeNotificationPayload(notificationData, senderInfo);
      await supabase.from('notifications').insert({ id: crypto.randomUUID(), ...normalizedNotification });
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار الأدمن:', error);
    }
  };

  const markMessagesAsRead = async (msgs: SupportMessage[]) => {
    const unreadMessages = msgs.filter(msg => !msg.isRead && msg.senderId !== user?.id);
    for (const msg of unreadMessages) {
      try {
        await supabase.from('support_messages').update({ isRead: true }).eq('id', msg.id);
      } catch (error) {
        console.error('خطأ في تحديث حالة القراءة:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!shouldHideWidget() && (
        <div className="fixed bottom-6 left-6 z-[9999] md:bottom-6 bottom-[76px]">
          <div className="relative">
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>

            <Button
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-16 h-16 text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-2xl transition-all duration-500 ease-out hover:from-green-600 hover:to-emerald-700 hover:shadow-3xl hover:scale-[1.02] border-2 border-white"
              aria-label="فتح الدعم الفني"
            >
              <MessageCircle className="w-7 h-7" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="flex absolute -top-2 -right-2 justify-center items-center p-0 w-6 h-6 text-xs rounded-full animate-bounce"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>

            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-500 whitespace-nowrap">
              الدعم الفني
            </div>
          </div>
        </div>
      )}

      {isOpen && !shouldHideWidget() && (
        <div className="fixed bottom-6 left-6 z-[9999] w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200">
          <div className="p-4 text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-lg">
            <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
                <Headphones className="w-5 h-5" />
                <h3 className="font-semibold">الدعم الفني</h3>
            </div>
              <div className="flex gap-2 items-center">
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/support', '_blank')}
                  className="text-white hover:bg-white/20"
                  title="فتح صفحة الدعم الفني الكاملة"
              >
                  <HelpCircle className="w-4 h-4" />
              </Button>
              <Button
                  variant="ghost"
                  size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                  className="text-white hover:bg-white/20"
              >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                  variant="ghost"
                  size="sm"
                onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
              >
                  <X className="w-4 h-4" />
              </Button>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex flex-col h-96">
              <div className="overflow-y-auto flex-1 p-4 bg-gray-50">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="w-8 h-8 rounded-full border-b-2 border-green-600 animate-spin"></div>
                    </div>
                ) : messages.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <MessageCircle className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                    <h3 className="mb-2 text-lg font-semibold">مرحباً بك في الدعم الفني</h3>
                    <p className="text-sm">كيف يمكننا مساعدتك اليوم؟</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <div
                        key={`${msg.id}-${index}`}
                        className={`flex items-start gap-2 ${
                          msg.senderId === user?.id ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-full">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                        </div>
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.senderId === user?.id
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <div className="flex gap-1 items-center mt-1">
                            <span className="text-xs opacity-70">
                              {msg.timestamp ?
                                formatDistanceToNow(new Date(msg.timestamp), {
                                  addSuffix: true,
                                  locale: ar
                                }) :
                                'الآن'
                              }
                              </span>
                            {msg.senderId === user?.id && (
                              <CheckCircle className="w-3 h-3 opacity-70" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t">
                <div className="flex gap-2 items-center">
                    <Input
                    type="text"
                    placeholder="اكتب رسالتك..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!message.trim() || loading}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                    <Send className="w-4 h-4" />
                    </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;
