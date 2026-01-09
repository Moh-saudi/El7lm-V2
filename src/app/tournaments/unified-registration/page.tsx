'use client';

import GeideaPaymentModal from '@/components/GeideaPaymentModal';
import ResponsiveLayoutWrapper from '@/components/layout/ResponsiveLayout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { Player } from '@/types/player';
import { Tournament } from '@/types/tournament';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';
import { addDoc, collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Copy,
  CreditCard,
  MapPin,
  Trophy,
  Users,
  Wallet,
  Clock,
  DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Custom Scrollbar Styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

// Helper Functions
const calculateAge = (birthDate: string | Date | null): number | null => {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch { return null; }
};

const getCurrencySymbol = (currency: string = 'EGP'): string => {
  const symbols: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'USD': '$', 'EUR': '€' };
  return symbols[currency] || currency;
};

const getSafeAvatarUrl = (avatar: any): string | undefined => {
  if (!avatar) return undefined;
  let url: string | undefined;
  if (typeof avatar === 'string') url = avatar.trim() || undefined;
  else if (typeof avatar === 'object' && avatar !== null && 'url' in avatar) url = avatar.url?.trim();

  if (!url) return undefined;

  // First try the imported utility
  let fixed = fixReceiptUrl(url);

  // Double check: if it still contains supabase.co, force fix it locally
  if (fixed && fixed.includes('supabase.co')) {
    console.warn('⚠️ getSafeAvatarUrl: fixReceiptUrl returned a Supabase URL, applying local fix:', fixed);
    const parts = fixed.split('/object/public/');
    if (parts.length > 1) {
      fixed = `https://assets.el7lm.com/${parts[1]}`;
    }
  }

  return fixed || undefined;
};

const getPlayerDisplayName = (player: any): string => {
  return player?.full_name || player?.name || 'لاعب غير محدد';
};

export default function UnifiedTournamentRegistrationPage() {
  const router = useRouter();
  const { user, userData } = useAuth();

  // Steps: 1 = Tournament Selection, 2 = Player Selection, 3 = Review & Payment
  const [currentStep, setCurrentStep] = useState(1);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [paidPlayerIds, setPaidPlayerIds] = useState<Set<string>>(new Set());

  const [paymentMethod, setPaymentMethod] = useState('later');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tournament Filter: 'current', 'upcoming', 'past'
  const [tournamentFilter, setTournamentFilter] = useState<'current' | 'upcoming' | 'past'>('current');

  // Payment Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletProvider, setWalletProvider] = useState('');
  const [walletReceipt, setWalletReceipt] = useState<File | null>(null);
  const [walletReceiptNumber, setWalletReceiptNumber] = useState('');
  const [walletUploading, setWalletUploading] = useState(false);

  // Track which tournaments user is registered in with their status
  const [registeredTournamentsMap, setRegisteredTournamentsMap] = useState<Map<string, string>>(new Map());

  // Payment Settings from Firebase
  const [paymentSettings, setPaymentSettings] = useState<any>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Fetch Payment Settings based on tournament country (not user country)
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      if (!selectedTournament) {
        console.log('[Payment Settings] No tournament selected yet');
        setPaymentMethods([]);
        return;
      }

      const country = selectedTournament.country || selectedTournament.location_country || 'EG';
      console.log('[Payment Settings] Tournament data:', { country, tournamentName: selectedTournament.name });

      try {
        const docRef = doc(db, 'payment_settings', country);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const settings = docSnap.data();
          setPaymentSettings(settings);

          // Build methods list from settings
          const methods = settings.methods || [];
          setPaymentMethods(methods);

          console.log(`[Payment Settings] ✅ Loaded from Firebase for ${country}:`, methods);
        } else {
          console.log(`[Payment Settings] ⚠️ No Firebase settings found for ${country}, using defaults`);

          // Set default fallback methods based on country
          const defaultMethods: any[] = [];

          if (country === 'EG' || country === 'Egypt' || country === 'مصر') {
            defaultMethods.push(
              { id: 'vodafone_cash', name: 'فودافون كاش', enabled: true, accountNumber: '01017799580' },
              { id: 'instapay', name: 'انستاباي', enabled: true, accountNumber: '01017799580' }
            );
          } else if (country === 'SA' || country === 'Saudi Arabia' || country === 'السعودية') {
            defaultMethods.push(
              { id: 'stc_pay', name: 'STC Pay', enabled: true, accountNumber: '0505149446' }
            );
          } else if (country === 'QA' || country === 'Qatar' || country === 'قطر') {
            defaultMethods.push(
              { id: 'fawran', name: 'خدمة فورا', enabled: true, accountNumber: '70900058' }
            );
          } else {
            // Generic fallback for unknown countries
            console.log(`[Payment Settings] Unknown country: ${country}, using Egypt defaults`);
            defaultMethods.push(
              { id: 'vodafone_cash', name: 'فودافون كاش', enabled: true, accountNumber: '01017799580' },
              { id: 'instapay', name: 'انستاباي', enabled: true, accountNumber: '01017799580' }
            );
          }

          setPaymentSettings({});
          setPaymentMethods(defaultMethods);
          console.log(`[Payment Settings] ✅ Using fallback methods for ${country}:`, defaultMethods);
        }
      } catch (error) {
        console.error('[Payment Settings] ❌ Error fetching:', error);
      }
    };

    fetchPaymentSettings();
  }, [selectedTournament]); // Changed from userData to selectedTournament

  // Fetch Tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const q = query(collection(db, 'tournaments'), where('isActive', '==', true));
        const sn = await getDocs(q);
        let list = sn.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
        list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTournaments(list.filter(t => t.isActive !== false));
      } catch (e) {
        console.error("Error fetching tournaments", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  // Filter tournaments by date
  const filteredTournaments = tournaments.filter(t => {
    const now = new Date();
    const startDate = t.startDate ? new Date(t.startDate) : null;
    const endDate = t.endDate ? new Date(t.endDate) : null;

    if (tournamentFilter === 'current') {
      // Current: startDate <= now <= endDate OR no dates set
      if (!startDate && !endDate) return true;
      if (startDate && endDate) {
        return startDate <= now && now <= endDate;
      }
      if (startDate) return startDate <= now;
      return true;
    }

    if (tournamentFilter === 'upcoming') {
      // Upcoming: startDate > now
      if (!startDate) return false;
      return startDate > now;
    }

    if (tournamentFilter === 'past') {
      // Past: endDate < now
      if (!endDate) return false;
      return endDate < now;
    }

    return true;
  });

  // Fetch Players
  useEffect(() => {
    if (!user || !userData) return;

    const fetchPlayers = async () => {
      try {
        const accountType = userData.accountType;
        let players: Player[] = [];

        if (accountType === 'player') {
          // If account is a player, try multiple approaches to find their data
          console.log('[Player Fetch] Searching for player with user.uid:', user.uid);

          // Approach 1: Document ID matches user.uid
          const playerDoc = await getDoc(doc(db, 'players', user.uid));
          if (playerDoc.exists()) {
            console.log('[Player Fetch] Found player by document ID');
            players = [{ id: playerDoc.id, ...playerDoc.data() } as Player];
          } else {
            console.log('[Player Fetch] Document ID not found, trying queries...');

            // Approach 2: Try multiple field names that might contain user ID
            const queries = [
              query(collection(db, 'players'), where('user_id', '==', user.uid)),
              query(collection(db, 'players'), where('userId', '==', user.uid)),
              query(collection(db, 'players'), where('uid', '==', user.uid)),
              query(collection(db, 'players'), where('created_by', '==', user.uid))
            ];

            for (const q of queries) {
              try {
                const sn = await getDocs(q);
                if (sn.docs.length > 0) {
                  console.log(`[Player Fetch] Found ${sn.docs.length} player(s) via query`);
                  players = sn.docs.map(d => ({ id: d.id, ...d.data() } as Player));
                  break;
                }
              } catch (error) {
                // Ignore query errors (index might not exist)
                console.log('[Player Fetch] Query failed (might need index), trying next...');
              }
            }
          }

          if (players.length === 0) {
            console.warn('[Player Fetch] No player data found for user:', user.uid);
          }
        } else {
          // For organizations (academy, club, agent, etc.), fetch managed players
          console.log('[Player Fetch] Fetching managed players for organization:', accountType);

          const queries = [
            query(collection(db, 'players'), where('organization_id', '==', user.uid)),
            query(collection(db, 'players'), where('managed_by', '==', user.uid)),
            query(collection(db, 'players'), where('academy_id', '==', user.uid)),
            query(collection(db, 'players'), where('club_id', '==', user.uid))
          ];

          const results = await Promise.all(queries.map(q => getDocs(q).catch(() => null)));
          const allPlayerDocs = results.flatMap(sn => sn?.docs || []);

          // Remove duplicates by ID
          const uniquePlayers = new Map<string, Player>();
          allPlayerDocs.forEach(doc => {
            if (!uniquePlayers.has(doc.id)) {
              uniquePlayers.set(doc.id, { id: doc.id, ...doc.data() } as Player);
            }
          });

          players = Array.from(uniquePlayers.values());
        }

        console.log(`[Tournament Registration] Fetched ${players.length} players for account type: ${accountType}`);
        setAvailablePlayers(players);
      } catch (e) {
        console.error('Error fetching players:', e);
        toast.error('حدث خطأ أثناء جلب بيانات اللاعبين');
      }
    };

    fetchPlayers();
  }, [user, userData]);

  // Check Paid Players for Selected Tournament
  useEffect(() => {
    if (!selectedTournament || !user) {
      setPaidPlayerIds(new Set());
      return;
    }
    const checkHistory = async () => {
      try {
        const q = query(
          collection(db, 'tournament_registrations'),
          where('tournamentId', '==', selectedTournament.id),
          where('userId', '==', user.uid)
        );
        const sn = await getDocs(q);
        const paidIds = new Set<string>();
        sn.docs.forEach(d => {
          const data = d.data();
          // Include all registration statuses to prevent duplicate registrations
          if (data.status === 'paid' || data.status === 'approved' || data.status === 'pending_review' || data.status === 'pending') {
            data.players?.forEach((p: any) => paidIds.add(p.id));
          }
        });
        setPaidPlayerIds(paidIds);
      } catch (e) { console.error(e); }
    };
    checkHistory();
  }, [selectedTournament, user]);

  // Track which tournaments user is registered in
  useEffect(() => {
    if (!user) {
      setRegisteredTournamentsMap(new Map());
      return;
    }
    const fetchRegistrations = async () => {
      try {
        const q = query(collection(db, 'tournament_registrations'), where('userId', '==', user.uid));
        const sn = await getDocs(q);
        const tournamentsWithStatus = new Map<string, string>();
        sn.docs.forEach(d => {
          const data = d.data();
          // Include all registration statuses
          if (data.status === 'paid' || data.status === 'approved' || data.status === 'pending_review' || data.status === 'pending') {
            tournamentsWithStatus.set(data.tournamentId, data.status);
          }
        });
        setRegisteredTournamentsMap(tournamentsWithStatus);
        console.log('[Registered Tournaments]', Array.from(tournamentsWithStatus.entries()));
      } catch (e) { console.error(e); }
    };
    fetchRegistrations();
  }, [user]);

  const calculateTotal = () => {
    if (!selectedTournament) return 0;
    return (selectedTournament.entryFee || 0) * selectedPlayers.length;
  };

  const togglePlayer = (player: Player) => {
    if (paidPlayerIds.has(player.id)) return;
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTournament || !user || selectedPlayers.length === 0) return;

    // Check duplicates
    const duplicates = selectedPlayers.filter(p => paidPlayerIds.has(p.id));
    if (duplicates.length > 0) {
      toast.error(`اللاعبين التاليين مسجلين مسبقاً: ${duplicates.map(getPlayerDisplayName).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const total = calculateTotal();

      if (paymentMethod === 'card' && total > 0) {
        setShowPaymentModal(true);
        setSubmitting(false);
        return;
      }

      // Check if payment method is a wallet (vodafone_cash, stc_pay, fawran, instapay)
      const walletMethods = ['vodafone_cash', 'stc_pay', 'fawran', 'instapay', 'mobile_wallet'];
      if (walletMethods.includes(paymentMethod) && total > 0) {
        setShowWalletModal(true);
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'tournament_registrations'), {
        tournamentId: selectedTournament.id,
        userId: user.uid,
        players: selectedPlayers,
        totalAmount: total,
        currency: selectedTournament.currency || 'EGP',
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod,
        createdAt: Timestamp.now()
      });

      toast.success('تم التسجيل بنجاح! سيتم مراجعة طلبك قريباً');
      setSelectedPlayers([]);
      setCurrentStep(1);
      setSelectedTournament(null);
    } catch (e) {
      toast.error('حدث خطأ أثناء التسجيل');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (details: any) => {
    if (!selectedTournament || !user) return;
    try {
      await addDoc(collection(db, 'tournament_registrations'), {
        tournamentId: selectedTournament.id,
        userId: user.uid,
        players: selectedPlayers,
        totalAmount: calculateTotal(),
        currency: selectedTournament.currency || 'EGP',
        status: 'paid',
        paymentStatus: 'paid',
        paymentMethod: 'card',
        transactionId: details.id,
        createdAt: Timestamp.now()
      });
      setShowPaymentModal(false);
      toast.success('تم الدفع والتسجيل بنجاح!');
      setSelectedPlayers([]);
      setCurrentStep(1);
      setSelectedTournament(null);
    } catch (e) {
      toast.error('حدث خطأ');
    }
  };

  const handleWalletUpload = async () => {
    if (!walletReceipt || !selectedTournament || !user) return;
    setWalletUploading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      await addDoc(collection(db, 'tournament_registrations'), {
        tournamentId: selectedTournament.id,
        userId: user.uid,
        players: selectedPlayers,
        totalAmount: calculateTotal(),
        currency: selectedTournament.currency || 'EGP',
        status: 'pending_review',
        paymentStatus: 'review',
        paymentMethod: paymentMethod, // Save actual method (vodafone_cash, stc_pay, etc)
        walletProvider,
        receiptNumber: walletReceiptNumber,
        createdAt: Timestamp.now()
      });

      // Update registered tournaments map immediately
      if (selectedTournament) {
        setRegisteredTournamentsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedTournament.id, 'pending_review');
          return newMap;
        });
      }

      setShowWalletModal(false);
      toast.success('تم رفع الإيصال بنجاح! سيتم مراجعته قريباً');
      setSelectedPlayers([]);
      setCurrentStep(1);
      setSelectedTournament(null);
      setWalletReceipt(null);
      setWalletReceiptNumber('');
    } catch (e) {
      toast.error('حدث خطأ');
    } finally {
      setWalletUploading(false);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <ResponsiveLayoutWrapper
      accountType={userData?.accountType || 'player'}
      showSidebar={true}
      showHeader={true}
    >
      <style>{scrollbarStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">

          {/* Progress Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">تسجيل في بطولة</h1>
              <Badge variant="outline" className="text-sm">
                الخطوة {currentStep} من 3
              </Badge>
            </div>
            <Progress value={progress} className="h-2 bg-gray-200" />
            <div className="flex justify-between mt-2 text-xs sm:text-sm text-gray-600">
              <span className={currentStep >= 1 ? 'text-blue-600 font-semibold' : ''}>اختر البطولة</span>
              <span className={currentStep >= 2 ? 'text-blue-600 font-semibold' : ''}>اختر اللاعبين</span>
              <span className={currentStep >= 3 ? 'text-blue-600 font-semibold' : ''}>راجع وادفع</span>
            </div>
          </div>

          {/* Step 1: Tournament Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Card className="border-2 border-blue-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                    اختر البطولة
                  </CardTitle>
                  <CardDescription className="text-blue-100">اختر البطولة التي تريد التسجيل فيها</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {/* Filter Tabs */}
                  <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                    {[
                      {
                        id: 'current', label: 'جارية', count: tournaments.filter(t => {
                          const now = new Date();
                          const start = t.startDate ? new Date(t.startDate) : null;
                          const end = t.endDate ? new Date(t.endDate) : null;
                          if (!start && !end) return true;
                          if (start && end) return start <= now && now <= end;
                          if (start) return start <= now;
                          return true;
                        }).length
                      },
                      {
                        id: 'upcoming', label: 'قادمة', count: tournaments.filter(t => {
                          const start = t.startDate ? new Date(t.startDate) : null;
                          return start && start > new Date();
                        }).length
                      },
                      {
                        id: 'past', label: 'سابقة', count: tournaments.filter(t => {
                          const end = t.endDate ? new Date(t.endDate) : null;
                          return end && end < new Date();
                        }).length
                      }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setTournamentFilter(tab.id as any)}
                        className={`
                          flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all
                          ${tournamentFilter === tab.id
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                          }
                        `}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">جاري تحميل البطولات...</p>
                    </div>
                  ) : filteredTournaments.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {tournamentFilter === 'current' && 'لا توجد بطولات جارية حالياً'}
                        {tournamentFilter === 'upcoming' && 'لا توجد بطولات قادمة'}
                        {tournamentFilter === 'past' && 'لا توجد بطولات سابقة'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      {filteredTournaments.map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTournament(t);
                            setCurrentStep(2);
                          }}
                          className={`
                            p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all
                            ${selectedTournament?.id === t.id
                              ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                              : 'border-gray-200 hover:border-blue-300 hover:shadow-md bg-white'
                            }
                          `}
                        >
                          <div className="flex gap-4 items-start">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-white shadow-md">
                              {t.logo ? (
                                <img src={getSafeAvatarUrl(t.logo)} alt={t.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                                  <Trophy className="w-8 h-8 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2 break-words">{t.name}</h3>
                              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                                {t.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span className="truncate max-w-[150px]">{t.location}</span>
                                  </div>
                                )}
                                {t.startDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span>{new Date(t.startDate).toLocaleDateString('ar-EG')}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 font-semibold text-green-600">
                                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span>{t.entryFee || 0} {getCurrencySymbol(t.currency)}</span>
                                </div>
                              </div>
                            </div>
                            {(() => {
                              const status = registeredTournamentsMap.get(t.id);
                              if (!status) return null;

                              const isPending = status === 'pending' || status === 'pending_review';

                              return (
                                <div className="mt-2">
                                  <Badge className={isPending
                                    ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                    : "bg-green-100 text-green-700 border-green-300"
                                  }>
                                    {isPending ? (
                                      <Clock className="w-3 h-3 mr-1" />
                                    ) : (
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                    )}
                                    {isPending ? 'قيد المراجعة' : 'مسجل'}
                                  </Badge>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Player Selection */}
          {currentStep === 2 && selectedTournament && (
            <div className="space-y-4">
              <Card className="border-2 border-green-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                    اختر اللاعبين
                  </CardTitle>
                  <CardDescription className="text-green-100">
                    البطولة: {selectedTournament.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {!user ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">يجب تسجيل الدخول للمتابعة</p>
                      <Button onClick={() => router.push('/auth/login')} size="lg">تسجيل الدخول</Button>
                    </div>
                  ) : availablePlayers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      {userData?.accountType === 'player' ? (
                        <>
                          <p className="text-gray-600 mb-4">لم يتم العثور على ملفك الشخصي كلاعب</p>
                          <Button onClick={() => router.push('/dashboard/player/profile')} variant="outline">أكمل ملفك الشخصي</Button>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 mb-4">لا يوجد لاعبين مسجلين تحت إدارتك</p>
                          <Button onClick={() => router.push('/dashboard/players')} variant="outline">إضافة لاعبين</Button>
                        </>
                      )}
                    </div>
                  ) : (() => {
                    // Check if all players are already registered
                    const allPlayersRegistered = availablePlayers.every(p => paidPlayerIds.has(p.id));

                    if (allPlayersRegistered) {
                      // Get the status of this tournament
                      const tournamentStatus = selectedTournament ? registeredTournamentsMap.get(selectedTournament.id) : null;
                      const isPending = tournamentStatus === 'pending' || tournamentStatus === 'pending_review';

                      return (
                        <div className="text-center py-12">
                          {isPending ? (
                            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                          ) : (
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                          )}
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {isPending ? 'طلبك قيد المراجعة' : 'تم التسجيل بنجاح!'}
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {isPending ? (
                              tournamentStatus === 'pending_review'
                                ? 'تم رفع إيصال الدفع وننتظر تأكيد الإدارة'
                                : 'طلبك معلق بانتظار اكتمال الدفع'
                            ) : (
                              availablePlayers.length === 1
                                ? 'لقد قمت بالتسجيل في هذه البطولة مسبقاً'
                                : 'جميع اللاعبين مسجلين في هذه البطولة مسبقاً'
                            )}
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button
                              onClick={() => setCurrentStep(1)}
                              variant="outline"
                            >
                              اختر بطولة أخرى
                            </Button>
                            <Button
                              onClick={() => router.push('/dashboard/tournaments')}
                              className={isPending ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}
                            >
                              عرض بطولاتي
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>{selectedPlayers.length}</strong> لاعب محدد •
                            رسوم التسجيل: <strong>{calculateTotal()} {getCurrencySymbol(selectedTournament.currency)}</strong>
                          </p>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto space-y-2 custom-scrollbar">
                          {availablePlayers.map(player => {
                            const isSelected = selectedPlayers.some(p => p.id === player.id);
                            const isPaid = paidPlayerIds.has(player.id);
                            return (
                              <div
                                key={player.id}
                                onClick={() => !isPaid && togglePlayer(player)}
                                className={`
                                flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all
                                ${isPaid
                                    ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-green-50 border-green-600 cursor-pointer'
                                      : 'bg-white border-gray-200 hover:border-green-300 cursor-pointer hover:shadow-md'
                                  }
                              `}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isPaid}
                                  className="w-5 h-5 sm:w-6 sm:h-6"
                                />
                                <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-white shadow-sm">
                                  <AvatarImage src={getSafeAvatarUrl(player.profile_image || player.avatar)} />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                    {getPlayerDisplayName(player).charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-sm sm:text-base text-gray-900 truncate">{getPlayerDisplayName(player)}</h4>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    {player.primary_position || 'غير محدد'} • {calculateAge(player.birth_date) || '-'} سنة
                                  </p>
                                </div>
                                {isPaid && (
                                  <Badge variant="outline" className="bg-gray-200 text-gray-700 border-gray-400">
                                    مسجل
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 h-12 text-base"
                >
                  <ArrowRight className="w-5 h-5 ml-2" />
                  السابق
                </Button>
                <Button
                  onClick={() => {
                    if (selectedPlayers.length === 0) {
                      toast.error('يرجى اختيار لاعب واحد على الأقل');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  className="flex-1 h-12 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  disabled={selectedPlayers.length === 0}
                >
                  التالي
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Payment */}
          {currentStep === 3 && selectedTournament && (
            <div className="space-y-4">
              <Card className="border-2 border-purple-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    مراجعة التسجيل
                  </CardTitle>
                  <CardDescription className="text-purple-100">تأكد من البيانات قبل التأكيد</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">

                  {/* Tournament Summary */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-sm text-gray-600 mb-2">البطولة</h3>
                    <p className="font-bold text-base sm:text-lg text-gray-900">{selectedTournament.name}</p>
                  </div>

                  {/* Players List */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-600 mb-3">اللاعبين المحددين ({selectedPlayers.length})</h3>
                    <div className="space-y-2">
                      {selectedPlayers.map(player => (
                        <div key={player.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={getSafeAvatarUrl(player.profile_image || player.avatar)} />
                            <AvatarFallback>{getPlayerDisplayName(player).charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900">{getPlayerDisplayName(player)}</p>
                            <p className="text-xs text-gray-500">{player.primary_position}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white">
                    <div className="flex justify-between items-center">
                      <span className="text-base sm:text-lg">الإجمالي</span>
                      <span className="text-2xl sm:text-3xl font-bold">{calculateTotal()} {getCurrencySymbol(selectedTournament.currency)}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-600 mb-3">طريقة الدفع</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(() => {
                        const methods: any[] = [];

                        // Always add card and later options
                        methods.push(
                          { id: 'later', label: 'دفع لاحقاً', icon: Clock },
                          { id: 'card', label: 'بطاقة بنكية', icon: CreditCard }
                        );

                        // Custom Tournament Wallet
                        if (selectedTournament.walletName && selectedTournament.walletNumber) {
                          methods.push({
                            id: 'tournament_wallet',
                            label: selectedTournament.walletName,
                            icon: Wallet,
                            number: selectedTournament.walletNumber,
                            isTournamentSpecific: true
                          });
                        }

                        // Add wallet methods from settings (already includes fallback from useEffect)
                        // Only add if NO tournament specific wallet is present, OR just append them?
                        // Let's append them for flexibility, but prioritize tournament one visually if needed.
                        paymentMethods.forEach(method => {
                          if (method.enabled !== false && method.id !== 'geidea' && method.id !== 'bank_transfer') {
                            // Avoid adding duplicate wallets if they match the tournament one roughly (optional check)
                            methods.push({
                              id: method.id,
                              label: method.name || method.id,
                              icon: Wallet,
                              number: method.accountNumber || method.details
                            });
                          }
                        });

                        methods.push({ id: 'office', label: 'في المكتب', icon: DollarSign });

                        return methods.map(method => (
                          <div
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`
                              p-4 rounded-xl border-2 cursor-pointer transition-all text-center
                              ${paymentMethod === method.id
                                ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600'
                                : 'border-gray-200 hover:border-purple-300 bg-white'
                              }
                            `}
                          >
                            <method.icon className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === method.id ? 'text-purple-600' : 'text-gray-400'}`} />
                            <p className="text-xs sm:text-sm font-medium text-gray-700">{method.label}</p>

                            {/* Wallet Number with Copy Button */}
                            {method.number && paymentMethod === method.id && (
                              <div className="mt-3 space-y-1">
                                <p className="text-[10px] text-gray-500 font-bold">رقم المحفظة:</p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 text-sm font-black text-purple-700 bg-white border-2 border-dashed border-purple-200 px-2 py-1 rounded-lg tracking-wider text-center select-all shadow-sm">
                                    {method.number}
                                  </code>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(method.number);
                                      toast.success('تم نسخ الرقم');
                                    }}
                                    className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-purple-600 hover:border-purple-300 hover:shadow-md transition-all"
                                    title="نسخ الرقم"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 h-12 text-base"
                >
                  <ArrowRight className="w-5 h-5 ml-2" />
                  السابق
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2"></div>
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 ml-2" />
                      تأكيد التسجيل
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <GeideaPaymentModal
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={() => toast.error('فشلت عملية الدفع')}
        amount={calculateTotal()}
        currency="EGP"
        title={`دفع البطولة - ${selectedTournament?.name}`}
        description={`رسوم تسجيل ${selectedPlayers.length} لاعبين`}
        customerEmail={user?.email || userData?.email || ''}
        merchantReferenceId={`REG_${selectedTournament?.id}_${Date.now()}`}
      />

      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
              <CardTitle className="text-lg">الدفع بالمحفظة الإلكترونية</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>مزود الخدمة</Label>
                <select className="w-full border rounded p-2 mt-1" value={walletProvider} onChange={e => setWalletProvider(e.target.value)}>
                  <option value="">اختر المزود</option>
                  {paymentMethods
                    .filter(m => m.enabled !== false && m.id !== 'geidea' && m.id !== 'bank_transfer')
                    .map(method => (
                      <option key={method.id} value={method.id}>{method.name}</option>
                    ))
                  }
                </select>
              </div>
              <div>
                <Label>رقم التحويل</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={(() => {
                      const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
                      return selectedMethod?.accountNumber || selectedMethod?.details || '';
                    })()}
                    readOnly
                    className="bg-gray-100 text-center font-mono flex-1"
                  />
                  <button
                    onClick={() => {
                      const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
                      const number = selectedMethod?.accountNumber || selectedMethod?.details || '';
                      if (number) {
                        navigator.clipboard.writeText(number);
                        toast.success('تم نسخ الرقم');
                      }
                    }}
                    className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-emerald-600 hover:border-emerald-300 hover:shadow-md transition-all"
                    title="نسخ الرقم"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <Label>رقم الإيصال</Label>
                <Input value={walletReceiptNumber} onChange={e => setWalletReceiptNumber(e.target.value)} placeholder="رقم العملية" className="mt-1" />
              </div>
              <div>
                <Label>صورة الإيصال</Label>
                <Input type="file" onChange={e => e.target.files && setWalletReceipt(e.target.files[0])} className="mt-1" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleWalletUpload} disabled={walletUploading || !walletReceipt}>
                  {walletUploading ? 'جاري الرفع...' : 'تأكيد'}
                </Button>
                <Button variant="outline" onClick={() => setShowWalletModal(false)}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ResponsiveLayoutWrapper>
  );
}
