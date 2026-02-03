'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateLoginAccountButton from '@/components/ui/CreateLoginAccountButton';
import IndependentAccountCreator from '@/components/ui/IndependentAccountCreator';
import {
  Users,
  Plus,
  Search,
  Edit,
  Video,
  Image as ImageIcon,
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
import Link from 'next/link';
import { Player } from '@/types/player';
import { toast } from 'sonner';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { PlayerJoinRequest } from '@/types/organization-referral';
import OrgReferralSummaryCard from '@/components/referrals/OrgReferralSummaryCard';

export default function MarketerPlayersPage() {
  const { user, userData } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
    if (user?.uid) {
      loadPlayers();
      loadJoinRequests();
    }
  }, [user]);

  const loadPlayers = async () => {
    try {
      setLoading(true);

      // Using 'users' collection for Marketers, or 'players' if that's where they are.
      // Assuming 'users' based on previous context, but matching Academy UI.
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('marketerId', '==', user?.uid),
        where('accountType', '==', 'player')
      );

      const snapshot = await getDocs(q);

      const playersData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => !p.isDeleted);

      // Manual sorting on the client-side
      playersData.sort((a: any, b: any) => {
        const aValue = a[sortBy] as any;
        const bValue = b[sortBy] as any;
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setPlayers(playersData as Player[]);

    } catch (error) {
      console.error("Error loading players:", error);
      toast.error("Failed to load players.");
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    try {
      const requests = await organizationReferralService.getOrganizationJoinRequests(user!.uid, 'pending');
      setJoinRequests(requests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  // Filter, search, sort and paginate players
  const filteredPlayers = players.filter(player => {
    const playerName = player.full_name || (player as any).name || '';
    const playerEmail = player.email || '';
    const playerPhone = player.phone || '';

    const matchesSearch = playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playerPhone.includes(searchTerm);

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && player.subscription_status === 'active') ||
      (filterStatus === 'inactive' && player.subscription_status !== 'active');

    return matchesSearch && matchesFilter;
  });

  const getProfileCompletion = (p: Player) => {
    const checkpoints: boolean[] = [
      Boolean(p.full_name || (p as any).name),
      Boolean(p.phone),
      Boolean(p.country),
      Boolean(p.primary_position || (p as any).position),
      Boolean(p.height),
      Boolean(p.weight),
      Boolean((p as any).videos && (p as any).videos.length > 0)
    ];
    const done = checkpoints.filter(Boolean).length;
    return Math.round((done / checkpoints.length) * 100);
  };

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let aValue: any, bValue: any;
    switch (sortBy) {
      case 'name':
        aValue = a.full_name || (a as any).name || '';
        bValue = b.full_name || (b as any).name || '';
        break;
      case 'created_at':
        aValue = (a as any).createdAt?.seconds || 0;
        bValue = (b as any).createdAt?.seconds || 0;
        break;
      default:
        aValue = (a as any).createdAt?.seconds || 0;
        bValue = (b as any).createdAt?.seconds || 0;
    }

    if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
    return aValue < bValue ? 1 : -1;
  });

  // Pagination
  const totalPlayers = sortedPlayers.length;
  const totalPages = Math.ceil(totalPlayers / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const currentPlayers = sortedPlayers.slice(startIndex, endIndex);

  // Format date helper
  const formatDate = (date: any) => {
    if (!date) return 'غير محدد';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('ar-EG');
    } catch (e) { return 'غير محدد'; }
  };

  const calculateAge = (dob: any) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const ageDifMs = Date.now() - birth.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const getTimeAgo = (date: any) => {
    if (!date) return 'غير محدد';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'اليوم';
      return `منذ ${diffDays} يوم`;
    } catch { return ''; }
  };

  const exportToExcel = () => {
    const headers = ['الاسم', 'الهاتف', 'البريد', 'البلد', 'المدينة', 'تاريخ الانضمام'];
    const rows = sortedPlayers.map(p => [
      p.full_name || (p as any).name,
      p.phone,
      p.email,
      p.country,
      p.city,
      formatDate((p as any).createdAt)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `marketer_players_${new Date().toISOString()}.csv`;
    link.click();
  };

  const handleDeletePlayer = async (player: Player) => {
    setPlayerToDelete(player);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!playerToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', playerToDelete.id)); // Using users collection
      setPlayers(prev => prev.filter(p => p.id !== playerToDelete!.id));
      setIsDeleteModalOpen(false);
      setPlayerToDelete(null);
      toast.success('تم حذف اللاعب بنجاح');
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('حدث خطأ أثناء حذف اللاعب');
    }
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 mx-4 my-6 bg-gray-50 rounded-lg shadow-inner md:p-10" dir="rtl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-600 rounded-full border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">جاري تحميل اللاعبين...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 mx-4 my-6 bg-gray-50 rounded-lg shadow-inner md:p-10" dir="rtl">
      <div className="space-y-6">
        {/* Referrals summary card */}
        <OrgReferralSummaryCard accountType="marketer" />

        {joinRequests.length > 0 && (
          <Card className="overflow-hidden border-2 border-primary/10 shadow-lg mb-8">
            <div className="bg-gradient-to-l from-primary/5 to-transparent p-4 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">طلبات الانضمام الجديدة</h3>
                  <p className="text-xs text-gray-500">لديك {joinRequests.length} لاعب بانتظار الموافقة</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowJoinRequests(!showJoinRequests)}
                className="gap-2"
              >
                {showJoinRequests ? 'إخفاء القائمة' : 'عرض القائمة'}
                {showJoinRequests ? <Eye className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
              </Button>
            </div>

            {showJoinRequests && (
              <div className="p-4 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                            <span className="text-lg font-bold text-gray-400">{request.playerName.charAt(0)}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{request.playerName}</h4>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Calendar className="w-3 h-3" />
                              <span dir="ltr">{formatDate(request.requestedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                          جديد
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                          onClick={async () => {
                            try {
                              await organizationReferralService.approveJoinRequest(request.id, user!.uid, 'المسوق');
                              toast.success('تم قبول اللاعب بنجاح');
                              loadJoinRequests();
                              loadPlayers();
                            } catch (error) {
                              toast.error('فشل في قبول اللاعب');
                            }
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                          onClick={async () => {
                            try {
                              await organizationReferralService.rejectJoinRequest(request.id, user!.uid, 'المسوق', 'تم الرفض');
                              toast.success('تم رفض الطلب');
                              loadJoinRequests();
                            } catch (error) {
                              toast.error('فشل في رفض الطلب');
                            }
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          رفض
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-600 mb-2">إدارة اللاعبين</h1>
            <p className="text-gray-600">إدارة قائمة اللاعبين التابعين للوكالة ({players.length} لاعب)</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={players.length === 0}
            >
              <Download className="mr-2 w-4 h-4" />
              تصدير Excel
            </Button>

            <Link href="/dashboard/marketer/players/add">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                <Plus className="mr-2 w-4 h-4" />
                إضافة لاعب جديد
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="البحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger><SelectValue placeholder="الترتيب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">تاريخ الإضافة</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
              <SelectTrigger><SelectValue placeholder="ترتيب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">تنازلي</SelectItem>
                <SelectItem value="asc">تصاعدي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Helper to render rows */}
        {/* Players Joined via Referral Table */}
        {currentPlayers.filter(p => (p as any).joinedViaReferral).length > 0 && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-gray-800">اللاعبون المنضمون عبر كود الإحالة ({currentPlayers.filter(p => (p as any).joinedViaReferral).length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">اللاعب</th>
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">معلومات الاتصال</th>
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">المركز والمقاسات</th>
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">الموقع</th>
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">الاشتراك</th>
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">التواريخ</th>
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">الانضمام عبر كود</th>
                    <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">العمليات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPlayers.filter(p => (p as any).joinedViaReferral).map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-12 h-12">
                            <div className="flex justify-center items-center w-12 h-12 bg-gray-200 rounded-full border border-gray-300">
                              {player.profile_image ? <img src={player.profile_image} className="w-full h-full rounded-full object-cover" /> : <User className="w-6 h-6 text-gray-400" />}
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{player.full_name || (player as any).name}</div>
                            <div className="text-xs text-gray-400">#{player.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {player.phone}</div>
                          <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {player.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div>{player.primary_position || (player as any).position || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div>{player.city}</div>
                          <div className="text-xs text-gray-500">{player.country}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {player.subscription_status === 'active' ? <Badge className="bg-green-100 text-green-800">نشط</Badge> : <Badge className="bg-gray-100 text-gray-800">غير نشط</Badge>}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div>إضافة: {formatDate((player as any).createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div>الكود: {(player as any).referralCodeUsed || '-'}</div>
                        <div>التاريخ: {formatDate((player as any).organizationJoinedAt)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link href={`/dashboard/marketer/players/add?edit=${player.id}`}><Button variant="outline" size="sm"><Edit className="w-4 h-4" /></Button></Link>
                          <Button variant="outline" size="sm" onClick={() => handleDeletePlayer(player)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Players Added by Org Table */}
        <Card className="overflow-hidden mt-6">
          <div className="p-4 border-b">
            <h3 className="font-bold text-gray-800">اللاعبون المضافون بواسطة المنظمة ({currentPlayers.filter(p => !(p as any).joinedViaReferral).length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                  <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">اللاعب</th>
                  <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">معلومات الاتصال</th>
                  <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">المركز والمقاسات</th>
                  <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">الموقع</th>
                  <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">الاشتراك</th>
                  <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">التواريخ</th>
                  <th className="px-6 py-4 text-xs font-medium tracking-wider text-right uppercase">العمليات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPlayers.filter(p => !(p as any).joinedViaReferral).map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-12 h-12">
                          <div className="flex justify-center items-center w-12 h-12 bg-gray-200 rounded-full border border-gray-300">
                            {player.profile_image ? <img src={player.profile_image} className="w-full h-full rounded-full object-cover" /> : <User className="w-6 h-6 text-gray-400" />}
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">{player.full_name || (player as any).name}</div>
                          <div className="text-xs text-gray-400">#{player.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {player.phone}</div>
                        <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {player.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>{player.primary_position || (player as any).position || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>{player.city}</div>
                        <div className="text-xs text-gray-500">{player.country}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {player.subscription_status === 'active' ? <Badge className="bg-green-100 text-green-800">نشط</Badge> : <Badge className="bg-gray-100 text-gray-800">غير نشط</Badge>}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>إضافة: {formatDate((player as any).createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/marketer/players/add?edit=${player.id}`}><Button variant="outline" size="sm"><Edit className="w-4 h-4" /></Button></Link>
                        <CreateLoginAccountButton playerId={player.id} playerData={player} source="players" onSuccess={() => console.log('Account Created')} />
                        <IndependentAccountCreator playerId={player.id} playerData={player} source="players" variant="outline" size="sm" className="text-purple-600" />
                        <Button variant="outline" size="sm" onClick={() => handleDeletePlayer(player)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {currentPlayers.filter(p => !(p as any).joinedViaReferral).length === 0 && (
                  <tr><td colSpan={7} className="text-center py-4 text-gray-500">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="p-4 mt-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>السابق</Button>
              <span>{currentPage} / {totalPages}</span>
              <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>التالي</Button>
            </div>
          </Card>
        )}

        {/* Delete Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
              <p className="mb-4">هل أنت متأكد من حذف هذا اللاعب؟</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>إلغاء</Button>
                <Button className="bg-red-600 text-white" onClick={confirmDelete}>حذف</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
