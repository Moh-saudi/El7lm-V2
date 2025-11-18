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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Headphones, 
  MessageSquare, 
  Clock, 
  User, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MessageCircle,
  Phone,
  Sparkles,
  Search,
  Send,
  Filter,
  MoreVertical,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { openWhatsAppShare, testWhatsAppShare } from '@/lib/utils/whatsapp-share';
import { cn } from '@/lib/utils';

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

interface SupportMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  message: string;
  timestamp: any;
  isRead: boolean;
}

interface SupportStats {
  totalConversations: number;
  openConversations: number;
  inProgressConversations: number;
  resolvedToday: number;
  avgResponseTime: string;
}

const AdminSupportPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SupportStats>({
    totalConversations: 0,
    openConversations: 0,
    inProgressConversations: 0,
    resolvedToday: 0,
    avgResponseTime: '~15 دقيقة'
  });
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-amber-500 text-white';
      case 'resolved': return 'bg-emerald-500 text-white';
      case 'closed': return 'bg-slate-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'urgent': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'club': return '🏆';
      case 'player': return '⚽';
      case 'agent': return '🤝';
      case 'academy': return '🎓';
      case 'trainer': return '💪';
      default: return '👤';
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
      loadStats();
    }
  }, [user, filter, searchTerm]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    }
  }, [selectedConversation]);

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
      
      // فلترة حسب البحث
      const filtered = searchTerm 
        ? conversationsList.filter(conv => 
            conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : conversationsList;
      
      setConversations(filtered);
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

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportMessage[];
      
      setMessages(messagesList);
    });

    return unsubscribe;
  };

  const loadStats = async () => {
    try {
      const allConversations = await getDocs(collection(db, 'support_conversations'));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalConversations = 0;
      let openConversations = 0;
      let inProgressConversations = 0;
      let resolvedToday = 0;

      allConversations.forEach(doc => {
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
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'support_conversations', conversationId), {
        status,
        updatedAt: serverTimestamp()
      });
      
      toast.success('تم تحديث حالة المحادثة');
    } catch (error) {
      console.error('خطأ في تحديث الحالة:', error);
      toast.error('فشل في تحديث الحالة');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setLoading(true);
    try {
      const message = {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        senderName: 'فريق الدعم الفني',
        senderType: 'admin',
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        isRead: false
      };

      await addDoc(collection(db, 'support_messages'), message);

      // تحديث المحادثة
      await updateDoc(doc(db, 'support_conversations', selectedConversation.id), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: selectedConversation.status === 'open' ? 'in_progress' : selectedConversation.status
      });

      setNewMessage('');
      toast.success('تم إرسال الرد بنجاح');
    } catch (error) {
      console.error('خطأ في إرسال الرد:', error);
      toast.error('فشل في إرسال الرد');
    } finally {
      setLoading(false);
    }
  };

  const sendSupportViaWhatsApp = (conversation: SupportConversation) => {
    if (!conversation.userId) {
      toast.error('معلومات المستخدم غير متوفرة');
      return;
    }

    const message = `🎧 رد من فريق الدعم الفني - منصة الحلم\n\nمرحباً ${conversation.userName}!\n\nنشكرك على تواصلك معنا. نحن هنا لمساعدتك في حل مشكلتك.\n\n📋 تفاصيل طلبك:\n• النوع: ${conversation.category}\n• الأولوية: ${conversation.priority}\n• الحالة: ${conversation.status}\n\nسيتم الرد عليك قريباً عبر النظام أو يمكنك التواصل معنا مباشرة.\n\nفريق الدعم الفني - منصة الحلم 🚀`;
    
    const testPhone = '201017799580';
    const result = openWhatsAppShare(testPhone, message);
    
    if (result.success) {
      toast.success('تم فتح WhatsApp بنجاح!');
    } else {
      toast.error(result.error || 'فشل في فتح WhatsApp');
    }
  };

  const testWhatsAppShareFeature = () => {
    const result = testWhatsAppShare('اختبار خدمة الدعم الفني من منصة الحلم');
    
    if (result.success) {
      toast.success('تم فتح WhatsApp للاختبار!');
    } else {
      toast.error(result.error || 'فشل في اختبار WhatsApp');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" dir="rtl">
      <div className="mx-auto max-w-[1800px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/90 mb-1">
                مركز الدعم الفني
              </p>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Headphones className="h-6 w-6" />
                إدارة طلبات الدعم والمساعدة
              </h1>
            </div>
            <Button
              onClick={testWhatsAppShareFeature}
              size="sm"
              className="h-9 bg-white/20 text-white hover:bg-white/30 text-sm backdrop-blur-sm border border-white/30"
            >
              <Sparkles className="h-4 w-4 ml-2" />
              اختبار WhatsApp
            </Button>
          </div>
          <p className="max-w-3xl text-sm text-white/90 mt-3">
            إدارة شاملة لجميع طلبات الدعم الفني، متابعة المحادثات، والرد على العملاء بسرعة وكفاءة.
          </p>
        </div>

        {/* الإحصائيات */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalConversations}</p>
                  <p className="text-xs text-white/90 mt-1">إجمالي المحادثات</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.openConversations}</p>
                  <p className="text-xs text-white/90 mt-1">محادثات مفتوحة</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.inProgressConversations}</p>
                  <p className="text-xs text-white/90 mt-1">قيد المعالجة</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.resolvedToday}</p>
                  <p className="text-xs text-white/90 mt-1">محلولة اليوم</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{stats.avgResponseTime}</p>
                  <p className="text-xs text-white/90 mt-1">متوسط الرد</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* قائمة المحادثات - عمود واحد */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="p-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ابحث في المحادثات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pr-10 text-sm"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-10 w-full sm:w-48 text-sm">
                  <SelectValue placeholder="فلترة حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="open">مفتوحة</SelectItem>
                  <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                  <SelectItem value="resolved">محلولة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[650px] overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-base">لا توجد محادثات</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-4">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        'max-w-[250px] w-full mx-auto p-4 bg-white rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg hover:border-blue-300 hover:scale-[1.02]',
                        selectedConversation?.id === conversation.id && 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-200'
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="relative">
                          <span className="text-3xl flex-shrink-0">{getUserTypeIcon(conversation.userType)}</span>
                          {conversation.unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 min-w-5 flex items-center justify-center px-1 border-2 border-white">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <Badge className={cn('text-xs px-2 py-1 h-6 w-full', getStatusColor(conversation.status))}>
                          {conversation.status === 'open' && 'مفتوحة'}
                          {conversation.status === 'in_progress' && 'قيد المعالجة'}
                          {conversation.status === 'resolved' && 'محلولة'}
                          {conversation.status === 'closed' && 'مغلقة'}
                        </Badge>
                        <h4 className="font-semibold text-sm text-slate-900 truncate w-full text-center leading-tight">
                          {conversation.userName}
                        </h4>
                        {conversation.lastMessage && (
                          <p className="text-xs text-slate-600 truncate w-full line-clamp-2 leading-relaxed">
                            {conversation.lastMessage}
                          </p>
                        )}
                        {conversation.lastMessageTime && (
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(conversation.lastMessageTime.toDate(), { 
                              addSuffix: true, 
                              locale: ar 
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog للمحادثة */}
        <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
          <DialogContent className="max-w-3xl w-[90vw] h-[75vh] p-0 flex flex-col rounded-xl overflow-hidden shadow-2xl border-0">
            {selectedConversation && (
              <>
                {/* Header محسن */}
                <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-3 flex-shrink-0 shadow-sm relative">
                  {/* زر الإغلاق الواضح */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-3 top-3 h-8 w-8 rounded-full bg-white/90 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm transition-all z-10"
                    onClick={() => setSelectedConversation(null)}
                    title="إغلاق"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center justify-between gap-3 min-w-0 pr-10">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl shadow-md">
                          {getUserTypeIcon(selectedConversation.userType)}
                        </div>
                        {selectedConversation.unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] h-4 min-w-4 flex items-center justify-center px-0.5 border-2 border-white shadow-md">
                            {selectedConversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-base font-semibold text-slate-900 truncate mb-0.5">
                          {selectedConversation.userName}
                        </DialogTitle>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={cn('text-[10px] px-1.5 py-0', getStatusColor(selectedConversation.status))}>
                            {selectedConversation.status === 'open' && 'مفتوحة'}
                            {selectedConversation.status === 'in_progress' && 'قيد المعالجة'}
                            {selectedConversation.status === 'resolved' && 'محلولة'}
                            {selectedConversation.status === 'closed' && 'مغلقة'}
                          </Badge>
                          <span className="text-[10px] text-slate-500">
                            {selectedConversation.category === 'technical' && '🔧 مشكلة تقنية'}
                            {selectedConversation.category === 'billing' && '💳 مشكلة مالية'}
                            {selectedConversation.category === 'general' && '💬 استفسار عام'}
                            {selectedConversation.category === 'bug_report' && '🐛 بلاغ عن خطأ'}
                            {selectedConversation.category === 'feature_request' && '✨ طلب ميزة جديدة'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select 
                        value={selectedConversation.status} 
                        onValueChange={(value) => updateConversationStatus(selectedConversation.id, value)}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs bg-white border-slate-300 hover:border-blue-400 focus:ring-2 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">مفتوحة</SelectItem>
                          <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                          <SelectItem value="resolved">محلولة</SelectItem>
                          <SelectItem value="closed">مغلقة</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 transition-all"
                        onClick={() => sendSupportViaWhatsApp(selectedConversation)}
                        title="إرسال عبر WhatsApp"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-600 ml-1.5" />
                        <span className="text-xs font-medium">واتساب</span>
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                {/* منطقة الرسائل محسنة */}
                <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-50 min-w-0 scroll-smooth">
                  <div className="space-y-3 min-w-0 max-w-2xl mx-auto">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-500 py-12">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <MessageCircle className="h-8 w-8 text-blue-400 opacity-70" />
                        </div>
                        <p className="text-sm font-medium">لا توجد رسائل بعد</p>
                        <p className="text-xs text-slate-400 mt-1">ابدأ المحادثة بإرسال رسالة</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-300',
                            message.senderType === 'admin' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[75%] min-w-0 p-3 rounded-xl shadow-sm transition-all hover:shadow-md',
                              message.senderType === 'admin'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm'
                                : message.senderType === 'system'
                                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border-2 border-amber-200 rounded-bl-sm'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm hover:border-slate-300'
                            )}
                            style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}
                          >
                            {message.senderType !== 'admin' && message.senderType !== 'system' && (
                              <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-slate-200">
                                <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                                <span className="text-[11px] font-semibold text-slate-700 truncate">{message.senderName}</span>
                              </div>
                            )}
                            <p 
                              className={cn(
                                'text-xs whitespace-pre-wrap leading-relaxed break-words',
                                message.senderType === 'admin' ? 'text-white' : 'text-slate-800'
                              )}
                              style={{
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {message.message}
                            </p>
                            <div className="flex items-center justify-between mt-2 gap-2 pt-1.5 border-t border-white/20">
                              <span className={cn(
                                'text-[10px] flex-shrink-0',
                                message.senderType === 'admin' ? 'text-white/80' : 'text-slate-500'
                              )}>
                                {message.timestamp && formatDistanceToNow(message.timestamp.toDate(), { 
                                  addSuffix: true, 
                                  locale: ar 
                                })}
                              </span>
                              {message.senderType === 'admin' && (
                                <CheckCircle className={cn(
                                  'h-3 w-3 flex-shrink-0',
                                  message.isRead ? 'text-emerald-300' : 'text-white/50'
                                )} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* فورم الرد محسن */}
                <div className="border-t border-slate-200 bg-white p-3 flex-shrink-0 shadow-lg">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="اكتب ردك هنا..."
                        className="w-full min-h-[70px] max-h-[120px] resize-y text-xs border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pr-3"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            sendMessage();
                          }
                        }}
                      />
                      <div className="absolute left-2 bottom-2 flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                          Ctrl+Enter
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || loading}
                      className="h-[70px] px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4 ml-1.5" />
                      <span className="text-xs font-semibold">إرسال</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminSupportPage;
