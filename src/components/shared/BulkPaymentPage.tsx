// ============================================
// نظام الدفع الجماعي المتطور
// ============================================
// 
// المميزات:
// - دفع جماعي للاعبين مع خصومات
// - باقات مؤسسية مع ميزات VIP
// - المحافظ الإلكترونية (فودافون كاش، اتصالات كاش، أورنج موني)
// - نظام النقاط والمكافآت
// - تقارير وإحصائيات متقدمة
//
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// إضافة type للمتغير العالمي
declare global {
  interface Window {
    convertedAmountForGeidea?: number;
  }
}
import { Sparkles, Users, Crown, Shield, Star, Gift, Zap, Trophy, CreditCard, Smartphone, Wallet, Check, ArrowLeft, Upload, FileImage, Plus, Search, X, Globe, AlertTriangle, CheckCircle, ExternalLink, Settings, RefreshCw, ChevronDown, ChevronUp, Eye } from 'lucide-react';

import { useAuth } from '@/lib/firebase/auth-provider';
import Link from 'next/link';
import GeideaPaymentModal from '@/components/GeideaPaymentModal';
import { getCurrencyRates, convertCurrency as convertCurrencyLib, getCurrencyInfo, getRatesAge, forceUpdateRates } from '@/lib/currency-rates';
import toast from 'react-hot-toast';

// إعداد Supabase لرفع الإيصالات في bucket "wallet" - Updated with working credentials
import { supabase } from '@/lib/supabase/config';

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

// باقات الاشتراك العالمية (بالدولار)
const BULK_PACKAGES_USD = {
  'subscription_3months': {
    title: 'اشتراك 3 شهور',
    subtitle: 'للتجربة والبداية',
    price: 20,
    originalPrice: 30,
    period: '3 شهور',
    discount: '33%',
    color: 'blue',
    features: [
      'الوصول لجميع الميزات الأساسية',
      'تقارير شهرية',
      'الدعم الفني',
      'تطبيق الموبايل',
      'تحليل الأداء الأساسي',
      'شهادات الإنجاز',
      'النظام التعليمي'
    ],
    bonusFeatures: [
      'دورة تدريبية مجانية',
      'استشارة مجانية',
      'دعم 24/7'
    ],
    popular: false,
    icon: '📅'
  },
  'subscription_6months': {
    title: 'اشتراك 6 شهور',
    subtitle: 'الخيار الأذكى',
    price: 35,
    originalPrice: 60,
    period: '6 شهور',
    discount: '42%',
    color: 'purple',
    features: [
      'جميع ميزات 3 شهور',
      'تحليل متقدم بالذكاء الاصطناعي',
      'تقارير تفصيلية',
      'مدرب AI شخصي',
      'فيديوهات تدريبية حصرية',
      'ألعاب تفاعلية',
      'منصة إدارة شاملة'
    ],
    bonusFeatures: [
      'ورشة عمل مجانية',
      'تقييم شهري مفصل',
      'مجتمع VIP',
      'دعم أولوية'
    ],
    popular: true,
    icon: '👑'
  },
  'subscription_annual': {
    title: 'اشتراك سنوي',
    subtitle: 'أفضل قيمة وتوفير',
    price: 50,
    originalPrice: 120,
    period: '12 شهر',
    discount: '58%',
    color: 'emerald',
    features: [
      'جميع ميزات 6 شهور',
      'أكاديمية تدريب كاملة',
      'استوديو فيديو احترافي',
      'فريق دعم مخصص',
      'تحليل متطور جداً',
      'شبكة احترافية عالمية',
      'أدوات احترافية متقدمة'
    ],
    bonusFeatures: [
      'مؤتمر سنوي حصري',
      'جوائز وشهادات معتمدة',
      'لقاءات مع خبراء',
      'برنامج امتيازات VIP'
    ],
    popular: false,
    icon: '⭐'
  }
};

// سيتم استبدال هذا بالأسعار المحدثة تلقائياً من getCurrencyRates()

// الدول المدعومة مع أعلامها
const SUPPORTED_COUNTRIES = {
  US: { name: 'الولايات المتحدة', currency: 'USD', flag: '🇺🇸' },
  EG: { name: 'مصر', currency: 'EGP', flag: '🇪🇬' }, // خاص - أسعار مصرية
  SA: { name: 'السعودية', currency: 'SAR', flag: '🇸🇦' },
  AE: { name: 'الإمارات', currency: 'AED', flag: '🇦🇪' },
  KW: { name: 'الكويت', currency: 'KWD', flag: '🇰🇼' },
  QA: { name: 'قطر', currency: 'QAR', flag: '🇶🇦' },
  BH: { name: 'البحرين', currency: 'BHD', flag: '🇧🇭' },
  OM: { name: 'عمان', currency: 'OMR', flag: '🇴🇲' },
  JO: { name: 'الأردن', currency: 'JOD', flag: '🇯🇴' },
  LB: { name: 'لبنان', currency: 'LBP', flag: '🇱🇧' },
  TR: { name: 'تركيا', currency: 'TRY', flag: '🇹🇷' },
  GB: { name: 'بريطانيا', currency: 'GBP', flag: '🇬🇧' },
  FR: { name: 'فرنسا', currency: 'EUR', flag: '🇫🇷' },
  DE: { name: 'ألمانيا', currency: 'EUR', flag: '🇩🇪' },
  MA: { name: 'المغرب', currency: 'MAD', flag: '🇲🇦' },
  DZ: { name: 'الجزائر', currency: 'DZD', flag: '🇩🇿' },
  TN: { name: 'تونس', currency: 'TND', flag: '🇹🇳' }
};

// باقات الاشتراك المصرية الخاصة (بالجنيه المصري)
const BULK_PACKAGES_EGP = {
  'subscription_3months': {
    title: 'اشتراك 3 شهور',
    subtitle: 'للتجربة والبداية',
    price: 80,
    originalPrice: 120,
    period: '3 شهور',
    discount: '33%',
    color: 'blue',
    features: [
      'الوصول لجميع الميزات الأساسية',
      'تقارير شهرية',
      'الدعم الفني',
      'تطبيق الموبايل',
      'تحليل الأداء الأساسي',
      'شهادات الإنجاز',
      'النظام التعليمي'
    ],
    bonusFeatures: [
      'دورة تدريبية مجانية',
      'استشارة مجانية',
      'دعم 24/7'
    ],
    popular: false,
    icon: '📅'
  },
  'subscription_6months': {
    title: 'اشتراك 6 شهور',
    subtitle: 'الخيار الأذكى',
    price: 120,
    originalPrice: 200,
    period: '6 شهور',
    discount: '40%',
    color: 'purple',
    features: [
      'جميع ميزات 3 شهور',
      'تحليل متقدم بالذكاء الاصطناعي',
      'تقارير تفصيلية',
      'مدرب AI شخصي',
      'فيديوهات تدريبية حصرية',
      'ألعاب تفاعلية',
      'منصة إدارة شاملة'
    ],
    bonusFeatures: [
      'ورشة عمل مجانية',
      'تقييم شهري مفصل',
      'مجتمع VIP',
      'دعم أولوية'
    ],
    popular: true,
    icon: '👑'
  },
  'subscription_annual': {
    title: 'اشتراك سنوي',
    subtitle: 'أفضل قيمة وتوفير',
    price: 180,
    originalPrice: 360,
    period: '12 شهر',
    discount: '50%',
    color: 'emerald',
    features: [
      'جميع ميزات 6 شهور',
      'أكاديمية تدريب كاملة',
      'استوديو فيديو احترافي',
      'فريق دعم مخصص',
      'تحليل متطور جداً',
      'شبكة احترافية عالمية',
      'أدوات احترافية متقدمة'
    ],
    bonusFeatures: [
      'مؤتمر سنوي حصري',
      'جوائز وشهادات معتمدة',
      'لقاءات مع خبراء',
      'برنامج امتيازات VIP'
    ],
    popular: false,
    icon: '⭐'
  }
};

// طرق الدفع المحسنة حسب البلد
const PAYMENT_METHODS = {
  // طرق دفع عالمية
  global: [
    { 
      id: 'geidea', 
      name: 'بطاقة بنكية', 
      icon: '💳', 
      description: 'ماستركارد، فيزا، مدى',
      discount: 0,
      popular: true 
    },
    { 
      id: 'paypal', 
      name: 'PayPal', 
      icon: '💙', 
      description: 'دفع آمن عالمياً',
      discount: 0,
      popular: true 
    },
    { 
      id: 'bank_transfer', 
      name: 'تحويل بنكي', 
      icon: '🏦', 
      description: 'دفع آمن ومضمون',
      discount: 0,
      popular: false 
    }
  ],
  // طرق دفع مصرية
  EG: [
    { 
      id: 'geidea', 
      name: 'بطاقة بنكية', 
      icon: '💳', 
      description: 'ماستركارد، فيزا، مدى',
      discount: 0,
      popular: true 
    },
    { 
      id: 'vodafone_cash', 
      name: 'فودافون كاش', 
      icon: '📱', 
      description: 'دفع آمن وسريع',
      discount: 0,
      popular: true 
    },
    { 
      id: 'etisalat_cash', 
      name: 'اتصالات كاش', 
      icon: '💰', 
      description: 'دفع آمن وسريع',
      discount: 0,
      popular: false 
    },
    { 
      id: 'instapay', 
      name: 'انستاباي', 
      icon: '⚡', 
      description: 'دفع آمن وسريع',
      discount: 0,
      popular: true 
    },
    { 
      id: 'bank_transfer', 
      name: 'تحويل بنكي', 
      icon: '🏦', 
      description: 'دفع آمن ومضمون',
      discount: 0,
      popular: false 
    }
  ],
  // طرق دفع خليجية
  SA: [
    { 
      id: 'geidea', 
      name: 'بطاقة بنكية', 
      icon: '💳', 
      description: 'مدى، فيزا، ماستركارد',
      discount: 0,
      popular: true 
    },
    { 
      id: 'stc_pay', 
      name: 'STC Pay', 
      icon: '📱', 
      description: 'دفع آمن وسريع',
      discount: 0,
      popular: true 
    },
    { 
      id: 'bank_transfer', 
      name: 'تحويل بنكي', 
      icon: '🏦', 
      description: 'دفع آمن ومضمون',
      discount: 0,
      popular: false 
    }
  ]
};

export default function BulkPaymentPage({ accountType }: BulkPaymentPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState('subscription_6months');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('geidea');
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showGeideaModal, setShowGeideaModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'none' | 'expired' | 'active' | 'upgrade'>('all');
  
  // متغيرات الدولة والعملة
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [currencyLoading, setCurrencyLoading] = useState(true);

  // نظام أسعار العملات المحدث
  const [currencyRates, setCurrencyRates] = useState<Record<string, any>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [lastRatesUpdate, setLastRatesUpdate] = useState<string | null>(null);

  // حالات النماذج
  const [formData, setFormData] = useState({
    transactionId: '',
    senderName: '',
    senderAccount: '',
    receiptFile: null as File | null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // حالة الطوي والتوسيع للميزات التفصيلية
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);

  // دالة قراءة بلد المستخدم (محسنة مع Geolocation API)
  const detectUserCountry = async () => {
    try {
      setCurrencyLoading(true);
      
      let detectedCountryCode: string | null = null;

      // محاولة 1: استخدام Geolocation API للحصول على الموقع الدقيق
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { timeout: 5000, enableHighAccuracy: false }
            );
          });

          const { latitude, longitude } = position.coords;
          
          // استخدام Reverse Geocoding API (مجاني من OpenStreetMap)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              {
                headers: {
                  'User-Agent': 'El7lm Payment App'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              const countryCode = data.address?.country_code?.toUpperCase();
              
              if (countryCode && SUPPORTED_COUNTRIES[countryCode as keyof typeof SUPPORTED_COUNTRIES]) {
                detectedCountryCode = countryCode;
                console.log('✅ تم اكتشاف الدولة من الموقع الجغرافي:', countryCode);
              }
            }
          } catch (geoError) {
            console.log('⚠️ فشل في الحصول على الدولة من الموقع الجغرافي، استخدام الطرق البديلة');
          }
        } catch (geoError) {
          console.log('⚠️ المستخدم لم يسمح بالوصول للموقع الجغرافي، استخدام الطرق البديلة');
        }
      }

      // محاولة 2: استخدام Intl API المدمج في المتصفح (إذا فشلت المحاولة الأولى)
      if (!detectedCountryCode) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const locale = navigator.language || 'ar-EG';

        // خريطة المناطق الزمنية للبلدان الرئيسية
        const timezoneCountryMap: Record<string, string> = {
          // البلدان العربية
          'Africa/Cairo': 'EG',
          'Asia/Riyadh': 'SA',
          'Asia/Dubai': 'AE',
          'Asia/Kuwait': 'KW',
          'Asia/Qatar': 'QA',
          'Asia/Bahrain': 'BH',
          'Asia/Baghdad': 'IQ',
          'Asia/Damascus': 'SY',
          'Asia/Beirut': 'LB',
          'Asia/Amman': 'JO',
          'Africa/Tunis': 'TN',
          'Africa/Algiers': 'DZ',
          'Africa/Casablanca': 'MA',
          // بلدان أخرى
          'Europe/London': 'GB',
          'America/New_York': 'US',
          'America/Los_Angeles': 'US',
          'America/Chicago': 'US',
          'Europe/Paris': 'FR',
          'Europe/Berlin': 'DE',
          'Asia/Tokyo': 'JP'
        };

        // محاولة اكتشاف البلد من المنطقة الزمنية
        detectedCountryCode = timezoneCountryMap[timezone];
        
        // إذا لم نجد المنطقة الزمنية، حاول من اللغة
        if (!detectedCountryCode) {
          if (locale.includes('ar') || locale.includes('AR')) {
            detectedCountryCode = 'EG'; // مصر كافتراضي للعربية
          } else if (locale.startsWith('en-US')) {
            detectedCountryCode = 'US';
          } else if (locale.startsWith('en-GB')) {
            detectedCountryCode = 'GB';
          } else if (locale.startsWith('fr')) {
            detectedCountryCode = 'FR';
          } else if (locale.startsWith('de')) {
            detectedCountryCode = 'DE';
          } else {
            detectedCountryCode = 'EG'; // افتراضي للمنطقة العربية
          }
        }
      }

      // التحقق من وجود البلد في قائمة البلدان المدعومة
      if (detectedCountryCode && SUPPORTED_COUNTRIES[detectedCountryCode as keyof typeof SUPPORTED_COUNTRIES]) {
        setDetectedCountry(detectedCountryCode);
        setSelectedCountry(detectedCountryCode);
        console.log('✅ تم تحديد الدولة:', detectedCountryCode);
        return detectedCountryCode;
      } else {
        // افتراضي: مصر للمنطقة العربية
        const defaultCountry = 'EG';
        setDetectedCountry(defaultCountry);
        setSelectedCountry(defaultCountry);
        console.log('⚠️ استخدام الدولة الافتراضية:', defaultCountry);
        return defaultCountry;
      }
    } catch (error) {
      console.error('❌ خطأ في اكتشاف الدولة:', error);
      // في حالة أي خطأ، استخدم مصر كافتراضي
      const defaultCountry = 'EG';
      setDetectedCountry(defaultCountry);
      setSelectedCountry(defaultCountry);
      return defaultCountry;
    } finally {
      setCurrencyLoading(false);
    }
  };

  // دالة تحويل العملة المحدثة
  const convertCurrency = (amount: number, targetCurrency: string): number => {
    if (targetCurrency === 'USD') return amount;
    
    return convertCurrencyLib(amount, 'USD', targetCurrency, currencyRates);
  };

  // ترتيب الباقات لتحديد الترقية
  const PACKAGE_RANK: Record<string, number> = {
    subscription_3months: 1,
    subscription_6months: 2,
    subscription_annual: 3,
  };

  const normalizePackageKey = (pkg?: string): keyof typeof PACKAGE_RANK | undefined => {
    if (!pkg) return undefined;
    if (pkg in PACKAGE_RANK) return pkg as keyof typeof PACKAGE_RANK;
    // محاولات بسيطة للتطبيع
    const key = pkg.replace(/\s+/g, '').toLowerCase();
    if (key.includes('annual')) return 'subscription_annual';
    if (key.includes('6')) return 'subscription_6months';
    if (key.includes('3')) return 'subscription_3months';
    return undefined;
  };

  const isUpgradeCandidate = (player: PlayerData): boolean => {
    const currentKey = normalizePackageKey(player.currentSubscription.packageType);
    const desiredKey = normalizePackageKey(selectedPackage as any) || 'subscription_6months';
    if (!currentKey) return player.currentSubscription.status === 'active' ? true : true;
    return (PACKAGE_RANK[desiredKey] || 0) > (PACKAGE_RANK[currentKey] || 0);
  };

  // دالة تحميل أسعار العملات
  const loadCurrencyRates = async () => {
    try {
      setRatesLoading(true);
      setRatesError(null);
      
      console.log('🔄 تحميل أسعار العملات...');
      const rates = await getCurrencyRates();
      setCurrencyRates(rates);
      
      const ratesAge = getRatesAge();
      setLastRatesUpdate(ratesAge.lastUpdated);
      
      console.log('✅ تم تحميل أسعار العملات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تحميل أسعار العملات:', error);
      setRatesError(error instanceof Error ? error.message : 'خطأ في تحميل الأسعار');
    } finally {
      setRatesLoading(false);
    }
  };

  // دالة تحديث قسري للأسعار
  const refreshCurrencyRates = async () => {
    try {
      setRatesLoading(true);
      setRatesError(null);
      
      console.log('🔄 تحديث قسري لأسعار العملات...');
      const rates = await forceUpdateRates();
      setCurrencyRates(rates);
      
      const ratesAge = getRatesAge();
      setLastRatesUpdate(ratesAge.lastUpdated);
      
      console.log('✅ تم تحديث أسعار العملات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تحديث أسعار العملات:', error);
      setRatesError(error instanceof Error ? error.message : 'خطأ في تحديث الأسعار');
    } finally {
      setRatesLoading(false);
    }
  };

  // دالة الحصول على العملة الحالية
  const getCurrentCurrency = () => {
    if (!selectedCountry) return 'USD';
    const country = SUPPORTED_COUNTRIES[selectedCountry as keyof typeof SUPPORTED_COUNTRIES];
    return country?.currency || 'USD';
  };

  const getCurrentCurrencySymbol = () => {
    const currency = getCurrentCurrency();
    const currencyInfo = getCurrencyInfo(currency, currencyRates);
    return currencyInfo?.symbol || '$';
  };

  // تحميل أسعار العملات عند تحميل المكون
  useEffect(() => {
    loadCurrencyRates();
  }, []);

  // تحديث العملة عند تغيير البلد (إذا كانت الأسعار محملة)
  useEffect(() => {
    if (!ratesLoading && Object.keys(currencyRates).length > 0) {
      detectUserCountry();
    }
  }, [ratesLoading, currencyRates]);

  // دالة رفع الإيصال إلى Supabase
  // دالة رفع الإيصال إلى Supabase bucket "wallet"
  const uploadReceipt = async (file: File, playerName?: string) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      // إنشاء اسم الملف آمن (إزالة الأحرف الخاصة والعربية)
      const fileExtension = file.name.split('.').pop();
      const timestamp = Date.now();
      
      let safeFileName: string;
      if (playerName) {
        // تحويل الاسم العربي إلى نص آمن
        const safeName = playerName
          .replace(/[^\w\s]/g, '') // إزالة الأحرف الخاصة
          .replace(/\s+/g, '_') // تحويل المسافات إلى _
          .toLowerCase(); // تحويل إلى أحرف صغيرة
        
        // إذا كان الاسم فارغ بعد التنظيف، استخدم timestamp
        safeFileName = safeName ? `${safeName}_${timestamp}.${fileExtension}` : `receipt_${timestamp}.${fileExtension}`;
      } else {
        safeFileName = `receipt_${timestamp}.${fileExtension}`;
      }
      
      // المسار: wallet/userId/safeFileName
      const filePath = `${user.uid}/${safeFileName}`;
      console.log(`📁 رفع الإيصال إلى: bucket "wallet" -> ${filePath}`);

      // محاكاة تقدم الرفع
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
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
      setUploadProgress(100);

      if (error) {
        // إذا كان الخطأ أن bucket غير موجود، أعطي رسالة واضحة
        if (error.message.includes('bucket')) {
          throw new Error(`خطأ: تأكد من وجود bucket "wallet" في Supabase Storage. ${error.message}`);
        }
        throw new Error(`خطأ في رفع الإيصال: ${error.message}`);
      }

      // الحصول على رابط الملف العام
      const { data: urlData } = supabase.storage
        .from('wallet')
        .getPublicUrl(filePath);

      console.log(`✅ تم رفع الإيصال بنجاح: ${urlData.publicUrl}`);
      
      // عرض رسالة تأكيد للمستخدم
      toast.success('✅ تم رفع الإيصال بنجاح!', {
        description: 'سيتم مراجعة الإيصال والموافقة على الدفع خلال 24 ساعة.',
        duration: 5000,
      });
      
      return urlData.publicUrl;

    } catch (error) {
      console.error('❌ خطأ في رفع الإيصال:', error);
      
      // عرض رسالة خطأ للمستخدم
      toast.error('❌ فشل في رفع الإيصال', {
        description: 'يرجى التحقق من الملف والمحاولة مرة أخرى.',
        duration: 5000,
      });
      
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // جلب اللاعبين من Firebase (نفس منطق صفحة إدارة اللاعبين)
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      
      // استخدام Firebase بدلاً من Supabase (مثل صفحة إدارة اللاعبين)
      const { collection, query, where, getDocs, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');
      
             // استخدام معرف المستخدم الحقيقي
       if (!user?.uid) {
         throw new Error('المستخدم غير مصادق');
       }
       
              // البحث حسب نوع الحساب - كل نوع له حقوله الخاصة
       const userId = user.uid;
       
       // تحديد الحقول حسب نوع الحساب
       let field1: string, field2: string;
       switch (accountType) {
         case 'club':
           field1 = 'club_id';
           field2 = 'clubId';
           break;
         case 'academy':
           field1 = 'academy_id';
           field2 = 'academyId';
           break;
         case 'agent':
           field1 = 'agent_id';
           field2 = 'agentId';
           break;
         case 'trainer':
           field1 = 'trainer_id';
           field2 = 'trainerId';
           break;
         case 'player':
           // للاعب: يمكنه دفع اشتراكه الشخصي + أصدقائه (إذا وجدوا)
           field1 = 'user_id';
           field2 = 'playerId';
           break;
         default:
           field1 = 'club_id';
           field2 = 'clubId';
       }
       
       let uniqueDocs: any[] = [];
       
       if (accountType === 'player') {
         // للاعب: جلب ملفه الشخصي من مجموعة users
         const { doc, getDoc } = await import('firebase/firestore');
         const userDoc = await getDoc(doc(db, 'users', userId));
         
         if (userDoc.exists()) {
           const userData = userDoc.data();
           // إنشاء ملف شخصي للاعب نفسه
           const playerProfile = {
             id: userId,
             data: () => ({
               full_name: userData.full_name || userData.displayName || 'ملفي الشخصي',
               email: userData.email,
               phone: userData.phone,
               primary_position: userData.position || userData.primary_position,
               subscription_status: userData.subscription_status,
               subscription_end: userData.subscription_end,
               subscription_type: userData.subscription_type
             })
           };
           uniqueDocs = [playerProfile];
           
           // محاولة جلب أي لاعبين مرتبطين (اختياري)
           try {
             const q1 = query(collection(db, 'players'), where(field1, '==', userId));
             const q2 = query(collection(db, 'players'), where(field2, '==', userId));
             
             const [snapshot1, snapshot2] = await Promise.all([
               getDocs(q1),
               getDocs(q2)
             ]);
             
             const additionalPlayers = [...snapshot1.docs, ...snapshot2.docs];
             uniqueDocs = [...uniqueDocs, ...additionalPlayers];
           } catch (error) {
             console.log('لا توجد لاعبين إضافيين مرتبطين');
           }
         }
       } else {
         // للحسابات الأخرى: المنطق المحسّن
         console.log(`🔍 بحث شامل للاعبين - نوع الحساب: ${accountType}, معرف المستخدم: ${userId}`);
         console.log(`🔍 إيميل المستخدم: ${user?.email}`);
         
         // البحث بطرق متعددة
         const queries = [
           // البحث بالحقل الأساسي (مثل club_id)
           query(collection(db, 'players'), where(field1, '==', userId)),
           // البحث بالحقل البديل (مثل clubId)
           query(collection(db, 'players'), where(field2, '==', userId)),
           // البحث بـ created_by
           query(collection(db, 'players'), where('created_by', '==', userId)),
           // البحث بـ created_by_type + created_by
           query(collection(db, 'players'), where('created_by_type', '==', accountType)),
         ];

         // إضافة البحث بالإيميل إذا كان متوفراً
         if (user?.email) {
           queries.push(
             query(collection(db, 'players'), where('official_contact.email', '==', user.email))
           );
         }
         
         const snapshots = await Promise.all(queries.map(q => getDocs(q)));
         
         console.log('📊 نتائج البحث في الدفع الجماعي:');
         console.log(`  - ${field1}:`, snapshots[0].size, 'مستندات');
         console.log(`  - ${field2}:`, snapshots[1].size, 'مستندات');
         console.log('  - created_by:', snapshots[2].size, 'مستندات');
         console.log(`  - created_by_type=${accountType}:`, snapshots[3].size, 'مستندات');
         if (snapshots[4]) {
           console.log('  - official_contact.email:', snapshots[4].size, 'مستندات');
         }
         
         // ادمج جميع النتائج
         const allDocs = [];
         snapshots.forEach((snapshot, index) => {
           snapshot.docs.forEach(doc => {
             const data = doc.data();
             console.log(`📄 من الاستعلام ${index}:`, {
               id: doc.id,
               [field1]: data[field1],
               [field2]: data[field2],
               created_by: data.created_by,
               created_by_type: data.created_by_type,
               full_name: data.full_name,
               name: data.name
             });
             allDocs.push(doc);
           });
         });
         
         // تجنب التكرار
         const tempUniqueDocs = allDocs.filter((doc, index, self) => 
          index === self.findIndex(d => d.id === doc.id)
        );
         
         // فلترة اللاعبين المرتبطين بهذا الحساب فقط
         console.log(`🔍 بدء فلترة اللاعبين للحساب. نوع الحساب: ${accountType}, معرف: ${userId}`);
         console.log(`🔍 إيميل الحساب: ${user?.email}`);
         
         const filteredDocs = tempUniqueDocs.filter(doc => {
           const data = doc.data();
           const matches = {
             field1_match: data[field1] === userId,
             field2_match: data[field2] === userId,
             created_by: data.created_by === userId,
             created_by_type_match: data.created_by_type === accountType && data.created_by === userId,
             email_match: data.official_contact?.email === user?.email
           };
           
           const isMatch = matches.field1_match || matches.field2_match || matches.created_by || matches.created_by_type_match || matches.email_match;
           
           console.log(`📄 فحص اللاعب: ${data.full_name || data.name}`, {
             [`player_${field1}`]: data[field1],
             [`player_${field2}`]: data[field2],
             player_created_by: data.created_by,
             player_created_by_type: data.created_by_type,
             player_email: data.official_contact?.email,
             matches,
             isMatch
           });
           
           return isMatch;
         });
         
         console.log('🔍 اللاعبين بعد الفلترة:', filteredDocs.length);
         
         // إذا لم نجد أي لاعبين بعد الفلترة، اعرض جميع اللاعبين للتشخيص
         if (filteredDocs.length === 0 && tempUniqueDocs.length > 0) {
           console.log('⚠️ لم توجد مطابقات! سأعرض جميع اللاعبين للتشخيص...');
           uniqueDocs = tempUniqueDocs;
           console.log('🔍 جميع اللاعبين (بدون فلترة):', uniqueDocs.length);
         } else {
           uniqueDocs = filteredDocs;
         }
       }
      
      if (uniqueDocs.length > 0) {
        // تحويل البيانات للتنسيق المطلوب
        const formattedPlayers: PlayerData[] = uniqueDocs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.full_name || data.name || data.displayName || 'لاعب',
            email: data.email,
            phone: data.phone,
            position: data.primary_position || data.position,
            currentSubscription: {
              status: data.subscription_status === 'active' ? 'active' : 
                      data.subscription_status === 'expired' ? 'expired' : 'none',
              endDate: data.subscription_end ? new Date(data.subscription_end) : undefined,
              packageType: data.subscription_type
            },
            selected: false,
            selectedPackage: selectedPackage
          };
        });

        setPlayers(formattedPlayers);
      } else {
        // لا توجد لاعبين - في حالة الاعب، إنشاء ملف افتراضي
        if (accountType === 'player') {
          const defaultPlayerProfile: PlayerData = {
            id: userId,
            name: user?.displayName || user?.email?.split('@')[0] || 'ملفي الشخصي',
            email: user?.email || undefined,
            phone: '',
            position: '',
            currentSubscription: {
              status: 'none',
              endDate: undefined,
              packageType: undefined
            },
            selected: false,
            selectedPackage: selectedPackage
          };
          setPlayers([defaultPlayerProfile]);
        } else {
          setPlayers([]);
        }
      }
    } catch (error) {
      // في حالة الخطأ، قائمة فارغة
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };



  // دالة الدفع الجماعي عبر جيديا
  const handleGeideaPayment = () => {
    if (selectedCount === 0) {
      return;
    }

    // التحويل الصحيح: عملة المحلية → USD → EGP (لـ Geidea)
    let convertedAmountEGP: number;
    
    if (currentCurrency === 'EGP') {
      // إذا كانت العملة مصرية، لا حاجة للتحويل
      convertedAmountEGP = Math.round(finalPrice);
      console.log(`💰 [Bulk Payment] مصر - لا حاجة للتحويل: ${finalPrice} ج.م`);
    } else {
      // التحويل المزدوج: العملة المحلية → USD → EGP
      console.log(`🔄 [Bulk Payment] بدء التحويل المزدوج:`);
      console.log(`📋 المبلغ الأصلي: ${finalPrice} ${currency.symbol} (${currentCurrency})`);
      
      // الخطوة 1: تحويل من العملة المحلية إلى USD
      const amountInUSD = convertCurrencyLib(finalPrice, currentCurrency, 'USD', currencyRates);
      console.log(`💵 بالدولار: ${amountInUSD} USD`);
      
      // الخطوة 2: تحويل من USD إلى EGP
      const amountInEGP = convertCurrencyLib(amountInUSD, 'USD', 'EGP', currencyRates);
      convertedAmountEGP = Math.round(amountInEGP);
      
      console.log(`🇪🇬 النتيجة النهائية: ${convertedAmountEGP} ج.م`);
      console.log(`📊 تفاصيل التحويل: ${finalPrice} ${currentCurrency} → ${amountInUSD} USD → ${convertedAmountEGP} EGP`);
      
      // التحقق من صحة التحويل
      const egpRate = getCurrencyInfo('EGP', currencyRates)?.rate;
      const localRate = getCurrencyInfo(currentCurrency, currencyRates)?.rate;
      console.log(`📈 معدلات الصرف - ${currentCurrency}: ${localRate}, EGP: ${egpRate}`);
    }

    // حفظ المبلغ المحول للاستخدام في المودال
    if (typeof window !== 'undefined') {
      window.convertedAmountForGeidea = convertedAmountEGP;
    }
    
    // فتح مودال الدفع
    setShowGeideaModal(true);
  };



  // دالة معالجة فشل الدفع
  const handlePaymentFailure = (error: any) => {
    console.error('❌ فشل الدفع الجماعي:', error);
  };

  // تحديث حالة تحديد اللاعب
  const togglePlayerSelection = (playerId: string) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, selected: !player.selected }
        : player
    ));
  };

  // تحديد جميع اللاعبين أو إلغاء التحديد
  const toggleSelectAll = () => {
    const allSelected = players.every(p => p.selected);
    setPlayers(prev => prev.map(player => ({ ...player, selected: !allSelected })));
  };

  // تصفية اللاعبين حسب البحث
  const filteredPlayers = players
    .filter(player => {
      const playerName = player.name || '';
      const playerEmail = player.email || '';
      return (
        playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        playerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .filter(player => {
      switch (statusFilter) {
        case 'none':
          return player.currentSubscription.status === 'none';
        case 'expired':
          return player.currentSubscription.status === 'expired';
        case 'active':
          return player.currentSubscription.status === 'active';
        case 'upgrade':
          return isUpgradeCandidate(player);
        default:
          return true;
      }
    });

  // جلب اللاعبين عند تحميل المكون أو تغيير المستخدم
  React.useEffect(() => {
    if (user?.uid) {
      fetchPlayers();
    }
  }, [user?.uid, accountType]);

  // قراءة بلد المستخدم عند تحميل المكون
  React.useEffect(() => {
    detectUserCountry();
  }, []);

  // دالة معالجة تأكيد الدفع
  const handleConfirmPayment = async () => {
    try {
      setUploading(true);

      let receiptUrl = '';
      if (formData.receiptFile) {
        // الحصول على أسماء اللاعبين المختارين لتسمية الملف
        const selectedPlayers = players.filter(p => p.selected);
        let bulkReceiptName = 'bulk_payment_receipt';
        
        if (selectedPlayers.length === 1) {
          // إذا كان لاعب واحد، استخدم اسمه
          bulkReceiptName = selectedPlayers[0]?.name || 'single_player';
        } else if (selectedPlayers.length <= 3) {
          // إذا كان 2-3 لاعبين، استخدم أسماءهم
          bulkReceiptName = selectedPlayers.map(p => p.name).join('_و_');
        } else {
          // إذا كان أكثر من 3 لاعبين، استخدم وصف مجمع
          bulkReceiptName = `دفع_جماعي_${selectedPlayers.length}_لاعب`;
        }
        
        // تنظيف الاسم من الأحرف الخاصة
        bulkReceiptName = bulkReceiptName.replace(/[^a-zA-Z0-9\u0600-\u06FF_]/g, '_');
        
        receiptUrl = await uploadReceipt(formData.receiptFile, bulkReceiptName);
      }

      // حفظ بيانات الدفع في Firebase
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');
      
      const paymentData = {
        userId: user?.uid,
        userName: user?.displayName || user?.email || 'غير محدد',
        userEmail: user?.email || 'غير محدد',
        accountType: accountType,
        paymentMethod: 'wallet',
        packageType: selectedPackage,
        amount: finalPrice,
        currency: currentCurrency,
        playerCount: selectedCount,
        transactionId: formData.transactionId,
        senderName: formData.senderName,
        senderAccount: formData.senderAccount,
        receiptUrl: receiptUrl,
        status: 'pending',
        description: `دفع محفظة - ${selectedCount} لاعب - ${selectedPackage}`,
        createdAt: new Date(),
        players: selectedPlayers.map(p => ({ id: p.id, name: p.name })),
        metadata: {
          bulkType: 'wallet_payment',
          playersCount: selectedCount,
          originalAmount: originalTotal,
          discountAmount: totalSavings
        }
      };

      // حفظ في مجموعة bulkPayments في Firebase
      await addDoc(collection(db, 'bulkPayments'), paymentData);

      // عرض رسالة تأكيد اكتمال العملية
      toast.success('🎉 تم إرسال طلب الدفع بنجاح!', {
        description: `تم إرسال طلب دفع لـ ${selectedCount} لاعب بمبلغ ${finalPrice.toLocaleString()} ${currency.symbol}. سيتم مراجعته خلال 24 ساعة.`,
        duration: 7000,
      });

      // إعادة تعيين النموذج
      setFormData({
        transactionId: '',
        senderName: '',
        senderAccount: '',
        receiptFile: null
      });

      // إعادة تعيين اختيار اللاعبين
      setPlayers(prev => prev.map(player => ({ ...player, selected: false })));

    } catch (error) {
      console.error('خطأ في معالجة الدفع:', error);
      
      // عرض رسالة خطأ للمستخدم
      toast.error('❌ حدث خطأ في معالجة الدفع', {
        description: 'يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.',
        duration: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  // تحديد البيانات حسب البلد المختار
  const selectedCountryData = selectedCountry ? SUPPORTED_COUNTRIES[selectedCountry as keyof typeof SUPPORTED_COUNTRIES] : null;
  const currentCurrency = selectedCountryData?.currency || 'USD';
  
  // استخدام باقات مصرية خاصة أم الباقات العالمية المحولة
  const packages = selectedCountry === 'EG' ? BULK_PACKAGES_EGP : BULK_PACKAGES_USD;
  
  // معلومات العملة
  const currency = selectedCountry === 'EG' 
    ? { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' }
    : getCurrencyInfo(currentCurrency, currencyRates)
      ? { 
          code: currentCurrency, 
          symbol: getCurrencyInfo(currentCurrency, currencyRates)!.symbol,
          name: getCurrencyInfo(currentCurrency, currencyRates)!.name
        }
      : { code: 'USD', symbol: '$', name: 'دولار أمريكي' };
  
  // حساب الأسعار
  const selectedPlayers = players.filter(p => p.selected);
  const selectedCount = selectedPlayers.length;
  const currentPackage = (packages as any)[selectedPackage];
  
  // السعر الأساسي للاشتراك (مع الخصم المدمج في الباقة)
  let subscriptionPrice = currentPackage?.price || 0; // استخدم السعر المخفض
  let originalSubscriptionPrice = currentPackage?.originalPrice || 0;
  
  // تحويل للعملة المختارة (إلا مصر)
  if (selectedCountry !== 'EG') {
    subscriptionPrice = convertCurrency(subscriptionPrice, currentCurrency);
    originalSubscriptionPrice = convertCurrency(originalSubscriptionPrice, currentCurrency);
  }
  
  // حساب إجمالي للاعبين المختارين
  const subtotal = selectedCount * subscriptionPrice;
  const originalTotal = selectedCount * originalSubscriptionPrice;
  
  // ثوابت الخصم الجماعي - مُفعل
  const MIN_BULK_DISCOUNT_COUNT = 5; // 5 لاعبين أو أكثر للخصم
  const isEligibleForBulkDiscount = selectedCount >= MIN_BULK_DISCOUNT_COUNT;
  
  // خصومات الكمية للاشتراكات المتعددة - مُفعل
  let bulkDiscountPercent = 0;
  if (selectedCount >= 20) {
    bulkDiscountPercent = 15; // خصم 15% للـ20 لاعب أو أكثر
  } else if (selectedCount >= 15) {
    bulkDiscountPercent = 12; // خصم 12% للـ15-19 لاعب
  } else if (selectedCount >= 10) {
    bulkDiscountPercent = 10; // خصم 10% للـ10-14 لاعب
  } else if (selectedCount >= 5) {
    bulkDiscountPercent = 5; // خصم 5% للـ5-9 لاعب
  }
  
  const bulkDiscountAmount = isEligibleForBulkDiscount ? (subtotal * bulkDiscountPercent / 100) : 0;
  
  // طرق الدفع المتاحة حسب البلد
  const availablePaymentMethods = PAYMENT_METHODS[selectedCountry as keyof typeof PAYMENT_METHODS] || PAYMENT_METHODS.global;
  
  // خصم طريقة الدفع - مُفعل
  const paymentMethod = availablePaymentMethods.find(m => m.id === selectedPaymentMethod);
  const paymentDiscountPercent = paymentMethod?.discount || 0;
  const paymentDiscountAmount = selectedCount > 0 ? ((subtotal - bulkDiscountAmount) * paymentDiscountPercent / 100) : 0;
  
  const finalPrice = subtotal - bulkDiscountAmount - paymentDiscountAmount; // السعر النهائي مع الخصومات
  const totalSavings = bulkDiscountAmount + paymentDiscountAmount; // إجمالي التوفير

  // دالة إرسال إشعارات الموافقة على الاشتراك
  const sendSubscriptionApprovalNotifications = async (players: any[], amount: number, packageType: string) => {
    try {
      console.log('📱 إرسال إشعارات الموافقة على الاشتراك...');
      
      const messageTemplates = {
        subscriptionActivated: (player: any, amount: number, packageType: string) => 
          `🎉 تهانينا ${player.name}! تم تفعيل اشتراكك في منصة الحلم بنجاح. المبلغ: ${amount} ريال. نوع الباقة: ${packageType}. استمتع بخدماتنا المميزة!`,
        paymentPending: '⏳ جاري معالجة طلب الاشتراك الخاص بك. سنقوم بالتواصل معك قريباً.',
        paymentFailed: '❌ عذراً، حدث خطأ في معالجة طلب الاشتراك. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.'
      };

      for (const player of players) {
        try {
          // إرسال SMS للموافقة
          const notificationMessage = messageTemplates.subscriptionActivated(player, amount, packageType);
          
          if (player.phone && player.phone !== 'غير محدد') {
            await fetch('/api/beon/sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                singlePhone: player.phone,
                message: notificationMessage
              })
            });
            console.log(`✅ تم إرسال إشعار الموافقة للاعب: ${player.name}`);
          }

          // حفظ الإشعار في قاعدة البيانات
          const { addDoc, collection } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/config');
          
          await addDoc(collection(db, 'notifications'), {
            userId: player.id,
            type: 'subscription_approved',
            title: 'تم تفعيل الاشتراك',
            message: notificationMessage,
            status: 'sent',
            sentAt: new Date(),
            sentVia: 'sms',
            paymentAmount: amount,
            packageType: packageType
          });

        } catch (playerError) {
          console.error(`❌ خطأ في إرسال إشعار للاعب ${player.name}:`, playerError);
        }
      }
      
      console.log('✅ تم إرسال جميع إشعارات الموافقة');
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعارات الموافقة:', error);
    }
  };

  // دالة معالجة نجاح الدفع - defined here after all variables are available
  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      console.log('✅ نجح الدفع الجماعي:', paymentData);
      
      // إعداد بيانات الدفع للحفظ
      const bulkPaymentData = {
        user_id: user?.uid,
        account_type: accountType,
        players: selectedPlayers.map(p => ({
          id: p.id,
          name: p.name,
          package: selectedPackage,
          amount: subscriptionPrice
        })),
        total_amount: finalPrice,
        original_amount: originalTotal,
        discount_amount: totalSavings,
        payment_method: 'geidea',
        payment_status: 'completed',
        transaction_id: paymentData.sessionId || paymentData.transactionId,
        order_id: paymentData.orderId,
        country: selectedCountry,
        currency: currentCurrency,
        exchange_rate: getCurrencyInfo(currentCurrency, currencyRates)?.rate || 1,
        created_at: new Date().toISOString()
      };

      // تحديث حالة الاشتراك لكل لاعب محدد
      try {
        const { doc, setDoc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');

        // حساب تاريخ انتهاء الاشتراك (3 أشهر من الآن)
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        // تحديث اللاعبين في مجموعة players
        for (const p of selectedPlayers) {
          try {
            const playerRef = doc(db, 'players', p.id);
            await updateDoc(playerRef, {
              subscription_status: 'active',
              subscription_end: endDate.toISOString(),
              subscription_type: selectedPackage,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('⚠️ تعذر تحديث لاعب (قد لا يكون له مستند في players):', p.id);
          }
        }

        // إذا كان الحساب Player واختار نفسه، حدّث وثيقة المستخدم كذلك
        if (accountType === 'player' && user?.uid) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              subscriptionStatus: 'active',
              subscriptionEndDate: endDate,
              lastPaymentDate: new Date(),
              lastPaymentAmount: finalPrice,
              lastPaymentMethod: 'geidea',
              selectedPackage: selectedPackage,
              updatedAt: new Date(),
            });

            const subscriptionRef = doc(db, 'subscriptions', user.uid);
            await setDoc(subscriptionRef, {
              userId: user.uid,
              status: 'active',
              startDate: new Date(),
              endDate: endDate,
              paymentMethod: 'geidea',
              amount: finalPrice,
              currency: currentCurrency,
              transactionId: paymentData.sessionId || paymentData.transactionId,
              packageType: selectedPackage,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // إرسال إشعار للمستخدم نفسه إذا كان لاعب
            try {
              const userNotificationMessage = `🎉 تهانينا! تم تفعيل اشتراكك في منصة الحلم بنجاح. المبلغ: ${finalPrice} ${currentCurrency}. نوع الباقة: ${selectedPackage}. استمتع بخدماتنا المميزة!`;
              
              if (userData?.phone && userData.phone !== 'غير محدد') {
                await fetch('/api/beon/sms', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    singlePhone: userData.phone,
                    message: userNotificationMessage
                  })
                });
                console.log('✅ تم إرسال إشعار الموافقة للمستخدم');
              }

              // حفظ إشعار المستخدم
              await addDoc(collection(db, 'notifications'), {
                userId: user.uid,
                type: 'subscription_approved',
                title: 'تم تفعيل الاشتراك',
                message: userNotificationMessage,
                status: 'sent',
                sentAt: new Date(),
                sentVia: 'sms',
                paymentAmount: finalPrice,
                packageType: selectedPackage
              });
            } catch (userNotificationError) {
              console.error('❌ خطأ في إرسال إشعار المستخدم:', userNotificationError);
            }
          } catch (e) {
            console.warn('⚠️ تعذر تحديث وثيقة المستخدم');
          }
        }

        // سجل الدفع الجماعي في bulkPayments
        const { addDoc, collection } = await import('firebase/firestore');
        const bulkPaymentsRef = collection(db, 'bulkPayments');
        await addDoc(bulkPaymentsRef, {
          userId: user?.uid || 'unknown',
          sessionId: paymentData.sessionId || paymentData.transactionId,
          merchantReferenceId: paymentData.orderId || `BULK${user?.uid || 'unknown'}_${Date.now()}`,
          status: 'completed',
          amount: finalPrice,
          currency: currentCurrency,
          responseCode: '000',
          detailedResponseCode: '000',
          responseMessage: 'Success',
          detailedResponseMessage: 'The operation was successful',
          paymentMethod: 'geidea',
          selectedPackage: selectedPackage || 'subscription_3months',
          players: selectedPlayers.map(p => ({ id: p.id, name: p.name })),
          accountType: accountType, // إضافة نوع الحساب
          customerEmail: user?.email || 'unknown@example.com',
          customerName: user?.displayName || 'Unknown Customer',
          customerPhone: userData?.phone || user?.phoneNumber || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // سجل الدفع الجماعي في bulk_payments أيضاً
        try {
          const bulkPaymentsNewRef = collection(db, 'bulk_payments');
          await addDoc(bulkPaymentsNewRef, {
            userId: user?.uid || 'unknown',
            orderId: paymentData.orderId || `BULK${user?.uid || 'unknown'}_${Date.now()}`,
            sessionId: paymentData.sessionId || paymentData.transactionId,
            amount: finalPrice,
            currency: currentCurrency,
            customerEmail: user?.email || 'unknown@example.com',
            customerName: user?.displayName || 'Unknown Customer',
            customerPhone: userData?.phone || user?.phoneNumber || '',
            paymentStatus: 'success',
            statusMessage: 'تم الدفع بنجاح',
            merchantReferenceId: paymentData.orderId || `BULK${user?.uid || 'unknown'}_${Date.now()}`,
            accountType: accountType, // إضافة نوع الحساب
            players: selectedPlayers.map(p => ({
              userId: p.id,
              playerName: p.name,
              playerEmail: user?.email || 'unknown@example.com',
              playerPhone: null,
              amount: finalPrice / selectedPlayers.length,
              packageType: selectedPackage || 'subscription_3months',
              notes: 'دفعة جماعية'
            })),
            totalPlayers: selectedPlayers.length,
            isMultiPlayerPayment: selectedPlayers.length > 1,
            paymentMethod: 'geidea',
            responseCode: '000',
            detailedResponseCode: '000',
            responseMessage: 'Success',
            detailedResponseMessage: 'The operation was successful',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            isTest: true
          });
          console.log('✅ تم حفظ البيانات في bulk_payments أيضاً');
        } catch (bulkError) {
          console.error('❌ فشل حفظ البيانات في bulk_payments:', bulkError);
        }

        console.log('✅ تم تحديث حالة اشتراك اللاعبين بنجاح');
        
        // إرسال إشعارات للموافقة على الاشتراك
        try {
          await sendSubscriptionApprovalNotifications(selectedPlayers, finalPrice, selectedPackage);
        } catch (notificationError) {
          console.error('❌ خطأ في إرسال الإشعارات:', notificationError);
        }
      } catch (subscriptionError) {
        console.error('❌ خطأ في تحديث اشتراكات اللاعبين:', subscriptionError);
      }

      // حفظ بيانات الدفع الجماعي - محاولة حفظ مع معالجة أخطاء محسنة
      let savedSuccessfully = false;
      
      try {
        // حفظ البيانات في Firebase فقط
        const bulkPaymentsRef = collection(db, 'bulkPayments');
        const paymentRecord = {
          userId: user?.uid || 'unknown',
          sessionId: paymentData.sessionId || paymentData.transactionId,
          merchantReferenceId: paymentData.orderId || `BULK${user?.uid || 'unknown'}_${Date.now()}`,
          status: 'completed',
          amount: finalPrice,
          currency: currentCurrency,
          responseCode: '000',
          detailedResponseCode: '000',
          responseMessage: 'Success',
          detailedResponseMessage: 'The operation was successful',
          paymentMethod: 'geidea',
          selectedPackage: selectedPackage || 'subscription_3months',
          players: selectedPlayers.map(p => ({ id: p.id, name: p.name })),
          accountType: accountType, // إضافة نوع الحساب
          customerEmail: user?.email || 'unknown@example.com',
          customerName: user?.displayName || 'Unknown Customer',
          customerPhone: userData?.phone || user?.phoneNumber || '',
          createdAt: new Date()
        };
        
        await addDoc(bulkPaymentsRef, paymentRecord);
        console.log('✅ تم حفظ البيانات في Firebase');
        savedSuccessfully = true;
      } catch (e) {
        console.error('❌ فشل حفظ بيانات الدفع في Firebase:', e);
        
        // محاولة ثانية مع بيانات مبسطة
        try {
          const simpleBulkPaymentData = {
            userId: user?.uid || 'unknown',
            sessionId: paymentData.sessionId || paymentData.transactionId,
            merchantReferenceId: paymentData.orderId || `BULK${user?.uid || 'unknown'}_${Date.now()}`,
            status: 'completed',
            amount: finalPrice,
            currency: currentCurrency,
            responseCode: '000',
            detailedResponseCode: '000',
            responseMessage: 'Success',
            detailedResponseMessage: 'The operation was successful',
            paymentMethod: 'geidea',
            selectedPackage: selectedPackage || 'subscription_3months',
            players: selectedPlayers.map(p => ({ id: p.id, name: p.name })),
            accountType: accountType, // إضافة نوع الحساب
            customerEmail: user?.email || 'unknown@example.com',
            customerName: user?.displayName || 'Unknown Customer',
            customerPhone: userData?.phone || user?.phoneNumber || '',
            createdAt: new Date()
          };
          
          const bulkPaymentsRef = collection(db, 'bulkPayments');
          await addDoc(bulkPaymentsRef, simpleBulkPaymentData);
          console.log('✅ تم حفظ البيانات المبسطة في Firebase');
          savedSuccessfully = true;
        } catch (secondError) {
          console.error('❌ فشل حفظ البيانات المبسطة أيضاً:', secondError);
        }
      }

      if (savedSuccessfully) {
        // إعادة تعيين التحديدات
        setSelectedPlayerIds([]);
        setTotalAmount(0);
        
        // إعادة تحميل قائمة اللاعبين
        loadPlayers();
        
        // توجيه المستخدم لصفحة حالة الاشتراك
        setTimeout(() => {
          window.location.href = '/dashboard/player/subscription-status';
        }, 2000);
      } else {
        throw new Error('فشل في حفظ البيانات');
      }
      
    } catch (error) {
      console.error('خطأ في معالجة الدفع:', error);
      
      // تسجيل الخطأ للتتبع
      console.error('خطأ في حفظ بيانات الدفع:', error);
    }
  };

  // إعادة تعيين النموذج عند تغيير طريقة الدفع
  const handlePaymentMethodChange = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setFormData({
      transactionId: '',
      senderName: '',
      senderAccount: '',
      receiptFile: null
    });
  };

  const getPackageColors = (color: string, isSelected: boolean) => {
    const colors = {
      blue: {
        bg: isSelected ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-white hover:bg-blue-50',
        border: isSelected ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-gray-200 hover:border-blue-300',
        text: isSelected ? 'text-white' : 'text-gray-900',
        subtext: isSelected ? 'text-blue-100' : 'text-gray-600',
        badge: 'bg-blue-500'
      },
      purple: {
        bg: isSelected ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-white hover:bg-purple-50',
        border: isSelected ? 'border-purple-500 ring-4 ring-purple-500/20' : 'border-gray-200 hover:border-purple-300',
        text: isSelected ? 'text-white' : 'text-gray-900',
        subtext: isSelected ? 'text-purple-100' : 'text-gray-600',
        badge: 'bg-purple-500'
      },
      emerald: {
        bg: isSelected ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-white hover:bg-emerald-50',
        border: isSelected ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-gray-200 hover:border-emerald-300',
        text: isSelected ? 'text-white' : 'text-gray-900',
        subtext: isSelected ? 'text-emerald-100' : 'text-gray-600',
        badge: 'bg-emerald-500'
      }
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br to-blue-50 from-slate-50" dir="rtl">
      {/* Header محسن */}
      <div className="bg-white border-b shadow-sm">
        <div className="container px-6 py-8 mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex gap-3 justify-center items-center mb-4">
              <Crown className="w-10 h-10 text-yellow-500" />
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600">
                إدارة الاشتراكات الذكية
              </h1>
              <Sparkles className="w-10 h-10 text-yellow-500" />
            </div>
            <p className="mb-6 text-xl text-gray-600">
              اشترك الآن • أسعار محلية • دفع جماعي ذكي
            </p>
            <div className="flex flex-wrap gap-4 justify-center items-center text-sm">
              <div className="px-4 py-2 font-medium text-blue-800 bg-blue-100 rounded-full">
                🏢 {accountType === 'club' ? 'نادي' : 
                    accountType === 'academy' ? 'أكاديمية' : 
                    accountType === 'trainer' ? 'مدرب' : 'وكيل'}
              </div>
              <div className="px-4 py-2 font-medium text-emerald-800 bg-emerald-100 rounded-full">
                👥 {selectedCount} لاعب مختار
              </div>
              <div className="px-4 py-2 font-medium text-purple-800 bg-purple-100 rounded-full">
                {selectedCountryData?.flag} {currency.code}
              </div>
            </div>
            
            {/* اختيار الدولة والعملة */}
            <div className="mx-auto mt-6 max-w-md">
              <div className="p-4 bg-white rounded-xl border shadow-md">
                <div className="flex gap-3 items-center mb-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">اختر دولتك</h3>
                    <p className="text-xs text-gray-500">
                      {detectedCountry ? `تم اكتشاف: ${SUPPORTED_COUNTRIES[detectedCountry as keyof typeof SUPPORTED_COUNTRIES]?.name}` : 'لتحديد العملة والأسعار'}
                    </p>
                  </div>
                  
                  {/* مؤشر حالة أسعار العملات */}
                  <div className="flex gap-2 items-center">
                    {ratesLoading ? (
                      <div className="w-4 h-4 rounded-full border-t-2 border-blue-600 animate-spin"></div>
                    ) : ratesError ? (
                      <div className="text-red-500" title={ratesError}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="text-green-500" title="أسعار محدثة">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    )}
                    
                    {/* زر تحديث الأسعار */}
                    <button
                      onClick={refreshCurrencyRates}
                      disabled={ratesLoading}
                      className="p-1 text-gray-500 transition-colors hover:text-blue-600 disabled:opacity-50"
                      title="تحديث أسعار العملات"
                    >
                      <RefreshCw className={`w-4 h-4 ${ratesLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  
                  {currencyLoading && (
                    <div className="w-4 h-4 rounded-full border-t-2 border-blue-600 animate-spin"></div>
                  )}
                </div>
                <label htmlFor="country-select" className="sr-only">الدولة</label>
                <select
                  id="country-select"
                  value={selectedCountry || ''}
                  onChange={(e) => setSelectedCountry(e.target.value || null)}
                  className="px-3 py-2 w-full bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={currencyLoading}
                  aria-label="اختر الدولة"
                  title="اختر الدولة"
                >
                  {Object.entries(SUPPORTED_COUNTRIES).map(([code, country]) => (
                    <option key={code} value={code}>
                      {country.flag} {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
                
                {/* معلومات حالة الأسعار */}
                {!ratesLoading && !ratesError && lastRatesUpdate && (
                  <div className="p-2 mt-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-700">
                      📊 آخر تحديث للأسعار: {new Date(lastRatesUpdate).toLocaleString('ar-EG')}
                    </p>
                  </div>
                )}
                
                {ratesError && (
                  <div className="p-2 mt-2 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs font-medium text-red-700">
                      ⚠️ خطأ في تحديث الأسعار - يتم استخدام أسعار افتراضية
                    </p>
                  </div>
                )}
                
                {selectedCountry === 'EG' && (
                  <div className="p-2 mt-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-medium text-green-700">
                      🇪🇬 أسعار خاصة بمصر بالجنيه المصري
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-6 py-8 mx-auto">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* الباقات - 8 أعمدة */}
          <div className="xl:col-span-8">
            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-center text-gray-900">
                اختر مدة الاشتراك المناسبة
              </h2>
              <p className="text-center text-gray-600">أسعار تنافسية مع ميزات متطورة لكل فترة</p>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
              {Object.entries(packages).map(([key, pkg]) => {
                const isSelected = selectedPackage === key;
                const colors = getPackageColors(pkg.color, isSelected);
                
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedPackage(key)}
                    className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300 transform hover:scale-105 ${colors.bg} ${colors.border}`}
                  >
                    {/* شارة الشعبية */}
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 z-10 transform -translate-x-1/2">
                        <div className="px-4 py-1 text-sm font-bold text-white bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-lg">
                          ⭐ الأكثر شعبية
                        </div>
                      </div>
                    )}

                    {/* علامة الاختيار */}
                    {isSelected && (
                      <div className="absolute top-4 left-4">
                        <div className="flex justify-center items-center w-8 h-8 text-green-600 bg-white rounded-full shadow-lg">
                          <Check className="w-5 h-5" />
                        </div>
                      </div>
                    )}

                    <div className="text-center">
                      {/* الأيقونة */}
                      <div className="mb-3 text-4xl">{pkg.icon}</div>
                      
                      {/* العنوان */}
                      <h3 className={`text-xl font-bold mb-1 ${colors.text}`}>
                        {pkg.title}
                      </h3>
                      <p className={`text-sm mb-4 ${colors.subtext}`}>
                        {pkg.subtitle}
                      </p>

                      {/* السعر */}
                      <div className="mb-4">
                        <div className="flex gap-2 justify-center items-center mb-1">
                          <span className={`text-3xl font-black ${colors.text}`}>
                            {selectedCountry === 'EG' ? pkg.price : convertCurrency(pkg.price, currentCurrency)} {currency.symbol}
                          </span>
                          {/* السعر الأصلي مشطوب */}
                          <span className="text-lg text-gray-400 line-through">
                            {selectedCountry === 'EG' ? pkg.originalPrice : convertCurrency(pkg.originalPrice, currentCurrency)} {currency.symbol}
                          </span>
                        </div>
                        <p className={`text-sm ${colors.subtext}`}>
                          {pkg.period}
                          {selectedCountry !== 'EG' && (
                            <span className="block text-xs opacity-75">
                              (${pkg.price} USD بدلاً من ${pkg.originalPrice} USD)
                            </span>
                          )}
                        </p>
                      </div>

                      {/* شارة الخصم */}
                      <div className="mb-4 space-y-2">
                        <div className="px-3 py-1 text-sm font-bold text-white bg-green-500 rounded-full">
                          وفر {pkg.discount}
                        </div>
                        <span className={`${colors.badge} text-white px-3 py-1 rounded-full text-sm font-bold`}>
                          {pkg.period}
                        </span>
                      </div>

                      {/* مميزات المدة */}
                      <div className={`mb-4 p-3 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-50'}`}>
                        <p className={`text-sm font-medium ${colors.text}`}>
                          ⏳ {pkg.period} - لاعبين غير محدود
                        </p>
                      </div>

                      {/* عرض مختصر للميزات */}
                      <div className={`text-xs ${colors.subtext} text-right space-y-1`}>
                        {pkg.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <Check className="flex-shrink-0 w-3 h-3" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        <div className={`font-bold mt-2 ${isSelected ? colors.text : 'text-blue-600'}`}>
                          +{pkg.features.length - 3} ميزة إضافية
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* قسم الميزات التفصيلية */}
            {selectedPackage && (
              <div className="overflow-hidden bg-gradient-to-br to-blue-50 rounded-2xl border border-gray-200 shadow-lg from-slate-50">
                {/* Header قابل للضغط */}
                <div 
                  className="p-6 transition-colors cursor-pointer hover:bg-blue-50"
                  onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="flex gap-3 items-center text-xl font-bold text-slate-800">
                      <span className="text-2xl">✨</span>
                      <span>ماذا ستحصل عليه مع {(packages as any)[selectedPackage].title}</span>
                    </h3>
                    <div className="flex gap-3 items-center">
                      <span className="hidden text-sm text-gray-600 sm:block">
                        {isFeaturesExpanded ? 'إخفاء التفاصيل' : 'عرض جميع الميزات'}
                      </span>
                      <div className={`p-2 rounded-full bg-white shadow-md transition-transform duration-300 ${isFeaturesExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-gray-700" />
                      </div>
                    </div>
                  </div>
                  
                  {/* معلومات مختصرة عندما يكون مطوي */}
                  {!isFeaturesExpanded && (
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div className="p-3 rounded-lg bg-white/70">
                        <span className="font-semibold text-blue-700">الميزات الأساسية:</span>
                        <span className="mr-2 text-gray-600">{(packages as any)[selectedPackage].features.length} ميزة</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white/70">
                        <span className="font-semibold text-purple-700">المكافآت الحصرية:</span>
                        <span className="mr-2 text-gray-600">{(packages as any)[selectedPackage].bonusFeatures.length} مكافأة</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* المحتوى القابل للطوي */}
                <div className={`transition-all duration-500 ease-in-out ${
                  isFeaturesExpanded 
                    ? 'opacity-100 max-h-[2000px]' 
                    : 'overflow-hidden max-h-0 opacity-0'
                }`}>
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* الميزات الأساسية */}
                      <div className="p-6 bg-white rounded-xl shadow-md">
                        <h4 className="flex gap-3 items-center mb-6 text-xl font-bold text-blue-700">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Star className="w-6 h-6 text-blue-600" />
                          </div>
                          الميزات الأساسية
                        </h4>
                        <div className="space-y-3">
                          {(packages as any)[selectedPackage].features.map((feature: string, index: number) => (
                            <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                              <div className="bg-green-100 p-1 rounded-full mt-0.5">
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="flex-1 text-sm font-medium text-slate-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* المكافآت الحصرية */}
                      <div className="p-6 bg-white rounded-xl shadow-md">
                        <h4 className="flex gap-3 items-center mb-6 text-xl font-bold text-purple-700">
                          <div className="p-2 bg-purple-100 rounded-full">
                            <Gift className="w-6 h-6 text-purple-600" />
                          </div>
                          المكافآت الحصرية
                        </h4>
                        <div className="space-y-3">
                          {(packages as any)[selectedPackage].bonusFeatures.map((bonus: string, index: number) => (
                            <div key={index} className="flex gap-3 items-start p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg transition-colors hover:from-yellow-100 hover:to-orange-100">
                              <div className="bg-yellow-100 p-1 rounded-full mt-0.5">
                                <Star className="w-4 h-4 text-yellow-600" />
                              </div>
                              <span className="flex-1 text-sm font-medium text-slate-700">{bonus}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* رسالة تحفيزية */}
                    <div className="p-6 mt-6 text-center text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                      <h5 className="mb-2 text-lg font-bold">🎯 استثمار ذكي في مستقبل مؤسستك</h5>
                      <p className="text-blue-100">احصل على جميع هذه الميزات والمكافآت بسعر مخفض لفترة محدودة</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* الملخص والدفع - 4 أعمدة */}
          <div className="space-y-6 xl:col-span-4">
            {/* إدارة اللاعبين */}
            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="flex gap-2 items-center text-lg font-bold text-gray-900">
                  <Users className="w-5 h-5" />
                  إدارة اللاعبين ({players.length})
                </h3>
                <div className="flex gap-2 items-center">
                  <Link href={`/dashboard/${accountType}/players`}>
                    <button
                      className="p-2 text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                      title="إدارة اللاعبين"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href={`/dashboard/${accountType}/players/add`}>
                    <button
                      className="p-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                      title="إضافة لاعب جديد"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* البحث والإجراءات */}
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو الإيميل..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="py-2 pr-10 pl-4 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-1 text-sm bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
                  >
                    {players.length > 0 && players.every(p => p.selected) ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                  <div className="px-3 py-1 text-xs text-gray-500">
                    {selectedCount} من {players.length} محدد
                  </div>
                </div>
              </div>

              {/* قائمة اللاعبين */}
              <div className="overflow-y-auto space-y-2 max-h-64">
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="w-6 h-6 rounded-full border-t-2 border-blue-600 animate-spin"></div>
                    <span className="mr-2 text-gray-600">جاري تحميل اللاعبين...</span>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="py-8 text-center">
                    {searchTerm ? (
                      <div className="text-gray-500">
                        <Search className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                        <p>لم يتم العثور على لاعبين</p>
                        <p className="mt-1 text-sm">جرب البحث بكلمة أخرى</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                          <div className="text-center">
                            <Users className="mx-auto mb-3 w-12 h-12 text-blue-500" />
                            <h3 className="mb-2 text-lg font-bold text-gray-800">لا يوجد لاعبين بعد</h3>
                            <p className="mb-4 text-gray-600">ابدأ بإضافة لاعبين للاستفادة من النظام والخصومات الجماعية</p>
                            <div className="space-y-2 text-sm text-left">
                              <div className="p-3 bg-white rounded-lg">
                                <p className="mb-2 font-medium text-blue-800">🎯 فوائد إضافة اللاعبين:</p>
                                <div className="space-y-1 text-gray-700">
                                  <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>خصومات جماعية حتى 15%</span>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>إدارة مركزية للاشتراكات</span>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span>تقارير وإحصائيات شاملة</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4">
                              <Link href={`/dashboard/${accountType}/players/add`}>
                                <button className="flex gap-2 items-center px-6 py-3 mx-auto font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700">
                                  <Plus className="w-4 h-4" />
                                  إضافة أول لاعب
                                </button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <div 
                      key={player.id} 
                      className={`p-3 border border-gray-200 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        player.selected ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => togglePlayerSelection(player.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-start">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                            player.selected 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'border-gray-300 hover:border-blue-400'
                          }`}>
                            {player.selected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex gap-2 items-center">
                              <span className="font-medium text-gray-900">{player.name}</span>
                            </div>
                            {player.email && (
                              <p className="mt-1 text-xs text-gray-500">{player.email}</p>
                            )}
                            <div className="flex gap-2 items-center mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                player.currentSubscription.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : player.currentSubscription.status === 'expired'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {player.currentSubscription.status === 'active' ? 'نشط' : 
                                 player.currentSubscription.status === 'expired' ? 'منتهي' : 'بدون اشتراك'}
                              </span>
                              {player.currentSubscription.endDate && (
                                <span className="text-xs text-gray-500">
                                  حتى {player.currentSubscription.endDate.toLocaleDateString('ar-EG')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ملخص الاختيار */}
              {selectedCount > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-800">
                        تم اختيار {selectedCount} لاعب
                      </span>
                      <span className="text-sm font-bold text-green-700">
                        {(selectedCount * subscriptionPrice).toLocaleString()} {currency.symbol}
                        {selectedCountry !== 'EG' && (
                          <span className="block text-xs opacity-75">
                            (${(selectedCount * currentPackage.originalPrice)} USD)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* رسائل الخصم الجماعي */}
                  {isEligibleForBulkDiscount && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <div className="flex gap-2 items-center">
                        <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-full">
                          <span className="text-lg">🎉</span>
                              </div>
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            خصم جماعي {bulkDiscountPercent}%! وفر {bulkDiscountAmount.toLocaleString()} {currency.symbol}
                          </p>
                          <p className="text-xs text-green-600">
                            {selectedCount >= 20 && "خصم ممتاز للمجموعات الكبيرة"}
                            {selectedCount >= 15 && selectedCount < 20 && "خصم رائع للمجموعات"}
                            {selectedCount >= 10 && selectedCount < 15 && "خصم جيد للدفع الجماعي"}
                            {selectedCount >= 5 && selectedCount < 10 && "خصم للمجموعات الصغيرة"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isEligibleForBulkDiscount && selectedCount > 0 && selectedCount < MIN_BULK_DISCOUNT_COUNT && (
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg border border-blue-200">
                      <div className="flex gap-2 items-center">
                        <div className="flex justify-center items-center w-8 h-8 bg-blue-100 rounded-full">
                          <span className="text-lg">💡</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            أضف {MIN_BULK_DISCOUNT_COUNT - selectedCount} لاعب آخر واحصل على خصم 5%!
                          </p>
                          <p className="text-xs text-blue-600">
                            الخصومات تبدأ من {MIN_BULK_DISCOUNT_COUNT} لاعبين أو أكثر
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* طرق الدفع */}
            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-gray-900">
                <CreditCard className="w-5 h-5" />
                طريقة الدفع
              </h3>
              <div className="space-y-3">
                {availablePaymentMethods.filter(method => method.popular || selectedPaymentMethod === method.id).map((method) => (
                  <div
                    key={method.id}
                    onClick={() => handlePaymentMethodChange(method.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedPaymentMethod === method.id 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3 items-center">
                        <span className="text-2xl">{method.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{method.name}</h4>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                      </div>
                      {/* شارة خصم طريقة الدفع */}
                      {method.discount > 0 && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 text-xs text-white bg-green-500 rounded-full">
                          خصم {method.discount}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ملخص التكلفة */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xl">
              <h3 className="flex gap-2 items-center mb-6 text-xl font-bold text-gray-800">
                <Trophy className="w-6 h-6 text-yellow-500" />
                ملخص التكلفة
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">عدد اللاعبين:</span>
                  <span className="font-medium text-gray-800">
                    {selectedCount} لاعب
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">سعر الاشتراك للواحد:</span>
                  <span className="font-medium text-gray-800">
                    {subscriptionPrice.toLocaleString()} {currency.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-medium text-gray-800">
                    {subtotal.toLocaleString()} {currency.symbol}
                  </span>
                </div>
                
                {/* عرض الخصومات */}
                {bulkDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>خصم جماعي ({bulkDiscountPercent}%):</span>
                    <span>-{bulkDiscountAmount.toLocaleString()} {currency.symbol}</span>
                  </div>
                )}
                
                {paymentDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>خصم طريقة الدفع ({paymentDiscountPercent}%):</span>
                    <span>-{paymentDiscountAmount.toLocaleString()} {currency.symbol}</span>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-2xl font-bold">
                    <span className="text-gray-800">الإجمالي النهائي:</span>
                    <span className="text-blue-600">{finalPrice.toLocaleString()} {currency.symbol}</span>
                  </div>
                  {totalSavings > 0 && (
                  <p className="mt-2 text-sm text-center text-green-600">
                      💰 وفرت {totalSavings.toLocaleString()} {currency.symbol}
                    </p>
                  )}
                  {totalSavings === 0 && (
                    <p className="mt-2 text-sm text-center text-gray-600">
                      📊 المبلغ الإجمالي شامل الأسعار المخفضة
                    </p>
                  )}
                </div>
              </div>

              {selectedCount >= 1 ? (
                <div className="mt-6 space-y-4">
                  {/* تنبيه الخصم */}
                  {paymentDiscountAmount > 0 && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex gap-2 items-center">
                        <div className="flex justify-center items-center w-6 h-6 bg-green-100 rounded-full">
                          <span className="text-sm">💰</span>
                        </div>
                        <p className="text-sm font-medium text-green-800">
                          خصم إضافي {paymentDiscountPercent}% على {paymentMethod?.name} = توفير {paymentDiscountAmount.toLocaleString()} {currency.symbol}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* أزرار الدفع حسب الطريقة */}
                  {selectedPaymentMethod === 'geidea' && (
                    <button 
                      onClick={handleGeideaPayment}
                      className="px-6 py-4 w-full font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg transition-all transform hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:scale-105"
                    >
                      <div className="flex gap-3 justify-center items-center">
                        <CreditCard className="w-5 h-5" />
                        <span>ادفع بالبطاقة - {finalPrice.toLocaleString()} {currency.symbol}</span>
                      </div>
                      <div className="mt-1 text-sm opacity-90">
                        دفع آمن ومشفر عبر جيديا
                      </div>
                    </button>
                  )}

                  {['vodafone_cash', 'etisalat_cash', 'instapay'].includes(selectedPaymentMethod) && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="flex gap-2 items-center mb-3 font-bold text-blue-800">
                          <Smartphone className="w-5 h-5" />
                          تعليمات الدفع - {availablePaymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
                        </h4>
                        <div className="space-y-2 text-sm text-blue-700">
                          {selectedPaymentMethod === 'vodafone_cash' && (
                            <>
                              <p>• اتصل بـ *9# واختر الدفع للتجار</p>
                              <p>• أو استخدم تطبيق My Vodafone</p>
                              <p>• رقم التاجر: <span className="px-2 py-1 font-mono bg-white rounded">01017799580</span></p>
                            </>
                          )}
                          {selectedPaymentMethod === 'etisalat_cash' && (
                            <>
                              <p>• اتصل بـ #555* واختر الدفع للتجار</p>
                              <p>• أو استخدم تطبيق etisalat cash</p>
                              <p>• رقم التاجر: <span className="px-2 py-1 font-mono bg-white rounded">01017799580</span></p>
                            </>
                          )}
                          {selectedPaymentMethod === 'instapay' && (
                            <>
                              <p>• افتح تطبيق البنك الخاص بك</p>
                              <p>• اختر InstaPay من القائمة</p>
                              <p>• رقم المحفظة: <span className="px-2 py-1 font-mono bg-white rounded">01017799580</span></p>
                              <p>• اسم المستفيد: <span className="px-2 py-1 font-mono bg-white rounded">منصة النادي</span></p>
                            </>
                          )}
                          <p className="font-bold">• المبلغ: <span className="text-lg">{finalPrice.toLocaleString()} {currency.symbol}</span></p>
                        </div>
                      </div>

                      {/* نموذج رفع الإيصال */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <h5 className="mb-3 font-bold text-gray-800">📄 رفع إيصال الدفع</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">
                              رقم العملية / المرجع
                            </label>
                            <input
                              type="text"
                              value={formData.transactionId}
                              onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                              placeholder="أدخل رقم العملية من الإيصال"
                              className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">
                              رفع صورة الإيصال
                            </label>
                            <p className="mb-2 text-xs text-gray-500">
                              💡 سيتم حفظ الإيصال في: Supabase/wallet/معرف_المستخدم/اسم_اللاعب.jpg
                            </p>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => setFormData(prev => ({ ...prev, receiptFile: e.target.files?.[0] || null }))}
                                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  required
                                  aria-label="رفع صورة الإيصال"
                                  title="رفع صورة الإيصال"
                                />
                                {formData.receiptFile && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      toast.success('🔍 ميزة قراءة الإيصال قيد التطوير...');
                                      console.log('📄 سيتم إضافة ميزة OCR قريباً');
                                    }}
                                    disabled={uploading}
                                    className="flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    title="قراءة النص من الإيصال تلقائياً (قيد التطوير)"
                                  >
                                    <Eye className="w-4 h-4" />
                                    قراءة
                                  </button>
                                )}
                              </div>
                              {formData.receiptFile && (
                                <div className="flex gap-2 items-center text-sm text-green-600">
                                  <FileImage className="w-4 h-4" />
                                  <span>{formData.receiptFile.name}</span>
                                </div>
                              )}
                              {uploading && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>جاري الرفع...</span>
                                    <span>{Math.round(uploadProgress)}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full">
                                    <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={handleConfirmPayment}
                            disabled={uploading || !formData.transactionId || !formData.receiptFile}
                            className="px-4 py-3 w-full font-bold text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {uploading ? (
                              <div className="flex gap-2 justify-center items-center">
                                <div className="w-4 h-4 rounded-full border-t-2 border-white animate-spin"></div>
                                جاري المعالجة...
                              </div>
                            ) : (
                              <>
                                <Upload className="inline mr-2 w-4 h-4" />
                                تأكيد الدفع ورفع الإيصال
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMethod === 'bank_transfer' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <h4 className="flex gap-2 items-center mb-3 font-bold text-green-800">
                          <Wallet className="w-5 h-5" />
                          بيانات التحويل البنكي
                        </h4>
                        <div className="space-y-2 text-sm text-green-700">
                          <p>• اسم البنك: <span className="px-2 py-1 font-mono bg-white rounded">البنك الأهلي المصري</span></p>
                          <p>• رقم الحساب: <span className="px-2 py-1 font-mono bg-white rounded">1234567890123456</span></p>
                          <p>• اسم المستفيد: <span className="px-2 py-1 font-mono bg-white rounded">شركة منصة النادي</span></p>
                          <p>• الرقم القومي: <span className="px-2 py-1 font-mono bg-white rounded">12345678901234</span></p>
                          <p className="font-bold">• المبلغ: <span className="text-lg">{finalPrice.toLocaleString()} {currency.symbol}</span></p>
                        </div>
                      </div>

                      {/* نموذج بيانات التحويل */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <h5 className="mb-3 font-bold text-gray-800">🏦 بيانات التحويل</h5>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block mb-1 text-sm font-medium text-gray-700">
                                اسم المحول
                              </label>
                              <input
                                type="text"
                                value={formData.senderName}
                                onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                                placeholder="اسم المحول"
                                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block mb-1 text-sm font-medium text-gray-700">
                                رقم الحساب المحول منه
                              </label>
                              <input
                                type="text"
                                value={formData.senderAccount}
                                onChange={(e) => setFormData(prev => ({ ...prev, senderAccount: e.target.value }))}
                                placeholder="رقم الحساب"
                                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">
                              رقم العملية
                            </label>
                            <input
                              type="text"
                              value={formData.transactionId}
                              onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                              placeholder="رقم العملية من إيصال التحويل"
                              className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">
                              رفع إيصال التحويل
                            </label>
                            <p className="mb-2 text-xs text-gray-500">
                              💡 سيتم حفظ الإيصال في: Supabase/wallet/معرف_المستخدم/دفع_جماعي_N_لاعب.jpg
                            </p>
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => setFormData(prev => ({ ...prev, receiptFile: e.target.files?.[0] || null }))}
                                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                                aria-label="رفع إيصال التحويل"
                                title="رفع إيصال التحويل"
                              />
                              {formData.receiptFile && (
                                <div className="flex gap-2 items-center text-sm text-green-600">
                                  <FileImage className="w-4 h-4" />
                                  <span>{formData.receiptFile.name}</span>
                                </div>
                              )}
                              {uploading && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>جاري الرفع...</span>
                                    <span>{Math.round(uploadProgress)}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full">
                                    <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={handleConfirmPayment}
                            disabled={uploading || !formData.transactionId || !formData.receiptFile || !formData.senderName}
                            className="px-4 py-3 w-full font-bold text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {uploading ? (
                              <div className="flex gap-2 justify-center items-center">
                                <div className="w-4 h-4 rounded-full border-t-2 border-white animate-spin"></div>
                                جاري المعالجة...
                              </div>
                            ) : (
                              <>
                                <Upload className="inline mr-2 w-4 h-4" />
                                إرسال بيانات التحويل
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 mt-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto mb-3 w-8 h-8 text-orange-500" />
                    <h4 className="mb-2 text-lg font-bold text-orange-800">لا يمكن المتابعة</h4>
                    <p className="mb-4 text-orange-700">
                      يرجى اختيار لاعب واحد على الأقل لإتمام عملية الدفع
                    </p>
                    <div className="p-4 mb-4 bg-white rounded-lg">
                      <p className="mb-2 text-sm text-gray-700">للمتابعة قم بـ:</p>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex gap-2 justify-center items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>اختيار لاعب موجود من القائمة</span>
                        </div>
                        <div className="flex gap-2 justify-center items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>أو إضافة لاعب جديد</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 justify-center sm:flex-row">
                      <Link href={`/dashboard/${accountType}/players`}>
                        <button className="flex gap-2 items-center px-4 py-2 font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700">
                          <ExternalLink className="w-4 h-4" />
                          إدارة اللاعبين
                        </button>
                      </Link>
                      <Link href={`/dashboard/${accountType}/players/add`}>
                        <button className="flex gap-2 items-center px-4 py-2 font-medium text-white bg-orange-600 rounded-lg transition-colors hover:bg-orange-700">
                          <Plus className="w-4 h-4" />
                          إضافة لاعب الآن
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Modal الدفع عبر جيديا */}
              <GeideaPaymentModal
          visible={showGeideaModal}
          onRequestClose={() => setShowGeideaModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          amount={typeof window !== 'undefined' && window.convertedAmountForGeidea ? window.convertedAmountForGeidea : Math.round(finalPrice)} // استخدام المبلغ المحول الصحيح
                  currency="EGP"
          title="اشتراكات اللاعبين"
          description={`تجديد اشتراكات ${selectedCount} لاعب بإجمالي ${finalPrice.toLocaleString()} ${currency.symbol}`}
        customerEmail={user?.email || 'customer@example.com'}
        merchantReferenceId={`BULK${user?.uid || 'unknown'}_${Date.now()}`}
      />
    </div>
  );
}

 
