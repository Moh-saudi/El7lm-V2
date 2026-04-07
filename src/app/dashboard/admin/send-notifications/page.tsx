'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { detectCountryFromPhone } from '@/lib/constants/countries';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { buildSenderInfo, normalizeNotificationPayload } from '@/lib/notifications/sender-utils';
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
  User as UserIcon,
  Users,
  X,
  Zap,
  Layout,
  Layers,
  Sparkles,
  MousePointer2,
  ChevronRight,
  Monitor,
  SendHorizontal
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { messageTemplates } from '@/lib/notifications/templates';
import { MessageTemplate, NotificationUser, NotificationForm } from './types';

export default function SendNotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<NotificationUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<NotificationUser[]>([]);
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
  const [previewMode, setPreviewMode] = useState<'app' | 'whatsapp' | 'sms'>('app');
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
    scheduleType: 'immediate',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0')
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

  const isInDateFilter = (user: NotificationUser): boolean => {
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

  // جلب المستخدمين من Supabase (users table)
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, display_name, full_name, name, email, phone, phone_number, whatsapp, account_type, is_active, avatar, photo_url, created_at')
          .eq('is_active', true);

        if (error) {
          console.error('Supabase fetch users error:', error);
          toast.error('فشل في الاستماع للبيانات بشكل لحظي');
          return;
        }

        const arr: NotificationUser[] = (data || []).map(row => {
          const displayName = row.display_name || row.full_name || row.name || '';
          const email = row.email || '';
          const phone = row.phone || row.phone_number || row.whatsapp || '';
          const accountType = (row.account_type || '').trim();
          const createdAt: Date | null = row.created_at ? new Date(row.created_at) : null;
          return {
            id: row.id,
            displayName,
            email,
            phone,
            accountType: accountType as string,
            isActive: row.is_active !== false,
            avatar: row.avatar || row.photo_url || '',
            createdAt,
          };
        });

        setUsers(arr);
        setFilteredUsers(arr);
      } catch (e) {
        console.error('Realtime listeners error:', e);
        toast.error('فشل في الاستماع للبيانات بشكل لحظي');
      }
    };

    fetchAllUsers();
  }, []);

  // فلترة المستخدمين حسب البحث ونوع الحساب والتاريخ
  useEffect(() => {
    let filtered = users;

    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(user =>
        (user as any).user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // الإبقاء على الدالة للاستدعاء اليدوي إن لزم
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, full_name, name, email, phone, phone_number, whatsapp, account_type, is_active, avatar, photo_url, created_at')
        .eq('is_active', true);
      if (error) throw error;
      const usersData = (data || []).map(row => ({
        id: row.id,
        displayName: row.display_name || row.full_name || row.name || '',
        email: row.email || '',
        phone: row.phone || row.phone_number || row.whatsapp || '',
        accountType: (row.account_type || '') as string,
        isActive: row.is_active !== false,
        avatar: row.avatar || row.photo_url || '',
        createdAt: row.created_at ? new Date(row.created_at) : null,
      })) as NotificationUser[];
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
    const applyDate = (arr: NotificationUser[]) => dateFilterType === 'all' ? arr : arr.filter(isInDateFilter);
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
  const calculateUserRanking = (targetUser: NotificationUser, allUsersOfSameType: NotificationUser[]): { ranking: number; total: number } => {
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
  const replaceMessageVariables = (message: string, targetUser: NotificationUser): string => {
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
      const senderInfo = buildSenderInfo({
        user,
        fallbackName: user?.user_metadata?.full_name || 'الإدارة',
        fallbackAccountType: 'admin'
      });

      const now = new Date().toISOString();
      const notificationData = {
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        is_read: false,
        scope: 'system',
        created_at: now,
        updated_at: now,
        metadata: {
          senderId: senderInfo.senderId || user?.id,
          senderName: senderInfo.senderName || 'الإدارة',
          senderAccountType: senderInfo.senderAccountType || 'admin',
          senderAvatar: senderInfo.senderAvatar,
          senderBucket: senderInfo.senderBucket,
          targetType: form.targetType,
          accountTypes: form.accountTypes,
          sendMethods: form.sendMethods,
          scheduledFor: form.scheduleType === 'scheduled'
            ? new Date(`${form.scheduledDate}T${form.scheduledTime}`)
            : null
        }
      };

      // حفظ الإشعارات في Supabase مع استبدال المتغيرات لكل مستخدم
      const notificationRows = targetUsers.map((targetUser) => {
        const personalizedMessage = replaceMessageVariables(form.message, targetUser);
        const personalizedTitle = replaceMessageVariables(form.title, targetUser);

        const notification = normalizeNotificationPayload({
          ...notificationData,
          title: personalizedTitle,
          message: personalizedMessage,
          userId: targetUser.id,
          userEmail: targetUser.email,
          userPhone: targetUser.phone
        }, senderInfo);
        return {
          ...notification,
          user_id: targetUser.id,
          user_email: targetUser.email,
          user_phone: targetUser.phone,
        };
      });

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationRows);

      if (insertError) throw insertError;
      console.log(`✅ تم حفظ ${notificationRows.length} إشعار في Supabase`);

      // WhatsApp/SMS bulk send via BabaService removed — use AI Messenger with ChatAman templates

      // عرض رسالة النجاح
      const successMessage = `✅ تم إرسال الإشعار بنجاح إلى ${notificationRows.length} مستخدم`;
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

      // BabaService removed — open WhatsApp Web directly for free-text messages
      // For bulk template campaigns use AI Messenger
      const cleanPhone = whatsappPhone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(whatsappMessageText);
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
      setShowWhatsAppDialog(false);
      setWhatsappMessage({ title: '', body: '' });
      setPhoneNumber('');

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
      case 'player': return <UserIcon className="w-4 h-4 text-blue-600" />;
      case 'trainer': return <Target className="w-4 h-4 text-green-600" />;
      case 'club': return <Building className="w-4 h-4 text-purple-600" />;
      case 'academy': return <GraduationCap className="w-4 h-4 text-orange-600" />;
      case 'agent': return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'marketer': return <TrendingUp className="w-4 h-4 text-pink-600" />;
      case 'admin': return <Crown className="w-4 h-4 text-yellow-600" />;
      default: return <UserIcon className="w-4 h-4 text-gray-600" />;
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-blue-100 selection:text-blue-700">
      {/* Background Blobs for Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -left-[10%] w-[35%] h-[35%] bg-indigo-400/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-[10%] right-[20%] w-[30%] h-[30%] bg-purple-400/10 blur-[80px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Modern Header Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-2xl shadow-blue-900/5"
        >
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200">
                <SendHorizontal className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 p-1.5 bg-yellow-400 rounded-lg shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-yellow-900" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                مركز <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">التواصل الذكي</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                تحكم كامل في حملاتك الترويجية وإشعارات النظام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="bg-white/50 backdrop-blur-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-2xl px-6 h-12 border border-white transition-all duration-300 font-black text-xs uppercase tracking-widest shadow-sm"
              onClick={() => setForm({
                title: '',
                message: '',
                type: 'info',
                priority: 'medium',
                targetType: 'all',
                accountTypes: [],
                customNumbers: '',
                selectedUsers: [],
                sendMethods: { inApp: true, sms: false, whatsapp: false },
                scheduleType: 'immediate',
                scheduledDate: new Date().toISOString().split('T')[0],
                scheduledTime: new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0')
              })}
            >
              <Zap className="w-4 h-4 ml-2 opacity-50" />
              تصفير
            </Button>
            <Button
              onClick={() => setShowWhatsAppDialog(true)}
              className="bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-2xl px-8 h-12 shadow-xl shadow-green-500/20 border-t border-white/20 transition-all font-black"
            >
              <MessageSquare className="w-4 h-4 ml-2" />
              واتساب سريع
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="compose" className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <TabsList className="bg-white/70 backdrop-blur-md p-1.5 h-16 rounded-2xl border border-white shadow-sm w-full md:w-auto flex gap-1">
              {[
                { value: 'compose', icon: Layers, label: 'محتوى الرسالة' },
                { value: 'targeting', icon: Target, label: 'الجمهور المستهدف' },
                { value: 'methods', icon: Smartphone, label: 'قنوات الإرسال' }
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-8 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full transition-all duration-300 gap-2 flex items-center font-bold"
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-2 bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-800">إجمالي المستخدمين: {users.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8 space-y-6">
              <TabsContent value="compose" className="mt-0 space-y-6">
                {/* Templates Section */}
                <Card className="border-none shadow-xl shadow-blue-900/5 bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden border border-white">
                  <CardHeader className="bg-gradient-to-r from-gray-50/50 to-white/50 border-b border-gray-100 p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                          <Layout className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black text-gray-900">المكتبة الذكية</CardTitle>
                          <CardDescription className="text-gray-500 font-medium">استخدم النماذج الجاهزة لتسريع عملية التواصل</CardDescription>
                        </div>
                      </div>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full md:w-56 h-12 bg-white rounded-xl border-gray-100 shadow-sm font-bold">
                          <SelectValue placeholder="فئة النموذج" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-2xl">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="font-bold py-3 uppercase tracking-tight">
                              {cat === 'all' ? 'جميع التصنيفات' : cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                      {filteredTemplates.map((template) => (
                        <motion.div
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className="group p-6 rounded-[1.5rem] border border-gray-100 bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer transition-all duration-300 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-1.5 bg-blue-50 text-blue-600 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <MousePointer2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
                              {template.category}
                            </span>
                            <Badge className={`text-[10px] h-5 font-black uppercase tracking-tighter ${getPriorityColor(template.priority)}`}>
                              {template.priority}
                            </Badge>
                          </div>
                          <h4 className="font-extrabold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">{template.title}</h4>
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 font-medium">{template.message}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Message Editor */}
                <Card className="border-none shadow-xl shadow-blue-900/5 bg-white/80 backdrop-blur-md rounded-3xl border border-white">
                  <CardHeader className="bg-gradient-to-r from-gray-50/50 to-white/50 border-b border-gray-100 p-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900">محرر المحتوى</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                      <Label className="text-gray-900 font-black text-sm uppercase tracking-wider">عنوان الرسالة</Label>
                      <div className="relative group">
                        <Input
                          value={form.title}
                          onChange={(e) => handleFormChange('title', e.target.value)}
                          placeholder="مثال: خصم حصري لمشتركي منصة الحلم"
                          className="h-14 font-bold rounded-2xl border-gray-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all bg-white group-hover:border-blue-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-gray-900 font-black text-sm uppercase tracking-wider">نص الرسالة</Label>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${form.message.length > 800 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                            {form.message.length} / 1000 حرف
                          </span>
                        </div>
                      </div>
                      <div className="relative group">
                        <Textarea
                          value={form.message}
                          onChange={(e) => handleFormChange('message', e.target.value)}
                          placeholder="اكتب رسالتك هنا... استخدم المتغيرات {user_name} لتخصيص التجربة"
                          className="min-h-[200px] font-bold rounded-2xl border-gray-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all bg-white resize-none p-6 group-hover:border-blue-200"
                        />
                        {/* Variable toolbar suggestion */}
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          {['{user_name}', '{ranking}', '{total}'].map(v => (
                            <button
                              key={v}
                              onClick={() => handleFormChange('message', form.message + ` ${v}`)}
                              className="text-[10px] font-black bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 text-gray-500 px-3 py-1.5 rounded-lg transition-all"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <Label className="text-gray-900 font-black text-sm uppercase tracking-wider">نوع الرسالة</Label>
                        <Select value={form.type} onValueChange={(v) => handleFormChange('type', v)}>
                          <SelectTrigger className="h-14 bg-white rounded-2xl border-gray-100 font-bold group">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                            <SelectItem value="info" className="py-3 font-bold">إرشادية (Info)</SelectItem>
                            <SelectItem value="success" className="py-3 font-bold text-green-600">نجاح (Success)</SelectItem>
                            <SelectItem value="warning" className="py-3 font-bold text-yellow-600">تنبيه (Warning)</SelectItem>
                            <SelectItem value="error" className="py-3 font-bold text-red-600">خطأ (Error)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-gray-900 font-black text-sm uppercase tracking-wider">الأولوية</Label>
                        <Select value={form.priority} onValueChange={(v) => handleFormChange('priority', v)}>
                          <SelectTrigger className="h-14 bg-white rounded-2xl border-gray-100 font-bold group">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                            <SelectItem value="low" className="py-3 font-bold text-blue-500">منخفضة</SelectItem>
                            <SelectItem value="medium" className="py-3 font-bold text-gray-600">متوسطة</SelectItem>
                            <SelectItem value="high" className="py-3 font-bold text-orange-600">عالية</SelectItem>
                            <SelectItem value="critical" className="py-3 font-bold text-red-600">عاجلة جداً</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="targeting" className="mt-0 space-y-6">
                <Card className="border-none shadow-xl shadow-blue-900/5 bg-white/80 backdrop-blur-md rounded-3xl border border-white">
                  <CardHeader className="bg-gradient-to-r from-gray-50/50 to-white/50 border-b border-gray-100 p-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                        <Target className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-gray-900">إدارة الجمهور</CardTitle>
                        <CardDescription className="text-gray-500 font-medium font-medium">حدد بدقة الفئة المستهدفة لهذه الحملة</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <Label className="text-gray-900 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                          <MousePointer2 className="w-3.5 h-3.5 text-blue-500" />
                          إستراتيجية الاستهداف
                        </Label>
                        <Select value={form.targetType} onValueChange={(v) => handleFormChange('targetType', v)}>
                          <SelectTrigger className="h-14 bg-white rounded-2xl border-gray-100 font-bold group shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                            <SelectItem value="all" className="py-3 font-bold">كل مستخدمي المنصة الموثقين</SelectItem>
                            <SelectItem value="account_type" className="py-3 font-bold">استهداف فئات حسابات محددة</SelectItem>
                            <SelectItem value="specific" className="py-3 font-bold">اختيار يدوي لمستخدمين محددين</SelectItem>
                            <SelectItem value="custom_numbers" className="py-3 font-bold">قائمة أرقام خارجية (Batch)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-gray-900 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          نطاق التسجيل
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'all', label: 'الكل' },
                            { value: 'today', label: 'اليوم' },
                            { value: 'this_month', label: 'هذا الشهر' },
                            { value: 'range', label: 'مخصص' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setDateFilterType(opt.value as any)}
                              className={`h-11 font-black text-xs rounded-xl transition-all border ${dateFilterType === opt.value ? 'bg-gradient-to-r from-blue-700 to-indigo-700 border-none text-white shadow-xl shadow-blue-500/30' : 'bg-white/50 backdrop-blur-sm border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-600'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {dateFilterType === 'range' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/30 rounded-[1.5rem] border border-blue-100"
                        >
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-blue-500">من تاريخ</Label>
                            <Input
                              type="date"
                              value={dateStart}
                              onChange={(e) => setDateStart(e.target.value)}
                              className="h-12 bg-white rounded-xl border-blue-100 font-bold"
                            />
                          </div>
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-blue-500">إلى تاريخ</Label>
                            <Input
                              type="date"
                              value={dateEnd}
                              onChange={(e) => setDateEnd(e.target.value)}
                              className="h-12 bg-white rounded-xl border-blue-100 font-bold"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {form.targetType === 'account_type' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-gray-50/50 rounded-[2rem] border border-gray-100"
                      >
                        <Label className="mb-6 block font-black text-gray-900 text-sm flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-600" />
                          اختر نوع الحسابات المستهدفة
                        </Label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {['player', 'trainer', 'club', 'academy', 'agent', 'marketer', 'admin'].map((type) => (
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              key={type}
                              className={`flex items-center space-x-3 rtl:space-x-reverse bg-white p-4 rounded-2xl border transition-all cursor-pointer ${form.accountTypes.includes(type) ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-500' : 'border-gray-100 text-gray-600 hover:border-purple-200'}`}
                              onClick={() => handleAccountTypeChange(type, !form.accountTypes.includes(type))}
                            >
                              <Checkbox
                                id={`type-${type}`}
                                checked={form.accountTypes.includes(type)}
                                onCheckedChange={(checked) => handleAccountTypeChange(type, !!checked)}
                                className="border-gray-300 data-[state=checked]:bg-purple-600"
                              />
                              <label htmlFor={`type-${type}`} className="text-sm font-black cursor-pointer flex items-center gap-2 lowercase">
                                {getAccountTypeIcon(type)}
                                <span>{getAccountTypeLabel(type)}</span>
                              </label>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {form.targetType === 'specific' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="flex flex-col md:flex-row items-center gap-4">
                          <div className="relative flex-1 group w-full">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-blue-500 transition-colors" />
                            <Input
                              placeholder="ابحث عن مستخدم بالاسم، البريد، أو الرقم..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pr-12 h-14 rounded-2xl border-gray-100 bg-white font-bold group-hover:border-blue-200 transition-all"
                            />
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                            <Button
                              onClick={selectAllUsers}
                              variant="outline"
                              className="h-14 flex-1 md:w-48 rounded-2xl font-black text-xs border-gray-100 bg-white/50 backdrop-blur-sm hover:bg-blue-600 hover:text-white hover:border-none transition-all uppercase tracking-widest"
                            >
                              تحديد الكل ({filteredUsers.length})
                            </Button>
                            <Button
                              onClick={deselectAllUsers}
                              variant="outline"
                              className="h-14 rounded-2xl px-6 border-gray-100 bg-white/50 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                        <div className="border border-gray-100 rounded-3xl overflow-hidden max-h-[450px] overflow-y-auto bg-white/50 backdrop-blur-sm shadow-inner custom-scrollbar">
                          <div className="divide-y divide-gray-50">
                            {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                              <div key={u.id} className="p-5 flex items-center justify-between hover:bg-blue-50/50 transition-all group">
                                <div className="flex items-center gap-4">
                                  <Checkbox
                                    checked={form.selectedUsers.includes(u.id)}
                                    onCheckedChange={(c) => handleUserSelection(u.id, !!c)}
                                    className="h-5 w-5 rounded-lg border-gray-300"
                                  />
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      {u.avatar ? (
                                        <img src={u.avatar} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-sm" />
                                      ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gray-100 to-gray-50 flex items-center justify-center text-gray-400 font-black text-lg border border-gray-200">
                                          {u.displayName?.[0] || 'U'}
                                        </div>
                                      )}
                                      <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-lg shadow-sm">
                                        {getAccountTypeIcon(u.accountType)}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-black text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">{u.displayName || 'مستخدم غير معروف'}</p>
                                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{u.phone || u.email || 'بدون بيانات'}</p>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter bg-gray-100 text-gray-500 px-3 h-6 rounded-lg">{getAccountTypeLabel(u.accountType)}</Badge>
                              </div>
                            )) : (
                              <div className="py-20 text-center space-y-4">
                                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                  <Users className="w-8 h-8 text-gray-200" />
                                </div>
                                <p className="text-gray-400 font-bold">لم يتم العثور على مستخدمين يطابقون بحثك</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {form.targetType === 'custom_numbers' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <Label className="text-gray-900 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-orange-500" />
                          سجل الأرقام الدولية المستهدفة
                        </Label>
                        <Textarea
                          placeholder="أدخل الأرقام هنا، رقم في كل سطر...&#10;+966500000000&#10;+201000000000"
                          value={form.customNumbers}
                          onChange={(e) => handleFormChange('customNumbers', e.target.value)}
                          className="min-h-[250px] font-mono text-sm leading-loose p-8 rounded-[2rem] border-gray-100 bg-gray-50/50 resize-none focus:bg-white transition-all shadow-inner"
                        />
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                          <Info className="w-3.5 h-3.5" />
                          تنسيق E.164 مطلوب (يجب أن يبدأ بـ + ثم رمز الدولة)
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="methods" className="mt-0 space-y-6">
                <Card className="border-none shadow-xl shadow-blue-900/5 bg-white/80 backdrop-blur-md rounded-3xl border border-white">
                  <CardHeader className="bg-gradient-to-r from-gray-50/50 to-white/50 border-b border-gray-100 p-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                        <Monitor className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-gray-900">إستراتيجية الإرسال</CardTitle>
                        <CardDescription className="text-gray-500 font-medium font-medium">اختر القنوات المفضلة وجدولة العمليات</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-12">
                    <div className="space-y-6">
                      <Label className="text-gray-900 font-black text-sm uppercase tracking-wider block text-center mb-4">قنوات التواصل النشطة</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                          { key: 'inApp', icon: Bell, label: 'Push App', color: 'blue', desc: 'إشعار داخل التطبيق' },
                          { key: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', color: 'green', desc: 'رسالة فورية مشفرة' },
                          { key: 'sms', icon: Smartphone, label: 'SMS Box', color: 'orange', desc: 'رسالة نصية عالمية' }
                        ].map(method => (
                          <motion.div
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={method.key}
                            onClick={() => handleSendMethodChange(method.key as any, !form.sendMethods[method.key as keyof typeof form.sendMethods])}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer relative overflow-hidden group text-center ${form.sendMethods[method.key as keyof typeof form.sendMethods] ? `border-${method.color}-500 bg-${method.color}-50/50 shadow-2xl shadow-${method.color}-500/10` : 'border-gray-100 bg-white hover:border-gray-200'}`}
                          >
                            <div className={`p-5 rounded-3xl w-fit mx-auto mb-6 transition-all shadow-lg ${form.sendMethods[method.key as keyof typeof form.sendMethods] ? `bg-${method.color}-500 text-white shadow-${method.color}-500/20` : 'bg-gray-50 text-gray-400'}`}>
                              <method.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black mb-1 transition-colors group-hover:text-gray-900 tracking-tight">{method.label}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter opacity-80">{method.desc}</p>

                            {form.sendMethods[method.key as keyof typeof form.sendMethods] && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={`absolute top-4 left-4 p-1.5 bg-${method.color}-500 text-white rounded-full shadow-lg`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </motion.div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-12 border-t border-gray-100">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                          <Label className="text-gray-900 font-black text-lg">توقيت التنفيذ</Label>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">تحكم في لحظة وصول الرسائل لقاعدة عملائك</p>
                        </div>
                        <div className="bg-gray-100/50 p-1.5 rounded-2xl flex gap-1 border border-gray-100 w-fit">
                          <button
                            onClick={() => handleFormChange('scheduleType', 'immediate')}
                            className={`px-8 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest flex items-center gap-2 ${form.scheduleType === 'immediate' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            الآن
                          </button>
                          <button
                            onClick={() => handleFormChange('scheduleType', 'scheduled')}
                            className={`px-8 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest flex items-center gap-2 ${form.scheduleType === 'scheduled' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xl shadow-purple-500/20' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            جدولة
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {form.scheduleType === 'scheduled' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-gradient-to-tr from-purple-500/5 to-indigo-500/5 rounded-[2.5rem] border border-purple-100 shadow-inner"
                          >
                            <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase text-purple-600 tracking-widest flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                تاريخ العملية
                              </Label>
                              <Input
                                type="date"
                                value={form.scheduledDate}
                                onChange={(e) => handleFormChange('scheduledDate', e.target.value)}
                                className="h-16 rounded-2xl border-purple-100 focus:border-purple-300 font-black bg-white/70 shadow-sm"
                              />
                            </div>
                            <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase text-purple-600 tracking-widest flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                ساعة التنفيذ
                              </Label>
                              <Input
                                type="time"
                                value={form.scheduledTime}
                                onChange={(e) => handleFormChange('scheduledTime', e.target.value)}
                                className="h-16 rounded-2xl border-purple-100 focus:border-purple-300 font-black bg-white/70 shadow-sm"
                              />
                            </div>
                            <div className="col-span-full py-4 px-6 bg-white/50 rounded-2xl border border-white/80 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                              معلومة: سيتم تشغيل المهمة المجدولة تلقائياً في الوقوف المحدد بتوقيت خادم المنصة.
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            {/* Sidebar Simulation Control Center */}
            <div className="xl:col-span-4 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="sticky top-8 space-y-6"
              >
                {/* Simulation Panel Card */}
                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-900/90 backdrop-blur-3xl overflow-hidden border border-white/10 ring-1 ring-white/5">
                  <div className="p-8 border-b border-white/5 bg-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">محاكي البث المباشر</span>
                      </div>
                      <Monitor className="w-4 h-4 text-white/30" />
                    </div>

                    {/* Device Toggle - High End Buttons */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                      {[
                        { id: 'app', icon: Layout, label: 'App' },
                        { id: 'whatsapp', icon: MessageSquare, label: 'WA' },
                        { id: 'sms', icon: Smartphone, label: 'SMS' }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setPreviewMode(mode.id as any)}
                          className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all gap-1.5 ${previewMode === mode.id ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                        >
                          <mode.icon className="w-4 h-4" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-8">
                    {/* Simulator Stage */}
                    <div className="relative mx-auto w-full aspect-[9/16] max-w-[280px] bg-[#0A0A0B] rounded-[3rem] border-[8px] border-slate-800 shadow-3xl overflow-hidden ring-1 ring-white/20">
                      {/* Notch / Dynamic Island */}
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-50 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                      </div>

                      {/* Content Based on Preview Mode */}
                      <div className="absolute inset-0 bg-white">
                        {previewMode === 'app' ? (
                          <div className="h-full flex flex-col pt-12">
                            {/* App Status Bar */}
                            <div className="px-6 flex justify-between items-center mb-4">
                              <span className="text-[10px] font-bold">9:41</span>
                              <div className="flex gap-1">
                                <div className="w-3 h-3 bg-black rounded-sm" />
                                <div className="w-3 h-3 bg-black rounded-full" />
                              </div>
                            </div>

                            {/* Notification Body */}
                            <div className="p-4 space-y-4">
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs">A</div>
                                <div className="flex-1">
                                  <div className="h-2 w-16 bg-slate-200 rounded mb-1.5" />
                                  <div className="h-1.5 w-full bg-slate-100 rounded" />
                                </div>
                              </div>

                              <motion.div
                                key="app-preview"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="relative p-5 bg-white rounded-2xl border-2 border-blue-500 shadow-xl shadow-blue-500/10"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-700 text-white flex items-center justify-center shadow-lg">
                                    <Zap className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-900 truncate">{form.title || 'عنوان الإشعار'}</p>
                                    <Badge className={`text-[8px] h-4 mt-0.5 ${getPriorityColor(form.priority)}`}>{form.priority}</Badge>
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-6 font-medium">
                                  {form.message || 'اكتب محتواك هنا لرؤية المحاكاة...'}
                                </p>
                              </motion.div>
                            </div>
                          </div>
                        ) : previewMode === 'whatsapp' ? (
                          <div className="h-full bg-[#E5DDD5]">
                            <div className="h-16 bg-[#075E54] flex items-center gap-3 px-4 pt-4">
                              <div className="w-8 h-8 rounded-full bg-white/20" />
                              <div className="flex-1 h-3 bg-white/20 rounded" />
                            </div>
                            <div className="p-4 flex flex-col items-end gap-3">
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="max-w-[85%] bg-[#DCF8C6] p-3 rounded-xl rounded-tr-none shadow-sm relative"
                              >
                                {form.title && (
                                  <p className="text-[10px] font-black text-[#075E54] mb-1">*{form.title}*</p>
                                )}
                                <p className="text-[11px] text-slate-800 leading-snug whitespace-pre-wrap">
                                  {form.message || 'اكتب رسالة واتساب...'}
                                </p>
                                <div className="flex justify-end mt-1">
                                  <p className="text-[8px] text-slate-400">9:41 AM</p>
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full bg-slate-50 flex flex-col items-center pt-20 px-6">
                            <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                              <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-b border-slate-200 rotate-45" />
                              <p className="text-[11px] font-black text-blue-600 mb-1">Platform SMS</p>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {form.message || 'نص الرسالة القصيرة يظهر هنا...'}
                              </p>
                            </div>
                            <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">وصلت للتو • SMS</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Controls Sidebar Footer */}
                  <div className="p-8 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">الجمهور المستهدف</p>
                        <p className="text-xl font-black text-white">{targetUsers.length}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">تحذير الأولوية</p>
                        <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg inline-block ${getPriorityColor(form.priority)}`}>
                          {form.priority}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      onClick={sendNotification}
                      disabled={loading || !form.title || !form.message || targetUsers.length === 0}
                      className="w-full h-16 rounded-[1.5rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white font-black shadow-3xl shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-30 border-t border-white/20 group"
                    >
                      {loading ? (
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                          <span className="animate-pulse tracking-widest uppercase text-xs">تجهيز الإرسال...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          <span className="text-lg">بدء العملية لـ {targetUsers.length}</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* System Navigation Hub */}
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/dashboard/admin/notification-center" className="block group">
                    <div className="p-5 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:bg-slate-900 hover:border-slate-900 transition-all duration-500">
                      <Clock className="w-6 h-6 text-blue-600 mb-3 group-hover:text-blue-400 transition-colors" />
                      <h4 className="font-black text-slate-900 text-xs mb-1 group-hover:text-white transition-colors">السجل التاريخي</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight group-hover:text-slate-500 transition-colors">آخر 30 حملة إرسال</p>
                    </div>
                  </Link>
                  <Link href="/dashboard/admin/message-management" className="block group">
                    <div className="p-5 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:bg-slate-900 hover:border-slate-900 transition-all duration-500">
                      <TrendingUp className="w-6 h-6 text-emerald-600 mb-3 group-hover:text-emerald-400 transition-colors" />
                      <h4 className="font-black text-slate-900 text-xs mb-1 group-hover:text-white transition-colors">تحليل التفاعل</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight group-hover:text-slate-500 transition-colors">نسبة المشاهدة والفتح</p>
                    </div>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </Tabs>
      </div>
      {/* WhatsApp Direct Message Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-2xl border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden">
          <div className="bg-gradient-to-tr from-green-600 to-emerald-600 p-8 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" />
            <DialogHeader className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">واتساب مباشر</DialogTitle>
              <DialogDescription className="text-green-50 font-medium">إرسال سريع لقاعدة البيانات أو الأرقام الخارجية</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">رقم الهاتف المستهدف</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="التنسيق العالمي: 966500000000"
                className="h-14 rounded-2xl border-gray-100 font-bold focus:ring-green-500/10 focus:border-green-500"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">عنوان التنبيه</Label>
              <Input
                id="title"
                value={whatsappMessage.title}
                onChange={(e) => setWhatsappMessage(prev => ({ ...prev, title: e.target.value }))}
                placeholder="أدخل عنواناً للمحادثة"
                className="h-14 rounded-2xl border-gray-100 font-bold focus:ring-green-500/10 focus:border-green-500"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">محتوى النص</Label>
              <Textarea
                id="body"
                value={whatsappMessage.body}
                onChange={(e) => setWhatsappMessage(prev => ({ ...prev, body: e.target.value }))}
                placeholder="اكتب رسالتك الذكية هنا..."
                className="min-h-[120px] rounded-2xl border-gray-100 font-bold focus:ring-green-500/10 focus:border-green-500 resize-none p-4"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowWhatsAppDialog(false)}
                className="h-14 rounded-2xl flex-1 font-black text-gray-400 hover:bg-gray-50 uppercase tracking-widest text-xs"
              >
                إلغاء العملية
              </Button>
              <Button
                onClick={sendWhatsAppMessage}
                disabled={sendingWhatsApp || !phoneNumber || !whatsappMessage.body}
                className="h-14 rounded-2xl px-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black shadow-2xl shadow-green-900/20 border-t border-white/20 flex-[2] transition-all transform active:scale-95"
              >
                {sendingWhatsApp ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    <span className="tracking-widest">إرسال...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 ml-2" />
                    <span>إرسال الآن</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
