'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy, Eye, Users, DollarSign, Plus, Search, Filter, SortAsc, X
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import PaymentManagementModal from '@/components/payments/PaymentManagementModal';
import { Tournament } from './utils';

// Components
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

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'paid' | 'free'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'participants'>('newest');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const [viewingRegistrations, setViewingRegistrations] = useState<Tournament | null>(null);
  const [showProfessionalRegistrations, setShowProfessionalRegistrations] = useState<Tournament | null>(null);
  const [viewingShare, setViewingShare] = useState<Tournament | null>(null);

  const [selectedTournamentForPayments, setSelectedTournamentForPayments] = useState<Tournament | null>(null);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tournamentsData: Tournament[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          isActive: data.isActive === true,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          registrations: data.registrations || [],
          currency: data.currency || 'EGP',
          paymentMethods: data.paymentMethods || ['credit_card', 'bank_transfer'],
          ageGroups: data.ageGroups || [],
          categories: data.categories || []
        };
      }) as Tournament[];

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
    if (confirm('هل أنت متأكد من حذف هذه البطولة؟')) {
      try {
        await deleteDoc(doc(db, 'tournaments', tournamentId));
        toast.success('تم حذف البطولة بنجاح');
        fetchTournaments();
      } catch (error) {
        console.error('Error deleting tournament:', error);
        toast.error('فشل في حذف البطولة');
      }
    }
  };

  const handleStatusChange = async (tournament: Tournament, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id!), {
        isActive: isActive,
        updatedAt: new Date()
      });
      toast.success(isActive ? 'تم تفعيل البطولة' : 'تم إلغاء تفعيل البطولة');
      // Optimistic update
      setTournaments(prev => prev.map(t => t.id === tournament.id ? { ...t, isActive } : t));
    } catch (error) {
      console.error('Error updating tournament status:', error);
      toast.error('فشل في تحديث حالة البطولة');
      fetchTournaments(); // Revert on error
    }
  };

  // Filtered and Sorted Tournaments
  const filteredTournaments = useMemo(() => {
    let result = [...tournaments];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.location?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t =>
        statusFilter === 'active' ? t.isActive : !t.isActive
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(t =>
        typeFilter === 'paid' ? t.isPaid : !t.isPaid
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (sortBy === 'participants') {
        return b.currentParticipants - a.currentParticipants;
      }
      return 0;
    });

    return result;
  }, [tournaments, searchQuery, statusFilter, typeFilter, sortBy]);

  const stats = [
    {
      title: "إجمالي البطولات",
      value: tournaments.length.toString(),
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "البطولات النشطة",
      value: tournaments.filter(t => t.isActive).length.toString(),
      icon: Eye,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "إجمالي المسجلين",
      value: tournaments.reduce((sum, t) => sum + t.currentParticipants, 0).toString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "البطولات المدفوعة",
      value: tournaments.filter(t => t.isPaid).length.toString(),
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  const { can } = usePermissions();

  if (!can('read', 'tournaments')) {
    return <AccessDenied resource="إدارة البطولات" />;
  }

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البطولات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">إدارة البطولات</h1>
                <p className="text-gray-600 mt-1">إدارة شاملة لجميع البطولات والتسجيلات</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingTournament(null);
                setIsFormOpen(true);
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 h-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              إضافة بطولة جديدة
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="ابحث عن بطولة بالاسم أو الموقع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-12 text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">الفلاتر:</span>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                الكل
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                نشطة
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
                className={statusFilter === 'inactive' ? 'bg-gray-600 hover:bg-gray-700' : ''}
              >
                غير نشطة
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
                className={typeFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                الكل
              </Button>
              <Button
                variant={typeFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('paid')}
                className={typeFilter === 'paid' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                مدفوعة
              </Button>
              <Button
                variant={typeFilter === 'free' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('free')}
                className={typeFilter === 'free' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                مجانية
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="participants">الأكثر مشاركين</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="mr-auto">
              <Badge variant="secondary" className="text-sm">
                {filteredTournaments.length} من {tournaments.length} بطولة
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {tournaments.length === 0 ? (
                  <Trophy className="h-10 w-10 text-yellow-600" />
                ) : (
                  <Search className="h-10 w-10 text-yellow-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {tournaments.length === 0 ? 'لا توجد بطولات' : 'لا توجد نتائج مطابقة'}
              </h3>
              <p className="text-gray-600 mb-6">
                {tournaments.length === 0
                  ? 'ابدأ بإنشاء بطولة جديدة'
                  : 'لم يتم العثور على أي بطولات تطابق معايير البحث الحالية'}
              </p>

              {tournaments.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingTournament(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  إضافة بطولة جديدة
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  variant="outline"
                  className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                >
                  <X className="h-5 w-5 mr-2" />
                  إلغاء الفلاتر والبحث
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Modals */}
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
            paymentDeadline: selectedTournamentForPayments.paymentDeadline
          }}
        />
      )}
    </div>
       </div >
  );
};


export default AdminTournamentsPage;
