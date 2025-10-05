'use client';

import React, { useEffect, useState } from 'react';
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
  EyeOff, 
  Trophy,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Clock,
  Target,
  BarChart3,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  UserPlus,
  FileText,
  Settings,
  Link,
  Download,
  Printer
} from 'lucide-react';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import PaymentManagementModal from '@/components/payments/PaymentManagementModal';
import { createClient } from '@supabase/supabase-js';

interface Tournament {
  id?: string;
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
  ageGroups: string[];
  categories: string[];
  rules: string;
  prizes: string;
  contactInfo: string;
  // Logo field
  logo?: string;
  // Payment fields
  paymentMethods: string[];
  paymentDeadline: string;
  refundPolicy: string;
  // Fee type fields
  feeType: 'individual' | 'club';
  maxPlayersPerClub?: number;
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

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [viewingRegistrations, setViewingRegistrations] = useState<Tournament | null>(null);
  const [showProfessionalRegistrations, setShowProfessionalRegistrations] = useState(false);
  const [selectedTournamentForRegistrations, setSelectedTournamentForRegistrations] = useState<Tournament | null>(null);
  const [showPaymentManagement, setShowPaymentManagement] = useState(false);
  const [selectedTournamentForPayments, setSelectedTournamentForPayments] = useState<Tournament | null>(null);
  
  // Logo upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<Tournament>>({
    name: '',
    description: '',
    location: '',
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
    // Logo field
    logo: '',
    // Payment fields
    paymentMethods: ['credit_card', 'bank_transfer'],
    paymentDeadline: '',
    refundPolicy: '',
    // Fee type fields
    feeType: 'individual',
    maxPlayersPerClub: 1,
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

  // Supabase client for file uploads
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Handle logo file selection
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload logo to Supabase
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    
    try {
      setLogoUploading(true);
      
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `tournament-logo-${Date.now()}.${fileExt}`;
      
      // Try different buckets in order of preference
      const buckets = ['profile-images', 'avatars', 'additional-images'];
      let uploadSuccess = false;
      let publicUrl = '';
      
      for (const bucket of buckets) {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, logoFile);
          
          if (error) {
            console.warn(`Failed to upload to ${bucket}:`, error.message);
            continue;
          }
          
          // Get public URL
          const { data: { publicUrl: url } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          
          publicUrl = url;
          uploadSuccess = true;
          console.log(`✅ Logo uploaded successfully to ${bucket}`);
          break;
        } catch (bucketError) {
          console.warn(`Error with bucket ${bucket}:`, bucketError);
          continue;
        }
      }
      
      if (!uploadSuccess) {
        toast.error('فشل في رفع اللوجو - جميع buckets غير متاحة');
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

  const stats = [
    {
      title: "إجمالي البطولات",
      value: tournaments.length.toString(),
      icon: Trophy,
      color: "text-yellow-600"
    },
    {
      title: "البطولات النشطة",
      value: tournaments.filter(t => t.isActive).length.toString(),
      icon: Eye,
      color: "text-green-600"
    },
    {
      title: "إجمالي المسجلين",
      value: tournaments.reduce((sum, t) => sum + t.currentParticipants, 0).toString(),
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "البطولات المدفوعة",
      value: tournaments.filter(t => t.isPaid).length.toString(),
      icon: DollarSign,
      color: "text-purple-600"
    }
  ];

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tournamentsData: Tournament[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        registrations: doc.data().registrations || []
      })) as Tournament[];
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let logoUrl = formData.logo;
      
      // Upload logo if file is selected
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
        registrations: editingTournament?.registrations || []
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
      // Fee type fields
      feeType: tournament.feeType || 'individual',
      maxPlayersPerClub: tournament.maxPlayersPerClub || 1
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
    setFormData({
      name: '',
      description: '',
      location: '',
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
      // Payment fields
      paymentMethods: ['credit_card', 'bank_transfer'],
      paymentDeadline: '',
      refundPolicy: '',
      // Fee type fields
      feeType: 'individual',
      maxPlayersPerClub: 1,
      registrations: []
    });
    
    // Reset logo upload states
    setLogoFile(null);
    setLogoPreview('');
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
        <div className="p-8 text-center text-gray-500">جاري تحميل البطولات...</div>
      </AccountTypeProtection>
    );
  }

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">إدارة البطولات</h1>
            <p className="text-gray-600 text-sm lg:text-base">إدارة البطولات وتسجيل اللاعبين</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <Button 
              onClick={() => {
                setEditingTournament(null);
                resetForm();
                setShowAddDialog(true);
              }}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 px-4 lg:px-8 py-2 lg:py-3 h-10 lg:h-12 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm lg:text-base font-semibold w-full sm:w-auto"
              style={{ display: 'block', visibility: 'visible' }}
            >
              <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
              إضافة بطولة جديدة
            </Button>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm lg:text-base font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                    <stat.icon className={`h-6 w-6 lg:h-8 lg:w-8 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tournaments List */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 overflow-hidden min-h-[400px]">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      {tournament.logo ? (
                        <div className="flex-shrink-0">
                          <img 
                            src={tournament.logo} 
                            alt={`${tournament.name} logo`}
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl object-cover border-2 border-gray-200 shadow-md"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                          <Trophy className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-xl lg:text-2xl font-bold text-gray-900 line-clamp-2 mb-2">
                      {tournament.name}
                    </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getStatusColor(tournament)} text-white text-sm px-3 py-1`}>
                        {getStatusText(tournament)}
                      </Badge>
                      {tournament.isPaid && (
                            <Badge className="bg-green-500 text-white text-sm px-3 py-1">
                          مدفوعة
                        </Badge>
                      )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingRegistrations(tournament)}
                      className="h-9 w-9 p-0 hover:bg-blue-100"
                      title="عرض التسجيلات"
                    >
                      <Users className="h-5 w-5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tournament)}
                      className="h-9 w-9 p-0 hover:bg-green-100"
                      style={{ display: 'block', visibility: 'visible' }}
                      title="تعديل البطولة"
                    >
                      <Edit className="h-5 w-5 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tournament.id!)}
                      className="h-9 w-9 p-0 hover:bg-red-100"
                      title="حذف البطولة"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 text-base text-gray-700">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{tournament.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-base text-gray-700">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{new Date(tournament.startDate).toLocaleDateString('ar-SA')}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-base text-gray-700">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{tournament.currentParticipants}/{tournament.maxParticipants} لاعب</span>
                  </div>
                  
                  {tournament.isPaid && (
                    <div className="flex items-center gap-3 text-base text-gray-700">
                      <DollarSign className="h-5 w-5 text-gray-500" />
                      <span className="font-medium">
                        {tournament.entryFee} ج.م 
                        {tournament.feeType === 'individual' ? ' (للاعب الواحد)' : 
                         tournament.feeType === 'club' ? ` (للنادي - ${tournament.maxPlayersPerClub || 1} لاعب)` : ''}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-base text-gray-700">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">آخر موعد: {new Date(tournament.registrationDeadline).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                
                {tournament.description && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 line-clamp-3">{tournament.description}</p>
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                        className="data-[state=checked]:bg-green-500"
                      />
                        <span className={`text-base font-medium ${tournament.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                        {tournament.isActive ? 'نشطة' : 'غير نشطة'}
                      </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const registrationUrl = `${window.location.origin}/tournaments/register/${tournament.id}`;
                          navigator.clipboard.writeText(registrationUrl);
                          toast.success('تم نسخ رابط التسجيل');
                        }}
                        className="text-green-600 border-green-200 hover:bg-green-50 h-10"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        رابط التسجيل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTournamentForRegistrations(tournament);
                          setShowProfessionalRegistrations(true);
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 h-10"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        المسجلين
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/dashboard/admin/tournaments/registrations', '_blank')}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50 h-10"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        جميع التسجيلات
                      </Button>
                      {tournament.isPaid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTournamentForPayments(tournament);
                            setShowPaymentManagement(true);
                          }}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          المدفوعات
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tournaments.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بطولات</h3>
            <p className="text-gray-500 mb-6">ابدأ بإنشاء بطولة جديدة</p>
            <Button 
              onClick={() => {
                setEditingTournament(null);
                resetForm();
                setShowAddDialog(true);
              }}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700"
              style={{ display: 'block', visibility: 'visible' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة بطولة جديدة
            </Button>
          </div>
        )}

        {/* Add/Edit Tournament Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {editingTournament ? 'تعديل البطولة' : 'إضافة بطولة جديدة'}
              </DialogTitle>
              <DialogDescription>
                {editingTournament ? 'قم بتعديل بيانات البطولة' : 'أدخل بيانات البطولة الجديدة'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    المعلومات الأساسية
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      اسم البطولة *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                      placeholder="مثال: بطولة العلمين الدولية"
                      className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      وصف البطولة *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                      placeholder="وصف مفصل عن البطولة..."
                      className="min-h-[80px] border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      required
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">
                      لوجو البطولة
                    </Label>
                    
                    {/* Logo Preview */}
                    {(logoPreview || formData.logo) && (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                        <img 
                          src={logoPreview || formData.logo} 
                          alt="Logo preview"
                          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">معاينة اللوجو</p>
                          <p className="text-xs text-gray-500">سيتم عرض هذا اللوجو في البطولة</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview('');
                            setFormData(prev => ({...prev, logo: ''}));
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="logo-file" className="text-sm font-medium text-gray-700">
                        رفع ملف اللوجو
                      </Label>
                      <Input
                        id="logo-file"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                        disabled={logoUploading}
                      />
                      <p className="text-xs text-gray-500">
                        اختر ملف صورة (JPG, PNG, GIF) - الحد الأقصى 5 ميجابايت
                      </p>
                    </div>
                    
                    {/* URL Input */}
                    <div className="space-y-2">
                      <Label htmlFor="logo-url" className="text-sm font-medium text-gray-700">
                        أو رابط اللوجو
                      </Label>
                      <Input
                        id="logo-url"
                        type="url"
                        value={formData.logo || ''}
                        onChange={(e) => setFormData(prev => ({...prev, logo: e.target.value}))}
                        placeholder="https://example.com/logo.png"
                        className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        أدخل رابط صورة اللوجو (اختياري) - يُفضل أن تكون الصورة مربعة الشكل
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                      مكان البطولة *
                    </Label>
                    <Input
                      id="location"
                      value={formData.location || ''}
                      onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                      placeholder="مثال: ملعب العلمين الرياضي"
                      className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Dates and Participants */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Calendar className="h-4 w-4 text-green-600" />
                    التواريخ والمشاركين
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                      تاريخ البداية *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
                      className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                      تاريخ النهاية *
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate || ''}
                      onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
                      className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registrationDeadline" className="text-sm font-medium text-gray-700">
                      آخر موعد للتسجيل *
                    </Label>
                    <Input
                      id="registrationDeadline"
                      type="date"
                      value={formData.registrationDeadline || ''}
                      onChange={(e) => setFormData(prev => ({...prev, registrationDeadline: e.target.value}))}
                      className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants" className="text-sm font-medium text-gray-700">
                      الحد الأقصى للمشاركين *
                    </Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      value={formData.maxParticipants || 100}
                      onChange={(e) => setFormData(prev => ({...prev, maxParticipants: parseInt(e.target.value)}))}
                      className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Payment and Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    الرسوم والفئات
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPaid"
                      checked={formData.isPaid || false}
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, isPaid: checked}))}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <Label htmlFor="isPaid" className="text-sm font-semibold text-gray-700">
                      بطولة مدفوعة
                    </Label>
                  </div>
                  
                  {/* Entry Fee Field - Always Visible */}
                  <div className="space-y-3">
                      <div className="space-y-2">
                      <Label htmlFor="entryFee" className="text-sm font-medium text-gray-700">
                          رسوم المشاركة (ج.م) *
                        </Label>
                        <Input
                          id="entryFee"
                          type="number"
                        min="0"
                        step="0.01"
                          value={formData.entryFee || 0}
                        onChange={(e) => setFormData(prev => ({...prev, entryFee: parseFloat(e.target.value) || 0}))}
                        className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                        placeholder="أدخل رسوم المشاركة"
                      />
                      <p className="text-xs text-gray-500">أدخل 0 للبطولات المجانية</p>
                      </div>
                      
                    {/* Fee Type Selection */}
                      <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        نوع الرسوم *
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                          <input
                            type="radio"
                            id="feeType-individual"
                            name="feeType"
                            value="individual"
                            checked={formData.feeType === 'individual'}
                            onChange={(e) => setFormData(prev => ({...prev, feeType: e.target.value as 'individual' | 'club'}))}
                            className="h-3 w-3 text-yellow-600 focus:ring-yellow-500"
                            aria-label="نوع الرسوم للاعب الواحد"
                          />
                          <Label htmlFor="feeType-individual" className="text-xs text-gray-700 cursor-pointer">
                            للاعب الواحد
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                          <input
                            type="radio"
                            id="feeType-club"
                            name="feeType"
                            value="club"
                            checked={formData.feeType === 'club'}
                            onChange={(e) => setFormData(prev => ({...prev, feeType: e.target.value as 'individual' | 'club'}))}
                            className="h-3 w-3 text-yellow-600 focus:ring-yellow-500"
                            aria-label="نوع الرسوم للنادي"
                          />
                          <Label htmlFor="feeType-club" className="text-xs text-gray-700 cursor-pointer">
                            للنادي (عدد لاعبين)
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Number of Players for Club Fee */}
                    {formData.feeType === 'club' && (
                      <div className="space-y-2">
                        <Label htmlFor="maxPlayersPerClub" className="text-sm font-medium text-gray-700">
                          عدد اللاعبين المسموح للنادي *
                        </Label>
                        <Input
                          id="maxPlayersPerClub"
                          type="number"
                          min="1"
                          max="50"
                          value={formData.maxPlayersPerClub || 1}
                          onChange={(e) => setFormData(prev => ({...prev, maxPlayersPerClub: parseInt(e.target.value) || 1}))}
                          className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                          placeholder="أدخل عدد اللاعبين"
                        />
                        <p className="text-xs text-gray-500">عدد اللاعبين المسموح لكل نادي في البطولة</p>
                      </div>
                    )}
                  </div>

                  {formData.isPaid && (
                    <div className="space-y-3">
                      
                      <div className="space-y-2">
                        <Label htmlFor="paymentDeadline" className="text-sm font-medium text-gray-700">
                          آخر موعد للدفع
                        </Label>
                        <Input
                          id="paymentDeadline"
                          type="date"
                          value={formData.paymentDeadline || ''}
                          onChange={(e) => setFormData(prev => ({...prev, paymentDeadline: e.target.value}))}
                          className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                          placeholder="اختر آخر موعد للدفع"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          طرق الدفع المتاحة *
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {paymentMethods.map((method, index) => (
                            <div key={method.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                              <input
                                type="checkbox"
                                id={`paymentMethod-${index}-${method.id}`}
                                title={`اختيار طريقة ${method.name}`}
                                checked={formData.paymentMethods?.includes(method.id) || false}
                                onChange={(e) => {
                                  const currentMethods = formData.paymentMethods || [];
                                  if (e.target.checked) {
                                    setFormData(prev => ({...prev, paymentMethods: [...currentMethods, method.id]}));
                                  } else {
                                    setFormData(prev => ({...prev, paymentMethods: currentMethods.filter(m => m !== method.id)}));
                                  }
                                }}
                                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 h-3 w-3"
                              />
                              <Label htmlFor={`paymentMethod-${index}-${method.id}`} className="text-xs text-gray-700 flex items-center gap-1 cursor-pointer">
                                <span className="text-sm">{method.icon}</span>
                                <span>{method.name}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="refundPolicy" className="text-sm font-medium text-gray-700">
                          سياسة الاسترداد
                        </Label>
                        <Textarea
                          id="refundPolicy"
                          value={formData.refundPolicy || ''}
                          onChange={(e) => setFormData(prev => ({...prev, refundPolicy: e.target.value}))}
                          placeholder="سياسة استرداد الرسوم في حالة الإلغاء..."
                          className="min-h-[80px] border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500">حدد شروط استرداد الرسوم في حالة إلغاء البطولة</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      الفئات العمرية *
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ageGroups.map((ageGroup, index) => (
                        <div key={ageGroup} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={`ageGroup-${index}-${ageGroup}`}
                            title={`اختيار فئة ${ageGroup}`}
                            checked={formData.ageGroups?.includes(ageGroup) || false}
                            onChange={(e) => {
                              const currentGroups = formData.ageGroups || [];
                              if (e.target.checked) {
                                setFormData(prev => ({...prev, ageGroups: [...currentGroups, ageGroup]}));
                              } else {
                                setFormData(prev => ({...prev, ageGroups: currentGroups.filter(g => g !== ageGroup)}));
                              }
                            }}
                            className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 h-3 w-3"
                          />
                          <Label htmlFor={`ageGroup-${index}-${ageGroup}`} className="text-xs text-gray-700 cursor-pointer">
                            {ageGroup}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">اختر الفئات العمرية المناسبة للبطولة</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      الفئات *
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.map((category, index) => (
                        <div key={category} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={`category-${index}-${category}`}
                            title={`اختيار فئة ${category}`}
                            checked={formData.categories?.includes(category) || false}
                            onChange={(e) => {
                              const currentCategories = formData.categories || [];
                              if (e.target.checked) {
                                setFormData(prev => ({...prev, categories: [...currentCategories, category]}));
                              } else {
                                setFormData(prev => ({...prev, categories: currentCategories.filter(c => c !== category)}));
                              }
                            }}
                            className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 h-3 w-3"
                          />
                          <Label htmlFor={`category-${index}-${category}`} className="text-xs text-gray-700 cursor-pointer">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">اختر الفئات المناسبة للبطولة</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    التفاصيل الإضافية
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rules" className="text-sm font-medium text-gray-700">
                      قوانين البطولة
                    </Label>
                    <Textarea
                      id="rules"
                      value={formData.rules || ''}
                      onChange={(e) => setFormData(prev => ({...prev, rules: e.target.value}))}
                      placeholder="قوانين ولوائح البطولة..."
                      className="min-h-[80px] border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="prizes" className="text-sm font-medium text-gray-700">
                      الجوائز
                    </Label>
                    <Textarea
                      id="prizes"
                      value={formData.prizes || ''}
                      onChange={(e) => setFormData(prev => ({...prev, prizes: e.target.value}))}
                      placeholder="تفاصيل الجوائز والمكافآت..."
                      className="min-h-[80px] border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactInfo" className="text-sm font-medium text-gray-700">
                      معلومات الاتصال
                    </Label>
                    <Textarea
                      id="contactInfo"
                      value={formData.contactInfo || ''}
                      onChange={(e) => setFormData(prev => ({...prev, contactInfo: e.target.value}))}
                      placeholder="رقم الهاتف، البريد الإلكتروني، إلخ..."
                      className="min-h-[80px] border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Status and Registration Link */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="isActive"
                      checked={formData.isActive === true}
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, isActive: checked}))}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <Label htmlFor="isActive" className={`text-sm font-semibold ${formData.isActive ? 'text-green-700' : 'text-gray-700'}`}>
                      البطولة نشطة
                    </Label>
                  </div>
                  
                  {editingTournament && (
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const registrationUrl = `${window.location.origin}/tournaments/register/${editingTournament.id}`;
                          navigator.clipboard.writeText(registrationUrl);
                          toast.success('تم نسخ رابط التسجيل');
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        نسخ رابط التسجيل
                      </Button>
                    </div>
                  )}
                </div>
                
                {editingTournament && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Link className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">رابط تسجيل اللاعبين</h4>
                        <p className="text-sm text-blue-700 mb-3">
                          شارك هذا الرابط مع اللاعبين الذين يريدون التسجيل في البطولة
                        </p>
                        <div className="bg-white border border-blue-200 rounded-md p-3">
                          <code className="text-sm text-gray-800 break-all">
                            {`${window.location.origin}/tournaments/register/${editingTournament.id}`}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingTournament(null);
                    resetForm();
                  }}
                  className="px-6 py-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 px-6 py-2"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingTournament ? 'تحديث البطولة' : 'إنشاء البطولة'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Registrations Dialog */}
        <Dialog open={!!viewingRegistrations} onOpenChange={() => setViewingRegistrations(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                المسجلين في بطولة: {viewingRegistrations?.name}
              </DialogTitle>
              <DialogDescription>
                قائمة اللاعبين المسجلين في البطولة
              </DialogDescription>
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
                    <Card key={registration.id || index} className="bg-white shadow-sm border border-gray-200">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{registration.playerName}</h4>
                            <p className="text-sm text-gray-600">{registration.playerEmail}</p>
                            <p className="text-sm text-gray-600">{registration.playerPhone}</p>
                            {registration.accountName && (
                              <p className="text-sm text-blue-600 font-medium">
                                <strong>الحساب التابع:</strong> {registration.accountName}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">العمر: {registration.playerAge} سنة</p>
                            <p className="text-sm text-gray-600">النادي: {registration.playerClub}</p>
                            <p className="text-sm text-gray-600">المركز: {registration.playerPosition}</p>
                          </div>
                          <div className="flex flex-col justify-between">
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
                                  <strong>قيمة الاشتراك:</strong> {registration.paymentAmount} ج.م
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(registration.registrationDate).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>
                        {registration.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-600">
                              <strong>ملاحظات:</strong> {registration.notes}
                            </p>
                          </div>
                        )}
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
              <DialogTitle className="text-2xl font-bold text-center text-blue-600 flex items-center justify-center gap-2">
                <Trophy className="h-8 w-8" />
                بيانات المسجلين - {selectedTournamentForRegistrations?.name}
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
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

  useEffect(() => {
    if (tournament) {
      fetchRegistrations();
    }
  }, [tournament]);

  const fetchRegistrations = async () => {
    if (!tournament) return;
    
    try {
      setLoading(true);
      const registrationsQuery = query(
        collection(db, 'tournament_registrations'),
        where('tournamentId', '==', tournament.id)
      );
      
      const querySnapshot = await getDocs(registrationsQuery);
      const registrationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('فشل في تحميل بيانات المسجلين');
    } finally {
      setLoading(false);
    }
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

  const exportToExcel = () => {
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
        reg.organizationName || '',
        reg.organizationType || '',
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

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>بيانات المسجلين - ${tournament?.name}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #3b82f6;
            font-size: 28px;
            margin: 0;
          }
          .header h2 {
            color: #6b7280;
            font-size: 20px;
            margin: 10px 0;
          }
          .tournament-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-right: 4px solid #3b82f6;
          }
          .tournament-info h3 {
            color: #3b82f6;
            margin-top: 0;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 20px;
            background: #f1f5f9;
            border-radius: 8px;
          }
          .stat-item {
            text-align: center;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
          }
          .stat-label {
            color: #6b7280;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: right;
          }
          th {
            background: #3b82f6;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 2px solid #3b82f6;
            padding-top: 20px;
            color: #6b7280;
          }
          .footer h3 {
            color: #3b82f6;
            margin: 0;
          }
          .footer p {
            margin: 5px 0;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏆 منصة الحلم</h1>
          <h2>بيانات المسجلين في البطولة</h2>
        </div>

        <div class="tournament-info">
          <h3>📋 معلومات البطولة</h3>
          <p><strong>اسم البطولة:</strong> ${tournament?.name}</p>
          <p><strong>الوصف:</strong> ${tournament?.description}</p>
          <p><strong>المكان:</strong> ${tournament?.location}</p>
          <p><strong>تاريخ البداية:</strong> ${formatDate(tournament?.startDate)}</p>
          <p><strong>تاريخ النهاية:</strong> ${formatDate(tournament?.endDate)}</p>
          <p><strong>آخر موعد للتسجيل:</strong> ${formatDate(tournament?.registrationDeadline)}</p>
        </div>

        <div class="stats">
          <div class="stat-item">
            <div class="stat-number">${registrations.length}</div>
            <div class="stat-label">إجمالي المسجلين</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${registrations.filter(r => r.paymentStatus === 'paid').length}</div>
            <div class="stat-label">المدفوعات</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${registrations.filter(r => r.paymentStatus === 'pending').length}</div>
            <div class="stat-label">في الانتظار</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${registrations.filter(r => r.registrationType === 'club').length}</div>
            <div class="stat-label">تسجيلات النوادي</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>اسم المسجل</th>
              <th>البريد الإلكتروني</th>
              <th>رقم الهاتف</th>
              <th>العمر</th>
              <th>النادي</th>
              <th>المركز</th>
              <th>نوع التسجيل</th>
              <th>اسم النادي</th>
              <th>جهة الاتصال</th>
              <th>تاريخ التسجيل</th>
              <th>حالة الدفع</th>
              <th>المبلغ</th>
              <th>الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${registrations.map((reg, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${reg.playerName || ''}</td>
                <td>${reg.playerEmail || ''}</td>
                <td>${reg.playerPhone || ''}</td>
                <td>${reg.playerAge || ''}</td>
                <td>${reg.playerClub || ''}</td>
                <td>${reg.playerPosition || ''}</td>
                <td>${reg.registrationType === 'individual' ? 'فردي' : 'نادي'}</td>
                <td>${reg.clubName || ''}</td>
                <td>${reg.clubContact || ''}</td>
                <td>${formatDate(reg.registrationDate)}</td>
                <td>${reg.paymentStatus === 'paid' ? 'مدفوع' : reg.paymentStatus === 'pending' ? 'في الانتظار' : 'مجاني'}</td>
                <td>${reg.paymentAmount || 0} ج.م</td>
                <td>${reg.notes || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <h3>🏆 منصة الحلم</h3>
          <p>منصة إدارة البطولات الرياضية</p>
          <p>تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</p>
          <p>إجمالي المسجلين: ${registrations.length} مسجل</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);

    toast.success('تم تحضير التقرير للطباعة');
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
      {/* Tournament Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">معلومات البطولة</h3>
              <div className="space-y-2 text-sm">
                <p><strong>الاسم:</strong> {tournament?.name}</p>
                <p><strong>المكان:</strong> {tournament?.location}</p>
                <p><strong>تاريخ البداية:</strong> {formatDate(tournament?.startDate)}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">التفاصيل</h3>
              <div className="space-y-2 text-sm">
                <p><strong>تاريخ النهاية:</strong> {formatDate(tournament?.endDate)}</p>
                <p><strong>آخر موعد:</strong> {formatDate(tournament?.registrationDeadline)}</p>
                <p><strong>الرسوم:</strong> {tournament?.entryFee} ج.م</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">الإحصائيات</h3>
              <div className="space-y-2 text-sm">
                <p><strong>إجمالي المسجلين:</strong> {registrations.length}</p>
                <p><strong>المدفوعات:</strong> {registrations.filter(r => r.paymentStatus === 'paid').length}</p>
                <p><strong>في الانتظار:</strong> {registrations.filter(r => r.paymentStatus === 'pending').length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex justify-center gap-4">
        <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          تصدير إلى Excel
        </Button>
        <Button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700">
          <Printer className="h-4 w-4 mr-2" />
          طباعة PDF
        </Button>
      </div>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            قائمة المسجلين ({registrations.length})
          </CardTitle>
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
                  <tr className="bg-blue-50">
                    <th className="border border-gray-300 p-3 text-right font-semibold">#</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">اسم المسجل</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">البريد الإلكتروني</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">رقم الهاتف</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">العمر</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">النادي</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">المركز</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">نوع التسجيل</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">الحساب التابع</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">اسم النادي</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">جهة الاتصال</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">تاريخ التسجيل</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">حالة الدفع</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">المبلغ</th>
                    <th className="border border-gray-300 p-3 text-right font-semibold">الملاحظات</th>
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
                      <td className="border border-gray-300 p-3 text-center">
                        <Badge className={registration.registrationType === 'individual' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'}>
                          {registration.registrationType === 'individual' ? 'فردي' : 'نادي'}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 p-3">{registration.accountName || ''}</td>
                      <td className="border border-gray-300 p-3">{registration.clubName || ''}</td>
                      <td className="border border-gray-300 p-3">{registration.clubContact || ''}</td>
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
                        {registration.paymentAmount > 0 ? `${registration.paymentAmount} ج.م` : 'مجاني'}
                      </td>
                      <td className="border border-gray-300 p-3">{registration.notes || ''}</td>
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

