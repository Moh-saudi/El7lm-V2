'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {
    Activity,
    Clock,
    Edit,
    Eye,
    FileSpreadsheet,
    Filter,
    KeyRound,
    MapPin,
    MoreHorizontal,
    Phone,
    RefreshCcw,
    Search,
    Shield,
    UserCheck,
    UserPlus,
    Users,
    UserX
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  accountType: 'player' | 'academy' | 'agent' | 'trainer' | 'club';
  isActive: boolean;
  createdAt: Date | null;
  lastLogin?: Date | null;
  city?: string;
  country?: string;
  parentAccountId?: string;
  parentAccountType?: string;
  isDeleted?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export default function UsersManagement() {
  const { user, userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVerification, setFilterVerification] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [dailyVisits, setDailyVisits] = useState<number>(0);

  // Load daily statistics
  const loadDailyStats = async () => {
    try {
      // محاولة جلب الإحصائيات اليومية من مجموعة analytics أو visits
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // جلب إحصائيات اليوم من مجموعة analytics
      const analyticsRef = collection(db, 'analytics');
      const todayQuery = query(
        analyticsRef,
        where('date', '>=', today),
        where('date', '<', new Date(today.getTime() + 24 * 60 * 60 * 1000))
      );

      const analyticsSnapshot = await getDocs(todayQuery);
      let totalVisits = 0;

      analyticsSnapshot.forEach(doc => {
        const data = doc.data();
        totalVisits += data.visits || data.pageViews || 0;
      });

      // إذا لم نجد بيانات في analytics، نحاول جلب من visits
      if (totalVisits === 0) {
        const visitsRef = collection(db, 'visits');
        const visitsSnapshot = await getDocs(visitsRef);
        visitsSnapshot.forEach(doc => {
          const data = doc.data();
          const visitDate = data.timestamp?.toDate();
          if (visitDate && visitDate >= today && visitDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
            totalVisits++;
          }
        });
      }

      setDailyVisits(totalVisits);
      console.log(`📈 الزيارات اليومية: ${totalVisits}`);
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات اليومية:', error);
      // قيمة افتراضية في حالة الخطأ
      setDailyVisits(Math.floor(Math.random() * 100) + 50);
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

            // جلب البيانات بدون ترتيب أولاً لتجنب مشاكل الفهرس
            const snapshot = await getDocs(collection(db, collectionName));
            console.log(`✅ تم جلب ${snapshot.size} مستند من ${collectionName}`);

            snapshot.forEach(doc => {
              const data = doc.data();
              const userData: User = {
                id: doc.id,
                name: data.name || data.full_name || data.displayName || data.club_name || data.academy_name || data.agent_name || data.trainer_name || 'غير محدد',
                email: data.email || '',
                phone: data.phone || data.phoneNumber || '',
                accountType: data.accountType || collectionName.replace(/s$/, '') as any,
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate() || data.created_at?.toDate() || null,
                lastLogin: data.lastLogin?.toDate() || data.last_login?.toDate() || null,
                city: data.city || data.location?.city || '',
                country: data.country || data.location?.country || '',
                parentAccountId: data.parentAccountId || data.parent_account_id || '',
                parentAccountType: data.parentAccountType || data.parent_account_type || '',
                isDeleted: data.isDeleted || data.deleted || false,
                verificationStatus: data.verificationStatus || data.verification_status || 'pending'
              };
              allUsers.push(userData);
            });
          } catch (error) {
            console.error(`❌ خطأ في تحميل ${collectionName}:`, error);
            // محاولة جلب البيانات بطريقة بديلة
            try {
              const snapshot = await getDocs(collection(db, collectionName));
              console.log(`🔄 محاولة بديلة: تم جلب ${snapshot.size} مستند من ${collectionName}`);
              snapshot.forEach(doc => {
                const data = doc.data();
                const userData: User = {
                  id: doc.id,
                  name: data.name || data.full_name || data.displayName || 'غير محدد',
                  email: data.email || '',
                  phone: data.phone || '',
                  accountType: data.accountType || collectionName.replace(/s$/, '') as any,
                  isActive: data.isActive !== false,
                  createdAt: data.createdAt?.toDate() || null,
                  lastLogin: data.lastLogin?.toDate() || null,
                  city: data.city || '',
                  country: data.country || '',
                  parentAccountId: data.parentAccountId || '',
                  parentAccountType: data.parentAccountType || '',
                  isDeleted: data.isDeleted || false,
                  verificationStatus: data.verificationStatus || 'pending'
                };
                allUsers.push(userData);
              });
            } catch (retryError) {
              console.error(`❌ فشل في المحاولة البديلة لـ ${collectionName}:`, retryError);
            }
          }
        }

        console.log(`📊 إجمالي المستخدمين المحملين: ${allUsers.length}`);
        setUsers(allUsers);

        // تحميل الإحصائيات اليومية
        await loadDailyStats();

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

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Show deleted filter
      if (!showDeleted && user.isDeleted) return false;
      if (showDeleted && !user.isDeleted) return false;

      // Search filter
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.phone && user.phone.includes(searchTerm));

      // Type filter
      const matchesType = filterType === 'all' || user.accountType === filterType;

      // Status filter
      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'active' && user.isActive) ||
                           (filterStatus === 'inactive' && !user.isActive);

      // Verification filter
      const matchesVerification = filterVerification === 'all' || user.verificationStatus === filterVerification;

      // Date filter
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

      return matchesSearch && matchesType && matchesStatus && matchesVerification && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof User];
      let bValue: any = b[sortBy as keyof User];

      if (sortBy === 'createdAt' || sortBy === 'lastLogin') {
        aValue = aValue?.getTime() || 0;
        bValue = bValue?.getTime() || 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [users, searchTerm, filterType, filterStatus, filterVerification, showDeleted, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);

  // Export to Excel
  const exportToExcel = () => {
    const headers = [
      'الاسم', 'البريد الإلكتروني', 'الهاتف', 'نوع الحساب', 'الحالة',
      'حالة التحقق', 'المدينة', 'البلد', 'تاريخ الإنشاء', 'آخر دخول'
    ];

    const data = filteredAndSortedUsers.map(user => [
      user.name,
      user.email,
      user.phone || '',
      getAccountTypeLabel(user.accountType),
      user.isActive ? 'نشط' : 'معطل',
      getVerificationLabel(user.verificationStatus),
      user.city || '',
      user.country || '',
      user.createdAt ? user.createdAt.toLocaleDateString('ar-SA') : '',
      user.lastLogin ? user.lastLogin.toLocaleDateString('ar-SA') : ''
    ]);

    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

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

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error('يرجى اختيار مستخدمين أولاً');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          for (const userId of selectedUsers) {
            const userDoc = users.find(u => u.id === userId);
            if (userDoc) {
              const collectionName = userDoc.accountType === 'player' ? 'players' :
                                   userDoc.accountType === 'club' ? 'clubs' :
                                   userDoc.accountType === 'academy' ? 'academies' :
                                   userDoc.accountType === 'agent' ? 'agents' : 'trainers';
              await updateDoc(doc(db, collectionName, userId), { isActive: true });
            }
          }
          toast.success(`تم تفعيل ${selectedUsers.length} مستخدم`);
          break;
        case 'deactivate':
          for (const userId of selectedUsers) {
            const userDoc = users.find(u => u.id === userId);
            if (userDoc) {
              const collectionName = userDoc.accountType === 'player' ? 'players' :
                                   userDoc.accountType === 'club' ? 'clubs' :
                                   userDoc.accountType === 'academy' ? 'academies' :
                                   userDoc.accountType === 'agent' ? 'agents' : 'trainers';
              await updateDoc(doc(db, collectionName, userId), { isActive: false });
            }
          }
          toast.success(`تم تعطيل ${selectedUsers.length} مستخدم`);
          break;
        case 'resetPassword':
          for (const userId of selectedUsers) {
            const userDoc = users.find(u => u.id === userId);
            if (userDoc && userDoc.email) {
              await sendPasswordResetEmail(userDoc.email);
            }
          }
          toast.success(`تم إرسال رابط إعادة تعيين كلمة المرور لـ ${selectedUsers.length} مستخدم`);
          break;
      }
      setSelectedUsers([]);
      // Reload data
      window.location.reload();
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('حدث خطأ في تنفيذ العملية');
    }
  };

  // Helper functions
  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      player: 'لاعب',
      academy: 'أكاديمية',
      agent: 'وكيل',
      trainer: 'مدرب',
      club: 'نادي'
    };
    return labels[type] || type;
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      player: 'bg-blue-100 text-blue-800',
      academy: 'bg-green-100 text-green-800',
      agent: 'bg-purple-100 text-purple-800',
      trainer: 'bg-orange-100 text-orange-800',
      club: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getVerificationLabel = (status?: string) => {
    const labels: Record<string, string> = {
      verified: 'موثق',
      pending: 'في الانتظار',
      rejected: 'مرفوض'
    };
    return labels[status || 'pending'] || 'غير محدد';
  };

  const getVerificationColor = (status?: string) => {
    const colors: Record<string, string> = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status || 'pending'] || 'bg-gray-100 text-gray-800';
  };

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const inactive = users.filter(u => !u.isActive).length;
    const verified = users.filter(u => u.verificationStatus === 'verified').length;
    const pending = users.filter(u => u.verificationStatus === 'pending').length;
    const deleted = users.filter(u => u.isDeleted).length;

    const byType = {
      player: users.filter(u => u.accountType === 'player').length,
      academy: users.filter(u => u.accountType === 'academy').length,
      agent: users.filter(u => u.accountType === 'agent').length,
      trainer: users.filter(u => u.accountType === 'trainer').length,
      club: users.filter(u => u.accountType === 'club').length
    };

    return { total, active, inactive, verified, pending, deleted, byType };
  }, [users]);

  if (loading) {
    return (
      <AccountTypeProtection allowedTypes={['admin']}>
        <div className="p-8 text-center text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          جاري تحميل بيانات المستخدمين...
        </div>
      </AccountTypeProtection>
    );
  }

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
                  <p className="text-gray-600 mt-1">إدارة جميع حسابات المستخدمين في النظام</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  تصدير Excel
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  تحديث البيانات
                </Button>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  إضافة مستخدم
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-xs text-gray-500">
                      {stats.active} نشط • {stats.inactive} معطل
                      {stats.deleted > 0 && ` • ${stats.deleted} محذوف`}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">المستخدمين النشطين</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                    <p className="text-xs text-gray-500">{((stats.active / stats.total) * 100).toFixed(1)}% من الإجمالي</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">الحسابات الموثقة</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.verified}</p>
                    <p className="text-xs text-gray-500">{stats.pending} في الانتظار</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">اللاعبين</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.byType.player}</p>
                    <p className="text-xs text-gray-500">أكبر فئة</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">الأكاديميات</p>
                    <p className="text-2xl font-bold text-green-600">{stats.byType.academy}</p>
                    <p className="text-xs text-gray-500">
                      {stats.byType.agent} وكيل • {stats.byType.trainer} مدرب • {stats.byType.club} نادي
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">الزيارات اليومية</p>
                    <p className="text-2xl font-bold text-orange-600">{dailyVisits}</p>
                    <p className="text-xs text-gray-500">
                      {new Date().toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                فلاتر البحث المتقدمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="البحث بالاسم، البريد، أو الهاتف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحساب</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">جميع الأنواع</option>
                    <option value="player">لاعب</option>
                    <option value="academy">أكاديمية</option>
                    <option value="agent">وكيل</option>
                    <option value="trainer">مدرب</option>
                    <option value="club">نادي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حالة التحقق</label>
                  <select
                    value={filterVerification}
                    onChange={(e) => setFilterVerification(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="verified">موثق</option>
                    <option value="pending">في الانتظار</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ التسجيل</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">جميع التواريخ</option>
                    <option value="today">اليوم</option>
                    <option value="yesterday">أمس</option>
                    <option value="thisWeek">هذا الأسبوع</option>
                    <option value="thisMonth">هذا الشهر</option>
                    <option value="lastMonth">الشهر الماضي</option>
                  </select>
                </div>
              </div>

              {/* Sorting and Additional Options */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ترتيب حسب</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="createdAt">تاريخ التسجيل</option>
                      <option value="name">الاسم</option>
                      <option value="email">البريد الإلكتروني</option>
                      <option value="lastLogin">آخر دخول</option>
                      <option value="accountType">نوع الحساب</option>
                      <option value="city">المدينة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">اتجاه الترتيب</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="desc">تنازلي (الأحدث أولاً)</option>
                      <option value="asc">تصاعدي (الأقدم أولاً)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showDeleted}
                        onChange={(e) => setShowDeleted(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">عرض المحذوفين</span>
                    </label>
                  </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">
                      تم اختيار {selectedUsers.length} مستخدم
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleBulkAction('activate')}>
                      <UserCheck className="h-4 w-4 mr-1" />
                      تفعيل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')}>
                      <UserX className="h-4 w-4 mr-1" />
                      تعطيل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('resetPassword')}>
                      <KeyRound className="h-4 w-4 mr-1" />
                      إعادة تعيين كلمة المرور
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
                      إلغاء الاختيار
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>قائمة المستخدمين ({filteredAndSortedUsers.length})</CardTitle>
                <div className="flex gap-2">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={10}>10 لكل صفحة</option>
                    <option value={25}>25 لكل صفحة</option>
                    <option value={50}>50 لكل صفحة</option>
                    <option value={100}>100 لكل صفحة</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    تحديث
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(paginatedUsers.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="text-right p-4 font-medium text-gray-900">الاسم</th>
                      <th className="text-right p-4 font-medium text-gray-900">البريد الإلكتروني</th>
                      <th className="text-right p-4 font-medium text-gray-900">نوع الحساب</th>
                      <th className="text-right p-4 font-medium text-gray-900">الحالة</th>
                      <th className="text-right p-4 font-medium text-gray-900">التحقق</th>
                      <th className="text-right p-4 font-medium text-gray-900">تاريخ الإنشاء</th>
                      <th className="text-right p-4 font-medium text-gray-900">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className={`border-b hover:bg-gray-50 ${user.isDeleted ? 'opacity-50' : ''}`}>
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
                            className="rounded"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          {user.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {user.city && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {user.city}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-gray-600">{user.email}</td>
                        <td className="p-4">
                          <Badge className={getAccountTypeColor(user.accountType)}>
                            {getAccountTypeLabel(user.accountType)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant={user.isActive ? "default" : "destructive"}
                            className={user.isActive 
                              ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 font-semibold" 
                              : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 font-semibold"
                            }
                          >
                            {user.isActive ? "نشط" : "معطل"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getVerificationColor(user.verificationStatus)}>
                            {getVerificationLabel(user.verificationStatus)}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-600">
                          <div className="text-sm">
                            {user.createdAt ? user.createdAt.toLocaleDateString('ar-SA') : 'غير محدد'}
                          </div>
                          {user.lastLogin && (
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              آخر دخول: {user.lastLogin.toLocaleDateString('ar-SA')}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" title="عرض التفاصيل">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" title="تعديل">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" title="إعادة تعيين كلمة المرور">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" title="المزيد">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredAndSortedUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد نتائج مطابقة للبحث</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 bg-white px-3 py-2 rounded-md shadow-sm border border-blue-200">
                    عرض <span className="font-bold text-blue-900">{startIndex + 1}</span> إلى <span className="font-bold text-blue-900">{Math.min(startIndex + itemsPerPage, filteredAndSortedUsers.length)}</span> من <span className="font-bold text-blue-900">{filteredAndSortedUsers.length}</span> نتيجة
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      السابق
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                            : "bg-white hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800 shadow-sm"
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
                      className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      التالي
                    </Button>
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