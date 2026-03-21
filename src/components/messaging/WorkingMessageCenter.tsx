'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  limit,
  addDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlayerAvatarUrl, getUserAvatarFromSupabase } from '@/lib/supabase/image-utils';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { NewChatModal } from '@/components/messaging/NewChatModal';
import {
  MessageSquare,
  Send,
  Search,
  Users,
  Building2,
  GraduationCap,
  UserCheck,
  Phone,
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  Smile,
  Loader2,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { useClarity } from '@/hooks/useClarity';

interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantTypes: Record<string, string>;
  subject: string;
  lastMessage: string;
  lastMessageTime: any;
  lastSenderId: string;
  unreadCount: Record<string, number>;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  participantAvatars?: Record<string, string>;
}

interface Contact {
  id: string;
  name: string;
  type: 'club' | 'player' | 'agent' | 'academy' | 'trainer' | 'admin';
  avatar?: string | null;
  isOnline: boolean;
  organizationName?: string | null;
  isDependent?: boolean;
  parentAccountId?: string | null;
  parentAccountType?: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  senderType: string;
  receiverType: string;
  message: string;
  timestamp: any;
  isRead: boolean;
  messageType: 'text';
  senderAvatar?: string;
  deliveryStatus: 'sending' | 'sent';
}

const USER_TYPES = {
  club: { name: 'نادي', icon: Building2, color: 'text-green-600' },
  academy: { name: 'أكاديمية', icon: GraduationCap, color: 'text-purple-600' },
  trainer: { name: 'مدرب', icon: UserCheck, color: 'text-blue-600' },
  agent: { name: 'وكيل', icon: Phone, color: 'text-orange-600' },
  player: { name: 'لاعب', icon: Users, color: 'text-gray-600' },
  admin: { name: 'مشرف', icon: Shield, color: 'text-red-600' }
};

const WorkingMessageCenter: React.FC = () => {
  const { user, userData } = useAuth();
  const { trackEvent, setTag, upgradeSession } = useClarity();
  const t = (key: string) => key;
  const locale = 'ar';
  const isRTL = true;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsFetched, setContactsFetched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'player' | 'club' | 'academy' | 'agent' | 'trainer'>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const hasSetupConversationsRef = useRef<boolean>(false);
  const conversationsUnsubRef = useRef<null | (() => void)>(null);
  const hasFetchedContactsRef = useRef<boolean>(false);
  const isFetchingContactsRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Helper: check if participant is a dependent player using loaded contacts
  const isParticipantDependent = (participantId: string | undefined, participantType: string | undefined): boolean => {
    if (!participantId || !participantType) return false;
    if (participantType !== 'player') return false;
    const contactKey = `player_${participantId}`;
    const c = contacts.find((x) => x.id === contactKey);
    return Boolean(c?.isDependent);
  };

  useEffect(() => {
    setIsClient(true);

    // تنظيف أي مستمع قديم عند تغيير المستخدم
    if (conversationsUnsubRef.current) {
      conversationsUnsubRef.current();
      conversationsUnsubRef.current = null;
      hasSetupConversationsRef.current = false;
    }

    if (user && userData && !hasSetupConversationsRef.current) {
      // إعداد مستمع المحادثات مرة واحدة فقط لكل مستخدم
      setLoading(true);
      const conversationsQueryRef = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      const unsub = onSnapshot(
        conversationsQueryRef,
        (snapshot) => {
          const conversationsData: Conversation[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            conversationsData.push({
              id: doc.id,
              participants: data.participants || [],
              participantNames: data.participantNames || {},
              participantTypes: data.participantTypes || {},
              subject: data.subject || 'محادثة جديدة',
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime,
              lastSenderId: data.lastSenderId || '',
              unreadCount: data.unreadCount || {},
              isActive: data.isActive !== false,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              participantAvatars: data.participantAvatars || {}
            });
          });
          // Sort client-side by updatedAt desc to avoid compound index/watch issues
          conversationsData.sort((a, b) => {
            const aDate = a.updatedAt?.toDate ? a.updatedAt.toDate() : (a.updatedAt ? new Date(a.updatedAt) : new Date(0));
            const bDate = b.updatedAt?.toDate ? b.updatedAt.toDate() : (b.updatedAt ? new Date(b.updatedAt) : new Date(0));
            return bDate.getTime() - aDate.getTime();
          });
          console.log('✅ تم جلب المحادثات:', conversationsData.length);
          setConversations(conversationsData);
          setLoading(false);
        },
        (error) => {
          console.error('❌ خطأ في جلب المحادثات:', error);
          setError('حدث خطأ في جلب المحادثات');
          setLoading(false);
        }
      );
      conversationsUnsubRef.current = unsub;
      hasSetupConversationsRef.current = true;

      // بدء جلب جهات الاتصال مرة واحدة فقط
      if (!hasFetchedContactsRef.current && !isFetchingContactsRef.current) {
        // قفل متفائل لمنع الاستدعاء المزدوج في وضع التطوير
        hasFetchedContactsRef.current = true;
        fetchContacts().finally(() => {
          setContactsFetched(true);
        });
      }
    } else if (!user) {
      setError('يرجى تسجيل الدخول');
      setLoading(false);
    }

    return () => {
      if (conversationsUnsubRef.current) {
        conversationsUnsubRef.current();
        conversationsUnsubRef.current = null;
        hasSetupConversationsRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, !!userData]);

  // إلغاء useEffect الإضافي لجلب جهات الاتصال لتفادي الاستدعاء المزدوج

  // إغلاق منتقي الإيموجي عند النقر خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // إلغاء إعادة الجلب التلقائي لتفادي الحلقات؛ الاعتماد على المحاولة الأولى وزر إعادة المحاولة فقط

  // التمرير التلقائي للرسائل الجديدة
  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof window !== 'undefined') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // إضافة مستمع لإغلاق منتقي الإيموجي عند النقر خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, []);

  // دالة إضافة الإيموجي للرسالة
  const onEmojiClick = (emojiData: any) => {
    const emoji = emojiData.emoji;
    if (typeof document !== 'undefined') {
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
      const cursorPosition = inputElement?.selectionStart || newMessage.length;
      const updatedMessage = newMessage.slice(0, cursorPosition) + emoji + newMessage.slice(cursorPosition);
      setNewMessage(updatedMessage);
    }
    setShowEmojiPicker(false);
  };

  const fetchData = async () => {
    // لم تعد مستخدمة كمُهيّئ؛ تم نقل الاشتراك إلى useEffect مع تنظيف صحيح
  };

  // دالة إنشاء محادثة جديدة
  const createNewConversation = async (contact: Contact) => {
    if (!user || !userData) {
      toast.error('يرجى تسجيل الدخول');
      return;
    }

    try {
      console.log('🔄 إنشاء محادثة جديدة مع:', contact.name);

      // استخراج معرف المستند الفعلي من معرف الاتصال
      const actualContactId = contact.id.replace(/^(club_|academy_|agent_|trainer_|player_|admin_)/, '');

      // التحقق من وجود محادثة سابقة
      const existingConversationQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );

      const existingSnapshot = await getDocs(existingConversationQuery);
      const existingConversation = existingSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(actualContactId);
      });

      if (existingConversation) {
        console.log('✅ وجدت محادثة موجودة:', existingConversation.id);
        toast.info('المحادثة موجودة بالفعل');
        setNewChatModalOpen(false);
        return;
      }

      // Get proper sender name for conversation
      const getCurrentUserName = () => {
        if (userData.accountType === 'player') {
          return userData.full_name || userData.name || userData.displayName || user.displayName || 'أنا';
        } else if (userData.accountType === 'club') {
          return userData.name || userData.club_name || userData.displayName || user.displayName || 'نادي';
        } else if (userData.accountType === 'academy') {
          return userData.name || userData.academy_name || userData.displayName || user.displayName || 'أكاديمية';
        } else if (userData.accountType === 'agent') {
          return userData.name || userData.agent_name || userData.agency_name || userData.displayName || user.displayName || 'وكيل';
        } else if (userData.accountType === 'trainer') {
          return userData.name || userData.trainer_name || userData.displayName || user.displayName || 'مدرب';
        } else {
          return userData.displayName || userData.name || userData.full_name || user.displayName || 'أنا';
        }
      };

      // إنشاء محادثة جديدة
      const newConversationData = {
        participants: [user.uid, actualContactId],
        participantNames: {
          [user.uid]: getCurrentUserName(),
          [actualContactId]: contact.name
        },
        participantTypes: {
          [user.uid]: userData.accountType || 'player',
          [actualContactId]: contact.type
        },
        participantAvatars: {
          [user.uid]: userData.avatar || null,
          [actualContactId]: contact.avatar || null
        },
        subject: `محادثة مع ${contact.name}`,
        lastMessage: '',
        lastMessageTime: null,
        lastSenderId: '',
        unreadCount: {
          [user.uid]: 0,
          [actualContactId]: 0
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const conversationRef = await addDoc(collection(db, 'conversations'), newConversationData);

      console.log('✅ تم إنشاء محادثة جديدة:', conversationRef.id);
      toast.success(`تم إنشاء محادثة مع ${contact.name}`);

      // Track Clarity events
      trackEvent('new_conversation_created');
      setTag('conversation_type', contact.type);
      upgradeSession('new_conversation_created');

      setNewChatModalOpen(false);
      setSelectedContact(null);

      // إعادة تحميل المحادثات
      await fetchData();

    } catch (error) {
      console.error('❌ خطأ في إنشاء المحادثة:', error);
      toast.error('فشل في إنشاء المحادثة');
    }
  };

  // دالة إغلاق نافذة المحادثة الجديدة
  const closeNewChat = () => {
    setNewChatModalOpen(false);
    setSelectedContact(null);
  };

  const fetchContacts = async () => {
    // منع استدعاء متكرر إذا كان قيد التحميل
    if (contactsLoading || isFetchingContactsRef.current) {
      return;
    }
    isFetchingContactsRef.current = true;
    setContactsLoading(true);
    if (!user) {
      console.log('❌ لا يمكن جلب جهات الاتصال - المستخدم غير متوفر');
      setContactsLoading(false);
      return;
    }

    if (!userData) {
      console.log('⚠️ لا يمكن جلب جهات الاتصال - بيانات المستخدم غير متوفرة، سيتم المحاولة بدونها');
    }

    // إزالة أي تأخير قد يسبب تراكب الاستدعاءات

    try {
      console.log('🔄 جلب جهات الاتصال...');
      console.log('👤 المستخدم الحالي:', user.uid);
      console.log('📋 بيانات المستخدم:', userData);
      const allContacts: Contact[] = [];

      // جلب جميع المستخدمين من مجموعة users أولاً (بالتوازي لتسريع العرض)
      try {
        console.log('🔄 جلب جميع المستخدمين...');
        const usersQueryRef = query(
          collection(db, 'users'),
          limit(100)
        );
        const usersSnapshot = await getDocs(usersQueryRef);
        console.log('✅ تم جلب المستخدمين:', usersSnapshot.docs.length);

        const processUser = async (userDocSnapshot: any): Promise<Contact | null> => {
          const data = userDocSnapshot.data();
          if (userDocSnapshot.id === user.uid) return null;
          const accountType = data.accountType;
          if (!accountType || !['club', 'academy', 'agent', 'trainer', 'player'].includes(accountType)) return null; // استثناء admin

          let contactName: string = 'مستخدم';
          let organizationName: any = null;
          let isDependent = false;
          let parentAccountId: any = null;
          let parentAccountType: any = null;
          let profileData: any = null;

          try {
            const profileCollection = accountType === 'admin' ? 'users' : `${accountType}s`;
            const profileDocRef = doc(db, profileCollection, userDocSnapshot.id);
            const profileDocSnapshot = await getDoc(profileDocRef);
            if (profileDocSnapshot.exists()) {
              profileData = profileDocSnapshot.data() as any;
              if (accountType === 'player') {
                contactName = profileData.full_name || profileData.name || profileData.displayName || data.displayName || data.name || data.full_name || 'لاعب';
                if (profileData.club_id || profileData.academy_id || profileData.trainer_id || profileData.agent_id) {
                  isDependent = true;
                  parentAccountId = profileData.club_id || profileData.academy_id || profileData.trainer_id || profileData.agent_id;
                  if (profileData.club_id) parentAccountType = 'club';
                  else if (profileData.academy_id) parentAccountType = 'academy';
                  else if (profileData.trainer_id) parentAccountType = 'trainer';
                  else if (profileData.agent_id) parentAccountType = 'agent';
                }
                organizationName = profileData.current_club || profileData.clubName || profileData.academyName || null;
              } else if (accountType === 'club') {
                contactName = profileData.name || profileData.club_name || profileData.displayName || data.displayName || data.name || 'نادي';
                organizationName = profileData.organizationName || profileData.clubName || null;
              } else if (accountType === 'academy') {
                contactName = profileData.name || profileData.academy_name || profileData.displayName || data.displayName || data.name || 'أكاديمية';
                organizationName = profileData.organizationName || profileData.academyName || null;
              } else if (accountType === 'agent') {
                contactName = profileData.name || profileData.agent_name || profileData.agency_name || profileData.displayName || data.displayName || data.name || 'وكيل';
                organizationName = profileData.organizationName || profileData.agencyName || null;
              } else if (accountType === 'trainer') {
                contactName = profileData.name || profileData.trainer_name || profileData.displayName || data.displayName || data.name || 'مدرب';
                organizationName = profileData.organizationName || profileData.specialization || null;
              }
            } else {
              // Fallback to users collection data
              contactName = data.displayName || data.name || data.full_name || 'مستخدم';
              organizationName = data.organizationName || data.clubName || data.academyName || data.agencyName || null;
            }
          } catch (e) {
            console.log(`⚠️ خطأ ملف شخصي ${userDocSnapshot.id}:`, e);
            contactName = data.displayName || data.name || data.full_name || 'مستخدم';
            organizationName = data.organizationName || data.clubName || data.academyName || data.agencyName || null;
          }

          let avatarUrl: string | null = null;
          try {
            // Try Supabase first, then fallback to profile data, then users data
            avatarUrl = await getUserAvatarFromSupabase(userDocSnapshot.id, accountType);
            if (!avatarUrl && profileData?.avatar) {
              avatarUrl = profileData.avatar;
            }
            if (!avatarUrl && data.avatar) {
              avatarUrl = data.avatar;
            }
            if (!avatarUrl) {
              const userDataForAvatar = { ...data, uid: userDocSnapshot.id, accountType };
              avatarUrl = getPlayerAvatarUrl(userDataForAvatar, user);
            }
          } catch (e) {
            console.log(`⚠️ خطأ جلب الصورة ${userDocSnapshot.id}:`, e);
            avatarUrl = null;
          }

          // Use clean contact name without type prefixes
          let displayName = contactName;
          if (isDependent && accountType === 'player' && parentAccountType) {
            const parentTypeNames: any = { club: 'نادي', academy: 'أكاديمية', trainer: 'مدرب', agent: 'وكيل' };
            displayName = `${contactName} (${parentTypeNames[parentAccountType] || parentAccountType})`;
          }

          const c: Contact = {
            id: `${accountType}_${userDocSnapshot.id}`,
            name: displayName,
            type: accountType as any,
            avatar: avatarUrl,
            isOnline: data.isOnline || false,
            organizationName,
            isDependent,
            parentAccountId,
            parentAccountType
          };
          console.log(`✅ تم إضافة: ${displayName} (${accountType})${isDependent ? ' - تابع' : ''}`);
          return c;
        };

        const tasks = usersSnapshot.docs.map((d) => processUser(d));
        const results = await Promise.allSettled(tasks);
        results.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            allContacts.push(res.value);
          }
        });
      } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        // إضافة جهات اتصال افتراضية في حالة الفشل
        allContacts.push({
          id: 'default_contact_error',
          name: 'مستخدم افتراضي (خطأ في الاتصال)',
          type: 'player' as any,
          avatar: null,
          isOnline: false,
          organizationName: null,
          isDependent: false,
          parentAccountId: null,
          parentAccountType: null
        });
      }

      // لا تضف جهات افتراضية؛ اتركها فارغة ليظهر Empty state

      console.log('✅ تم جلب جهات الاتصال:', allContacts.length);
      console.log('📋 تفاصيل جهات الاتصال:', allContacts.map(c => `${c.name} (${c.type})`));
      setContacts(allContacts);
      console.log('🔍 تم تحديث حالة جهات الاتصال');
    } catch (error) {
      console.error('❌ خطأ في جلب جهات الاتصال:', error);
      toast.error('حدث خطأ في جلب جهات الاتصال');
    } finally {
      setContactsLoading(false);
      isFetchingContactsRef.current = false;
    }
  };

  // دالة جلب الرسائل
  const fetchMessages = async (conversationId: string) => {
    if (!user) return;

    try {
      console.log('🔄 جلب الرسائل للمحادثة:', conversationId);

      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as Message[];

        setMessages(messagesData);
        console.log('✅ تم جلب الرسائل:', messagesData.length);

        // جلب صور المرسلين بشكل منفصل
        messagesData.forEach(async (message) => {
          if (!message.senderAvatar && message.senderId !== user?.uid) {
            try {
              const avatarUrl = await getUserAvatarFromSupabase(message.senderId, message.senderType);
              if (avatarUrl) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === message.id ? { ...msg, senderAvatar: avatarUrl } : msg
                  )
                );
              }
            } catch (error) {
              console.error(`❌ Error fetching avatar for message sender ${message.senderId}:`, error);
            }
          }
        });

        // التمرير إلى أسفل
        setTimeout(scrollToBottom, 100);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ خطأ في جلب الرسائل:', error);
    }
  };

  // دالة إرسال رسالة
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !userData || !selectedConversation) {
      return;
    }

    try {
      console.log('📤 إرسال رسالة جديدة:', newMessage);

      // Get proper sender name from userData
      const getSenderName = () => {
        if (userData.accountType === 'player') {
          return userData.full_name || userData.name || userData.displayName || user.displayName || 'أنا';
        } else if (userData.accountType === 'club') {
          return userData.name || userData.club_name || userData.displayName || user.displayName || 'نادي';
        } else if (userData.accountType === 'academy') {
          return userData.name || userData.academy_name || userData.displayName || user.displayName || 'أكاديمية';
        } else if (userData.accountType === 'agent') {
          return userData.name || userData.agent_name || userData.agency_name || userData.displayName || user.displayName || 'وكيل';
        } else if (userData.accountType === 'trainer') {
          return userData.name || userData.trainer_name || userData.displayName || user.displayName || 'مدرب';
        } else {
          return userData.displayName || userData.name || userData.full_name || user.displayName || 'أنا';
        }
      };

      const messageData = {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        receiverId: selectedConversation.participants.find(id => id !== user.uid) || '',
        senderName: getSenderName(),
        receiverName: selectedConversation.participantNames[selectedConversation.participants.find(id => id !== user.uid) || ''] || 'مستخدم',
        senderType: userData.accountType || 'player',
        receiverType: selectedConversation.participantTypes[selectedConversation.participants.find(id => id !== user.uid) || ''] || 'player',
        message: newMessage.trim(),
        timestamp: new Date(),
        isRead: false,
        messageType: 'text',
        senderAvatar: userData.avatar || null,
        deliveryStatus: 'sent'
      };

      await addDoc(collection(db, 'messages'), messageData);

      // تحديث المحادثة
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: newMessage.trim(),
        lastMessageTime: new Date(),
        updatedAt: new Date(),
        lastSenderId: user.uid
      });

      setNewMessage('');
      toast.success('تم إرسال الرسالة');

      // Track Clarity events
      trackEvent('message_sent');
      setTag('message_length', newMessage.length.toString());
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      toast.error('فشل في إرسال الرسالة');
    }
  };

  // دالة فتح المحادثة
  const openConversation = async (conversation: Conversation) => {
    try {
      console.log('🔄 فتح المحادثة:', conversation.id);

      setSelectedConversation(conversation);

      // جلب الرسائل
      await fetchMessages(conversation.id);

      // Track Clarity events
      trackEvent('conversation_opened');
      setTag('conversation_participant_type', conversation.participantTypes[conversation.participants.find(id => id !== user?.uid) || ''] || 'unknown');

      // تحديث حالة المحادثة
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id
            ? { ...conv, isActive: true }
            : { ...conv, isActive: false }
        )
      );

      // جلب صور المشاركين بشكل منفصل
      try {
        const updatedConversation = await fetchConversationAvatars(conversation);
        setSelectedConversation(updatedConversation);
      } catch (error) {
        console.error(`❌ Error fetching avatars for conversation ${conversation.id}:`, error);
      }
    } catch (error) {
      console.error('❌ خطأ في فتح المحادثة:', error);
    }
  };

  // دالة إغلاق المحادثة
  const closeConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
    setNewMessage('');
  };

  const fetchConversationAvatars = async (conversation: Conversation) => {
    if (!conversation.participantAvatars) {
      conversation.participantAvatars = {};
    }

    for (const participantId of conversation.participants) {
      if (participantId !== user?.uid && !conversation.participantAvatars[participantId]) {
        try {
          const participantType = conversation.participantTypes[participantId];
          const avatarUrl = await getUserAvatarFromSupabase(participantId, participantType);
          if (avatarUrl) {
            conversation.participantAvatars[participantId] = avatarUrl;
          }
        } catch (error) {
          console.error(`❌ Error fetching avatar for participant ${participantId}:`, error);
        }
      }
    }

    return conversation;
  };

  const fetchMessageAvatars = async (messages: Message[]) => {
    const updatedMessages = [...messages];

    for (let i = 0; i < updatedMessages.length; i++) {
      const message = updatedMessages[i];
      if (!message.senderAvatar && message.senderId !== user?.uid) {
        try {
          const avatarUrl = await getUserAvatarFromSupabase(message.senderId, message.senderType);
          if (avatarUrl) {
            updatedMessages[i] = { ...message, senderAvatar: avatarUrl };
          }
        } catch (error) {
          console.error(`❌ Error fetching avatar for message sender ${message.senderId}:`, error);
        }
      }
    }

    return updatedMessages;
  };

  // إذا لم يكن في المتصفح، اعرض حالة تحميل
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل مركز الرسائل...</p>
        </div>
      </div>
    );
  }

  // لا تعرض مؤشر تحميل جهات الاتصال كحالة إرجاع مبكر؛ تابع عرض الواجهة مع قائمة فارغة مؤقتًا

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل مركز الرسائل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <CardContent>
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold mb-2">خطأ في التحميل</h3>
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user || !userData) {
    return (
      <Card className="p-6">
        <CardContent>
          <div className="text-center text-gray-600">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">غير مسجل الدخول</h3>
            <p>يرجى تسجيل الدخول للوصول إلى مركز الرسائل</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // إذا لم توجد جهات اتصال، اعرض رسالة
  if (contacts.length === 0 && !contactsLoading) {
    return (
      <Card className="p-6">
        <CardContent>
          <div className="text-center text-gray-600">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">{contactsLoading ? 'جاري تحميل جهات الاتصال...' : 'لا توجد جهات اتصال'}</h3>
            {!contactsLoading && (
              <>
                <p>لم يتم العثور على جهات اتصال في النظام</p>
                <Button
                  onClick={() => {
                    fetchContacts();
                  }}
                  className="mt-4"
                >
                  إعادة المحاولة
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredConversations = conversations.filter(conversation => {
    if (!searchTerm) return true;

    const participantNames = Object.values(conversation.participantNames || {});
    const subject = conversation.subject || '';
    const lastMessage = conversation.lastMessage || '';

    const searchLower = searchTerm.toLowerCase();
    return participantNames.some(name => name.toLowerCase().includes(searchLower)) ||
      subject.toLowerCase().includes(searchLower) ||
      lastMessage.toLowerCase().includes(searchLower);
  });

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] min-h-[600px] bg-gray-50">
      {selectedConversation && (
        <div className="lg:hidden w-full bg-white border-b px-4 py-3 flex justify-between items-center gap-3">
          <div className="text-sm font-medium text-gray-700">
            {selectedConversation.participantNames[selectedConversation.participants.find(id => id !== user?.uid) || ''] || 'مستخدم'}
          </div>
          <Button
            onClick={closeConversation}
            className="inline-flex items-center gap-2 text-sm"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة للرسائل
          </Button>
        </div>
      )}
      {/* عمود المحادثات */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-1/3 bg-white shadow-lg lg:rounded-l-lg overflow-hidden border-r-0 lg:border-r border-gray-200`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">الرسائل</h2>
                <p className="text-sm text-blue-100 mt-1">
                  {conversations.length} محادثة • {contacts.length} جهة اتصال
                </p>
              </div>
            </div>
            <Button
              className="text-white hover:bg-white/20 bg-transparent border-none p-3 rounded-full"
              onClick={() => {
                console.log('🔄 تم النقر على زر محادثة جديدة');
                setNewChatModalOpen(true);
              }}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="relative">
            <Input
              type="text"
              placeholder="البحث في المحادثات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-12 pl-4 h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl text-base"
            />
            <Search className="h-5 w-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* قائمة المحادثات */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => {
                const otherParticipantId = conversation.participants.find(id => id !== user.uid);
                const otherParticipantName = conversation.participantNames[otherParticipantId || ''] || 'مستخدم';
                const otherParticipantType = conversation.participantTypes[otherParticipantId || ''] || 'player';
                const unreadCount = conversation.unreadCount[user.uid] || 0;
                const UserIcon = USER_TYPES[otherParticipantType as keyof typeof USER_TYPES]?.icon || Users;

                return (
                  <div
                    key={conversation.id}
                    className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-blue-200 active:scale-98"
                    onClick={() => openConversation(conversation)}
                  >
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-2 ring-white shadow-sm">
                        <AvatarImage
                          src={conversation.participantAvatars?.[conversation.participants.find(id => id !== user?.uid) || ''] || ''}
                          alt={conversation.participantNames[conversation.participants.find(id => id !== user?.uid) || ''] || 'مستخدم'}
                          className="transition-transform duration-200 hover:scale-105"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                          {(() => {
                            const participantId = conversation.participants.find(id => id !== user?.uid);
                            const participantType = conversation.participantTypes[participantId || ''];
                            const UserIcon = USER_TYPES[participantType as keyof typeof USER_TYPES]?.icon || Users;
                            return <UserIcon className="h-7 w-7" />;
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.isActive && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-base text-gray-900 truncate">
                          {conversation.participantNames[conversation.participants.find(id => id !== user?.uid) || ''] || 'مستخدم'}
                        </h4>
                        <div className="flex items-center gap-2">
                          {conversation.lastMessageTime && (
                            <span className="text-xs text-gray-500 font-medium">
                              {(() => {
                                const now = new Date();
                                const messageTime = conversation.lastMessageTime.toDate ? conversation.lastMessageTime.toDate() : new Date(conversation.lastMessageTime);
                                const diffInHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);

                                if (diffInHours < 1) {
                                  return messageTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                                } else if (diffInHours < 24) {
                                  return messageTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                                } else if (diffInHours < 48) {
                                  return 'أمس';
                                } else {
                                  return messageTime.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
                                }
                              })()}
                            </span>
                          )}
                          {conversation.unreadCount[user?.uid || ''] > 0 && (
                            <div className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                              {conversation.unreadCount[user?.uid || ''] > 9 ? '9+' : conversation.unreadCount[user?.uid || '']}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border-0">
                          {(() => {
                            const participantId = conversation.participants.find(id => id !== user?.uid);
                            const participantType = conversation.participantTypes[participantId || ''];
                            return USER_TYPES[participantType as keyof typeof USER_TYPES]?.name || 'مستخدم';
                          })()}
                        </Badge>
                      </div>

                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastSenderId === user?.uid && (
                            <span className="text-blue-600 font-medium ml-1">أنت:</span>
                          )}
                          {conversation.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 p-8">
              <div>
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'لا توجد نتائج' : 'لا توجد محادثات'}
                </h3>
                <p className="text-sm mb-4">
                  {searchTerm
                    ? 'جرب البحث بكلمات مختلفة'
                    : 'ابدأ محادثة جديدة مع جهات الاتصال'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl"
                    onClick={() => setNewChatModalOpen(true)}
                  >
                    <Plus className="h-5 w-5 ml-2" />
                    محادثة جديدة
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* عمود الرسائل */}
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-col w-full lg:flex-1 bg-white shadow-lg lg:rounded-r-lg overflow-hidden`}>
        {selectedConversation ? (
          <div className="flex flex-col h-full">
            {/* رأس المحادثة */}
            <div className="p-4 lg:p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={closeConversation}
                    className="lg:hidden text-white hover:bg-white/20 bg-transparent border-none p-2 rounded-full"
                    title="العودة إلى الرسائل"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>

                  <div className="relative">
                    <Avatar className="h-12 w-12 lg:h-14 lg:w-14 ring-2 ring-white shadow-sm">
                      <AvatarImage
                        src={selectedConversation.participantAvatars?.[selectedConversation.participants.find(id => id !== user?.uid) || ''] || ''}
                        alt={selectedConversation.participantNames[selectedConversation.participants.find(id => id !== user?.uid) || ''] || 'مستخدم'}
                        className="transition-transform duration-200 hover:scale-105"
                      />
                      <AvatarFallback className="bg-white/20 text-white">
                        <Users className="h-6 w-6 lg:h-7 lg:w-7" />
                      </AvatarFallback>
                    </Avatar>
                    {selectedConversation.isActive && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-lg lg:text-xl">
                      {selectedConversation.participantNames[selectedConversation.participants.find(id => id !== user?.uid) || ''] || 'مستخدم'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs px-2 py-1 rounded-full bg-white/20 text-white border-0">
                        {USER_TYPES[selectedConversation.participantTypes[selectedConversation.participants.find(id => id !== user?.uid) || ''] as keyof typeof USER_TYPES]?.name || 'مستخدم'}
                      </Badge>
                      <span className="text-xs text-blue-100">متصل الآن</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={closeConversation}
                  className="hidden lg:inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  العودة إلى الرسائل
                </Button>
              </div>
            </div>

            {/* منطقة الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-6">
                {messages.map((message, index) => {
                  const isCurrentUser = message.senderId === user?.uid;
                  const UserIcon = USER_TYPES[message.senderType as keyof typeof USER_TYPES]?.icon || Users;

                  return (
                    <div
                      key={`${message.id}-${index}`}
                      className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                        }`}
                    >
                      <div className="flex-shrink-0">
                        <Avatar className="w-10 h-10 lg:w-12 lg:h-12 shadow-sm ring-2 ring-white">
                          <AvatarImage
                            src={message.senderAvatar}
                            className="transition-transform duration-200 hover:scale-105"
                          />
                          <AvatarFallback className={`${isCurrentUser ? 'bg-blue-500' : 'bg-gray-400'} text-white`}>
                            <UserIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div
                        className={`flex flex-col max-w-[75%] lg:max-w-[65%] ${isCurrentUser ? 'items-end' : 'items-start'
                          }`}
                      >
                        <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-sm font-semibold text-gray-800">
                            {isCurrentUser ? 'أنت' : (message.senderName || 'مستخدم')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {message.deliveryStatus === 'sent' && isCurrentUser && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm ${isCurrentUser
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                            } max-w-full`}
                        >
                          <p className="whitespace-pre-wrap break-words text-base lg:text-lg leading-relaxed">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* منطقة إدخال الرسالة */}
            <div className="p-4 lg:p-6 border-t bg-white relative">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="اكتب رسالتك هنا..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="pr-12 pl-4 h-12 lg:h-14 bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-2xl text-base lg:text-lg"
                  />
                  <Button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-200 ${showEmojiPicker
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      } bg-transparent border-none`}
                    title="إضافة إيموجي"
                  >
                    <Smile className="h-5 w-5 lg:h-6 lg:w-6" />
                  </Button>
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 p-3 lg:p-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5 lg:h-6 lg:w-6" />
                </Button>
              </div>

              {/* منتقي الإيموجي */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 z-50 w-80 lg:w-96"
                >
                  <div className="bg-white border rounded-2xl shadow-2xl p-4">
                    {/* عنوان منتقي الإيموجي */}
                    <div className="text-center mb-4 pb-3 border-b">
                      <h4 className="text-base font-bold text-gray-800">اختر الإيموجي</h4>
                    </div>

                    <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                      {[
                        '😊', '😂', '❤️', '👍', '👎', '🎉', '🔥', '💯',
                        '😍', '🤔', '😭', '😡', '😱', '😴', '🤗', '😎',
                        '🥰', '😘', '😋', '🤩', '😇', '🤠', '👻', '🤖',
                        '🐱', '🐶', '🦁', '🐼', '🦊', '🐸', '🐵', '🐷',
                        '🌹', '🌸', '🌺', '🌻', '🌷', '🌼', '🌿', '🍀',
                        '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'
                      ].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                          }}
                          className="p-3 hover:bg-blue-50 hover:scale-110 rounded-xl text-xl lg:text-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* أزرار التحكم */}
                    <div className="mt-4 pt-3 border-t flex gap-3">
                      <Button
                        onClick={() => setShowEmojiPicker(false)}
                        className="flex-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2"
                      >
                        إغلاق
                      </Button>
                      <Button
                        onClick={() => setNewMessage('')}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-4 rounded-xl py-2"
                      >
                        مسح الكل
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-gray-500 max-w-md">
              <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-12 w-12 lg:h-16 lg:w-16 text-blue-500" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold mb-3 text-gray-800">مرحباً بك في مركز الرسائل</h3>
              <p className="text-base lg:text-lg text-gray-600 mb-6">اختر محادثة من القائمة أو ابدأ محادثة جديدة مع جهات الاتصال</p>

              <div className="flex flex-col lg:flex-row items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>جاهز للتواصل</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>
                    {contactsLoading
                      ? 'جاري تحميل جهات الاتصال...'
                      : `${contacts.length} جهة اتصال متاحة`}
                  </span>
                </div>
              </div>

              <Button
                className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-2xl lg:hidden"
                onClick={() => setNewChatModalOpen(true)}
              >
                <Plus className="h-5 w-5 ml-2" />
                بدء محادثة جديدة
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* نافذة إنشاء محادثة جديدة */}
      {false && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md lg:max-w-lg max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Plus className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold">محادثة جديدة</h3>
                </div>
                <Button
                  className="text-white hover:bg-white/20 bg-transparent border-none p-2 rounded-full"
                  onClick={closeNewChat}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* شريط البحث */}
            <div className="p-6 pb-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="ابحث بالاسم أو اسم المنظمة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-12 pl-4 h-12 bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl text-base"
                />
                <Search className="h-5 w-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* أدوات التصفية */}
            <div className="px-6 pb-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'player', label: 'لاعب' },
                  { key: 'club', label: 'نادي' },
                  { key: 'academy', label: 'أكاديمية' },
                  { key: 'agent', label: 'وكيل' },
                  { key: 'trainer', label: 'مدرب' },
                ].map((opt: any) => (
                  <button
                    key={opt.key}
                    onClick={() => setFilterType(opt.key)}
                    className={`text-sm px-4 py-2 rounded-xl border-2 transition-all duration-200 ${filterType === opt.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* قائمة جهات الاتصال */}
            <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
              {contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts
                    .filter((c) => filterType === 'all' ? true : c.type === filterType)
                    .filter((c) => {
                      const term = searchTerm.trim().toLowerCase();
                      if (!term) return true;
                      const name = (c.name || '').toLowerCase();
                      const org = (c.organizationName ? String(c.organizationName) : '').toLowerCase();
                      return name.includes(term) || org.includes(term);
                    })
                    .map((contact) => {
                      const UserIcon = USER_TYPES[contact.type as keyof typeof USER_TYPES]?.icon || Users;

                      return (
                        <div
                          key={contact.id}
                          className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-blue-200 active:scale-98"
                          onClick={() => createNewConversation(contact)}
                        >
                          <div className="relative">
                            <Avatar className="h-14 w-14 ring-2 ring-white shadow-sm">
                              <AvatarImage
                                src={contact.avatar}
                                alt={contact.name}
                                className="transition-transform duration-200 hover:scale-105"
                              />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                                <UserIcon className="h-7 w-7" />
                              </AvatarFallback>
                            </Avatar>
                            {contact.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-base text-gray-900 truncate">
                                {contact.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border-0">
                                  {USER_TYPES[contact.type as keyof typeof USER_TYPES]?.name}
                                </Badge>
                                {contact.type === 'player' && contact.isDependent && (
                                  <Badge className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border-0">
                                    تابع
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {contact.organizationName && (
                              <p className="text-sm text-gray-500 truncate">
                                {contact.organizationName}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">
                    {contactsLoading ? 'جاري تحميل جهات الاتصال...' : 'لا توجد جهات اتصال'}
                  </h3>
                  {!contactsLoading && (
                    <p className="text-sm text-gray-600">لا يمكن إنشاء محادثة جديدة في الوقت الحالي</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={newChatModalOpen}
        onOpenChange={setNewChatModalOpen}
        onStartChat={(selectedUser) => {
          console.log('بدء محادثة جديدة مع:', selectedUser);
          toast.success(`جاري بدء محادثة مع ${selectedUser.name}`);
          // TODO: Implement conversation creation logic
          setNewChatModalOpen(false);
        }}
      />
    </div>
  );
};

export default WorkingMessageCenter; 
