'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Trophy,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Save,
  X,
  UserPlus,
  Link,
  Download,
  Info,
  CreditCard,
  FileText,
  Settings,
  Image as ImageIcon,
  Upload,
  Navigation,
  Copy,
  Check,
  Calendar as CalendarIcon,
  CreditCard as CreditCardIcon
} from 'lucide-react';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import PaymentManagementModal from '@/components/payments/PaymentManagementModal';
import { getSupabaseClient } from '@/lib/supabase/config';

interface Tournament {
  id?: string;
  name: string;
  description: string;
  location: string;
  locationUrl?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  currency: string;
  isPaid: boolean;
  isActive: boolean;
  ageGroups: string[];
  categories: string[];
  rules: string;
  prizes: string;
  contactInfo: string;
  logo?: string;
  paymentMethods: string[];
  paymentDeadline: string;
  refundPolicy: string;
  feeType: 'individual' | 'club';
  maxPlayersPerClub?: number;
  allowInstallments?: boolean;
  installmentsCount?: number;
  installmentsDetails?: string;
  createdAt: Date;
  updatedAt: Date;
  registrations: TournamentRegistration[];
}

interface TournamentRegistration {
  id?: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  playerAge: number;
  playerClub: string;
  playerPosition: string;
  registrationDate: Date;
  paymentStatus: 'pending' | 'paid' | 'free';
  paymentAmount: number;
  notes?: string;
  registrationType?: 'individual' | 'club';
  clubName?: string;
  clubContact?: string;
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

const AdminTournamentsPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [viewingRegistrations, setViewingRegistrations] = useState<Tournament | null>(null);
  const [showProfessionalRegistrations, setShowProfessionalRegistrations] = useState(false);
  const [selectedTournamentForRegistrations, setSelectedTournamentForRegistrations] = useState<Tournament | null>(null);
  const [showPaymentManagement, setShowPaymentManagement] = useState(false);
  const [selectedTournamentForPayments, setSelectedTournamentForPayments] = useState<Tournament | null>(null);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState<Partial<Tournament>>({
    name: '',
    description: '',
    location: '',
    locationUrl: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    maxParticipants: 100,
    currentParticipants: 0,
    entryFee: 0,
    currency: 'EGP',
    isPaid: false,
    isActive: true,
    ageGroups: [],
    categories: [],
    rules: '',
    prizes: '',
    contactInfo: '',
    logo: '',
    paymentMethods: ['credit_card', 'bank_transfer'],
    paymentDeadline: '',
    refundPolicy: '',
    feeType: 'individual',
    maxPlayersPerClub: 1,
    allowInstallments: false,
    installmentsCount: 2,
    installmentsDetails: '',
    registrations: []
  });

  const ageGroups = [
    'تحت 8 سنوات',
    'تحت 10 سنوات', 
    'تحت 12 سنة',
    'تحت 14 سنة',
    'تحت 16 سنة',
    'تحت 18 سنة',
    'تحت 20 سنة',
    'كبار (20+ سنة)'
  ];

  const categories = [
    'أولاد',
    'بنات',
    'مختلط'
  ];

  const paymentMethods = [
    { id: 'credit_card', name: 'بطاقة ائتمان', icon: '💳' },
    { id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏦' },
    { id: 'mobile_wallet', name: 'محفظة إلكترونية', icon: '📱' },
    { id: 'cash', name: 'نقداً', icon: '💵' }
  ];

  const getCurrencySymbol = (currency: string): string => {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EGP': 'ج.م',
      'EUR': '€',
      'GBP': '£',
      'SAR': 'ر.س',
      'AED': 'د.إ',
      'KWD': 'د.ك',
      'QAR': 'ر.ق',
      'BHD': 'د.ب',
      'OMR': 'ر.ع',
      'JOD': 'د.أ',
      'LBP': 'ل.ل',
      'TND': 'د.ت',
      'DZD': 'د.ج',
      'MAD': 'د.م',
      'LYD': 'د.ل',
      'TRY': '₺',
      'RUB': '₽',
      'CNY': '¥',
      'JPY': '¥',
      'INR': '₹',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'CHF',
      'NZD': 'NZ$',
      'ZAR': 'R',
      'BRL': 'R$',
      'MXN': '$',
      'SGD': 'S$',
      'HKD': 'HK$',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'ILS': '₪',
      'THB': '฿',
      'MYR': 'RM'
    };
    return currencySymbols[currency] || currency;
  };

  // دالة لتنسيق التاريخ بصيغة DD/MM/YYYY (ميلادي فقط)
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
      
      // صيغة DD/MM/YYYY (ميلادي فقط)
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'غير محدد';
    }
  };

  const supabase = getSupabaseClient();

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      
      setLogoFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    if (!supabase) {
      toast.error('إعدادات التخزين غير متاحة حالياً. يرجى التحقق من إعدادات Supabase.');
      return null;
    }
    
    try {
      setLogoUploading(true);
      
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `tournament-logo-${Date.now()}.${fileExt}`;
      
      const buckets = ['profile-images', 'avatars', 'additional-images'];
      let uploadSuccess = false;
      let publicUrl = '';
      
      for (const bucket of buckets) {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, logoFile);
          
          if (error) {
            continue;
          }
          
          const { data: { publicUrl: url } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          
          publicUrl = url;
          uploadSuccess = true;
          break;
        } catch (bucketError) {
          continue;
        }
      }
      
      if (!uploadSuccess) {
        toast.error('فشل في رفع اللوجو');
        return null;
      }
      
      toast.success('تم رفع اللوجو بنجاح');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('فشل في رفع اللوجو');
      return null;
    } finally {
      setLogoUploading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tournamentsData: Tournament[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure isActive is always a boolean (handle undefined/null cases)
          isActive: data.isActive === true,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          registrations: data.registrations || [],
          // Ensure other fields have default values
          currency: data.currency || 'EGP',
          paymentMethods: data.paymentMethods || ['credit_card', 'bank_transfer'],
          ageGroups: data.ageGroups || [],
          categories: data.categories || []
        };
      }) as Tournament[];
      
      console.log(`📊 Loaded ${tournamentsData.length} tournaments from admin page`);
      console.log(`✅ Active tournaments: ${tournamentsData.filter(t => t.isActive).length}`);
      
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let logoUrl = formData.logo;
      
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          toast.error('فشل في رفع اللوجو');
          return;
        }
      }
      
      const tournamentData: Partial<Tournament> = {
        ...formData,
        logo: logoUrl,
        createdAt: editingTournament ? editingTournament.createdAt : new Date(),
        updatedAt: new Date(),
        currentParticipants: editingTournament?.currentParticipants || 0,
        registrations: editingTournament?.registrations || [],
        // Ensure isActive is always a boolean (not undefined)
        isActive: formData.isActive === true,
        // Ensure currency has a default value
        currency: formData.currency || 'EGP',
        // Ensure all required fields have values
        paymentMethods: formData.paymentMethods || ['credit_card', 'bank_transfer'],
        ageGroups: formData.ageGroups || [],
        categories: formData.categories || []
      };

      if (editingTournament) {
        await updateDoc(doc(db, 'tournaments', editingTournament.id!), tournamentData);
        toast.success('تم تحديث البطولة بنجاح');
      } else {
        await addDoc(collection(db, 'tournaments'), tournamentData);
        toast.success('تم إنشاء البطولة بنجاح');
      }

      setShowAddDialog(false);
      setEditingTournament(null);
      resetForm();
      fetchTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast.error('فشل في حفظ البطولة');
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      ...tournament,
      startDate: tournament.startDate.split('T')[0],
      endDate: tournament.endDate.split('T')[0],
      registrationDeadline: tournament.registrationDeadline.split('T')[0],
      paymentDeadline: tournament.paymentDeadline ? tournament.paymentDeadline.split('T')[0] : '',
      isActive: tournament.isActive === true,
      paymentMethods: tournament.paymentMethods || ['credit_card', 'bank_transfer'],
      refundPolicy: tournament.refundPolicy || '',
      feeType: tournament.feeType || 'individual',
      maxPlayersPerClub: tournament.maxPlayersPerClub || 1,
      allowInstallments: tournament.allowInstallments || false,
      installmentsCount: tournament.installmentsCount || 2,
      installmentsDetails: tournament.installmentsDetails || '',
      locationUrl: tournament.locationUrl || ''
    });
    setShowAddDialog(true);
  };

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

  const resetForm = () => {
    setActiveTab('basic');
    setFormData({
      name: '',
      description: '',
      location: '',
      locationUrl: '',
      startDate: '',
      endDate: '',
      registrationDeadline: '',
      maxParticipants: 100,
      currentParticipants: 0,
      entryFee: 0,
      isPaid: false,
      isActive: true,
      ageGroups: [],
      categories: [],
      rules: '',
      prizes: '',
      contactInfo: '',
      logo: '',
      paymentMethods: ['credit_card', 'bank_transfer'],
      paymentDeadline: '',
      refundPolicy: '',
      feeType: 'individual',
      maxPlayersPerClub: 1,
      allowInstallments: false,
      installmentsCount: 2,
      installmentsDetails: '',
      registrations: []
    });
    
    setLogoFile(null);
    setLogoPreview('');
  };

  const openMapLocation = () => {
    const location = formData.location || '';
    if (!location) {
      toast.info('يرجى إدخال اسم المكان أولاً');
      return;
    }

    try {
      // ترميز اسم المكان للبحث
      const encodedLocation = encodeURIComponent(location);
      
      // فتح Google Maps في تبويب جديد
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening maps:', error);
      toast.error('فشل في فتح الخريطة. يرجى التحقق من إعدادات المتصفح للسماح بالنوافذ المنبثقة');
    }
  };

  const handleLocationUrlPaste = async () => {
    try {
      // التحقق من دعم Clipboard API
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error('المتصفح لا يدعم قراءة الحافظة. يرجى نسخ الرابط يدوياً');
        return;
      }

      const text = await navigator.clipboard.readText();
      
      // التحقق من أن الرابط صحيح من Google Maps
      if (text.includes('maps.google.com') || 
          text.includes('goo.gl/maps') || 
          text.includes('maps.app.goo.gl') ||
          text.startsWith('https://maps.google.com') ||
          text.startsWith('http://maps.google.com')) {
        setFormData(prev => ({...prev, locationUrl: text}));
        toast.success('تم لصق رابط الموقع بنجاح');
      } else {
        toast.error('الرجاء لصق رابط صحيح من Google Maps');
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
      toast.error('فشل في قراءة الحافظة. يرجى نسخ الرابط يدوياً');
    }
  };

  const getStatusColor = (tournament: Tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);
    const deadline = new Date(tournament.registrationDeadline);

    if (now > endDate) return 'bg-gray-500';
    if (now > startDate) return 'bg-green-500';
    if (now > deadline) return 'bg-red-500';
    return 'bg-blue-500';
  };

  const getStatusText = (tournament: Tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);
    const deadline = new Date(tournament.registrationDeadline);

    if (now > endDate) return 'انتهت';
    if (now > startDate) return 'جارية';
    if (now > deadline) return 'انتهى التسجيل';
    return 'قادمة';
  };

  if (loading) {
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
                  resetForm();
                  setShowAddDialog(true);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
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
                    resetForm();
                    setShowAddDialog(true);
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
                <Card key={tournament.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {tournament.logo ? (
                          <img 
                            src={tournament.logo} 
                            alt={tournament.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Trophy className="h-8 w-8 text-yellow-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                            {tournament.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${getStatusColor(tournament)} text-white text-xs`}>
                              {getStatusText(tournament)}
                            </Badge>
                            {tournament.isPaid && (
                              <Badge className="bg-green-500 text-white text-xs">
                                مدفوعة
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingRegistrations(tournament)}
                          className="h-9 w-9 p-0"
                          title="عرض التسجيلات"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tournament)}
                          className="h-9 w-9 p-0"
                          title="تعديل البطولة"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tournament.id!)}
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="حذف البطولة"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">المكان</p>
                          <p className="text-sm font-medium text-gray-900">{tournament.location}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">تاريخ البداية</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(tournament.startDate)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">المشاركون</p>
                          <p className="text-sm font-medium text-gray-900">
                            {tournament.currentParticipants}/{tournament.maxParticipants}
                          </p>
                        </div>
                      </div>
                      
                      {tournament.isPaid && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">الرسوم</p>
                            <p className="text-sm font-medium text-gray-900">
                              {tournament.entryFee} {getCurrencySymbol(tournament.currency || 'EGP')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {tournament.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{tournament.description}</p>
                    )}
                    
                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tournament.isActive === true}
                            onCheckedChange={async (checked) => {
                              try {
                                await updateDoc(doc(db, 'tournaments', tournament.id!), {
                                  isActive: checked,
                                  updatedAt: new Date()
                                });
                                toast.success(checked ? 'تم تفعيل البطولة' : 'تم إلغاء تفعيل البطولة');
                                fetchTournaments();
                              } catch (error) {
                                console.error('Error updating tournament status:', error);
                                toast.error('فشل في تحديث حالة البطولة');
                              }
                            }}
                          />
                          <span className={`text-sm font-medium ${tournament.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                            {tournament.isActive ? 'نشطة' : 'غير نشطة'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              const registrationUrl = `${window.location.origin}/tournaments/unified-registration?tournamentId=${tournament.id}`;
                              navigator.clipboard.writeText(registrationUrl);
                              toast.success('تم نسخ رابط التسجيل');
                            }
                          }}
                          className="text-xs"
                        >
                          <Link className="h-3 w-3 mr-1" />
                          رابط التسجيل
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTournamentForRegistrations(tournament);
                            setShowProfessionalRegistrations(true);
                          }}
                          className="text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          المسجلين
                        </Button>
                        {tournament.isPaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTournamentForPayments(tournament);
                              setShowPaymentManagement(true);
                            }}
                            className="text-xs col-span-2"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            إدارة المدفوعات
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Dialog - Redesigned */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setEditingTournament(null);
            resetForm();
            setActiveTab('basic');
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    {editingTournament ? 'تعديل البطولة' : 'إضافة بطولة جديدة'}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-gray-600">
                    {editingTournament ? 'قم بتعديل بيانات البطولة' : 'أدخل بيانات البطولة الجديدة'}
                  </DialogDescription>
                </div>
                {editingTournament && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const registrationUrl = `${window.location.origin}/tournaments/unified-registration?tournamentId=${editingTournament.id}`;
                        navigator.clipboard.writeText(registrationUrl);
                        toast.success('تم نسخ رابط التسجيل');
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Link className="h-4 w-4" />
                    نسخ رابط التسجيل
                  </Button>
                )}
              </div>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-6 mt-4 mb-0 grid w-auto grid-cols-5 h-auto bg-gray-100 p-1">
                  <TabsTrigger value="basic" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">معلومات أساسية</span>
                    <span className="sm:hidden">أساسية</span>
                  </TabsTrigger>
                  <TabsTrigger value="dates" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">التواريخ</span>
                    <span className="sm:hidden">التواريخ</span>
                  </TabsTrigger>
                  <TabsTrigger value="fees" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">الرسوم</span>
                    <span className="sm:hidden">الرسوم</span>
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">الفئات</span>
                    <span className="sm:hidden">الفئات</span>
                  </TabsTrigger>
                  <TabsTrigger value="additional" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">إضافية</span>
                    <span className="sm:hidden">إضافية</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {/* Tab 1: Basic Information */}
                  <TabsContent value="basic" className="mt-4 space-y-6">
                    <Card className="border-2 border-blue-100">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Info className="h-5 w-5 text-blue-600" />
                          المعلومات الأساسية
                        </CardTitle>
                        <CardDescription>البيانات الأساسية للبطولة</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-yellow-600" />
                              اسم البطولة *
                            </Label>
                            <Input
                              id="name"
                              value={formData.name || ''}
                              onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                              placeholder="مثال: بطولة العلمين الدولية"
                              required
                              className="h-11"
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description" className="text-sm font-semibold">وصف البطولة *</Label>
                            <Textarea
                              id="description"
                              value={formData.description || ''}
                              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                              placeholder="وصف مفصل عن البطولة..."
                              required
                              rows={4}
                              className="resize-none"
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="location" className="text-sm font-semibold flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-500" />
                              مكان البطولة *
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="location"
                                value={formData.location || ''}
                                onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                                placeholder="مثال: ملعب العلمين الرياضي"
                                required
                                className="flex-1 h-11"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openMapLocation();
                                }}
                                className="h-11 px-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                title="فتح الخريطة على Google Maps"
                              >
                                <Navigation className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="locationUrl" className="text-xs text-gray-600 flex items-center gap-2">
                                <Link className="h-3 w-3" />
                                رابط الموقع (اختياري)
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id="locationUrl"
                                  type="url"
                                  value={formData.locationUrl || ''}
                                  onChange={(e) => setFormData(prev => ({...prev, locationUrl: e.target.value}))}
                                  placeholder="https://maps.google.com/..."
                                  className="flex-1 h-10 text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleLocationUrlPaste}
                                  className="h-10 px-3"
                                  title="لصق من الحافظة"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500">
                                💡 يمكنك نسخ رابط الموقع من Google Maps ولصقه هنا
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="maxParticipants" className="text-sm font-semibold flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-600" />
                              الحد الأقصى للمشاركين *
                            </Label>
                            <Input
                              id="maxParticipants"
                              type="number"
                              min="1"
                              value={formData.maxParticipants || 100}
                              onChange={(e) => setFormData(prev => ({...prev, maxParticipants: parseInt(e.target.value) || 100}))}
                              required
                              className="h-11"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t border-gray-200">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-purple-600" />
                            لوجو البطولة
                          </Label>
                          {(logoPreview || formData.logo) && (
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                              <img 
                                src={logoPreview || formData.logo} 
                                alt="Logo preview"
                                className="w-16 h-16 object-cover rounded-lg border-2 border-purple-300 shadow-sm"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">معاينة اللوجو</p>
                                <p className="text-xs text-gray-500">تم تحميل اللوجو بنجاح</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setLogoFile(null);
                                  setLogoPreview('');
                                  setFormData(prev => ({...prev, logo: ''}));
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-600 flex items-center gap-2">
                                <Upload className="h-3 w-3" />
                                رفع ملف
                              </Label>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoFileChange}
                                disabled={logoUploading}
                                className="h-10 cursor-pointer"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-600">أو رابط اللوجو</Label>
                              <Input
                                type="url"
                                value={formData.logo || ''}
                                onChange={(e) => setFormData(prev => ({...prev, logo: e.target.value}))}
                                placeholder="https://example.com/logo.png"
                                className="h-10"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 2: Dates */}
                  <TabsContent value="dates" className="mt-4 space-y-6">
                    <Card className="border-2 border-green-100">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Calendar className="h-5 w-5 text-green-600" />
                          التواريخ والمواعيد
                        </CardTitle>
                        <CardDescription>تواريخ البطولة ومواعيد التسجيل</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startDate" className="text-sm font-semibold">تاريخ البداية *</Label>
                            <Input
                              id="startDate"
                              type="date"
                              value={formData.startDate || ''}
                              onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
                              required
                              className="h-11"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="endDate" className="text-sm font-semibold">تاريخ النهاية *</Label>
                            <Input
                              id="endDate"
                              type="date"
                              value={formData.endDate || ''}
                              onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
                              required
                              className="h-11"
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="registrationDeadline" className="text-sm font-semibold">آخر موعد للتسجيل *</Label>
                            <Input
                              id="registrationDeadline"
                              type="date"
                              value={formData.registrationDeadline || ''}
                              onChange={(e) => setFormData(prev => ({...prev, registrationDeadline: e.target.value}))}
                              required
                              className="h-11"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 3: Fees */}
                  <TabsContent value="fees" className="mt-4 space-y-6">
                    <Card className="border-2 border-yellow-100">
                      <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <DollarSign className="h-5 w-5 text-yellow-600" />
                          الرسوم وطرق الدفع
                        </CardTitle>
                        <CardDescription>إعدادات الرسوم وطرق الدفع المتاحة</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                          <div className="flex items-center gap-3">
                            <Switch
                              id="isPaid"
                              checked={formData.isPaid || false}
                              onCheckedChange={(checked) => setFormData(prev => ({...prev, isPaid: checked}))}
                            />
                            <Label htmlFor="isPaid" className="text-base font-semibold cursor-pointer">
                              بطولة مدفوعة
                            </Label>
                          </div>
                          <Badge variant={formData.isPaid ? "default" : "secondary"}>
                            {formData.isPaid ? 'مدفوعة' : 'مجانية'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="entryFee" className="text-sm font-semibold flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              رسوم المشاركة *
                            </Label>
                            <div className="flex gap-3">
                              <Input
                                id="entryFee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.entryFee || 0}
                                onChange={(e) => setFormData(prev => ({...prev, entryFee: parseFloat(e.target.value) || 0}))}
                                placeholder="0.00"
                                className="flex-[2] min-w-[200px] h-16 text-2xl font-bold text-center"
                                disabled={!formData.isPaid}
                              />
                              <Select
                                value={formData.currency || 'EGP'}
                                onValueChange={(value) => setFormData(prev => ({...prev, currency: value}))}
                                disabled={!formData.isPaid}
                              >
                                <SelectTrigger className="w-36 h-16 text-base font-medium">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EGP">ج.م (EGP)</SelectItem>
                                  <SelectItem value="USD">$ (USD)</SelectItem>
                                  <SelectItem value="EUR">€ (EUR)</SelectItem>
                                  <SelectItem value="SAR">ر.س (SAR)</SelectItem>
                                  <SelectItem value="AED">د.إ (AED)</SelectItem>
                                  <SelectItem value="KWD">د.ك (KWD)</SelectItem>
                                  <SelectItem value="QAR">ر.ق (QAR)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">نوع الرسوم *</Label>
                            <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  id="feeType-individual"
                                  name="feeType"
                                  value="individual"
                                  checked={formData.feeType === 'individual'}
                                  onChange={(e) => setFormData(prev => ({...prev, feeType: e.target.value as 'individual' | 'club'}))}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <Label htmlFor="feeType-individual" className="cursor-pointer">للاعب الواحد</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  id="feeType-club"
                                  name="feeType"
                                  value="club"
                                  checked={formData.feeType === 'club'}
                                  onChange={(e) => setFormData(prev => ({...prev, feeType: e.target.value as 'individual' | 'club'}))}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <Label htmlFor="feeType-club" className="cursor-pointer">للنادي</Label>
                              </div>
                            </div>
                            {formData.feeType === 'club' && (
                              <Input
                                type="number"
                                min="1"
                                value={formData.maxPlayersPerClub || 1}
                                onChange={(e) => setFormData(prev => ({...prev, maxPlayersPerClub: parseInt(e.target.value) || 1}))}
                                placeholder="عدد اللاعبين الأقصى للنادي"
                                className="h-11"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                          <div className="flex items-center gap-3">
                            <Switch
                              id="allowInstallments"
                              checked={formData.allowInstallments || false}
                              onCheckedChange={(checked) => setFormData(prev => ({...prev, allowInstallments: checked}))}
                            />
                            <Label htmlFor="allowInstallments" className="text-base font-semibold cursor-pointer">
                              السماح بالدفع بالتقسيط
                            </Label>
                          </div>
                          <Badge variant={formData.allowInstallments ? "default" : "secondary"}>
                            {formData.allowInstallments ? 'مفعل' : 'معطل'}
                          </Badge>
                        </div>

                        {formData.allowInstallments && (
                          <div className="space-y-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                            <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                              <CreditCardIcon className="h-5 w-5" />
                              إعدادات التقسيط
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="installmentsCount" className="text-sm font-semibold">عدد الأقساط *</Label>
                                <Input
                                  id="installmentsCount"
                                  type="number"
                                  min="2"
                                  max="12"
                                  value={formData.installmentsCount || 2}
                                  onChange={(e) => setFormData(prev => ({...prev, installmentsCount: parseInt(e.target.value) || 2}))}
                                  className="h-11"
                                />
                                <p className="text-xs text-gray-500">عدد الأقساط المتاحة (من 2 إلى 12)</p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="installmentsDetails" className="text-sm font-semibold">تفاصيل التقسيط</Label>
                                <Textarea
                                  id="installmentsDetails"
                                  value={formData.installmentsDetails || ''}
                                  onChange={(e) => setFormData(prev => ({...prev, installmentsDetails: e.target.value}))}
                                  placeholder="مثال: يمكن تقسيم المبلغ على 3 أقساط، القسط الأول عند التسجيل..."
                                  rows={3}
                                  className="resize-none"
                                />
                              </div>
                            </div>
                            
                            {formData.installmentsCount && formData.entryFee && (
                              <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200">
                                <p className="text-sm font-semibold text-indigo-900 mb-2">مثال على الأقساط:</p>
                                <div className="space-y-1">
                                  {Array.from({ length: formData.installmentsCount }, (_, i) => {
                                    const installmentAmount = (formData.entryFee || 0) / (formData.installmentsCount || 2);
                                    return (
                                      <div key={i} className="flex justify-between text-sm">
                                        <span className="text-gray-600">القسط {i + 1}:</span>
                                        <span className="font-semibold text-indigo-700">
                                          {installmentAmount.toFixed(2)} {getCurrencySymbol(formData.currency || 'EGP')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {formData.isPaid && (
                          <div className="space-y-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-2 border-emerald-200">
                            <h4 className="font-semibold text-emerald-900 flex items-center gap-2">
                              <CreditCard className="h-5 w-5" />
                              إعدادات الدفع
                            </h4>
                            
                            <div className="space-y-2">
                              <Label htmlFor="paymentDeadline" className="text-sm font-semibold">آخر موعد للدفع</Label>
                              <Input
                                id="paymentDeadline"
                                type="date"
                                value={formData.paymentDeadline || ''}
                                onChange={(e) => setFormData(prev => ({...prev, paymentDeadline: e.target.value}))}
                                className="h-11"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">طرق الدفع المتاحة *</Label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {paymentMethods.map((method) => (
                                  <div 
                                    key={method.id} 
                                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      formData.paymentMethods?.includes(method.id) 
                                        ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => {
                                      const currentMethods = formData.paymentMethods || [];
                                      if (currentMethods.includes(method.id)) {
                                        setFormData(prev => ({...prev, paymentMethods: currentMethods.filter(m => m !== method.id)}));
                                      } else {
                                        setFormData(prev => ({...prev, paymentMethods: [...currentMethods, method.id]}));
                                      }
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      id={`paymentMethod-${method.id}`}
                                      checked={formData.paymentMethods?.includes(method.id) || false}
                                      onChange={() => {}}
                                      className="h-4 w-4"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Label htmlFor={`paymentMethod-${method.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                                      <span className="text-lg">{method.icon}</span>
                                      <span className="text-sm">{method.name}</span>
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="refundPolicy" className="text-sm font-semibold">سياسة الاسترداد</Label>
                              <Textarea
                                id="refundPolicy"
                                value={formData.refundPolicy || ''}
                                onChange={(e) => setFormData(prev => ({...prev, refundPolicy: e.target.value}))}
                                placeholder="سياسة استرداد الرسوم في حالة الإلغاء..."
                                rows={3}
                                className="resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 4: Categories */}
                  <TabsContent value="categories" className="mt-4 space-y-6">
                    <Card className="border-2 border-purple-100">
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Users className="h-5 w-5 text-purple-600" />
                          الفئات العمرية والجنس
                        </CardTitle>
                        <CardDescription>اختر الفئات العمرية والجنس المناسبة للبطولة</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            الفئات العمرية *
                          </Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {ageGroups.map((ageGroup) => (
                              <div 
                                key={ageGroup}
                                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                  formData.ageGroups?.includes(ageGroup)
                                    ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => {
                                  const currentGroups = formData.ageGroups || [];
                                  if (currentGroups.includes(ageGroup)) {
                                    setFormData(prev => ({...prev, ageGroups: currentGroups.filter(g => g !== ageGroup)}));
                                  } else {
                                    setFormData(prev => ({...prev, ageGroups: [...currentGroups, ageGroup]}));
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  id={`ageGroup-${ageGroup}`}
                                  checked={formData.ageGroups?.includes(ageGroup) || false}
                                  onChange={() => {}}
                                  className="h-4 w-4"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Label htmlFor={`ageGroup-${ageGroup}`} className="cursor-pointer flex-1 text-sm">
                                  {ageGroup}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t border-gray-200">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-pink-600" />
                            الفئات *
                          </Label>
                          <div className="flex flex-wrap gap-3">
                            {categories.map((category) => (
                              <div 
                                key={category}
                                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all min-w-[120px] ${
                                  formData.categories?.includes(category)
                                    ? 'bg-pink-50 border-pink-300 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => {
                                  const currentCategories = formData.categories || [];
                                  if (currentCategories.includes(category)) {
                                    setFormData(prev => ({...prev, categories: currentCategories.filter(c => c !== category)}));
                                  } else {
                                    setFormData(prev => ({...prev, categories: [...currentCategories, category]}));
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  id={`category-${category}`}
                                  checked={formData.categories?.includes(category) || false}
                                  onChange={() => {}}
                                  className="h-4 w-4"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Label htmlFor={`category-${category}`} className="cursor-pointer flex-1 text-sm">
                                  {category}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 5: Additional Information */}
                  <TabsContent value="additional" className="mt-4 space-y-6">
                    <Card className="border-2 border-indigo-100">
                      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FileText className="h-5 w-5 text-indigo-600" />
                          التفاصيل الإضافية
                        </CardTitle>
                        <CardDescription>قوانين البطولة، الجوائز، ومعلومات الاتصال</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="rules" className="text-sm font-semibold">قوانين البطولة</Label>
                          <Textarea
                            id="rules"
                            value={formData.rules || ''}
                            onChange={(e) => setFormData(prev => ({...prev, rules: e.target.value}))}
                            placeholder="قوانين ولوائح البطولة..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="prizes" className="text-sm font-semibold">الجوائز</Label>
                          <Textarea
                            id="prizes"
                            value={formData.prizes || ''}
                            onChange={(e) => setFormData(prev => ({...prev, prizes: e.target.value}))}
                            placeholder="تفاصيل الجوائز والمكافآت..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="contactInfo" className="text-sm font-semibold">معلومات الاتصال</Label>
                          <Textarea
                            id="contactInfo"
                            value={formData.contactInfo || ''}
                            onChange={(e) => setFormData(prev => ({...prev, contactInfo: e.target.value}))}
                            placeholder="رقم الهاتف، البريد الإلكتروني..."
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>

                {/* Footer with Status and Submit */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="isActive"
                      checked={formData.isActive === true}
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, isActive: checked}))}
                    />
                    <Label htmlFor="isActive" className="text-sm font-semibold cursor-pointer">
                      البطولة نشطة
                    </Label>
                    <Badge variant={formData.isActive ? "default" : "secondary"}>
                      {formData.isActive ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddDialog(false);
                        setEditingTournament(null);
                        resetForm();
                        setActiveTab('basic');
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white flex items-center gap-2 shadow-lg"
                    >
                      <Save className="h-4 w-4" />
                      {editingTournament ? 'تحديث البطولة' : 'إنشاء البطولة'}
                    </Button>
                  </div>
                </div>
              </Tabs>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Registrations Dialog */}
        <Dialog open={!!viewingRegistrations} onOpenChange={() => setViewingRegistrations(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>المسجلين في بطولة: {viewingRegistrations?.name}</DialogTitle>
              <DialogDescription>قائمة اللاعبين المسجلين في البطولة</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {viewingRegistrations?.registrations?.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد مسجلين</h3>
                  <p className="text-gray-500">لم يسجل أي لاعب في هذه البطولة بعد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {viewingRegistrations?.registrations?.map((registration, index) => (
                    <Card key={registration.id || index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{registration.playerName}</h4>
                            <p className="text-sm text-gray-600">{registration.playerEmail}</p>
                            <p className="text-sm text-gray-600">{registration.playerPhone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">العمر: {registration.playerAge} سنة</p>
                            <p className="text-sm text-gray-600">النادي: {registration.playerClub}</p>
                            <p className="text-sm text-gray-600">المركز: {registration.playerPosition}</p>
                          </div>
                          <div>
                            <Badge className={
                              registration.paymentStatus === 'paid' ? 'bg-green-500' :
                              registration.paymentStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                            }>
                              {registration.paymentStatus === 'paid' ? 'مدفوع' :
                               registration.paymentStatus === 'pending' ? 'في الانتظار' : 'مجاني'}
                            </Badge>
                            {registration.paymentAmount > 0 && (
                              <p className="text-sm text-green-600 font-bold mt-1">
                                {registration.paymentAmount} {getCurrencySymbol(viewingRegistrations?.currency || 'EGP')}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Professional Registrations Modal */}
        <Dialog open={showProfessionalRegistrations} onOpenChange={setShowProfessionalRegistrations}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">
                بيانات المسجلين - {selectedTournamentForRegistrations?.name}
              </DialogTitle>
              <DialogDescription className="text-center">
                عرض شامل لجميع بيانات المسجلين في البطولة مع إمكانية التصدير
              </DialogDescription>
            </DialogHeader>

            <ProfessionalRegistrationsContent 
              tournament={selectedTournamentForRegistrations}
              onClose={() => setShowProfessionalRegistrations(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Payment Management Modal */}
        {selectedTournamentForPayments && (
          <PaymentManagementModal
            isOpen={showPaymentManagement}
            onClose={() => {
              setShowPaymentManagement(false);
              setSelectedTournamentForPayments(null);
            }}
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
}

// Professional Registrations Content Component
function ProfessionalRegistrationsContent({ tournament, onClose }: { tournament: Tournament | null, onClose: () => void }) {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRegistrations = async () => {
    if (!tournament) return;
    
    try {
      setLoading(true);
      
      // Fetch from both collections (new and old format)
      const allRegistrations: any[] = [];
      
      // Fetch from tournament_registrations (old format - individual registrations)
      try {
        const oldRegistrationsQuery = query(
          collection(db, 'tournament_registrations'),
          where('tournamentId', '==', tournament.id)
        );
        const oldSnapshot = await getDocs(oldRegistrationsQuery);
        const oldRegistrations = oldSnapshot.docs.map(doc => ({
          id: doc.id,
          collection: 'tournament_registrations',
          ...doc.data()
        }));
        allRegistrations.push(...oldRegistrations);
        console.log(`📋 Loaded ${oldRegistrations.length} registrations from tournament_registrations`);
      } catch (error) {
        console.error('Error fetching from tournament_registrations:', error);
      }
      
      // Fetch from tournamentRegistrations (new format - group registrations)
      try {
        const newRegistrationsQuery = query(
          collection(db, 'tournamentRegistrations'),
          where('tournamentId', '==', tournament.id)
        );
        const newSnapshot = await getDocs(newRegistrationsQuery);
        const newRegistrations = newSnapshot.docs.map(doc => {
          const data = doc.data();
          // Expand group registrations to individual entries for display
          const players = data.players || [];
          return players.map((player: any, index: number) => ({
            id: `${doc.id}_${index}`,
            registrationId: doc.id,
            collection: 'tournamentRegistrations',
            tournamentId: data.tournamentId,
            playerId: player.id,
            playerName: player.name || player.full_name || 'غير محدد',
            playerEmail: player.email || data.accountEmail || '',
            playerPhone: player.phone || data.accountPhone || '',
            playerBirthDate: player.birth_date || player.birthDate,
            playerClub: player.club_id || data.clubName || data.organizationName || '',
            playerPosition: player.position || player.primary_position || '',
            registrationDate: data.registrationDate || data.createdAt || new Date(),
            paymentStatus: data.paymentStatus || 'pending',
            paymentAmount: data.paymentAmount || 0,
            paymentMethod: data.paymentMethod,
            mobileWalletProvider: data.mobileWalletProvider,
            mobileWalletNumber: data.mobileWalletNumber,
            receiptUrl: data.receiptUrl,
            receiptNumber: data.receiptNumber,
            geideaOrderId: data.geideaOrderId,
            geideaTransactionId: data.geideaTransactionId,
            notes: data.notes,
            registrationType: data.registrationType,
            accountType: data.accountType,
            accountName: data.accountName,
            accountEmail: data.accountEmail,
            accountPhone: data.accountPhone,
            organizationName: data.organizationName,
            organizationType: data.organizationType,
            clubName: data.clubName
          }));
        }).flat();
        allRegistrations.push(...newRegistrations);
        console.log(`📋 Loaded ${newRegistrations.length} registrations from tournamentRegistrations`);
      } catch (error) {
        console.error('Error fetching from tournamentRegistrations:', error);
      }
      
      console.log(`✅ Total registrations loaded: ${allRegistrations.length} for tournament "${tournament.name}"`);
      
      setRegistrations(allRegistrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('فشل في تحميل بيانات المسجلين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournament) {
      fetchRegistrations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament]);

  const getCurrencySymbol = (currency: string): string => {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EGP': 'ج.م',
      'EUR': '€',
      'GBP': '£',
      'SAR': 'ر.س',
      'AED': 'د.إ',
      'KWD': 'د.ك',
      'QAR': 'ر.ق',
      'BHD': 'د.ب',
      'OMR': 'ر.ع',
      'JOD': 'د.أ',
      'LBP': 'ل.ل',
      'TND': 'د.ت',
      'DZD': 'د.ج',
      'MAD': 'د.م',
      'LYD': 'د.ل',
      'TRY': '₺',
      'RUB': '₽',
      'CNY': '¥',
      'JPY': '¥',
      'INR': '₹',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'CHF',
      'NZD': 'NZ$',
      'ZAR': 'R',
      'BRL': 'R$',
      'MXN': '$',
      'SGD': 'S$',
      'HKD': 'HK$',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'ILS': '₪',
      'THB': '฿',
      'MYR': 'RM'
    };
    return currencySymbols[currency] || currency;
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
      
      // صيغة DD/MM/YYYY (ميلادي فقط)
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'غير محدد';
    }
  };

  const exportToExcel = () => {
    const headers = [
      'اسم المسجل', 'البريد الإلكتروني', 'رقم الهاتف', 'العمر', 'النادي', 'المركز',
      'نوع التسجيل', 'نوع الحساب', 'اسم الحساب', 'اسم النادي', 'جهة الاتصال',
      'طريقة الدفع', 'مزود المحفظة', 'رقم المحفظة', 'رقم الإيصال',
      'تاريخ التسجيل', 'حالة الدفع', 'المبلغ', 'الملاحظات'
    ];

    const csvContent = [
      headers.join(','),
      ...registrations.map(reg => [
        reg.playerName || '',
        reg.playerEmail || '',
        reg.playerPhone || '',
        reg.playerAge || '',
        reg.playerClub || '',
        reg.playerPosition || '',
        reg.registrationType || '',
        reg.accountType || '',
        reg.accountName || '',
        reg.clubName || '',
        reg.clubContact || '',
        reg.paymentMethod || '',
        reg.mobileWalletProvider || '',
        reg.mobileWalletNumber || '',
        reg.receiptNumber || '',
        formatDate(reg.registrationDate),
        reg.paymentStatus || '',
        reg.paymentAmount || 0,
        reg.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registrations_${tournament?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('تم تصدير البيانات إلى Excel بنجاح');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المسجلين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">معلومات البطولة</h3>
              <div className="space-y-1 text-sm">
                <p><strong>الاسم:</strong> {tournament?.name}</p>
                <p><strong>المكان:</strong> {tournament?.location}</p>
                <p><strong>تاريخ البداية:</strong> {formatDate(tournament?.startDate)}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">التفاصيل</h3>
              <div className="space-y-1 text-sm">
                <p><strong>تاريخ النهاية:</strong> {formatDate(tournament?.endDate)}</p>
                <p><strong>آخر موعد:</strong> {formatDate(tournament?.registrationDeadline)}</p>
                <p><strong>الرسوم:</strong> {tournament?.entryFee} {getCurrencySymbol(tournament?.currency || 'EGP')}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">الإحصائيات</h3>
              <div className="space-y-1 text-sm">
                <p><strong>إجمالي المسجلين:</strong> {registrations.length}</p>
                <p><strong>المدفوعات:</strong> {registrations.filter(r => r.paymentStatus === 'paid').length}</p>
                <p><strong>في الانتظار:</strong> {registrations.filter(r => r.paymentStatus === 'pending').length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          تصدير إلى Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المسجلين ({registrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد تسجيلات</h3>
              <p className="text-gray-600">لم يتم تسجيل أي لاعب في هذه البطولة بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-right font-semibold">#</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">اسم المسجل</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">البريد الإلكتروني</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">رقم الهاتف</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">العمر</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">النادي</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">المركز</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">تاريخ التسجيل</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">حالة الدفع</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration, index) => (
                    <tr key={registration.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-3">{registration.playerName || ''}</td>
                      <td className="border border-gray-300 p-3">{registration.playerEmail || ''}</td>
                      <td className="border border-gray-300 p-3">{registration.playerPhone || ''}</td>
                      <td className="border border-gray-300 p-3 text-center">{registration.playerAge || ''}</td>
                      <td className="border border-gray-300 p-3">{registration.playerClub || ''}</td>
                      <td className="border border-gray-300 p-3">{registration.playerPosition || ''}</td>
                      <td className="border border-gray-300 p-3">{formatDate(registration.registrationDate)}</td>
                      <td className="border border-gray-300 p-3 text-center">
                        <Badge className={
                          registration.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          registration.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {registration.paymentStatus === 'paid' ? 'مدفوع' :
                           registration.paymentStatus === 'pending' ? 'في الانتظار' : 'مجاني'}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-bold text-green-600">
                        {registration.paymentAmount > 0 ? `${registration.paymentAmount} ${getCurrencySymbol(tournament?.currency || 'EGP')}` : 'مجاني'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminTournamentsPage;
