'use client';

import GeideaPaymentModal from '@/components/GeideaPaymentModal';
import ResponsiveLayoutWrapper from '@/components/layout/ResponsiveLayout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { supabase } from '@/lib/supabase/config';
import { Player } from '@/types/player';
import { Tournament } from '@/types/tournament';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Building,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    Edit,
    FileText,
    MapPin,
    Plus,
    Printer,
    Search,
    Smartphone,
    Trophy,
    User,
    Users
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// قائمة المراكز المتاحة
const POSITIONS = [
  'حارس مرمى',
  'مدافع أيمن',
  'مدافع أيسر',
  'مدافع وسط',
  'وسط دفاعي',
  'وسط أيمن',
  'وسط أيسر',
  'وسط هجومي',
  'جناح أيمن',
  'جناح أيسر',
  'مهاجم',
  'مهاجم وسط'
];

// دالة لحساب العمر من تاريخ الميلاد
const calculateAge = (birthDate: string | Date | null): number | null => {
  if (!birthDate) return null;

  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
};

// دالة للحصول على رمز العملة
const getCurrencySymbol = (currency: string = 'EGP'): string => {
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
const formatGregorianDate = (date: string | Date | null, options?: { includeTime?: boolean }): string => {
  if (!date) return 'غير محدد';

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'غير محدد';

    // صيغة DD/MM/YYYY
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    let formatted = `${day}/${month}/${year}`;
    
    if (options?.includeTime) {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      formatted += ` ${hours}:${minutes}`;
    }

    return formatted;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'غير محدد';
  }
};

// دالة لتنسيق تاريخ الميلاد للعرض (ميلادي فقط)
const formatBirthDate = (birthDate: string | Date | null): string => {
  return formatGregorianDate(birthDate);
};

// دالة لتنظيف رابط الصورة
const getSafeAvatarUrl = (avatar: any): string | undefined => {
  if (!avatar) return undefined;

  if (typeof avatar === 'string') {
    return avatar.trim() || undefined;
  }

  if (typeof avatar === 'object' && avatar !== null) {
    // إذا كان object يحتوي على url
    if ('url' in avatar && typeof avatar.url === 'string') {
      return avatar.url.trim() || undefined;
    }
  }

  return undefined;
};

// دالة لاستخراج اسم اللاعب من البيانات
// الحقل الأساسي المستخدم في النظام هو full_name (من صفحة الملف الشخصي للاعب الفردي وصفحة إدارة اللاعبين للمنظمات)
const getPlayerDisplayName = (player: any): string => {
  if (!player) {
    return 'لاعب غير محدد';
  }
  
  // دالة مساعدة لاستخراج قيمة نصية من الحقل
  const getStringValue = (value: any): string | null => {
    if (value === null || value === undefined) return null;
    
    // إذا كان string مباشرة
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    
    // إذا كان number، حوله إلى string
    if (typeof value === 'number') {
      return String(value).trim();
    }
    
    // إذا كان object (مثل Firestore Timestamp)، تجاهله
    if (typeof value === 'object') {
      // إذا كان Firestore Timestamp، تجاهله
      if (value && typeof value.toDate === 'function') {
        return null;
      }
      // إذا كان object مع حقل value أو text أو name
      if (value.value !== undefined && typeof value.value === 'string') {
        return value.value.trim() || null;
      }
      if (value.text !== undefined && typeof value.text === 'string') {
        return value.text.trim() || null;
      }
      if (value.name !== undefined && typeof value.name === 'string') {
        return value.name.trim() || null;
      }
      // جرب toString
      if (value.toString && typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
        try {
          const str = value.toString().trim();
          if (str && str !== '[object Object]' && !str.startsWith('[object')) {
            return str.length > 0 ? str : null;
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    }
    
    return null;
  };
  
  // 1. الحقل الأساسي: full_name (يستخدم في صفحة الملف الشخصي للاعب الفردي وصفحة إدارة اللاعبين)
  const fullName = getStringValue(player.full_name);
  if (fullName && fullName.length > 0) {
    // تجاهل إذا كان إيميل أو تاريخ
    if (!fullName.includes('@') && !fullName.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i)) {
      return fullName;
    } else {
    }
  }
  
  // 2. الحقل البديل: name (للتوافق مع البيانات القديمة)
  const name = getStringValue(player.name);
  if (name && name.length > 0) {
    // تجاهل إذا كان إيميل أو تاريخ
    if (!name.includes('@') && !name.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i)) {
      return name;
    } else {
    }
  }
  
  // 3. إذا لم يوجد أي منهما، إرجاع قيمة افتراضية
  return 'لاعب غير محدد';
};

// Enhanced interfaces for the new system
interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'club' | 'academy' | 'individual' | 'trainer' | 'agent' | 'marketer' | 'parent';
  avatar?: string;
  players?: Player[];
}

interface RegistrationData {
  tournamentId: string;
  selectedPlayers: Player[];
  paymentMethod: 'mobile_wallet' | 'card' | 'later';
  notes: string;
}

export default function UnifiedTournamentRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();

  // Core states
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([]);
  const [historyPaid, setHistoryPaid] = useState<any[]>([]);
  const [historyPending, setHistoryPending] = useState<any[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [currentTab, setCurrentTab] = useState('players');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicatePlayers, setDuplicatePlayers] = useState<Player[]>([]);
  const paidPlayerIds = useMemo(() => new Set((historyPaid || []).flatMap((reg: any) => (reg.players || [])).map((p: any) => p.id)), [historyPaid]);

  // Selection states
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    tournamentId: '',
    selectedPlayers: [],
    paymentMethod: 'later',
    notes: ''
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('available');

  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMobileWalletModal, setShowMobileWalletModal] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [mobileWalletNumber, setMobileWalletNumber] = useState('');
  const [mobileWalletProvider, setMobileWalletProvider] = useState<'vodafone' | 'orange' | 'etisalat' | 'instapay' | ''>('');
  const [mobileWalletReceipt, setMobileWalletReceipt] = useState<File | null>(null);
  const [mobileWalletReceiptNumber, setMobileWalletReceiptNumber] = useState('');
  const [mobileWalletReceiptUrl, setMobileWalletReceiptUrl] = useState<string>('');
  const [mobileWalletUploading, setMobileWalletUploading] = useState(false);
  const [mobileWalletUploadProgress, setMobileWalletUploadProgress] = useState(0);
  const [mobileWalletUploadSuccess, setMobileWalletUploadSuccess] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  // Geidea payment data
  const [geideaPaymentData, setGeideaPaymentData] = useState<any>(null);

  // Fetch user profile and players
  const fetchUserData = useCallback(async () => {
    if (!user?.uid || !userData) return;

    try {
      // Use userData from auth context
      // Convert accountType to UserProfile type (player -> individual)
      let profileType: UserProfile['type'] = userData.accountType as UserProfile['type'];
      if (userData.accountType === 'player') {
        profileType = 'individual';
      }
      
      const profileData: UserProfile = {
        id: user.uid,
        name: userData.name || userData.email || 'مستخدم',
        email: userData.email,
        phone: userData.phone || '',
        type: profileType,
        avatar: userData.avatar || ''
      };
      setUserProfile(profileData);

      // Fetch players based on user type - using same logic as /dashboard/club/players and /dashboard/academy/players
      if (profileData.type === 'club') {
        const baseQuery = query(
          collection(db, 'players'),
          where('club_id', '==', user.uid)
        );

        const snapshot = await getDocs(baseQuery);

        const playersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => !p.isDeleted) as Player[];

        setAvailablePlayers(playersData);
      } else if (profileData.type === 'academy') {
        const baseQuery = query(
          collection(db, 'players'),
          where('academy_id', '==', user.uid)
        );

        const snapshot = await getDocs(baseQuery);

        const playersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => !p.isDeleted) as Player[];

        setAvailablePlayers(playersData);
      } else if (profileData.type === 'trainer') {
        const baseQuery = query(
          collection(db, 'players'),
          where('trainer_id', '==', user.uid)
        );

        const snapshot = await getDocs(baseQuery);

        const playersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => !p.isDeleted) as Player[];

        setAvailablePlayers(playersData);
      } else if (profileData.type === 'agent') {
        const baseQuery = query(
          collection(db, 'players'),
          where('agent_id', '==', user.uid)
        );

        const snapshot = await getDocs(baseQuery);

        const playersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => !p.isDeleted) as Player[];

        setAvailablePlayers(playersData);
      } else if (profileData.type === 'marketer' || profileData.type === 'parent') {
        // For marketers and parents, they might not have direct player relationships
        // So we'll set an empty array for now
        setAvailablePlayers([]);
      } else if (profileData.type === 'individual') {
        // For individual users, fetch their actual player data from the players collection
        const playerDocRef = doc(db, 'players', user.uid);
        const playerDocSnap = await getDoc(playerDocRef);
        
        if (playerDocSnap.exists()) {
          const playerData = { id: playerDocSnap.id, ...playerDocSnap.data() } as Player;
          setAvailablePlayers([playerData]);
        } else {
          // If player document doesn't exist, create a fallback object
          const individualPlayer: any = {
            id: user.uid,
            full_name: profileData.name,
            name: profileData.name, // for backward compatibility
            primary_position: userData.position || '',
            position: userData.position || '', // for backward compatibility
            phone: profileData.phone,
            birth_date: userData.birthDate || '',
            age: userData.age || 0,
            profile_image: profileData.avatar || '',
            avatar: profileData.avatar || '',
            email: profileData.email,
            club_id: user.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Required fields for Player interface
            nationality: userData.nationality || '',
            city: userData.city || '',
            country: userData.country || '',
            whatsapp: profileData.phone,
            brief: userData.brief || '',
            education_level: userData.education_level || '',
            graduation_year: userData.graduation_year || '',
            degree: userData.degree || '',
            english_level: userData.english_level || '',
            arabic_level: userData.arabic_level || '',
            spanish_level: userData.spanish_level || '',
            blood_type: userData.blood_type || '',
            height: userData.height || '',
            weight: userData.weight || '',
            chronic_conditions: userData.chronic_conditions || false,
            chronic_details: userData.chronic_details || '',
            injuries: userData.injuries || [],
            surgeries: userData.surgeries || [],
            allergies: userData.allergies || '',
            medical_notes: userData.medical_notes || '',
            secondary_position: userData.secondary_position || '',
            preferred_foot: userData.preferred_foot || '',
            club_history: userData.club_history || [],
            experience_years: userData.experience_years || '',
            additional_images: userData.additional_images || [],
            videos: userData.videos || [],
            has_passport: userData.has_passport || 'no',
            ref_source: userData.ref_source || '',
            currently_contracted: userData.currently_contracted || 'no',
            achievements: userData.achievements || [],
            previous_clubs: userData.previous_clubs || [],
            current_club: userData.current_club || '',
            subscription_status: userData.subscription_status || 'active',
            subscription_type: userData.subscription_type || 'free'
          };
          setAvailablePlayers([individualPlayer]);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('فشل في تحميل بيانات المستخدم');
    }
  }, [user, userData]);

  // Fetch registrations history (paid/pending) for selected tournament
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!user?.uid || !selectedTournament) {
          setHistoryPaid([]);
          setHistoryPending([]);
          return;
        }

        const registrationsRef = collection(db, 'tournamentRegistrations');
        const q = query(
          registrationsRef,
          where('tournamentId', '==', selectedTournament.id),
          where('createdBy', '==', user.uid)
        );

        const snapshot = await getDocs(q);
        const all: any[] = [];
        snapshot.forEach((doc) => all.push({ id: doc.id, ...doc.data() }));

        const paid = all.filter(r => r.paymentStatus === 'paid');
        const pending = all.filter(r => r.paymentStatus !== 'paid');

        setHistoryPaid(paid);
        setHistoryPending(pending);
      } catch (err) {
        console.error('Failed to fetch registrations history:', err);
        setHistoryPaid([]);
        setHistoryPending([]);
      }
    };

    fetchHistory();
  }, [user, selectedTournament]);

  // Fetch available tournaments (allow without login)
  const fetchTournaments = useCallback(async () => {
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

      // Filter tournaments that are still accepting registrations
      const availableTournaments = tournamentsData.filter(tournament => {
        const registrationDeadline = new Date(tournament.registrationDeadline);
        const now = new Date();
        const isWithinDeadline = registrationDeadline > now;
        const hasSpots = tournament.currentParticipants < tournament.maxParticipants;
        
        // Filter based on tournament feeType and user profile type (only if logged in)
        let isAllowedForUser = true;
        if (userProfile) {
          // If tournament is for individuals only
          if (tournament.feeType === 'individual') {
            // Only allow individual users
            isAllowedForUser = userProfile.type === 'individual';
          } 
          // If tournament is for clubs only
          else if (tournament.feeType === 'club') {
            // Allow clubs, academies, trainers, agents (but not individual users)
            isAllowedForUser = ['club', 'academy', 'trainer', 'agent'].includes(userProfile.type);
          }
        } else {
          // If not logged in, show all tournaments (filtering will happen when trying to register)
          isAllowedForUser = true;
        }
        
        return isWithinDeadline && hasSpots && isAllowedForUser;
      });

      setTournaments(availableTournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('فشل في تحميل البطولات');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  // Fetch user data first
  useEffect(() => {
    if (user && userData) {
      fetchUserData();
    }
  }, [fetchUserData]);

  // Fetch tournaments (allow without login)
  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // Auto-select tournament from URL parameter
  useEffect(() => {
    const tournamentIdFromUrl = searchParams.get('tournamentId');
    if (tournamentIdFromUrl && tournaments.length > 0) {
      const tournament = tournaments.find(t => t.id === tournamentIdFromUrl);
      if (tournament) {
        setSelectedTournament(tournament);
        setRegistrationData(prev => ({ ...prev, tournamentId: tournament.id }));
      }
    }
  }, [searchParams, tournaments]);

  // No redirect - allow viewing tournament without login
  // Authentication will be required for actions only

  // Calculate total payment amount
  const calculateTotalAmount = () => {
    if (!selectedTournament || !selectedTournament.isPaid) return 0;
    // استثناء اللاعبين المدفوع لهم مسبقاً من الحساب
    const paidIds = new Set(
      (historyPaid || []).flatMap((reg: any) => (reg.players || [])).map((p: any) => p.id)
    );
    const payableCount = selectedPlayers.filter(p => !paidIds.has(p.id)).length;
    return selectedTournament.entryFee * payableCount;
  };

  // Print registered players table
  const printRegisteredPlayers = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = formatGregorianDate(new Date());
    const registrationDate = formatGregorianDate(new Date());
    const totalAmount = calculateTotalAmount();

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>تقرير تسجيل البطولة - ${selectedTournament?.name}</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; padding: 20px; background: #fff; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header-left { display: flex; align-items: center; gap: 20px; }
            .header-right { text-align: right; }
            .platform-logo { height: 60px; }
            .tournament-logo { height: 60px; width: 60px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd; }
            .title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .subtitle { font-size: 16px; color: #666; }
            .organization-info { background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #4caf50; }
            .tournament-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .payment-info { background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #ff9800; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .info-label { font-weight: bold; color: #333; }
            .info-value { color: #666; }
            .section-title { font-size: 18px; font-weight: bold; color: #1976d2; margin-bottom: 15px; border-bottom: 2px solid #1976d2; padding-bottom: 5px; }
            .players-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .players-table th, .players-table td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            .players-table th { background: #f8f9fa; font-weight: bold; color: #333; }
            .players-table tr:nth-child(even) { background: #f9f9f9; }
            .summary { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .summary-title { font-size: 18px; font-weight: bold; color: #1976d2; margin-bottom: 10px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-size: 16px; font-weight: bold; color: #1976d2; border-top: 2px solid #1976d2; padding-top: 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .notes { background: #f0f4f8; padding: 15px; border-radius: 8px; margin-top: 20px; border-right: 4px solid #2196f3; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <img src="/el7lm-logo.png" alt="منصة الحلم" class="platform-logo" />
              ${selectedTournament?.logo ? `<img src="${selectedTournament.logo}" alt="لوجو البطولة" class="tournament-logo" />` : ''}
            </div>
            <div class="header-right">
              <div class="title">تقرير تسجيل البطولة</div>
              <div class="subtitle">تاريخ الطباعة: ${currentDate}</div>
            </div>
          </div>

          <div class="section-title">📋 معلومات المنظمة المسجلة</div>
          <div class="organization-info">
            <div class="info-row">
              <span class="info-label">اسم المنظمة:</span>
              <span class="info-value">${userProfile?.name || 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">نوع الحساب:</span>
              <span class="info-value">${userProfile?.type === 'club' ? 'نادي' : userProfile?.type === 'academy' ? 'أكاديمية' : 'فردي'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">البريد الإلكتروني:</span>
              <span class="info-value">${userProfile?.email || 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">رقم الهاتف:</span>
              <span class="info-value">${userProfile?.phone || 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ التسجيل:</span>
              <span class="info-value">${registrationDate}</span>
            </div>
          </div>

          <div class="section-title">🏆 معلومات البطولة</div>
          <div class="tournament-info">
            <div class="info-row">
              <span class="info-label">اسم البطولة:</span>
              <span class="info-value">${selectedTournament?.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">وصف البطولة:</span>
              <span class="info-value">${selectedTournament?.description || 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الموقع:</span>
              <span class="info-value">${selectedTournament?.location}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ البدء:</span>
              <span class="info-value">${selectedTournament?.startDate ? formatGregorianDate(selectedTournament.startDate) : 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الانتهاء:</span>
              <span class="info-value">${selectedTournament?.endDate ? formatGregorianDate(selectedTournament.endDate) : 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">نوع البطولة:</span>
              <span class="info-value">${selectedTournament?.feeType === 'individual' ? 'فردي' : 'نادي'}</span>
            </div>
          </div>

          <div class="section-title">💳 معلومات الدفع</div>
          <div class="payment-info">
            <div class="info-row">
              <span class="info-label">طريقة الدفع:</span>
              <span class="info-value">${registrationData.paymentMethod === 'mobile_wallet' ? 'محفظة إلكترونية' : registrationData.paymentMethod === 'card' ? 'دفع بالكارت البنكي' : 'دفع لاحقاً'}</span>
            </div>
            ${registrationData.paymentMethod === 'mobile_wallet' && mobileWalletProvider ? `
              <div class="info-row">
                <span class="info-label">مزود المحفظة:</span>
                <span class="info-value">${mobileWalletProvider === 'vodafone' ? 'فودافون كاش' : mobileWalletProvider === 'orange' ? 'أورنج' : mobileWalletProvider === 'etisalat' ? 'اتصالات' : mobileWalletProvider === 'instapay' ? 'انستا باي' : mobileWalletProvider}</span>
              </div>
              <div class="info-row">
                <span class="info-label">رقم المحفظة:</span>
                <span class="info-value">01017799580</span>
              </div>
              ${mobileWalletReceiptNumber ? `
                <div class="info-row">
                  <span class="info-label">رقم الإيصال:</span>
                  <span class="info-value">${mobileWalletReceiptNumber}</span>
                </div>
              ` : ''}
            ` : ''}
            <div class="info-row">
              <span class="info-label">رسوم التسجيل للاعب الواحد:</span>
              <span class="info-value">${selectedTournament?.entryFee || 0} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">عدد اللاعبين:</span>
              <span class="info-value">${selectedPlayers.length} لاعب</span>
            </div>
            <div class="info-row">
              <span class="info-label">المجموع الكلي:</span>
              <span class="info-value"><strong>${totalAmount} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')}</strong></span>
            </div>
          </div>

          <div class="section-title">👥 اللاعبين المسجلين</div>
          <table class="players-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم اللاعب</th>
                <th>المركز</th>
                <th>تاريخ الميلاد</th>
                <th>رقم الهاتف</th>
                <th>البريد الإلكتروني</th>
                <th>تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              ${selectedPlayers.map((player, index) => {
                const birthDateFormatted = formatBirthDate(player.birth_date);
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${getPlayerDisplayName(player)}</td>
                    <td>${player.primary_position || player.position || 'غير محدد'}</td>
                    <td>${birthDateFormatted}</td>
                    <td>${player.phone || 'غير محدد'}</td>
                    <td>${player.email || 'غير محدد'}</td>
                    <td>${registrationDate}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-title">📊 ملخص التسجيل</div>
            <div class="summary-row">
              <span>عدد اللاعبين المسجلين:</span>
              <span>${selectedPlayers.length} لاعب</span>
            </div>
            <div class="summary-row">
              <span>رسوم التسجيل للاعب الواحد:</span>
              <span>${selectedTournament?.entryFee || 0} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')}</span>
            </div>
            <div class="summary-row total">
              <span>المجموع الكلي:</span>
              <span>${totalAmount} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')}</span>
            </div>
          </div>

          ${registrationData.notes ? `
            <div class="notes">
              <div class="section-title">📝 ملاحظات إضافية</div>
              <p>${registrationData.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>تم إصدار هذا التقرير إلكترونياً من منصة الحلم</strong></p>
            <p>📧 el7lm@mesk.qa | 📱 +20 101 779 9580</p>
            <p>قطر - الدوحة - مركز قطر للمال | الرقم الضريبي: 02289</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Handle player selection
  const togglePlayerSelection = useCallback(async (player: Player) => {
    // Check if user is authenticated
    if (!user || !userData) {
      toast.error('يجب تسجيل الدخول أولاً لاختيار اللاعبين');
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const isSelected = selectedPlayers.find(p => p.id === player.id);

    if (isSelected) {
      // Remove player from selection
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      // منع اختيار لاعب مدفوع مسبقاً
      const paidIds = new Set(
        (historyPaid || []).flatMap((reg: any) => (reg.players || [])).map((p: any) => p.id)
      );
      if (paidIds.has(player.id)) {
        toast.error('هذا اللاعب مدفوع مسبقًا لهذه البطولة');
        return;
      }

      // Check if player is already registered in this tournament
      if (selectedTournament) {
        setCheckingDuplicates(true);
        try {
          const duplicatePlayerIds = await checkForDuplicatePlayers(selectedTournament.id, [player.id]);

          if (duplicatePlayerIds.length > 0) {
            setDuplicatePlayers([player]);
            setShowDuplicateWarning(true);
            setCheckingDuplicates(false);
            return;
          }
        } catch (error) {
          console.error('Error checking for duplicate player:', error);
          // Continue with selection if check fails
        } finally {
          setCheckingDuplicates(false);
        }
      }

      // Add player to selection
      setSelectedPlayers(prev => [...prev, player]);
    }
  }, [selectedPlayers, selectedTournament]);

  // Handle editing registered player
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setShowEditModal(true);
  };

  // Update registered player data
  const updateRegisteredPlayer = (updatedPlayer: Player) => {

    setSelectedPlayers(prev =>
      prev.map(player =>
        player.id === updatedPlayer.id ? updatedPlayer : player
      )
    );
    setShowEditModal(false);
    setEditingPlayer(null);
    toast.success('تم تحديث بيانات اللاعب بنجاح');
  };

  // Check for duplicate players in tournament
  const checkForDuplicatePlayers = useCallback(async (tournamentId: string, playerIds: string[]) => {
    try {
      const registrationsRef = collection(db, 'tournamentRegistrations');
      const q = query(
        registrationsRef,
        where('tournamentId', '==', tournamentId),
        where('status', 'in', ['pending', 'approved', 'confirmed'])
      );

      const querySnapshot = await getDocs(q);
      const existingRegistrations: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.players && Array.isArray(data.players)) {
          existingRegistrations.push(...data.players);
        }
      });

      // Check for duplicates
      const duplicatePlayers = playerIds.filter(playerId =>
        existingRegistrations.some(reg => reg.id === playerId)
      );

      return duplicatePlayers;
    } catch (error) {
      console.error('Error checking for duplicate players:', error);
      return [];
    }
  }, []);

  // Validation functions for each tab
  const validatePlayersTab = () => {
    if (!selectedTournament) {
      toast.error('يرجى اختيار بطولة أولاً');
      return false;
    }
    if (selectedPlayers.length === 0) {
      toast.error('يرجى اختيار لاعب واحد على الأقل');
      return false;
    }
    return true;
  };

  const validatePaymentTab = () => {
    if (!registrationData.paymentMethod) {
      toast.error('يرجى اختيار طريقة الدفع');
      return false;
    }

    if (registrationData.paymentMethod === 'mobile_wallet') {
      if (!mobileWalletProvider) {
        toast.error('يرجى اختيار مزود المحفظة الرقمية');
        return false;
      }
      // رقم المحفظة ثابت الآن (01017799580)، لا حاجة للتحقق منه
    }

    return true;
  };

  const validateReviewTab = () => {
    if (!registrationData.notes || registrationData.notes.trim() === '') {
      toast.error('يرجى إضافة ملاحظات التسجيل');
      return false;
    }
    return true;
  };

  // Navigation functions
  const goToNextTab = () => {
    if (currentTab === 'players') {
      if (validatePlayersTab()) {
        setCurrentTab('payment');
      }
    } else if (currentTab === 'payment') {
      if (validatePaymentTab()) {
        setCurrentTab('review');
      }
    }
  };

  const goToPreviousTab = () => {
    if (currentTab === 'payment') {
      setCurrentTab('players');
    } else if (currentTab === 'review') {
      setCurrentTab('payment');
    }
  };

  // Payment handlers
  const handlePaymentMethodChange = (method: 'mobile_wallet' | 'card' | 'later') => {
    setRegistrationData(prev => ({ ...prev, paymentMethod: method }));

    // التحقق من أن المبلغ أكبر من 0 قبل فتح نافذة الدفع
    const totalAmount = calculateTotalAmount();
    if (totalAmount <= 0) {
      toast.error('لا يمكن الدفع - المبلغ الإجمالي يجب أن يكون أكبر من 0');
      return;
    }

    // Open appropriate modal based on payment method
    if (method === 'mobile_wallet') {
      // تعيين رقم المحفظة الثابت تلقائياً
      setMobileWalletNumber('01017799580');
      setShowMobileWalletModal(true);
    } else if (method === 'card') {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      // حفظ معلومات الدفع من جيديا
      setGeideaPaymentData(paymentData);

      const orderId = paymentData.orderId || paymentData.merchantReferenceId || paymentData.transactionId || `TOURNAMENT_${selectedTournament?.id}_${Date.now()}`;
      
      // Update registration data with payment info
      setRegistrationData(prev => ({
        ...prev,
        paymentMethod: 'card',
        notes: `تم الدفع بنجاح عبر جيديا - رقم الطلب: ${orderId}`
      }));

      // حفظ بيانات الدفع في Firestore (مشابه لصفحة المدفوعات الجماعية)
      try {
        const { collection, addDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        
        const paymentRecord = {
          userId: user?.uid,
          tournamentId: selectedTournament?.id,
          tournamentName: selectedTournament?.name,
          orderId: orderId,
          sessionId: paymentData.sessionId || paymentData.transactionId,
          amount: calculateTotalAmount(),
          currency: 'EGP',
          paymentMethod: 'geidea',
          paymentStatus: 'completed',
          transactionId: paymentData.sessionId || paymentData.transactionId,
          players: selectedPlayers.map(p => ({
            id: p.id,
            name: getPlayerDisplayName(p)
          })),
          accountType: userData?.accountType,
          accountName: userData?.name,
          accountEmail: userProfile?.email || user?.email,
          createdAt: new Date(),
          updatedAt: new Date(),
          geideaPaymentData: paymentData
        };

        const paymentsRef = collection(db, 'tournament_payments');
        await addDoc(paymentsRef, paymentRecord);
      } catch (paymentSaveError) {
        console.error('❌ خطأ في حفظ بيانات الدفع:', paymentSaveError);
        // لا نوقف العملية إذا فشل حفظ بيانات الدفع
      }

      toast.success('تم الدفع بنجاح! يمكنك الآن إكمال عملية التسجيل');
      setShowPaymentModal(false);
    } catch (error) {
      console.error('❌ خطأ في معالجة نجاح الدفع:', error);
      toast.error('حدث خطأ أثناء معالجة الدفع');
    }
  };

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    toast.error('فشل في عملية الدفع');
    setShowPaymentModal(false);
  };

  // دالة رفع إيصال المحفظة الإلكترونية إلى Supabase Storage bucket "wallet"
  const uploadMobileWalletReceiptToSupabase = async (file: File, receiptNumber: string) => {
    setMobileWalletUploading(true);
    setMobileWalletUploadProgress(0);

    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      // إنشاء اسم الملف آمن
      const fileExtension = file.name.split('.').pop();
      const timestamp = Date.now();
      const safeFileName = `mobile_wallet_receipt_${receiptNumber}_${timestamp}.${fileExtension}`;

      // المسار: wallet/userId/safeFileName
      const filePath = `${user.uid}/${safeFileName}`;

      // محاكاة تقدم الرفع
      const progressInterval = setInterval(() => {
        setMobileWalletUploadProgress(prev => {
          if (prev < 80) return prev + 10;
          return prev;
        });
      }, 200);

      // رفع الملف إلى Supabase في bucket "wallet"
      const { data, error } = await supabase.storage
        .from('wallet')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // السماح بالاستبدال إذا كان الملف موجود
        });

      clearInterval(progressInterval);
      setMobileWalletUploadProgress(100);

      if (error) {
        console.error('❌ خطأ في رفع إيصال المحفظة الإلكترونية:', error);
        throw new Error(`فشل في رفع الإيصال: ${error.message}`);
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from('wallet')
        .getPublicUrl(filePath);

      setMobileWalletUploadSuccess(true);
      setMobileWalletReceiptUrl(urlData?.publicUrl || '');
      toast.success('تم رفع إيصال المحفظة الإلكترونية بنجاح! سيتم التاكيد بعد 24 ساعة');

      return {
        filePath,
        publicUrl: urlData?.publicUrl,
        fileName: safeFileName,
        receiptNumber
      };

    } catch (error) {
      console.error('❌ خطأ في رفع إيصال المحفظة الإلكترونية:', error);
      toast.error('فشل في رفع إيصال المحفظة الإلكترونية');
      throw error;
    } finally {
      setMobileWalletUploading(false);
      setMobileWalletUploadProgress(0);
    }
  };

  // Mobile wallet payment handler
  const handleMobileWalletPayment = () => {
    const walletNumber = '01017799580'; // رقم المحفظة الثابت
    if (!mobileWalletProvider) {
      toast.error('يرجى اختيار مزود المحفظة الإلكترونية');
      return;
    }

    // Simulate mobile wallet payment
    toast.success(`تم إرسال طلب الدفع إلى ${mobileWalletProvider} - رقم ${walletNumber}`);

    setRegistrationData(prev => ({
      ...prev,
      notes: `دفع بالمحفظة الإلكترونية - ${mobileWalletProvider} - رقم: ${walletNumber} - ${paymentNotes}`
    }));

    setShowMobileWalletModal(false);
    setMobileWalletProvider('');
    setPaymentNotes('');
  };

  // دالة رفع إيصال المحفظة الإلكترونية
  const handleMobileWalletReceiptUpload = async () => {
    if (!mobileWalletReceipt) {
      toast.error('يرجى اختيار ملف الإيصال');
      return;
    }
    if (!mobileWalletReceiptNumber.trim()) {
      toast.error('يرجى إدخال رقم الإيصال');
      return;
    }

    try {
      const uploadResult = await uploadMobileWalletReceiptToSupabase(mobileWalletReceipt, mobileWalletReceiptNumber);

      // تحديث بيانات التسجيل
      const walletNumber = '01017799580'; // رقم المحفظة الثابت
      setRegistrationData(prev => ({
        ...prev,
        notes: `دفع بالمحفظة الإلكترونية - ${mobileWalletProvider} - رقم: ${walletNumber} - إيصال رقم: ${mobileWalletReceiptNumber} - ${paymentNotes}`
      }));

    } catch (error) {
      console.error('❌ خطأ في رفع إيصال المحفظة الإلكترونية:', error);
      toast.error('فشل في رفع الإيصال. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleMobileWalletReceiptFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMobileWalletReceipt(file);
    }
  };

  // دالة إنشاء فاتورة التسجيل في البطولة
  const generateTournamentInvoice = () => {
    if (!selectedTournament || selectedPlayers.length === 0) {
      toast.error('يرجى اختيار بطولة ولاعبين أولاً');
      return;
    }

    setGeneratingInvoice(true);

    try {
      const invoiceNumber = `TOUR-${selectedTournament.id}-${Date.now()}`;
      const currentDate = formatGregorianDate(new Date());
      const totalAmount = calculateTotalAmount();

      const invoiceContent = `
        <!DOCTYPE html>
        <html dir="rtl">
          <head>
            <title>فاتورة تسجيل البطولة - ${selectedTournament.name}</title>
            <style>
              body { font-family: 'Cairo', Arial, sans-serif; padding: 0; margin: 0; background: #f7f7fa; }
              .invoice-container { max-width: 800px; margin: 40px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0001; padding: 32px 24px; }
              .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
              .logo { height: 64px; }
              .company-info { text-align: left; font-size: 14px; color: #444; }
              .invoice-title { font-size: 2rem; color: #1a237e; font-weight: bold; letter-spacing: 1px; }
              .section-title { color: #1976d2; font-size: 1.1rem; margin-bottom: 8px; font-weight: bold; }
              .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
              .details-table th, .details-table td { border: 1px solid #e0e0e0; padding: 10px 8px; text-align: right; font-size: 15px; }
              .details-table th { background: #f0f4fa; color: #1a237e; }
              .details-table td { background: #fafbfc; }
              .summary { margin: 24px 0; font-size: 1.1rem; }
              .summary strong { color: #1976d2; }
              .footer { border-top: 2px solid #eee; padding-top: 16px; margin-top: 24px; text-align: center; color: #555; font-size: 15px; }
              .footer .icons { font-size: 1.5rem; margin-bottom: 8px; }
              .customer-care { background: #e3f2fd; color: #1976d2; border-radius: 8px; padding: 12px; margin: 18px 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; justify-content: center; }
              .thankyou { color: #388e3c; font-size: 1.2rem; margin: 18px 0 0 0; font-weight: bold; }
              .player-list { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; }
              .player-item { padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
              .player-item:last-child { border-bottom: none; }
              .payment-method { background: #fff3e0; border-radius: 8px; padding: 16px; margin: 16px 0; }
              .payment-method h4 { color: #f57c00; margin-bottom: 8px; }
              @media print { .no-print { display: none; } body { background: #fff; } .invoice-container { box-shadow: none; } }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <img src="/el7lm-logo.png" alt="Logo" class="logo" />
                <div class="company-info">
                  <div><b>الحلم (el7lm) تحت مِيسك القابضة</b> <span style="font-size:1.2em;">🚀</span></div>
                  <div>قطر- الدوحة - مركز قطر للمال</div>
                  <div>الرقم الضريبي: 02289</div>
                  <div>البريد: el7lm@mesk.qa</div>
                  <div>هاتف: 97472053188 قطر - 201017799580 مصر</div>
                </div>
              </div>

              <div class="invoice-title">فاتورة تسجيل البطولة <span style="font-size:1.3em;">🏆</span></div>

              <div style="margin: 16px 0 24px 0; color:#555;">
                <b>رقم الفاتورة:</b> ${invoiceNumber} &nbsp; | &nbsp;
                <b>تاريخ الإصدار:</b> ${currentDate} &nbsp; | &nbsp;
                <b>حالة التسجيل:</b> <span style="background: #e8f5e8; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">مسجل</span>
              </div>

              <div class="section-title">🏆 تفاصيل البطولة</div>
              <table class="details-table">
                <tr><th>اسم البطولة</th><td>${selectedTournament.name}</td></tr>
                <tr><th>تاريخ البداية</th><td>${selectedTournament.startDate ? formatGregorianDate(selectedTournament.startDate) : 'غير محدد'}</td></tr>
                <tr><th>تاريخ النهاية</th><td>${selectedTournament.endDate ? formatGregorianDate(selectedTournament.endDate) : 'غير محدد'}</td></tr>
                <tr><th>الموقع</th><td>${selectedTournament.location || 'غير محدد'}</td></tr>
                <tr><th>نوع البطولة</th><td>${selectedTournament.feeType === 'individual' ? 'فردي' : 'نادي'}</td></tr>
                <tr><th>رسوم التسجيل</th><td>${selectedTournament.entryFee || 0} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')} للاعب الواحد</td></tr>
              </table>

              <div class="section-title">👥 اللاعبين المسجلين</div>
              <div class="player-list">
                ${selectedPlayers.map((player, index) => {
                  const birthDateFormatted = formatBirthDate(player.birth_date);
                  return `
                    <div class="player-item">
                      <strong>${index + 1}. ${getPlayerDisplayName(player)}</strong>
                      ${player.primary_position || player.position ? ` - ${player.primary_position || player.position}` : ''}
                      ${player.birth_date ? ` - تاريخ الميلاد: ${birthDateFormatted}` : ''}
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="section-title">💳 تفاصيل الدفع</div>
              <table class="details-table">
                <tr><th>طريقة الدفع</th><td>${registrationData.paymentMethod === 'mobile_wallet' ? 'محفظة إلكترونية' : registrationData.paymentMethod === 'card' ? 'دفع بالكارت البنكي' : 'دفع لاحقاً'}</td></tr>
                <tr><th>عدد اللاعبين</th><td>${selectedPlayers.length} لاعب</td></tr>
                <tr><th>رسوم التسجيل للاعب الواحد</th><td>${selectedTournament.entryFee || 0} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')}</td></tr>
                <tr><th>المجموع الكلي</th><td><strong>${totalAmount} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')}</strong></td></tr>
              </table>

              ${registrationData.paymentMethod === 'mobile_wallet' && mobileWalletProvider ? `
                <div class="payment-method">
                  <h4>📱 تفاصيل المحفظة الإلكترونية</h4>
                  <p><strong>المزود:</strong> ${mobileWalletProvider === 'vodafone' ? 'فودافون كاش' : mobileWalletProvider === 'orange' ? 'أورنج' : mobileWalletProvider === 'etisalat' ? 'اتصالات' : mobileWalletProvider === 'instapay' ? 'انستا باي' : mobileWalletProvider}</p>
                  <p><strong>رقم المحفظة:</strong> 01017799580</p>
                  ${mobileWalletReceiptNumber ? `<p><strong>رقم الإيصال:</strong> ${mobileWalletReceiptNumber}</p>` : ''}
                </div>
              ` : ''}

              <div class="section-title">👤 معلومات العميل</div>
              <table class="details-table">
                <tr><th>الاسم</th><td>${userProfile?.name || 'غير محدد'}</td></tr>
                <tr><th>البريد الإلكتروني</th><td>${userProfile?.email || 'غير محدد'}</td></tr>
                <tr><th>رقم الهاتف</th><td>${userProfile?.phone || 'غير محدد'}</td></tr>
                <tr><th>نوع الحساب</th><td>${userProfile?.type === 'club' ? 'نادي' : userProfile?.type === 'academy' ? 'أكاديمية' : 'فردي'}</td></tr>
              </table>

              <div class="summary">
                <strong>إجمالي المبلغ المستحق:</strong> ${totalAmount} ${getCurrencySymbol(selectedTournament?.currency || 'EGP')}
              </div>

              ${registrationData.notes ? `
                <div class="section-title">📝 ملاحظات إضافية</div>
                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p>${registrationData.notes}</p>
                </div>
              ` : ''}

              <div class="customer-care">
                🎧 خدمة العملاء متاحة 24/7 | 📧 el7lm@mesk.qa | 📱 +20 101 779 9580
              </div>

              <div class="footer">
                <div class="icons">🌟 منصة الحلم - حيث تتحقق الأحلام 🌟</div>
                <div style="margin-top:8px; font-size:13px; color:#888;">تم إصدار هذه الفاتورة إلكترونيًا ولا تحتاج إلى توقيع.</div>
              </div>

              <div class="thankyou">شكرًا لاختيارك منصة الحلم! 🎉</div>
            </div>
          </body>
        </html>
      `;

      // إنشاء blob من HTML
      const blob = new Blob([invoiceContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // إنشاء رابط التحميل
      const link = document.createElement('a');
      link.href = url;
      link.download = `فاتورة-تسجيل-${selectedTournament.name}-${new Date().toISOString().split('T')[0]}.html`;

      // إضافة الرابط للصفحة وتنفيذ التحميل
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // تنظيف URL
      URL.revokeObjectURL(url);

      toast.success('تم إنشاء الفاتورة بنجاح!');

    } catch (error) {
      console.error('خطأ في إنشاء الفاتورة:', error);
      toast.error('فشل في إنشاء الفاتورة');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <ResponsiveLayoutWrapper
        accountType={userData?.accountType || 'player'}
        showSidebar={true}
        showHeader={true}
        showFooter={true}
      >
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full border-b-2 border-yellow-600 animate-spin"></div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-700">جاري التحميل...</h2>
            <p className="text-gray-500">نحضر البيانات من أجلك</p>
          </div>
        </div>
      </ResponsiveLayoutWrapper>
    );
  }

  return (
    <ResponsiveLayoutWrapper
      accountType={userData?.accountType || 'player'}
      showSidebar={true}
      showHeader={true}
      showFooter={true}
    >
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-white to-indigo-50 border-b border-indigo-100 shadow-lg">
          <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="flex gap-2 items-center text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  العودة
                </Button>
              </div>

              <div className="flex-1 text-center">
                <div className="flex gap-3 justify-center items-center mb-2">
                  <Trophy className="w-8 h-8 from-purple-600 to-blue-600 text-gradient-to-r" />
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">تسجيل موحد للبطولات</h1>
                </div>
                <p className="text-gray-600">سجل في أي بطولة متاحة باستخدام لاعبيك المسجلين</p>
              </div>

              <div className="flex gap-3 items-center">
                {userProfile ? (
                  <div className="flex gap-3 items-center">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={getSafeAvatarUrl(userProfile.avatar)} />
                      <AvatarFallback className="text-yellow-800 bg-yellow-100">
                        {userProfile.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{userProfile.name}</p>
                      <div className="flex gap-1 items-center">
                        {userProfile.type === 'club' && <Building className="w-3 h-3 text-blue-600" />}
                        {userProfile.type === 'academy' && <Users className="w-3 h-3 text-green-600" />}
                        {userProfile.type === 'individual' && <User className="w-3 h-3 text-purple-600" />}
                        <span className="text-xs text-gray-500 capitalize">{userProfile.type}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                    className="text-white bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                  >
                    <User className="mr-2 w-4 h-4" />
                    تسجيل الدخول
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Tournament Selection */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  البطولات المتاحة
                </CardTitle>
                <CardDescription>
                  اختر البطولة التي تريد التسجيل فيها
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                    <Input
                      placeholder="البحث في البطولات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={statusFilter === 'available' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('available')}
                      className={`flex-1 ${statusFilter === 'available' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      متاحة
                    </Button>
                    <Button
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('all')}
                      className={`flex-1 ${statusFilter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      الكل
                    </Button>
                  </div>
                </div>

                {/* Tournament List */}
                <div className="overflow-y-auto space-y-3 max-h-96">
                  {tournaments.length === 0 ? (
                    <div className="py-8 text-center">
                      <Trophy className="mx-auto mb-2 w-12 h-12 text-gray-400" />
                      <p className="mb-2 text-gray-500">لا توجد بطولات متاحة حالياً</p>
                      {userProfile && (
                        <p className="text-xs text-gray-400">
                          {userProfile.type === 'individual' 
                            ? 'البطولات المتاحة للأفراد ستظهر هنا' 
                            : 'البطولات المتاحة للأندية والأكاديميات ستظهر هنا'}
                        </p>
                      )}
                    </div>
                  ) : (
                    tournaments
                      .filter(tournament =>
                        tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        tournament.location.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((tournament) => {
                        const isSelected = selectedTournament?.id === tournament.id;
                        const spotsLeft = tournament.maxParticipants - tournament.currentParticipants;

                        return (
                          <Card
                            key={tournament.id}
                            className={`cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-yellow-50 ring-2 ring-yellow-500'
                                : 'hover:shadow-md hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setSelectedTournament(tournament);
                              setRegistrationData(prev => ({ ...prev, tournamentId: tournament.id }));
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex gap-3 items-center">
                                  {tournament.logo ? (
                                    <div className="flex-shrink-0">
                                      <img
                                        src={tournament.logo}
                                        alt={`${tournament.name} logo`}
                                        className="object-cover w-10 h-10 rounded-lg border border-gray-200 shadow-sm lg:w-12 lg:h-12"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex flex-shrink-0 justify-center items-center w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-sm lg:w-12 lg:h-12">
                                      <Trophy className="w-5 h-5 text-white lg:h-6 lg:w-6" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                      <h4 className="flex-1 font-semibold text-gray-900 truncate">{tournament.name}</h4>
                                      {isSelected && <CheckCircle className="ml-2 w-5 h-5 text-yellow-600" />}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                  <div className="flex gap-2 items-center">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{tournament.location}</span>
                                  </div>

                                  <div className="flex gap-2 items-center">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formatGregorianDate(tournament.startDate)}</span>
                                  </div>

                                  <div className="flex gap-2 items-center">
                                    <Users className="w-3 h-3" />
                                    <span>{tournament.currentParticipants}/{tournament.maxParticipants}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {spotsLeft} متبقي
                                    </Badge>
                                  </div>

                                  {tournament.isPaid && (
                                    <div className="flex gap-2 items-center">
                                      <DollarSign className="w-3 h-3" />
                                      <span>{tournament.entryFee} ${getCurrencySymbol(tournament.currency || 'EGP')} / لاعب</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  <Badge className="text-xs text-green-800 bg-green-100">متاحة</Badge>
                                  <Badge className={`text-xs ${
                                    tournament.feeType === 'individual' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {tournament.feeType === 'individual' ? 'فردي' : 'نادي'}
                                  </Badge>
                                  {tournament.categories.map(category => (
                                    <Badge key={category} variant="outline" className="text-xs">
                                      {category}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-2">
            {selectedTournament ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex gap-2 items-center">
                    <Users className="w-5 h-5 text-blue-600" />
                    التسجيل في: {selectedTournament.name}
                  </CardTitle>
                  <CardDescription>
                    اختر اللاعبين من قائمتك واملأ البيانات المطلوبة
                  </CardDescription>

                  {/* Navigation Instructions */}
                  <div className="p-4 mt-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex gap-2 items-center mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-blue-800">تعليمات التنقل</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      استخدم أزرار "التالي" و "السابق" للتنقل بين التبويبات. يجب إكمال كل تبويب قبل الانتقال للتالي.
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
                    <TabsList className="grid grid-cols-3 p-1 w-full h-auto bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
                      <TabsTrigger
                        value="players"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-2 py-3 sm:px-4 sm:py-2 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 relative"
                      >
                        <Users className="w-3 h-3 sm:h-4 sm:w-4" />
                        <span className="text-xs leading-tight sm:text-sm">
                          <span className="block sm:hidden">اللاعبين</span>
                          <span className="hidden sm:block">اختيار اللاعبين</span>
                        </span>
                        {selectedTournament && selectedPlayers.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="payment"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-2 py-3 sm:px-4 sm:py-2 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 relative"
                      >
                        <CreditCard className="w-3 h-3 sm:h-4 sm:w-4" />
                        <span className="text-xs leading-tight sm:text-sm">الدفع</span>
                        {registrationData.paymentMethod && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="review"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-2 py-3 sm:px-4 sm:py-2 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 relative"
                      >
                        <CheckCircle className="w-3 h-3 sm:h-4 sm:w-4" />
                        <span className="text-xs leading-tight sm:text-sm">
                          <span className="block sm:hidden">المراجعة</span>
                          <span className="hidden sm:block">مراجعة التسجيل</span>
                        </span>
                        {registrationData.notes && registrationData.notes.trim() !== '' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Players Selection Tab */}
                    <TabsContent value="players" className="space-y-6">
                      {selectedTournament && (historyPaid.length > 0 || historyPending.length > 0) && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Card className="border border-green-200">
                            <CardHeader>
                              <CardTitle className="text-sm text-green-800 sm:text-base">اللاعبون المدفوع لهم</CardTitle>
                              <CardDescription className="text-xs">سجلات مكتملة الدفع لهذه البطولة</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {historyPaid.length === 0 ? (
                                <p className="text-xs text-gray-500">لا توجد سجلات</p>
                              ) : (
                                historyPaid.slice(0, 5).map((reg: any) => (
                                  <div key={reg.id} className="flex justify-between items-center text-xs">
                                    <span className="font-medium text-gray-800">{reg?.players?.length || 0} لاعب</span>
                                    <span className="text-gray-500">{reg?.paymentAmount || 0} {getCurrencySymbol(reg?.currency || selectedTournament?.currency || 'EGP')}</span>
                                  </div>
                                ))
                              )}
                            </CardContent>
                          </Card>
                          <Card className="border border-amber-200">
                            <CardHeader>
                              <CardTitle className="text-sm text-amber-800 sm:text-base">اللاعبون المعلّقون</CardTitle>
                              <CardDescription className="text-xs">سجلات لم تُستكمل عملية الدفع</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {historyPending.length === 0 ? (
                                <p className="text-xs text-gray-500">لا توجد سجلات</p>
                              ) : (
                                historyPending.slice(0, 5).map((reg: any) => (
                                  <div key={reg.id} className="flex justify-between items-center text-xs">
                                    <span className="font-medium text-gray-800">{reg?.players?.length || 0} لاعب</span>
                                    <span className="text-gray-500">{reg?.paymentAmount || 0} {getCurrencySymbol(reg?.currency || selectedTournament?.currency || 'EGP')}</span>
                                  </div>
                                ))
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 sm:text-xl">اختر اللاعبين للتسجيل</h3>

                        {checkingDuplicates && (
                          <div className="flex gap-2 items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="w-4 h-4 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                            <span className="text-sm text-blue-700">جاري فحص التكرار...</span>
                          </div>
                        )}

                        {!user || !userData ? (
                          <Card className="bg-yellow-50 border-2 border-yellow-300 border-dashed">
                            <CardContent className="p-8 text-center">
                              <User className="mx-auto mb-4 w-12 h-12 text-yellow-600" />
                              <h4 className="mb-2 font-semibold text-gray-700">يجب تسجيل الدخول أولاً</h4>
                              <p className="mb-4 text-gray-600">
                                يجب تسجيل الدخول أو إنشاء حساب جديد لاختيار اللاعبين والتسجيل في البطولة
                              </p>
                              <div className="flex gap-3 justify-center">
                                <Button
                                  onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                                  className="text-white bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                                >
                                  <User className="mr-2 w-4 h-4" />
                                  تسجيل الدخول
                                </Button>
                                <Button
                                  onClick={() => router.push(`/auth/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                                  variant="outline"
                                  className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                >
                                  إنشاء حساب جديد
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ) : availablePlayers.length === 0 ? (
                          <Card className="border-2 border-gray-300 border-dashed">
                            <CardContent className="p-8 text-center">
                              <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                              <h4 className="mb-2 font-semibold text-gray-700">لا توجد لاعبين مسجلين</h4>
                              <p className="mb-4 text-gray-500">
                                يجب أن تقوم بإضافة لاعبين أولاً قبل التسجيل في البطولات
                              </p>
                              <Button
                                onClick={() => router.push('/dashboard/players')}
                                className="text-white bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg transition-all duration-300 hover:from-cyan-600 hover:to-blue-600 hover:shadow-xl"
                              >
                                <Plus className="mr-2 w-4 h-4" />
                                إضافة لاعبين
                              </Button>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                            {availablePlayers.map((player) => {
                              const isSelected = selectedPlayers.find(p => p.id === player.id);
                              const isPaid = paidPlayerIds.has(player.id);

                              return (
                                <Card
                                  key={player.id}
                                  className={`cursor-pointer transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-blue-50 ring-2 ring-blue-500'
                                      : isPaid ? 'opacity-60' : 'hover:shadow-md hover:bg-gray-50'
                                  } ${checkingDuplicates ? 'opacity-50 pointer-events-none' : ''} ${isPaid ? 'pointer-events-none' : ''}`}
                                  onClick={() => !isPaid && togglePlayerSelection(player)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex gap-3 items-center">
                                      <Checkbox
                                        checked={!!isSelected}
                                        onChange={() => {}}
                                        disabled={checkingDuplicates || isPaid}
                                        className="pointer-events-none"
                                      />

                                      <Avatar className="w-10 h-10">
                                        <AvatarImage src={getSafeAvatarUrl(player.profile_image || player.avatar)} />
                                        <AvatarFallback className="text-blue-800 bg-blue-100">
                                          {getPlayerDisplayName(player).charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>

                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{getPlayerDisplayName(player)}</h4>
                                        <div className="space-y-1 text-sm text-gray-500">
                                          <p>تاريخ الميلاد: {formatBirthDate(player.birth_date)}</p>
                                          <p>المركز: {player.primary_position || player.position || 'غير محدد'}</p>
                                        </div>
                                      </div>

                                      {isPaid ? (
                                        <Badge className="text-emerald-800 bg-emerald-100 border border-emerald-200">مدفوع</Badge>
                                      ) : isSelected && (
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}

                        {selectedPlayers.length > 0 && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold text-blue-900">اللاعبين المختارين</h4>
                                <p className="text-sm text-blue-700">
                                  تم اختيار {selectedPlayers.length} لاعب للتسجيل
                                </p>
                              </div>
                              <div className="text-right">
                                {selectedTournament.isPaid && (
                                  <p className="text-lg font-bold text-blue-900">
                                    {calculateTotalAmount()} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                        <div></div>
                        <Button
                          onClick={goToNextTab}
                          className="text-white bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-purple-600 hover:shadow-xl"
                        >
                          التالي
                          <ArrowRight className="mr-2 w-4 h-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Payment Tab */}
                    <TabsContent value="payment" className="space-y-6">
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-800">خيارات الدفع</h3>

                        {selectedTournament.isPaid ? (
                          <div className="space-y-6">
                            {/* Payment Summary */}
                            <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                                <div className="flex gap-3 items-center">
                                  <div className="p-3 bg-yellow-100 rounded-full">
                                    <DollarSign className="w-6 h-6 text-yellow-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">رسوم اللاعب الواحد</p>
                                    <p className="text-lg font-bold text-yellow-800">{selectedTournament.entryFee} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-center">
                                  <div className="p-3 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-full">
                                    <Users className="w-6 h-6 text-cyan-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">عدد اللاعبين</p>
                                    <p className="text-lg font-bold text-cyan-800">{selectedPlayers.length}</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-center">
                                  <div className="p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-full">
                                    <CreditCard className="w-6 h-6 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">المجموع الكلي</p>
                                    <p className="text-xl font-bold text-emerald-800">{calculateTotalAmount()} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-center">
                                  <div className="p-3 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full">
                                    <CreditCard className="w-6 h-6 text-violet-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">طريقة الدفع</p>
                                    <p className="text-lg font-bold text-violet-800">
                                      {registrationData.paymentMethod === 'later' ? 'دفع لاحقاً' :
                                       registrationData.paymentMethod === 'mobile_wallet' ? 'محفظة إلكترونية' :
                                       registrationData.paymentMethod === 'card' ? 'دفع بالكارت البنكي' : 'غير محدد'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Installment Info */}
                            {selectedTournament.allowInstallments && selectedTournament.installmentsCount && (
                              <div className="p-4 mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                                <div className="flex gap-2 items-center mb-2">
                                  <CreditCard className="w-5 h-5 text-indigo-600" />
                                  <h4 className="font-semibold text-indigo-900">الدفع بالتقسيط متاح</h4>
                                </div>
                                <p className="mb-3 text-sm text-indigo-700">
                                  يمكنك تقسيم المبلغ على {selectedTournament.installmentsCount} أقساط
                                </p>
                                {selectedTournament.installmentsDetails && (
                                  <p className="mb-3 text-xs text-indigo-600">{selectedTournament.installmentsDetails}</p>
                                )}
                                <div className="p-3 space-y-1 bg-white rounded-lg border border-indigo-200">
                                  <p className="mb-2 text-xs font-semibold text-indigo-900">مثال على الأقساط:</p>
                                  {Array.from({ length: selectedTournament.installmentsCount }, (_, i) => {
                                    const installmentAmount = (selectedTournament.entryFee || 0) / selectedTournament.installmentsCount;
                                    return (
                                      <div key={i} className="flex justify-between text-xs">
                                        <span className="text-gray-600">القسط {i + 1}:</span>
                                        <span className="font-semibold text-indigo-700">
                                          {installmentAmount.toFixed(2)} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Payment Methods */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                              <Card
                                className={`cursor-pointer transition-all duration-300 border-2 ${
                                  registrationData.paymentMethod === 'later'
                                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                                } ${calculateTotalAmount() <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => calculateTotalAmount() > 0 && handlePaymentMethodChange('later')}
                              >
                                <CardContent className="p-6 text-center">
                                  <div className="flex justify-center items-center p-4 mx-auto mb-4 w-16 h-16 bg-indigo-100 rounded-full">
                                    <Clock className="w-8 h-8 text-indigo-600" />
                                  </div>
                                  <h4 className="mb-2 font-semibold text-gray-900">دفع لاحقاً</h4>
                                  <p className="text-sm text-gray-600">سجل الآن وادفع لاحقاً</p>
                                </CardContent>
                              </Card>

                              <Card
                                className={`cursor-pointer transition-all duration-300 border-2 ${
                                  registrationData.paymentMethod === 'mobile_wallet'
                                    ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                                    : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
                                } ${calculateTotalAmount() <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => calculateTotalAmount() > 0 && handlePaymentMethodChange('mobile_wallet')}
                              >
                                <CardContent className="p-6 text-center">
                                  <div className="flex justify-center items-center p-4 mx-auto mb-4 w-16 h-16 bg-emerald-100 rounded-full">
                                    <Smartphone className="w-8 h-8 text-emerald-600" />
                                  </div>
                                  <h4 className="mb-2 font-semibold text-gray-900">محفظة إلكترونية</h4>
                                  <p className="text-sm text-gray-600">فودافون كاش، أورنج، اتصالات</p>
                                </CardContent>
                              </Card>

                              <Card
                                className={`cursor-pointer transition-all duration-300 border-2 ${
                                  registrationData.paymentMethod === 'card'
                                    ? 'border-violet-500 bg-violet-50 shadow-lg'
                                    : 'border-gray-200 hover:border-violet-300 hover:shadow-md'
                                } ${calculateTotalAmount() <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => calculateTotalAmount() > 0 && handlePaymentMethodChange('card')}
                              >
                                <CardContent className="p-6 text-center">
                                  <div className="flex justify-center items-center p-4 mx-auto mb-4 w-16 h-16 bg-violet-100 rounded-full">
                                    <CreditCard className="w-8 h-8 text-violet-600" />
                                  </div>
                                  <h4 className="mb-2 font-semibold text-gray-900">دفع بالكارت البنكي</h4>
                                  <p className="text-sm text-gray-600">فيزا، ماستركارد، جيديا</p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center bg-green-50 rounded-xl border border-green-200">
                            <CheckCircle className="mx-auto mb-4 w-12 h-12 text-green-600" />
                            <h4 className="mb-2 text-lg font-semibold text-green-900">بطولة مجانية</h4>
                            <p className="text-green-700">هذه البطولة مجانية ولا تتطلب دفع رسوم</p>
                          </div>
                        )}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                        <Button
                          onClick={goToPreviousTab}
                          variant="outline"
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          <ArrowLeft className="ml-2 w-4 h-4" />
                          السابق
                        </Button>
                        <Button
                          onClick={goToNextTab}
                          className="text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg transition-all duration-300 hover:from-emerald-600 hover:to-green-600 hover:shadow-xl"
                        >
                          التالي
                          <ArrowRight className="mr-2 w-4 h-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Review Tab */}
                    <TabsContent value="review" className="space-y-6">
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">مراجعة التسجيل</h3>

                        {/* Tournament Info */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex gap-2 items-center">
                              <Trophy className="w-5 h-5 text-yellow-600" />
                              معلومات البطولة
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Tournament Logo and Name */}
                            <div className="flex gap-4 items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                              {selectedTournament.logo ? (
                                <div className="flex-shrink-0">
                                  <img
                                    src={selectedTournament.logo}
                                    alt={`${selectedTournament.name} logo`}
                                    className="object-cover w-16 h-16 rounded-lg border-2 border-yellow-300 shadow-md lg:w-20 lg:h-20"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-shrink-0 justify-center items-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-md lg:w-20 lg:h-20">
                                  <Trophy className="w-8 h-8 text-white lg:h-10 lg:w-10" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="mb-1 text-xl font-bold text-gray-900 lg:text-2xl">
                                  {selectedTournament.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {selectedTournament.description}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-600">اسم البطولة</Label>
                                <p className="text-lg font-semibold text-gray-900">{selectedTournament.name}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">الموقع</Label>
                                <div className="flex gap-2 items-center">
                                  <p className="text-lg font-semibold text-gray-900">{selectedTournament.location}</p>
                                  {selectedTournament.locationUrl && (
                                    <a
                                      href={selectedTournament.locationUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 transition-colors hover:text-blue-800"
                                      title="فتح الموقع على الخريطة"
                                    >
                                      <MapPin className="w-5 h-5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">تاريخ البدء</Label>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatGregorianDate(selectedTournament.startDate)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">تاريخ الانتهاء</Label>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatGregorianDate(selectedTournament.endDate)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Selected Players */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex gap-2 items-center">
                              <Users className="w-5 h-5 text-blue-600" />
                              اللاعبين المختارين ({selectedPlayers.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {selectedPlayers.length === 0 ? (
                              <div className="py-4 text-center">
                                <p className="text-gray-500">لم يتم اختيار أي لاعبين</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {selectedPlayers.map((player, index) => (
                                  <div key={player.id} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex justify-center items-center w-8 h-8 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">
                                      {index + 1}
                                    </div>
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={getSafeAvatarUrl(player.profile_image || player.avatar)} />
                                      <AvatarFallback className="text-xs text-blue-800 bg-blue-100">
                                        {getPlayerDisplayName(player).charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">{getPlayerDisplayName(player)}</p>
                                      <p className="text-sm text-gray-500">
                                        {(player.primary_position || player.position) && `${player.primary_position || player.position} • `}
                                        {player.birth_date && `تاريخ الميلاد: ${formatBirthDate(player.birth_date)}`}
                                      </p>
                                    </div>
                                    {selectedTournament.isPaid && (
                                      <div className="text-right">
                                        <p className="font-semibold text-gray-900">{selectedTournament.entryFee} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Payment Summary */}
                        {selectedTournament.isPaid && selectedPlayers.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex gap-2 items-center">
                                <CreditCard className="w-5 h-5 text-green-600" />
                                ملخص الدفع
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">رسوم اللاعب الواحد:</span>
                                  <span className="font-semibold">{selectedTournament.entryFee} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">عدد اللاعبين:</span>
                                  <span className="font-semibold">{selectedPlayers.length}</span>
                                </div>
                                <div className="pt-4 border-t">
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-900">المجموع الكلي:</span>
                                    <span className="text-xl font-bold text-green-600">{calculateTotalAmount()} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">طريقة الدفع:</span>
                                  <Badge
                                    className={`${
                                      registrationData.paymentMethod === 'later' ? 'bg-blue-100 text-blue-800' :
                                      registrationData.paymentMethod === 'mobile_wallet' ? 'bg-green-100 text-green-800' :
                                      registrationData.paymentMethod === 'card' ? 'bg-purple-100 text-purple-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {registrationData.paymentMethod === 'later' ? 'دفع لاحقاً' :
                                     registrationData.paymentMethod === 'mobile_wallet' ? 'محفظة إلكترونية' :
                                     registrationData.paymentMethod === 'card' ? 'دفع بالكارت البنكي' :
                                     'غير محدد'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Notes */}
                        <Card>
                          <CardHeader>
                            <CardTitle>ملاحظات إضافية</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <textarea
                              className="p-3 w-full rounded-lg border border-gray-300 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={4}
                              placeholder="أي ملاحظات أو متطلبات خاصة..."
                              value={registrationData.notes}
                              onChange={(e) => setRegistrationData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                          </CardContent>
                        </Card>

                        {/* Payment Information */}
                        {registrationData.paymentMethod !== 'later' && (
                          <Card>
                            <CardHeader>
                              <CardTitle>معلومات الدفع</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">المبلغ الإجمالي:</span>
                                  <span className={`font-bold text-lg ${calculateTotalAmount() <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {calculateTotalAmount()} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}
                                  </span>
                                </div>

                                {calculateTotalAmount() <= 0 && (
                                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                    <div className="flex gap-2 items-center text-red-800">
                                      <AlertTriangle className="w-5 h-5" />
                                      <span className="font-medium">تحذير</span>
                                    </div>
                                    <p className="mt-1 text-sm text-red-600">
                                      لا يمكن التسجيل - المبلغ الإجمالي يجب أن يكون أكبر من 0
                                    </p>
                                  </div>
                                )}

                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">طريقة الدفع:</span>
                                  <span className="font-medium">
                                    {registrationData.paymentMethod === 'mobile_wallet' ? 'محفظة إلكترونية' :
                                     registrationData.paymentMethod === 'card' ? 'دفع بالكارت البنكي' :
                                     registrationData.paymentMethod === 'later' ? 'دفع لاحقاً' : 'غير محدد'}
                                  </span>
                                </div>

                                {registrationData.paymentMethod === 'card' && (
                                  <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                                    <p className="text-sm text-violet-800">
                                      ✅ تم الدفع بنجاح عبر الكارت البنكي
                                    </p>
                                  </div>
                                )}

                                {registrationData.paymentMethod === 'mobile_wallet' && (
                                  <div className="space-y-2">
                                    {mobileWalletProvider && (
                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600">مزود المحفظة:</span>
                                        <span className="font-medium text-emerald-600">
                                          {mobileWalletProvider === 'vodafone' ? 'فودافون كاش' :
                                           mobileWalletProvider === 'orange' ? 'أورنج' :
                                           mobileWalletProvider === 'etisalat' ? 'اتصالات' :
                                           mobileWalletProvider === 'instapay' ? 'انستا باي' : mobileWalletProvider}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                      <span className="text-gray-600">رقم المحفظة:</span>
                                      <span className="font-medium text-emerald-600">01017799580</span>
                                    </div>
                                    {mobileWalletReceiptNumber && (
                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600">رقم الإيصال:</span>
                                        <span className="font-medium text-emerald-600">{mobileWalletReceiptNumber}</span>
                                      </div>
                                    )}
                                    {mobileWalletReceipt && (
                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600">ملف الإيصال:</span>
                                        <span className="font-medium text-emerald-600">{mobileWalletReceipt.name}</span>
                                      </div>
                                    )}
                                    {mobileWalletUploadSuccess && (
                                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                        <p className="text-sm text-emerald-800">
                                          ✅ تم رفع إيصال المحفظة الإلكترونية بنجاح
                                        </p>
                                        <p className="mt-1 text-xs text-emerald-600">
                                          سيتم مراجعة الإيصال والتأكيد خلال 24 ساعة
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Invoice Generation Button */}
                        <div className="mb-4">
                          <Button
                            variant="outline"
                            onClick={generateTournamentInvoice}
                            disabled={generatingInvoice || !selectedTournament || selectedPlayers.length === 0}
                            className="w-full text-blue-600 border-blue-300 transition-all duration-300 hover:bg-blue-50 hover:border-blue-400"
                          >
                            {generatingInvoice ? (
                              <>
                                <div className="mr-2 w-4 h-4 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                                جاري إنشاء الفاتورة...
                              </>
                            ) : (
                              <>
                                <FileText className="mr-2 w-4 h-4" />
                                استخراج فاتورة التسجيل
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Submit Button */}
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <Button
                            variant="outline"
                            className="flex-1 text-red-600 border-red-300 transition-all duration-300 hover:bg-red-50 hover:border-red-400"
                            onClick={() => {
                              setSelectedPlayers([]);
                              setSelectedTournament(null);
                              setRegistrationData({
                                tournamentId: '',
                                selectedPlayers: [],
                                paymentMethod: 'later',
                                notes: ''
                              });
                            }}
                          >
                            إلغاء التسجيل
                          </Button>

                          <Button
                            className="flex-1 text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg transition-all duration-300 transform hover:from-purple-700 hover:to-pink-700 hover:shadow-xl hover:scale-105"
                            disabled={submitting || selectedPlayers.length === 0 || calculateTotalAmount() <= 0}
                            onClick={async () => {
                              // Check if user is authenticated
                              if (!user || !userData) {
                                toast.error('يجب تسجيل الدخول أولاً لإكمال التسجيل');
                                router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                                return;
                              }

                              // التحقق من جميع التبويبات قبل التسجيل
                              if (!validatePlayersTab() || !validatePaymentTab() || !validateReviewTab()) {
                                return;
                              }

                              // التحقق من أن الإجمالي ليس 0
                              const totalAmount = calculateTotalAmount();
                              if (totalAmount <= 0) {
                                toast.error('لا يمكن التسجيل - المبلغ الإجمالي يجب أن يكون أكبر من 0');
                                return;
                              }

                              setSubmitting(true);
                              try {
                                // Check for duplicate players
                                const playerIds = selectedPlayers.map(player => player.id);
                                const duplicatePlayerIds = await checkForDuplicatePlayers(selectedTournament.id, playerIds);

                                if (duplicatePlayerIds.length > 0) {
                                  const duplicatePlayers = selectedPlayers.filter(player =>
                                    duplicatePlayerIds.includes(player.id)
                                  );

                                  setDuplicatePlayers(duplicatePlayers);
                                  setShowDuplicateWarning(true);
                                  setSubmitting(false);
                                  return;
                                }

                                // Save registration data to database
                                const registrationToSave = {
                                  tournamentId: selectedTournament.id,
                                  tournamentName: selectedTournament.name,
                                  players: selectedPlayers.map(player => ({
                                    id: player.id,
                                    name: getPlayerDisplayName(player),
                                    email: player.email,
                                    phone: player.phone,
                                    birth_date: player.birth_date,
                                    position: player.primary_position || player.position,
                                    club: player.club_id,
                                    avatar: player.profile_image || player.avatar
                                  })),
                                  // Account information
                                  accountType: userData.accountType,
                                  accountName: userData.name,
                                  accountEmail: userData.email,
                                  accountPhone: userData.phone,
                                  organizationName: userData.organizationName || userData.name,
                                  organizationType: userData.organizationType || userData.accountType,
                                  // Payment information
                                  paymentMethod: registrationData.paymentMethod,
                                  mobileWalletProvider: mobileWalletProvider,
                                  mobileWalletNumber: '01017799580',
                                  receiptUrl: mobileWalletReceiptUrl || (mobileWalletUploadSuccess ? 'uploaded' : ''),
                                  receiptNumber: mobileWalletReceiptNumber,
                                  paymentAmount: calculateTotalAmount(),
                                  paymentStatus: registrationData.paymentMethod === 'later' ? 'pending' : 'paid',
                                  // Geidea payment data (if card payment)
                                  geideaOrderId: geideaPaymentData?.orderId || geideaPaymentData?.merchantReferenceId || null,
                                  geideaTransactionId: geideaPaymentData?.transactionId || null,
                                  geideaPaymentData: geideaPaymentData ? JSON.stringify(geideaPaymentData) : null,
                                  // Additional info
                                  notes: registrationData.notes,
                                  registrationType: userProfile?.type === 'individual' ? 'individual' : 'club',
                                  registrationDate: new Date(),
                                  status: 'pending',
                                  createdBy: user.uid
                                };

                                // Save to tournamentRegistrations collection
                                const registrationsRef = collection(db, 'tournamentRegistrations');
                                await addDoc(registrationsRef, registrationToSave);

                                // Also save individual player registrations for backward compatibility
                                for (const player of selectedPlayers) {
                                  const individualRegistration = {
                                    tournamentId: selectedTournament.id,
                                    playerId: player.id,
                                    playerName: getPlayerDisplayName(player),
                                    playerEmail: player.email,
                                    playerPhone: player.phone,
                                    playerBirthDate: player.birth_date,
                                    playerClub: player.club_id,
                                    playerPosition: player.primary_position || player.position,
                                    registrationDate: new Date(),
                                    paymentStatus: registrationData.paymentMethod === 'later' ? 'pending' : 'paid',
                                    paymentAmount: calculateTotalAmount(),
                                    notes: registrationData.notes,
                                    registrationType: userProfile?.type === 'individual' ? 'individual' : 'club',
                                    // New fields
                                    accountType: userData.accountType,
                                    accountName: userData.name,
                                    accountEmail: userData.email,
                                    accountPhone: userData.phone,
                                    organizationName: userData.organizationName || userData.name,
                                    organizationType: userData.organizationType || userData.accountType,
                                    paymentMethod: registrationData.paymentMethod,
                                    mobileWalletProvider: mobileWalletProvider,
                                    mobileWalletNumber: '01017799580',
                                    receiptUrl: mobileWalletReceiptUrl || (mobileWalletUploadSuccess ? 'uploaded' : ''),
                                    receiptNumber: mobileWalletReceiptNumber,
                                    // Geidea payment data (if card payment)
                                    geideaOrderId: geideaPaymentData?.orderId || geideaPaymentData?.merchantReferenceId || null,
                                    geideaTransactionId: geideaPaymentData?.transactionId || null,
                                    geideaPaymentData: geideaPaymentData ? JSON.stringify(geideaPaymentData) : null,
                                    clubName: userData.organizationName || userData.name,
                                    clubContact: userData.phone
                                  };

                                  const individualRegistrationsRef = collection(db, 'tournament_registrations');
                                  await addDoc(individualRegistrationsRef, individualRegistration);
                                }

                                toast.success('تم التسجيل بنجاح في البطولة!');

                                // Set registered players and show success state
                                setRegisteredPlayers([...selectedPlayers]);
                                setRegistrationSuccess(true);

                              } catch (error) {
                                console.error('Registration error:', error);
                                toast.error('فشل في التسجيل، يرجى المحاولة مرة أخرى');
                              } finally {
                                setSubmitting(false);
                              }
                            }}
                          >
                            {submitting ? (
                              <>
                                <div className="mr-2 w-5 h-5 rounded-full border-b-2 border-white animate-spin"></div>
                                جاري التسجيل...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 w-5 h-5" />
                                تأكيد التسجيل
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                        <Button
                          onClick={goToPreviousTab}
                          variant="outline"
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          <ArrowLeft className="ml-2 w-4 h-4" />
                          السابق
                        </Button>
                        <div></div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">اختر بطولة للتسجيل</h3>
                  <p className="text-gray-600">يرجى اختيار بطولة من القائمة الجانبية لبدء عملية التسجيل</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Geidea Payment Modal - For Card Payment */}
    <GeideaPaymentModal
      visible={showPaymentModal}
      onRequestClose={() => setShowPaymentModal(false)}
      onPaymentSuccess={handlePaymentSuccess}
      onPaymentFailure={handlePaymentFailure}
      amount={calculateTotalAmount()}
      currency="EGP"
      title={`دفع بالكارت البنكي - ${selectedTournament?.name}`}
      description={`دفع رسوم التسجيل للبطولة: ${selectedTournament?.name} - فيزا، ماستركارد، جيديا`}
      customerEmail={userProfile?.email || ''}
      merchantReferenceId={`TOURNAMENT_${selectedTournament?.id}_${Date.now()}`}
      returnUrl={typeof window !== 'undefined' ? '/tournaments/unified-registration?payment=success' : undefined}
      callbackUrl={undefined}
    />

    {/* Mobile Wallet Payment Modal */}
    {showMobileWalletModal && (
      <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
        <div className="p-6 mx-4 w-full max-w-md bg-white rounded-xl border border-emerald-200 shadow-2xl">
          <h3 className="mb-4 text-lg font-semibold text-emerald-700">الدفع بالمحفظة الإلكترونية</h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="walletProvider">مزود المحفظة الإلكترونية *</Label>
              <select
                id="walletProvider"
                value={mobileWalletProvider}
                onChange={(e) => setMobileWalletProvider(e.target.value as 'vodafone' | 'orange' | 'etisalat' | 'instapay')}
                className="p-3 mt-1 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
                aria-label="اختر مزود المحفظة الإلكترونية"
              >
                <option value="">اختر مزود المحفظة</option>
                <option value="vodafone">فودافون كاش</option>
                <option value="orange">أورنج</option>
                <option value="etisalat">اتصالات</option>
                <option value="instapay">انستا باي</option>
              </select>
            </div>

            <div>
              <Label htmlFor="walletNumber">رقم المحفظة الإلكترونية *</Label>
              <Input
                id="walletNumber"
                type="tel"
                value="01017799580"
                readOnly
                className="mt-1 bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                رقم المحفظة ثابت لجميع الدول
              </p>
            </div>

            <div>
              <Label htmlFor="walletNotes">ملاحظات إضافية</Label>
              <Input
                id="walletNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                className="mt-1"
              />
            </div>

            {/* رفع إيصال المحفظة الإلكترونية */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="mb-3 font-medium text-emerald-700 text-md">رفع إيصال الدفع</h4>

              {!mobileWalletUploadSuccess ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="walletReceiptNumber">رقم الإيصال *</Label>
                    <Input
                      id="walletReceiptNumber"
                      value={mobileWalletReceiptNumber}
                      onChange={(e) => setMobileWalletReceiptNumber(e.target.value)}
                      placeholder="أدخل رقم الإيصال..."
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="walletReceiptFile">ملف الإيصال *</Label>
                    <Input
                      id="walletReceiptFile"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleMobileWalletReceiptFileSelect}
                      className="mt-1"
                      required
                    />
                    {mobileWalletReceipt && (
                      <p className="mt-1 text-sm text-emerald-600">
                        تم اختيار: {mobileWalletReceipt.name}
                      </p>
                    )}
                  </div>

                  {/* شريط التقدم */}
                  {mobileWalletUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>جاري رفع الإيصال...</span>
                        <span>{mobileWalletUploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className={`bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-300 ${
                            mobileWalletUploadProgress === 0 ? 'w-0' :
                            mobileWalletUploadProgress <= 25 ? 'w-1/4' :
                            mobileWalletUploadProgress <= 50 ? 'w-1/2' :
                            mobileWalletUploadProgress <= 75 ? 'w-3/4' : 'w-full'
                          }`}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex gap-2 items-center text-emerald-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">تم رفع الإيصال بنجاح!</span>
                  </div>
                  <p className="mt-2 text-sm text-emerald-600">
                    رقم الإيصال: <span className="font-medium">{mobileWalletReceiptNumber}</span>
                  </p>
                  <p className="text-sm text-emerald-600">
                    سيتم مراجعة الإيصال والتأكيد خلال 24 ساعة
                  </p>
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-emerald-700">المبلغ المطلوب:</span>
                <span className="text-lg font-bold text-emerald-800">{calculateTotalAmount()} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</span>
              </div>
              <p className="text-sm text-emerald-600">
                سيتم إرسال طلب الدفع إلى {mobileWalletProvider} على رقم 01017799580
              </p>
            </div>

            <div className="flex gap-3">
              {!mobileWalletUploadSuccess ? (
                <>
                  <Button
                    onClick={handleMobileWalletReceiptUpload}
                    disabled={!mobileWalletProvider || !mobileWalletReceipt || !mobileWalletReceiptNumber.trim() || mobileWalletUploading}
                    className="flex-1 text-white bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg transition-all duration-300 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl disabled:opacity-50"
                  >
                    {mobileWalletUploading ? 'جاري الرفع...' : 'رفع الإيصال'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMobileWalletModal(false);
                      setRegistrationData(prev => ({ ...prev, paymentMethod: 'later' }));
                      setMobileWalletNumber('');
                      setMobileWalletProvider('');
                      setPaymentNotes('');
                      setMobileWalletReceipt(null);
                      setMobileWalletReceiptNumber('');
                      setMobileWalletReceiptUrl('');
                      setMobileWalletUploadSuccess(false);
                    }}
                    className="flex-1 text-gray-600 border-gray-300 transition-all duration-300 hover:bg-gray-50 hover:border-gray-400"
                  >
                    إلغاء
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setShowMobileWalletModal(false);
                    setMobileWalletNumber('');
                    setMobileWalletProvider('');
                    setPaymentNotes('');
                    setMobileWalletReceipt(null);
                    setMobileWalletReceiptNumber('');
                    setMobileWalletUploadSuccess(false);
                  }}
                  className="w-full text-white bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg transition-all duration-300 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl"
                >
                  إغلاق
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Registered Players Table - Always visible when players are selected */}
    {selectedPlayers.length > 0 && (
      <div className="mt-8 space-y-6">
        {registrationSuccess && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex gap-2 items-center text-green-800">
                <CheckCircle className="w-6 h-6" />
                تم التسجيل بنجاح في البطولة
              </CardTitle>
              <CardDescription className="text-green-700">
                تم تسجيل {selectedPlayers.length} لاعب في البطولة بنجاح
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex gap-2 items-center">
                <Users className="w-5 h-5 text-blue-600" />
                اللاعبين المحددين للتسجيل
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={printRegisteredPlayers}
                  variant="outline"
                  className="flex gap-2 items-center"
                >
                  <Printer className="w-4 h-4" />
                  طباعة التقرير
                </Button>
                {registrationSuccess && (
                  <Button
                    onClick={() => {
                      setRegistrationSuccess(false);
                      setRegisteredPlayers([]);
                      setSelectedPlayers([]);
                      setSelectedTournament(null);
                      setRegistrationData({
                        tournamentId: '',
                        selectedPlayers: [],
                        paymentMethod: 'later',
                        notes: ''
                      });
                    }}
                    variant="outline"
                    className="flex gap-2 items-center"
                  >
                    <Plus className="w-4 h-4" />
                    تسجيل جديد
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedPlayers.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Users className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                <p>لم يتم تحديد أي لاعبين للتسجيل بعد</p>
                <p className="text-sm">يرجى اختيار البطولة واللاعبين من التبويبات أعلاه</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full border-collapse border border-gray-300 min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-3 text-xs font-semibold text-right text-gray-700 border border-gray-300 sm:px-4 sm:text-sm">#</th>
                    <th className="px-2 py-3 text-xs font-semibold text-right text-gray-700 border border-gray-300 sm:px-4 sm:text-sm">اسم اللاعب</th>
                    <th className="hidden px-2 py-3 text-xs font-semibold text-right text-gray-700 border border-gray-300 sm:px-4 sm:text-sm sm:table-cell">المركز</th>
                    <th className="hidden px-2 py-3 text-xs font-semibold text-right text-gray-700 border border-gray-300 sm:px-4 sm:text-sm md:table-cell">تاريخ الميلاد</th>
                    <th className="hidden px-2 py-3 text-xs font-semibold text-right text-gray-700 border border-gray-300 sm:px-4 sm:text-sm lg:table-cell">رقم الهاتف</th>
                    <th className="hidden px-2 py-3 text-xs font-semibold text-right text-gray-700 border border-gray-300 sm:px-4 sm:text-sm lg:table-cell">البريد الإلكتروني</th>
                    <th className="px-2 py-3 text-xs font-semibold text-right text-gray-700 border border-gray-300 sm:px-4 sm:text-sm">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayers.map((player, index) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 text-xs text-center border border-gray-300 sm:px-4 sm:text-sm">{index + 1}</td>
                      <td className="px-2 py-3 border border-gray-300 sm:px-4">
                        <div className="flex gap-2 items-center sm:gap-3">
                          <Avatar className="w-6 h-6 sm:h-8 sm:w-8">
                            <AvatarImage src={getSafeAvatarUrl(player.profile_image || player.avatar)} alt={getPlayerDisplayName(player)} />
                            <AvatarFallback className="text-xs text-blue-600 bg-blue-100">
                              {getPlayerDisplayName(player).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium sm:text-sm">{getPlayerDisplayName(player)}</span>
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 text-xs border border-gray-300 sm:px-4 sm:text-sm sm:table-cell">{player.primary_position || player.position || 'غير محدد'}</td>
                      <td className="hidden px-2 py-3 text-xs border border-gray-300 sm:px-4 sm:text-sm md:table-cell">{formatBirthDate(player.birth_date)}</td>
                      <td className="hidden px-2 py-3 text-xs border border-gray-300 sm:px-4 sm:text-sm lg:table-cell">{player.phone || 'غير محدد'}</td>
                      <td className="hidden px-2 py-3 text-xs border border-gray-300 sm:px-4 sm:text-sm lg:table-cell">{player.email || 'غير محدد'}</td>
                      <td className="px-2 py-3 border border-gray-300 sm:px-4">
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPlayer(player)}
                            className="p-0 w-6 h-6 sm:h-8 sm:w-8 hover:bg-blue-100"
                          >
                            <Edit className="w-3 h-3 text-blue-600 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePlayerSelection(player)}
                            className="p-0 w-6 h-6 sm:h-8 sm:w-8 hover:bg-red-100"
                          >
                            <span className="text-xs text-red-600">×</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="p-4 mt-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedPlayers.length}</div>
                  <div className="text-sm text-blue-700">عدد اللاعبين</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedTournament?.entryFee || 0} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</div>
                  <div className="text-sm text-blue-700">رسوم التسجيل للاعب</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{calculateTotalAmount()} {getCurrencySymbol(selectedTournament?.currency || 'EGP')}</div>
                  <div className="text-sm text-blue-700">المجموع الكلي</div>
                </div>
              </div>
            </div>
                </>
              )}
          </CardContent>
        </Card>
      </div>
    )}

    {/* Edit Player Modal */}
    {showEditModal && editingPlayer && (
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center">
              <Edit className="w-5 h-5 text-blue-600" />
              تعديل بيانات اللاعب
            </DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات اللاعب: {editingPlayer.full_name || editingPlayer.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <Label htmlFor="editName">اسم اللاعب</Label>
                <Input
                  id="editName"
                  value={editingPlayer.full_name || editingPlayer.name}
                  onChange={(e) => setEditingPlayer(prev => prev ? {
                    ...prev,
                    full_name: e.target.value,
                    name: e.target.value
                  } : null)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="editPosition">المركز</Label>
                <Input
                  id="editPosition"
                  list="positions"
                  value={editingPlayer.primary_position || editingPlayer.position || ''}
                  onChange={(e) => setEditingPlayer(prev => prev ? {
                    ...prev,
                    primary_position: e.target.value,
                    position: e.target.value
                  } : null)}
                  className="mt-1"
                  placeholder="اختر أو اكتب المركز"
                />
                <datalist id="positions">
                  {POSITIONS.map((position) => (
                    <option key={position} value={position} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="editBirthDate">تاريخ الميلاد</Label>
                <Input
                  id="editBirthDate"
                  type="date"
                  value={editingPlayer.birth_date ? (typeof editingPlayer.birth_date === 'string' ? editingPlayer.birth_date.split('T')[0] : new Date(editingPlayer.birth_date).toISOString().split('T')[0]) : ''}
                  onChange={(e) => setEditingPlayer(prev => prev ? {
                    ...prev,
                    birth_date: e.target.value
                  } : null)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="editPhone">رقم الهاتف</Label>
                <Input
                  id="editPhone"
                  value={editingPlayer.phone || ''}
                  onChange={(e) => setEditingPlayer(prev => prev ? {
                    ...prev,
                    phone: e.target.value
                  } : null)}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="editEmail">البريد الإلكتروني</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingPlayer.email || ''}
                  onChange={(e) => setEditingPlayer(prev => prev ? {
                    ...prev,
                    email: e.target.value
                  } : null)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPlayer(null);
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (editingPlayer) {
                    updateRegisteredPlayer(editingPlayer);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}

      {/* Duplicate Players Warning Modal */}
      <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <DialogContent className="mx-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تحذير: لاعبين مسجلين مسبقاً
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              اللاعبين التاليين مسجلين بالفعل في هذه البطولة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Duplicate Players List */}
            <div className="space-y-3">
              {duplicatePlayers.map((player) => (
                <div key={player.id} className="flex gap-3 items-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={getSafeAvatarUrl(player.avatar || player.profile_image)} />
                    <AvatarFallback className="text-red-600 bg-red-100">
                      {getPlayerDisplayName(player).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900">
                      {getPlayerDisplayName(player)}
                    </h4>
                    <p className="text-sm text-red-700">
                      {player.primary_position || player.position}
                    </p>
                  </div>
                  <div className="text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Warning Message */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="mb-1 font-semibold text-yellow-800">تنبيه مهم</h4>
                  <p className="text-sm text-yellow-700">
                    لا يمكن تسجيل لاعبين مسجلين مسبقاً في نفس البطولة.
                    يرجى إزالة هؤلاء اللاعبين من القائمة أو اختيار بطولة أخرى.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDuplicateWarning(false)}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              إغلاق
            </Button>
            <Button
              onClick={() => {
                // Remove duplicate players from selection
                const duplicateIds = duplicatePlayers.map(p => p.id);
                setSelectedPlayers(prev => prev.filter(p => !duplicateIds.includes(p.id)));
                setShowDuplicateWarning(false);
                toast.success('تم إزالة اللاعبين المكررين من القائمة');
              }}
              className="text-white bg-red-600 hover:bg-red-700"
            >
              إزالة من القائمة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </ResponsiveLayoutWrapper>
  );
}


