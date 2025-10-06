'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCcw,
  Eye,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  accountType: 'player' | 'academy' | 'agent' | 'trainer' | 'club';
  isActive: boolean;
  createdAt: Date | null;
  lastLogin?: Date | null;
}

export default function UsersManagement() {
  const { user, userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load users data
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents'];
        const allUsers: User[] = [];

        for (const collectionName of collections) {
          try {
            const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
              const data = doc.data();
              allUsers.push({
                id: doc.id,
                name: data.name || data.full_name || 'غير محدد',
                email: data.email || '',
                phone: data.phone || '',
                accountType: data.accountType || collectionName.replace(/s$/, '') as any,
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate() || null,
                lastLogin: data.lastLogin?.toDate() || null
              });
            });
          } catch (error) {
            console.error(`Error loading ${collectionName}:`, error);
          }
        }

        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && userData?.accountType === 'admin') {
      loadUsers();
    }
  }, [user, userData]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || user.accountType === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesType && matchesStatus;
  });

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

  if (loading) {
    return (
      <AccountTypeProtection allowedTypes={['admin']}>
        <div className="p-8 text-center text-gray-500">
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
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
                <p className="text-gray-600 mt-1">إدارة جميع حسابات المستخدمين في النظام</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
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
                    <p className="text-2xl font-bold text-green-600">{users.filter(u => u.isActive).length}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">المستخدمين المعطلين</p>
                    <p className="text-2xl font-bold text-red-600">{users.filter(u => !u.isActive).length}</p>
                  </div>
                  <UserX className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">اللاعبين</p>
                    <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.accountType === 'player').length}</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                فلاتر البحث
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="البحث بالاسم أو البريد الإلكتروني..."
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
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>قائمة المستخدمين ({filteredUsers.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    تصدير
                  </Button>
                  <Button variant="outline" size="sm">
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
                      <th className="text-right p-4 font-medium text-gray-900">الاسم</th>
                      <th className="text-right p-4 font-medium text-gray-900">البريد الإلكتروني</th>
                      <th className="text-right p-4 font-medium text-gray-900">نوع الحساب</th>
                      <th className="text-right p-4 font-medium text-gray-900">الحالة</th>
                      <th className="text-right p-4 font-medium text-gray-900">تاريخ الإنشاء</th>
                      <th className="text-right p-4 font-medium text-gray-900">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          {user.phone && (
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          )}
                        </td>
                        <td className="p-4 text-gray-600">{user.email}</td>
                        <td className="p-4">
                          <Badge className={getAccountTypeColor(user.accountType)}>
                            {getAccountTypeLabel(user.accountType)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "نشط" : "معطل"}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-600">
                          {user.createdAt ? user.createdAt.toLocaleDateString('ar-SA') : 'غير محدد'}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Shield className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد نتائج مطابقة للبحث
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AccountTypeProtection>
  );
}