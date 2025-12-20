'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy, Eye, Users, DollarSign, Plus
} from 'lucide-react';
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

const AdminTournamentsPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading && tournaments.length === 0) {
    return (
      <AccountTypeProtection allowedTypes={['admin']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل البطولات...</p>
          </div>
        </div>
      </AccountTypeProtection>
    );
  }

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
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
          {tournaments.length === 0 ? (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-10 w-10 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد بطولات</h3>
                <p className="text-gray-600 mb-6">ابدأ بإنشاء بطولة جديدة</p>
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
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-6">
              {tournaments.map((tournament) => (
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
    </AccountTypeProtection>
  );
};


export default AdminTournamentsPage;
