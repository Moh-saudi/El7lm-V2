'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Eye,
  Users,
  DollarSign,
  Plus,
  Search,
  Filter,
  SortAsc,
  X,
  CalendarRange,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'sonner';
import PaymentManagementModal from '@/components/payments/PaymentManagementModal';
import { Tournament } from './utils';
import { TournamentCard } from './components/TournamentCard';
import { TournamentForm } from './components/TournamentForm';
import { RegistrationsModal } from './components/RegistrationsModal';
import { ProfessionalRegistrationsModal } from './components/ProfessionalRegistrationsModal';
import { ShareTournamentModal } from './components/ShareTournamentModal';
import { usePermissions } from '../employees-v2/_hooks/usePermissions';
import AccessDenied from '@/components/admin/AccessDenied';

const AdminTournamentsPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'paid' | 'free'>('all');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'participants'>('newest');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [viewingRegistrations, setViewingRegistrations] = useState<Tournament | null>(null);
  const [showProfessionalRegistrations, setShowProfessionalRegistrations] = useState<Tournament | null>(null);
  const [viewingShare, setViewingShare] = useState<Tournament | null>(null);
  const [selectedTournamentForPayments, setSelectedTournamentForPayments] = useState<Tournament | null>(null);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const tournamentsData: Tournament[] = (data || []).map((row) => ({
        id: row.id,
        ...row,
        isActive: row.isActive === true,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
        registrations: row.registrations || [],
        currency: row.currency || 'EGP',
        paymentMethods: row.paymentMethods || ['credit_card', 'bank_transfer'],
        ageGroups: row.ageGroups || [],
        categories: row.categories || [],
      })) as Tournament[];

      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('فشل في تحميل البطولات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleDelete = async (tournamentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه البطولة؟')) return;

    try {
      await supabase.from('tournaments').delete().eq('id', tournamentId);
      toast.success('تم حذف البطولة بنجاح');
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast.error('فشل في حذف البطولة');
    }
  };

  const handleStatusChange = async (tournament: Tournament, isActive: boolean) => {
    try {
      await supabase
        .from('tournaments')
        .update({
          isActive,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', tournament.id!);

      toast.success(isActive ? 'تم تفعيل البطولة' : 'تم إلغاء تفعيل البطولة');
      setTournaments((prev) => prev.map((item) => (item.id === tournament.id ? { ...item, isActive } : item)));
    } catch (error) {
      console.error('Error updating tournament status:', error);
      toast.error('فشل في تحديث حالة البطولة');
      fetchTournaments();
    }
  };

  const filteredTournaments = useMemo(() => {
    let result = [...tournaments];
    const now = new Date();

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(query) || t.location?.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((t) => (statusFilter === 'active' ? t.isActive : !t.isActive));
    }

    if (typeFilter !== 'all') {
      result = result.filter((t) => (typeFilter === 'paid' ? t.isPaid : !t.isPaid));
    }

    if (phaseFilter !== 'all') {
      result = result.filter((t) => {
        const startDate = new Date(t.startDate);
        const endDate = new Date(t.endDate);

        if (phaseFilter === 'live') return now >= startDate && now <= endDate;
        if (phaseFilter === 'upcoming') return now < startDate;
        return now > endDate;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      return b.currentParticipants - a.currentParticipants;
    });

    return result;
  }, [tournaments, searchQuery, statusFilter, typeFilter, phaseFilter, sortBy]);

  const stats = [
    {
      title: 'إجمالي البطولات',
      value: tournaments.length.toString(),
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'البطولات النشطة',
      value: tournaments.filter((t) => t.isActive).length.toString(),
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'إجمالي المسجلين',
      value: tournaments.reduce((sum, t) => sum + t.currentParticipants, 0).toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'البطولات المدفوعة',
      value: tournaments.filter((t) => t.isPaid).length.toString(),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    phaseFilter !== 'all' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPhaseFilter('all');
    setSortBy('newest');
  };

  const { can } = usePermissions();

  if (!can('read', 'tournaments')) {
    return <AccessDenied resource="إدارة البطولات" />;
  }

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-yellow-600" />
          <p className="text-gray-600">جاري تحميل البطولات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-yellow-100 p-2.5">
                <Trophy className="h-7 w-7 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">إدارة البطولات</h1>
                <p className="mt-1 text-sm text-gray-600">عرض البطولات وفلترتها وترتيبها بشكل أوضح.</p>
              </div>
            </div>

            <Button
              onClick={() => {
                setEditingTournament(null);
                setIsFormOpen(true);
              }}
              className="h-11 bg-yellow-600 px-5 text-white hover:bg-yellow-700"
            >
              <Plus className="mr-2 h-5 w-5" />
              إضافة بطولة جديدة
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="ابحث عن بطولة بالاسم أو الموقع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl pr-10 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">الفلاتر والفرز</span>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {filteredTournaments.length} من {tournaments.length} بطولة
                </Badge>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    مسح الكل
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <Filter className="h-3.5 w-3.5" />
                  الحالة
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'bg-slate-900 hover:bg-slate-800' : ''}>الكل</Button>
                  <Button variant={statusFilter === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('active')} className={statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>نشطة</Button>
                  <Button variant={statusFilter === 'inactive' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('inactive')} className={statusFilter === 'inactive' ? 'bg-gray-600 hover:bg-gray-700' : ''}>غير نشطة</Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <CalendarRange className="h-3.5 w-3.5" />
                  الوضع الزمني
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={phaseFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('all')} className={phaseFilter === 'all' ? 'bg-slate-900 hover:bg-slate-800' : ''}>الكل</Button>
                  <Button variant={phaseFilter === 'live' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('live')} className={phaseFilter === 'live' ? 'bg-green-600 hover:bg-green-700' : ''}>جارية</Button>
                  <Button variant={phaseFilter === 'upcoming' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('upcoming')} className={phaseFilter === 'upcoming' ? 'bg-blue-600 hover:bg-blue-700' : ''}>حديثة</Button>
                  <Button variant={phaseFilter === 'finished' ? 'default' : 'outline'} size="sm" onClick={() => setPhaseFilter('finished')} className={phaseFilter === 'finished' ? 'bg-amber-600 hover:bg-amber-700' : ''}>قديمة</Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <DollarSign className="h-3.5 w-3.5" />
                  نوع البطولة
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={typeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('all')} className={typeFilter === 'all' ? 'bg-slate-900 hover:bg-slate-800' : ''}>الكل</Button>
                  <Button variant={typeFilter === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('paid')} className={typeFilter === 'paid' ? 'bg-purple-600 hover:bg-purple-700' : ''}>مدفوعة</Button>
                  <Button variant={typeFilter === 'free' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('free')} className={typeFilter === 'free' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>مجانية</Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <SortAsc className="h-3.5 w-3.5" />
                  الترتيب
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')} className={sortBy === 'newest' ? 'bg-blue-600 hover:bg-blue-700' : ''}>الأحدث</Button>
                  <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')} className={sortBy === 'oldest' ? 'bg-amber-600 hover:bg-amber-700' : ''}>الأقدم</Button>
                  <Button variant={sortBy === 'participants' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('participants')} className={sortBy === 'participants' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>الأكثر مشاركين</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-xs text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTournaments.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                {tournaments.length === 0 ? (
                  <Trophy className="h-10 w-10 text-yellow-600" />
                ) : (
                  <Search className="h-10 w-10 text-yellow-600" />
                )}
              </div>

              <h3 className="mb-2 text-xl font-bold text-gray-900">
                {tournaments.length === 0 ? 'لا توجد بطولات' : 'لا توجد نتائج مطابقة'}
              </h3>

              <p className="mb-6 text-gray-600">
                {tournaments.length === 0
                  ? 'ابدأ بإنشاء بطولة جديدة'
                  : 'لم يتم العثور على بطولات تطابق معايير البحث الحالية'}
              </p>

              {tournaments.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingTournament(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  إضافة بطولة جديدة
                </Button>
              ) : (
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                >
                  <X className="mr-2 h-5 w-5" />
                  إلغاء الفلاتر والبحث
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onEdit={(t) => {
                  setEditingTournament(t);
                  setIsFormOpen(true);
                }}
                onDelete={handleDelete}
                onViewRegistrations={setViewingRegistrations}
                onViewProfessionalRegistrations={setShowProfessionalRegistrations}
                onManagePayments={setSelectedTournamentForPayments}
                onStatusChange={handleStatusChange}
                onShare={setViewingShare}
              />
            ))}
          </div>
        )}
      </div>

      <TournamentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingTournament}
        onSuccess={fetchTournaments}
      />

      <RegistrationsModal
        isOpen={!!viewingRegistrations}
        onClose={() => setViewingRegistrations(null)}
        tournament={viewingRegistrations}
      />

      <ProfessionalRegistrationsModal
        isOpen={!!showProfessionalRegistrations}
        onClose={() => setShowProfessionalRegistrations(null)}
        tournament={showProfessionalRegistrations}
      />

      <ShareTournamentModal
        isOpen={!!viewingShare}
        onClose={() => setViewingShare(null)}
        tournament={viewingShare}
      />

      {selectedTournamentForPayments && (
        <PaymentManagementModal
          isOpen={!!selectedTournamentForPayments}
          onClose={() => setSelectedTournamentForPayments(null)}
          tournament={{
            id: selectedTournamentForPayments.id || '',
            name: selectedTournamentForPayments.name,
            entryFee: selectedTournamentForPayments.entryFee || 0,
            paymentDeadline: selectedTournamentForPayments.paymentDeadline,
          }}
        />
      )}
    </div>
  );
};

export default AdminTournamentsPage;
