'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SUPPORTED_COUNTRIES } from '@/data/countries-from-register';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import {
  Building2,
  CheckCircle,
  Clock,
  Download,
  Filter,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  Star,
  UserPlus,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Academy {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  location?: {
    countryId: string;
    countryName: string;
    cityId: string;
    cityName: string;
  };
  subscription?: {
    status: 'active' | 'expired' | 'cancelled' | 'trial';
    plan: string;
    expiresAt: Date;
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating?: number;
  playersCount?: number;
  license?: {
    number: string;
    expiryDate: Date;
    isVerified: boolean;
  };
  specialties?: string[];
  facilities?: string[];
  verifiedAt?: Date;
  verifiedBy?: {
    id: string;
    name: string;
  };
  verificationDocuments?: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  suspendedAt?: Date | null;
  suspensionEndDate?: Date | null;
  suspensionReason?: string;
}

export default function AcademiesManagement() {
  const { user, userData } = useAuth();

  // States
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<{
    countryId: string;
    cityId: string;
  }>({ countryId: '', cityId: '' });
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    verified: 0,
    pending: 0,
    totalPlayers: 0,
    averageRating: 0
  });

  // Load academies
  useEffect(() => {
    loadAcademies();
  }, []);

  const loadAcademies = async () => {
    try {
      setLoading(true);

      const { data: rows, error } = await supabase
        .from('users')
        .select('*')
        .eq('accountType', 'academy')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const academiesData = await processAcademiesData(rows || []);

      setAcademies(academiesData);
      updateStats(academiesData);

    } catch (error) {
      console.error('Error loading academies:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الأكاديميات');
    } finally {
      setLoading(false);
    }
  };

  // Update processAcademiesData function
  const processAcademiesData = async (rows: any[]) => {
    return Promise.all(
      rows.map(async (basicData: any) => {
        const docId = basicData.id;

        // Get players count from both tables
        const [usersCount1, usersCount2, playersCount1, playersCount2] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true })
            .eq('accountType', 'player').eq('academyId', docId),
          supabase.from('users').select('id', { count: 'exact', head: true })
            .eq('accountType', 'player').eq('academy_id', docId),
          supabase.from('players').select('id', { count: 'exact', head: true })
            .eq('academyId', docId),
          supabase.from('players').select('id', { count: 'exact', head: true })
            .eq('academy_id', docId),
        ]);

        // Since we can't easily deduplicate across tables, sum unique counts
        const playersCount = Math.max(
          (usersCount1.count || 0) + (usersCount2.count || 0),
          (playersCount1.count || 0) + (playersCount2.count || 0)
        );

        // Get average rating
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('rating')
          .eq('targetId', docId)
          .eq('targetType', 'academy');

        const ratings = (ratingsData || []).map((r: any) => r.rating);
        const averageRating = ratings.length
          ? +(ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1)
          : 0;

        // Get verification documents
        let verificationDocuments: any[] = [];
        try {
          const { data: docsData } = await supabase
            .from('verificationDocuments')
            .select('*')
            .eq('userId', docId)
            .order('uploadedAt', { ascending: false });

          verificationDocuments = (docsData || []).map((d: any) => ({
            ...d,
            uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : undefined
          }));
        } catch (error) {
          verificationDocuments = [];
        }

        // Get subscription info
        const { data: subscriptionsData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('userId', docId);

        const subscriptions = (subscriptionsData || [])
          .map((sub: any) => ({
            ...sub,
            createdAt: sub.createdAt ? new Date(sub.createdAt) : undefined,
            expiresAt: sub.expiresAt ? new Date(sub.expiresAt) : undefined
          }))
          .filter((sub: any) => ['active', 'trial'].includes(sub.status))
          .sort((a: any, b: any) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

        const subscription = subscriptions[0];

        // Format dates
        const createdAt = basicData.createdAt ? new Date(basicData.createdAt) : new Date();
        const lastLogin = basicData.lastLogin ? new Date(basicData.lastLogin) : undefined;
        const verifiedAt = basicData.verifiedAt ? new Date(basicData.verifiedAt) : undefined;
        const subscriptionData = subscription ? {
          status: (subscription as any).status,
          plan: (subscription as any).plan,
          expiresAt: subscription.expiresAt
        } : undefined;

        return {
          id: docId,
          ...basicData,
          createdAt,
          lastLogin,
          verifiedAt,
          playersCount,
          rating: averageRating,
          verificationDocuments,
          subscription: subscriptionData
        } as Academy;
      })
    );
  };

  // Update stats
  const updateStats = (academiesData: Academy[]) => {
    const totalPlayers = academiesData.reduce((sum, academy) => sum + (academy.playersCount || 0), 0);
    const totalRating = academiesData.reduce((sum, academy) => sum + (academy.rating || 0), 0);

    setStats({
      total: academiesData.length,
      active: academiesData.filter(a => a.isActive).length,
      verified: academiesData.filter(a => a.verificationStatus === 'verified').length,
      pending: academiesData.filter(a => a.verificationStatus === 'pending').length,
      totalPlayers,
      averageRating: academiesData.length ? +(totalRating / academiesData.length).toFixed(1) : 0
    });
  };

  // Filter academies
  const filteredAcademies = academies.filter(academy => {
    const academyName = academy.name || '';
    const academyEmail = academy.email || '';
    const academyPhone = academy.phone || '';

    const matchesSearch =
      academyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academyEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academyPhone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVerification = verificationFilter === 'all' ||
      academy.verificationStatus === verificationFilter;

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && academy.isActive) ||
      (statusFilter === 'inactive' && !academy.isActive);

    const matchesSubscription = subscriptionFilter === 'all' ||
      academy.subscription?.status === subscriptionFilter;

    const matchesRegion =
      (!regionFilter.countryId || academy.location?.countryId === regionFilter.countryId) &&
      (!regionFilter.cityId || academy.location?.cityId === regionFilter.cityId);

    return matchesSearch &&
      matchesVerification &&
      matchesStatus &&
      matchesSubscription &&
      matchesRegion;
  });

  // Update toggleAcademyStatus function
  const toggleAcademyStatus = async (academyId: string, currentStatus: boolean) => {
    try {
      await supabase.from('users').update({
        isActive: !currentStatus,
        updatedAt: new Date().toISOString()
      }).eq('id', academyId);

      // Update local state immediately
      setAcademies(prevAcademies =>
        prevAcademies.map(academy =>
          academy.id === academyId
            ? { ...academy, isActive: !currentStatus }
            : academy
        )
      );

      toast.success('تم تحديث حالة الأكاديمية بنجاح');
    } catch (error) {
      console.error('Error updating academy status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الأكاديمية');
    }
  };

  // Get verification badge
  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-50 text-green-600">تم التحقق</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-50 text-yellow-600">قيد المراجعة</Badge>;
      case 'rejected':
        return <Badge className="bg-red-50 text-red-600">مرفوض</Badge>;
      default:
        return <Badge variant="outline">غير محدد</Badge>;
    }
  };

  // Update RegionFilter component
  const RegionFilter = () => {
    const selectedCountry = regionFilter.countryId;
    // المدن غير متاحة حالياً
    const cities: string[] = [];

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>الدولة</Label>
          <Select
            value={regionFilter.countryId || "all"}
            onValueChange={(value) => setRegionFilter(prev => ({
              ...prev,
              countryId: value === "all" ? "" : value,
              cityId: ""
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع الدول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الدول</SelectItem>
              {SUPPORTED_COUNTRIES.map((country) => (
                <SelectItem key={country.name} value={country.name}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>المدينة</Label>
          <Select
            value={regionFilter.cityId || "all"}
            onValueChange={(value) => setRegionFilter(prev => ({
              ...prev,
              cityId: value === "all" ? "" : value
            }))}
            disabled={!selectedCountry}
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع المدن" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المدن</SelectItem>
              {cities?.map(city => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  // Add delete function
  const handleDeleteAcademy = async () => {
    if (!selectedAcademy) return;

    try {
      await supabase.from('users').delete().eq('id', selectedAcademy.id);

      // Update local state
      setAcademies(prevAcademies =>
        prevAcademies.filter(academy => academy.id !== selectedAcademy.id)
      );

      toast.success('تم حذف الأكاديمية بنجاح');
      setShowDeleteDialog(false);
      setSelectedAcademy(null);
    } catch (error) {
      console.error('Error deleting academy:', error);
      toast.error('حدث خطأ أثناء حذف الأكاديمية');
    }
  };

  // Add suspend function
  const handleSuspendAcademy = async () => {
    if (!selectedAcademy) return;

    try {
      const suspensionEndDate = new Date();
      suspensionEndDate.setDate(suspensionEndDate.getDate() + 30); // 30 days suspension

      await supabase.from('users').update({
        isActive: false,
        suspendedAt: new Date().toISOString(),
        suspensionEndDate: suspensionEndDate.toISOString(),
        suspensionReason: 'تم إيقاف الحساب مؤقتاً من قبل الإدارة',
        updatedAt: new Date().toISOString()
      }).eq('id', selectedAcademy.id);

      // Update local state
      setAcademies(prevAcademies =>
        prevAcademies.map(academy =>
          academy.id === selectedAcademy.id
            ? {
              ...academy,
              isActive: false,
              suspendedAt: new Date(),
              suspensionEndDate,
              suspensionReason: 'تم إيقاف الحساب مؤقتاً من قبل الإدارة'
            }
            : academy
        )
      );

      toast.success('تم إيقاف الأكاديمية مؤقتاً');
      setShowSuspendDialog(false);
      setSelectedAcademy(null);
    } catch (error) {
      console.error('Error suspending academy:', error);
      toast.error('حدث خطأ أثناء إيقاف الأكاديمية');
    }
  };

  // Add Profile Dialog Component
  const ProfileDialog = () => {
    if (!selectedAcademy) return null;

    return (
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              {selectedAcademy.name}
            </DialogTitle>
            <DialogDescription>
              معلومات الأكاديمية وإحصائياتها
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Basic Information */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">المعلومات الأساسية</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{selectedAcademy.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{selectedAcademy.phone || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>
                      {selectedAcademy.location ?
                        `${selectedAcademy.location.cityName}، ${selectedAcademy.location.countryName}`
                        : 'غير محدد'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">حالة الحساب</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedAcademy.isActive ? 'default' : 'destructive'} className={selectedAcademy.isActive ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {selectedAcademy.isActive ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  {selectedAcademy.suspendedAt && (
                    <div className="text-sm text-red-600">
                      تم الإيقاف في: {new Date(selectedAcademy.suspendedAt).toLocaleDateString('ar-SA')}
                      <br />
                      ينتهي في: {new Date(selectedAcademy.suspensionEndDate).toLocaleDateString('ar-SA')}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>تاريخ التسجيل: {new Date(selectedAcademy.createdAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">الإحصائيات</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>عدد اللاعبين:</span>
                    <Badge variant="outline">{selectedAcademy.playersCount || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>التقييم:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{selectedAcademy.rating || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Information */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">معلومات الاشتراك</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      selectedAcademy.subscription?.status === 'active' ? 'default' :
                        selectedAcademy.subscription?.status === 'trial' ? 'secondary' :
                          'destructive'
                    } className={selectedAcademy.subscription?.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {selectedAcademy.subscription?.status === 'active' ? 'نشط' :
                        selectedAcademy.subscription?.status === 'trial' ? 'تجريبي' :
                          'منتهي'}
                    </Badge>
                  </div>
                  {selectedAcademy.subscription?.expiresAt && (
                    <div className="text-sm">
                      ينتهي في: {new Date(selectedAcademy.subscription.expiresAt).toLocaleDateString('ar-SA')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Add Delete Dialog
  const DeleteDialog = () => (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد من حذف الأكاديمية؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم حذف جميع بيانات الأكاديمية بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAcademy}
            className="bg-red-500 hover:bg-red-600"
          >
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Add Suspend Dialog
  const SuspendDialog = () => (
    <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد إيقاف الأكاديمية مؤقتاً</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم إيقاف الأكاديمية مؤقتاً لمدة 30 يوم. خلال هذه الفترة لن تتمكن الأكاديمية من استخدام النظام.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSuspendAcademy}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            إيقاف مؤقت
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (loading) {
    return (
      <div className="bg-gray-50">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل بيانات الأكاديميات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      <main className="flex-1 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة الأكاديميات</h1>
            <p className="text-gray-600">إدارة حسابات الأكاديميات في النظام</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAcademies}>
              <RefreshCcw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 ml-2" />
              تصدير البيانات
            </Button>
            <Button>
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة أكاديمية
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الأكاديميات</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <GraduationCap className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-green-50 text-green-600">
                  {stats.active} نشط
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-600">
                  {stats.total - stats.active} غير نشط
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">حالة التحقق</p>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-green-50 text-green-600">
                  {stats.verified} تم التحقق
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-600">
                  {stats.pending} قيد المراجعة
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي اللاعبين</p>
                  <p className="text-2xl font-bold">{stats.totalPlayers}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-amber-50 text-amber-600">
                  متوسط التقييم: {stats.averageRating}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <Label>البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم، البريد، الهاتف..."
                  className="pr-10"
                />
              </div>
            </div>

            <div>
              <Label>حالة التحقق</Label>
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="verified">تم التحقق</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>الحالة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>حالة الاشتراك</Label>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الاشتراكات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الاشتراكات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                  <SelectItem value="trial">تجريبي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="xl:col-span-2">
              <Label>المنطقة</Label>
              <RegionFilter />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-600">
              {filteredAcademies.length} من {academies.length} أكاديمية
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                setSearchTerm('');
                setVerificationFilter('all');
                setStatusFilter('all');
                setSubscriptionFilter('all');
                setRegionFilter({ countryId: '', cityId: '' });
              }}>
                <Filter className="w-4 h-4 ml-2" />
                إعادة تعيين الفلاتر
              </Button>
            </div>
          </div>
        </div>

        {/* Academies Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الأكاديمية</TableHead>
                <TableHead>حالة التحقق</TableHead>
                <TableHead>الموقع</TableHead>
                <TableHead>اللاعبين</TableHead>
                <TableHead>التقييم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAcademies.map((academy) => (
                <TableRow key={academy.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">{academy.name}</div>
                        <div className="text-sm text-gray-500">{academy.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getVerificationBadge(academy.verificationStatus)}
                      {academy.verifiedAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(academy.verifiedAt).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {academy.location ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{academy.location.cityName}، {academy.location.countryName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{academy.playersCount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{academy.rating || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Switch
                        checked={academy.isActive}
                        onCheckedChange={() => toggleAcademyStatus(academy.id, academy.isActive)}
                        aria-label="تفعيل/تعطيل الأكاديمية"
                      />
                      {academy.subscription && (
                        <Badge
                          variant={
                            academy.subscription.status === 'active' ? 'default' :
                              academy.subscription.status === 'trial' ? 'secondary' :
                                'destructive'
                          }
                          className={`text-xs ${academy.subscription.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                        >
                          {academy.subscription.status === 'active' ? 'مشترك' :
                            academy.subscription.status === 'trial' ? 'تجريبي' :
                              'منتهي'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600"
                        onClick={() => {
                          setSelectedAcademy(academy);
                          setShowProfileDialog(true);
                        }}
                      >
                        عرض
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-yellow-600"
                        onClick={() => {
                          setSelectedAcademy(academy);
                          setShowSuspendDialog(true);
                        }}
                      >
                        إيقاف مؤقت
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          setSelectedAcademy(academy);
                          setShowDeleteDialog(true);
                        }}
                      >
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Add Dialogs */}
      <ProfileDialog />
      <DeleteDialog />
      <SuspendDialog />
    </div>
  );
}
