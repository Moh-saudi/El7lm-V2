'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Checkbox
} from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { detectCountryFromPhone } from '@/lib/constants/countries';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import {
    addDoc,
    collection,
    collectionGroup,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import {
    AlertCircle,
    Bell,
    Briefcase,
    Building,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Crown,
    Eye,
    GraduationCap,
    Info,
    MessageSquare,
    Phone,
    Search,
    Send,
    Settings,
    Smartphone,
    Target,
    TrendingUp,
    User,
    Users,
    X,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  accountType: string;
  isActive: boolean;
  avatar?: string;
  createdAt?: Date | null;
}

interface NotificationForm {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetType: 'all' | 'specific' | 'account_type' | 'custom_numbers';
  accountTypes: string[];
  customNumbers: string;
  selectedUsers: string[];
  sendMethods: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  scheduleType: 'immediate' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
}

interface MessageTemplate {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
}

export default function SendNotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('all');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isTargetListExpanded, setIsTargetListExpanded] = useState(false);

  // WhatsApp direct message states
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState({ title: '', body: '' });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [instanceId, setInstanceId] = useState('68F243B3A8D8D');
  // Date filter state
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'this_month' | 'range'>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [form, setForm] = useState<NotificationForm>({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    targetType: 'all',
    accountTypes: [],
    customNumbers: '',
    selectedUsers: [],
    sendMethods: {
      inApp: true,
      sms: false,
      whatsapp: false
    },
    scheduleType: 'immediate'
  });

  // Helpers
  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value?.toDate && typeof value.toDate === 'function') {
      try { return value.toDate(); } catch { /* ignore */ }
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const resolveCreatedAt = (data: any): Date | null => {
    const candidates = [
      data?.createdAt,
      data?.created_at,
      data?.metadata?.createdAt,
      data?.metadata?.created_at,
      data?.registeredAt,
      data?.registrationDate,
      data?.createdOn,
      data?.createdon,
      data?.created,
    ];
    for (const v of candidates) {
      const dt = toDate(v);
      if (dt) return dt;
    }
    return null;
  };

  const isInDateFilter = (user: User): boolean => {
    if (dateFilterType === 'all') return true;
    const createdAt = user.createdAt ? new Date(user.createdAt) : null;
    if (!createdAt) return false;

    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    if (dateFilterType === 'today') {
      const now = new Date();
      const s = startOf(now);
      const e = endOf(now);
      return createdAt >= s && createdAt <= e;
    }
    if (dateFilterType === 'this_month') {
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return createdAt >= s && createdAt <= e;
    }
    // range
    const s = dateStart ? new Date(dateStart) : null;
    const e = dateEnd ? new Date(dateEnd) : null;
    if (s) s.setHours(0, 0, 0, 0);
    if (e) e.setHours(23, 59, 59, 999);
    if (s && e) return createdAt >= s && createdAt <= e;
    if (s) return createdAt >= s;
    if (e) return createdAt <= e;
    return true;
  };

  // جلب المستخدمين (Realtime) من جميع المجموعات ذات الصلة + players collectionGroup
  useEffect(() => {
    const collections = [
      'users',
      'players',
      'academies', 'academy',
      'clubs', 'club',
      'trainers', 'trainer',
      'agents', 'agent',
      'marketers', 'marketer',
      'parents', 'parent',
    ];

    const collectionToType: Record<string, string> = {
      users: '',
      players: 'player',
      academies: 'academy', academy: 'academy',
      clubs: 'club', club: 'club',
      trainers: 'trainer', trainer: 'trainer',
      agents: 'agent', agent: 'agent',
      marketers: 'marketer', marketer: 'marketer',
      parents: 'parent', parent: 'parent',
    };

    const combinedMap = new Map<string, User>();
    let isInitial = true;

    const upsertDocs = (docs: any[], collectionName: string) => {
      for (const d of docs) {
      const data: any = d.data();
      const id = d.id;
      const accountType = (collectionToType[collectionName] || data.accountType || '').trim();
      const displayName = data.displayName || data.full_name || data.name || '';
      const email = data.email || data.official_contact?.email || '';
      const phone = data.phone || data.phoneNumber || data.whatsapp || data.official_contact?.phone || '';
      const isActive = data.isActive !== false;
      const createdAt: Date | null = resolveCreatedAt(data);

      const userEntry: User = {
        id,
        displayName,
        email,
        phone,
        accountType: (accountType || collectionName) as string,
        isActive,
        avatar: data.avatar || data.photoURL || '',
        createdAt,
      };

      // users collection يأخذ أولوية الدمج
      if (!combinedMap.has(id) || collectionName === 'users') {
        combinedMap.set(id, userEntry);
      }
      }
      const arr = Array.from(combinedMap.values()).filter(u => u.isActive);
      setUsers(arr);
      if (isInitial) setFilteredUsers(arr);
    };

    const unsubs: Array<() => void> = [];
    try {
      for (const col of collections) {
      const q = query(collection(db, col));
      const unsub = onSnapshot(q, (snapshot) => upsertDocs(snapshot.docs, col));
      unsubs.push(unsub);
      }
      // players collectionGroup (لاعبون تابعون لجهات)
      try {
      const cg = collectionGroup(db, 'players');
      const unsubCg = onSnapshot(cg, (snapshot) => upsertDocs(snapshot.docs, 'players'));
      unsubs.push(unsubCg);
      } catch (e) {
      console.warn('collectionGroup(players) snapshot not available:', e);
      }
    } catch (e) {
      console.error('Realtime listeners error:', e);
      toast.error('فشل في الاستماع للبيانات بشكل لحظي');
    }

    isInitial = false;
    return () => {
      for (const u of unsubs) {
      try { u(); } catch {}
      }
    };
  }, []);

  // فلترة المستخدمين حسب البحث ونوع الحساب والتاريخ
  useEffect(() => {
    let filtered = users;

    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(user =>
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)
      );
    }

    // فلترة حسب نوع الحساب
    if (selectedAccountType !== 'all') {
      filtered = filtered.filter(user => user.accountType === selectedAccountType);
    }

    // فلترة حسب التاريخ
    if (dateFilterType !== 'all') {
      filtered = filtered.filter(isInDateFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedAccountType, dateFilterType, dateStart, dateEnd]);

  // الإبقاء على الدالة القديمة إن لزم استدعاء يدوي مستقبلاً (غير مستخدمة حالياً)
  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), where('isActive', '==', true));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as User[];
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('خطأ في جلب المستخدمين:', error);
      toast.error('فشل في جلب المستخدمين');
    }
  };

  const handleFormChange = (field: keyof NotificationForm, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendMethodChange = (method: keyof NotificationForm['sendMethods'], value: boolean) => {
    setForm(prev => ({
      ...prev,
      sendMethods: {
      ...prev.sendMethods,
      [method]: value
      }
    }));
  };

  const handleAccountTypeChange = (accountType: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      accountTypes: checked
      ? [...prev.accountTypes, accountType]
      : prev.accountTypes.filter(type => type !== accountType)
    }));
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      selectedUsers: checked
      ? [...prev.selectedUsers, userId]
      : prev.selectedUsers.filter(id => id !== userId)
    }));
  };

  const selectAllUsers = () => {
    setForm(prev => ({
      ...prev,
      selectedUsers: filteredUsers.map(user => user.id)
    }));
  };

  const deselectAllUsers = () => {
    setForm(prev => ({
      ...prev,
      selectedUsers: []
    }));
  };

  const getTargetUsers = () => {
    const applyDate = (arr: User[]) => dateFilterType === 'all' ? arr : arr.filter(isInDateFilter);
    switch (form.targetType) {
      case 'all':
      return applyDate(users);
      case 'account_type':
      return applyDate(users.filter(user => form.accountTypes.includes(user.accountType)));
      case 'specific':
      return applyDate(users.filter(user => form.selectedUsers.includes(user.id)));
      case 'custom_numbers':
      const numbers = form.customNumbers.split('\n').map(n => n.trim()).filter(n => n);
      return applyDate(users.filter(user => user.phone && numbers.includes(user.phone)));
      default:
      return [];
    }
  };

  // دالة لحساب الترتيب لكل مستخدم بناءً على نوع الحساب
  const calculateUserRanking = (targetUser: User, allUsersOfSameType: User[]): { ranking: number; total: number } => {
    // ترتيب المستخدمين حسب معايير متعددة
    const sortedUsers = [...allUsersOfSameType].sort((a, b) => {
      // معيار 1: تاريخ الإنشاء (الأقدم أولاً)
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      
      // معيار 2: اكتمال الملف الشخصي (يمكن إضافة حساب أكثر دقة)
      const aComplete = a.displayName && a.email && a.phone ? 1 : 0;
      const bComplete = b.displayName && b.email && b.phone ? 1 : 0;
      
      // ترتيب حسب: اكتمال الملف أولاً، ثم التاريخ
      if (aComplete !== bComplete) {
        return bComplete - aComplete; // الأكمل أولاً
      }
      return aDate - bDate; // الأقدم أولاً
    });

    // إيجاد ترتيب المستخدم الحالي
    const userIndex = sortedUsers.findIndex(u => u.id === targetUser.id);
    const ranking = userIndex >= 0 ? userIndex + 1 : allUsersOfSameType.length;
    const total = allUsersOfSameType.length;

    return { ranking, total };
  };

  // دالة لاستبدال المتغيرات في الرسالة بالقيم الفعلية
  const replaceMessageVariables = (message: string, targetUser: User): string => {
    let finalMessage = message;
    
    // حساب الترتيب والإجمالي
    const usersOfSameType = users.filter(u => u.accountType === targetUser.accountType && u.isActive);
    const { ranking, total } = calculateUserRanking(targetUser, usersOfSameType);
    
    // استبدال المتغيرات
    finalMessage = finalMessage.replace(/{ranking}/g, ranking.toString());
    finalMessage = finalMessage.replace(/{total}/g, total.toString());
    finalMessage = finalMessage.replace(/{user_name}/g, targetUser.displayName || 'المستخدم');
    finalMessage = finalMessage.replace(/{account_type}/g, getAccountTypeLabel(targetUser.accountType));
    
    return finalMessage;
  };

  const sendNotification = async () => {
    console.log('🚀 بدء إرسال الإشعار...', {
      title: form.title,
      messageLength: form.message.length,
      targetType: form.targetType,
      sendMethods: form.sendMethods
    });

    if (!form.title || !form.message) {
      toast.error('يرجى ملء العنوان والرسالة');
      console.error('❌ العنوان أو الرسالة فارغة');
      return;
    }

    if (form.message.length > 1000) {
      toast.error('الرسالة تتجاوز الحد الأقصى للحروف (1000 حرف)');
      console.error('❌ الرسالة طويلة جداً:', form.message.length);
      return;
    }

    const targetUsers = getTargetUsers();
    console.log('👥 المستخدمين المستهدفين:', targetUsers.length);
    
    if (targetUsers.length === 0) {
      toast.error('لا يوجد مستخدمين مستهدفين');
      console.error('❌ لا يوجد مستخدمين مستهدفين');
      return;
    }

    // التحقق من أن هناك طريقة إرسال واحدة على الأقل
    if (!form.sendMethods.inApp && !form.sendMethods.sms && !form.sendMethods.whatsapp) {
      toast.error('يرجى اختيار طريقة إرسال واحدة على الأقل');
      console.error('❌ لم يتم اختيار طريقة إرسال');
      return;
    }

    setLoading(true);
    try {
      console.log('✅ بدء عملية الإرسال...');
      const notificationData = {
      title: form.title,
      message: form.message,
      type: form.type,
      priority: form.priority,
      isRead: false,
      scope: 'system',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        senderId: user?.uid,
        senderName: 'الإدارة',
        targetType: form.targetType,
        accountTypes: form.accountTypes,
        sendMethods: form.sendMethods,
        scheduledFor: form.scheduleType === 'scheduled'
          ? new Date(`${form.scheduledDate}T${form.scheduledTime}`)
          : null
      }
      };

      // حفظ الإشعارات في Firebase مع استبدال المتغيرات لكل مستخدم
      const notificationPromises = targetUsers.map(async (targetUser) => {
        // استبدال المتغيرات في الرسالة (ranking, total, etc.)
        const personalizedMessage = replaceMessageVariables(form.message, targetUser);
        const personalizedTitle = replaceMessageVariables(form.title, targetUser);
        
        const notification = {
          ...notificationData,
          title: personalizedTitle,
          message: personalizedMessage,
          userId: targetUser.id,
          userEmail: targetUser.email,
          userPhone: targetUser.phone
        };
        return addDoc(collection(db, 'notifications'), notification);
      });

      await Promise.all(notificationPromises);
      console.log(`✅ تم حفظ ${notificationPromises.length} إشعار في Firebase`);

      // إرسال SMS لجميع المستخدمين (رسالة مخصصة لكل مستخدم)
      if (form.sendMethods.sms) {
        const smsPromises = targetUsers
          .filter(user => user.phone)
          .map(async (targetUser) => {
            try {
              // استبدال المتغيرات في الرسالة
              const personalizedMessage = replaceMessageVariables(form.message, targetUser);
              const personalizedTitle = replaceMessageVariables(form.title, targetUser);
              
              const smsRes = await fetch('/api/whatsapp/babaservice/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({
                  phoneNumbers: [targetUser.phone],
                  message: `${personalizedTitle}\n\n${personalizedMessage}`,
                  type: 'sms'
                })
              });
              
              if (smsRes.ok) {
                const result = await smsRes.json();
                if (result.success) {
                  console.log(`📱 تم إرسال SMS إلى ${targetUser.displayName || targetUser.phone}`);
                  return true;
                }
              }
              return false;
            } catch (error) {
              console.error(`❌ فشل إرسال SMS إلى ${targetUser.phone}:`, error);
              return false;
            }
          });
          
        try {
          await Promise.all(smsPromises);
          console.log('📱 تم إرسال جميع رسائل SMS');
        } catch (error) {
          console.error('❌ فشل إرسال بعض رسائل SMS:', error);
          toast.error('فشل في إرسال بعض الرسائل النصية');
        }
      }

      // الكود القديم للإرسال الجماعي (محذوف - تم استبداله بالكود أعلاه)
      if (false && form.sendMethods.sms) {
        const smsPhones = targetUsers.filter(user => user.phone).map(user => user.phone);
        if (smsPhones.length > 0) {
          try {
            // محاولة إرسال عبر baba service أولاً
            const smsRes = await fetch('/api/whatsapp/babaservice/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: JSON.stringify({
                phoneNumbers: smsPhones,
                message: `${form.title}\n\n${form.message}`,
                type: 'sms'
              })
            });

            if (smsRes.ok) {
              const result = await smsRes.json();
              if (result.success) {
                console.log('📱 تم إرسال SMS عبر baba service');
              } else {
                throw new Error('baba service فشل');
              }
            } else {
              throw new Error('baba service غير متاح');
            }
          } catch (error) {
            console.error('❌ فشل إرسال SMS عبر baba service:', error);
            toast.error('فشل في إرسال الرسائل النصية');
          }
        }
      }

      // إرسال WhatsApp لجميع المستخدمين (رسالة مخصصة لكل مستخدم)
      if (form.sendMethods.whatsapp) {
        const whatsappPromises = targetUsers
          .filter(user => user.phone)
          .map(async (targetUser) => {
            try {
              // استبدال المتغيرات في الرسالة
              const personalizedMessage = replaceMessageVariables(form.message, targetUser);
              const personalizedTitle = replaceMessageVariables(form.title, targetUser);
              
              const whatsappRes = await fetch('/api/whatsapp/babaservice/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({
                  phoneNumbers: [targetUser.phone],
                  message: `${personalizedTitle}\n\n${personalizedMessage}`,
                  type: 'whatsapp'
                })
              });
              
              if (whatsappRes.ok) {
                const result = await whatsappRes.json();
                if (result.success) {
                  console.log(`📱 تم إرسال WhatsApp إلى ${targetUser.displayName || targetUser.phone}`);
                  return true;
                }
              }
              return false;
            } catch (error) {
              console.error(`❌ فشل إرسال WhatsApp إلى ${targetUser.phone}:`, error);
              return false;
            }
          });
          
        try {
          await Promise.all(whatsappPromises);
          console.log('📱 تم إرسال جميع رسائل WhatsApp');
        } catch (error) {
          console.error('❌ فشل إرسال بعض رسائل WhatsApp:', error);
          toast.error('فشل في إرسال بعض رسائل WhatsApp');
        }
      }

      // الكود القديم للإرسال الجماعي (محذوف - تم استبداله بالكود أعلاه)
      if (false && form.sendMethods.whatsapp) {
        const whatsappPhones = targetUsers.filter(user => user.phone).map(user => user.phone);
        if (whatsappPhones.length > 0) {
          try {
            // محاولة إرسال عبر baba service أولاً
            const whatsappRes = await fetch('/api/whatsapp/babaservice/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: JSON.stringify({
                phoneNumbers: whatsappPhones,
                message: `${form.title}\n\n${form.message}`,
                type: 'whatsapp'
              })
            });

            if (whatsappRes.ok) {
              const result = await whatsappRes.json();
              if (result.success) {
                console.log('📱 تم إرسال WhatsApp عبر baba service');
              } else {
                throw new Error('baba service فشل');
              }
            } else {
              throw new Error('baba service غير متاح');
            }
          } catch (error) {
            console.error('❌ فشل إرسال WhatsApp عبر baba service:', error);
            toast.error('فشل في إرسال رسائل WhatsApp');
          }
        }
      }

      // عرض رسالة النجاح
      const successMessage = `✅ تم إرسال الإشعار بنجاح إلى ${targetUsers.length} مستخدم`;
      console.log(successMessage);
      toast.success(successMessage);

      // إعادة تعيين النموذج
      setForm({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
      targetType: 'all',
      accountTypes: [],
      customNumbers: '',
      selectedUsers: [],
      sendMethods: {
        inApp: true,
        sms: false,
        whatsapp: false
      },
      scheduleType: 'immediate'
      });

    } catch (error: any) {
      console.error('❌ خطأ في إرسال الإشعارات:', error);
      toast.error(`فشل في إرسال الإشعارات: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
      console.log('🏁 انتهت عملية الإرسال');
    }
  };

  // دالة إرسال رسالة WhatsApp مباشرة
  const sendWhatsAppMessage = async () => {
    if (!phoneNumber || !whatsappMessage.title || !whatsappMessage.body) {
      toast.error('يرجى إدخال رقم الهاتف والعنوان والرسالة');
      return;
    }

    setSendingWhatsApp(true);
    try {
      // تنسيق رقم الهاتف
      let formattedPhone = phoneNumber.replace(/\D/g, '');

      // محاولة اكتشاف البلد من الرقم
      const detectedCountry = detectCountryFromPhone(phoneNumber);

      if (detectedCountry) {
      const countryCode = detectedCountry.code.replace(/\D/g, '');
      const localNumber = formattedPhone.replace(/^0+/, '');
      formattedPhone = countryCode + localNumber;

      console.log('🔍 تم اكتشاف البلد من الرقم:', {
        detectedCountry: detectedCountry.name,
        countryCode: detectedCountry.code,
        originalPhone: phoneNumber,
        formattedPhone: formattedPhone
      });
      } else {
      // افتراضي: مصر
      const localNumber = formattedPhone.replace(/^0+/, '');
      formattedPhone = '20' + localNumber;

      console.log('⚠️ استخدام البلد الافتراضي (مصر):', {
        originalPhone: phoneNumber,
        formattedPhone: formattedPhone
      });
      }

      const whatsappPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
      const whatsappMessageText = `*${whatsappMessage.title}*\n\n${whatsappMessage.body}\n\n---\nمنصة الحلم`;

      console.log('📧 إرسال رسالة WhatsApp:', {
      originalPhone: phoneNumber,
      formattedPhone: formattedPhone,
      whatsappPhone: whatsappPhone,
      messageLength: whatsappMessageText.length,
      instanceId: instanceId
      });

      // فحص حالة Instance ID أولاً
      console.log('🔍 فحص حالة Instance ID...');
      try {
      const statusResponse = await fetch('/api/whatsapp/babaservice?action=status');
      const statusResult = await statusResponse.json();
      console.log('📊 حالة API:', statusResult);

      const configResponse = await fetch('/api/whatsapp/babaservice?action=config');
      const configResult = await configResponse.json();
      console.log('⚙️ تكوين API:', configResult);
      } catch (error) {
      console.error('❌ خطأ في فحص حالة API:', error);
      }

      const whatsappResponse = await fetch('/api/whatsapp/babaservice/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumbers: [whatsappPhone],
        message: whatsappMessageText,
        type: 'admin_notification',
        instance_id: instanceId !== 'موجود' ? instanceId : undefined
      })
      });

      const whatsappResult = await whatsappResponse.json();
      console.log('📧 نتيجة إرسال WhatsApp:', whatsappResult);

      if (whatsappResult.success) {
      toast.success(`✅ تم إرسال الرسالة عبر WhatsApp بنجاح`);
      toast.info('💡 ملاحظة: قد تستغرق الرسالة بضع دقائق للوصول. تأكد من أن رقم الهاتف صحيح ومتصل بالإنترنت.');

      if (whatsappResult.data?.results?.[0]?.data) {
        console.log('📱 تفاصيل الرسالة المرسلة:', whatsappResult.data.results[0].data);
      }

      setShowWhatsAppDialog(false);
      setWhatsappMessage({ title: '', body: '' });
      setPhoneNumber('');
      } else {
      toast.error(`فشل إرسال الرسالة: ${whatsappResult.error || 'خطأ غير معروف'}`);

      if (whatsappResult.data?.errors?.[0]?.error) {
        console.error('❌ تفاصيل الخطأ:', whatsappResult.data.errors[0].error);
        toast.error(`تفاصيل الخطأ: ${whatsappResult.data.errors[0].error}`);

        if (whatsappResult.data.errors[0].error.includes('instance') ||
            whatsappResult.data.errors[0].error.includes('Instance') ||
            whatsappResult.data.errors[0].error.includes('connection')) {
          toast.error('💡 يبدو أن Instance ID غير متصل. يرجى الذهاب إلى صفحة إدارة الربط لإعادة ربط WhatsApp.');
        }
      }
      }

    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      toast.error('حدث خطأ في إرسال الرسالة');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType) {
      case 'player': return <User className="w-4 h-4 text-blue-600" />;
      case 'trainer': return <Target className="w-4 h-4 text-green-600" />;
      case 'club': return <Building className="w-4 h-4 text-purple-600" />;
      case 'academy': return <GraduationCap className="w-4 h-4 text-orange-600" />;
      case 'agent': return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'marketer': return <TrendingUp className="w-4 h-4 text-pink-600" />;
      case 'admin': return <Crown className="w-4 h-4 text-yellow-600" />;
      default: return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAccountTypeLabel = (accountType: string) => {
    switch (accountType) {
      case 'player': return 'لاعب';
      case 'trainer': return 'مدرب';
      case 'club': return 'نادي';
      case 'academy': return 'أكاديمية';
      case 'agent': return 'وكيل';
      case 'marketer': return 'مسوق';
      case 'admin': return 'مدير';
      default: return accountType;
    }
  };

  // نماذج الرسائل الجاهزة
  const messageTemplates: MessageTemplate[] = [
    // نماذج الدفع والاشتراكات
    {
      id: 'payment-confirmation',
      title: 'تأكيد دفع الإيصال',
      message: 'تم تأكيد دفع إيصال الاشتراك بنجاح! شكراً لك على ثقتك في منصة الحلم. اضغط هنا للتجديد.',
      type: 'success',
      priority: 'medium',
      category: 'دفع واشتراكات',
      description: 'تأكيد دفع إيصال الاشتراك'
    },
    {
      id: 'subscription-renewal',
      title: 'تجديد الاشتراك',
      message: 'حان موعد تجديد اشتراكك! احرص على التجديد للاستمرار في الاستمتاع بجميع المميزات. اضغط هنا للتجديد.',
      type: 'warning',
      priority: 'high',
      category: 'دفع واشتراكات',
      description: 'تذكير بتجديد الاشتراك'
    },
    {
      id: 'payment-failed',
      title: 'فشل في الدفع',
      message: 'عذراً، حدث خطأ في عملية الدفع. يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى. اضغط هنا للمحاولة.',
      type: 'error',
      priority: 'high',
      category: 'دفع واشتراكات',
      description: 'إشعار فشل الدفع'
    },

    // نماذج الملف الشخصي
    {
      id: 'profile-views',
      title: 'مشاهدات الملف الشخصي',
      message: '🎉 تم مشاهدة ملفك الشخصي من قبل مدربين وأندية! ملفك يلفت الانتباه. اضغط هنا لتحسين ملفك.',
      type: 'success',
      priority: 'medium',
      category: 'الملف الشخصي',
      description: 'إشعار مشاهدات الملف الشخصي'
    },
    {
      id: 'profile-ranking',
      title: 'الترتيب الحالي للملف',
      message: '📊 ترتيب ملفك الشخصي: {ranking} من أصل {total}. استمر في تطوير مهاراتك! اضغط هنا للتحسين.',
      type: 'info',
      priority: 'medium',
      category: 'الملف الشخصي',
      description: 'إشعار الترتيب الحالي'
      },
    {
      id: 'incomplete-profile',
      title: 'استكمال بيانات الملف الشخصي',
      message: '⚠️ ملفك الشخصي غير مكتمل! استكمل بياناتك للحصول على فرص أفضل. اضغط هنا للإكمال.',
      type: 'warning',
      priority: 'high',
      category: 'الملف الشخصي',
      description: 'تذكير باستكمال البيانات'
      },
    {
      id: 'profile-updated',
      title: 'تم تحديث الملف الشخصي',
      message: '✅ تم تحديث ملفك الشخصي بنجاح! البيانات الجديدة ستظهر للمدربين والأندية. اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'low',
      category: 'الملف الشخصي',
      description: 'تأكيد تحديث الملف'
      },

      // نماذج الاختبارات
    {
      id: 'test-invitation',
      title: 'دعوة للاختبارات - منصة الحلم',
      message: '🏆 تم إرسال دعوة لك للمشاركة في اختبارات منصة الحلم! فرصة رائعة لإظهار مهاراتك. اضغط هنا للمشاركة.',
      type: 'success',
      priority: 'high',
      category: 'الاختبارات',
      description: 'دعوة للمشاركة في الاختبارات'
      },
    {
      id: 'test-reminder',
      title: 'تذكير بالاختبار',
      message: '⏰ تذكير: لديك اختبار غداً في الساعة {time}. تأكد من الاستعداد الجيد! اضغط هنا للتفاصيل.',
      type: 'warning',
      priority: 'high',
      category: 'الاختبارات',
      description: 'تذكير بموعد الاختبار'
      },
    {
      id: 'test-results',
      title: 'نتائج الاختبار',
      message: '📋 نتائج اختبارك جاهزة! يمكنك الاطلاع عليها في ملفك الشخصي. اضغط هنا للمراجعة.',
      type: 'info',
      priority: 'medium',
      category: 'الاختبارات',
      description: 'إشعار جاهزية النتائج'
      },

      // نماذج رسائل تشجيعية
    {
      id: 'motivational-1',
      title: 'رسالة تشجيعية',
      message: '💪 أنت تمتلك موهبة رائعة! استمر في التدريب والعمل الجاد، وستحقق أحلامك قريباً. اضغط هنا للتقدم.',
      type: 'success',
      priority: 'medium',
      category: 'رسائل تشجيعية',
      description: 'رسالة تحفيزية عامة'
      },
    {
      id: 'motivational-2',
      title: 'تطوير المهارات',
      message: '🌟 كل يوم تدريب هو خطوة نحو التميز! استمر في تطوير مهاراتك وستصبح لاعباً استثنائياً. اضغط هنا للتحسين.',
      type: 'success',
      priority: 'medium',
      category: 'رسائل تشجيعية',
      description: 'تشجيع على تطوير المهارات'
      },
    {
      id: 'motivational-3',
      title: 'النجاح قريب',
      message: '🎯 النجاح ليس بعيداً! استمر في العمل الجاد والتدريب المستمر، وستحقق أهدافك. اضغط هنا للأهداف.',
      type: 'success',
      priority: 'medium',
      category: 'رسائل تشجيعية',
      description: 'تشجيع على الاستمرار'
      },

      // نماذج الدعوة للأصدقاء
    {
      id: 'referral-program',
      title: 'احصل على عائد مالي - دعوة الأصدقاء',
      message: '💰 احصل على عائد مالي من خلال دعوة أصدقائك! لكل صديق تدعوه، تحصل على {amount} ريال. اضغط هنا للدعوة.',
      type: 'success',
      priority: 'medium',
      category: 'دعوة الأصدقاء',
      description: 'برنامج الدعوة والعائد المالي'
      },
    {
      id: 'referral-success',
      title: 'تم تسجيل صديقك بنجاح',
      message: '🎉 تم تسجيل صديقك بنجاح! سيتم إضافة {amount} ريال إلى رصيدك قريباً. اضغط هنا للرصيد.',
      type: 'success',
      priority: 'medium',
      category: 'دعوة الأصدقاء',
      description: 'تأكيد تسجيل صديق'
      },
    {
      id: 'referral-bonus',
      title: 'تم إضافة المكافأة',
      message: '💵 تم إضافة مكافأة دعوة الأصدقاء إلى رصيدك! استمر في دعوة المزيد من الأصدقاء. اضغط هنا للمزيد.',
      type: 'success',
      priority: 'medium',
      category: 'دعوة الأصدقاء',
      description: 'إشعار إضافة المكافأة'
      },

      // نماذج عامة
    {
      id: 'welcome-message',
      title: 'مرحباً بك في منصة الحلم',
      message: '🌟 مرحباً بك في منصة الحلم! نحن سعداء بانضمامك إلينا. نتمنى لك رحلة تدريبية ممتعة. اضغط هنا للاستكشاف.',
      type: 'success',
      priority: 'medium',
      category: 'رسائل عامة',
      description: 'رسالة ترحيب للمستخدمين الجدد'
      },
    {
      id: 'maintenance-notice',
      title: 'إشعار صيانة النظام',
      message: '🔧 سيتم إجراء صيانة للنظام يوم {date} من الساعة {start} إلى {end}. نعتذر عن الإزعاج. اضغط هنا للتفاصيل.',
      type: 'warning',
      priority: 'high',
      category: 'رسائل عامة',
      description: 'إشعار صيانة النظام'
      },
    {
      id: 'new-feature',
      title: 'ميزة جديدة متاحة',
      message: '✨ ميزة جديدة متاحة الآن! {feature_name}. جربها الآن واستمتع بالتجربة المحسنة. اضغط هنا للتجربة.',
      type: 'info',
      priority: 'medium',
      category: 'رسائل عامة',
      description: 'إشعار ميزة جديدة'
      },
    {
      id: 'achievement-unlocked',
      title: 'إنجاز جديد!',
      message: '🏆 مبروك! لقد حققت إنجاز {achievement_name}! استمر في التقدم. اضغط هنا للإنجازات.',
      type: 'success',
      priority: 'medium',
      category: 'رسائل عامة',
      description: 'إشعار إنجاز جديد'
      },

      // نماذج التدريب والتطوير
    {
      id: 'training-schedule',
      title: 'جدول التدريب الأسبوعي',
      message: '📅 جدول تدريبك الأسبوعي جاهز! تحقق من المواعيد الجديدة وكن مستعداً للتدريب. اضغط هنا للجدول.',
      type: 'info',
      priority: 'medium',
      category: 'التدريب والتطوير',
      description: 'إشعار جدول التدريب'
      },
    {
      id: 'training-reminder',
      title: 'تذكير بموعد التدريب',
      message: '⏰ تذكير: لديك تدريب غداً في الساعة {time} مع المدرب {coach_name}. كن مستعداً! اضغط هنا للتفاصيل.',
      type: 'warning',
      priority: 'high',
      category: 'التدريب والتطوير',
      description: 'تذكير بموعد التدريب'
      },
    {
      id: 'training-cancelled',
      title: 'إلغاء موعد التدريب',
      message: '❌ تم إلغاء موعد التدريب المقرر يوم {date}. سيتم إعادة جدولته قريباً. اضغط هنا للجدولة.',
      type: 'warning',
      priority: 'high',
      category: 'التدريب والتطوير',
      description: 'إشعار إلغاء التدريب'
      },
    {
      id: 'training-completed',
      title: 'تم إكمال التدريب',
      message: '✅ تم إكمال جلسة التدريب بنجاح! استمر في العمل الجاد لتطوير مهاراتك. اضغط هنا للتقدم.',
      type: 'success',
      priority: 'medium',
      category: 'التدريب والتطوير',
      description: 'تأكيد إكمال التدريب'
      },

      // نماذج المسابقات والبطولات
    {
      id: 'competition-invitation',
      title: 'دعوة للمسابقة',
      message: '🏆 تم إرسال دعوة لك للمشاركة في مسابقة {competition_name}! فرصة رائعة لإظهار مهاراتك. اضغط هنا للمشاركة.',
      type: 'success',
      priority: 'high',
      category: 'المسابقات والبطولات',
      description: 'دعوة للمشاركة في مسابقة'
      },
    {
      id: 'competition-reminder',
      title: 'تذكير بالمسابقة',
      message: '⏰ تذكير: المسابقة {competition_name} غداً! تأكد من الاستعداد الجيد. اضغط هنا للتفاصيل.',
      type: 'warning',
      priority: 'high',
      category: 'المسابقات والبطولات',
      description: 'تذكير بموعد المسابقة'
      },
    {
      id: 'competition-results',
      title: 'نتائج المسابقة',
      message: '📊 نتائج مسابقة {competition_name} جاهزة! تحقق من ترتيبك في الموقع. اضغط هنا للنتائج.',
      type: 'info',
      priority: 'medium',
      category: 'المسابقات والبطولات',
      description: 'إشعار نتائج المسابقة'
      },

      // نماذج العروض والخصومات
    {
      id: 'special-offer',
      title: 'عرض خاص!',
      message: '🎉 عرض خاص! احصل على خصم {discount}% على جميع الاشتراكات لمدة محدودة فقط. اضغط هنا للاستفادة.',
      type: 'success',
      priority: 'high',
      category: 'العروض والخصومات',
      description: 'عرض خاص وخصومات'
      },
    {
      id: 'limited-offer',
      title: 'عرض محدود',
      message: '⏰ عرض محدود! احصل على {offer_description} بسعر مخفض. العرض ينتهي قريباً! اضغط هنا للاستفادة.',
      type: 'warning',
      priority: 'high',
      category: 'العروض والخصومات',
      description: 'عرض محدود الوقت'
      },
    {
      id: 'loyalty-reward',
      title: 'مكافأة الولاء',
      message: '💎 مكافأة خاصة للعملاء المخلصين! احصل على {reward_description} مجاناً. اضغط هنا للاستلام.',
      type: 'success',
      priority: 'medium',
      category: 'العروض والخصومات',
      description: 'مكافأة الولاء'
      },

      // نماذج الدعم والمساعدة
    {
      id: 'support-ticket',
      title: 'تم فتح تذكرة الدعم',
      message: '🎫 تم فتح تذكرة الدعم رقم #{ticket_number}. سنقوم بالرد عليك في أقرب وقت ممكن. اضغط هنا للمتابعة.',
      type: 'info',
      priority: 'medium',
      category: 'الدعم والمساعدة',
      description: 'تأكيد فتح تذكرة الدعم'
      },
    {
      id: 'support-response',
      title: 'رد على تذكرة الدعم',
      message: '📧 تم الرد على تذكرة الدعم رقم #{ticket_number}. تحقق من الرد الجديد. اضغط هنا للرد.',
      type: 'info',
      priority: 'medium',
      category: 'الدعم والمساعدة',
      description: 'إشعار رد الدعم'
      },
    {
      id: 'support-resolved',
      title: 'تم حل المشكلة',
      message: '✅ تم حل مشكلتك بنجاح! إذا كنت بحاجة لمزيد من المساعدة، لا تتردد في التواصل معنا. اضغط هنا للتواصل.',
      type: 'success',
      priority: 'medium',
      category: 'الدعم والمساعدة',
      description: 'تأكيد حل المشكلة'
      },

      // نماذج الأمان والحماية
    {
      id: 'login-alert',
      title: 'تنبيه تسجيل الدخول',
      message: '🔒 تم تسجيل الدخول إلى حسابك من جهاز جديد. إذا لم تكن أنت، يرجى تغيير كلمة المرور. اضغط هنا للتغيير.',
      type: 'warning',
      priority: 'high',
      category: 'الأمان والحماية',
      description: 'تنبيه تسجيل دخول جديد'
      },
    {
      id: 'password-changed',
      title: 'تم تغيير كلمة المرور',
      message: '🔐 تم تغيير كلمة المرور بنجاح! إذا لم تقم بهذا التغيير، يرجى التواصل مع الدعم. اضغط هنا للتواصل.',
      type: 'warning',
      priority: 'high',
      category: 'الأمان والحماية',
      description: 'إشعار تغيير كلمة المرور'
      },
    {
      id: 'account-verified',
      title: 'تم التحقق من الحساب',
      message: '✅ تم التحقق من حسابك بنجاح! يمكنك الآن الاستمتاع بجميع المميزات. اضغط هنا للاستكشاف.',
      type: 'success',
      priority: 'medium',
      category: 'الأمان والحماية',
      description: 'تأكيد التحقق من الحساب'
      },

    // نماذج خدمة العملاء والدعم
    {
      id: 'customer-support-contact',
      title: 'تواصل مع خدمة العملاء',
      message: '📞 نحن هنا لمساعدتك! للاستفسارات أو المساعدة، تواصل معنا على: 01000940321 (خدمة عملاء مصر). اضغط هنا للتواصل.',
      type: 'info',
      priority: 'medium',
      category: 'خدمة العملاء',
      description: 'معلومات التواصل مع خدمة العملاء'
    },
    {
      id: 'customer-support-hours',
      title: 'أوقات عمل خدمة العملاء',
      message: '⏰ خدمة العملاء متاحة من الأحد إلى الخميس من 9 صباحاً حتى 6 مساءً. للتواصل: 01000940321. اضغط هنا للتواصل.',
      type: 'info',
      priority: 'low',
      category: 'خدمة العملاء',
      description: 'إشعار بأوقات عمل خدمة العملاء'
    },
    {
      id: 'customer-support-urgent',
      title: 'دعم فوري - خدمة العملاء',
      message: '🚨 تحتاج مساعدة فورية؟ تواصل معنا الآن على 01000940321 (خدمة عملاء مصر). فريقنا جاهز لمساعدتك! اضغط هنا للتواصل.',
      type: 'warning',
      priority: 'high',
      category: 'خدمة العملاء',
      description: 'طلب دعم فوري'
    },

    // نماذج إشعارات الرفض والموافقة
    {
      id: 'media-approved',
      title: 'تم الموافقة على المحتوى',
      message: '✅ تمت الموافقة على محتواك! شكراً لمشاركتك. يمكنك الآن الاطلاع على المحتوى في ملفك الشخصي. اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'medium',
      category: 'المحتوى والوسائط',
      description: 'إشعار الموافقة على المحتوى'
    },
    {
      id: 'media-rejected',
      title: 'تم رفض المحتوى',
      message: '❌ تم رفض محتواك. يرجى مراجعة الشروط والمحاولة مرة أخرى. للاستفسار: 01000940321. اضغط هنا للمراجعة.',
      type: 'error',
      priority: 'high',
      category: 'المحتوى والوسائط',
      description: 'إشعار رفض المحتوى'
    },
    {
      id: 'media-pending',
      title: 'محتوى قيد المراجعة',
      message: '⏳ المحتوى الخاص بك قيد المراجعة. سنقوم بالرد عليك قريباً. للاستفسار: 01000940321. اضغط هنا للمتابعة.',
      type: 'info',
      priority: 'medium',
      category: 'المحتوى والوسائط',
      description: 'إشعار محتوى قيد المراجعة'
    },

    // نماذج التذكيرات والإشعارات المهمة
    {
      id: 'account-suspension-warning',
      title: 'تنبيه: حسابك معرض للإيقاف',
      message: '⚠️ حسابك معرض للإيقاف المؤقت بسبب عدم الالتزام بالشروط. يرجى مراجعة ملفك. للاستفسار: 01000940321. اضغط هنا للمراجعة.',
      type: 'error',
      priority: 'critical',
      category: 'التذكيرات المهمة',
      description: 'تنبيه إيقاف الحساب'
    },
    {
      id: 'account-activated',
      title: 'تم تفعيل حسابك',
      message: '🎉 تم تفعيل حسابك بنجاح! يمكنك الآن استخدام جميع المميزات. للاستفسار: 01000940321. اضغط هنا للبدء.',
      type: 'success',
      priority: 'high',
      category: 'التذكيرات المهمة',
      description: 'إشعار تفعيل الحساب'
    },
    {
      id: 'account-deactivated',
      title: 'تم إيقاف حسابك مؤقتاً',
      message: '⛔ تم إيقاف حسابك مؤقتاً. للاستفسار عن السبب أو استعادة الحساب، تواصل معنا: 01000940321. اضغط هنا للتواصل.',
      type: 'error',
      priority: 'critical',
      category: 'التذكيرات المهمة',
      description: 'إشعار إيقاف الحساب'
    },

    // نماذج إشعارات الملفات والوثائق
    {
      id: 'document-uploaded',
      title: 'تم رفع الوثيقة',
      message: '📄 تم رفع وثيقتك بنجاح! جاري مراجعتها. سنقوم بإشعارك عند الانتهاء. للاستفسار: 01000940321. اضغط هنا للمتابعة.',
      type: 'success',
      priority: 'medium',
      category: 'الملفات والوثائق',
      description: 'تأكيد رفع الوثيقة'
    },
    {
      id: 'document-approved',
      title: 'تم اعتماد الوثيقة',
      message: '✅ تم اعتماد وثيقتك بنجاح! يمكنك الآن استخدامها في ملفك الشخصي. اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'medium',
      category: 'الملفات والوثائق',
      description: 'إشعار اعتماد الوثيقة'
    },
    {
      id: 'document-rejected',
      title: 'تم رفض الوثيقة',
      message: '❌ تم رفض وثيقتك. يرجى التأكد من صحة البيانات وإعادة الرفع. للاستفسار: 01000940321. اضغط هنا للمراجعة.',
      type: 'error',
      priority: 'high',
      category: 'الملفات والوثائق',
      description: 'إشعار رفض الوثيقة'
    },

    // نماذج إشعارات الرسائل والتواصل
    {
      id: 'new-message',
      title: 'رسالة جديدة',
      message: '💬 لديك رسالة جديدة من {sender_name}. اضغط هنا للاطلاع على الرسالة والرد.',
      type: 'info',
      priority: 'medium',
      category: 'الرسائل والتواصل',
      description: 'إشعار رسالة جديدة'
    },
    {
      id: 'offer-received',
      title: 'عرض جديد',
      message: '🎁 تلقيت عرضاً جديداً! تحقق من التفاصيل في ملفك الشخصي. اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'high',
      category: 'الرسائل والتواصل',
      description: 'إشعار عرض جديد'
    },
    {
      id: 'connection-request',
      title: 'طلب اتصال جديد',
      message: '🤝 تلقيت طلب اتصال من {sender_name}. اضغط هنا للموافقة أو الرفض.',
      type: 'info',
      priority: 'medium',
      category: 'الرسائل والتواصل',
      description: 'إشعار طلب اتصال'
    },

    // نماذج إشعارات التقييمات والمراجعات
    {
      id: 'rating-received',
      title: 'تقييم جديد',
      message: '⭐ تلقيت تقييماً جديداً! شكراً لك. يمكنك الاطلاع على التقييم في ملفك الشخصي. اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'low',
      category: 'التقييمات والمراجعات',
      description: 'إشعار تقييم جديد'
    },
    {
      id: 'review-request',
      title: 'طلب تقييم',
      message: '📝 نحن نرغب في معرفة رأيك! ساعدنا في تحسين الخدمة من خلال تقييم تجربتك. اضغط هنا للتقييم.',
      type: 'info',
      priority: 'medium',
      category: 'التقييمات والمراجعات',
      description: 'طلب تقييم الخدمة'
    },

    // نماذج إشعارات الأحداث والمناسبات
    {
      id: 'event-invitation',
      title: 'دعوة لحضور حدث',
      message: '🎪 تم إرسال دعوة لك لحضور حدث {event_name}! فرصة رائعة للتعلم والاستمتاع. اضغط هنا للمشاركة.',
      type: 'success',
      priority: 'high',
      category: 'الأحداث والمناسبات',
      description: 'دعوة لحضور حدث'
    },
    {
      id: 'event-reminder',
      title: 'تذكير بالحدث',
      message: '📅 تذكير: حدث {event_name} غداً في الساعة {time}. لا تفوت الفرصة! اضغط هنا للتفاصيل.',
      type: 'warning',
      priority: 'high',
      category: 'الأحداث والمناسبات',
      description: 'تذكير بموعد حدث'
    },
    {
      id: 'event-cancelled',
      title: 'تم إلغاء الحدث',
      message: '❌ تم إلغاء حدث {event_name}. نعتذر عن الإزعاج. سيتم إعادة جدولته قريباً. للاستفسار: 01000940321.',
      type: 'warning',
      priority: 'high',
      category: 'الأحداث والمناسبات',
      description: 'إشعار إلغاء حدث'
    },

    // نماذج إشعارات البرامج والخطط
    {
      id: 'program-enrolled',
      title: 'تم التسجيل في البرنامج',
      message: '🎓 تم تسجيلك في برنامج {program_name} بنجاح! نتمنى لك رحلة تعليمية ممتعة. اضغط هنا للبدء.',
      type: 'success',
      priority: 'high',
      category: 'البرامج والخطط',
      description: 'تأكيد التسجيل في برنامج'
    },
    {
      id: 'program-completed',
      title: 'تم إكمال البرنامج',
      message: '🏅 مبروك! لقد أكملت برنامج {program_name} بنجاح. يمكنك الآن الحصول على شهادة الإتمام. اضغط هنا للشهادة.',
      type: 'success',
      priority: 'high',
      category: 'البرامج والخطط',
      description: 'إشعار إكمال برنامج'
    },
    {
      id: 'program-reminder',
      title: 'تذكير بموعد البرنامج',
      message: '⏰ تذكير: لديك جلسة في برنامج {program_name} غداً. تأكد من الاستعداد! اضغط هنا للتفاصيل.',
      type: 'warning',
      priority: 'medium',
      category: 'البرامج والخطط',
      description: 'تذكير بموعد برنامج'
    },

    // نماذج إشعارات الشهادات والاعتمادات
    {
      id: 'certificate-ready',
      title: 'شهادة جاهزة',
      message: '📜 شهادتك جاهزة الآن! يمكنك تحميلها من ملفك الشخصي. للاستفسار: 01000940321. اضغط هنا للتحميل.',
      type: 'success',
      priority: 'medium',
      category: 'الشهادات والاعتمادات',
      description: 'إشعار جاهزية الشهادة'
    },
    {
      id: 'certificate-verified',
      title: 'تم التحقق من الشهادة',
      message: '✅ تم التحقق من شهادتك بنجاح! يمكنك الآن استخدامها في ملفك الشخصي. اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'medium',
      category: 'الشهادات والاعتمادات',
      description: 'تأكيد التحقق من الشهادة'
    },

    // نماذج إشعارات التحديثات والتطويرات
    {
      id: 'app-update',
      title: 'تحديث التطبيق متاح',
      message: '🔄 تحديث جديد للتطبيق متاح الآن! احصل على آخر المميزات والتحسينات. اضغط هنا للتحديث.',
      type: 'info',
      priority: 'medium',
      category: 'التحديثات والتطويرات',
      description: 'إشعار تحديث التطبيق'
    },
    {
      id: 'feature-update',
      title: 'تحديث ميزة',
      message: '✨ تم تحديث ميزة {feature_name}! جرب الميزات الجديدة الآن. اضغط هنا للاستكشاف.',
      type: 'info',
      priority: 'low',
      category: 'التحديثات والتطويرات',
      description: 'إشعار تحديث ميزة'
    },

    // نماذج إشعارات الطوارئ والمهام العاجلة
    {
      id: 'urgent-action-required',
      title: 'إجراء عاجل مطلوب',
      message: '🚨 يرجى تنفيذ إجراء عاجل: {action_description}. للاستفسار: 01000940321. اضغط هنا للتنفيذ.',
      type: 'error',
      priority: 'critical',
      category: 'الطوارئ والمهام العاجلة',
      description: 'طلب إجراء عاجل'
    },
    {
      id: 'deadline-approaching',
      title: 'اقتراب الموعد النهائي',
      message: '⏰ تنبيه: الموعد النهائي لـ {task_name} يقترب! يرجى الإكمال قبل انتهاء الوقت. اضغط هنا للإكمال.',
      type: 'warning',
      priority: 'high',
      category: 'الطوارئ والمهام العاجلة',
      description: 'تذكير بالموعد النهائي'
    },

    // نماذج إشعارات التهنئة والمناسبات
    {
      id: 'birthday-greeting',
      title: 'عيد ميلاد سعيد!',
      message: '🎂 عيد ميلاد سعيد! نتمنى لك عاماً مليئاً بالنجاح والفرح. استمر في السعي لتحقيق أحلامك!',
      type: 'success',
      priority: 'low',
      category: 'التهنئة والمناسبات',
      description: 'تهنئة بعيد الميلاد'
    },
    {
      id: 'achievement-congratulations',
      title: 'تهنئة بالإنجاز',
      message: '🎉 مبروك على إنجازك الرائع! استمر في التقدم والنجاح. نحن فخورون بك!',
      type: 'success',
      priority: 'medium',
      category: 'التهنئة والمناسبات',
      description: 'تهنئة بالإنجاز'
    },

    // نماذج إشعارات الاستطلاعات والاستبيانات
    {
      id: 'survey-request',
      title: 'طلب المشاركة في استطلاع',
      message: '📊 نحن نرغب في معرفة رأيك! شاركنا في استطلاع قصير لمساعدتنا في تحسين الخدمة. اضغط هنا للمشاركة.',
      type: 'info',
      priority: 'low',
      category: 'الاستطلاعات والاستبيانات',
      description: 'طلب المشاركة في استطلاع'
    },
    {
      id: 'survey-thanks',
      title: 'شكراً لمشاركتك',
      message: '🙏 شكراً لمشاركتك في الاستطلاع! رأيك مهم جداً لنا. للاستفسار: 01000940321.',
      type: 'success',
      priority: 'low',
      category: 'الاستطلاعات والاستبيانات',
      description: 'شكر على المشاركة'
    },

    // نماذج إشعارات الإعلانات والتسويق
    {
      id: 'new-partner',
      title: 'شريك جديد',
      message: '🤝 مرحباً بك كشريك جديد في منصة الحلم! نتمنى لك تجربة رائعة. للاستفسار: 01000940321. اضغط هنا للبدء.',
      type: 'success',
      priority: 'medium',
      category: 'الإعلانات والتسويق',
      description: 'ترحيب بشريك جديد'
    },
    {
      id: 'partnership-benefits',
      title: 'مميزات الشراكة',
      message: '💼 استمتع بمميزات الشراكة الحصرية! احصل على خصومات وعروض خاصة. للاستفسار: 01000940321. اضغط هنا للمميزات.',
      type: 'info',
      priority: 'medium',
      category: 'الإعلانات والتسويق',
      description: 'إشعار مميزات الشراكة'
    },

    // نماذج إشعارات التقييمات والتحسينات
    {
      id: 'profile-featured',
      title: 'ملفك مميز الآن',
      message: '⭐ تم تمييز ملفك الشخصي! ملفك يظهر في الصفحة الرئيسية. استمر في التميز! اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'high',
      category: 'التقييمات والتحسينات',
      description: 'إشعار تمييز الملف'
    },
    {
      id: 'rank-improved',
      title: 'تحسن ترتيبك',
      message: '📈 مبروك! تحسن ترتيبك في المنصة. استمر في التقدم لتحقيق المزيد من النجاح! اضغط هنا للمراجعة.',
      type: 'success',
      priority: 'medium',
      category: 'التقييمات والتحسينات',
      description: 'إشعار تحسن الترتيب'
    },
    {
      id: 'top-ten-ranking',
      title: 'أنت من العشرة الأوائل!',
      message: '🏆 حسابك الآن في ترتيب رقم {ranking} - أنت من العشرة الأوائل! يمكن للأندية والأكاديميات العالمية مشاهدتك الآن. اضغط هنا.',
      type: 'success',
      priority: 'high',
      category: 'الملف الشخصي',
      description: 'إشعار ترتيب من العشرة الأوائل'
    }
    ];

  const filteredTemplates = selectedCategory === 'all'
    ? messageTemplates
    : messageTemplates.filter(template => template.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(messageTemplates.map(t => t.category)))];

  const handleTemplateSelect = (template: MessageTemplate) => {
    if (template.message.length > 1000) {
      toast.warning(`هذا النموذج يتجاوز الحد الأقصى للحروف (${template.message.length}/1000). سيتم اختياره ولكن يرجى تعديله.`);
    }

    setForm(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      type: template.type,
      priority: template.priority
    }));
    setShowTemplates(false);
  };

  const targetUsers = getTargetUsers();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 sm:mb-8">
        <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
          <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">إرسال الإشعارات</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">إرسال إشعارات مخصصة للمستخدمين عبر طرق متعددة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* Form */}
        <div className="xl:col-span-3 space-y-4 sm:space-y-6">
          {/* Date Filter Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                فلترة بالتاريخ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => { setDateFilterType('all'); setDateStart(''); setDateEnd(''); }}
                  className={`text-xs sm:text-sm border ${dateFilterType === 'all'
                    ? 'bg-gray-700 text-white hover:bg-gray-800 border-transparent'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}
                >
                  الكل
                </Button>
                <Button
                  type="button"
                  onClick={() => { setDateFilterType('today'); setDateStart(''); setDateEnd(''); }}
                  className={`text-xs sm:text-sm border ${dateFilterType === 'today'
                    ? 'bg-green-600 text-white hover:bg-green-700 border-transparent'
                    : 'bg-white text-green-700 hover:bg-green-50 border-green-300'}`}
                >
                  اليوم
                </Button>
                <Button
                  type="button"
                  onClick={() => { setDateFilterType('this_month'); setDateStart(''); setDateEnd(''); }}
                  className={`text-xs sm:text-sm border ${dateFilterType === 'this_month'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent'
                    : 'bg-white text-indigo-700 hover:bg-indigo-50 border-indigo-300'}`}
                >
                  هذا الشهر
                </Button>
                <Button
                  type="button"
                  onClick={() => setDateFilterType('range')}
                  className={`text-xs sm:text-sm border ${dateFilterType === 'range'
                    ? 'bg-amber-600 text-white hover:bg-amber-700 border-transparent'
                    : 'bg-white text-amber-700 hover:bg-amber-50 border-amber-300'}`}
                >
                  نطاق تاريخ
                </Button>
              </div>
              {dateFilterType === 'range' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="notif-date-start" className="block text-xs text-gray-600 mb-1">من تاريخ</label>
                    <Input id="notif-date-start" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="notif-date-end" className="block text-xs text-gray-600 mb-1">إلى تاريخ</label>
                    <Input id="notif-date-end" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">مطابقون: {filteredUsers.length}</Badge>
                <Button type="button" variant="outline" size="sm" onClick={selectAllUsers} className="text-xs">تحديد كل المطابقين</Button>
                <Button type="button" variant="ghost" size="sm" onClick={deselectAllUsers} className="text-xs">إلغاء التحديد</Button>
              </div>
            </CardContent>
          </Card>
                       {/* Message Templates */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <MessageSquare className="w-5 h-5 text-green-600" />
                 نماذج الرسائل الجاهزة
               </CardTitle>
               <CardDescription>
                 اختر من نماذج الرسائل الجاهزة أو أنشئ رسالة مخصصة
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                                 <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 flex-1 sm:flex-none"
                  >
                    {showTemplates ? 'إخفاء النماذج' : 'عرض النماذج الجاهزة'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        title: '',
                        message: '',
                        type: 'info',
                        priority: 'medium'
                      }));
                    }}
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 flex-1 sm:flex-none"
                  >
                    رسالة مخصصة
                  </Button>
                </div>

               {showTemplates && (
                 <div className="space-y-4">
                   {/* Category Filter */}
                   <div>
                     <label className="text-sm font-medium text-gray-700 mb-2 block">
                       تصفية حسب الفئة
                     </label>
                     <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {categories.map((category) => (
                           <SelectItem key={category} value={category}>
                             {category === 'all' ? 'جميع الفئات' : category}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                                         {/* Templates Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 sm:max-h-96 overflow-y-auto">
                     {filteredTemplates.map((template) => (
                       <div
                         key={template.id}
                         className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                         onClick={() => handleTemplateSelect(template)}
                       >
                         <div className="flex items-start justify-between mb-2">
                           <div className="flex items-center gap-2">
                             {getTypeIcon(template.type)}
                             <span className="font-medium text-sm">{template.title}</span>
                           </div>
                           <Badge className={getPriorityColor(template.priority)}>
                             {template.priority === 'critical' ? 'حرج' :
                              template.priority === 'high' ? 'عالية' :
                              template.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                           </Badge>
                         </div>
                         <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                                                     <div className="space-y-1">
                            <p className="text-xs text-gray-500 line-clamp-2">{template.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">
                                {template.message.length} حرف
                              </span>
                              <span className={`text-xs ${template.message.length > 1000 ? 'text-red-500' : 'text-green-500'}`}>
                                {template.message.length > 1000 ? 'تجاوز الحد' : 'ضمن الحد'}
                              </span>
                            </div>
                          </div>
                         <div className="mt-2">
                           <Badge variant="outline" className="text-xs">
                             {template.category}
                           </Badge>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>

           {/* Basic Info */}
           <Card>
             <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  معلومات الإشعار
                </CardTitle>
               <CardDescription>
                 أدخل تفاصيل الإشعار الذي تريد إرساله
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  عنوان الإشعار *
                </label>
                <Input
                  placeholder="أدخل عنوان الإشعار"
                  value={form.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                />
              </div>

                               <div>
                 <div className="flex items-center justify-between mb-2">
                   <label className="text-sm font-medium text-gray-700">
                     رسالة الإشعار *
                   </label>
                   <span className={`text-xs ${form.message.length > 1000 ? 'text-red-600' : 'text-gray-500'}`}>
                     {form.message.length}/1000 حرف
                   </span>
                 </div>
                 <Textarea
                   placeholder="أدخل رسالة الإشعار (الحد الأقصى 1000 حرف)"
                   value={form.message}
                   onChange={(e) => {
                     if (e.target.value.length <= 1000) {
                       handleFormChange('message', e.target.value);
                     }
                   }}
                   rows={4}
                   className={form.message.length > 1000 ? 'border-red-500' : ''}
                 />
                 {form.message.length > 1000 && (
                   <p className="text-xs text-red-600 mt-1">
                     تجاوزت الحد الأقصى للحروف. يرجى تقصير الرسالة.
                   </p>
                 )}
               </div>

                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    نوع الإشعار
                  </label>
                  <Select value={form.type} onValueChange={(value) => handleFormChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">معلومات</SelectItem>
                      <SelectItem value="success">نجاح</SelectItem>
                      <SelectItem value="warning">تحذير</SelectItem>
                      <SelectItem value="error">خطأ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    الأولوية
                  </label>
                  <Select value={form.priority} onValueChange={(value) => handleFormChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="critical">حرجة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Selection */}
          <Card>
            <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                 <Target className="w-5 h-5 text-purple-600" />
                 تحديد المستهدفين
               </CardTitle>
              <CardDescription>
                اختر المستخدمين الذين تريد إرسال الإشعار إليهم
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Filter - integrated here for maintainability */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-800">فلترة بالتاريخ</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => { setDateFilterType('all'); setDateStart(''); setDateEnd(''); }}
                    className={`text-xs sm:text-sm border ${dateFilterType === 'all'
                      ? 'bg-gray-700 text-white hover:bg-gray-800 border-transparent'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}
                  >
                    الكل
                  </Button>
                  <Button
                    type="button"
                    onClick={() => { setDateFilterType('today'); setDateStart(''); setDateEnd(''); }}
                    className={`text-xs sm:text-sm border ${dateFilterType === 'today'
                      ? 'bg-green-600 text-white hover:bg-green-700 border-transparent'
                      : 'bg-white text-green-700 hover:bg-green-50 border-green-300'}`}
                  >
                    اليوم
                  </Button>
                  <Button
                    type="button"
                    onClick={() => { setDateFilterType('this_month'); setDateStart(''); setDateEnd(''); }}
                    className={`text-xs sm:text-sm border ${dateFilterType === 'this_month'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent'
                      : 'bg-white text-indigo-700 hover:bg-indigo-50 border-indigo-300'}`}
                  >
                    هذا الشهر
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setDateFilterType('range')}
                    className={`text-xs sm:text-sm border ${dateFilterType === 'range'
                      ? 'bg-amber-600 text-white hover:bg-amber-700 border-transparent'
                      : 'bg-white text-amber-700 hover:bg-amber-50 border-amber-300'}`}
                  >
                    نطاق تاريخ
                  </Button>
                </div>
                {dateFilterType === 'range' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="notif-date-start" className="block text-xs text-gray-600 mb-1">من تاريخ</label>
                      <Input id="notif-date-start" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="notif-date-end" className="block text-xs text-gray-600 mb-1">إلى تاريخ</label>
                      <Input id="notif-date-end" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">مطابقون: {filteredUsers.length}</Badge>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllUsers} className="text-xs">تحديد كل المطابقين</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={deselectAllUsers} className="text-xs">إلغاء التحديد</Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  نوع الاستهداف
                </label>
                <Select value={form.targetType} onValueChange={(value) => handleFormChange('targetType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                    <SelectItem value="account_type">حسب نوع الحساب</SelectItem>
                    <SelectItem value="specific">مستخدمين محددين</SelectItem>
                    <SelectItem value="custom_numbers">أرقام هاتف مخصصة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.targetType === 'account_type' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    أنواع الحسابات
                  </label>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {['player', 'trainer', 'club', 'academy', 'agent', 'marketer', 'admin'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={form.accountTypes.includes(type)}
                          onCheckedChange={(checked) => handleAccountTypeChange(type, checked as boolean)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white transition-colors"
                        />
                        <label htmlFor={type} className="text-sm flex items-center gap-2 hover:text-blue-600 cursor-pointer transition-colors">
                          {getAccountTypeIcon(type)}
                          {getAccountTypeLabel(type)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.targetType === 'specific' && (
                <div>
                                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                     <label className="text-sm font-medium text-gray-700">
                       اختيار المستخدمين
                     </label>
                                            <div className="flex flex-col sm:flex-row gap-2">
                       <Button
                         variant="default"
                         size="sm"
                         onClick={selectAllUsers}
                         className="text-xs bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                       >
                         <Check className="w-3 h-3 ml-1 text-white" />
                         تحديد الكل
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={deselectAllUsers}
                         className="text-xs bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
                       >
                         <X className="w-3 h-3 ml-1 text-white" />
                         إلغاء الكل
                       </Button>
                     </div>
                  </div>

                  {/* Search and Filter */}
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
                      <Input
                        placeholder="البحث في المستخدمين..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div>
                      <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
                        <SelectTrigger>
                          <SelectValue placeholder="فلترة حسب نوع الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الأنواع</SelectItem>
                          <SelectItem value="player">لاعب</SelectItem>
                          <SelectItem value="trainer">مدرب</SelectItem>
                          <SelectItem value="club">نادي</SelectItem>
                          <SelectItem value="academy">أكاديمية</SelectItem>
                          <SelectItem value="agent">وكيل</SelectItem>
                          <SelectItem value="marketer">مسوق</SelectItem>
                          <SelectItem value="admin">مدير</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                                       {/* Users List */}
                   <div className="border rounded-lg max-h-80 sm:max-h-96 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        لا يوجد مستخدمين
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="p-3 hover:bg-gray-50 transition-colors"
                          >
                                                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                               <div className="flex items-center gap-3 flex-1">
                                <Checkbox
                                  checked={form.selectedUsers.includes(user.id)}
                                  onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white transition-colors"
                                />
                                <div className="flex items-center gap-2">
                                  {getAccountTypeIcon(user.accountType)}
                                  <div>
                                    <div className="font-medium text-sm">
                                      {user.displayName || 'بدون اسم'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {user.email || '—'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                                        <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                        {getAccountTypeLabel(user.accountType)}
                      </Badge>
                                   <div className="flex items-center gap-1 text-xs text-gray-500">
                                     <Phone className="w-3 h-3 text-green-600" />
                                  {user.phone || '—'}
                                   </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {form.selectedUsers.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-900">
                        تم تحديد {form.selectedUsers.length} مستخدم
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.targetType === 'custom_numbers' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    أرقام الهاتف (سطر واحد لكل رقم)
                  </label>
                  <Textarea
                    placeholder="+201234567890&#10;+201234567891&#10;+201234567892"
                    value={form.customNumbers}
                    onChange={(e) => handleFormChange('customNumbers', e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Send Methods */}
          <Card>
            <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                 <Settings className="w-5 h-5 text-orange-600" />
                 طرق الإرسال
               </CardTitle>
              <CardDescription>
                اختر طرق إرسال الإشعار
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inApp"
                    checked={form.sendMethods.inApp}
                    onCheckedChange={(checked) => handleSendMethodChange('inApp', checked as boolean)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white transition-colors"
                  />
                                       <label htmlFor="inApp" className="text-sm flex items-center gap-2 hover:text-blue-600 cursor-pointer transition-colors">
                     <Bell className="w-4 h-4 text-blue-600" />
                     في التطبيق
                   </label>
                 </div>

                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="sms"
                     checked={form.sendMethods.sms}
                     onCheckedChange={(checked) => handleSendMethodChange('sms', checked as boolean)}
                     className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white transition-colors"
                   />
                   <label htmlFor="sms" className="text-sm flex items-center gap-2 hover:text-blue-600 cursor-pointer transition-colors">
                     <Smartphone className="w-4 h-4 text-green-600" />
                     SMS
                   </label>
                 </div>

                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="whatsapp"
                     checked={form.sendMethods.whatsapp}
                     onCheckedChange={(checked) => handleSendMethodChange('whatsapp', checked as boolean)}
                     className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white transition-colors"
                   />
                   <label htmlFor="whatsapp" className="text-sm flex items-center gap-2 hover:text-blue-600 cursor-pointer transition-colors">
                     <MessageSquare className="w-4 h-4 text-green-600" />
                     WhatsApp
                   </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Send Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* WhatsApp Direct Message Button */}
                <Button
                  onClick={() => setShowWhatsAppDialog(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold"
                  size="lg"
                >
                  <MessageSquare className="w-5 h-5 ml-2" />
                  إرسال رسالة WhatsApp مباشرة
                </Button>

                {/* Regular Send Button */}
                <Button
                   onClick={() => {
                     console.log('🔘 تم النقر على زر الإرسال');
                     sendNotification();
                   }}
                   disabled={loading || !form.title || !form.message || form.message.length > 1000 || getTargetUsers().length === 0}
                   className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                   size="lg"
                   type="button"
                 >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري الإرسال...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-white" />
                    {getTargetUsers().length === 0 ? 'لا يوجد مستهدفين' : `إرسال الإشعار (${getTargetUsers().length})`}
                  </div>
                )}
              </Button>
              {(!form.title || !form.message || form.message.length > 1000 || getTargetUsers().length === 0) && !loading && (
                <div className="text-xs text-red-600 mt-2 space-y-1">
                  {!form.title && <p>• يرجى إدخال عنوان الإشعار</p>}
                  {!form.message && <p>• يرجى إدخال رسالة الإشعار</p>}
                  {form.message.length > 1000 && <p>• الرسالة طويلة جداً ({form.message.length}/1000)</p>}
                  {getTargetUsers().length === 0 && <p>• لا يوجد مستخدمين مستهدفين</p>}
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Stats */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                 <Eye className="w-5 h-5 text-indigo-600" />
                 معاينة الإشعار
               </CardTitle>
            </CardHeader>
            <CardContent>
              {form.title && form.message ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(form.type)}
                      <span className="font-medium text-sm">{form.title}</span>
                    </div>
                    <Badge className={getPriorityColor(form.priority)}>
                      {form.priority === 'critical' ? 'حرج' :
                       form.priority === 'high' ? 'عالية' :
                       form.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </Badge>
                  </div>
                                       <p className="text-xs sm:text-sm text-gray-600">{form.message}</p>
                   <div className="flex items-center justify-between text-xs text-gray-500">
                     <div className="flex items-center gap-2">
                       <Clock className="w-3 h-3 text-orange-600" />
                       {form.scheduleType === 'immediate' ? 'إرسال فوري' : 'إرسال مجدول'}
                     </div>
                     <span className={`${form.message.length > 1000 ? 'text-red-500' : 'text-green-500'}`}>
                       {form.message.length}/1000 حرف
                     </span>
                   </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">أدخل العنوان والرسالة لمعاينة الإشعار</p>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                 <Zap className="w-5 h-5 text-yellow-600" />
                 إحصائيات الإرسال
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs sm:text-sm text-gray-600">المستخدمين المستهدفين:</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold text-xs">{targetUsers.length}</Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs sm:text-sm text-gray-600">الإرسال في التطبيق:</span>
                <Badge className={`text-xs ${form.sendMethods.inApp ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {form.sendMethods.inApp ? 'مفعل' : 'معطل'}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs sm:text-sm text-gray-600">إرسال SMS:</span>
                <Badge className={`text-xs ${form.sendMethods.sms ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {form.sendMethods.sms ? 'مفعل' : 'معطل'}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs sm:text-sm text-gray-600">إرسال WhatsApp:</span>
                <Badge className={`text-xs ${form.sendMethods.whatsapp ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {form.sendMethods.whatsapp ? 'مفعل' : 'معطل'}
                </Badge>
              </div>
            </CardContent>
          </Card>


                       {/* Templates Stats */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <MessageSquare className="w-5 h-5 text-green-600" />
                 إحصائيات النماذج
               </CardTitle>
             </CardHeader>
                             <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm text-gray-600">إجمالي النماذج:</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200 font-semibold text-xs">
                    {messageTemplates.length}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm text-gray-600">عدد الفئات:</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold text-xs">
                    {categories.length - 1}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">النماذج حسب الفئة:</span>
                  {categories.slice(1).map((category) => {
                    const count = messageTemplates.filter(t => t.category === category).length;
                    return (
                      <div key={category} className="flex justify-between text-xs">
                        <span className="text-gray-600 truncate">{category}:</span>
                        <span className="font-medium mr-2">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
           </Card>

           {/* Target Users List */}
           {targetUsers.length > 0 && (
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-pink-600" />
                    المستخدمين المستهدفين ({targetUsers.length})
                  </CardTitle>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => setIsTargetListExpanded(v => !v)}
                   className="text-xs"
                 >
                   {isTargetListExpanded ? 'إخفاء' : 'عرض الكل'}
                 </Button>
               </CardHeader>
               <CardContent>
                 <div className={`${isTargetListExpanded ? 'max-h-96' : 'max-h-48 sm:max-h-60'} space-y-2 overflow-y-auto`}>
                   {targetUsers.map((user) => (
                     <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm p-2 bg-gray-50 rounded gap-1">
                       <div className="flex items-center gap-2">
                         {getAccountTypeIcon(user.accountType)}
                         <span className="truncate">
                           {user.phone || 'بدون هاتف'} • {user.displayName || 'بدون اسم'} • {user.email || 'بدون بريد'}
                         </span>
                       </div>
                       <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                         {getAccountTypeLabel(user.accountType)}
                       </Badge>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
           )}
        </div>
      </div>
      </div>

    {/* WhatsApp Direct Message Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            إرسال رسالة WhatsApp مباشرة
          </DialogTitle>
          <DialogDescription>
            أرسل رسالة سريعة عبر WhatsApp لأي رقم هاتف
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="966501234567 أو 01012345678"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="title">عنوان الرسالة</Label>
            <Input
              id="title"
              value={whatsappMessage.title}
              onChange={(e) => setWhatsappMessage(prev => ({ ...prev, title: e.target.value }))}
              placeholder="عنوان الرسالة"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="body">محتوى الرسالة</Label>
            <Textarea
              id="body"
              value={whatsappMessage.body}
              onChange={(e) => setWhatsappMessage(prev => ({ ...prev, body: e.target.value }))}
              placeholder="اكتب محتوى الرسالة هنا..."
              className="mt-1"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={sendWhatsAppMessage}
              disabled={sendingWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {sendingWhatsApp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  إرسال الرسالة
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowWhatsAppDialog(false)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </div>
  );
}
