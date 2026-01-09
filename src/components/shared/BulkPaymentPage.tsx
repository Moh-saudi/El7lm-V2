'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Users, Crown, Shield, Star, Gift, Zap, Trophy,
  CreditCard, Check, ArrowLeft, Globe, Search, ChevronDown, ChevronUp, Copy, CheckCircle, Wallet, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/lib/firebase/auth-provider';
import GeideaPaymentModal from '@/components/GeideaPaymentModal';
import { getCurrencyRates, convertCurrency as convertCurrencyLib, getCurrencyInfo, forceUpdateRates } from '@/lib/currency-rates';
import { PricingService } from '@/lib/pricing/pricing-service';
import { COUNTRIES } from '@/constants/countries';
import { SubscriptionPlan } from '@/types/pricing';

import { db } from '@/lib/firebase/config';
import { doc, updateDoc, setDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Extend Window interface
declare global {
  interface Window {
    convertedAmountForGeidea?: number;
  }
}

// Add getDoc to imports if not present (handled by multi_replace logic usually, but here manually ensuring)
import { getDoc } from 'firebase/firestore';

// Types
interface BulkPaymentPageProps {
  accountType: 'club' | 'academy' | 'trainer' | 'agent' | 'player';
}

interface PlayerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  currentSubscription: {
    status: 'active' | 'expired' | 'none';
    endDate?: Date;
    packageType?: string;
  };
  selected: boolean;
  selectedPackage: string;
}

const SUPPORTED_COUNTRIES = COUNTRIES.reduce((acc, c) => ({
  ...acc,
  [c.code]: { name: c.name, currency: c.currency, flag: c.flag }
}), {} as Record<string, any>);

const DEFAULT_PAYMENT_METHODS = {
  global: [
    { id: 'geidea', name: 'بطاقة بنكية', icon: '💳', description: 'ماستركارد، فيزا، مدى', discount: 0, popular: true },
    { id: 'paypal', name: 'PayPal', icon: '💙', description: 'دفع آمن عالمياً', discount: 0, popular: true },
    { id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏦', description: 'دفع آمن ومضمون', discount: 0, popular: false }
  ],
  SA: [
    { id: 'geidea', name: 'بطاقة بنكية', icon: '💳', description: 'مدى، فيزا، ماستركارد', discount: 0, popular: true },
    { id: 'stc_pay', name: 'STC Pay', icon: '📱', description: 'دفع آمن وسريع', discount: 0, popular: true },
    { id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏦', description: 'دفع آمن ومضمون', discount: 0, popular: false }
  ],
  QA: [
    { id: 'geidea', name: 'بطاقة بنكية', icon: '💳', description: 'Visa, MasterCard, NAPS', discount: 0, popular: true },
    { id: 'fawran', name: 'خدمة فورا', icon: '⚡', description: 'تحويل فوري برقم الجوال', discount: 0, popular: true, details: '70900058' },
    { id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏦', description: 'تحويل مباشر للحساب', discount: 0, popular: false }
  ],
  EG: [
    { id: 'geidea', name: 'بطاقة بنكية', icon: '💳', description: 'ماستركارد، فيزا، مدى', discount: 0, popular: true },
    { id: 'vodafone_cash', name: 'فودافون كاش', icon: '📱', description: 'دفع آمن وسريع', discount: 0, popular: true },
    { id: 'etisalat_cash', name: 'اتصالات كاش', icon: '💰', description: 'دفع آمن وسريع', discount: 0, popular: false },
    { id: 'instapay', name: 'انستاباي', icon: '⚡', description: 'دفع آمن وسريع', discount: 0, popular: true },
    { id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏦', description: 'دفع آمن ومضمون', discount: 0, popular: false }
  ]
};

interface Partner {
  id: string;
  partnerName: string;
  partnerCode: string;
  customPricing: {
    monthly?: number;
    quarterly?: number;
    yearly?: number;
  };
  isActive?: boolean;
  status?: string;
}

export default function BulkPaymentPage({ accountType }: BulkPaymentPageProps) {
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [selectedPackage, setSelectedPackage] = useState('subscription_6months');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('geidea');
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGeideaModal, setShowGeideaModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'none' | 'expired' | 'active' | 'upgrade'>('all');

  // Country & Currency
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [currencyRates, setCurrencyRates] = useState<any>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // UI State
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Data
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [appliedOffer, setAppliedOffer] = useState<any | null>(null);

  // Promo Code
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoCodeError, setPromoCodeError] = useState<string>('');
  const [promoCodeSuccess, setPromoCodeSuccess] = useState<boolean>(false);
  const [appliedPartner, setAppliedPartner] = useState<Partner | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [currentPaymentDetails, setCurrentPaymentDetails] = useState<string>('');
  const [currentPaymentInstructions, setCurrentPaymentInstructions] = useState<string>('');

  // --- Effects ---

  // Load Plans
  useEffect(() => {
    PricingService.getAllPlans().then(plans => {
      const activePlans = plans.filter(p => p.isActive === true);
      setAvailablePlans(activePlans);
      if (activePlans.length > 0) {
        const defaultExists = activePlans.some(p => p.id === 'subscription_6months');
        if (!defaultExists) setSelectedPackage(activePlans[0].id);
      }
    }).catch(console.error);
  }, []);

  // Load Offers
  useEffect(() => {
    const loadActiveOffers = async () => {
      try {
        const offersRef = collection(db, 'promotional_offers');
        const offersQuery = query(offersRef, where('isActive', '==', true));
        const snapshot = await getDocs(offersQuery);
        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(offer => {
            const startDate = new Date(offer.startDate);
            const endDate = new Date(offer.endDate);
            const currentDate = new Date();
            return currentDate >= startDate && currentDate <= endDate;
          });
        setAvailableOffers(offers);
      } catch (error) {
        console.error('Error loading offers:', error);
      }
    };
    loadActiveOffers();
  }, []);

  // Load Payment Settings
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      const countryCode = selectedCountry || 'global';
      // Default methods for this country
      const baseMethods = DEFAULT_PAYMENT_METHODS[countryCode as keyof typeof DEFAULT_PAYMENT_METHODS] || DEFAULT_PAYMENT_METHODS.global;

      try {
        const docRef = doc(db, 'payment_settings', countryCode);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const settings = docSnap.data();
          const serverMethods = settings.methods || [];

          // Merge server settings with base methods logic
          const mergedMethods = baseMethods.map(baseMethod => {
            const serverMethod = serverMethods.find((m: any) => m.id === baseMethod.id);
            if (serverMethod) {
              return {
                ...baseMethod,
                enabled: serverMethod.enabled !== false,
                details: serverMethod.accountNumber || (baseMethod as any).details,
                instructions: serverMethod.instructions
              };
            }
            return { ...baseMethod, enabled: true };
          }).filter((m: any) => m.enabled);

          setPaymentMethods(mergedMethods);
        } else {
          setPaymentMethods(baseMethods);
        }
      } catch (error) {
        console.error('Error fetching payment settings:', error);
        setPaymentMethods(baseMethods);
      }
    };

    if (selectedCountry) {
      fetchPaymentSettings();
    }
  }, [selectedCountry]);

  // Update details/instructions when method changes
  useEffect(() => {
    const currentMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (currentMethod) {
      setCurrentPaymentDetails(currentMethod.details || '');
      setCurrentPaymentInstructions(currentMethod.instructions || '');
    }
  }, [selectedPaymentMethod, paymentMethods]);

  // Load Currency Rates
  const loadCurrencyRates = async () => {
    try {
      setRatesLoading(true);
      setRatesError(null);
      const rates = await getCurrencyRates();
      setCurrencyRates(rates);
    } catch (error) {
      console.error('Error loading rates:', error);
      toast.error('فشل تحميل أسعار العملات');
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => { loadCurrencyRates(); }, []);

  // Detect Country
  const detectUserCountry = async () => {
    try {
      setCurrencyLoading(true);
      let detectedCode = 'EG'; // Default fallback

      // 1. Try Geolocation
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const code = data.address?.country_code?.toUpperCase();
            if (code && SUPPORTED_COUNTRIES[code]) detectedCode = code;
          }
        } catch (e) { /* Ignore geo error */ }
      }

      // 2. Fallback: Timezone detection (if still default)
      if (detectedCode === 'EG') {
        try {
          const tmz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tmz.includes('Riyadh') || tmz.includes('Saudi')) detectedCode = 'SA';
          else if (tmz.includes('Dubai') || tmz.includes('Abu_Dhabi')) detectedCode = 'AE';
          else if (tmz.includes('Qatar')) detectedCode = 'QA';
          else if (tmz.includes('Kuwait')) detectedCode = 'KW';
        } catch (e) { console.error('Timezone detect error', e); }
      }

      setDetectedCountry(detectedCode);
      setSelectedCountry(detectedCode);
    } catch (e) {
      console.error(e);
      setSelectedCountry('EG');
    } finally {
      setCurrencyLoading(false);
    }
  };

  useEffect(() => {
    if (!ratesLoading) detectUserCountry();
  }, [ratesLoading]);


  // Players Fetching
  const fetchPlayers = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);

      // Build dynamic query based on account type
      let q;

      if (accountType === 'club') {
        q = query(collection(db, 'players'), where('club_id', '==', user.uid));
      } else if (accountType === 'academy') {
        q = query(collection(db, 'players'), where('academy_id', '==', user.uid));
      } else if (accountType === 'trainer') {
        q = query(collection(db, 'players'), where('trainer_id', '==', user.uid));
      } else if (accountType === 'agent') {
        q = query(collection(db, 'players'), where('agent_id', '==', user.uid));
      } else {
        // For player account, try to fetch their own data
        q = query(collection(db, 'players'), where('uid', '==', user.uid));
      }

      const snapshot = await getDocs(q);
      const playersData: PlayerData[] = snapshot.docs.map(doc => {
        const d: any = doc.data();
        return {
          id: doc.id,
          name: d.full_name || d.name || 'لاعب',
          email: d.email,
          phone: d.phone || d.phoneNumber,
          position: d.primary_position || d.position,
          currentSubscription: {
            status: d.subscription_status || 'none',
            endDate: d.subscription_end ? new Date(d.subscription_end) : undefined,
            packageType: d.subscription_type
          },
          selected: false,
          selectedPackage: 'subscription_6months'
        };
      });

      console.log(`✅ تم جلب ${playersData.length} لاعب لـ ${accountType}`);
      setPlayers(playersData);
    } catch (e) {
      console.error('❌ خطأ في جلب اللاعبين:', e);
      toast.error('فشل تحميل بيانات اللاعبين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlayers(); }, [user, accountType]);


  // --- Logic Helpers ---

  const getCurrentCurrency = () => {
    if (!selectedCountry) return 'USD';
    return SUPPORTED_COUNTRIES[selectedCountry]?.currency || 'USD';
  };

  const getCurrentCurrencySymbol = () => {
    const currency = getCurrentCurrency();
    const info = getCurrencyInfo(currency, currencyRates);
    return info?.symbol || '$';
  };


  // derived state
  const packages = availablePlans.reduce((acc, plan) => {
    const currency = getCurrentCurrency();
    const resolved = PricingService.resolvePrice(plan, selectedCountry || 'US', currency, currencyRates);
    const discountPercent = Math.round(((resolved.originalPrice - resolved.price) / resolved.originalPrice) * 100);
    return {
      ...acc,
      [plan.id]: {
        ...plan,
        price: resolved.price,
        originalPrice: resolved.originalPrice,
        discount: `${discountPercent}%`,
        bonusFeatures: plan.bonusFeatures || [],
        features: plan.features || []
      }
    };
  }, {} as Record<string, any>);

  const selectedPlayers = players.filter(p => p.selected);
  const selectedCount = selectedPlayers.length;

  // Auto-apply offers
  useEffect(() => {
    if (!availableOffers.length || !selectedPackage || selectedCount === 0) {
      setAppliedOffer(null);
      return;
    }
    const selectedPkg = packages[selectedPackage];
    if (!selectedPkg) return;

    const totalAmount = selectedPkg.price * selectedCount;
    let bestOffer: any = null;
    let maxDiscount = 0;

    for (const offer of availableOffers) {
      let applicable = true;

      // تحقق من الباقات المطبقة
      if (offer.applicablePlans && offer.applicablePlans.length > 0) {
        // إذا كان هناك باقات محددة، تحقق من أن الباقة الحالية ضمنها
        if (!offer.applicablePlans.includes(selectedPackage)) {
          applicable = false;
        }
      }
      // إذا كان applicablePlans فارغ أو غير موجود، يطبق على جميع الباقات

      if (offer.minPlayers && selectedCount < offer.minPlayers) applicable = false;
      if (offer.minAmount && totalAmount < offer.minAmount) applicable = false;

      if (applicable) {
        let discount = offer.discountType === 'percentage'
          ? (totalAmount * offer.discountValue) / 100
          : offer.discountValue;
        discount = Math.min(discount, totalAmount);

        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestOffer = offer;
        }
      }
    }
    setAppliedOffer(bestOffer);
  }, [availableOffers, selectedPackage, selectedCount, availablePlans, selectedCountry]);

  // Promo Code Handler
  const handleApplyPromoCode = async () => {
    setPromoCodeError('');
    setPromoCodeSuccess(false);
    setAppliedOffer(null);
    setAppliedPartner(null);

    if (!promoCode.trim()) { setPromoCodeError('الرجاء إدخال رمز الخصم'); return; }

    const codeInput = promoCode.trim().toUpperCase();

    // 1. Check Promotional Offers (Client-side from loaded active offers)
    const offer = availableOffers.find(o => o.code && o.code.toUpperCase() === codeInput);
    if (offer) {
      setAppliedOffer(offer);
      setPromoCodeSuccess(true);
      toast.success('تم تطبيق كود الخصم بنجاح');
      return;
    }

    // 2. Check Partners (Server-side fetch)
    try {
      setLoading(true);
      const partnersRef = collection(db, 'partners');
      const q = query(partnersRef, where('partnerCode', '==', codeInput));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const partnerData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Partner;
        if (partnerData.status === 'active' || partnerData.isActive) {
          setAppliedPartner(partnerData);
          setPromoCodeSuccess(true);
          toast.success(`تم تطبيق خصم الشريك: ${partnerData.partnerName}`);
          setLoading(false);
          return;
        } else {
          setPromoCodeError('هذا الكود غير نشط حالياً');
        }
      } else {
        setPromoCodeError('الرمز غير صحيح أو انتهت صلاحيته');
      }
    } catch (error) {
      console.error("Partner code check error", error);
      setPromoCodeError('حدث خطأ أثناء التحقق من الكود');
    } finally {
      setLoading(false);
    }
  };

  // Selection Handlers
  const togglePlayerSelection = (id: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };
  const toggleSelectAll = () => {
    const allSelected = players.every(p => p.selected);
    setPlayers(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  // Filter Players
  const filteredPlayers = players.filter(p =>
    (p.name.includes(searchTerm) || (p.email || '').includes(searchTerm)) &&
    (statusFilter === 'all' || p.currentSubscription.status === statusFilter)
  );

  // Calculations
  // Calculations
  const selectedPkg = packages[selectedPackage]; // Use derived state for resolved price

  // Resolve Base Price (Partner Override vs Standard Plan)
  let basePrice = selectedPkg?.price || 0;

  if (appliedPartner && appliedPartner.customPricing) {
    // Map package IDs to partner pricing keys
    // subscription_3months -> quarterly
    // subscription_annual -> yearly
    // subscription_6months -> check if available or calc? Assuming no direct 6month key in partner interface unless added.
    // For now, let's look for specific keys.

    if (selectedPackage.includes('3months') && appliedPartner.customPricing.quarterly) {
      basePrice = appliedPartner.customPricing.quarterly;
    } else if (selectedPackage.includes('annual') && appliedPartner.customPricing.yearly) {
      basePrice = appliedPartner.customPricing.yearly;
    }
    // Note: if 6 months is selected and partner has no 6 month price, we revert to standard or maybe we block?
    // For user friendliness, we default to standard if no partner price exists for that specific interval.
  }

  const subscriptionPrice = basePrice;
  const originalTotal = subscriptionPrice * selectedCount;

  let offerDiscount = 0;
  if (appliedOffer && selectedCount > 0) {
    offerDiscount = appliedOffer.discountType === 'percentage'
      ? (originalTotal * appliedOffer.discountValue) / 100
      : appliedOffer.discountValue;
    offerDiscount = Math.min(offerDiscount, originalTotal);
  }

  const finalPrice = originalTotal - offerDiscount;
  const currencySymbol = getCurrentCurrencySymbol();
  const currentCurrencyCode = getCurrentCurrency();

  const handleCheckout = () => {
    // 1. If Geidea (Online)
    if (selectedPaymentMethod === 'geidea') {
      let convertedAmountEGP = Math.round(finalPrice);
      if (currentCurrencyCode !== 'EGP') {
        const usd = convertCurrencyLib(finalPrice, currentCurrencyCode, 'USD', currencyRates);
        convertedAmountEGP = Math.round(convertCurrencyLib(usd, 'USD', 'EGP', currencyRates));
      }
      if (typeof window !== 'undefined') window.convertedAmountForGeidea = convertedAmountEGP;
      setShowGeideaModal(true);
      return;
    }

    // 2. If Manual (Fawran, Vodafone Cash, etc)
    if (!receiptFile) {
      toast.error('يرجى رفع صورة إيصال التحويل للمتابعة');
      return;
    }

    // Simulate Success for Manual Flow
    // In a real scenario: Upload Image -> Create Firestore Doc -> Notification
    toast.success('تم إرسال طلبك وسيتم مراجعة الإيصال وتفعيل الاشتراك');
    // Reset or Redirect
    setReceiptFile(null);
  };

  const handleGeideaPayment = () => { // Kept for modal callback if needed, but logic moved to handleCheckout
    // ...
  };

  const handlePaymentSuccess = async (data: any) => {
    toast.success('تم الدفع بنجاح!');
    setShowGeideaModal(false);
  };
  const handlePaymentFailure = (err: any) => { toast.error('فشل عملية الدفع'); };


  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">

      {/* Modern Glass Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 rotation-3 hover:rotate-6 transition-transform">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                إدارة الاشتراكات
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] text-gray-500 font-medium">النظام يعمل بكفاءة</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedCountry && SUPPORTED_COUNTRIES[selectedCountry] && (
              <div className="flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-full bg-white border border-blue-100 shadow-sm hover:shadow-md transition-shadow cursor-default">
                <span className="text-sm font-bold text-gray-700">{SUPPORTED_COUNTRIES[selectedCountry].name}</span>
                <span className="text-2xl leading-none">{SUPPORTED_COUNTRIES[selectedCountry].flag}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* RIGHT COLUMN (Content) */}
          <div className="lg:col-span-8 space-y-8">

            {/* 1. Plans Selection - Colorful Cards */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Zap className="w-5 h-5" />
                  </div>
                  اختر الباقة المناسبة
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {Object.values(packages)
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((pkg: any, index: number) => {
                    const isSelected = selectedPackage === pkg.id;

                    // Distinct Color Schemes per plan
                    const colorSchemes = [
                      { // Basic
                        grad: 'from-slate-700 to-gray-800',
                        light: 'bg-white',
                        border: 'border-slate-200',
                        text: 'text-slate-600',
                        iconBg: 'bg-slate-100 text-slate-600'
                      },
                      { // Popular (Blue)
                        grad: 'from-blue-600 via-indigo-600 to-indigo-700',
                        light: 'bg-white',
                        border: 'border-indigo-100',
                        text: 'text-indigo-600',
                        iconBg: 'bg-indigo-50 text-indigo-600'
                      },
                      { // Premium (Orange/Gold)
                        grad: 'from-orange-500 to-amber-600',
                        light: 'bg-white',
                        border: 'border-orange-100',
                        text: 'text-orange-600',
                        iconBg: 'bg-orange-50 text-orange-600'
                      }
                    ];

                    const scheme = colorSchemes[Math.min(index, colorSchemes.length - 1)];

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg.id)}
                        className={`
                          relative group cursor-pointer rounded-2xl transition-all duration-300 overflow-hidden
                          ${isSelected
                            ? `bg-gradient-to-br ${scheme.grad} shadow-xl shadow-blue-900/10 scale-[1.03] ring-offset-2 ring-2 ring-transparent`
                            : `bg-white border-2 ${scheme.border} hover:border-blue-300 hover:shadow-lg hover:-translate-y-1`
                          }
                        `}
                      >
                        {/* Annual Plan Special Badge - Moved here */}
                        {pkg.id?.includes('annual') && (
                          <div className="absolute top-0 right-0 z-50 bg-gradient-to-l from-red-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md flex items-center gap-1">
                            <span className="animate-pulse">🔥</span>
                            <span>الأكثر توفيراً</span>
                            {parseInt(pkg.discount) > 0 && <span className="bg-white/20 px-1 rounded text-white ml-1">وفر {pkg.discount}</span>}
                          </div>
                        )}

                        <div className="p-6 flex flex-col items-center text-center h-full relative z-10">

                          {/* Icon */}
                          <div className={`
                              w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-xl shadow-sm transition-colors
                              ${isSelected ? 'bg-white/20 text-white backdrop-blur-sm' : scheme.iconBg}
                            `}>
                            {index === 0 && <Zap className="w-6 h-6" />}
                            {index === 1 && <Star className="w-6 h-6" />}
                            {index === 2 && <Crown className="w-6 h-6" />}
                          </div>

                          {/* Removed Annual Badge from here to move it outside padding container */}

                          {/* Duration Badge */}
                          <div className={`
                            inline-block px-3 py-1 rounded-full text-xs font-bold mb-3
                            ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}
                          `}>
                            {pkg.period}
                          </div>

                          {/* Title */}
                          <h3 className={`text-lg font-bold mb-2 ${isSelected ? 'text-white' : 'text-gray-900'}`}>{pkg.title}</h3>
                          <p className={`text-xs mb-4 px-2 min-h-[40px] leading-relaxed ${isSelected ? 'text-blue-50' : 'text-gray-500'}`}>{pkg.description}</p>

                          {/* Features List */}
                          <div className={`w-full mb-6 space-y-2 text-right px-2 ${isSelected ? 'text-blue-50' : 'text-gray-600'}`}>
                            {pkg.features?.slice(0, 5).map((feature: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <Check className={`w-3 h-3 shrink-0 mt-0.5 ${isSelected ? 'text-white/80' : 'text-green-500'}`} />
                                <span className="line-clamp-1">{typeof feature === 'string' ? feature : feature.name}</span>
                              </div>
                            ))}
                            {pkg.features?.length > 5 && (
                              <p className={`text-[10px] text-center mt-2 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                                + {pkg.features.length - 5} ميزات أخرى
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="mt-auto mb-4">
                            {parseInt(pkg.discount) > 0 && (
                              <span className={`block text-xs line-through mb-1 font-medium ${isSelected ? 'text-white/60' : 'text-red-400'}`}>{pkg.originalPrice} {currencySymbol}</span>
                            )}
                            <div className="flex items-baseline justify-center gap-1">
                              <span className={`text-3xl font-black ${isSelected ? 'text-white' : scheme.text}`}>{pkg.price}</span>
                              <span className={`text-xs font-bold ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{currencySymbol} / شهر</span>
                            </div>
                          </div>

                          {/* Selection Check */}
                          {isSelected && (
                            <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-1">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Background Decoration for unselected */}
                        {!isSelected && (
                          <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${scheme.grad} opacity-50`}></div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </section>

            {/* 2. Payment Methods */}
            <section className="space-y-6 pt-8 border-t border-gray-200/60">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                وسيلة الدفع المفضلة
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(() => {
                  // Use dynamic methods fetched from Firebase
                  const methods = paymentMethods;

                  return methods.map((method: any) => {
                    const isSelected = selectedPaymentMethod === method.id;
                    // Dynamic styling based on method
                    const isStc = method.id === 'stc_pay';
                    const isVodafone = method.id === 'vodafone_cash';
                    const isInsta = method.id === 'instapay';

                    let activeBorder = 'border-blue-500';
                    let activeBg = 'bg-blue-50';
                    if (isStc) { activeBorder = 'border-purple-500'; activeBg = 'bg-purple-50'; }
                    if (isVodafone) { activeBorder = 'border-red-500'; activeBg = 'bg-red-50'; }

                    return (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={`
                             relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 flex items-center gap-4
                             ${isSelected
                            ? `${activeBorder} ${activeBg} shadow-md`
                            : 'border-transparent bg-white shadow-sm hover:shadow-md hover:scale-[1.01]'
                          }
                           `}
                      >
                        <div className={`
                              text-2xl w-14 h-14 rounded-xl flex items-center justify-center shadow-inner
                              ${isSelected ? 'bg-white' : 'bg-gray-50'}
                            `}>
                          {method.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{method.name}</h4>
                            {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{method.description}</p>
                          {isSelected && method.details && (
                            <div className="mt-3">
                              <p className="text-[10px] text-gray-500 mb-1 font-bold">رقم التحويل:</p>
                              <div className="flex items-center gap-2 group/copy">
                                <code className="flex-1 text-lg font-black text-indigo-700 bg-white border-2 border-dashed border-indigo-200 px-3 py-1.5 rounded-lg tracking-wider text-center select-all shadow-sm">
                                  {method.details}
                                </code>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(method.details);
                                    toast.success('تم نسخ الرقم');
                                  }}
                                  className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md transition-all"
                                  title="نسخ الرقم"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              {/* عرض التعليمات الإضافية */}
                              {method.instructions && (
                                <p className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded-lg border border-yellow-100 flex gap-2 items-start">
                                  <span className="shrink-0">💡</span>
                                  {method.instructions}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>

          </div>

          {/* LEFT COLUMN (Sidebar) */}
          <div className="lg:col-span-4 space-y-6 sticky top-24">

            {/* A. Player Selection Widget */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 overflow-hidden flex flex-col max-h-[500px]">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  إدارة اللاعبين
                </h3>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredPlayers.length}</span>
              </div>

              <div className="p-3 bg-white">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    placeholder="بحث سريع..."
                    className="w-full pl-4 pr-9 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {filteredPlayers.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-xs text-gray-400">لا يوجد لاعبين</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPlayers.map(player => (
                      <div
                        key={player.id}
                        onClick={() => togglePlayerSelection(player.id)}
                        className={`
                               flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                               ${player.selected
                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                            : 'bg-white border-transparent hover:bg-gray-50'
                          }
                             `}
                      >
                        <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                                ${player.selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}
                              `}>
                          {player.selected ? <Check className="w-4 h-4" /> : player.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${player.selected ? 'text-blue-900' : 'text-gray-700'}`}>{player.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
                <button onClick={toggleSelectAll} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">تحديد / إلغاء تحديد الكل</button>
              </div>
            </div>

            {/* B. Summary Widget (Colorful) */}
            <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-white/50 overflow-hidden relative group hover:shadow-2xl transition-shadow duration-500">
              {/* Top Gradient Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>

              <div className="p-6 relative z-10">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  ملخص الطلب
                </h3>

                {/* Promo Code */}
                <div className="mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="كود الخصم"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                    />
                    <button onClick={handleApplyPromoCode} className="px-3 py-2 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors">
                      تطبيق
                    </button>
                  </div>
                  {promoCodeSuccess && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3 h-3" />
                      {appliedOffer ? `تم تطبيق العرض: ${appliedOffer.title}` : appliedPartner ? `شريك: ${appliedPartner.partnerName}` : 'تم التطبيق'}
                    </p>
                  )}
                  {promoCodeError && <p className="text-xs text-red-500 mt-2">{promoCodeError}</p>}
                </div>

                {/* Pricing Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">عدد اللاعبين</span>
                    <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">{selectedCount}</span>
                  </div>

                  <div className="px-1 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>سعر الباقة للفرد</span>
                      <span className="font-bold">{subscriptionPrice} {currencySymbol}</span>
                    </div>
                    {offerDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>قيمة الخصم</span>
                        <span>- {offerDiscount.toFixed(2)} {currencySymbol}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 my-4"></div>

                {/* Manual Payment Upload (Fawran / Wallet) */}
                {!['geidea', 'paypal'].includes(selectedPaymentMethod) && (
                  <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100 border-dashed">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="p-1 bg-blue-100 rounded text-blue-600 mt-0.5"><Upload className="w-3 h-3" /></div>
                      <div className="text-xs text-gray-600 leading-relaxed">
                        يرجى تحويل المبلغ المطلوب إلى الرقم الموضح، ثم رفع صورة الإيصال هنا لإتمام الطلب.
                      </div>
                    </div>

                    <label className="block cursor-pointer group">
                      <div className={`
                          flex items-center gap-3 px-4 py-3 bg-white border-2 border-dashed rounded-xl transition-all
                          ${receiptFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}
                        `}>
                        <div className={`p-2 rounded-full ${receiptFile ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {receiptFile ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-700 truncate">
                            {receiptFile ? receiptFile.name : 'اضغط لرفع صورة الدفع'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {receiptFile ? 'تم الرفع بنجاح' : 'JPG, PNG, PDF'}
                          </p>
                        </div>
                      </div>
                      <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-end mb-6">
                  <span className="text-sm font-bold text-gray-500 mb-1">الإجمالي النهائي</span>
                  <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    {finalPrice.toLocaleString()} <span className="text-xs text-gray-400 font-medium">{selectedPkg?.currency || currencySymbol}</span>
                  </span>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={selectedCount === 0 || loading}
                  className="w-full py-4 bg-gradient-to-r from-gray-900 to-black hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-bold text-sm shadow-xl shadow-gray-200 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>
                    {!['geidea', 'paypal'].includes(selectedPaymentMethod)
                      ? 'تأكيد التحويل وإرسال الإيصال'
                      : 'إتمام عملية الدفع الإلكتروني'}
                  </span>
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-400">
                  <Shield className="w-3 h-3" />
                  <span>مدفوعات آمنة 100% ومشفرة</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div >

      <GeideaPaymentModal
        visible={showGeideaModal}
        onRequestClose={() => setShowGeideaModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
        amount={typeof window !== 'undefined' && window.convertedAmountForGeidea ? window.convertedAmountForGeidea : Math.round(finalPrice)}
        currency="EGP"
        title="تجديد الاشتراكات"
        description={`دفع اشتراكات لـ ${selectedCount} لاعبين`}
        customerEmail={user?.email || 'customer@example.com'}
        merchantReferenceId={`PAY-${Date.now()}`}
      />

    </div >
  );
}
