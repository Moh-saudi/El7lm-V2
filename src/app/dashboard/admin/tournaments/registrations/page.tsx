'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Trophy,
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Phone,
  Mail,
  User,
  Building,
  Target,
  CreditCard,
  FileText,
  DollarSign
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';

interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  isPaid: boolean;
  isActive: boolean;
}

interface TournamentRegistration {
  id: string;
  tournamentId: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  playerAge: number;
  playerClub: string;
  playerPosition: string;
  registrationDate: any;
  paymentStatus: 'pending' | 'paid' | 'free';
  paymentAmount: number;
  notes?: string;
  registrationType: 'individual' | 'club';
  clubName?: string;
  clubContact?: string;
  clubPlayers?: any[];
  // New fields for account type and additional info
  accountType?: 'player' | 'club' | 'coach' | 'academy' | 'agent' | 'marketer' | 'parent';
  accountName?: string;
  accountEmail?: string;
  accountPhone?: string;
  organizationName?: string;
  organizationType?: string;
  paymentMethod?: 'mobile_wallet' | 'card' | 'later';
  mobileWalletProvider?: string;
  mobileWalletNumber?: string;
  receiptUrl?: string;
  receiptNumber?: string;
}

export default function TournamentRegistrationsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<TournamentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchTournaments();
    fetchRegistrations();
  }, []);

  useEffect(() => {
    filterRegistrations();
  }, [registrations, selectedTournament, searchTerm, paymentFilter, accountTypeFilter]);

  const fetchTournaments = async () => {
    try {
      const tournamentsQuery = query(
        collection(db, 'tournaments'),
        where('isActive', '==', true),
        orderBy('startDate', 'asc')
      );
      
      const querySnapshot = await getDocs(tournamentsQuery);
      const tournamentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tournament[];
      
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('فشل في تحميل البطولات');
    }
  };

  const fetchRegistrations = async () => {
    try {
      const registrationsQuery = query(
        collection(db, 'tournament_registrations'),
        orderBy('registrationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(registrationsQuery);
      const registrationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TournamentRegistration[];
      
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('فشل في تحميل التسجيلات');
    } finally {
      setLoading(false);
    }
  };

  const filterRegistrations = () => {
    let filtered = registrations;

    // Filter by tournament
    if (selectedTournament !== 'all') {
      filtered = filtered.filter(reg => reg.tournamentId === selectedTournament);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(reg => 
        reg.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.playerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.playerPhone.includes(searchTerm) ||
        (reg.clubName && reg.clubName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (reg.accountName && reg.accountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (reg.organizationName && reg.organizationName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(reg => reg.paymentStatus === paymentFilter);
    }

    // Filter by account type
    if (accountTypeFilter !== 'all') {
      filtered = filtered.filter(reg => reg.accountType === accountTypeFilter);
    }

    setFilteredRegistrations(filtered);
  };

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
      
      if (isNaN(d.getTime())) {
        return 'غير محدد';
      }
      
      return d.toLocaleDateString('en-GB');
    } catch (error) {
      return 'غير محدد';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوع</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">في الانتظار</Badge>;
      case 'free':
        return <Badge className="bg-blue-100 text-blue-800">مجاني</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">غير محدد</Badge>;
    }
  };

  const getRegistrationTypeBadge = (type: string) => {
    switch (type) {
      case 'individual':
        return <Badge className="bg-purple-100 text-purple-800">فردي</Badge>;
      case 'club':
        return <Badge className="bg-indigo-100 text-indigo-800">نادي</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">غير محدد</Badge>;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'player':
        return <Badge className="bg-blue-100 text-blue-800">لاعب</Badge>;
      case 'club':
        return <Badge className="bg-green-100 text-green-800">نادي</Badge>;
      case 'coach':
        return <Badge className="bg-orange-100 text-orange-800">مدرب</Badge>;
      case 'academy':
        return <Badge className="bg-purple-100 text-purple-800">أكاديمية</Badge>;
      case 'agent':
        return <Badge className="bg-red-100 text-red-800">وكيل</Badge>;
      case 'marketer':
        return <Badge className="bg-yellow-100 text-yellow-800">مسوق</Badge>;
      case 'parent':
        return <Badge className="bg-pink-100 text-pink-800">ولي أمر</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">غير محدد</Badge>;
    }
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = [
      'اسم المسجل',
      'البريد الإلكتروني',
      'رقم الهاتف',
      'العمر',
      'النادي',
      'المركز',
      'نوع التسجيل',
      'نوع الحساب',
      'اسم الحساب',
      'اسم المنظمة',
      'نوع المنظمة',
      'اسم النادي',
      'جهة الاتصال',
      'طريقة الدفع',
      'مزود المحفظة',
      'رقم المحفظة',
      'رقم الإيصال',
      'تاريخ التسجيل',
      'حالة الدفع',
      'المبلغ',
      'الملاحظات'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredRegistrations.map(reg => [
        reg.playerName,
        reg.playerEmail,
        reg.playerPhone,
        reg.playerAge,
        reg.playerClub || '',
        reg.playerPosition || '',
        reg.registrationType,
        reg.accountType || '',
        reg.accountName || '',
        reg.organizationName || '',
        reg.organizationType || '',
        reg.clubName || '',
        reg.clubContact || '',
        reg.paymentMethod || '',
        reg.mobileWalletProvider || '',
        reg.mobileWalletNumber || '',
        reg.receiptNumber || '',
        formatDate(reg.registrationDate),
        reg.paymentStatus,
        reg.paymentAmount,
        reg.notes || ''
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tournament_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('تم تصدير البيانات بنجاح');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات التسجيلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/admin/tournaments')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة لإدارة البطولات
          </Button>
          
          <div className="text-center">
            <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">بيانات المنضمين للبطولات</h1>
            <p className="text-xl text-gray-600">عرض وإدارة جميع التسجيلات في البطولات</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">إجمالي التسجيلات</p>
                  <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">البطولات النشطة</p>
                  <p className="text-2xl font-bold text-gray-900">{tournaments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">المدفوعات</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {registrations.filter(r => r.paymentStatus === 'paid').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">في الانتظار</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {registrations.filter(r => r.paymentStatus === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              فلاتر البحث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">البحث</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="البحث بالاسم، الإيميل، الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">البطولة</label>
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البطولة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع البطولات</SelectItem>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">حالة الدفع</label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="pending">في الانتظار</SelectItem>
                    <SelectItem value="free">مجاني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">نوع الحساب</label>
                <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="player">لاعب</SelectItem>
                    <SelectItem value="club">نادي</SelectItem>
                    <SelectItem value="coach">مدرب</SelectItem>
                    <SelectItem value="academy">أكاديمية</SelectItem>
                    <SelectItem value="agent">وكيل</SelectItem>
                    <SelectItem value="marketer">مسوق</SelectItem>
                    <SelectItem value="parent">ولي أمر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الإجراءات</label>
                <Button onClick={exportToExcel} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  تصدير Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registrations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                قائمة التسجيلات ({filteredRegistrations.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد تسجيلات</h3>
                <p className="text-gray-600">لم يتم العثور على أي تسجيلات تطابق المعايير المحددة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => {
                  const tournament = tournaments.find(t => t.id === registration.tournamentId);
                  return (
                    <Card key={registration.id} className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Player Info */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-semibold text-gray-900">{registration.playerName}</h3>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{registration.playerEmail}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{registration.playerPhone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">العمر: {registration.playerAge} سنة</span>
                              </div>
                              {registration.accountName && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    <strong>الحساب التابع:</strong> {registration.accountName}
                                  </span>
                                </div>
                              )}
                              {registration.organizationName && registration.organizationName !== registration.accountName && (
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    <strong>المنظمة:</strong> {registration.organizationName}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tournament & Club Info */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-yellow-600" />
                              <h4 className="font-semibold text-gray-900">
                                {tournament?.name || 'بطولة غير محددة'}
                              </h4>
                            </div>
                            {tournament?.entryFee && tournament.entryFee > 0 && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-gray-600">
                                  <strong>رسوم البطولة:</strong> 
                                  <span className="font-bold text-green-600 ml-1">
                                    {tournament.entryFee} ج.م
                                  </span>
                                </span>
                              </div>
                            )}
                            <div className="space-y-2">
                              {registration.registrationType === 'club' && registration.clubName && (
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{registration.clubName}</span>
                                </div>
                              )}
                              {registration.playerClub && (
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{registration.playerClub}</span>
                                </div>
                              )}
                              {registration.playerPosition && (
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{registration.playerPosition}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {getRegistrationTypeBadge(registration.registrationType)}
                              {registration.accountType && getAccountTypeBadge(registration.accountType)}
                              {getPaymentStatusBadge(registration.paymentStatus)}
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm text-gray-600">
                                <strong>تاريخ التسجيل:</strong> {formatDate(registration.registrationDate)}
                              </div>
                              {registration.accountName && (
                                <div className="text-sm text-gray-600">
                                  <strong>اسم الحساب:</strong> {registration.accountName}
                                </div>
                              )}
                              {registration.organizationName && (
                                <div className="text-sm text-gray-600">
                                  <strong>المنظمة:</strong> {registration.organizationName}
                                </div>
                              )}
                              {registration.paymentMethod && (
                                <div className="text-sm text-gray-600">
                                  <strong>طريقة الدفع:</strong> {
                                    registration.paymentMethod === 'mobile_wallet' ? 'محفظة رقمية' :
                                    registration.paymentMethod === 'card' ? 'بطاقة ائتمان' :
                                    registration.paymentMethod === 'later' ? 'دفع لاحق' : registration.paymentMethod
                                  }
                                </div>
                              )}
                              {registration.mobileWalletProvider && (
                                <div className="text-sm text-gray-600">
                                  <strong>مزود المحفظة:</strong> {registration.mobileWalletProvider}
                                </div>
                              )}
                              {registration.receiptNumber && (
                                <div className="text-sm text-gray-600">
                                  <strong>رقم الإيصال:</strong> {registration.receiptNumber}
                                </div>
                              )}
                              {registration.paymentAmount > 0 && (
                                <div className="text-sm text-gray-600">
                                  <strong>قيمة الاشتراك المدفوع:</strong> 
                                  <span className="font-bold text-green-600 ml-2">
                                    {registration.paymentAmount} ج.م
                                  </span>
                                </div>
                              )}
                              {registration.notes && (
                                <div className="text-sm text-gray-600">
                                  <strong>ملاحظات:</strong> {registration.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
