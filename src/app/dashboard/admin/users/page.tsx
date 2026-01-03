'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { countries, detectCountryFromPhone, validatePhoneWithCountry } from '@/lib/constants/countries';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, query, limit, orderBy, where } from 'firebase/firestore';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit,
  Eye,
  Filter,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  MessageSquare,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  UserX,
  XCircle
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  countryCode?: string; // كود البلد من صفحة التسجيل (مثل +966, +20)
  accountType: 'user' | 'player' | 'club' | 'academy' | 'agent' | 'trainer';
  isActive: boolean;
  createdAt: Date | null;
  lastLogin: Date | null;
  city: string;
  country: string;
  parentAccountId: string;
  parentAccountType: string;
  parentOrganizationName: string;
  registrationType: 'direct' | 'organization' | 'unknown';
  isDeleted: boolean;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  profileCompletion: number;
  profileCompleted: boolean;
  suspendReason?: string;
  suspendedAt?: Date;
}

interface VisitStats {
  total: number;
  byCountry: { [key: string]: number };
  byCity: { [key: string]: number };
  byDate: { [key: string]: number };
  byPage: { [key: string]: number };
  last7Days: Array<{
    date: string;
    count: number;
    dayName: string;
  }>;
  last30Days: Array<{
    date: string;
    count: number;
    dayName: string;
  }>;
  lastYear: Array<{
    month: string;
    count: number;
    monthName: string;
  }>;
  recentVisits: Array<{
    country: string;
    city: string;
    timestamp: Date;
    userId?: string;
    page?: string;
  }>;
}

export default function AdminUsersPage() {
  const { user, userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVerification, setFilterVerification] = useState<string>('all');
  const [filterProfileCompletion, setFilterProfileCompletion] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterOrganization, setFilterOrganization] = useState<string>('all');
  const [filterRegistrationType, setFilterRegistrationType] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [organizationsCache, setOrganizationsCache] = useState<{ [key: string]: string }>({});
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [chartTimeRange, setChartTimeRange] = useState<'7days' | '30days' | 'year'>('7days');
  const [visitStats, setVisitStats] = useState<VisitStats>({
    total: 0,
    byCountry: {},
    byCity: {},
    byDate: {},
    byPage: {},
    last7Days: [],
    last30Days: [],
    lastYear: [],
    recentVisits: []
  });
  const [showVisitDetails, setShowVisitDetails] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'deleted'>('active');
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [showQuickMessageDialog, setShowQuickMessageDialog] = useState(false);
  const [quickMessage, setQuickMessage] = useState({ title: '', body: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [instanceId, setInstanceId] = useState('68F243B3A8D8D');
  const [isRepairing, setIsRepairing] = useState(false);
  const [healthScore, setHealthScore] = useState(0);

  // New states for account management
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showChangeTypeDialog, setShowChangeTypeDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [newAccountType, setNewAccountType] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  const handleRequestUpdate = async (userId: string) => {
    try {
      if (!window.confirm('هل أنت متأكد من طلب تحديث بيانات هذا المستخدم؟ سيتم إظهار نافذة تحديث البيانات له عند دخوله.')) return;

      const user = users.find(u => u.id === userId);
      if (!user) return;

      const collectionName = user.accountType === 'user' ? 'users' : `${user.accountType || 'player'}s`;

      // Update in specific collection
      await setDoc(doc(db, collectionName, userId), { profileUpdateRequested: true }, { merge: true });

      // Update in users collection as well to be safe
      if (collectionName !== 'users') {
        await setDoc(doc(db, 'users', userId), { profileUpdateRequested: true }, { merge: true });
      }

      toast.success('تم إرسال طلب تحديث البيانات بنجاح');
    } catch (error) {
      console.error('Error requesting update:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    }
  };

  // دالة للتحقق من صحة أرقام الهواتف
  const validateUserPhone = (user: User) => {
    if (!user.phone || !user.countryCode) {
      return { isValid: false, error: 'رقم الهاتف أو كود البلد غير موجود' };
    }

    return validatePhoneWithCountry(user.phone, user.countryCode);
  };

  // دالة لتحديد البلد من رقم الهاتف إذا لم يكن موجوداً
  const detectUserCountry = (user: User) => {
    if (user.countryCode) return user.countryCode;

    const detectedCountry = detectCountryFromPhone(user.phone);
    return detectedCountry?.code || '';
  };

  // دالة لإصلاح رقم الهاتف
  const fixUserPhone = (user: User) => {
    const countryCode = detectUserCountry(user);
    if (!countryCode) return user.phone;

    // تطبيع الرقم
    let local = user.phone.replace(/^0+/, '').replace(/\D/g, '');
    return `${countryCode.replace(/\D/g, '')}${local}`;
  };

  // نماذج رسائل جاهزة
  const messageTemplates = [
    {
      id: 'welcome',
      name: '👋 رسالة ترحيبية',
      title: 'مرحباً بك في منصة الحلم!',
      body: 'عزيزي {name}، نرحب بك في منصة الحلم الرياضية. نتمنى لك تجربة ممتعة ومفيدة. إذا كان لديك أي استفسار، لا تتردد في التواصل معنا.',
      icon: '👋',
      color: 'bg-blue-50 border-blue-300 hover:bg-blue-100'
    },
    {
      id: 'complete_profile',
      name: '📝 إكمال الملف الشخصي',
      title: 'يرجى إكمال ملفك الشخصي',
      body: 'مرحباً {name}، لاحظنا أن ملفك الشخصي غير مكتمل ({completion}%). نرجو منك إكمال جميع البيانات المطلوبة لتتمكن من الاستفادة من جميع خدمات المنصة.',
      icon: '📝',
      color: 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
    },
    {
      id: 'verification',
      name: '✅ طلب التوثيق',
      title: 'توثيق حسابك مطلوب',
      body: 'عزيزي {name}، لزيادة مصداقية حسابك وفتح المزيد من الفرص، نرجو منك إكمال عملية توثيق الحساب من خلال رفع المستندات المطلوبة.',
      icon: '✅',
      color: 'bg-green-50 border-green-300 hover:bg-green-100'
    },
    {
      id: 'update',
      name: '🔔 تحديث مهم',
      title: 'تحديث جديد في المنصة',
      body: 'مرحباً {name}، يسعدنا إخبارك بأننا أطلقنا تحديثاً جديداً يتضمن ميزات رائعة. ندعوك لاستكشافها والاستفادة منها.',
      icon: '🔔',
      color: 'bg-purple-50 border-purple-300 hover:bg-purple-100'
    },
    {
      id: 'payment_reminder',
      name: '💳 تذكير بالدفع',
      title: 'تذكير: الاشتراك قارب على الانتهاء',
      body: 'عزيزي {name}، نود تذكيرك بأن اشتراكك الحالي سينتهي قريباً. للاستمرار في الاستفادة من خدماتنا، يرجى تجديد الاشتراك.',
      icon: '💳',
      color: 'bg-orange-50 border-orange-300 hover:bg-orange-100'
    },
    {
      id: 'warning',
      name: '⚠️ تنبيه هام',
      title: 'تنبيه: يرجى الانتباه',
      body: 'مرحباً {name}، لاحظنا بعض المخالفات في حسابك. يرجى مراجعة سياسة الاستخدام والالتزام بها لتجنب تعليق الحساب.',
      icon: '⚠️',
      color: 'bg-red-50 border-red-300 hover:bg-red-100'
    },
    {
      id: 'support',
      name: '💬 دعم فني',
      title: 'رد على استفسارك',
      body: 'مرحباً {name}، شكراً لتواصلك معنا. بخصوص استفسارك، نود إفادتك بأن فريق الدعم الفني يعمل على حل المشكلة وسيتم الرد عليك قريباً.',
      icon: '💬',
      color: 'bg-indigo-50 border-indigo-300 hover:bg-indigo-100'
    },
    {
      id: 'opportunity',
      name: '⭐ فرصة جديدة',
      title: 'فرصة رائعة لك!',
      body: 'عزيزي {name}، لدينا فرصة رائعة قد تكون مناسبة لك. ندعوك لمراجعة التفاصيل والتواصل معنا إذا كنت مهتماً.',
      icon: '⭐',
      color: 'bg-pink-50 border-pink-300 hover:bg-pink-100'
    },
    {
      id: 'custom',
      name: '✏️ رسالة مخصصة',
      title: '',
      body: '',
      icon: '✏️',
      color: 'bg-gray-50 border-gray-300 hover:bg-gray-100'
    }
  ];

  const applyTemplate = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);

    if (templateId === 'custom') {
      setQuickMessage({ title: '', body: '' });
      return;
    }

    // استبدال المتغيرات
    let title = template.title;
    let body = template.body;

    if (selectedUserDetails) {
      title = title.replace('{name}', selectedUserDetails.name);
      body = body.replace('{name}', selectedUserDetails.name);
      body = body.replace('{completion}', selectedUserDetails.profileCompletion.toString());
      body = body.replace('{email}', selectedUserDetails.email || 'غير محدد');
      body = body.replace('{phone}', selectedUserDetails.phone || 'غير محدد');
    }

    setQuickMessage({ title, body });
  };

  // دالة لحساب نسبة اكتمال الملف الشخصي
  const calculateProfileCompletion = (data: any, accountType: string): number => {
    if (!data) return 0;

    try {
      const basicFields = ['name', 'full_name', 'email', 'phone', 'country', 'city'];
      let requiredFields: string[] = [...basicFields];

      switch (accountType) {
        case 'player':
          requiredFields = [
            'full_name', 'name',
            'birth_date',
            'nationality',
            'email',
            'phone',
            'country',
            'city',
            'primary_position',
            'preferred_foot',
            'height',
            'weight',
            'profile_image_url', 'profile_image'
          ];
          break;
        case 'academy':
          requiredFields = [
            'academy_name',
            'email',
            'phone',
            'country',
            'city',
            'description',
            'address',
            'logo'
          ];
          break;
        case 'club':
          requiredFields = [
            'club_name',
            'email',
            'phone',
            'country',
            'city',
            'description',
            'address',
            'logo'
          ];
          break;
        case 'agent':
          requiredFields = [
            'agent_name',
            'email',
            'phone',
            'country',
            'city',
            'description',
            'profile_image'
          ];
          break;
        case 'trainer':
          requiredFields = [
            'trainer_name',
            'email',
            'phone',
            'country',
            'city',
            'specialization',
            'profile_image'
          ];
          break;
      }

      const fieldWeight = 100 / requiredFields.length;
      let completedWeight = 0;

      requiredFields.forEach(field => {
        try {
          const value = data[field] || data[field.replace('_', '')] || data[field.replace(/_/g, '')];
          if (value && value !== '' && value !== null && value !== undefined) {
            if (typeof value === 'object' && !Array.isArray(value)) {
              if (Object.keys(value).length > 0) {
                completedWeight += fieldWeight;
              }
            } else if (Array.isArray(value)) {
              if (value.length > 0) {
                completedWeight += fieldWeight;
              }
            } else {
              completedWeight += fieldWeight;
            }
          }
        } catch (fieldError) {
          // تجاهل الأخطاء في الحقول الفردية
        }
      });

      return Math.round(completedWeight);
    } catch (error) {
      return 0;
    }
  };

  // دالة مساعدة لتحويل التواريخ بشكل آمن
  const safeToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;

    try {
      if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
      }
      if (dateValue instanceof Date) {
        return dateValue;
      }
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
      }
      if (typeof dateValue === 'number') {
        return new Date(dateValue);
      }
      if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
        return new Date(dateValue.seconds * 1000);
      }
    } catch (e) {
      return null;
    }

    return null;
  };

  // Load visit statistics
  const loadVisitStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats: VisitStats = {
        total: 0,
        byCountry: {},
        byCity: {},
        byDate: {},
        byPage: {},
        last7Days: [],
        last30Days: [],
        lastYear: [],
        recentVisits: []
      };

      // تحضير آخر 7 أيام
      const last7DaysData: { [key: string]: { count: number; dayName: string } } = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString('en-GB');
        const dayName = date.toLocaleDateString('ar-SA', { weekday: 'long' });
        last7DaysData[dateKey] = { count: 0, dayName };
      }

      // تحضير آخر 30 يوم
      const last30DaysData: { [key: string]: { count: number; dayName: string } } = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString('en-GB');
        // يوم/شهر لـ 30 يوم
        const dayName = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' });
        last30DaysData[dateKey] = { count: 0, dayName };
      }

      // تحضير آخر سنة (12 شهر)
      const lastYearData: { [key: string]: { count: number; monthName: string } } = {};
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        date.setDate(1); // لضمان ثبات الشهر
        const monthKey = date.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' });
        const monthName = date.toLocaleDateString('ar-SA', { month: 'long' });
        lastYearData[monthKey] = { count: 0, monthName };
      }

      const processDoc = (doc: any) => {
        const data = doc.data();
        const date = safeToDate(data.timestamp || data.date);

        if (date) {
          const dateKey = date.toLocaleDateString('en-GB');
          const monthKey = date.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' });

          stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

          if (last7DaysData[dateKey]) last7DaysData[dateKey].count++;
          if (last30DaysData[dateKey]) last30DaysData[dateKey].count++;
          if (lastYearData[monthKey]) lastYearData[monthKey].count++;

          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (date >= sevenDaysAgo) {
            stats.recentVisits.push({
              country: data.country || 'غير محدد',
              city: data.city || 'غير محدد',
              timestamp: date,
              userId: data.userId,
              page: data.route || data.page || '/'
            });
          }
        }

        if (data.country) stats.byCountry[data.country] = (stats.byCountry[data.country] || 0) + 1;
        if (data.city) stats.byCity[data.city] = (stats.byCity[data.city] || 0) + 1;
        if (data.route || data.page) {
          const page = data.route || data.page;
          stats.byPage[page] = (stats.byPage[page] || 0) + 1;
        }

        stats.total++;
      };

      // استخدام الكويري الذكي لجلب آخر 500 سجل فقط من الإحصائيات (كافي للوحة التحكم)

      try {
        const analyticsRef = collection(db, 'analytics');
        const qAnalytics = query(analyticsRef, orderBy('timestamp', 'desc'), limit(500));
        const analyticsSnapshot = await getDocs(qAnalytics);
        analyticsSnapshot.forEach(processDoc);
      } catch (error) {
        console.log('محاولة جلب من مجموعة visits...');
      }

      try {
        const visitsRef = collection(db, 'visits');
        const qVisits = query(visitsRef, orderBy('timestamp', 'desc'), limit(500));
        const visitsSnapshot = await getDocs(qVisits);
        visitsSnapshot.forEach(processDoc);
      } catch (error) {
        console.error('خطأ في جلب الزيارات:', error);
      }

      // تحويل البيانات إلى مصفوفات
      stats.last7Days = Object.entries(last7DaysData).map(([date, data]) => ({
        date, count: data.count, dayName: data.dayName
      }));

      stats.last30Days = Object.entries(last30DaysData).map(([date, data]) => ({
        date, count: data.count, dayName: data.dayName
      }));

      stats.lastYear = Object.entries(lastYearData).map(([month, data]) => ({
        month, count: data.count, monthName: data.monthName
      }));

      stats.recentVisits.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      stats.recentVisits = stats.recentVisits.slice(0, 20); // Keep top 20 recent, though we only show 5

      setVisitStats(stats);
    } catch (error) {
      console.error('خطأ في تحميل إحصائيات الزيارات:', error);
    }
  };

  // دالة لجلب اسم المنظمة من cache أو من قاعدة البيانات - محسنة بشكل "ذكي"
  const getOrganizationName = async (parentId: string, parentType: string): Promise<string> => {
    if (!parentId || !parentType) return '';

    const cacheKey = `${parentType}_${parentId}`;
    if (organizationsCache[cacheKey]) {
      return organizationsCache[cacheKey];
    }

    try {
      const collectionName = parentType === 'user' ? 'users' : `${parentType}s`;
      const orgDocRef = doc(db, collectionName, parentId);
      const orgSnap = await getDoc(orgDocRef);

      if (orgSnap.exists()) {
        const data = orgSnap.data();
        const orgName = data.name || data.full_name || data.club_name || data.academy_name || data.agent_name || data.trainer_name || '';

        setOrganizationsCache(prev => ({
          ...prev,
          [cacheKey]: orgName
        }));

        return orgName;
      }
    } catch (error) {
      console.error('خطأ في جلب اسم المنظمة:', error);
    }

    return '';
  };

  // Account Management Functions
  const handleSuspendAccount = async () => {
    if (!selectedUserDetails || !suspendReason.trim()) {
      toast.error('يرجى إدخال سبب الإيقاف');
      return;
    }

    try {
      setActionLoading(true);

      // Determine collection name based on account type
      const collectionName = selectedUserDetails.accountType === 'user' ? 'users' :
        selectedUserDetails.accountType + 's';

      await updateDoc(doc(db, collectionName, selectedUserDetails.id), {
        isActive: false,
        suspendedAt: new Date(),
        suspendReason: suspendReason,
        suspendedBy: user?.uid || 'admin'
      });

      // Update local state
      setUsers(prevUsers => prevUsers.map(u =>
        u.id === selectedUserDetails.id
          ? { ...u, isActive: false }
          : u
      ));

      toast.success('تم إيقاف الحساب مؤقتاً');
      setShowSuspendDialog(false);
      setSuspendReason('');
      setShowUserDetailsDialog(false);
    } catch (error) {
      console.error('Error suspending account:', error);
      toast.error('حدث خطأ في إيقاف الحساب');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateAccount = async () => {
    if (!selectedUserDetails) return;

    try {
      setActionLoading(true);

      const collectionName = selectedUserDetails.accountType === 'user' ? 'users' :
        selectedUserDetails.accountType + 's';

      await updateDoc(doc(db, collectionName, selectedUserDetails.id), {
        isActive: true,
        reactivatedAt: new Date(),
        reactivatedBy: user?.uid || 'admin'
      });

      setUsers(prevUsers => prevUsers.map(u =>
        u.id === selectedUserDetails.id
          ? { ...u, isActive: true }
          : u
      ));

      toast.success('تم تفعيل الحساب بنجاح');
      setShowActivateDialog(false);
      setShowUserDetailsDialog(false);
    } catch (error) {
      console.error('Error activating account:', error);
      toast.error('حدث خطأ في تفعيل الحساب');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedUserDetails) return;

    try {
      setActionLoading(true);
      const userEmail = selectedUserDetails.email?.toLowerCase().trim();
      const userId = selectedUserDetails.id;
      const allCollections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

      if (isPermanentDelete) {
        // حذف نهائي شامل (Deep Hard Delete)
        const deleteOperations: Promise<any>[] = [];

        // 1. الحذف المباشر بالـ ID من جميع المجموعات
        allCollections.forEach(coll => {
          deleteOperations.push(deleteDoc(doc(db, coll, userId)).catch(() => { }));
        });

        // 2. إذا كان هناك بريد، نبحث عن أي حسابات مكررة بنفس البريد ونحذفها أيضاً
        if (userEmail) {
          for (const collName of allCollections) {
            try {
              const q = query(collection(db, collName), where('email', '==', userEmail));
              const snap = await getDocs(q);
              snap.forEach(d => {
                deleteOperations.push(deleteDoc(doc(db, collName, d.id)).catch(() => { }));
              });
            } catch (e) { /* skip failures in specific sub-collections */ }
          }
        }

        await Promise.all(deleteOperations);

        // تحديث الواجهة فوراً ومسح أي أثر لهذا البريد
        setUsers(prev => prev.filter(u => u.id !== userId && (u.email?.toLowerCase().trim() !== userEmail || !userEmail)));
        toast.success(`تم تطهير قاعدة البيانات من الحساب (${userEmail}) وجميع تكراراته`);
      } else {
        // حذف ناعم (Soft Delete)
        const deletePayload = {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
          deletedBy: user?.uid || 'admin'
        };

        const updatePromises = allCollections.map(async (coll) => {
          try {
            const docRef = doc(db, coll, userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              await updateDoc(docRef, deletePayload);
            }
          } catch (e) { }
        });

        await Promise.all(updatePromises);

        setUsers(prev => prev.map(u =>
          (u.id === userId || (userEmail && u.email?.toLowerCase().trim() === userEmail))
            ? { ...u, isDeleted: true, isActive: false }
            : u
        ));

        toast.success('تم نقل الحساب وتوابعه إلى سلة المهملات');
      }

      setShowDeleteDialog(false);
      setIsPermanentDelete(false);
      setShowUserDetailsDialog(false);
    } catch (error) {
      console.error('Critical Deletion Error:', error);
      toast.error('حدث خطأ فني أثناء محاولة التطهير الشامل للبيانات');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeAccountType = async () => {
    if (!selectedUserDetails || !newAccountType) {
      toast.error('يرجى اختيار نوع الحساب الجديد');
      return;
    }

    try {
      setActionLoading(true);

      const oldCollectionName = selectedUserDetails.accountType === 'user' ? 'users' :
        selectedUserDetails.accountType + 's';
      const newCollectionName = newAccountType === 'user' ? 'users' : newAccountType + 's';

      // Update in current collection
      await updateDoc(doc(db, oldCollectionName, selectedUserDetails.id), {
        accountType: newAccountType,
        accountTypeChangedAt: new Date(),
        accountTypeChangedBy: user?.uid || 'admin',
        previousAccountType: selectedUserDetails.accountType
      });

      setUsers(prevUsers => prevUsers.map(u =>
        u.id === selectedUserDetails.id
          ? { ...u, accountType: newAccountType as any }
          : u
      ));

      toast.success('تم تغيير نوع الحساب بنجاح');
      setShowChangeTypeDialog(false);
      setNewAccountType('');
      setShowUserDetailsDialog(false);
    } catch (error) {
      console.error('Error changing account type:', error);
      toast.error('حدث خطأ في تغيير نوع الحساب');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAccount = async (userId: string) => {
    try {
      const userToVerify = users.find(u => u.id === userId);
      if (!userToVerify) return;

      const collectionName = userToVerify.accountType === 'user' ? 'users' :
        userToVerify.accountType + 's';

      await updateDoc(doc(db, collectionName, userId), {
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verifiedBy: user?.uid || 'admin'
      });

      setUsers(prevUsers => prevUsers.map(u =>
        u.id === userId
          ? { ...u, verificationStatus: 'verified' as const }
          : u
      ));

      toast.success('تم التحقق من الحساب بنجاح');
    } catch (error) {
      console.error('Error verifying account:', error);
      toast.error('حدث خطأ في التحقق من الحساب');
    }
  };

  const handleRejectAccount = async (userId: string) => {
    try {
      const userToReject = users.find(u => u.id === userId);
      if (!userToReject) return;

      const collectionName = userToReject.accountType === 'user' ? 'users' :
        userToReject.accountType + 's';

      await updateDoc(doc(db, collectionName, userId), {
        verificationStatus: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: user?.uid || 'admin'
      });

      setUsers(prevUsers => prevUsers.map(u =>
        u.id === userId
          ? { ...u, verificationStatus: 'rejected' as const }
          : u
      ));

      toast.success('تم رفض الحساب');
    } catch (error) {
      console.error('Error rejecting account:', error);
      toast.error('حدث خطأ في رفض الحساب');
    }
  };

  // Load users data - Optimized & Smarter Loading
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        console.log('🔄 بدء تحميل بيانات المستخدمين (نسخة ذكية)...');

        const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents'];
        const allUsers: User[] = [];
        let totalProcessed = 0;

        // أولاً، جلب جميع المنظمات للـ cache بشكل سريع (Clubs & Academies only)
        // لا نحتاج لتحميل كل شيء هنا، بل فقط المنظمات الأساسية
        const orgsCache: { [key: string]: string } = {};
        const orgCollections = ['clubs', 'academies'];

        await Promise.all(orgCollections.map(async (collectionName) => {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            snapshot.forEach(doc => {
              const data = doc.data();
              const orgName = data.name || data.full_name || data.club_name || data.academy_name || '';
              orgsCache[`${collectionName.replace(/s$/, '')}_${doc.id}`] = orgName;
            });
          } catch (e) {
            console.warn(`Could not pre-cache ${collectionName}`);
          }
        }));

        setOrganizationsCache(prev => ({ ...prev, ...orgsCache }));

        // جلب المستخدمين بالتوازي لتسريع العملية
        const fetchPromises = collections.map(async (collectionName) => {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            const collectionUsers: User[] = [];

            snapshot.forEach((userDoc) => {
              try {
                const data = userDoc.data();
                const accountType = (data.accountType || collectionName.replace(/s$/, '')) as any;

                let createdAtDate = safeToDate(
                  data.createdAt || data.created_at || data.registrationDate || data.timestamp
                );

                if (!createdAtDate && (userDoc.metadata as any)?.createTime) {
                  createdAtDate = (userDoc.metadata as any).createTime.toDate();
                }

                const profileCompletion = calculateProfileCompletion(data, accountType);
                const parentId = data.parentAccountId || data.parent_account_id || data.clubId || data.academyId || '';
                const parentType = data.parentAccountType || (data.clubId ? 'club' : data.academyId ? 'academy' : '');
                const parentOrgName = parentId && parentType ? (orgsCache[`${parentType}_${parentId}`] || '') : '';

                collectionUsers.push({
                  id: userDoc.id,
                  name: data.name || data.full_name || data.displayName || 'غير محدد',
                  email: data.email || '',
                  phone: data.phone || data.phoneNumber || '',
                  whatsapp: data.whatsapp || '',
                  countryCode: data.countryCode || '',
                  accountType: accountType,
                  isActive: data.isActive !== false,
                  createdAt: createdAtDate,
                  lastLogin: safeToDate(data.lastLogin || data.lastAccessTime),
                  city: data.city || '',
                  country: data.country || '',
                  parentAccountId: parentId,
                  parentAccountType: parentType,
                  parentOrganizationName: parentOrgName,
                  registrationType: parentId ? 'organization' : 'direct',
                  isDeleted: data.isDeleted || false,
                  verificationStatus: data.verificationStatus || 'pending',
                  profileCompletion: profileCompletion,
                  profileCompleted: profileCompletion >= 80,
                  suspendReason: data.suspendReason,
                  suspendedAt: safeToDate(data.suspendedAt)
                });
              } catch (e) { /* skip individual errors */ }
            });
            return collectionUsers;
          } catch (e) {
            console.error(`Error loading ${collectionName}:`, e);
            return [];
          }
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(uList => allUsers.push(...uList));

        // إزالة التكرارات بذكاء (الاعتماد على البريد الإلكتروني كمفتاح أساسي للتوحيد)
        const uniqueUsersMap = new Map<string, User>();
        allUsers.forEach(user => {
          // استخدام البريد الإلكتروني كمفتاح للتوحيد إذا وجد، وإلا نستخدم الـ ID
          const identifier = user.email ? user.email.toLowerCase().trim() : user.id;
          const existing = uniqueUsersMap.get(identifier);

          // نفضل الاحتفاظ بالنسخة التي تمتلك تفاصيل أكثر (profileCompletion أعلى)
          if (!existing || (user.profileCompletion > existing.profileCompletion)) {
            uniqueUsersMap.set(identifier, user);
          }
        });

        const uniqueUsers = Array.from(uniqueUsersMap.values());
        setUsers(uniqueUsers);
        calculateHealth(uniqueUsers);
        setLoading(false);

        // جلب الإحصائيات في الخلفية دون تعطيل الجدول
        console.log('📈 جاري تحميل الإحصائيات في الخلفية...');
        loadVisitStats();

      } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        toast.error('حدث خطأ في تحميل البيانات');
        setLoading(false);
      }
    };

    if (user && userData?.accountType === 'admin') {
      loadUsers();
    }
  }, [user, userData]);

  // Filter users by tab
  const getUsersByTab = () => {
    switch (activeTab) {
      case 'active':
        return users.filter(u => u.isActive && !u.isDeleted);
      case 'inactive':
        return users.filter(u => !u.isActive && !u.isDeleted);
      case 'deleted':
        return users.filter(u => u.isDeleted);
      default:
        return users;
    }
  };

  // حساب نقاط جودة البيانات (Health Score) بشكل ذكي
  const calculateHealth = (allUsers: User[]) => {
    if (allUsers.length === 0) return 0;

    let totalScore = 0;
    allUsers.forEach(u => {
      let userScore = 0;
      if (u.createdAt) userScore += 25;
      if (u.country && u.country !== 'غير محدد') userScore += 25;
      if (u.phone && u.phone.length > 8) userScore += 25;
      if (u.profileCompletion >= 80) userScore += 25;
      totalScore += userScore;
    });

    const averageHealth = Math.round(totalScore / allUsers.length);
    setHealthScore(averageHealth);
  };

  // ذكاء اصطناعي لتنظيف وتحسين البيانات - Smart Repair
  const handleSmartRepair = async () => {
    const problematicUsers = users.filter(u =>
      !u.createdAt ||
      !u.country ||
      (!u.countryCode && u.phone) ||
      (u.phone && u.phone.length < 8)
    );

    if (problematicUsers.length === 0) {
      toast.info('البيانات تبدو نظيفة تماماً!');
      return;
    }

    if (!window.confirm(`هل تريد البدء في إصلاح وتحسين بيانات ${problematicUsers.length} مستخدم؟ سيتم استنتاج التواريخ والدول من بيانات النشاط وأرقام الهواتف.`)) return;

    setIsRepairing(true);
    let repairedCount = 0;

    try {
      // تنفيذ الإصلاح على دفعات (Batches) لتجنب هبوط المتصفح
      for (let i = 0; i < problematicUsers.length; i += 5) {
        const batch = problematicUsers.slice(i, i + 5);
        await Promise.all(batch.map(async (u) => {
          const updates: any = {};

          // 1. استنتاج الدولة من الهاتف
          if (!u.countryCode || !u.country) {
            const detected = detectCountryFromPhone(u.phone);
            if (detected) {
              updates.countryCode = detected.code;
              if (!u.country) updates.country = detected.name;
            }
          }

          // 2. محاولة جلب تاريخ من metadata إذا كان مفقوداً
          if (!u.createdAt) {
            const docSnap = await getDoc(doc(db, u.accountType === 'user' ? 'users' : u.accountType + 's', u.id));
            if (docSnap.exists() && (docSnap.metadata as any).createTime) {
              updates.createdAt = (docSnap.metadata as any).createTime;
            }
          }

          if (Object.keys(updates).length > 0) {
            const collectionName = u.accountType === 'user' ? 'users' : u.accountType + 's';
            await updateDoc(doc(db, collectionName, u.id), updates);
            repairedCount++;
          }
        }));
      }
      toast.success(`تم بنجاح تحسين بيانات ${repairedCount} مستخدم`);
      // إعادة التحميل لتحديث الواجهة
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء عملية الإصلاح');
    } finally {
      setIsRepairing(false);
    }
  };

  // تحسين الأداء (Memoization) لعمليات الفلترة لتقليل الـ INP
  const filteredAndSortedUsers = React.useMemo(() => {
    return getUsersByTab().filter(user => {
      const matchesSearch = searchTerm === '' ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm);

      const matchesType = filterType === 'all' || user.accountType === filterType;
      const matchesVerification = filterVerification === 'all' || user.verificationStatus === filterVerification;
      const matchesCountry = filterCountry === 'all' || user.country === filterCountry;
      const matchesCity = filterCity === 'all' || user.city === filterCity;
      const matchesOrganization = filterOrganization === 'all' ||
        (filterOrganization === 'direct' && !user.parentAccountId) ||
        (filterOrganization === 'organization' && user.parentAccountId) ||
        (user.parentOrganizationName && user.parentOrganizationName.toLowerCase().includes(filterOrganization.toLowerCase()));
      const matchesRegistrationType = filterRegistrationType === 'all' || user.registrationType === filterRegistrationType;

      const matchesProfileCompletion = (() => {
        if (filterProfileCompletion === 'all') return true;
        if (filterProfileCompletion === 'complete') return user.profileCompletion >= 80;
        if (filterProfileCompletion === 'incomplete') return user.profileCompletion < 80;
        if (filterProfileCompletion === 'partial') return user.profileCompletion >= 50 && user.profileCompletion < 80;
        if (filterProfileCompletion === 'minimal') return user.profileCompletion < 50;
        return true;
      })();

      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        if (dateFilter === 'noDate') return !user.createdAt;
        if (!user.createdAt) return false;

        const userDate = user.createdAt;
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case 'today': return userDate.toDateString() === today.toDateString();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return userDate.toDateString() === yesterday.toDateString();
          case 'thisWeek':
            const thisWeek = new Date(today);
            thisWeek.setDate(thisWeek.getDate() - 7);
            return userDate >= thisWeek;
          case 'thisMonth':
            const thisMonth = new Date(today);
            thisMonth.setMonth(thisMonth.getMonth() - 1);
            return userDate >= thisMonth;
          case 'last3Days':
            const last3Days = new Date(today);
            last3Days.setDate(last3Days.getDate() - 3);
            return userDate >= last3Days;
          case 'newest':
            const last24Hours = new Date(now);
            last24Hours.setHours(last24Hours.getHours() - 24);
            return userDate >= last24Hours;
          default: return true;
        }
      })();

      return matchesSearch && matchesType && matchesVerification &&
        matchesDate && matchesProfileCompletion && matchesCountry && matchesCity &&
        matchesOrganization && matchesRegistrationType;
    }).sort((a, b) => {
      let aValue: any = a[sortBy as keyof User];
      let bValue: any = b[sortBy as keyof User];

      if (sortBy === 'createdAt' || sortBy === 'lastLogin') {
        aValue = aValue?.getTime() || 0;
        bValue = bValue?.getTime() || 0;
      } else if (sortBy === 'profileCompletion') {
        aValue = a.profileCompletion;
        bValue = b.profileCompletion;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
  }, [users, activeTab, searchTerm, filterType, filterVerification, filterCountry, filterCity, filterOrganization, filterRegistrationType, filterProfileCompletion, dateFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);

  // Get unique countries, cities, and organizations for filters
  const uniqueCountries = Array.from(new Set(users.map(u => u.country).filter(c => c)));
  const uniqueCities = Array.from(new Set(users.map(u => u.city).filter(c => c)));
  const uniqueOrganizations = Array.from(new Set(users.map(u => u.parentOrganizationName).filter(o => o)));

  // Real Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive && !u.isDeleted).length,
    inactive: users.filter(u => !u.isActive && !u.isDeleted).length,
    deleted: users.filter(u => u.isDeleted).length,
    verified: users.filter(u => u.verificationStatus === 'verified' && !u.isDeleted).length,
    pending: users.filter(u => u.verificationStatus === 'pending' && !u.isDeleted).length,
    profileComplete: users.filter(u => u.profileCompletion >= 80 && !u.isDeleted).length,
    profileIncomplete: users.filter(u => u.profileCompletion < 80 && !u.isDeleted).length,
    noDate: users.filter(u => !u.createdAt && !u.isDeleted).length,
    newToday: users.filter(u => {
      if (!u.createdAt) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return u.createdAt >= today && !u.isDeleted;
    }).length,
    newThisWeek: users.filter(u => {
      if (!u.createdAt) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return u.createdAt >= weekAgo && !u.isDeleted;
    }).length,
    byType: {
      player: users.filter(u => u.accountType === 'player' && !u.isDeleted).length,
      academy: users.filter(u => u.accountType === 'academy' && !u.isDeleted).length,
      agent: users.filter(u => u.accountType === 'agent' && !u.isDeleted).length,
      trainer: users.filter(u => u.accountType === 'trainer' && !u.isDeleted).length,
      club: users.filter(u => u.accountType === 'club' && !u.isDeleted).length,
    },
    byRegistrationType: {
      direct: users.filter(u => u.registrationType === 'direct' && !u.isDeleted).length,
      organization: users.filter(u => u.registrationType === 'organization' && !u.isDeleted).length,
      unknown: users.filter(u => u.registrationType === 'unknown' && !u.isDeleted).length,
    }
  };

  // Helper functions
  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      player: 'لاعب',
      academy: 'أكاديمية',
      agent: 'وكيل',
      trainer: 'مدرب',
      club: 'نادي',
      user: 'مستخدم',
      unknown: 'غير محدد'
    };
    return labels[type] || type;
  };

  const getAccountTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      player: 'bg-blue-100 text-blue-800 border-blue-200',
      academy: 'bg-green-100 text-green-800 border-green-200',
      agent: 'bg-purple-100 text-purple-800 border-purple-200',
      trainer: 'bg-orange-100 text-orange-800 border-orange-200',
      club: 'bg-red-100 text-red-800 border-red-200',
      user: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getVerificationLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      verified: 'موثق',
      pending: 'في الانتظار',
      rejected: 'مرفوض'
    };
    return labels[status] || status;
  };

  const getVerificationColor = (status: string) => {
    const colors: { [key: string]: string } = {
      verified: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProfileCompletionBgColor = (completion: number) => {
    if (completion >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (completion >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getPageLabel = (page: string) => {
    const labels: { [key: string]: string } = {
      '/': 'الصفحة الرئيسية',
      '/auth/login': 'تسجيل الدخول',
      '/auth/register': 'التسجيل',
      '/dashboard': 'لوحة التحكم',
      '/dashboard/admin/users': 'إدارة المستخدمين'
    };
    return labels[page] || page;
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'verify' | 'delete' | 'restore' | 'permanent_delete') => {
    if (selectedUsers.length === 0) {
      toast.error('لم يتم اختيار أي مستخدمين');
      return;
    }

    if (action === 'permanent_delete') {
      const confirmText = `⚠️ تحذير نهائي: أنت على وشك حذف ${selectedUsers.length} مستخدم حذفاً نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء أبداً. هل أنت متأكد؟`;
      if (!window.confirm(confirmText)) return;
    }

    try {
      const allCollections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

      const allPromises = selectedUsers.map(async userId => {
        const targetUser = users.find(u => u.id === userId);
        const userEmail = targetUser?.email?.toLowerCase().trim();

        const deleteOperations: Promise<any>[] = [];

        // 1. التحديث/الحذف من جميع المجموعات بناءً على ID
        allCollections.forEach(coll => {
          const docRef = doc(db, coll, userId);
          switch (action) {
            case 'activate': deleteOperations.push(updateDoc(docRef, { isActive: true }).catch(() => { })); break;
            case 'deactivate': deleteOperations.push(updateDoc(docRef, { isActive: false }).catch(() => { })); break;
            case 'verify': deleteOperations.push(updateDoc(docRef, { verificationStatus: 'verified' }).catch(() => { })); break;
            case 'delete': deleteOperations.push(updateDoc(docRef, { isDeleted: true, isActive: false, deletedAt: new Date(), deletedBy: user?.uid || 'admin' }).catch(() => { })); break;
            case 'restore': deleteOperations.push(updateDoc(docRef, { isDeleted: false, isActive: true, restoredAt: new Date(), restoredBy: user?.uid || 'admin' }).catch(() => { })); break;
            case 'permanent_delete': deleteOperations.push(deleteDoc(docRef).catch(() => { })); break;
          }
        });

        // 2. الحذف النهائي المتقدم بناءً على البريد الإلكتروني لمنع التكرار
        if (action === 'permanent_delete' && userEmail) {
          for (const collName of allCollections) {
            try {
              const q = query(collection(db, collName), where('email', '==', userEmail));
              const snap = await getDocs(q);
              snap.forEach(d => {
                deleteOperations.push(deleteDoc(doc(db, collName, d.id)).catch(() => { }));
              });
            } catch (e) { }
          }
        }

        return Promise.all(deleteOperations);
      });

      await Promise.all(allPromises);

      if (action === 'permanent_delete') {
        const selectedEmails = selectedUsers.map(id => users.find(u => u.id === id)?.email?.toLowerCase().trim()).filter(Boolean);
        setUsers(prev => prev.filter(u =>
          !selectedUsers.includes(u.id) &&
          (!u.email || !selectedEmails.includes(u.email.toLowerCase().trim()))
        ));
      } else {
        setUsers(users.map(user => {
          if (!selectedUsers.includes(user.id)) return user;

          switch (action) {
            case 'activate':
              return { ...user, isActive: true };
            case 'deactivate':
              return { ...user, isActive: false };
            case 'verify':
              return { ...user, verificationStatus: 'verified' as const };
            case 'delete':
              return { ...user, isDeleted: true, isActive: false };
            case 'restore':
              return { ...user, isDeleted: false, isActive: true };
            default:
              return user;
          }
        }));
      }

      setSelectedUsers([]);

      const actionLabels = {
        activate: 'تفعيل',
        deactivate: 'تعطيل',
        verify: 'توثيق',
        delete: 'حذف',
        restore: 'استرجاع',
        permanent_delete: 'حذف نهائي ومسح من قاعدة البيانات'
      };

      toast.success(`تم ${actionLabels[action]} ${selectedUsers.length} مستخدم بنجاح`);
    } catch (error) {
      console.error('خطأ في العملية المجمعة:', error);
      toast.error('حدث خطأ في العملية المجمعة');
    }
  };

  const sendQuickMessage = async () => {
    if (!selectedUserDetails || !quickMessage.title || !quickMessage.body) {
      toast.error('يرجى إدخال العنوان والرسالة');
      return;
    }

    if (!selectedUserDetails.phone) {
      toast.error('المستخدم ليس لديه رقم هاتف مسجل');
      return;
    }

    setSendingMessage(true);
    try {
      // إرسال عبر WhatsApp
      const whatsappMessage = `*${quickMessage.title}*\n\n${quickMessage.body}\n\n---\nمنصة الحلم`;

      // تنسيق رقم الهاتف باستخدام البيانات المشتركة
      let formattedPhone = selectedUserDetails.phone.replace(/\D/g, ''); // إزالة كل ما ليس رقم

      // محاولة اكتشاف البلد من الرقم أولاً
      const detectedCountry = detectCountryFromPhone(selectedUserDetails.phone);

      if (detectedCountry) {
        // استخدام البلد المكتشف
        const countryCode = detectedCountry.code.replace(/\D/g, '');
        const localNumber = formattedPhone.replace(/^0+/, ''); // إزالة الصفر من البداية
        formattedPhone = countryCode + localNumber;

        console.log('🔍 تم اكتشاف البلد من الرقم:', {
          detectedCountry: detectedCountry.name,
          countryCode: detectedCountry.code,
          originalPhone: selectedUserDetails.phone,
          formattedPhone: formattedPhone
        });
      } else if (selectedUserDetails.countryCode) {
        // استخدام كود البلد المحفوظ
        const countryCode = selectedUserDetails.countryCode.replace(/\D/g, '');
        const localNumber = formattedPhone.replace(/^0+/, '');
        formattedPhone = countryCode + localNumber;

        console.log('📋 استخدام كود البلد المحفوظ:', {
          countryCode: selectedUserDetails.countryCode,
          originalPhone: selectedUserDetails.phone,
          formattedPhone: formattedPhone
        });
      } else {
        // البحث عن البلد من اسم البلد في قاعدة البيانات
        const userCountryName = selectedUserDetails.country;
        const country = countries.find(c => c.name === userCountryName);

        if (country) {
          const countryCode = country.code.replace(/\D/g, '');
          const localNumber = formattedPhone.replace(/^0+/, '');
          formattedPhone = countryCode + localNumber;

          console.log('🌍 استخدام البلد من قاعدة البيانات:', {
            userCountry: userCountryName,
            countryCode: country.code,
            originalPhone: selectedUserDetails.phone,
            formattedPhone: formattedPhone
          });
        } else {
          // افتراضي: مصر
          const localNumber = formattedPhone.replace(/^0+/, '');
          formattedPhone = '20' + localNumber;

          console.log('⚠️ استخدام البلد الافتراضي (مصر):', {
            originalPhone: selectedUserDetails.phone,
            formattedPhone: formattedPhone
          });
        }
      }

      const whatsappPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;

      console.log('📧 إرسال رسالة WhatsApp:', {
        originalPhone: selectedUserDetails.phone,
        countryCodeFromDB: selectedUserDetails.countryCode || 'غير موجود',
        formattedPhone: formattedPhone,
        whatsappPhone: whatsappPhone,
        userName: selectedUserDetails.name,
        userCountry: selectedUserDetails.country,
        userCity: selectedUserDetails.city,
        accountType: selectedUserDetails.accountType,
        messageLength: whatsappMessage.length,
        detectedCountry: detectedCountry?.name || 'غير مكتشف',
        instanceId: instanceId // Instance ID المستخدم
      });

      // فحص حالة Instance ID أولاً
      console.log('🔍 فحص حالة Instance ID...');
      try {
        const statusResponse = await fetch('/api/whatsapp/babaservice?action=status');
        const statusResult = await statusResponse.json();
        console.log('📊 حالة API:', statusResult);

        // فحص التكوين
        const configResponse = await fetch('/api/whatsapp/babaservice?action=config');
        const configResult = await configResponse.json();
        console.log('⚙️ تكوين API:', configResult);

        // فحص حالة Instance ID المحدد
        if (instanceId && instanceId !== 'موجود') {
          console.log('🔍 فحص حالة Instance ID المحدد:', instanceId);
          try {
            const qrResponse = await fetch('/api/whatsapp/babaservice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'get_qr_code',
                instance_id: instanceId
              })
            });
            const qrResult = await qrResponse.json();
            console.log('📱 حالة QR Code:', qrResult);
          } catch (qrError) {
            console.error('❌ خطأ في فحص QR Code:', qrError);
          }
        }
      } catch (error) {
        console.error('❌ خطأ في فحص حالة API:', error);
      }

      const whatsappResponse = await fetch('/api/whatsapp/babaservice/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: [whatsappPhone],
          message: whatsappMessage,
          type: 'admin_notification',
          instance_id: instanceId !== 'موجود' ? instanceId : undefined
        })
      });

      const whatsappResult = await whatsappResponse.json();

      console.log('📧 نتيجة إرسال WhatsApp:', whatsappResult);

      // عرض تفاصيل الخطأ إذا فشل الإرسال
      if (!whatsappResult.success && whatsappResult.data?.errors) {
        console.error('❌ تفاصيل الأخطاء:', whatsappResult.data.errors);
        whatsappResult.data.errors.forEach((error: any) => {
          console.error(`❌ خطأ في ${error.phoneNumber}:`, error.error);
        });
      }

      // عرض تفاصيل النجاح للتشخيص
      if (whatsappResult.success && whatsappResult.data?.results) {
        console.log('✅ تفاصيل النجاح:', whatsappResult.data.results);
        whatsappResult.data.results.forEach((result: any) => {
          console.log(`✅ ${result.phoneNumber}:`, {
            success: result.success,
            message: result.message,
            error: result.error,
            data: result.data
          });
        });
      }

      if (whatsappResult.success) {
        toast.success(`✅ تم إرسال الرسالة عبر WhatsApp إلى ${selectedUserDetails.name}`);
        toast.info('💡 ملاحظة: قد تستغرق الرسالة بضع دقائق للوصول. تأكد من أن رقم الهاتف صحيح ومتصل بالإنترنت.');

        // عرض تفاصيل إضافية للمساعدة في التشخيص
        if (whatsappResult.data?.results?.[0]?.data) {
          console.log('📱 تفاصيل الرسالة المرسلة:', whatsappResult.data.results[0].data);
        }

        setShowQuickMessageDialog(false);
        setQuickMessage({ title: '', body: '' });
        setSelectedTemplate('');
      } else {
        toast.error(`فشل إرسال الرسالة: ${whatsappResult.error || 'خطأ غير معروف'}`);

        // عرض تفاصيل الخطأ للمساعدة في التشخيص
        if (whatsappResult.data?.errors?.[0]?.error) {
          console.error('❌ تفاصيل الخطأ:', whatsappResult.data.errors[0].error);
          toast.error(`تفاصيل الخطأ: ${whatsappResult.data.errors[0].error}`);

          // إذا كان الخطأ متعلق بـ Instance ID، اقترح إعادة الربط
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
      setSendingMessage(false);
    }
  };

  const exportToExcel = () => {
    const headers = ['الاسم', 'البريد الإلكتروني', 'الهاتف', 'نوع الحساب', 'الحالة', 'حالة التحقق', 'اكتمال الملف', 'الدولة', 'المدينة', 'تاريخ التسجيل', 'آخر دخول'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedUsers.map(user => [
        `"${user.name}"`,
        user.email,
        user.phone,
        getAccountTypeLabel(user.accountType),
        user.isActive ? 'نشط' : 'معطل',
        getVerificationLabel(user.verificationStatus),
        `${user.profileCompletion}%`,
        user.country,
        user.city,
        user.createdAt?.toLocaleDateString('en-GB') || '',
        user.lastLogin?.toLocaleDateString('en-GB') || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('تم تصدير البيانات بنجاح');
  };

  if (loading) {
    return (
      <AccountTypeProtection allowedTypes={['admin']}>
        <div className="p-4 md:p-8 bg-gray-50/50 min-h-screen space-y-8">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex gap-4">
              <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="p-0">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center p-4 border-b border-gray-100 gap-4">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AccountTypeProtection>
    );
  }

  const maxVisitsInWeek = Math.max(...visitStats.last7Days.map(d => d.count), 1);

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
      <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                المستخدمين
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse">
                  نبض البيانات: {healthScore}%
                </Badge>
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                إدارة وتحليل {users.length.toLocaleString()} حساب مسجل
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSmartRepair}
                disabled={isRepairing}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm"
              >
                {isRepairing ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {isRepairing ? 'جاري الإصلاح...' : 'الإصلاح الذكي'}
              </Button>
              <Button onClick={() => { }} variant="outline" size="sm" className="bg-white hover:bg-gray-50 border-gray-200">
                <Download className="h-4 w-4 ml-2" />
                تصدير CSV
              </Button>
              <Button onClick={() => window.location.reload()} size="sm" variant="ghost" className="text-gray-500 hover:text-gray-900">
                <RefreshCcw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
            </div>
          </div>

          {/* Warning for users without dates */}
          {stats.noDate > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-orange-50 border border-orange-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 text-sm">
                  بيانات غير مكتملة
                </h3>
                <p className="text-sm text-orange-800 mt-1">
                  هناك {stats.noDate.toLocaleString()} مستخدم بدون تاريخ تسجيل.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDateFilter('noDate');
                  setShowAdvancedFilters(true);
                }}
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100 h-8"
              >
                عرض
              </Button>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">إجمالي المستخدمين</span>
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</span>
                  {stats.newToday > 0 && (
                    <span className="text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-0.5 rounded-full">+{stats.newToday} اليوم</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {stats.active.toLocaleString()} نشط</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {stats.inactive.toLocaleString()} خامل</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 bg-white overflow-hidden relative">
              {healthScore < 50 && (
                <div className="absolute top-0 right-0 p-1">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">جودة البيانات</span>
                  <Activity className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{healthScore}%</span>
                  <span className="text-gray-500 text-xs font-medium">مؤشر الصحة</span>
                </div>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${healthScore > 70 ? 'bg-emerald-500' : healthScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${healthScore}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 bg-white">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">زيارات المنصة</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{visitStats.total.toLocaleString()}</span>
                </div>
                <div className="mt-3 text-xs text-gray-400 truncate">
                  من {Object.keys(visitStats.byCity).length} مدينة مختلفة
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 bg-white">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">فئات الحسابات</span>
                  <Building2 className="h-4 w-4 text-gray-400" />
                </div>
                <div className="space-y-1 mt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">لاعبين</span>
                    <span className="font-medium text-gray-900">{stats.byType.player.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">أكاديميات</span>
                    <span className="font-medium text-gray-900">{stats.byType.academy.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">أندية</span>
                    <span className="font-medium text-gray-900">{stats.byType.club.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Visit Statistics Details - Compact */}
          <Card className="mb-6 border border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 cursor-pointer py-3" onClick={() => setShowVisitDetails(!showVisitDetails)}>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>إحصائيات الزيارات</span>
                  <Badge variant="outline" className="text-xs">
                    {visitStats.total.toLocaleString()}
                  </Badge>
                </div>
                {showVisitDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
            {showVisitDetails && (
              <CardContent className="p-4">
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Area Chart (Span 2) */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
                            <Activity className="h-4 w-4 text-blue-500" />
                            {chartTimeRange === '7days' ? 'تحليل الزيارات (آخر 7 أيام)' :
                              chartTimeRange === '30days' ? 'تحليل الزيارات (آخر 30 يوم)' :
                                'تحليل الزيارات (آخر سنة)'}
                          </h4>
                          <div className="relative">
                            <select
                              value={chartTimeRange}
                              onChange={(e) => setChartTimeRange(e.target.value as any)}
                              className="text-xs border-none bg-gray-50 rounded-md py-1 pr-8 pl-2 focus:ring-1 focus:ring-blue-500 cursor-pointer outline-none"
                            >
                              <option value="7days">آخر 7 أيام</option>
                              <option value="30days">آخر 30 يوم</option>
                              <option value="year">آخر سنة</option>
                            </select>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {(chartTimeRange === '7days' ? (visitStats.last7Days || []) :
                            chartTimeRange === '30days' ? (visitStats.last30Days || []) :
                              (visitStats.lastYear || [])).reduce((a: number, b) => a + b.count, 0)} زيارة
                        </Badge>
                      </div>
                      <div className="h-[250px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={chartTimeRange === '7days' ? (visitStats.last7Days || []) :
                              chartTimeRange === '30days' ? (visitStats.last30Days || []) :
                                (visitStats.lastYear || [])}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey={chartTimeRange === 'year' ? 'monthName' : 'dayName'}
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: '#6b7280' }}
                              dy={10}
                            />
                            <YAxis
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: '#6b7280' }}
                              tickFormatter={(value: number | string) => `${value}`}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                padding: '12px'
                              }}
                              itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                              labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '11px' }}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <Area
                              type="monotone"
                              dataKey="count"
                              name="الزيارات"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorVisits)"
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Top Pages (Span 1) */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
                      <h4 className="text-sm font-semibold mb-6 flex items-center gap-2 text-gray-800">
                        <Globe className="h-4 w-4 text-purple-500" />
                        الصفحات الأكثر زيارة
                      </h4>
                      {Object.keys(visitStats.byPage).length > 0 ? (
                        <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                          {Object.entries(visitStats.byPage)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 6)
                            .map(([page, count]) => {
                              const max = Math.max(...Object.values(visitStats.byPage));
                              const percent = (count / max) * 100;
                              return (
                                <div key={page} className="space-y-1.5 group">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span className="truncate max-w-[180px] font-medium group-hover:text-purple-600 transition-colors" title={page}>{getPageLabel(page)}</span>
                                    <span className="font-bold text-gray-900">{count}</span>
                                  </div>
                                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2">
                          <BarChart3 className="h-8 w-8 opacity-20" />
                          <p className="text-xs">لا توجد بيانات</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Geography & Recent Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Countries */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-gray-800">
                        <Globe className="h-4 w-4 text-emerald-500" />
                        أهم الدول
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(visitStats.byCountry)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([country, count], idx) => (
                            <div key={country} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-gray-400 w-4">{idx + 1}</span>
                                <span className="text-sm text-gray-700 font-medium">{country}</span>
                              </div>
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none">
                                {count}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Cities */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-gray-800">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        أهم المدن
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(visitStats.byCity)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([city, count], idx) => (
                            <div key={city} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-gray-400 w-4">{idx + 1}</span>
                                <span className="text-sm text-gray-700 font-medium">{city}</span>
                              </div>
                              <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-none">
                                {count}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Recent Visits */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-gray-800">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        آخر نشاط
                      </h4>
                      <div className="space-y-4">
                        {visitStats.recentVisits.slice(0, 5).map((visit, i) => (
                          <div key={i} className="relative pl-4 border-l-2 border-gray-100 pb-1 last:pb-0">
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white"></div>
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-semibold text-gray-900">{visit.country}, {visit.city}</span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {visit.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate" title={getPageLabel(visit.page)}>
                                زيارة: <span className="text-indigo-600 font-medium">{getPageLabel(visit.page)}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                        {visitStats.recentVisits.length === 0 && (
                          <p className="text-center text-xs text-gray-400 py-4">لا يوجد نشاط حديث</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Advanced Filters */}
          <Card className="mb-6 shadow-lg border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 cursor-pointer" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Filter className="h-6 w-6 text-gray-700" />
                  <span>فلاتر البحث المتقدمة</span>
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                    {filteredAndSortedUsers.length.toLocaleString()} نتيجة
                  </Badge>
                </div>
                {showAdvancedFilters ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
            {showAdvancedFilters && (
              <CardContent className="p-6">
                {/* Main Search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">البحث السريع</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pr-12 text-lg h-12 border-2 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Account Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحساب</label>
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="اختر نوع الحساب"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع الأنواع ({stats.total.toLocaleString()})</option>
                      <option value="player">لاعب ({stats.byType.player.toLocaleString()})</option>
                      <option value="academy">أكاديمية ({stats.byType.academy.toLocaleString()})</option>
                      <option value="agent">وكيل ({stats.byType.agent.toLocaleString()})</option>
                      <option value="trainer">مدرب ({stats.byType.trainer.toLocaleString()})</option>
                      <option value="club">نادي ({stats.byType.club.toLocaleString()})</option>
                    </select>
                  </div>

                  {/* Verification Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">حالة التوثيق</label>
                    <select
                      value={filterVerification}
                      onChange={(e) => {
                        setFilterVerification(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="اختر حالة التوثيق"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="verified">موثق ({stats.verified.toLocaleString()})</option>
                      <option value="pending">في الانتظار ({stats.pending.toLocaleString()})</option>
                      <option value="rejected">مرفوض</option>
                    </select>
                  </div>

                  {/* Profile Completion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">اكتمال الملف</label>
                    <select
                      value={filterProfileCompletion}
                      onChange={(e) => {
                        setFilterProfileCompletion(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="اختر مستوى اكتمال الملف"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع المستويات</option>
                      <option value="complete">مكتمل 80%+ ({stats.profileComplete.toLocaleString()})</option>
                      <option value="partial">جزئي 50-79%</option>
                      <option value="minimal">قليل &lt;50%</option>
                      <option value="incomplete">غير مكتمل &lt;80% ({stats.profileIncomplete.toLocaleString()})</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الدولة</label>
                    <select
                      value={filterCountry}
                      onChange={(e) => {
                        setFilterCountry(e.target.value);
                        setFilterCity('all');
                        setCurrentPage(1);
                      }}
                      title="اختر الدولة"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع الدول ({uniqueCountries.length})</option>
                      {uniqueCountries.sort().map(country => (
                        <option key={country} value={country}>
                          {country} ({users.filter(u => u.country === country && !u.isDeleted).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المدينة</label>
                    <select
                      value={filterCity}
                      onChange={(e) => {
                        setFilterCity(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="اختر المدينة"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع المدن ({uniqueCities.length})</option>
                      {uniqueCities
                        .filter(city => filterCountry === 'all' || users.some(u => u.city === city && u.country === filterCountry))
                        .sort()
                        .map(city => (
                          <option key={city} value={city}>
                            {city} ({users.filter(u => u.city === city && (filterCountry === 'all' || u.country === filterCountry) && !u.isDeleted).length})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Registration Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ التسجيل</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="اختر فترة التسجيل"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع التواريخ</option>
                      <option value="newest">الأحدث (آخر 24 ساعة) ⭐</option>
                      <option value="today">اليوم ({stats.newToday})</option>
                      <option value="yesterday">أمس</option>
                      <option value="last3Days">آخر 3 أيام</option>
                      <option value="thisWeek">هذا الأسبوع ({stats.newThisWeek})</option>
                      <option value="thisMonth">هذا الشهر</option>
                      {stats.noDate > 0 && (
                        <option value="noDate">بدون تاريخ ({stats.noDate}) ⚠️</option>
                      )}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ترتيب حسب</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      title="اختر حقل الترتيب"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="createdAt">تاريخ التسجيل</option>
                      <option value="name">الاسم</option>
                      <option value="email">البريد الإلكتروني</option>
                      <option value="lastLogin">آخر دخول</option>
                      <option value="accountType">نوع الحساب</option>
                      <option value="profileCompletion">اكتمال الملف</option>
                      <option value="country">الدولة</option>
                    </select>
                  </div>

                  {/* Registration Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">طريقة التسجيل</label>
                    <select
                      value={filterRegistrationType}
                      onChange={(e) => {
                        setFilterRegistrationType(e.target.value);
                        setCurrentPage(1);
                      }}
                      title="اختر طريقة التسجيل"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع الطرق</option>
                      <option value="direct">تسجيل مباشر ({stats.byRegistrationType.direct})</option>
                      <option value="organization">عبر منظمة ({stats.byRegistrationType.organization})</option>
                      {stats.byRegistrationType.unknown > 0 && (
                        <option value="unknown">غير محدد ({stats.byRegistrationType.unknown})</option>
                      )}
                    </select>
                  </div>

                  {/* Organization Filter */}
                  {uniqueOrganizations.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">المنظمة</label>
                      <select
                        value={filterOrganization}
                        onChange={(e) => {
                          setFilterOrganization(e.target.value);
                          setCurrentPage(1);
                        }}
                        title="اختر المنظمة"
                        className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="all">جميع المنظمات</option>
                        <option value="direct">بدون منظمة (تسجيل مباشر)</option>
                        {uniqueOrganizations.sort().map(org => (
                          <option key={org} value={org}>
                            {org} ({users.filter(u => u.parentOrganizationName === org && !u.isDeleted).length})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Items Per Page */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عدد العناصر</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      title="اختر عدد العناصر في الصفحة"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value={25}>25 في الصفحة</option>
                      <option value={50}>50 في الصفحة</option>
                      <option value={100}>100 في الصفحة</option>
                      <option value={250}>250 في الصفحة</option>
                      <option value={500}>500 في الصفحة</option>
                    </select>
                  </div>
                </div>

                {/* Reset Filters */}
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setFilterVerification('all');
                      setFilterProfileCompletion('all');
                      setFilterCountry('all');
                      setFilterCity('all');
                      setFilterOrganization('all');
                      setFilterRegistrationType('all');
                      setDateFilter('all');
                      setSortBy('createdAt');
                      setSortOrder('desc');
                      setCurrentPage(1);
                      toast.success('تم إعادة تعيين جميع الفلاتر');
                    }}
                    className="gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    إعادة تعيين جميع الفلاتر
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <Card className="mb-6 border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-6 w-6 text-blue-600" />
                    <span className="text-lg font-semibold text-blue-900">
                      تم اختيار {selectedUsers.length.toLocaleString()} مستخدم
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {activeTab === 'active' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleBulkAction('deactivate')}
                          className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                        >
                          <UserX className="h-4 w-4" />
                          تعطيل ({selectedUsers.length})
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBulkAction('verify')}
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                          <Shield className="h-4 w-4" />
                          توثيق ({selectedUsers.length})
                        </Button>
                      </>
                    )}
                    {activeTab === 'inactive' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleBulkAction('activate')}
                          className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                          <UserCheck className="h-4 w-4" />
                          تفعيل ({selectedUsers.length})
                        </Button>
                      </>
                    )}
                    {activeTab === 'deleted' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleBulkAction('restore')}
                          className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          استرجاع ({selectedUsers.length})
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBulkAction('permanent_delete')}
                          className="bg-red-900 hover:bg-black text-white gap-2 font-bold"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف نهائي من القاعدة ({selectedUsers.length})
                        </Button>
                      </div>
                    )}
                    {activeTab !== 'deleted' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف ${selectedUsers.length} مستخدم؟`)) {
                              handleBulkAction('delete');
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          حذف ({selectedUsers.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBulkAction('permanent_delete')}
                          className="text-red-900 hover:bg-red-50 gap-2 border border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف قطعي
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUsers([])}
                      className="gap-2"
                    >
                      إلغاء التحديد
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs for Active/Inactive/Deleted */}
          <Card className="shadow-lg border border-gray-200 overflow-hidden bg-white">
            <div className="border-b border-gray-100 p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Custom Tabs UI */}
                <div className="bg-gray-100/80 p-1.5 rounded-xl w-full md:w-auto grid grid-cols-3 gap-1 md:flex md:gap-1">
                  <button
                    onClick={() => { setActiveTab('active'); setSelectedUsers([]); setCurrentPage(1); }}
                    className={`flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${activeTab === 'active'
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    <UserCheck className={`h-3.5 w-3.5 md:h-4 md:w-4 ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="hidden sm:inline">النشطين</span>
                    <span className="sm:hidden">نشط</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] md:text-xs ${activeTab === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {stats.active.toLocaleString()}
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('inactive'); setSelectedUsers([]); setCurrentPage(1); }}
                    className={`flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${activeTab === 'inactive'
                      ? 'bg-white text-amber-600 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    <UserX className={`h-3.5 w-3.5 md:h-4 md:w-4 ${activeTab === 'inactive' ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className="hidden sm:inline">المعطلين</span>
                    <span className="sm:hidden">معطل</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] md:text-xs ${activeTab === 'inactive' ? 'bg-amber-50 text-amber-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {stats.inactive.toLocaleString()}
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('deleted'); setSelectedUsers([]); setCurrentPage(1); }}
                    className={`flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${activeTab === 'deleted'
                      ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    <Trash2 className={`h-3.5 w-3.5 md:h-4 md:w-4 ${activeTab === 'deleted' ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className="hidden sm:inline">المحذوفين</span>
                    <span className="sm:hidden">محذوف</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] md:text-xs ${activeTab === 'deleted' ? 'bg-red-50 text-red-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {stats.deleted.toLocaleString()}
                    </span>
                  </button>
                </div>

                {/* Stats Info */}
                <div className="flex items-center justify-between md:justify-end gap-3 px-1 glass-effect p-2 rounded-lg md:bg-transparent md:p-0">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 md:hidden" />
                    <span className="md:hidden font-medium">قائمة المستخدمين</span>
                  </span>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 px-3 flex items-center gap-2">
                      <span className="text-gray-500 font-normal">عرض</span>
                      <span className="font-bold">{filteredAndSortedUsers.length.toLocaleString()}</span>
                      <span className="text-gray-400">/</span>
                      <span className="font-bold">{getUsersByTab().length.toLocaleString()}</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80 border-b border-gray-100 backdrop-blur-sm sticky top-0 z-10">
                    <tr>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          title="تحديد الكل"
                          checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(paginatedUsers.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer align-middle"
                        />
                      </th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">الاسم</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">البريد الإلكتروني</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">الهاتف</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">واتساب</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">النوع</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">المنظمة</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">التوثيق</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">اكتمال الملف</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">الموقع</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">التسجيل</th>
                      <th className="text-right p-4 font-medium text-gray-500 text-xs uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedUsers.map((user) => {
                      const isNew = user.createdAt && (new Date().getTime() - user.createdAt.getTime()) < 24 * 60 * 60 * 1000;

                      return (
                        <tr key={user.id} className={`group hover:bg-gray-50/50 transition-all duration-200 ${selectedUsers.includes(user.id) ? 'bg-blue-50/30' : ''}`}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer align-middle"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm ring-2 ring-white">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 truncate max-w-[150px]">{user.name}</p>
                                  {isNew && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-emerald-200">
                                      جديد
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1 mt-0.5">
                                  {!user.isActive && (
                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded-sm">موقوف</span>
                                  )}
                                  {user.isDeleted && (
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded-sm line-through">محذوف</span>
                                  )}
                                </div>
                                {user.lastLogin && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {user.lastLogin.toLocaleDateString('en-GB')}
                                  </p>
                                )}
                                {!user.isActive && user.suspendReason && (
                                  <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {user.suspendReason.substring(0, 30)}{user.suspendReason.length > 30 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-gray-600 group-hover:text-gray-900 transition-colors">
                              <Mail className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm font-medium">{user.email || '-'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-sm font-medium dir-ltr">{user.phone || '-'}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const validation = user.countryCode ? validateUserPhone(user) : { isValid: false, error: 'no_code' };
                                    if (validation.isValid) {
                                      return <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 rounded"><CheckCircle2 className="h-2.5 w-2.5" /> صحيح</span>;
                                    } else {
                                      return <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-1.5 rounded"><AlertCircle className="h-2.5 w-2.5" /> {user.countryCode ? 'خطأ' : 'كود مفقود'}</span>;
                                    }
                                  })()}
                                  {!user.countryCode && (
                                    (() => {
                                      const detected = detectCountryFromPhone(user.phone);
                                      return detected ? <span className="text-[10px] text-blue-600 flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> {detected.name}</span> : null;
                                    })()
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-sm font-medium dir-ltr">{user.whatsapp || '-'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={`${getAccountTypeColor(user.accountType)} font-medium`}>
                              {getAccountTypeLabel(user.accountType)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {user.parentOrganizationName ? (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-700">{user.parentOrganizationName}</span>
                                  <span className="text-[10px] text-gray-500">{getAccountTypeLabel(user.parentAccountType)}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium">تسجيل مباشر</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${getVerificationColor(user.verificationStatus)}`}>
                              {user.verificationStatus === 'verified' && <CheckCircle2 className="h-3 w-3" />}
                              {user.verificationStatus === 'pending' && <Clock className="h-3 w-3" />}
                              {user.verificationStatus === 'rejected' && <XCircle className="h-3 w-3" />}
                              <span className="text-xs font-semibold">{getVerificationLabel(user.verificationStatus)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="w-24">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-gray-600">{user.profileCompletion}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${user.profileCompletion >= 80 ? 'bg-emerald-500' :
                                    user.profileCompletion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                  style={{ width: `${user.profileCompletion}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col text-sm">
                              <span className="font-medium text-gray-700">{user.country || '-'}</span>
                              <span className="text-xs text-gray-500">{user.city}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700 font-medium numbers-english">
                                {user.createdAt?.toLocaleDateString('en-GB') || '-'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {user.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="عرض التفاصيل"
                                onClick={() => {
                                  setSelectedUserDetails(user);
                                  setShowUserDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title="طلب تحديث بيانات"
                                onClick={() => handleRequestUpdate(user.id)}
                              >
                                <RefreshCcw className="h-4 w-4" />
                              </Button>

                              {/* Verify/Reject Buttons */}
                              {user.verificationStatus === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    title="توثيق الحساب"
                                    onClick={() => handleVerifyAccount(user.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="رفض التوثيق"
                                    onClick={() => handleRejectAccount(user.id)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* Suspend/Activate Button */}
                              {user.isActive ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  title="إيقاف مؤقت"
                                  onClick={() => {
                                    setSelectedUserDetails(user);
                                    setShowSuspendDialog(true);
                                  }}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="تفعيل الحساب"
                                  onClick={() => {
                                    setSelectedUserDetails(user);
                                    setShowActivateDialog(true);
                                  }}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Delete Button (Soft Delete) */}
                              {!user.isDeleted && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="حذف"
                                  onClick={() => {
                                    setSelectedUserDetails(user);
                                    setIsPermanentDelete(false);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Hard Delete Button (For already deleted users) */}
                              {user.isDeleted && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="حذف نهائي"
                                  onClick={() => {
                                    setSelectedUserDetails(user);
                                    setIsPermanentDelete(true);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Change Account Type Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title="تغيير نوع الحساب"
                                onClick={() => {
                                  setSelectedUserDetails(user);
                                  setNewAccountType(user.accountType);
                                  setShowChangeTypeDialog(true);
                                }}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {paginatedUsers.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">لا توجد نتائج مطابقة للبحث</p>
                  <p className="text-sm mt-2">جرب تغيير معايير البحث أو الفلاتر</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-6 bg-gradient-to-r from-gray-50 to-slate-50 border-t-2 border-gray-200">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                      عرض <span className="font-bold text-blue-600">{(startIndex + 1).toLocaleString()}</span> إلى{' '}
                      <span className="font-bold text-blue-600">
                        {Math.min(startIndex + itemsPerPage, filteredAndSortedUsers.length).toLocaleString()}
                      </span>{' '}
                      من <span className="font-bold text-blue-600">{filteredAndSortedUsers.length.toLocaleString()}</span> نتيجة
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 disabled:opacity-50"
                      >
                        الأول
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 disabled:opacity-50"
                      >
                        السابق
                      </Button>
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 7) {
                          page = i + 1;
                        } else if (currentPage <= 4) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 3) {
                          page = totalPages - 6 + i;
                        } else {
                          page = currentPage - 3 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={
                              currentPage === page
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg font-bold min-w-[40px]'
                                : 'bg-white hover:bg-blue-50 border-blue-300 text-blue-700 min-w-[40px]'
                            }
                          >
                            {page}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 disabled:opacity-50"
                      >
                        التالي
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 disabled:opacity-50"
                      >
                        الأخير ({totalPages})
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* User Details Dialog - Redesigned */}
        <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
          <DialogContent className="sm:max-w-md w-[95vw] p-0 overflow-hidden rounded-[2rem] gap-0 border-0 shadow-2xl flex flex-col max-h-[90vh]">

            {/* 1. Vibrant Header */}
            <div className="bg-gradient-to-bl from-indigo-600 via-purple-600 to-fuchsia-600 p-6 pt-8 pb-12 text-white relative shrink-0 overflow-hidden">
              {/* Decorative Circles */}
              <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] rounded-full border-2 border-white/10 animate-pulse"></div>
              <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-4 text-white/80 hover:text-white hover:bg-white/20 rounded-full z-20"
                onClick={() => setShowUserDetailsDialog(false)}
              >
                <XCircle className="w-7 h-7" />
              </Button>

              <div className="flex flex-col items-center relative z-10">
                <div className="w-24 h-24 rounded-full p-1.5 bg-white/20 backdrop-blur-md shadow-xl mb-3">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 shadow-inner">
                    {selectedUserDetails?.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-center mb-1 drop-shadow-md">{selectedUserDetails?.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-white/25 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-sm px-3 py-1 text-xs">
                    {getAccountTypeLabel(selectedUserDetails?.accountType || 'user')}
                  </Badge>
                  {selectedUserDetails?.isActive
                    ? <Badge className="bg-emerald-400/80 hover:bg-emerald-400 text-white border-0 px-2 py-1 text-xs shadow-sm">نشط</Badge>
                    : <Badge className="bg-rose-500/80 hover:bg-rose-500 text-white border-0 px-2 py-1 text-xs shadow-sm">معطل</Badge>
                  }
                </div>
              </div>
            </div>

            {/* 2. Compact Content - Floating Card Effect */}
            <div className="flex-1 overflow-y-auto bg-slate-50 -mt-6 rounded-t-[2rem] relative z-20 px-5 pt-8 pb-4 space-y-5">

              {selectedUserDetails && (
                <>
                  {/* Floating Stats Row */}
                  <div className="flex justify-between divide-x divide-x-reverse divide-slate-100 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-center px-2 flex-1">
                      <p className="text-xs text-slate-400 font-medium mb-1">نسبة الملف</p>
                      <p className="text-lg font-bold text-indigo-600">{selectedUserDetails.profileCompletion}%</p>
                    </div>
                    <div className="text-center px-2 flex-1">
                      <p className="text-xs text-slate-400 font-medium mb-1">تاريخ التسجيل</p>
                      <p className="text-sm font-bold text-slate-700" dir="ltr">
                        {selectedUserDetails.createdAt ? Math.floor((new Date().getTime() - selectedUserDetails.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + ' يوم' : '-'}
                      </p>
                    </div>
                    <div className="text-center px-2 flex-1">
                      <p className="text-xs text-slate-400 font-medium mb-1">الزيارات (7 أيام)</p>
                      <p className="text-lg font-bold text-purple-600">
                        {visitStats.recentVisits.filter(v => v.userId === selectedUserDetails.id).length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Info Cards Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {/* Email */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">البريد الإلكتروني</p>
                        <p className="text-sm font-semibold text-slate-800 truncate select-all font-mono">{selectedUserDetails.email}</p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-green-100 transition-colors shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">رقم الهاتف</p>
                        <p className="text-sm font-semibold text-slate-800 font-mono select-all" dir="ltr">{selectedUserDetails.phone || 'غير مسجل'}</p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-orange-100 transition-colors shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">الموقع</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedUserDetails.city ? `${selectedUserDetails.country} - ${selectedUserDetails.city}` : selectedUserDetails.country || 'غير محدد'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Suspension Warning */}
                  {selectedUserDetails.suspendReason && !selectedUserDetails.isActive && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-800">الحساب موقوف</p>
                        <p className="text-xs text-red-600 mt-1">{selectedUserDetails.suspendReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Hidden / Deleted Warning */}
                  {selectedUserDetails.isDeleted && (
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-center">
                      <p className="text-sm font-bold text-slate-600 flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        هذا الحساب محذوف (Soft Delete)
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 3. Action Bar - Sticky Bottom */}
            <div className="p-5 bg-white border-t border-slate-100 shrink-0 pb-6">
              {selectedUserDetails && (
                <div className="space-y-3">
                  {/* Primary Actions Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setShowQuickMessageDialog(true)}
                      className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-200"
                    >
                      <Mail className="w-4 h-4 mr-2" /> مراسلة
                    </Button>

                    {/* Contextual Status Action */}
                    {selectedUserDetails.isActive ? (
                      <Button
                        onClick={() => setShowSuspendDialog(true)}
                        className="w-full bg-orange-100 text-orange-700 hover:bg-orange-200 border-0 rounded-xl"
                      >
                        <UserX className="w-4 h-4 mr-2" /> إيقاف
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowActivateDialog(true)}
                        className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 rounded-xl"
                      >
                        <UserCheck className="w-4 h-4 mr-2" /> تفعيل
                      </Button>
                    )}
                  </div>

                  {/* Secondary & Destructive Row */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewAccountType(selectedUserDetails.accountType);
                        setShowChangeTypeDialog(true);
                      }}
                      className="flex-1 rounded-xl border-slate-200 text-slate-600"
                    >
                      <UserCog className="w-4 h-4 mr-2" /> تعديل
                    </Button>

                    {/* Explicit Delete Button */}
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> حذف الحساب
                    </Button>
                  </div>

                  {/* Verify Actions (Only if Pending) */}
                  {selectedUserDetails.verificationStatus === 'pending' && (
                    <Button
                      onClick={() => handleVerifyAccount(selectedUserDetails.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-200"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> قبول توثيق الحساب
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Message Dialog - Ultra Simple */}
        <Dialog open={showQuickMessageDialog} onOpenChange={(open) => {
          setShowQuickMessageDialog(open);
          if (!open) {
            setQuickMessage({ title: '', body: '' });
            setSelectedTemplate('');
          }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl">
                إرسال رسالة إلى {selectedUserDetails?.name}
              </DialogTitle>
              <DialogDescription>
                سيتم إرسال الرسالة عبر WhatsApp والإشعارات
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Templates */}
              <div>
                <label className="text-sm font-medium mb-2 block">اختر نموذجاً سريعاً</label>
                <div className="grid grid-cols-5 gap-2">
                  {messageTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className={`p-3 rounded-lg border-2 hover:scale-105 transition-transform ${selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                        }`}
                      title={template.name}
                    >
                      <div className="text-2xl">{template.icon}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-2 block">العنوان</label>
                <Input
                  placeholder="عنوان الرسالة"
                  value={quickMessage.title}
                  onChange={(e) => setQuickMessage({ ...quickMessage, title: e.target.value })}
                  className="w-full"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">{quickMessage.title.length}/100</p>
              </div>

              {/* Body */}
              <div>
                <label className="text-sm font-medium mb-2 block">الرسالة</label>
                <textarea
                  placeholder="اكتب رسالتك هنا..."
                  value={quickMessage.body}
                  onChange={(e) => setQuickMessage({ ...quickMessage, body: e.target.value })}
                  className="w-full min-h-[150px] p-3 border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{quickMessage.body.length}/500</p>
              </div>

              {/* Preview */}
              {(quickMessage.title || quickMessage.body) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">المعاينة:</p>
                  <div className="bg-white p-3 rounded shadow-sm">
                    {quickMessage.title && (
                      <p className="font-bold mb-1">{quickMessage.title}</p>
                    )}
                    {quickMessage.body && (
                      <p className="text-sm text-gray-700">{quickMessage.body}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuickMessageDialog(false);
                  setQuickMessage({ title: '', body: '' });
                  setSelectedTemplate('');
                }}
                disabled={sendingMessage}
              >
                إلغاء
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setQuickMessage({ title: '', body: '' });
                  setSelectedTemplate('');
                }}
                disabled={sendingMessage}
              >
                مسح
              </Button>
              <Button
                onClick={sendQuickMessage}
                disabled={sendingMessage || !quickMessage.title || !quickMessage.body}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendingMessage ? (
                  <>
                    <RefreshCcw className="h-4 w-4 ml-2 animate-spin" />
                    إرسال...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 ml-2" />
                    إرسال WhatsApp
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Suspend Account Dialog */}
        <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إيقاف الحساب مؤقتاً</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من إيقاف حساب {selectedUserDetails?.name}؟ يجب إدخال سبب الإيقاف.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">سبب الإيقاف</label>
                <textarea
                  placeholder="اذكر سبب إيقاف الحساب..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full min-h-[100px] p-3 border-2 border-gray-300 rounded-md focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                  maxLength={300}
                />
                <p className="text-xs text-gray-500 mt-1">{suspendReason.length}/300</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuspendDialog(false);
                  setSuspendReason('');
                }}
                disabled={actionLoading}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSuspendAccount}
                disabled={actionLoading || !suspendReason.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {actionLoading ? 'جاري الإيقاف...' : 'إيقاف الحساب'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Activate Account Dialog */}
        <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تفعيل الحساب</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من تفعيل حساب {selectedUserDetails?.name}؟
              </DialogDescription>
            </DialogHeader>
            {selectedUserDetails?.suspendReason && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-900 mb-1">سبب الإيقاف السابق:</p>
                <p className="text-sm text-orange-700">{selectedUserDetails.suspendReason}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowActivateDialog(false)}
                disabled={actionLoading}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleActivateAccount}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? 'جاري التفعيل...' : 'تفعيل الحساب'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Account Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setIsPermanentDelete(false);
        }}>
          <DialogContent className="sm:max-w-[400px] w-[95vw] p-6 rounded-2xl gap-5">
            <DialogHeader className="space-y-3 text-right">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-center text-xl font-bold text-slate-900">
                حذف الحساب
              </DialogTitle>
              <DialogDescription className="text-center text-slate-500 text-sm leading-relaxed">
                هل أنت متأكد من حذف حساب <span className="font-bold text-slate-800 break-words">{selectedUserDetails?.name}</span>؟
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className={`p-4 rounded-xl text-sm border ${isPermanentDelete ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} transition-colors duration-200`}>
                <div className="flex gap-3">
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 ${isPermanentDelete ? 'text-red-600' : 'text-orange-600'}`} />
                  <p className={`${isPermanentDelete ? 'text-red-800' : 'text-orange-800'} font-medium`}>
                    {isPermanentDelete
                      ? 'سيتم حذف جميع البيانات نهائياً ولن يمكنك استرجاعها.'
                      : 'سيتم نقل الحساب إلى سلة المحذوفات ويمكن استرجاعه لاحقاً.'}
                  </p>
                </div>
              </div>

              <div className="relative">
                <input
                  type="checkbox"
                  id="permanentDelete"
                  checked={isPermanentDelete}
                  onChange={(e) => setIsPermanentDelete(e.target.checked)}
                  className="peer sr-only"
                />
                <label
                  htmlFor="permanentDelete"
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 cursor-pointer transition-all hover:bg-slate-50 peer-checked:border-red-500 peer-checked:bg-red-50/50"
                  dir="rtl"
                >
                  <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-red-500 peer-checked:bg-red-500 flex items-center justify-center transition-all bg-white">
                    {isPermanentDelete && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`text-sm font-bold select-none ${isPermanentDelete ? 'text-red-700' : 'text-slate-600'}`}>
                    حذف نهائي (Hard Delete)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={actionLoading}
                className="w-full h-11 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={actionLoading}
                className={`w-full h-11 rounded-xl font-bold shadow-md hover:shadow-lg transition-all ${isPermanentDelete
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
              >
                {actionLoading ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isPermanentDelete ? 'حذف نهائي' : 'حذف مؤقت'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Account Type Dialog */}
        <Dialog open={showChangeTypeDialog} onOpenChange={setShowChangeTypeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تغيير نوع الحساب</DialogTitle>
              <DialogDescription>
                تغيير نوع حساب {selectedUserDetails?.name} من {getAccountTypeLabel(selectedUserDetails?.accountType || 'user')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">نوع الحساب الجديد</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">اختر نوع الحساب</option>
                  <option value="user">مستخدم عادي</option>
                  <option value="player">لاعب</option>
                  <option value="academy">أكاديمية</option>
                  <option value="club">نادي</option>
                  <option value="agent">وكيل</option>
                  <option value="trainer">مدرب</option>
                </select>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  <strong>تحذير:</strong> تغيير نوع الحساب قد يؤثر على البيانات والصلاحيات المرتبطة بالمستخدم.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangeTypeDialog(false);
                  setNewAccountType('');
                }}
                disabled={actionLoading}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleChangeAccountType}
                disabled={actionLoading || !newAccountType || newAccountType === selectedUserDetails?.accountType}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {actionLoading ? 'جاري التغيير...' : 'تغيير نوع الحساب'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AccountTypeProtection >
  );
}
