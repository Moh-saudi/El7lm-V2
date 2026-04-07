'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Mail,
  RefreshCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Loader2,
  Download,
  Upload,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';


interface UserEmailData {
  id: string;
  name: string;
  currentEmail: string;
  newEmail: string;
  phone?: string;
  accountType: string;
  needsUpdate: boolean;
  status: 'pending' | 'updated' | 'error';
  error?: string;
}

interface Stats {
  total: number;
  needsUpdate: number;
  updated: number;
  errors: number;
}

export default function EmailMigration() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [users, setUsers] = useState<UserEmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    needsUpdate: 0,
    updated: 0,
    errors: 0
  });

  useEffect(() => {
    // التحقق من صلاحيات المدير
    if (!user || userData?.accountType !== 'admin') {
      router.push('/dashboard/admin/users');
      return;
    }

    loadUsers();
  }, [user, userData, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers: UserEmailData[] = [];

      // قائمة المجموعات المختلفة
      const collections = ['users', 'players', 'clubs', 'agents', 'academies', 'trainers'];

      console.log('📂 Email Migration - Starting to load users...');

      for (const collectionName of collections) {
        try {
          console.log(`📂 Email Migration - Loading from ${collectionName}...`);
          const { data: snapshot, error: snapError } = await supabase.from(collectionName).select('*');
          const snapDocs = snapshot || [];
          console.log(`📊 Email Migration - Found ${snapDocs.length} documents in ${collectionName}`);

          // تحميل دالة إنشاء البريد الإلكتروني مرة واحدة
          const { generateTypedFirebaseEmail } = await import('@/lib/utils/firebase-email-generator');

          snapDocs.forEach(data => {
            const email = data.email || '';

            // التحقق من الإيميلات التي تحتاج تحديث
            const needsUpdate = email.includes('@hagzzgo.com') ||
              email.includes('@0199999999') ||
              /^\d+@/.test(email) || // يبدأ بأرقام
              email.includes('temp@') ||
              email.includes('placeholder@') ||
              (email.includes('user_') && email.includes('_') && email.includes('@el7lm.com') && email.length > 30); // البريد الإلكتروني الطويل

            // اقتراح إيميل جديد باستخدام النظام الجديد
            let newEmail = '';
            if (needsUpdate) {
              if (data.phone) {
                // استخدام النظام الجديد لإنشاء إيميل قصير
                const accountType = data.accountType || collectionName.slice(0, -1);
                const countryCode = data.countryCode || '+20'; // افتراضي لمصر
                newEmail = generateTypedFirebaseEmail(data.phone, countryCode, accountType);
              } else {
                // استخدام الاسم لإنشاء إيميل
                const cleanName = data.name?.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') || 'user';
                newEmail = `${cleanName}@el7lm.com`;
              }
            }

            allUsers.push({
              id: data.id,
              name: data.name || 'غير محدد',
              currentEmail: email,
              newEmail: newEmail,
              phone: data.phone,
              accountType: data.accountType || collectionName.slice(0, -1),
              needsUpdate: needsUpdate,
              status: 'pending'
            });
          });
        } catch (error) {
          console.warn(`Failed to load from ${collectionName}:`, error);
        }
      }

      // إزالة المكررات
      const uniqueUsers = allUsers.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );

      setUsers(uniqueUsers);
      updateStats(uniqueUsers);
      console.log(`✅ Email Migration - Loaded ${uniqueUsers.length} unique users`);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (usersData: UserEmailData[]) => {
    const stats = {
      total: usersData.length,
      needsUpdate: usersData.filter(u => u.needsUpdate).length,
      updated: usersData.filter(u => u.status === 'updated').length,
      errors: usersData.filter(u => u.status === 'error').length
    };
    setStats(stats);
  };

  const updateUserEmail = async (userId: string, newEmail: string, accountType: string) => {
    try {
      // استخدام API الجديد لترحيل البريد الإلكتروني
      const response = await fetch('/api/admin/migrate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          collectionName: 'users', // نبدأ بمجموعة users الرئيسية
          newEmail
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'فشل في تحديث البريد الإلكتروني');
      }

      // تحديث في المجموعة الخاصة بنوع الحساب أيضاً
      const roleCollection = accountType === 'player' ? 'players' :
        accountType === 'club' ? 'clubs' :
          accountType === 'agent' ? 'agents' :
            accountType === 'academy' ? 'academies' :
              accountType === 'trainer' ? 'trainers' : null;

      if (roleCollection) {
        try {
          await supabase.from(roleCollection).update({
            email: newEmail,
            firebaseEmail: newEmail,
            emailUpdated: true,
            emailUpdatedAt: new Date().toISOString()
          }).eq('id', userId);
        } catch (roleError) {
          console.warn(`Failed to update ${roleCollection}:`, roleError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      return { success: false, error: (error as Error).message };
    }
  };

  // دالة للترحيل التلقائي لجميع المستخدمين الذين يحتاجون تحديث
  const autoMigrateAllUsers = async () => {
    const usersToMigrate = users.filter(u => u.needsUpdate && u.status === 'pending');

    if (usersToMigrate.length === 0) {
      toast.info('لا يوجد مستخدمين يحتاجون ترحيل');
      return;
    }

    setUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    toast.info(`بدء ترحيل ${usersToMigrate.length} مستخدم...`);

    for (const user of usersToMigrate) {
      if (!user.newEmail) continue;

      const result = await updateUserEmail(user.id, user.newEmail, user.accountType);

      setUsers(prev => prev.map(u =>
        u.id === user.id ? {
          ...u,
          status: result.success ? 'updated' as const : 'error' as const,
          error: result.success ? undefined : result.error,
          currentEmail: result.success ? user.newEmail : u.currentEmail
        } : u
      ));

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // تأخير صغير لتجنب الضغط على الخادم
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setUpdating(false);

    toast.success(`تم ترحيل ${successCount} مستخدم بنجاح`);
    if (errorCount > 0) {
      toast.error(`فشل ترحيل ${errorCount} مستخدم`);
    }

    updateStats(users);
  };

  const updateSingleUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.newEmail) return;

    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, status: 'pending' as const } : u
    ));

    const result = await updateUserEmail(userId, user.newEmail, user.accountType);

    setUsers(prev => prev.map(u =>
      u.id === userId ? {
        ...u,
        status: result.success ? 'updated' as const : 'error' as const,
        error: result.success ? undefined : result.error,
        currentEmail: result.success ? user.newEmail : u.currentEmail
      } : u
    ));

    if (result.success) {
      toast.success(`تم تحديث إيميل ${user.name} بنجاح`);
    } else {
      toast.error(`فشل تحديث إيميل ${user.name}: ${result.error}`);
    }

    updateStats(users);
  };

  const updateSelectedUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('يرجى تحديد مستخدمين للتحديث');
      return;
    }

    setUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of selectedUsers) {
      const user = users.find(u => u.id === userId);
      if (!user || !user.newEmail) continue;

      const result = await updateUserEmail(userId, user.newEmail, user.accountType);

      setUsers(prev => prev.map(u =>
        u.id === userId ? {
          ...u,
          status: result.success ? 'updated' as const : 'error' as const,
          error: result.success ? undefined : result.error,
          currentEmail: result.success ? user.newEmail : u.currentEmail
        } : u
      ));

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setUpdating(false);
    setSelectedUsers([]);

    if (successCount > 0) {
      toast.success(`تم تحديث ${successCount} إيميل بنجاح`);
    }
    if (errorCount > 0) {
      toast.error(`فشل تحديث ${errorCount} إيميل`);
    }

    updateStats(users);
  };

  const updateAllUsers = async () => {
    const usersToUpdate = users.filter(u => u.needsUpdate && u.newEmail);

    if (usersToUpdate.length === 0) {
      toast.error('لا توجد إيميلات تحتاج للتحديث');
      return;
    }

    if (!confirm(`هل أنت متأكد من تحديث ${usersToUpdate.length} إيميل؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }

    setUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToUpdate) {
      const result = await updateUserEmail(user.id, user.newEmail, user.accountType);

      setUsers(prev => prev.map(u =>
        u.id === user.id ? {
          ...u,
          status: result.success ? 'updated' as const : 'error' as const,
          error: result.success ? undefined : result.error,
          currentEmail: result.success ? user.newEmail : u.currentEmail
        } : u
      ));

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setUpdating(false);

    if (successCount > 0) {
      toast.success(`تم تحديث ${successCount} إيميل بنجاح`);
    }
    if (errorCount > 0) {
      toast.error(`فشل تحديث ${errorCount} إيميل`);
    }

    updateStats(users);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const usersToSelect = users.filter(u => u.needsUpdate).map(u => u.id);
      setSelectedUsers(usersToSelect);
    } else {
      setSelectedUsers([]);
    }
  };

  const updateNewEmail = (userId: string, newEmail: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, newEmail } : u
    ));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'updated':
        return <Badge className="bg-green-50 text-green-600"><CheckCircle className="w-3 h-3 ml-1" />محدث</Badge>;
      case 'error':
        return <Badge className="bg-red-50 text-red-600"><XCircle className="w-3 h-3 ml-1" />خطأ</Badge>;
      default:
        return <Badge variant="outline">في الانتظار</Badge>;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    const badges = {
      player: { text: 'لاعب', color: 'bg-blue-50 text-blue-600' },
      club: { text: 'نادي', color: 'bg-indigo-50 text-indigo-600' },
      academy: { text: 'أكاديمية', color: 'bg-amber-50 text-amber-600' },
      agent: { text: 'وكيل', color: 'bg-green-50 text-green-600' },
      trainer: { text: 'مدرب', color: 'bg-purple-50 text-purple-600' }
    };

    const badge = badges[type as keyof typeof badges];
    if (!badge) return <Badge variant="outline">{type}</Badge>;

    return <Badge className={badge.color}>{badge.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="bg-gray-50">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">جاري تحميل بيانات المستخدمين...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">

      <main className="flex-1 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/admin/users')}
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">تحديث الإيميلات</h1>
              <p className="text-gray-600">تحويل الإيميلات من النظام القديم إلى إيميلات حقيقية</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUsers} disabled={updating}>
              <RefreshCcw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
            <Button
              onClick={updateAllUsers}
              disabled={updating || stats.needsUpdate === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updating ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 ml-2" />
              )}
              تحديث المحدد ({selectedUsers.length})
            </Button>

            <Button
              onClick={autoMigrateAllUsers}
              disabled={updating || stats.needsUpdate === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4 ml-2" />
              )}
              ترحيل تلقائي ({stats.needsUpdate})
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">يحتاج تحديث</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.needsUpdate}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">تم التحديث</p>
                  <p className="text-2xl font-bold text-green-600">{stats.updated}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">أخطاء</p>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-blue-900">
                  تم تحديد {selectedUsers.length} مستخدم
                </p>
                <Button size="sm" onClick={updateSelectedUsers} disabled={updating}>
                  {updating ? (
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 ml-1" />
                  )}
                  تحديث المحدد
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                إلغاء التحديد
              </Button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.filter(u => u.needsUpdate).length && users.filter(u => u.needsUpdate).length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>نوع الحساب</TableHead>
                <TableHead>الإيميل الحالي</TableHead>
                <TableHead>الإيميل الجديد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(u => u.needsUpdate).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.phone && (
                        <div className="text-sm text-gray-500">{user.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getAccountTypeBadge(user.accountType)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono bg-red-50 text-red-700 px-2 py-1 rounded">
                      {user.currentEmail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={user.newEmail}
                      onChange={(e) => updateNewEmail(user.id, e.target.value)}
                      className="text-sm"
                      disabled={user.status === 'updated'}
                    />
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.status)}
                    {user.error && (
                      <div className="text-xs text-red-600 mt-1">{user.error}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSingleUser(user.id)}
                      disabled={updating || user.status === 'updated' || !user.newEmail}
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      تحديث
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.filter(u => u.needsUpdate).length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">جميع الإيميلات محدثة!</h3>
              <p className="text-gray-500">لا توجد إيميلات تحتاج للتحديث</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 
