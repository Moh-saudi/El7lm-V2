'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
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
  ArrowUpRight,
  Sparkles,
  Globe,
  ExternalLink,
  Layers,
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
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 space-y-8 max-w-[1480px] mx-auto" dir="rtl">
      {/* ── Executive Mesk El7lm Brand Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c132c] via-[#111c42] to-[#0c132c] text-white p-6 md:p-10 shadow-xl shadow-indigo-950/10 border border-indigo-950/40">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-amber-400 font-bold">Mesk El7lm</span>
              <span className="text-white/40">|</span>
              <span>محرك ومنظومة إدارة البطولات الدولية</span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">
              إدارة ومتابعة البطولات
            </h1>

            <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
              مركز التحكم الشامل لإنشاء وجدولة البطولات، إدارة اشتراكات الأندية، رصد النتائج، وإطلاق الأدوار الإقصائية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0">
            <a
              href="/tournament-portal/login"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              title="فتح شاشة تسجيل دخول مديري ومنظمي البطولات"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>شاشة تسجيل دخول المنظمين</span>
              <ArrowUpRight className="w-4 h-4 opacity-75" />
            </a>

            <button
              onClick={() => {
                setEditingTournament(null);
                setIsFormOpen(true);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-950/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>إضافة بطولة جديدة</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="relative z-10 flex items-center gap-2 mt-8 pt-6 border-t border-white/10 text-xs font-semibold overflow-x-auto">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 text-amber-300 border border-white/10 whitespace-nowrap">
            <Layers className="w-3.5 h-3.5" />
            <span>كافة البطولات الميدانية</span>
          </span>
          <Link
            href="/dashboard/admin/tournament-clients"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" />
            <span>منظمو وعملاء البطولات</span>
          </Link>
          <a
            href="/tournaments"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap mr-auto"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>عرض البطولات للجمهور</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      <div className="space-y-6">
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
