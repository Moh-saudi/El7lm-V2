'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { toast } from 'sonner';
import { openWhatsAppShare } from '@/lib/utils/whatsapp-share';

// Components
import { SupportStats } from './_components/SupportStats';
import { TicketList } from './_components/TicketList';
import { TicketTableView } from './_components/TicketTableView';
import { ChatWindow } from './_components/ChatWindow';
import { CustomerProfile } from './_components/CustomerProfile';
import { ChatAmanModal } from './_components/ChatAmanModal';
import { Button } from '@/components/ui/button';
import { LayoutList, LayoutGrid, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';

import { SupportConversation, SupportMessage, SupportStatsData } from './types';

const AdminSupportPage: React.FC = () => {
  const { user } = useAuth();

  // State
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SupportStatsData>({
    totalConversations: 0,
    openConversations: 0,
    inProgressConversations: 0,
    resolvedToday: 0,
    avgResponseTime: '~15 دقيقة'
  });

  // UI State
  const [viewMode, setViewMode] = useState<'list' | 'table'>('table');
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ChatAman Integration
  const [isChatAmanOpen, setIsChatAmanOpen] = useState(false);
  const [chatAmanPhone, setChatAmanPhone] = useState('');

  // Initial Load
  useEffect(() => {
    if (user) {
      const unsubscribe = loadConversations();
      loadStats();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, filter, searchTerm]);

  // Load Messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      const unsubscribe = loadMessages();
      if (selectedConversation.unreadCount > 0) {
        markAsRead(selectedConversation.id);
      }
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [selectedConversation?.id]);

  const loadConversations = () => {
    let query = supabase
      .from('support_conversations')
      .select('*')
      .order('updatedAt', { ascending: false });

    if (filter !== 'all') {
      query = supabase
        .from('support_conversations')
        .select('*')
        .eq('status', filter)
        .order('updatedAt', { ascending: false });
    }

    const channel = supabase
      .channel('support_conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, async () => {
        const { data } = await query;
        if (data) {
          const filtered = searchTerm
            ? data.filter((conv: SupportConversation) =>
              conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : data;
          setConversations(filtered as SupportConversation[]);
          if (selectedConversation) {
            const updated = filtered.find((c: SupportConversation) => c.id === selectedConversation.id);
            if (updated) setSelectedConversation(updated as SupportConversation);
          }
        }
      })
      .subscribe();

    // Initial load
    query.then(({ data }) => {
      if (data) {
        const filtered = searchTerm
          ? data.filter((conv: SupportConversation) =>
            conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          : data;
        setConversations(filtered as SupportConversation[]);
        if (selectedConversation) {
          const updated = filtered.find((c: SupportConversation) => c.id === selectedConversation.id);
          if (updated) setSelectedConversation(updated as SupportConversation);
        }
      }
    });

    return () => { supabase.removeChannel(channel); };
  };

  const loadMessages = () => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel('support_messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, async () => {
        const { data } = await supabase
          .from('support_messages')
          .select('*')
          .eq('conversationId', selectedConversation.id)
          .order('timestamp', { ascending: true });
        if (data) setMessages(data as SupportMessage[]);
      })
      .subscribe();

    // Initial load
    supabase
      .from('support_messages')
      .select('*')
      .eq('conversationId', selectedConversation.id)
      .order('timestamp', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as SupportMessage[]);
      });

    return () => { supabase.removeChannel(channel); };
  };

  const loadStats = async () => {
    try {
      const { data: allConversations } = await supabase
        .from('support_conversations')
        .select('*');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalConversations = 0;
      let openConversations = 0;
      let inProgressConversations = 0;
      let resolvedToday = 0;

      (allConversations || []).forEach((conv: any) => {
        totalConversations++;
        if (conv.status === 'open') openConversations++;
        if (conv.status === 'in_progress') inProgressConversations++;
        if (conv.status === 'resolved' && conv.updatedAt && new Date(conv.updatedAt) >= today) {
          resolvedToday++;
        }
      });

      setStats({
        totalConversations,
        openConversations,
        inProgressConversations,
        resolvedToday,
        avgResponseTime: '~15 دقيقة'
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('support_conversations')
        .update({ unreadCount: 0 })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedConversation) return;
    try {
      await supabase
        .from('support_conversations')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', selectedConversation.id);
      toast.success(`تم تغيير الحالة إلى ${status}`);
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setLoading(true);
    try {
      const message = {
        id: crypto.randomUUID(),
        conversationId: selectedConversation.id,
        senderId: user.id,
        senderName: 'الدعم الفني',
        senderType: 'admin',
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isRead: false
      };

      await supabase.from('support_messages').insert(message);

      // Update conversation
      await supabase
        .from('support_conversations')
        .update({
          lastMessage: newMessage.trim(),
          lastMessageTime: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: selectedConversation.status === 'open' ? 'in_progress' : selectedConversation.status
        })
        .eq('id', selectedConversation.id);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('فشل إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (phone?: string) => {
    if (!selectedConversation) return;
    setChatAmanPhone(phone || '201017799580');
    setIsChatAmanOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6" dir="rtl">
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">مركز الدعم والمساعدة</h1>
            <p className="text-slate-500 mt-1">إدارة التذاكر والرد على العملاء</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-slate-100' : ''}
              title="عرض الجدول (إنتاجية)"
            >
              <LayoutList className="h-4 w-4 ml-2" />
              جدول
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-slate-100' : ''}
              title="عرض المحادثة (تركيز)"
            >
              <LayoutGrid className="h-4 w-4 ml-2" />
              محادثة
            </Button>
          </div>
        </div>

        <SupportStats stats={stats} />
      </div>

      {/* Main Content Area */}
      <div className="h-[calc(100vh-280px)] min-h-[600px]">
        {viewMode === 'table' ? (
          <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900">جميع التذاكر ({conversations.length})</h3>
              <div className="flex gap-2">
                <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')} className="h-8">الكل</Button>
                <Button variant={filter === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('open')} className="h-8">مفتوحة</Button>
                <Button variant={filter === 'in_progress' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('in_progress')} className="h-8">جاري العمل</Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <TicketTableView
                conversations={conversations}
                onSelect={(ticket) => setSelectedConversation(ticket)}
                selectedId={selectedConversation?.id}
                onSort={() => { }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 h-full">
            <div className="col-span-12 lg:col-span-3 xl:col-span-3 h-full">
              <TicketList
                conversations={conversations}
                selectedId={selectedConversation?.id}
                onSelect={setSelectedConversation}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filter={filter}
                onFilterChange={setFilter}
              />
            </div>

            <div className="col-span-12 lg:col-span-6 xl:col-span-6 h-full">
              <ChatWindow
                conversation={selectedConversation}
                messages={messages}
                newMessage={newMessage}
                onNewMessageChange={setNewMessage}
                onSendMessage={sendMessage}
                loading={loading}
                onStatusChange={updateStatus}
                onWhatsAppClick={handleWhatsApp}
              />
            </div>

            <div className="col-span-12 lg:col-span-3 xl:col-span-3 h-full hidden lg:block">
              {selectedConversation ? (
                <CustomerProfile conversation={selectedConversation} />
              ) : (
                <div className="h-full border border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-sm bg-slate-50/50">
                  اختر محادثة لعرض تفاصيل العميل
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slide-over / Dialog for Table Mode selection */}
      {viewMode === 'table' && selectedConversation && (
        <Sheet open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
          <SheetContent side="left" className="w-[90vw] sm:w-[500px] sm:max-w-[700px] p-0 border-r border-slate-200">
            <SheetHeader className="sr-only">
              <SheetTitle>تفاصيل المحادثة</SheetTitle>
              <SheetDescription>
                محادثة الدعم الفني مع {selectedConversation?.userName}
              </SheetDescription>
            </SheetHeader>
            <div className="h-full flex flex-col bg-white">
              <div className="flex-1 overflow-hidden relative flex flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 z-50 bg-white/50 hover:bg-white text-slate-600 rounded-full"
                  onClick={() => setSelectedConversation(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <ChatWindow
                  conversation={selectedConversation}
                  messages={messages}
                  newMessage={newMessage}
                  onNewMessageChange={setNewMessage}
                  onSendMessage={sendMessage}
                  loading={loading}
                  onStatusChange={updateStatus}
                  onWhatsAppClick={handleWhatsApp}
                />
              </div>
              <div className="h-auto border-t border-slate-200 bg-slate-50 p-0">
                <CustomerProfile conversation={selectedConversation} compact={true} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <ChatAmanModal
        open={isChatAmanOpen}
        onOpenChange={setIsChatAmanOpen}
        targetPhone={chatAmanPhone}
        targetName={selectedConversation?.userName || ''}
        conversationId={selectedConversation?.id}
      />
    </div>
  );
};

export default AdminSupportPage;
