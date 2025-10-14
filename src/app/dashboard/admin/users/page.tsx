'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import {
    Activity,
    AlertCircle,
    BarChart3,
    CalendarDays,
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
    TrendingUp,
    UserCheck,
    UserCog,
    Users,
    UserX,
    XCircle,
    Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: 'user' | 'player' | 'club' | 'academy' | 'agent' | 'trainer';
  isActive: boolean;
  createdAt: Date | null;
  lastLogin: Date | null;
  city: string;
  country: string;
  parentAccountId: string;
  parentAccountType: string;
  isDeleted: boolean;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  profileCompletion: number;
  profileCompleted: boolean;
}

interface VisitStats {
  total: number;
  byCountry: { [key: string]: number };
  byCity: { [key: string]: number };
  byDate: { [key: string]: number };
  recentVisits: Array<{
    country: string;
    city: string;
    timestamp: Date;
    userId?: string;
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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [visitStats, setVisitStats] = useState<VisitStats>({
    total: 0,
    byCountry: {},
    byCity: {},
    byDate: {},
    recentVisits: []
  });
  const [showVisitDetails, setShowVisitDetails] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'deleted'>('active');

  // دالة لحساب نسبة اكتمال الملف الشخصي
  const calculateProfileCompletion = (data: any, accountType: string): number => {
    try {
      const basicFields = ['name', 'full_name', 'email', 'phone', 'country', 'city'];
      let requiredFields: string[] = [...basicFields];

      switch (accountType) {
        case 'player':
          requiredFields = [
            ...basicFields,
            'birth_date',
            'nationality',
            'primary_position',
            'preferred_foot',
            'height',
            'weight',
            'profile_image_url'
          ];
          break;
        case 'academy':
          requiredFields = [
            ...basicFields,
            'academy_name',
            'description',
            'address',
            'logo'
          ];
          break;
        case 'club':
          requiredFields = [
            ...basicFields,
            'club_name',
            'description',
            'address',
            'logo'
          ];
          break;
        case 'agent':
          requiredFields = [
            ...basicFields,
            'agent_name',
            'description',
            'profile_image'
          ];
          break;
        case 'trainer':
          requiredFields = [
            ...basicFields,
            'trainer_name',
            'specialization',
            'profile_image'
          ];
          break;
      }

      const fieldWeight = 100 / requiredFields.length;
      let completedWeight = 0;

      requiredFields.forEach(field => {
        const value = data[field] || data[field.replace('_', '')];
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
      });

      return Math.round(completedWeight);
    } catch (error) {
      console.error('خطأ في حساب نسبة اكتمال الملف:', error);
      return 0;
    }
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
        recentVisits: []
      };

      try {
        const analyticsRef = collection(db, 'analytics');
        const analyticsSnapshot = await getDocs(analyticsRef);

        analyticsSnapshot.forEach(doc => {
          const data = doc.data();
          const date = data.timestamp?.toDate() || data.date?.toDate();

          if (date) {
            const dateKey = date.toLocaleDateString('en-GB');
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
          }

          if (data.country) {
            stats.byCountry[data.country] = (stats.byCountry[data.country] || 0) + 1;
          }

          if (data.city) {
            stats.byCity[data.city] = (stats.byCity[data.city] || 0) + 1;
          }

          stats.total++;

          if (date && date >= today) {
            stats.recentVisits.push({
              country: data.country || 'غير محدد',
              city: data.city || 'غير محدد',
              timestamp: date,
              userId: data.userId
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
          const date = data.timestamp?.toDate();

          if (date) {
            const dateKey = date.toLocaleDateString('en-GB');
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
          }

          if (data.country) {
            stats.byCountry[data.country] = (stats.byCountry[data.country] || 0) + 1;
          }

          if (data.city) {
            stats.byCity[data.city] = (stats.byCity[data.city] || 0) + 1;
          }

          stats.total++;

          if (date && date >= today) {
            stats.recentVisits.push({
              country: data.country || 'غير محدد',
              city: data.city || 'غير محدد',
              timestamp: date,
              userId: data.userId
            });
          }
        });
      } catch (error) {
        console.error('خطأ في جلب الزيارات:', error);
      }

      stats.recentVisits.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      stats.recentVisits = stats.recentVisits.slice(0, 10);

      setVisitStats(stats);
      console.log('📊 إحصائيات الزيارات:', stats);
    } catch (error) {
      console.error('خطأ في تحميل إحصائيات الزيارات:', error);
    }
  };

  // Load users data
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        console.log('🔄 بدء تحميل بيانات المستخدمين...');

        const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents'];
        const allUsers: User[] = [];

        for (const collectionName of collections) {
          try {
            console.log(`📋 جاري تحميل مجموعة: ${collectionName}`);
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            
            console.log(`✅ تم جلب ${snapshot.size} مستند من ${collectionName}`);

            snapshot.docs.forEach((userDoc) => {
              try {
                const data = userDoc.data();
                const accountType = (data.accountType || collectionName.replace(/s$/, '')) as any;

                const profileCompletion = calculateProfileCompletion(data, accountType);

                const userData: User = {
                  id: userDoc.id,
                  name: data.name || data.full_name || data.displayName || data.club_name || data.academy_name || data.agent_name || data.trainer_name || 'غير محدد',
                  email: data.email || '',
                  phone: data.phone || data.phoneNumber || '',
                  accountType: accountType,
                  isActive: data.isActive !== false,
                  createdAt: data.createdAt?.toDate() || data.created_at?.toDate() || null,
                  lastLogin: data.lastLogin?.toDate() || data.last_login?.toDate() || null,
                  city: data.city || data.location?.city || '',
                  country: data.country || data.location?.country || '',
                  parentAccountId: data.parentAccountId || data.parent_account_id || '',
                  parentAccountType: data.parentAccountType || data.parent_account_type || '',
                  isDeleted: data.isDeleted || data.deleted || false,
                  verificationStatus: data.verificationStatus || data.verification_status || 'pending',
                  profileCompletion: profileCompletion,
                  profileCompleted: profileCompletion >= 80
                };
                
                allUsers.push(userData);
              } catch (docError) {
                console.error(`خطأ في معالجة المستند ${userDoc.id}:`, docError);
              }
            });
          } catch (error) {
            console.error(`❌ خطأ في تحميل ${collectionName}:`, error);
          }
        }

        console.log(`📊 إجمالي المستخدمين المحملين: ${allUsers.length}`);
        setUsers(allUsers);

        await loadVisitStats();

        if (allUsers.length === 0) {
          toast.warning('لم يتم العثور على أي مستخدمين. تحقق من إعدادات قاعدة البيانات.');
        } else {
          toast.success(`تم تحميل ${allUsers.length} مستخدم بنجاح`);
        }
      } catch (error) {
        console.error('❌ خطأ عام في تحميل المستخدمين:', error);
        toast.error('حدث خطأ في تحميل بيانات المستخدمين');
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
      if (!user.createdAt) return false;

      const userDate = user.createdAt;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);
      const thisMonth = new Date(today);
      thisMonth.setMonth(thisMonth.getMonth() - 1);

      switch (dateFilter) {
        case 'today':
          return userDate.toDateString() === today.toDateString();
        case 'yesterday':
          return userDate.toDateString() === yesterday.toDateString();
        case 'thisWeek':
          return userDate >= thisWeek;
        case 'thisMonth':
          return userDate >= thisMonth;
        case 'lastMonth':
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 2);
          return userDate >= lastMonth && userDate < thisMonth;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesType && matchesVerification &&
           matchesDate && matchesProfileCompletion && matchesCountry && matchesCity;
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

  // Get unique countries and cities for filters
  const uniqueCountries = Array.from(new Set(users.map(u => u.country).filter(c => c)));
  const uniqueCities = Array.from(new Set(users.map(u => u.city).filter(c => c)));

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
    byType: {
      player: users.filter(u => u.accountType === 'player' && !u.isDeleted).length,
      academy: users.filter(u => u.accountType === 'academy' && !u.isDeleted).length,
      agent: users.filter(u => u.accountType === 'agent' && !u.isDeleted).length,
      trainer: users.filter(u => u.accountType === 'trainer' && !u.isDeleted).length,
      club: users.filter(u => u.accountType === 'club' && !u.isDeleted).length,
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

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'verify' | 'delete' | 'restore') => {
    if (selectedUsers.length === 0) {
      toast.error('لم يتم اختيار أي مستخدمين');
      return;
    }

    try {
      const promises = selectedUsers.map(async userId => {
        const user = users.find(u => u.id === userId);
        if (!user) return Promise.resolve();

        const collectionName = user.accountType === 'user' ? 'users' : `${user.accountType}s`;
        const userRef = doc(db, collectionName, userId);

        switch (action) {
          case 'activate':
            return updateDoc(userRef, { isActive: true });
          case 'deactivate':
            return updateDoc(userRef, { isActive: false });
          case 'verify':
            return updateDoc(userRef, { verificationStatus: 'verified' });
          case 'delete':
            return updateDoc(userRef, { isDeleted: true, deletedAt: new Date() });
          case 'restore':
            return updateDoc(userRef, { isDeleted: false, restoredAt: new Date() });
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
            return { ...user, isDeleted: true };
          case 'restore':
            return { ...user, isDeleted: false };
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

  const exportToExcel = () => {
    const headers = ['الاسم', 'البريد الإلكتروني', 'الهاتف', 'نوع الحساب', 'الحالة', 'حالة التحقق', 'اكتمال الملف', 'الدولة', 'المدينة', 'تاريخ التسجيل', 'آخر دخول'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedUsers.map(user => [
        user.name,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">جاري تحميل بيانات المستخدمين...</p>
          <p className="text-sm mt-2">قد يستغرق هذا بضع ثوانٍ...</p>
        </div>
      </AccountTypeProtection>
    );
  }

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
                    <p className="text-sm font-medium text-gray-600 mb-1">حالة التوثيق</p>
                    <p className="text-3xl font-bold text-indigo-600">{stats.verified.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.pending.toLocaleString()} في الانتظار
                    </p>
                  </div>
                  <Shield className="h-12 w-12 text-indigo-600 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visit Statistics Details */}
          {visitStats.total > 0 && (
            <Card className="mb-6 border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer" onClick={() => setShowVisitDetails(!showVisitDetails)}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="h-6 w-6 text-blue-600" />
                    <span>تحليلات الزيارات التفصيلية</span>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {visitStats.total.toLocaleString()} زيارة
                    </Badge>
                  </div>
                  {showVisitDetails ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {showVisitDetails && (
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* By Country */}
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-100">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        الزيارات حسب الدولة
                      </h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {Object.entries(visitStats.byCountry)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([country, count]) => {
                            const percentage = (count / visitStats.total * 100).toFixed(1);
                            return (
                              <div key={country} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-gray-700">{country || 'غير محدد'}</span>
                                    <span className="text-sm font-bold text-blue-600">{count.toLocaleString()} زيارة</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500 mt-1">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* By City */}
                    <div className="bg-white p-5 rounded-lg border-2 border-gray-100">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                        <MapPin className="h-5 w-5 text-green-600" />
                        الزيارات حسب المدينة
                      </h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {Object.entries(visitStats.byCity)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([city, count]) => {
                            const percentage = (count / visitStats.total * 100).toFixed(1);
                            return (
                              <div key={city} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-gray-700">{city || 'غير محدد'}</span>
                                    <span className="text-sm font-bold text-green-600">{count.toLocaleString()} زيارة</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500 mt-1">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Visits */}
                  {visitStats.recentVisits.length > 0 && (
                    <div className="mt-6 bg-white p-5 rounded-lg border-2 border-gray-100">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                        <Clock className="h-5 w-5 text-purple-600" />
                        آخر الزيارات
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {visitStats.recentVisits.slice(0, 6).map((visit, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{visit.country}</p>
                                <p className="text-sm text-gray-600 truncate">{visit.city}</p>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {visit.timestamp.toLocaleTimeString('en-GB')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

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
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                      onChange={(e) => setFilterType(e.target.value)}
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
                      onChange={(e) => setFilterVerification(e.target.value)}
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
                      onChange={(e) => setFilterProfileCompletion(e.target.value)}
                      title="اختر مستوى اكتمال الملف"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع المستويات</option>
                      <option value="complete">مكتمل (80%+) ({stats.profileComplete.toLocaleString()})</option>
                      <option value="partial">جزئي (50-79%)</option>
                      <option value="minimal">قليل (&lt;50%)</option>
                      <option value="incomplete">غير مكتمل (&lt;80%) ({stats.profileIncomplete.toLocaleString()})</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الدولة</label>
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      title="اختر الدولة"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع الدول ({uniqueCountries.length})</option>
                      {uniqueCountries.sort().map(country => (
                        <option key={country} value={country}>
                          {country} ({users.filter(u => u.country === country).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المدينة</label>
                    <select
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      title="اختر المدينة"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع المدن ({uniqueCities.length})</option>
                      {uniqueCities.sort().map(city => (
                        <option key={city} value={city}>
                          {city} ({users.filter(u => u.city === city).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Registration Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ التسجيل</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      title="اختر فترة التسجيل"
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">جميع التواريخ</option>
                      <option value="today">اليوم</option>
                      <option value="yesterday">أمس</option>
                      <option value="thisWeek">هذا الأسبوع</option>
                      <option value="thisMonth">هذا الشهر</option>
                      <option value="lastMonth">الشهر الماضي</option>
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
                      setDateFilter('all');
                      setSortBy('createdAt');
                      setSortOrder('desc');
                      setCurrentPage(1);
                      toast.success('تم إعادة تعيين الفلاتر');
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
                          تعطيل
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBulkAction('verify')}
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                          <Shield className="h-4 w-4" />
                          توثيق
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
                          تفعيل
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
                        استرجاع
                      </Button>
                    )}
                    {activeTab !== 'deleted' && (
                      <Button
                        size="sm"
                        onClick={() => handleBulkAction('delete')}
                        className="bg-red-600 hover:bg-red-700 text-white gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        حذف
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
                      <th className="text-right p-4 font-semibold text-gray-700">
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
                      <th className="text-right p-4 font-semibold text-gray-700">التوثيق</th>
                      <th className="text-right p-4 font-semibold text-gray-700">اكتمال الملف</th>
                      <th className="text-right p-4 font-semibold text-gray-700">الموقع</th>
                      <th className="text-right p-4 font-semibold text-gray-700">التسجيل</th>
                      <th className="text-right p-4 font-semibold text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50 transition-colors">
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
                              <p className="font-semibold text-gray-900">{user.name}</p>
                              {user.lastLogin && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {user.lastLogin.toLocaleDateString('en-GB')}
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
                            <span className="text-sm">{user.phone || 'غير محدد'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${getAccountTypeColor(user.accountType)} border font-semibold`}>
                            {getAccountTypeLabel(user.accountType)}
                          </Badge>
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
                                className={`h-2.5 rounded-full ${
                                  user.profileCompletion >= 80
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
                            <span className="text-gray-400">غير محدد</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
                              title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 hover:text-orange-800"
                              title="إدارة الصلاحيات"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                        الأخير
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </AccountTypeProtection>
  );
}
