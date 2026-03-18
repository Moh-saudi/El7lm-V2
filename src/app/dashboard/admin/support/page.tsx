'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
  const [viewMode, setViewMode] = useState<'list' | 'table'>('table'); // Default to 'table' for productivity
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
      return () => unsubscribe();
    }
  }, [user, filter, searchTerm]);

  // Load Messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      const unsubscribe = loadMessages();
      // Mark as read when opening
      if (selectedConversation.unreadCount > 0) {
        markAsRead(selectedConversation.id);
      }
      return () => unsubscribe?.();
    }
  }, [selectedConversation?.id]); // Only re-run if ID changes

  const loadConversations = () => {
    let conversationsQuery = query(
      collection(db, 'support_conversations'),
      orderBy('updatedAt', 'desc')
    );

    if (filter !== 'all') {
      conversationsQuery = query(
        collection(db, 'support_conversations'),
        where('status', '==', filter),
        orderBy('updatedAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const conversationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportConversation[];

      const filtered = searchTerm
        ? conversationsList.filter(conv =>
          conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : conversationsList;

      setConversations(filtered);

      // Update selected conversation buffer if it exists in the new list
      if (selectedConversation) {
        const updated = filtered.find(c => c.id === selectedConversation.id);
        if (updated) setSelectedConversation(updated);
      }
    });

    return unsubscribe;
  };

  const loadMessages = () => {
    if (!selectedConversation) return;

    const messagesQuery = query(
      collection(db, 'support_messages'),
      where('conversationId', '==', selectedConversation.id),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportMessage[];

      setMessages(messagesList);
    });
  };

  const loadStats = async () => {
    try {
      const allConversationsSnapshot = await getDocs(collection(db, 'support_conversations'));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalConversations = 0;
      let openConversations = 0;
      let inProgressConversations = 0;
      let resolvedToday = 0;

      allConversationsSnapshot.forEach(doc => {
        const conv = doc.data() as SupportConversation;
        totalConversations++;

        if (conv.status === 'open') openConversations++;
        if (conv.status === 'in_progress') inProgressConversations++;

        if (conv.status === 'resolved' && conv.updatedAt?.toDate() >= today) {
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
      await updateDoc(doc(db, 'support_conversations', conversationId), {
        unreadCount: 0
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedConversation) return;
    try {
      await updateDoc(doc(db, 'support_conversations', selectedConversation.id), {
        status,
        updatedAt: serverTimestamp()
      });
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
        conversationId: selectedConversation.id,
        senderId: user.uid,
        senderName: 'الدعم الفني',
        senderType: 'admin',
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        isRead: false
      };

      await addDoc(collection(db, 'support_messages'), message);

      // Update conversation
      await updateDoc(doc(db, 'support_conversations', selectedConversation.id), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: selectedConversation.status === 'open' ? 'in_progress' : selectedConversation.status
      });

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

    setChatAmanPhone(phone || '201017799580'); // fallback
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
          // TABLE MODE: Full width table + Slide-over Details
          <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900">جميع التذاكر ({conversations.length})</h3>
              {/* Add simple filter buttons here for quick access in table mode */}
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
                onSort={() => { }} // TODO: Implement sorting
              />
            </div>
          </div>
        ) : (
          // LIST MODE: The previous 3-pane layout
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
              {/* This reuses the ChatWindow but in a sheet */}
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

