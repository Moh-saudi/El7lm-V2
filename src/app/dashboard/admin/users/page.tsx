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
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
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
  const [visitStats, setVisitStats] = useState<VisitStats>({
    total: 0,
    byCountry: {},
    byCity: {},
    byDate: {},
    byPage: {},
    last7Days: [],
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

  // New states for account management
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showChangeTypeDialog, setShowChangeTypeDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [newAccountType, setNewAccountType] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

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
        recentVisits: []
      };

      // إنشاء آخر 7 أيام
      const last7DaysData: { [key: string]: { count: number; dayName: string } } = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString('en-GB');
        const dayName = date.toLocaleDateString('ar-SA', { weekday: 'long' });
        last7DaysData[dateKey] = { count: 0, dayName };
      }

      try {
        const analyticsRef = collection(db, 'analytics');
        const analyticsSnapshot = await getDocs(analyticsRef);

        analyticsSnapshot.forEach(doc => {
          const data = doc.data();
          const date = safeToDate(data.timestamp || data.date);

          if (date) {
            const dateKey = date.toLocaleDateString('en-GB');
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

            if (last7DaysData[dateKey]) {
              last7DaysData[dateKey].count++;
            }
          }

          if (data.country) {
            stats.byCountry[data.country] = (stats.byCountry[data.country] || 0) + 1;
          }

          if (data.city) {
            stats.byCity[data.city] = (stats.byCity[data.city] || 0) + 1;
          }

          if (data.route || data.page) {
            const page = data.route || data.page;
            stats.byPage[page] = (stats.byPage[page] || 0) + 1;
          }

          stats.total++;

          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (date && date >= sevenDaysAgo) {
            stats.recentVisits.push({
              country: data.country || 'غير محدد',
              city: data.city || 'غير محدد',
              timestamp: date,
              userId: data.userId,
              page: data.route || data.page || '/'
            });
          }
        });
      } catch (error) {
        console.log('محاولة جلب من مجموعة visits...');
      }

      try {
        const visitsRef = collection(db, 'visits');
        const visitsSnapshot = await getDocs(visitsRef);

        visitsSnapshot.forEach(doc => {
          const data = doc.data();
          const date = safeToDate(data.timestamp);

          if (date) {
            const dateKey = date.toLocaleDateString('en-GB');
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

            if (last7DaysData[dateKey]) {
              last7DaysData[dateKey].count++;
            }
          }

          if (data.country) {
            stats.byCountry[data.country] = (stats.byCountry[data.country] || 0) + 1;
          }

          if (data.city) {
            stats.byCity[data.city] = (stats.byCity[data.city] || 0) + 1;
          }

          if (data.route || data.page) {
            const page = data.route || data.page;
            stats.byPage[page] = (stats.byPage[page] || 0) + 1;
          }

          stats.total++;

          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (date && date >= sevenDaysAgo) {
            stats.recentVisits.push({
              country: data.country || 'غير محدد',
              city: data.city || 'غير محدد',
              timestamp: date,
              userId: data.userId,
              page: data.route || data.page || '/'
            });
          }
        });
      } catch (error) {
        console.error('خطأ في جلب الزيارات:', error);
      }

      // تحويل last7Days إلى مصفوفة مرتبة
      stats.last7Days = Object.entries(last7DaysData).map(([date, data]) => ({
        date,
        count: data.count,
        dayName: data.dayName
      }));

      stats.recentVisits.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      stats.recentVisits = stats.recentVisits.slice(0, 20);

      setVisitStats(stats);
      console.log('📊 إحصائيات الزيارات:', stats);
    } catch (error) {
      console.error('خطأ في تحميل إحصائيات الزيارات:', error);
    }
  };

  // دالة لجلب اسم المنظمة من cache أو من قاعدة البيانات
  const getOrganizationName = async (parentId: string, parentType: string): Promise<string> => {
    if (!parentId || !parentType) return '';

    const cacheKey = `${parentType}_${parentId}`;
    if (organizationsCache[cacheKey]) {
      return organizationsCache[cacheKey];
    }

    try {
      const collectionName = parentType === 'user' ? 'users' : `${parentType}s`;
      const orgDoc = await doc(db, collectionName, parentId);
      const orgSnap = await getDocs(collection(db, collectionName));

      const found = orgSnap.docs.find(d => d.id === parentId);
      if (found) {
        const data = found.data();
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

      const collectionName = selectedUserDetails.accountType === 'user' ? 'users' :
        selectedUserDetails.accountType + 's';

      if (isPermanentDelete) {
        // حذف نهائي - Hard Delete
        // 1. حذف من المجموعة الخاصة (role collection)
        await deleteDoc(doc(db, collectionName, selectedUserDetails.id));

        // 2. حذف من مجموعة users الرئيسية إذا كانت مختلفة
        if (collectionName !== 'users') {
          try {
            await deleteDoc(doc(db, 'users', selectedUserDetails.id));
          } catch (e) {
            console.warn('Could not delete from users collection (might not exist)', e);
          }
        }

        // 3. تحديث الواجهة (إزالة المستخدم تماماً)
        setUsers(prevUsers => prevUsers.filter(u => u.id !== selectedUserDetails.id));

        toast.success('تم حذف الحساب وبياناته نهائياً من قاعدة البيانات');
      } else {
        // حذف ناعم - Soft Delete
        const deletePayload = {
          isDeleted: true,
          isActive: false, // Ensure account is inactive upon deletion
          deletedAt: new Date(),
          deletedBy: user?.uid || 'admin'
        };

        // Update in the source collection
        await updateDoc(doc(db, collectionName, selectedUserDetails.id), deletePayload);

        // Also update in users collection if it exists (for sync purposes)
        try {
          const userDocRef = doc(db, 'users', selectedUserDetails.id);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            await updateDoc(userDocRef, deletePayload);
          }
        } catch (syncError) {
          // Non-critical if users collection doesn't exist for this user
          console.warn('Could not sync deletion to users collection:', syncError);
        }

        setUsers(prevUsers => prevUsers.map(u =>
          u.id === selectedUserDetails.id
            ? { ...u, isDeleted: true, isActive: false }
            : u
        ));

        toast.success('تم تغيير حالة الحساب إلى محذوف (Soft Delete)');
      }

      setShowDeleteDialog(false);
      setIsPermanentDelete(false);
      setShowUserDetailsDialog(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('حدث خطأ في حذف الحساب');
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

  // Load users data - with pagination support for 1000+ users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        console.log('🔄 بدء تحميل بيانات المستخدمين...');

        const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents'];
        const allUsers: User[] = [];
        let totalProcessed = 0;

        // تجميع تواريخ بديلة من analytics و visits و player_join_requests
        const earliestActivityByUser: Record<string, Date> = {};
        try {
          const analyticsSnap = await getDocs(collection(db, 'analytics'));
          analyticsSnap.forEach((docSnap) => {
            const d = docSnap.data() as any;
            const uid = d.userId || d.uid || d.user_id;
            const t = safeToDate(d.timestamp || d.date);
            if (uid && t) {
              if (!earliestActivityByUser[uid] || t < earliestActivityByUser[uid]) {
                earliestActivityByUser[uid] = t;
              }
            }
          });
        } catch { }
        try {
          const visitsSnap = await getDocs(collection(db, 'visits'));
          visitsSnap.forEach((docSnap) => {
            const d = docSnap.data() as any;
            const uid = d.userId || d.uid || d.user_id;
            const t = safeToDate(d.timestamp || d.date);
            if (uid && t) {
              if (!earliestActivityByUser[uid] || t < earliestActivityByUser[uid]) {
                earliestActivityByUser[uid] = t;
              }
            }
          });
        } catch { }
        try {
          const joinsSnap = await getDocs(collection(db, 'player_join_requests'));
          joinsSnap.forEach((docSnap) => {
            const d = docSnap.data() as any;
            const uid = d.playerId || d.userId || d.uid;
            const t = safeToDate(d.requestedAt || d.createdAt || d.created_at);
            if (uid && t) {
              if (!earliestActivityByUser[uid] || t < earliestActivityByUser[uid]) {
                earliestActivityByUser[uid] = t;
              }
            }
          });
        } catch { }
        const fallbackActivityCount = Object.keys(earliestActivityByUser).length;
        if (fallbackActivityCount > 0) {
          console.log(`🗂️ تم تجميع تواريخ بديلة لنشاط ${fallbackActivityCount} مستخدم لاستخدامها كتاريخ تسجيل عند الحاجة`);
        }

        // أولاً، جلب جميع المنظمات للـ cache
        const orgsCache: { [key: string]: string } = {};
        for (const collectionName of ['clubs', 'academies', 'agents', 'trainers']) {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            snapshot.forEach(doc => {
              const data = doc.data();
              const orgName = data.name || data.full_name || data.club_name || data.academy_name || data.agent_name || data.trainer_name || '';
              orgsCache[`${collectionName.replace(/s$/, '')}_${doc.id}`] = orgName;
            });
          } catch (e) {
            // تجاهل
          }
        }
        setOrganizationsCache(orgsCache);
        console.log(`📚 تم تحميل ${Object.keys(orgsCache).length} منظمة في الـ cache`);

        for (const collectionName of collections) {
          try {
            console.log(`📋 جاري تحميل مجموعة: ${collectionName}`);

            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);

            console.log(`✅ تم جلب ${snapshot.size} مستند من ${collectionName}`);

            let collectionCount = 0;

            snapshot.forEach((userDoc) => {
              try {
                const data = userDoc.data();
                const accountType = (data.accountType || collectionName.replace(/s$/, '')) as any;

                // محاولة استخراج تاريخ التسجيل من مصادر متعددة
                let createdAtDate = safeToDate(
                  data.createdAt ||
                  data.created_at ||
                  data.registrationDate ||
                  data.registration_date ||
                  data.signupDate ||
                  data.signup_date ||
                  data.dateCreated ||
                  data.date_created ||
                  data.timestamp
                );

                // إذا لم نجد تاريخ، نستخدم تاريخ إنشاء المستند في Firestore (metadata)
                if (!createdAtDate && userDoc.metadata?.createTime) {
                  try {
                    createdAtDate = userDoc.metadata.createTime.toDate();
                  } catch (e) {
                    // تجاهل
                  }
                }

                // محاولة ثالثة: استخدام أقدم نشاط معروف لهذا المستخدم من analytics/visits/join_requests
                if (!createdAtDate) {
                  const candidate = earliestActivityByUser[userDoc.id];
                  if (candidate) {
                    createdAtDate = candidate;
                  }
                }

                const profileCompletion = calculateProfileCompletion(data, accountType);

                // تحديد نوع التسجيل واسم المنظمة
                const parentId = data.parentAccountId || data.parent_account_id || data.clubId || data.club_id || data.academyId || data.academy_id || data.agentId || data.agent_id || data.trainerId || data.trainer_id || '';
                const parentType = data.parentAccountType || data.parent_account_type ||
                  (data.clubId || data.club_id ? 'club' : '') ||
                  (data.academyId || data.academy_id ? 'academy' : '') ||
                  (data.agentId || data.agent_id ? 'agent' : '') ||
                  (data.trainerId || data.trainer_id ? 'trainer' : '') || '';

                const parentOrgName = parentId && parentType ? (orgsCache[`${parentType}_${parentId}`] || '') : '';
                const registrationType = parentId ? 'organization' : 'direct';

                const userData: User = {
                  id: userDoc.id,
                  name: data.name || data.full_name || data.displayName || data.club_name || data.academy_name || data.agent_name || data.trainer_name || 'غير محدد',
                  email: data.email || '',
                  phone: data.phone || data.phoneNumber || '',
                  countryCode: data.countryCode || data.country_code || '', // كود البلد من التسجيل
                  accountType: accountType,
                  isActive: data.isActive !== false,
                  createdAt: createdAtDate,
                  lastLogin: safeToDate(data.lastLogin || data.last_login || data.lastAccessTime),
                  city: data.city || data.location?.city || '',
                  country: data.country || data.location?.country || '',
                  parentAccountId: parentId,
                  parentAccountType: parentType,
                  parentOrganizationName: parentOrgName,
                  registrationType: registrationType,
                  isDeleted: data.isDeleted || data.deleted || false,
                  verificationStatus: data.verificationStatus || data.verification_status || 'pending',
                  profileCompletion: profileCompletion,
                  profileCompleted: profileCompletion >= 80,
                  suspendReason: data.suspendReason || undefined,
                  suspendedAt: safeToDate(data.suspendedAt)
                };

                allUsers.push(userData);
                collectionCount++;
                totalProcessed++;

                if (totalProcessed % 100 === 0) {
                  console.log(`⏳ تمت معالجة ${totalProcessed} مستخدم...`);
                }
              } catch (docError) {
                console.error(`❌ خطأ في معالجة المستند ${userDoc.id}:`, docError);
                // محاولة fallback: إضافة المستخدم بأقل معلومات ممكنة
                try {
                  const data = userDoc.data();
                  const accountType = (data.accountType || collectionName.replace(/s$/, '')) as any;

                  // محاولة أخيرة لاستخراج التاريخ من metadata
                  let fallbackDate = null;
                  try {
                    if (userDoc.metadata?.createTime) {
                      fallbackDate = userDoc.metadata.createTime.toDate();
                    }
                  } catch (e) {
                    // تجاهل
                  }

                  // إن لم يتوفر، جرّب تاريخ النشاط الأقدم
                  if (!fallbackDate) {
                    const candidate = earliestActivityByUser[userDoc.id];
                    if (candidate) {
                      fallbackDate = candidate;
                    }
                  }

                  const parentId = data.parentAccountId || data.parent_account_id || data.clubId || data.club_id || data.academyId || data.academy_id || '';
                  const parentType = data.parentAccountType || data.parent_account_type || '';
                  const parentOrgName = parentId && parentType ? (orgsCache[`${parentType}_${parentId}`] || '') : '';

                  allUsers.push({
                    id: userDoc.id,
                    name: data.name || data.full_name || data.displayName || data.club_name || data.academy_name || data.agent_name || data.trainer_name || 'غير محدد',
                    email: data.email || '',
                    phone: data.phone || data.phoneNumber || '',
                    countryCode: data.countryCode || data.country_code || '', // كود البلد من التسجيل
                    accountType: accountType,
                    isActive: data.isActive !== false,
                    createdAt: fallbackDate,
                    lastLogin: null,
                    city: data.city || data.location?.city || '',
                    country: data.country || data.location?.country || '',
                    parentAccountId: parentId,
                    parentAccountType: parentType,
                    parentOrganizationName: parentOrgName,
                    registrationType: parentId ? 'organization' : 'unknown',
                    isDeleted: data.isDeleted || data.deleted || false,
                    verificationStatus: data.verificationStatus || data.verification_status || 'pending',
                    profileCompletion: 0,
                    profileCompleted: false,
                    suspendReason: data.suspendReason || undefined,
                    suspendedAt: safeToDate(data.suspendedAt)
                  });
                  collectionCount++;
                  totalProcessed++;
                  console.log(`⚠️ تمت إضافة ${userDoc.id} بمعلومات محدودة`);
                } catch (fallbackError) {
                  console.error(`❌ فشل تماماً: ${userDoc.id}`);
                }
              }
            });

            console.log(`✔️ ${collectionName}: تمت معالجة ${collectionCount} مستخدم`);
          } catch (error) {
            console.error(`❌ خطأ في تحميل ${collectionName}:`, error);
          }
        }

        // إزالة التكرارات - نفس المستخدم موجود في مجموعات متعددة (users + players/academies/etc)
        const uniqueUsersMap = new Map<string, User>();
        let duplicatesCount = 0;

        allUsers.forEach(user => {
          if (!uniqueUsersMap.has(user.id)) {
            // مستخدم جديد - إضافة
            uniqueUsersMap.set(user.id, user);
          } else {
            // مستخدم مكرر - تخطي
            duplicatesCount++;

            // اختياري: دمج البيانات إذا كانت النسخة الجديدة أكمل
            const existingUser = uniqueUsersMap.get(user.id)!;
            if (user.profileCompletion > existingUser.profileCompletion) {
              // النسخة الجديدة أفضل، استبدال
              uniqueUsersMap.set(user.id, user);
            }
          }
        });

        const uniqueUsers = Array.from(uniqueUsersMap.values());
        const usersWithoutDate = uniqueUsers.filter(u => !u.createdAt).length;

        console.log(`📊 ✅ إجمالي المستخدمين المحملين: ${allUsers.length}`);
        if (duplicatesCount > 0) {
          console.log(`🔄 تم إزالة ${duplicatesCount} تكرار - المستخدمين الفريدين: ${uniqueUsers.length}`);
        }
        console.log(`📈 التوزيع حسب النوع:
          - Players: ${uniqueUsers.filter(u => u.accountType === 'player').length}
          - Academies: ${uniqueUsers.filter(u => u.accountType === 'academy').length}
          - Clubs: ${uniqueUsers.filter(u => u.accountType === 'club').length}
          - Agents: ${uniqueUsers.filter(u => u.accountType === 'agent').length}
          - Trainers: ${uniqueUsers.filter(u => u.accountType === 'trainer').length}
          - Users: ${uniqueUsers.filter(u => u.accountType === 'user').length}
        `);
        console.log(`⏰ حالة التواريخ:
          - مع تاريخ: ${uniqueUsers.length - usersWithoutDate}
          - بدون تاريخ: ${usersWithoutDate} ${usersWithoutDate > 0 ? '⚠️' : '✅'}
        `);

        if (usersWithoutDate > 0) {
          console.warn(`⚠️ تحذير: ${usersWithoutDate} مستخدم ليس لديهم تاريخ تسجيل محدد`);
          console.log(`💡 يمكنك فلترتهم باختيار "بدون تاريخ" من فلتر تاريخ التسجيل`);
        }

        setUsers(uniqueUsers);
        await loadVisitStats();

        if (allUsers.length === 0) {
          toast.warning('لم يتم العثور على أي مستخدمين.');
        } else {
          toast.success(`✅ تم تحميل ${allUsers.length.toLocaleString()} مستخدم بنجاح`);
        }
      } catch (error) {
        console.error('❌ خطأ عام:', error);
        toast.error('حدث خطأ في تحميل البيانات');
      } finally {
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

  // Filter and sort users
  const filteredAndSortedUsers = getUsersByTab().filter(user => {
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
      if (dateFilter === 'noDate') return !user.createdAt; // فلتر خاص للمستخدمين بدون تاريخ
      if (!user.createdAt) return false; // إخفاء المستخدمين بدون تواريخ من الفلاتر الأخرى

      const userDate = user.createdAt;
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case 'today':
          return userDate.toDateString() === today.toDateString();
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
        default:
          return true;
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

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

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
      user: 'مستخدم'
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

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'verify' | 'delete' | 'restore') => {
    if (selectedUsers.length === 0) {
      toast.error('لم يتم اختيار أي مستخدمين');
      return;
    }

    try {
      const promises = selectedUsers.map(async userId => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return Promise.resolve();

        const collectionName = targetUser.accountType === 'user' ? 'users' : `${targetUser.accountType}s`;
        const userRef = doc(db, collectionName, userId);

        switch (action) {
          case 'activate':
            return updateDoc(userRef, { isActive: true });
          case 'deactivate':
            return updateDoc(userRef, { isActive: false });
          case 'verify':
            return updateDoc(userRef, { verificationStatus: 'verified' });
          case 'delete': {
            const deletePayload = {
              isDeleted: true,
              isActive: false, // Ensure account is inactive upon deletion
              deletedAt: new Date(),
              deletedBy: user?.uid || 'admin'
            };
            // Update in source collection
            const updatePromise = updateDoc(userRef, deletePayload);
            // Also sync to users collection if exists
            const syncPromise = getDoc(doc(db, 'users', userId)).then(userDoc => {
              if (userDoc.exists()) {
                return updateDoc(doc(db, 'users', userId), deletePayload);
              }
            }).catch(() => {
              // Non-critical if users collection doesn't exist
            });
            return Promise.all([updatePromise, syncPromise]);
          }
          case 'restore': {
            const restorePayload = {
              isDeleted: false,
              isActive: true,
              restoredAt: new Date(),
              restoredBy: user?.uid || 'admin'
            };
            // Update in source collection
            const updatePromise = updateDoc(userRef, restorePayload);
            // Also sync to users collection if exists
            const syncPromise = getDoc(doc(db, 'users', userId)).then(userDoc => {
              if (userDoc.exists()) {
                return updateDoc(doc(db, 'users', userId), restorePayload);
              }
            }).catch(() => {
              // Non-critical if users collection doesn't exist
            });
            return Promise.all([updatePromise, syncPromise]);
          }
        }
      });

      await Promise.all(promises);

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

      setSelectedUsers([]);

      const actionLabels = {
        activate: 'تفعيل',
        deactivate: 'تعطيل',
        verify: 'توثيق',
        delete: 'حذف',
        restore: 'استرجاع'
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
        <div className="p-8 text-center text-gray-500">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-2xl font-bold text-gray-800">جاري تحميل بيانات المستخدمين...</p>
          <p className="text-lg mt-3 text-gray-600">نقوم بجلب جميع المستخدمين من 6 مجموعات</p>
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              ⏳ قد يستغرق هذا دقيقة لتحميل أكثر من 1000 مستخدم...
            </p>
            <p className="text-xs text-blue-600 mt-2">
              يرجى الانتظار وعدم إغلاق الصفحة
            </p>
          </div>
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:0.1s]"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
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
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                  <UserCog className="h-10 w-10 text-blue-600" />
                  إدارة المستخدمين المتقدمة
                </h1>
                <p className="text-gray-600 mt-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  نظام شامل لإدارة وتحليل <span className="font-bold text-blue-600">{users.length.toLocaleString()}</span> مستخدم مسجل
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  تحديث
                </Button>
                <Button onClick={exportToExcel} className="gap-2 bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4" />
                  تصدير Excel ({filteredAndSortedUsers.length})
                </Button>
              </div>
            </div>
          </div>

          {/* Warning for users without dates */}
          {stats.noDate > 0 && (
            <Card className="mb-6 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-bold text-yellow-900 mb-1">
                      ⚠️ تنبيه: {stats.noDate.toLocaleString()} مستخدم بدون تاريخ تسجيل
                    </h3>
                    <p className="text-sm text-yellow-800">
                      هناك {stats.noDate.toLocaleString()} مستخدم ليس لديهم تاريخ تسجيل محدد في قاعدة البيانات.
                      يمكنك فلترتهم باختيار <span className="font-bold">"بدون تاريخ"</span> من فلتر تاريخ التسجيل.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDateFilter('noDate');
                        setShowAdvancedFilters(true);
                      }}
                      className="mt-2 bg-yellow-100 hover:bg-yellow-200 border-yellow-400 text-yellow-900"
                    >
                      عرض المستخدمين بدون تاريخ
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">إجمالي المستخدمين</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-green-600 font-semibold">{stats.active.toLocaleString()} نشط</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-red-600 font-semibold">{stats.inactive.toLocaleString()} معطل</span>
                    </div>
                  </div>
                  <Users className="h-12 w-12 text-blue-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* إحصائيات أرقام الهواتف */}
            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">أرقام صحيحة</p>
                    <p className="text-3xl font-bold text-green-600">
                      {users.filter(user => {
                        if (!user.phone || !user.countryCode) return false;
                        return validateUserPhone(user).isValid;
                      }).length}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-green-600 font-semibold">مطابقة للبلد</span>
                    </div>
                  </div>
                  <CheckCircle2 className="h-12 w-12 text-green-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">أرقام غير صحيحة</p>
                    <p className="text-3xl font-bold text-red-600">
                      {users.filter(user => {
                        if (!user.phone || !user.countryCode) return true;
                        return !validateUserPhone(user).isValid;
                      }).length}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      <span className="text-red-600 font-semibold">تحتاج إصلاح</span>
                    </div>
                  </div>
                  <AlertCircle className="h-12 w-12 text-red-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">بدون كود بلد</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {users.filter(user => user.phone && !user.countryCode).length}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Globe className="h-3 w-3 text-orange-500" />
                      <span className="text-orange-600 font-semibold">يمكن اكتشافها</span>
                    </div>
                  </div>
                  <Globe className="h-12 w-12 text-orange-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">اللاعبين</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.byType.player.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">أكبر فئة</p>
                  </div>
                  <Activity className="h-12 w-12 text-purple-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">الأكاديميات</p>
                    <p className="text-3xl font-bold text-green-600">{stats.byType.academy.toLocaleString()}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {stats.byType.club.toLocaleString()} نادي • {stats.byType.agent.toLocaleString()} وكيل
                    </div>
                  </div>
                  <Shield className="h-12 w-12 text-green-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">اكتمال الملف</p>
                    <p className="text-3xl font-bold text-green-600">{stats.profileComplete.toLocaleString()}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {stats.profileIncomplete.toLocaleString()} غير مكتمل
                    </div>
                  </div>
                  <CheckCircle2 className="h-12 w-12 text-yellow-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">الزيارات الكلية</p>
                    <p className="text-3xl font-bold text-orange-600">{visitStats.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {Object.keys(visitStats.byCountry).length} دولة
                    </p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-orange-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">مستخدمين جدد</p>
                    <p className="text-3xl font-bold text-indigo-600">{stats.newToday.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.newThisWeek.toLocaleString()} هذا الأسبوع
                    </p>
                  </div>
                  <Calendar className="h-12 w-12 text-indigo-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-teal-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">تسجيل مباشر</p>
                    <p className="text-3xl font-bold text-teal-600">{stats.byRegistrationType.direct.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.byRegistrationType.organization.toLocaleString()} عبر منظمة
                    </p>
                  </div>
                  <Building2 className="h-12 w-12 text-teal-600 opacity-80" />
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
                {/* Weekly Chart - Compact */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4" />
                    آخر 7 أيام
                  </h4>
                  <div className="grid grid-cols-7 gap-2">
                    {visitStats.last7Days.map((day, index) => {
                      const percentage = maxVisitsInWeek > 0 ? (day.count / maxVisitsInWeek) * 100 : 0;
                      const isToday = day.date === new Date().toLocaleDateString('en-GB');

                      return (
                        <div key={index} className="text-center">
                          <div className="h-20 bg-gray-100 rounded relative mb-1 overflow-hidden">
                            <div
                              className={`absolute bottom-0 left-0 right-0 transition-all ${isToday ? 'bg-blue-500' : 'bg-gray-400'
                                }`}
                              style={{ height: `${percentage}%` }}
                            ></div>
                          </div>
                          <p className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                            {day.count}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{day.dayName.substring(0, 3)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Pages - Compact */}
                {Object.keys(visitStats.byPage).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                      <Globe className="h-4 w-4" />
                      أكثر الصفحات زيارة
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(visitStats.byPage)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([page, count]) => (
                          <div key={page} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                            <span className="text-gray-700 truncate flex-1">{getPageLabel(page)}</span>
                            <span className="font-semibold text-blue-600 ml-2">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Geography - Compact Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                      <Globe className="h-4 w-4" />
                      الدول ({Object.keys(visitStats.byCountry).length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(visitStats.byCountry)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([country, count]) => (
                          <div key={country} className="flex justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                            <span className="text-gray-700 truncate">{country}</span>
                            <span className="font-semibold text-blue-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                      <MapPin className="h-4 w-4" />
                      المدن ({Object.keys(visitStats.byCity).length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(visitStats.byCity)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([city, count]) => (
                          <div key={city} className="flex justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                            <span className="text-gray-700 truncate">{city}</span>
                            <span className="font-semibold text-green-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Recent Visits - Compact */}
                {visitStats.recentVisits.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                      <Clock className="h-4 w-4" />
                      آخر الزيارات
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {visitStats.recentVisits.slice(0, 5).map((visit, index) => (
                        <div key={index} className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 rounded hover:bg-gray-100">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{visit.country} - {visit.city}</span>
                          </div>
                          <span className="text-gray-500 text-xs ml-2 flex-shrink-0">
                            {visit.timestamp.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      <Button
                        size="sm"
                        onClick={() => handleBulkAction('restore')}
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        استرجاع ({selectedUsers.length})
                      </Button>
                    )}
                    {activeTab !== 'deleted' && (
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
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-0">
              <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as any);
                setSelectedUsers([]);
                setCurrentPage(1);
              }}>
                <TabsList className="grid w-full md:w-[600px] grid-cols-3 mb-4">
                  <TabsTrigger value="active" className="gap-2">
                    <UserCheck className="h-4 w-4" />
                    النشطين ({stats.active.toLocaleString()})
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="gap-2">
                    <UserX className="h-4 w-4" />
                    المعطلين ({stats.inactive.toLocaleString()})
                  </TabsTrigger>
                  <TabsTrigger value="deleted" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    المحذوفين ({stats.deleted.toLocaleString()})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  <CardTitle className="flex items-center justify-between flex-wrap gap-3 pb-4">
                    <span className="flex items-center gap-2">
                      <Users className="h-6 w-6 text-gray-700" />
                      قائمة المستخدمين
                    </span>
                    <span className="text-sm font-normal text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
                      عرض <span className="font-bold text-blue-600">{filteredAndSortedUsers.length.toLocaleString()}</span> من <span className="font-bold text-blue-600">{getUsersByTab().length.toLocaleString()}</span> مستخدم
                    </span>
                  </CardTitle>
                </TabsContent>
              </Tabs>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="text-right p-4 font-semibold text-gray-700 w-12">
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
                          className="rounded h-5 w-5 cursor-pointer"
                        />
                      </th>
                      <th className="text-right p-4 font-semibold text-gray-700">الاسم</th>
                      <th className="text-right p-4 font-semibold text-gray-700">البريد</th>
                      <th className="text-right p-4 font-semibold text-gray-700">الهاتف</th>
                      <th className="text-right p-4 font-semibold text-gray-700">النوع</th>
                      <th className="text-right p-4 font-semibold text-gray-700">المنظمة</th>
                      <th className="text-right p-4 font-semibold text-gray-700">التوثيق</th>
                      <th className="text-right p-4 font-semibold text-gray-700">اكتمال الملف</th>
                      <th className="text-right p-4 font-semibold text-gray-700">الموقع</th>
                      <th className="text-right p-4 font-semibold text-gray-700">التسجيل</th>
                      <th className="text-right p-4 font-semibold text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedUsers.map((user) => {
                      const isNew = user.createdAt && (new Date().getTime() - user.createdAt.getTime()) < 24 * 60 * 60 * 1000;

                      return (
                        <tr key={user.id} className={`hover:bg-blue-50 transition-colors ${isNew ? 'bg-green-50' : ''}`}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              title={`تحديد ${user.name}`}
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded h-5 w-5 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900">{user.name}</p>
                                  {isNew && (
                                    <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">
                                      جديد!
                                    </Badge>
                                  )}
                                  {!user.isActive && (
                                    <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5">
                                      موقوف
                                    </Badge>
                                  )}
                                  {user.isDeleted && (
                                    <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
                                      محذوف
                                    </Badge>
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
                            <div className="flex items-center gap-2 text-gray-700">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{user.email || 'غير محدد'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <div className="flex flex-col gap-1">
                                <span className="text-sm">{user.phone || 'غير محدد'}</span>
                                {user.phone && user.countryCode && (() => {
                                  const validation = validateUserPhone(user);
                                  if (!validation.isValid) {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3 text-red-500" />
                                        <span className="text-xs text-red-600">{validation.error}</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      <span className="text-xs text-green-600">صحيح</span>
                                    </div>
                                  );
                                })()}
                                {user.phone && !user.countryCode && (() => {
                                  const detectedCountry = detectCountryFromPhone(user.phone);
                                  if (detectedCountry) {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <Globe className="h-3 w-3 text-blue-500" />
                                        <span className="text-xs text-blue-600">مكتشف: {detectedCountry.name}</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3 text-orange-500" />
                                      <span className="text-xs text-orange-600">كود البلد غير محدد</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getAccountTypeColor(user.accountType)} border font-semibold`}>
                              {getAccountTypeLabel(user.accountType)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {user.parentOrganizationName ? (
                              <div className="flex flex-col gap-1">
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                                  🏢 {user.parentOrganizationName}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  ({getAccountTypeLabel(user.parentAccountType)})
                                </span>
                              </div>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                                📝 تسجيل مباشر
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge className={`${getVerificationColor(user.verificationStatus)} border font-semibold`}>
                              {getVerificationLabel(user.verificationStatus)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${user.profileCompletion >= 80
                                    ? 'bg-green-500'
                                    : user.profileCompletion >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                    }`}
                                  style={{ width: `${user.profileCompletion}%` }}
                                ></div>
                              </div>
                              <Badge className={`${getProfileCompletionBgColor(user.profileCompletion)} border font-bold text-xs`}>
                                {user.profileCompletion}%
                              </Badge>
                            </div>
                            {user.profileCompletion < 80 && (
                              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                غير مكتمل
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900 flex items-center gap-1">
                                <Globe className="h-3 w-3 text-gray-400" />
                                {user.country || 'غير محدد'}
                              </p>
                              <p className="text-gray-600 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                {user.city || 'غير محدد'}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            {user.createdAt ? (
                              <div className="text-sm">
                                <p className="font-medium text-gray-900">
                                  {user.createdAt.toLocaleDateString('en-GB')}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  {user.createdAt.toLocaleTimeString('en-GB')}
                                </p>
                              </div>
                            ) : (
                              <div className="text-sm">
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                                  <AlertCircle className="h-3 w-3 inline mr-1" />
                                  غير محدد
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">لا يوجد تاريخ</p>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
                                title="عرض التفاصيل"
                                onClick={() => {
                                  setSelectedUserDetails(user);
                                  setShowUserDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Verify/Reject Buttons */}
                              {user.verificationStatus === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                                    title="توثيق الحساب"
                                    onClick={() => handleVerifyAccount(user.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800"
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
                                  variant="outline"
                                  className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 hover:text-orange-800"
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
                                  variant="outline"
                                  className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
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
                                  variant="outline"
                                  className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800"
                                  title="حذف الحساب"
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
                                  variant="outline"
                                  className="bg-red-100 hover:bg-red-600 border-red-200 text-red-700 hover:text-white transition-colors"
                                  title="حذف نهائي من قاعدة البيانات"
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
                                variant="outline"
                                className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 hover:text-purple-800"
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
    </AccountTypeProtection>
  );
}
