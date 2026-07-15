'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  Send,
  X,
  Users,
  Building2,
  GraduationCap,
  UserCheck,
  Phone,
  Shield
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { dispatchNotification } from '@/lib/notifications/notification-dispatcher';
import { useTranslation } from '@/lib/i18n';

interface SendMessageButtonProps {
  // الخصائص المشتركة
  user: any;
  userData: any;
  getUserDisplayName: () => string;

  // خصائص المحادثة المباشرة
  newMessage?: string;
  selectedConversation?: any;
  onMessageSent?: () => void;
  scrollToBottom?: () => void;

  // خصائص صفحة البحث
  targetUserId?: string;
  targetUserName?: string;
  targetUserType?: string;
  className?: string;
  organizationName?: string;
  redirectToMessages?: boolean;

  // خصائص تخصيص الزر
  buttonText?: string;
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

const USER_TYPES = {
  club: { icon: Building2, color: 'text-green-600' },
  academy: { icon: GraduationCap, color: 'text-purple-600' },
  trainer: { icon: UserCheck, color: 'text-blue-600' },
  agent: { icon: Phone, color: 'text-orange-600' },
  player: { icon: Users, color: 'text-gray-600' },
  admin: { icon: Shield, color: 'text-red-600' }
};

// قوالب رسائل جاهزة لتسهيل الإرسال على اللاعب
const MESSAGE_TEMPLATES = ['trialRequest', 'joinInquiry', 'agentCollab', 'intro'];

const createNotification = async ({
  userId,
  title,
  body,
  type,
  senderName,
  senderId,
  senderType,
  link
}: {
  userId: string;
  title: string;
  body: string;
  type: string;
  senderName: string;
  senderId: string;
  senderType: string;
  link: string;
}) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const notificationData = {
    id,
    userId,
    title,
    body,
    type,
    senderName,
    senderId,
    senderType,
    link,
    isRead: false,
    createdAt: now,
    updatedAt: now
  };

  await supabase.from('notifications').insert(notificationData);
  return id;
};

const SendMessageButton: React.FC<SendMessageButtonProps> = ({
  // الخصائص المشتركة
  user,
  userData,
  getUserDisplayName,

  // خصائص المحادثة المباشرة
  newMessage = '',
  selectedConversation,
  onMessageSent,
  scrollToBottom,

  // خصائص صفحة البحث
  targetUserId,
  targetUserName,
  targetUserType,
  className = '',
  organizationName,
  redirectToMessages = false,

  // خصائص تخصيص الزر
  buttonText,
  buttonVariant = 'default',
  buttonSize = 'default'
}) => {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const msg = (key: string) => t(`sharedComponents.sendMessage.${key}`);
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [includeContactInfo, setIncludeContactInfo] = useState(true);

  const getString = (val?: any): string => (typeof val === 'string' ? val : (val ?? '')).toString();

  const buildPositionPhrase = () => {
    const position = getString((userData as any)?.position || (userData as any)?.player_position || (userData as any)?.preferred_position);
    if (!position) return '';
    return msg('positionPhrase').replace('{{position}}', position);
  };

  const buildAgePhrase = () => {
    const age = (userData as any)?.age || (userData as any)?.player_age;
    if (!age) return '';
    return msg('agePhrase').replace('{{age}}', String(age));
    };

  const replacePlaceholders = (text: string) => {
    const playerName = getUserDisplayName?.() || getString((userData as any)?.full_name || (userData as any)?.name);
    const org = getString(organizationName || targetUserName || msg('organization'));
    const recipient = getString(targetUserName || msg('team'));
    const positionPhrase = buildPositionPhrase();
    const agePhrase = buildAgePhrase();
    return text
      .replaceAll('{playerName}', playerName)
      .replaceAll('{org}', org)
      .replaceAll('{recipient}', recipient)
      .replaceAll('{positionPhrase}', positionPhrase)
      .replaceAll('{agePhrase}', agePhrase);
  };

  const applyTemplate = (templateId: string) => {
    if (!MESSAGE_TEMPLATES.includes(templateId)) return;
    const newSubject = replacePlaceholders(msg(`templates.${templateId}.subject`));
    const newBody = replacePlaceholders(msg(`templates.${templateId}.body`));
    setSubject(newSubject);
    setMessage(newBody);
  };

  const buildContactInfoBlock = () => {
    const lines: string[] = [];
    const phone = getString((userData as any)?.phone || (userData as any)?.mobile || (userData as any)?.whatsapp);
    const email = getString((userData as any)?.email || user?.email);
    const city = getString((userData as any)?.city || (userData as any)?.current_location);
    const nationality = getString((userData as any)?.nationality || (userData as any)?.country);
    if (phone) lines.push(`${msg('phoneWhatsapp')}: ${phone}`);
    if (email) lines.push(`${msg('email')}: ${email}`);
    if (city) lines.push(`${msg('city')}: ${city}`);
    if (nationality) lines.push(`${msg('nationality')}: ${nationality}`);
    if (lines.length === 0) return '';
    return `\n\n—\n${msg('contactInformation')}:\n${lines.join('\n')}`;
  };

  // التحقق من صحة البيانات
  if (!user || !userData) {
    return null;
  }

  // التحقق من صحة البيانات للمحادثة الجديدة
  if (!selectedConversation && (!targetUserId || targetUserId === user.id)) {
    return null;
  }

  const getMessagesPath = () => {
    return '/dashboard/messages';
  };

  const sendDirectMessage = async () => {
    // منع الإرسال المتكرر
    if (sending) {
      console.log('🛑 Message sending blocked - already sending');
      return;
    }

    console.log('بدء عملية إرسال الرسالة:', {
      user: user?.id,
      userData: {
        accountType: userData?.accountType,
        name: getUserDisplayName()
      },
      targetUserId,
      targetUserName,
      targetUserType
    });

    // التحقق من وجود المستخدم وبياناته
    if (!user || !userData) {
      console.error('خطأ: المستخدم غير مسجل الدخول أو البيانات غير متوفرة');
      toast.error(msg('loginRequired'));
      return;
    }

    // التحقق من وجود المستلم
    if (!targetUserId) {
      console.error('خطأ: لم يتم تحديد المستلم');
      toast.error(msg('recipientRequired'));
      return;
    }

    // التحقق من أن المستلم ليس نفس المرسل
    if (targetUserId === user.id) {
      console.error('خطأ: محاولة إرسال رسالة للنفس');
      toast.error(msg('cannotMessageSelf'));
      return;
    }

    // التحقق من وجود نص الرسالة
    if (!message.trim()) {
      console.error('خطأ: الرسالة فارغة');
      toast.error(msg('messageRequired'));
      return;
    }

    setSending(true);
    try {
      const finalMessage = `${message.trim()}${includeContactInfo ? buildContactInfoBlock() : ''}`.trim();

      // جلب بيانات المستلم المحدثة
      const { data: receiverData } = await supabase
        .from(`${targetUserType}s`)
        .select('*')
        .eq('id', targetUserId)
        .single();
      const receiverName = receiverData?.full_name || receiverData?.name || targetUserName;

      // البحث عن محادثة موجودة
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('*')
        .filter('participants', 'cs', `["${user.id}"]`);

      const existingConversation = existingConversations?.find((conv: any) => {
        return conv.participants?.includes(targetUserId);
      });

      const now = new Date().toISOString();
      let conversationId: string;
      let isNewConversation = false;

      if (existingConversation) {
        // استخدام المحادثة الموجودة
        conversationId = existingConversation.id;
        console.log('استخدام محادثة موجودة:', {
          conversationId,
          participants: existingConversation.participants
        });

        // تحديث أسماء المشاركين
        await supabase.from('conversations').update({
          participantNames: {
            ...(existingConversation.participantNames || {}),
            [user.id]: getUserDisplayName(),
            [targetUserId]: receiverName
          },
          updatedAt: now
        }).eq('id', conversationId);
      } else {
        // إنشاء محادثة جديدة
        conversationId = crypto.randomUUID();
        isNewConversation = true;
        console.log('إنشاء محادثة جديدة:', {
          conversationId,
          participants: [user.id, targetUserId]
        });

        const conversationData = {
          id: conversationId,
          participants: [user.id, targetUserId],
          participantNames: {
            [user.id]: getUserDisplayName(),
            [targetUserId]: receiverName
          },
          participantTypes: {
            [user.id]: userData.accountType,
            [targetUserId]: targetUserType
          },
          lastMessage: finalMessage,
          lastMessageTime: now,
          lastSenderId: user.id,
          unreadCount: {
            [user.id]: 0,
            [targetUserId]: 1
          },
          createdAt: now,
          updatedAt: now,
          isActive: true
        };
        await supabase.from('conversations').insert(conversationData);
      }

      // إنشاء رسالة جديدة
      const messageId = crypto.randomUUID();
      console.log('إنشاء رسالة جديدة:', {
        messageId,
        conversationId,
        sender: getUserDisplayName(),
        receiver: receiverName
      });

      const messageData = {
        id: messageId,
        conversationId,
        senderId: user.id,
        receiverId: targetUserId,
        senderName: getUserDisplayName(),
        receiverName: receiverName,
        senderType: userData.accountType,
        receiverType: targetUserType,
        subject: subject.trim() || null,
        message: finalMessage,
        messageType: 'text',
        timestamp: now,
        isRead: false,
        createdAt: now,
        updatedAt: now
      };

      await supabase.from('messages').insert(messageData);

      // تحديث المحادثة بعد إرسال الرسالة
      if (existingConversation) {
        // جلب القيمة الحالية لعداد الرسائل غير المقروءة
        const { data: convData } = await supabase
          .from('conversations')
          .select('unreadCount')
          .eq('id', conversationId)
          .single();
        const currentUnread = convData?.unreadCount?.[targetUserId] || 0;

        await supabase.from('conversations').update({
          lastMessage: finalMessage,
          lastMessageTime: now,
          lastSenderId: user.id,
          unreadCount: {
            ...(convData?.unreadCount || {}),
            [targetUserId]: currentUnread + 1
          },
          updatedAt: now
        }).eq('id', conversationId);
      }

      // إنشاء إشعار للمستلم
      const notificationTitle = isNewConversation ? msg('newMessage') : msg('newConversationMessage');
      const notificationBody = `${getUserDisplayName()}: ${finalMessage.substring(0, 50)}${finalMessage.length > 50 ? '...' : ''}`;

      await createNotification({
        userId: targetUserId,
        title: notificationTitle,
        body: notificationBody,
        type: 'message',
        senderName: getUserDisplayName(),
        senderId: user.id,
        senderType: userData.accountType,
        link: `/dashboard/messages?conversation=${conversationId}`
      });

      // التحقق من نجاح العملية
      const { data: verifyConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single();
      const { data: verifyMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('id', messageId)
        .single();

      if (!verifyConversation) {
        throw new Error(msg('conversationCreateFailed'));
      }

      if (!verifyMessage) {
        throw new Error(msg('messageCreateFailed'));
      }

      console.log('تم إرسال الرسالة بنجاح:', {
        conversationId,
        messageId,
        isNewConversation,
        messageContent: message.trim().substring(0, 50) + '...'
      });

      toast.success(isNewConversation ? msg('conversationCreatedAndSent') : msg('sent'));

      // Dispatch WhatsApp + in-app notification to receiver
      if (targetUserId && user) {
        dispatchNotification({
          eventType: 'message_received',
          targetUserId,
          actorId: user.id,
          actorName: getUserDisplayName(),
          actorAccountType: userData?.accountType || 'user',
          metadata: { messagePreview: finalMessage.substring(0, 40) },
        });
      }

      // إعادة تعيين النموذج
      setSubject('');
      setMessage('');
      setIsOpen(false);

      // التوجه لصفحة الرسائل إذا طُلب ذلك
      if (redirectToMessages) {
        const messagesPath = getMessagesPath();
        console.log('جاري التوجيه إلى:', messagesPath);
        router.push(messagesPath);
      }

    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);

      // رسائل خطأ أكثر تفصيلاً
      if (error instanceof Error) {
        console.error('تفاصيل الخطأ:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        toast.error(`${msg('errorPrefix')}: ${error.message}`);
      } else {
        console.error('خطأ غير معروف:', error);
        toast.error(msg('sendFailed'));
      }

    } finally {
      setSending(false);
    }
  };

  const startNewConversation = async () => {
    if (!targetUserId || !user || !userData) return;

    setSending(true);
    try {
      // البحث عن محادثة موجودة
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('*')
        .filter('participants', 'cs', `["${user.id}"]`);

      const existingConversation = existingConversations?.find((conv: any) => {
        return conv.participants?.includes(targetUserId);
      });

      if (existingConversation) {
        // إذا وجدت محادثة، انتقل إليها
        if (redirectToMessages) {
          const messagesPath = getMessagesPath();
          router.push(messagesPath);
        }
        return;
      }

      // إنشاء محادثة جديدة
      const now = new Date().toISOString();
      const conversationId = crypto.randomUUID();
      const conversationData = {
        id: conversationId,
        participants: [user.id, targetUserId],
        participantNames: {
          [user.id]: getUserDisplayName(),
          [targetUserId]: targetUserName
        },
        participantTypes: {
          [user.id]: userData.accountType,
          [targetUserId]: targetUserType
        },
        lastMessage: '',
        lastMessageTime: now,
        lastSenderId: '',
        unreadCount: {
          [user.id]: 0,
          [targetUserId]: 0
        },
        createdAt: now,
        updatedAt: now,
        isActive: true
      };

      await supabase.from('conversations').insert(conversationData);

      toast.success(msg('conversationCreated'));

      if (redirectToMessages) {
        const messagesPath = getMessagesPath();
        router.push(messagesPath);
      }
    } catch (error) {
      console.error('خطأ في إنشاء المحادثة:', error);
      toast.error(msg('conversationCreateError'));
    } finally {
      setSending(false);
    }
  };

  const Icon = USER_TYPES[targetUserType]?.icon || MessageSquare;

  // التحقق من نوع الاستخدام وعرض الزر المناسب
  if (selectedConversation) {
    // زر إرسال في المحادثة المباشرة
    const sendMessage = async () => {
      if (!newMessage?.trim() || !selectedConversation || !user || !userData) {
        console.error('بيانات غير مكتملة:', { newMessage, selectedConversation, user, userData });
        return;
      }

      const receiverId = selectedConversation.participants.find((id: string) => id !== user.id);
      if (!receiverId) {
        console.error('لم يتم العثور على المستلم في المحادثة:', selectedConversation);
        toast.error(msg('recipientRequired'));
        return;
      }

      setSending(true);
      try {
        // تحديث أسماء المشاركين
        const { data: receiverData } = await supabase
          .from(`${selectedConversation.participantTypes[receiverId]}s`)
          .select('*')
          .eq('id', receiverId)
          .single();
        const receiverName = receiverData?.full_name || receiverData?.name || selectedConversation.participantNames[receiverId];

        const now = new Date().toISOString();

        // تحديث أسماء المشاركين في المحادثة
        await supabase.from('conversations').update({
          participantNames: {
            ...(selectedConversation.participantNames || {}),
            [receiverId]: receiverName,
            [user.id]: getUserDisplayName()
          },
          updatedAt: now
        }).eq('id', selectedConversation.id);

        // إنشاء رسالة جديدة
        const messageId = crypto.randomUUID();
        const messageData = {
          id: messageId,
          conversationId: selectedConversation.id,
          senderId: user.id,
          receiverId: receiverId,
          senderName: getUserDisplayName(),
          receiverName: receiverName,
          senderType: userData.accountType,
          receiverType: selectedConversation.participantTypes[receiverId],
          message: newMessage.trim(),
          messageType: 'text',
          timestamp: now,
          isRead: false,
          createdAt: now,
          updatedAt: now
        };

        await supabase.from('messages').insert(messageData);

        // تحديث المحادثة - جلب قيمة unreadCount الحالية ثم تحديثها
        const { data: convData } = await supabase
          .from('conversations')
          .select('unreadCount')
          .eq('id', selectedConversation.id)
          .single();
        const currentUnread = convData?.unreadCount?.[receiverId] || 0;

        await supabase.from('conversations').update({
          lastMessage: newMessage.trim(),
          lastMessageTime: now,
          lastSenderId: user.id,
          unreadCount: {
            ...(convData?.unreadCount || {}),
            [receiverId]: currentUnread + 1
          },
          updatedAt: now
        }).eq('id', selectedConversation.id);

        // إنشاء إشعار للمستلم
        await createNotification({
          userId: receiverId,
          title: msg('newMessage'),
          body: `${getUserDisplayName()}: ${newMessage.trim().substring(0, 50)}${newMessage.length > 50 ? '...' : ''}`,
          type: 'message',
          senderName: getUserDisplayName(),
          senderId: user.id,
          senderType: userData.accountType,
          link: `/dashboard/messages?conversation=${selectedConversation.id}`
        });

        if (onMessageSent) {
          onMessageSent();
        }

        if (scrollToBottom) {
          scrollToBottom();
        }

      } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        toast.error(msg('sendFailed'));
      } finally {
        setSending(false);
      }
    };

    return (
      <Button
        onClick={sendMessage}
        disabled={!newMessage?.trim() || sending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4"
      >
        {sending ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // زر بدء محادثة جديدة في صفحة البحث
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // لا تسمح بإغلاق الموديل أثناء الإرسال
        if (sending && !open) return;
        setIsOpen(open);
      }}
      modal={true}
    >
      <DialogTrigger asChild>
        <Button
          className={`flex items-center gap-2 font-semibold ${className}`}
          variant={buttonVariant}
          size={buttonSize}
          disabled={sending}
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{buttonText || msg('message')}</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[600px] rounded-xl"
        dir={isRTL ? 'rtl' : 'ltr'}
        onEscapeKeyDown={(e) => {
          if (sending) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (sending) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (sending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-purple-800 text-lg">
            <MessageSquare className="h-5 w-5 text-purple-700" />
            {msg('sendNewMessage')}
          </DialogTitle>
          <DialogDescription className="text-purple-600">
            {msg('to')} {targetUserName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!message.trim()) {
            toast.error(msg('messageRequired'));
            return;
          }
          await sendDirectMessage();
        }}>
          <div className="space-y-4">
            {/* معلومات المستقبل */}
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="p-2 bg-white rounded-full border border-purple-100">
                <Icon className={`h-5 w-5 ${USER_TYPES[targetUserType]?.color || 'text-purple-600'}`} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900">{targetUserName}</h4>
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <span>{msg(`userTypes.${targetUserType || 'player'}`)}</span>
                  {organizationName && (
                    <>
                      <span>•</span>
                      <span className="text-purple-700">{organizationName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* قوالب سريعة */}
            <div className="space-y-2">
              <Label className="text-purple-800 font-medium">{msg('readyTemplates')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {MESSAGE_TEMPLATES.map(templateId => (
                  <Button
                    key={templateId}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-purple-300 text-purple-700 hover:bg-purple-50 text-xs"
                    onClick={() => applyTemplate(templateId)}
                    disabled={sending}
                  >
                    {msg(`templates.${templateId}.label`)}
                  </Button>
                ))}
              </div>
            </div>

            {/* موضوع الرسالة */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-purple-800 font-medium">{msg('subjectOptional')}</Label>
              <Input
                id="subject"
                placeholder={msg('subjectPlaceholder')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
                className="focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* نص الرسالة */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-purple-800 font-medium">{msg('messageLabel')} *</Label>
              <Textarea
                id="message"
                name="message"
                placeholder={msg('messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={1000}
                required
                className="focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <div className="text-xs text-gray-500 text-left">
                {message.length}/1000
              </div>
            </div>

            {/* تضمين بيانات التواصل */}
            <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
              <input
                id="includeContact"
                type="checkbox"
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                checked={includeContactInfo}
                onChange={(e) => setIncludeContactInfo(e.target.checked)}
                aria-labelledby="label-includeContact"
              />
              <Label id="label-includeContact" htmlFor="includeContact" className="cursor-pointer text-purple-900">
                {msg('attachContact')}
              </Label>
            </div>

            {redirectToMessages && (
              <div className="text-sm text-purple-800 bg-purple-50 p-3 rounded-lg border border-purple-200">
                💡 {msg('redirectAfterSend')}
              </div>
            )}

            {/* أزرار التحكم */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={sending}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                {msg('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={!message.trim() || sending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {sending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {msg('sending')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {msg('send')}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageButton;
