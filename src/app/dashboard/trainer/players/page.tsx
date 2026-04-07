'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Camera, 
  Video, 
  Image as ImageIcon, 
  ExternalLink, 
  Trash2, 
  User, 
  Filter,
  Eye,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Player } from '@/types/player';
import SendMessageButton from '@/components/messaging/SendMessageButton';
import CreateLoginAccountButton from '@/components/ui/CreateLoginAccountButton';
import LoginAccountStatus from '@/components/ui/LoginAccountStatus';
import IndependentAccountCreator from '@/components/ui/IndependentAccountCreator';
import { toast } from 'react-toastify';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { PlayerJoinRequest } from '@/types/organization-referral';
import OrgReferralSummaryCard from '@/components/referrals/OrgReferralSummaryCard';

export default function TrainerPlayersPage() {
  const { user, userData } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [joinRequests, setJoinRequests] = useState<PlayerJoinRequest[]>([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);

  useEffect(() => {
    console.log('🔍 حالة المصادقة:', { user: user?.id, loading: !user });
    if (user?.id) {
      console.log('✅ المدرب مصادق - جاري تحميل اللاعبين...');
      loadPlayers();
      loadJoinRequests();
    } else {
      console.log('⚠️ المدرب غير مصادق أو لا يزال يتم التحميل');
    }
  }, [user]);

  const loadPlayers = async () => {
    try {
      setLoading(true);

      const { data: snapshot } = await supabase
        .from('players')
        .select('*')
        .eq('trainer_id', user?.id);

      const playersData = (snapshot || [])
        .filter((p: any) => !p.isDeleted) as Player[];

      // Manual sorting on the client-side
      playersData.sort((a, b) => {
          const aValue = a[sortBy as keyof Player] as any;
          const bValue = b[sortBy as keyof Player] as any;
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
      });

      setPlayers(playersData);
    } catch (error) {
      console.error("Error loading players:", error);
      toast.error("Failed to load players.");
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    try {
      const requests = await organizationReferralService.getOrganizationJoinRequests(user!.id, 'pending');
      setJoinRequests(requests);
    } catch (error) {
      console.error('خطأ في تحميل طلبات الانضمام:', error);
    }
  };

  // Filter, search, sort and paginate players
  const filteredPlayers = players.filter(player => {
    const playerName = player.full_name || (player as Player & { name?: string }).name || '';
    const playerEmail = player.email || '';
    const playerPhone = player.phone || '';
    
    const matchesSearch = playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playerPhone.includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || player.subscription_status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const isProfileComplete = (p: Player) => {
    const hasName = Boolean(p.full_name || (p as any).name);
    const hasPhone = Boolean(p.phone);
    const hasCountry = Boolean(p.country);
    const hasPosition = Boolean(p.primary_position || (p as any).position);
    const hasMedia = Boolean((p as any).videos?.length || (p as any).additional_images?.length);
    return hasName && hasPhone && hasCountry && hasPosition && hasMedia;
  };

  const getProfileCompletion = (p: Player) => {
    const checkpoints: boolean[] = [
      Boolean(p.full_name || (p as any).name),
      Boolean(p.phone),
      Boolean(p.country),
      Boolean(p.primary_position || (p as any).position),
      Boolean(p.height),
      Boolean(p.weight),
      Boolean((p as any).videos && (p as any).videos.length > 0),
      Boolean((p as any).additional_images && (p as any).additional_images.length > 0),
      Boolean((p as any).birth_date)
    ];
    const done = checkpoints.filter(Boolean).length;
    return Math.round((done / checkpoints.length) * 100);
  };

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.full_name || a.name || '';
        bValue = b.full_name || b.name || '';
        break;
      case 'created_at':
        aValue = (a.createdAt || a.created_at) ? new Date((a.createdAt || a.created_at) instanceof Date ? (a.createdAt || a.created_at) : (a.createdAt || a.created_at)) : new Date(0);
        bValue = (b.createdAt || b.created_at) ? new Date((b.createdAt || b.created_at) instanceof Date ? (b.createdAt || b.created_at) : (b.createdAt || b.created_at)) : new Date(0);
        break;
      case 'updated_at':
        aValue = a.updated_at ? new Date(a.updated_at instanceof Date ? a.updated_at : a.updated_at) : new Date(0);
        bValue = b.updated_at ? new Date(b.updated_at instanceof Date ? b.updated_at : b.updated_at) : new Date(0);
        break;
      case 'subscription_status':
        aValue = a.subscription_status || 'inactive';
        bValue = b.subscription_status || 'inactive';
        break;
      default:
        aValue = a.full_name || a.name || '';
        bValue = b.full_name || b.name || '';
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPlayers = sortedPlayers.length;
  const totalPages = Math.ceil(totalPlayers / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const currentPlayers = sortedPlayers.slice(startIndex, endIndex);

  // Reset to first page when search/filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Get subscription status badge
  const getSubscriptionBadge = (status: string, endDate: any) => {
    const now = new Date();
    let end: Date;
    
    try {
      if (typeof endDate === 'object' && endDate.toDate && typeof endDate.toDate === 'function') {
        end = endDate.toDate();
      } else if (endDate instanceof Date) {
        end = endDate;
      } else if (endDate) {
        end = new Date(endDate);
      } else {
        end = new Date(0);
      }
    } catch (error) {
      end = new Date(0);
    }
    
    if (status === 'active' && end > now) {
      return <Badge className="text-green-800 bg-green-100 hover:bg-green-200"><CheckCircle className="mr-1 w-3 h-3" />نشط</Badge>;
    } else if (status === 'active' && end <= now) {
      return <Badge className="text-yellow-800 bg-yellow-100 hover:bg-yellow-200"><AlertCircle className="mr-1 w-3 h-3" />منتهي</Badge>;
    } else if (status === 'expired') {
      return <Badge className="text-red-800 bg-red-100 hover:bg-red-200"><XCircle className="mr-1 w-3 h-3" />منتهي</Badge>;
    } else {
      return <Badge className="text-gray-800 bg-gray-100 hover:bg-gray-200"><XCircle className="mr-1 w-3 h-3" />غير نشط</Badge>;
    }
  };

  // Calculate age from birth date
  const calculateAge = (birthDate: any) => {
    if (!birthDate) return null;
    try {
      let d: Date;
      if (typeof birthDate === 'object' && birthDate.toDate && typeof birthDate.toDate === 'function') {
        d = birthDate.toDate();
      } else if (birthDate instanceof Date) {
        d = birthDate;
      } else if (birthDate) {
        d = new Date(birthDate);
      } else {
        return null;
      }
      
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const monthDiff = today.getMonth() - d.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return null;
    }
  };

  // Format date
  const formatDate = (date: any) => {
    if (!date) return 'غير محدد';
    try {
      let d: Date;
      if (typeof date === 'object' && date.toDate && typeof date.toDate === 'function') {
        d = date.toDate();
      } else if (date instanceof Date) {
        d = date;
      } else {
        d = new Date(date);
      }
      
      return d.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'غير محدد';
    }
  };

  // Get time ago
  const getTimeAgo = (date: any) => {
    if (!date) return 'غير محدد';
    try {
      let d: Date;
      if (typeof date === 'object' && date.toDate && typeof date.toDate === 'function') {
        d = date.toDate();
      } else if (date instanceof Date) {
        d = date;
      } else {
        d = new Date(date);
      }
      
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'الآن';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} دقيقة`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ساعة`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} يوم`;
      if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} شهر`;
      return `${Math.floor(diffInSeconds / 31536000)} سنة`;
    } catch (error) {
      return 'غير محدد';
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const headers = [
      'الاسم الكامل',
      'البريد الإلكتروني',
      'رقم الهاتف',
      'الجنسية',
      'المدينة',
      'الموقع الأساسي',
      'الموقع الثانوي',
      'العمر',
      'الطول',
      'الوزن',
      'حالة الاشتراك',
      'تاريخ الإنشاء'
    ];

    const data = players.map(player => [
      player.full_name || player.name || '',
      player.email || '',
      player.phone || '',
      player.nationality || '',
      player.city || '',
      player.primary_position || player.position || '',
      player.secondary_position || '',
      calculateAge(player.birth_date) || '',
      player.height || '',
      player.weight || '',
      player.subscription_status || 'غير نشط',
      formatDate(player.createdAt || player.created_at)
    ]);

    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `players_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle delete player
  const handleDeletePlayer = async (player: Player) => {
    setPlayerToDelete(player);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!playerToDelete) return;
    
    try {
      await supabase.from('players').delete().eq('id', playerToDelete.id);
      setPlayers(players.filter(p => p.id !== playerToDelete.id));
      setIsDeleteModalOpen(false);
      setPlayerToDelete(null);
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="mt-4 text-gray-600">جاري تحميل اللاعبين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white" dir="rtl">
      <main className="container px-4 py-8 mx-auto">
        {/* Referrals summary card */}
        <OrgReferralSummaryCard accountType="trainer" />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة اللاعبين</h1>
              <p className="text-gray-600">عرض وإدارة جميع اللاعبين المسجلين</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={exportToExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير البيانات
              </Button>
              <Link href="/dashboard/trainer/players/add">
                <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                  إضافة لاعب جديد
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-600" />
                <div className="mr-3">
                  <p className="text-sm text-gray-600">إجمالي اللاعبين</p>
                  <p className="text-2xl font-bold text-gray-900">{players.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="mr-3">
                  <p className="text-sm text-gray-600">اللاعبين النشطين</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {players.filter(p => p.subscription_status === 'active').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
                <div className="mr-3">
                  <p className="text-sm text-gray-600">الاشتراكات المنتهية</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {players.filter(p => p.subscription_status === 'expired').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-600" />
                <div className="mr-3">
                  <p className="text-sm text-gray-600">غير النشطين</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {players.filter(p => !p.subscription_status || p.subscription_status === 'inactive').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="البحث بالاسم أو البريد الإلكتروني أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 w-full md:w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  جدول
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  بطاقات
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Players Table - Joined via referral */}
        {viewMode === 'table' && (
          <>
          <Card className="overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-gray-800">اللاعبون المنضمون عبر كود الإحالة ({currentPlayers.filter(p => (p as any).joinedViaReferral).length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      اللاعب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      معلومات الاتصال
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموقع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العمر</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      حالة الاشتراك
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التواريخ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الانضمام عبر كود</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPlayers.filter(p => (p as any).joinedViaReferral).map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {player.profile_image ? (
                              <Image
                                src={player.profile_image}
                                alt={player.full_name || player.name || ''}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">
                              {player.full_name || player.name || 'غير محدد'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {player.nationality || 'غير محدد'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{player.email || 'غير محدد'}</div>
                        <div className="text-sm text-gray-500">{player.phone || 'غير محدد'}</div>
                        <div className="mt-2">{(() => { const pct = getProfileCompletion(player); return (
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500"><span>اكتمال الملف</span><span>{pct}%</span></div>
                            <div className="w-32 h-1.5 bg-gray-200 rounded">
                              <div className={`h-1.5 rounded ${pct>=80?'bg-emerald-500':pct>=50?'bg-amber-500':'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ); })()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {player.primary_position || player.position || 'غير محدد'}
                        </div>
                        {player.secondary_position && (
                          <div className="text-sm text-gray-500">
                            {player.secondary_position}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateAge(player.birth_date) || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSubscriptionBadge(player.subscription_status || 'inactive', player.subscription_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          <div className="flex gap-1 items-center mb-1">
                            <Plus className="w-3 h-3 text-green-600" />
                            <span className="font-medium">إضافة:</span>
                          </div>
                          <div className="mb-2">
                            {formatDate(player.createdAt || player.created_at)}
                            <div className="text-gray-400">{getTimeAgo(player.createdAt || player.created_at)}</div>
                          </div>
                          
                          <div className="flex gap-1 items-center mb-1">
                            <Edit className="w-3 h-3 text-blue-600" />
                            <span className="font-medium">تحديث:</span>
                          </div>
                          <div>
                            {formatDate(player.updated_at)}
                            <div className="text-gray-400">{getTimeAgo(player.updated_at)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="text-xs text-gray-700">
                          <div>الكود: {player.referralCodeUsed || '-'}</div>
                          <div>التاريخ: {formatDate((player as any).organizationJoinedAt)}</div>
                          {(player as any).organizationApprovedBy?.userName && (
                            <div>الموافق: {(player as any).organizationApprovedBy.userName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/trainer/players/${player.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/trainer/players/${player.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          {player.id && (
                            <SendMessageButton
                              user={user}
                              userData={userData}
                              getUserDisplayName={() => (userData as any)?.full_name || (userData as any)?.name || user?.email || 'مستخدم'}
                              targetUserId={player.id}
                              targetUserName={player.full_name || player.name || ''}
                              targetUserType="player"
                              buttonText="رسالة"
                              buttonVariant="outline"
                              buttonSize="sm"
                              redirectToMessages={true}
                            />
                          )}
                          
                          <CreateLoginAccountButton
                            playerId={player.id}
                            playerData={{
                              full_name: player.full_name || player.name,
                              name: player.name || player.full_name,
                              email: player.email,
                              phone: player.phone,
                              trainer_id: player.trainer_id || user?.id,
                              ...player
                            }}
                            source="players"
                            onSuccess={(password) => {
                              console.log(`تم إنشاء حساب للاعب ${player.full_name || player.name} بكلمة المرور: ${password}`);
                            }}
                          />
                          
                          <IndependentAccountCreator
                            playerId={player.id}
                            playerData={{
                              full_name: player.full_name || player.name,
                              name: player.name || player.full_name,
                              email: player.email,
                              phone: player.phone,
                              whatsapp: player.whatsapp,
                              trainer_id: player.trainer_id || user?.id,
                              ...player
                            }}
                            source="players"
                            variant="outline"
                            size="sm"
                            className="text-purple-600 hover:bg-purple-50"
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePlayer(player)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {/* Players added manually by trainer */}
          <Card className="overflow-hidden mt-6">
            <div className="p-4 border-b">
              <h3 className="font-bold text-gray-800">اللاعبون المضافون بواسطة المدرب ({currentPlayers.filter(p => !(p as any).joinedViaReferral).length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اللاعب</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">معلومات الاتصال</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموقع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العمر</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حالة الاشتراك</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التواريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPlayers.filter(p => !(p as any).joinedViaReferral).map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {player.profile_image ? (
                              <Image src={player.profile_image} alt={player.full_name || player.name || ''} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center"><User className="w-5 h-5 text-gray-600" /></div>
                            )}
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{player.full_name || player.name || 'غير محدد'}</div>
                            <div className="text-sm text-gray-500">{player.nationality || 'غير محدد'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{player.email || 'غير محدد'}</div>
                        <div className="text-sm text-gray-500">{player.phone || 'غير محدد'}</div>
                        <div className="mt-2">{(() => { const pct = getProfileCompletion(player); return (
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500"><span>اكتمال الملف</span><span>{pct}%</span></div>
                            <div className="w-32 h-1.5 bg-gray-200 rounded">
                              <div className={`h-1.5 rounded ${pct>=80?'bg-emerald-500':pct>=50?'bg-amber-500':'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ); })()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{player.primary_position || player.position || 'غير محدد'}</div>{player.secondary_position && (<div className="text-sm text-gray-500">{player.secondary_position}</div>)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{calculateAge(player.birth_date) || 'غير محدد'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getSubscriptionBadge(player.subscription_status || 'inactive', player.subscription_end)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-xs text-gray-600"><div className="flex gap-1 items-center mb-1"><Plus className="w-3 h-3 text-green-600" /><span className="font-medium">إضافة:</span></div><div className="mb-2">{formatDate(player.createdAt || player.created_at)}<div className="text-gray-400">{getTimeAgo(player.createdAt || player.created_at)}</div></div><div className="flex gap-1 items-center mb-1"><Edit className="w-3 h-3 text-blue-600" /><span className="font-medium">تحديث:</span></div><div>{formatDate(player.updated_at)}<div className="text-gray-400">{getTimeAgo(player.updated_at)}</div></div></div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><div className="flex items-center gap-2"><Link href={`/dashboard/trainer/players/${player.id}`}><Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button></Link><Link href={`/dashboard/trainer/players/${player.id}/edit`}><Button variant="outline" size="sm"><Edit className="w-4 h-4" /></Button></Link>{player.id && (<SendMessageButton user={user} userData={userData} getUserDisplayName={() => (userData as any)?.full_name || (userData as any)?.name || user?.email || 'مستخدم'} targetUserId={player.id} targetUserName={player.full_name || player.name || ''} targetUserType="player" buttonText="رسالة" buttonVariant="outline" buttonSize="sm" redirectToMessages={true} />)}<Button variant="outline" size="sm" onClick={() => handleDeletePlayer(player)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          </>
        )}

        {/* Players Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentPlayers.map((player) => (
              <Card key={player.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 h-16 w-16">
                      {player.profile_image ? (
                        <Image
                          src={player.profile_image}
                          alt={player.full_name || player.name || ''}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="mr-4 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {player.full_name || player.name || 'غير محدد'}
                      </h3>
                      <p className="text-sm text-gray-500">{player.nationality || 'غير محدد'}</p>
                      {player.joinedViaReferral && (
                        <div className="mt-1 space-y-1">
                          <div className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            انضم عبر كود
                            {player.referralCodeUsed && <span className="font-mono">({player.referralCodeUsed})</span>}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            تاريخ الانضمام: {formatDate((player as any).organizationJoinedAt)}
                            {(player as any).organizationApprovedBy?.userName && (
                              <span className="ml-2">— بواسطة: {(player as any).organizationApprovedBy.userName}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {player.joinedViaReferral && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          انضم عبر كود
                          {player.referralCodeUsed && <span className="font-mono">({player.referralCodeUsed})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 ml-2" />
                      {player.email || 'غير محدد'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 ml-2" />
                      {player.phone || 'غير محدد'}
                    </div>
                    <div className="pt-1">
                      {isProfileComplete(player) ? (
                        <Badge className="text-emerald-700 bg-emerald-100">ملف مكتمل</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">بحاجة لاستكمال</Badge>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 ml-2" />
                      {player.city || 'غير محدد'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 ml-2" />
                      {player.primary_position || player.position || 'غير محدد'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 ml-2" />
                      العمر: {calculateAge(player.birth_date) || 'غير محدد'}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    {getSubscriptionBadge(player.subscription_status || 'inactive', player.subscription_end)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/trainer/players/${player.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/trainer/players/${player.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      {player.id && (
                        <SendMessageButton
                          user={user}
                          userData={userData}
                          getUserDisplayName={() => (userData as any)?.full_name || (userData as any)?.name || user?.email || 'مستخدم'}
                          targetUserId={player.id}
                          targetUserName={player.full_name || player.name || ''}
                          targetUserType="player"
                          buttonText="رسالة"
                          buttonVariant="outline"
                          buttonSize="sm"
                          redirectToMessages={true}
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlayer(player)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              عرض {startIndex + 1} إلى {Math.min(endIndex, totalPlayers)} من {totalPlayers} لاعب
              {players.some(p => (p as any)._debug_note) && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                  🔍 وضع التشخيص - اللاعبين غير مربوطين بالمدرب
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                السابق
              </Button>
              <span className="text-sm text-gray-700">
                صفحة {currentPage} من {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                التالي
              </Button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">تأكيد الحذف</h3>
              <p className="text-gray-600 mb-6">
                هل أنت متأكد من حذف اللاعب "{playerToDelete?.full_name || playerToDelete?.name}"؟ 
                لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex items-center justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setPlayerToDelete(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                >
                  حذف
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 
