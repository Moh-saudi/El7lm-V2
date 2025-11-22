"use client";

import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import {
    AlertCircle,
    ArrowLeft,
    Award,
    Check,
    Clock,
    CreditCard,
    Crown,
    DollarSign,
    Download,
    ExternalLink,
    FileImage,
    Gift,
    Home,
    Printer,
    RefreshCw,
    Star,
    Trophy,
    Users,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';

import { getCurrencyRates } from '@/lib/currency-rates';
import { auth, db } from '@/lib/firebase/config';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION } from '@/types/referral';
import dynamic from 'next/dynamic';

// استخدام التخطيط الجديد
const ResponsiveLayoutWrapper = dynamic(() => import('@/components/layout/ResponsiveLayout'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
        <p className="text-gray-600">جاري تحميل لوحة التحكم...</p>
      </div>
    </div>
  )
});

interface SubscriptionStatus {
  plan_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  payment_method: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  receipt_url?: string;
  receipt_uploaded_at?: string;
  autoRenew: boolean;
  transaction_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address?: string;
  tax_number?: string;
  payment_date: string;
  accountType?: string;
  packageType?: string;
  selectedPackage?: string;
}

interface PlayerRewards {
  playerId: string;
  totalPoints: number;
  availablePoints: number;
  totalEarnings: number;
  referralCount: number;
  badges: any[];
  lastUpdated: any;
}

interface ReferralStats {
  playerId: string;
  totalReferrals: number;
  completedReferrals: number;
  totalPointsEarned: number;
  totalEarnings: number;
  monthlyReferrals: { [month: string]: number };
  topReferrers: any[];
}

// باقات الاشتراك العالمية (بالدولار) - نفس البيانات من BulkPaymentPage
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
    originalPrice: 400,
    period: '12 شهر',
    discount: '55%',
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

function SubscriptionStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<any>(null);
  const [userCountry, setUserCountry] = useState('US');
  const [currentCurrency, setCurrentCurrency] = useState('USD');
  const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);


  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (!user || !isMounted) return;

      try {
        console.log('🔄 بدء تهيئة البيانات...');

        // تحميل أسعار العملات
        if (isMounted) {
          try {
            const rates = await getCurrencyRates();
            if (isMounted) {
              setCurrencyRates(rates);
              console.log('✅ تم تحميل أسعار العملات');
            }
          } catch (error) {
            console.log('⚠️ خطأ في تحميل أسعار العملات:', error);
          }
        }

        // تحديد بلد المستخدم
        if (isMounted) {
          try {
            const country = await detectUserCountry();
            if (isMounted) {
              setUserCountry(country);
              console.log('✅ تم تحديد بلد المستخدم:', country);
            }
          } catch (error) {
            console.log('⚠️ خطأ في تحديد بلد المستخدم:', error);
          }
        }

        // تحديد العملة الحالية
        if (isMounted) {
          try {
            const currency = getCurrentCurrency();
            if (isMounted) {
              setCurrentCurrency(currency);
              console.log('✅ تم تحديد العملة الحالية:', currency);
            }
          } catch (error) {
            console.log('⚠️ خطأ في تحديد العملة الحالية:', error);
          }
        }

        // جلب بيانات الاشتراك
        if (isMounted) {
          try {
            await fetchSubscriptionStatus();
            console.log('✅ تم جلب بيانات الاشتراك');
          } catch (error) {
            console.log('⚠️ خطأ في جلب بيانات الاشتراك:', error);
          }
        }

        // جلب بيانات نقاط الإحالة والحوافز
        if (isMounted) {
          try {
            await fetchPlayerRewards();
            console.log('✅ تم جلب بيانات نقاط الإحالة');
          } catch (error) {
            console.log('⚠️ خطأ في جلب بيانات نقاط الإحالة:', error);
          }
        }

        if (isMounted) {
          console.log('✅ تم إكمال تهيئة البيانات بنجاح');
        }
      } catch (err) {
        if (isMounted) {
          console.error('❌ خطأ عام في تهيئة البيانات:', err);
          setError('حدث خطأ أثناء تحميل البيانات');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (user) {
      initializeData();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  // تحديث فوري للبيانات كل 5 ثوان - معطل لتجنب التحديثات اللحظية
  // useEffect(() => {
  //   if (!user) return;

  //   const interval = setInterval(async () => {
  //     try {
  //       await fetchSubscriptionStatus();
  //     } catch (error) {
  //       console.error('خطأ في التحديث الفوري:', error);
  //     }
  //   }, 5000); // تحديث كل 5 ثوان

  //   return () => clearInterval(interval);
  // }, [user]);

  const detectUserCountry = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return data.country_code || 'US';
    } catch (error) {
      console.error('Error detecting country:', error);
      return 'US';
    }
  };

  const getCurrentCurrency = () => {
    if (userCountry === 'EG') return 'EGP';
    if (userCountry === 'SA') return 'SAR';
    if (userCountry === 'AE') return 'AED';
    if (userCountry === 'KW') return 'KWD';
    if (userCountry === 'QA') return 'QAR';
    if (userCountry === 'BH') return 'BHD';
    if (userCountry === 'OM') return 'OMR';
    if (userCountry === 'JO') return 'JOD';
    if (userCountry === 'LB') return 'LBP';
    if (userCountry === 'TR') return 'TRY';
    if (userCountry === 'GB') return 'GBP';
    if (userCountry === 'FR' || userCountry === 'DE') return 'EUR';
    if (userCountry === 'MA') return 'MAD';
    if (userCountry === 'DZ') return 'DZD';
    if (userCountry === 'TN') return 'TND';
    return 'USD';
  };

  const fetchSubscriptionStatus = async () => {
    try {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      console.log('🔍 جلب بيانات الاشتراك للمستخدم:', user.uid);
      console.log('📧 البريد الإلكتروني:', user.email);
      console.log('📱 رقم الهاتف:', user.phone);

      // البحث في مجموعة geidea_payments أولاً (البيانات الحقيقية من Geidea callbacks)
      console.log('1️⃣ البحث في مجموعة geidea_payments (البيانات الحقيقية من Geidea callbacks)...');
      try {
        const geideaPaymentsRef = collection(db, 'geidea_payments');
        // البحث باستخدام customerEmail (الأكثر شيوعاً في Geidea callbacks)
        const geideaPaymentsQuery = query(
          geideaPaymentsRef,
          where('customerEmail', '==', user.email || ''),
          orderBy('callbackReceivedAt', 'desc'),
          limit(1)
        );
        
        let geideaPaymentsSnapshot;
        try {
          geideaPaymentsSnapshot = await getDocs(geideaPaymentsQuery);
        } catch (orderByError) {
          // إذا فشل orderBy (لا يوجد index)، نجلب بدون ترتيب
          console.warn('⚠️ orderBy failed for geidea_payments, fetching without order');
          const geideaPaymentsQueryNoOrder = query(
            geideaPaymentsRef,
            where('customerEmail', '==', user.email || ''),
            limit(1)
          );
          geideaPaymentsSnapshot = await getDocs(geideaPaymentsQueryNoOrder);
        }

        if (!geideaPaymentsSnapshot.empty) {
          console.log('✅ تم العثور على مدفوعات حقيقية من Geidea callbacks');
          console.log('📊 عدد المدفوعات:', geideaPaymentsSnapshot.docs.length);
          const paymentData = geideaPaymentsSnapshot.docs[0].data();
          console.log('📊 بيانات الدفع من Geidea:', paymentData);

          // فقط المدفوعات الناجحة
          if (paymentData.status === 'success') {
            // حساب تاريخ انتهاء الاشتراك (3 أشهر من تاريخ الدفع)
            const paymentDate = paymentData.paidAt 
              ? new Date(paymentData.paidAt) 
              : paymentData.callbackReceivedAt 
                ? new Date(paymentData.callbackReceivedAt)
                : paymentData.createdAt?.toDate?.() || new Date(paymentData.createdAt || Date.now());
            
            const endDate = new Date(paymentDate);
            endDate.setMonth(endDate.getMonth() + 3);

            const subscriptionData: SubscriptionStatus = {
              plan_name: 'اشتراك جيديا',
              start_date: paymentDate.toISOString(),
              end_date: endDate.toISOString(),
              status: 'active',
              payment_method: 'بطاقة بنكية (جيديا)',
              amount: paymentData.amount || 0,
              currency: paymentData.currency || 'EGP',
              currencySymbol: paymentData.currency === 'EGP' ? 'ج.م' :
                             paymentData.currency === 'USD' ? '$' :
                             paymentData.currency === 'SAR' ? 'ر.س' : 'ج.م',
              receipt_url: undefined,
              autoRenew: false,
              transaction_id: paymentData.orderId || paymentData.transactionId || paymentData.merchantReferenceId || 'N/A',
              invoice_number: paymentData.merchantReferenceId || paymentData.orderId || `INV-${Date.now()}`,
              customer_name: paymentData.customerName || user.displayName || 'مستخدم',
              customer_email: paymentData.customerEmail || user.email || '',
              customer_phone: paymentData.customerPhone || '',
              payment_date: paymentDate.toISOString(),
              accountType: 'player',
              packageType: 'geidea_subscription',
              selectedPackage: 'اشتراك جيديا'
            };

            console.log('📊 بيانات الاشتراك المحملة من Geidea:', subscriptionData);
            setSubscription(subscriptionData);
            return;
          } else {
            console.log('⚠️ المدفوعة من Geidea ليست ناجحة، الحالة:', paymentData.status);
          }
        } else {
          console.log('ℹ️ لم يتم العثور على مدفوعات في geidea_payments');
        }
      } catch (error) {
        console.log('⚠️ خطأ في البحث في مجموعة geidea_payments:', error);
        console.log('🔄 الانتقال للبحث في المصادر الأخرى...');
      }

      // البحث في مجموعة bulkPayments (fallback)
      console.log('2️⃣ البحث في مجموعة bulkPayments...');
      try {
        const bulkPaymentsRef = collection(db, 'bulkPayments');
        const bulkPaymentsQuery = query(
          bulkPaymentsRef,
          where('userId', '==', user.uid),
          where('status', '==', 'completed')
        );
        const bulkPaymentsSnapshot = await getDocs(bulkPaymentsQuery);

        if (!bulkPaymentsSnapshot.empty) {
          console.log('✅ تم العثور على مدفوعات في bulkPayments');
          console.log('📊 عدد المدفوعات:', bulkPaymentsSnapshot.docs.length);
          const paymentData = bulkPaymentsSnapshot.docs[0].data();
          console.log('📊 بيانات الدفع:', paymentData);

          // حساب تاريخ انتهاء الاشتراك (3 أشهر من تاريخ الدفع)
          const paymentDate = paymentData.createdAt?.toDate?.() || new Date(paymentData.createdAt);
          const endDate = new Date(paymentDate);
          endDate.setMonth(endDate.getMonth() + 3);

          const subscriptionData: SubscriptionStatus = {
            plan_name: paymentData.selectedPackage || 'اشتراك أساسي',
            start_date: paymentDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            payment_method: paymentData.paymentMethod === 'geidea' ? 'بطاقة بنكية (جيديا)' :
                           paymentData.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
                           paymentData.paymentMethod === 'etisalat_cash' ? 'اتصالات كاش' :
                           paymentData.paymentMethod === 'instapay' ? 'انستاباي' :
                           paymentData.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                           paymentData.paymentMethod || 'بطاقة ائتمان',
            amount: paymentData.amount || 0,
            currency: paymentData.currency || 'EGP',
            currencySymbol: paymentData.currency === 'EGP' ? 'ج.م' :
                           paymentData.currency === 'USD' ? '$' :
                           paymentData.currency === 'SAR' ? 'ر.س' : 'ج.م',
            receipt_url: paymentData.receiptUrl,
            autoRenew: false,
            transaction_id: paymentData.sessionId || paymentData.transactionId || 'N/A',
            invoice_number: paymentData.merchantReferenceId || `INV-${Date.now()}`,
            customer_name: paymentData.customerName || user.displayName || 'مستخدم',
            customer_email: paymentData.customerEmail || user.email || '',
            customer_phone: paymentData.customerPhone || '',
            payment_date: paymentDate.toISOString(),
            accountType: 'player',
            packageType: paymentData.selectedPackage,
            selectedPackage: paymentData.selectedPackage
          };

          console.log('📊 بيانات الاشتراك المحملة:', subscriptionData);
          setSubscription(subscriptionData);
          return;
        }
      } catch (error) {
        console.log('⚠️ خطأ في البحث في مجموعة bulkPayments:', error);
        console.log('🔄 الانتقال للبحث في المصادر الأخرى...');
      }

      // البحث في مجموعة subscriptions (إذا وجدت)
      console.log('3️⃣ البحث في مجموعة subscriptions...');
      try {
        const subscriptionRef = doc(db, 'subscriptions', user.uid);
        const subscriptionDoc = await getDoc(subscriptionRef);

        if (subscriptionDoc.exists()) {
          console.log('✅ تم العثور على بيانات اشتراك في Firestore');
          const data = subscriptionDoc.data() as SubscriptionStatus;

          // إضافة معلومات إضافية من صفحة المدفوعات المجمعة
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              data.accountType = userData.accountType || 'player';
              data.packageType = userData.packageType || data.plan_name;
              data.selectedPackage = userData.selectedPackage || data.plan_name;
            }
          } catch (userError) {
            console.log('⚠️ خطأ في جلب بيانات المستخدم:', userError);
          }

          setSubscription(data);
          return;
        }
      } catch (error) {
        console.log('⚠️ خطأ في البحث في مجموعة subscriptions:', error);
        console.log('🔄 الانتقال للبحث في المصادر الأخرى...');
      }

      // البحث في مجموعة bulk_payments (Supabase fallback)
      console.log('4️⃣ البحث في مجموعة bulk_payments...');
      try {
        const paymentsRef = collection(db, 'bulk_payments');
        const paymentsQuery = query(paymentsRef, where('user_id', '==', user.uid));
        const paymentsSnapshot = await getDocs(paymentsQuery);

        if (!paymentsSnapshot.empty) {
          console.log('✅ تم العثور على مدفوعات في Supabase');
          const paymentData = paymentsSnapshot.docs[0].data();
          const subscriptionData: SubscriptionStatus = {
            plan_name: paymentData.selectedPackage || 'اشتراك أساسي',
            start_date: paymentData.paymentDate || new Date().toISOString(),
            end_date: paymentData.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            status: paymentData.status || 'active',
            payment_method: paymentData.paymentMethod || 'بطاقة ائتمان',
            amount: paymentData.amount || 0,
            currency: paymentData.currency || 'USD',
            currencySymbol: paymentData.currencySymbol || '$',
            receipt_url: paymentData.receiptUrl,
            autoRenew: paymentData.autoRenew || false,
            transaction_id: paymentData.transactionId || 'N/A',
            invoice_number: paymentData.invoiceNumber || `INV-${Date.now()}`,
            customer_name: paymentData.customerName || user.displayName || 'مستخدم',
            customer_email: paymentData.customerEmail || user.email || '',
            customer_phone: paymentData.customerPhone || '',
            payment_date: paymentData.paymentDate || new Date().toISOString(),
            accountType: paymentData.accountType || 'player',
            packageType: paymentData.selectedPackage,
            selectedPackage: paymentData.selectedPackage
          };
          setSubscription(subscriptionData);
          return;
        }
      } catch (error) {
        console.log('⚠️ خطأ في البحث في مجموعة bulk_payments:', error);
        console.log('🔄 الانتقال للبحث في المصادر الأخرى...');
      }

      // البحث في جميع المجموعات للعثور على المستخدم
      console.log('5️⃣ البحث في جميع المجموعات للعثور على المستخدم...');
      const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
      let foundUser = null;
      let foundCollection = '';

      for (const collectionName of collections) {
        try {
          console.log(`🔍 البحث في مجموعة ${collectionName}...`);
          const collectionRef = collection(db, collectionName);

          // البحث بالبريد الإلكتروني
          const emailQuery = query(collectionRef, where('email', '==', user.email));
          const emailSnapshot = await getDocs(emailQuery);

          if (!emailSnapshot.empty) {
            foundUser = emailSnapshot.docs[0].data();
            foundCollection = collectionName;
            console.log(`✅ تم العثور على المستخدم في مجموعة ${collectionName}`);
            break;
          }

          // البحث برقم الهاتف إذا كان متوفراً
          if (user.phone) {
            const phoneQuery = query(collectionRef, where('phone', '==', user.phone));
            const phoneSnapshot = await getDocs(phoneQuery);

            if (!phoneSnapshot.empty) {
              foundUser = phoneSnapshot.docs[0].data();
              foundCollection = collectionName;
              console.log(`✅ تم العثور على المستخدم في مجموعة ${collectionName} برقم الهاتف`);
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ خطأ في البحث في مجموعة ${collectionName}:`, error);
          continue; // الانتقال للمجموعة التالية
        }
      }

      if (foundUser) {
        console.log('📊 بيانات المستخدم الموجودة:', foundUser);
        console.log('🔍 فحص بيانات الاشتراك في الملف الشخصي...');

        // فحص بيانات الاشتراك في الملف الشخصي
        if (foundUser.subscriptionStatus === 'active' && foundUser.subscriptionEndDate) {
          console.log('✅ تم العثور على بيانات اشتراك في الملف الشخصي');
          const subscriptionData: SubscriptionStatus = {
            plan_name: foundUser.selectedPackage || foundUser.packageType || 'اشتراك أساسي',
            start_date: foundUser.lastPaymentDate || new Date().toISOString(),
            end_date: foundUser.subscriptionEndDate.toDate?.() || foundUser.subscriptionEndDate,
            status: 'active',
            payment_method: foundUser.lastPaymentMethod || 'بطاقة ائتمان',
            amount: foundUser.lastPaymentAmount || 0,
            currency: 'EGP',
            currencySymbol: 'ج.م',
            receipt_url: '',
            autoRenew: false,
            transaction_id: 'N/A',
            invoice_number: `INV-${Date.now()}`,
            customer_name: foundUser.displayName || foundUser.name || 'مستخدم',
            customer_email: foundUser.email || user.email || '',
            customer_phone: foundUser.phone || '',
            payment_date: foundUser.lastPaymentDate || new Date().toISOString(),
            accountType: foundUser.accountType || 'player',
            packageType: foundUser.selectedPackage || foundUser.packageType,
            selectedPackage: foundUser.selectedPackage || foundUser.packageType
          };

          setSubscription(subscriptionData);
          return;
        }
      }

      // البحث المباشر في مجموعة users كحل أخير
      console.log('5️⃣ البحث المباشر في مجموعة users...');
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('✅ تم العثور على بيانات المستخدم في مجموعة users');
          console.log('📊 بيانات المستخدم:', userData);

          if (userData.subscriptionStatus === 'active' && userData.subscriptionEndDate) {
            console.log('✅ تم العثور على بيانات اشتراك في مجموعة users');
            const subscriptionData: SubscriptionStatus = {
              plan_name: userData.selectedPackage || userData.packageType || 'اشتراك أساسي',
              start_date: userData.lastPaymentDate || new Date().toISOString(),
              end_date: userData.subscriptionEndDate.toDate?.() || userData.subscriptionEndDate,
              status: 'active',
              payment_method: userData.lastPaymentMethod || 'بطاقة ائتمان',
              amount: userData.lastPaymentAmount || 0,
              currency: 'EGP',
              currencySymbol: 'ج.م',
              receipt_url: '',
              autoRenew: false,
              transaction_id: 'N/A',
              invoice_number: `INV-${Date.now()}`,
              customer_name: userData.displayName || userData.name || 'مستخدم',
              customer_email: userData.email || user.email || '',
              customer_phone: userData.phone || '',
              payment_date: userData.lastPaymentDate || new Date().toISOString(),
              accountType: userData.accountType || 'player',
              packageType: userData.selectedPackage || userData.packageType,
              selectedPackage: userData.selectedPackage || userData.packageType
            };

            setSubscription(subscriptionData);
            return;
          }
        }
      } catch (error) {
        console.log('⚠️ خطأ في البحث المباشر في مجموعة users:', error);
      }

      console.log('⚠️ لم يتم العثور على أي مدفوعات أو اشتراكات');
      console.log('🔍 البحث في المجموعات التالية:');
      console.log('  - bulkPayments (المدفوعات الحقيقية من جيديا)');
      console.log('  - subscriptions (بيانات الاشتراك)');
      console.log('  - bulk_payments (Supabase fallback)');
      console.log('  - جميع مجموعات المستخدمين');
      console.log('🔍 معرف المستخدم:', user.uid);
      console.log('🔍 البريد الإلكتروني:', user.email);
      console.log('🔍 رقم الهاتف:', user.phone);
      console.log('🔍 نوع الحساب:', user.accountType);

      // إضافة معلومات تشخيصية إضافية
      console.log('📊 معلومات التشخيص الإضافية:');
      console.log('  - Firebase متصل:', !!db);
      console.log('  - المستخدم مسجل دخول:', !!user);
      console.log('  - معرف المستخدم صالح:', !!user?.uid);
      console.log('  - البريد الإلكتروني صالح:', !!user?.email);

      setError('لم يتم العثور على بيانات الاشتراك. يرجى إتمام عملية الدفع أولاً.');

    } catch (err) {
      console.error('❌ خطأ في جلب بيانات الاشتراك:', err);
      setError('حدث خطأ أثناء جلب بيانات الاشتراك');
    }
  };

  const fetchPlayerRewards = async () => {
    try {
      if (!user) return;

      // إنشاء أو جلب نظام مكافآت اللاعب
      const rewards = await referralService.createOrUpdatePlayerRewards(user.uid);
      setPlayerRewards(rewards);

      // جلب إحصائيات الإحالات
      const stats = await referralService.getPlayerReferralStats(user.uid);
      setReferralStats(stats);

    } catch (error) {
      console.error('خطأ في جلب بيانات نقاط الإحالة:', error);
      // لا نضع error هنا لأنها ليست ضرورية لعمل الصفحة
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في انتظار التأكيد';
      case 'active':
        return 'نشط';
      case 'expired':
        return 'منتهي';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const getPackageInfo = (packageType: string) => {
    console.log('🔍 البحث عن معلومات الباقة:', packageType);

    // البحث في الباقات المصرية أولاً
    let packages = BULK_PACKAGES_EGP;
    let packageInfo = packages[packageType as keyof typeof packages];

    // إذا لم يتم العثور، ابحث في الباقات العالمية
    if (!packageInfo) {
      packages = BULK_PACKAGES_USD;
      packageInfo = packages[packageType as keyof typeof packages];
    }

    // إذا كان packageType فارغ أو غير محدد، استخدم الباقة الأساسية
    if (!packageType || packageType === 'undefined' || packageType === 'null') {
      packageInfo = BULK_PACKAGES_EGP['subscription_basic'];
    }

    // إذا لم يتم العثور على أي باقة، استخدم الباقة الأساسية
    if (!packageInfo) {
      packageInfo = BULK_PACKAGES_EGP['subscription_basic'];
    }

    console.log('📦 معلومات الباقة المحملة:', { packageType, packageInfo });
    return packageInfo;
  };

  const getEarningsInEGP = (dollars: number) => {
    if (!dollars || isNaN(dollars)) return '0';
    return (dollars * POINTS_CONVERSION.DOLLAR_TO_EGP).toFixed(2);
  };

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'referral':
        return 'bg-purple-100 text-purple-600';
      case 'academy':
        return 'bg-blue-100 text-blue-600';
      case 'achievement':
        return 'bg-yellow-100 text-yellow-600';
      case 'special':
        return 'bg-pink-100 text-pink-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getBadgeIcon = (category: string) => {
    switch (category) {
      case 'referral':
        return <Users className="w-4 h-4" />;
      case 'academy':
        return <Trophy className="w-4 h-4" />;
      case 'achievement':
        return <Star className="w-4 h-4" />;
      case 'special':
        return <Crown className="w-4 h-4" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  const handlePrintInvoice = () => {
    setPrinting(true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPrinting(false);
      return;
    }

    const packageInfo = getPackageInfo(subscription?.selectedPackage || subscription?.plan_name || '');
    const features = packageInfo?.features || [];
    const bonusFeatures = packageInfo?.bonusFeatures || [];

    const invoiceContent = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>فاتورة اشتراك - ${subscription?.plan_name}</title>
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
            .package-features { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .feature-list { list-style: none; padding: 0; margin: 8px 0; }
            .feature-list li { padding: 4px 0; color: #555; }
            .feature-list li:before { content: "✓ "; color: #4caf50; font-weight: bold; }
            .bonus-features { background: #fff3e0; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .bonus-features h4 { color: #f57c00; margin-bottom: 8px; }
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
            <div class="invoice-title">فاتورة اشتراك <span style="font-size:1.3em;">🧾</span></div>
            <div style="margin: 16px 0 24px 0; color:#555;">
              <b>رقم الفاتورة:</b> ${subscription?.invoice_number || ''} &nbsp; | &nbsp;
              <b>تاريخ الإصدار:</b> ${subscription?.payment_date ? new Date(subscription.payment_date).toLocaleDateString('ar-EG') : ''}
            </div>
            <div class="section-title">معلومات العميل <span style="font-size:1.1em;">👤</span></div>
            <table class="details-table">
              <tr><th>الاسم</th><td>${subscription?.customer_name || ''}</td></tr>
              <tr><th>البريد الإلكتروني</th><td>${subscription?.customer_email || ''}</td></tr>
              <tr><th>رقم الهاتف</th><td>${subscription?.customer_phone || ''}</td></tr>
              <tr><th>نوع الحساب</th><td>${subscription?.accountType || 'لاعب'}</td></tr>
              <tr><th>العنوان</th><td>${subscription?.billing_address || '-'}</td></tr>
              <tr><th>الرقم الضريبي</th><td>${subscription?.tax_number || '-'}</td></tr>
            </table>
            <div class="section-title">تفاصيل الاشتراك <span style="font-size:1.1em;">💳</span></div>
            <table class="details-table">
              <tr><th>الباقة</th><td>${subscription?.plan_name || ''}</td></tr>
              <tr><th>المبلغ</th><td>${subscription?.amount || ''} ${subscription?.currencySymbol || subscription?.currency || ''}</td></tr>
              <tr><th>طريقة الدفع</th><td>${subscription?.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'بطاقة ائتمان/أخرى'}</td></tr>
              <tr><th>رقم العملية</th><td>${subscription?.transaction_id || '-'}</td></tr>
              <tr><th>تاريخ الدفع</th><td>${subscription?.payment_date ? new Date(subscription.payment_date).toLocaleDateString('ar-EG') : ''}</td></tr>
              <tr><th>تاريخ بداية الاشتراك</th><td>${subscription?.start_date ? new Date(subscription.start_date).toLocaleDateString('ar-EG') : ''}</td></tr>
              <tr><th>تاريخ نهاية الاشتراك</th><td>${subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('ar-EG') : ''}</td></tr>
              <tr><th>تجديد تلقائي</th><td>${subscription?.autoRenew ? 'نعم' : 'لا'}</td></tr>
              <tr><th>حالة الاشتراك</th><td>${getStatusText(subscription?.status || '')}</td></tr>
            </table>
            ${packageInfo ? `
            <div class="section-title">مميزات الباقة <span style="font-size:1.1em;">✨</span></div>
            <div class="package-features">
              <h4>${packageInfo.title} - ${packageInfo.subtitle}</h4>
              <ul class="feature-list">
                ${features.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            ${bonusFeatures.length > 0 ? `
            <div class="bonus-features">
              <h4>🎁 المميزات الإضافية</h4>
              <ul class="feature-list">
                ${bonusFeatures.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            ` : ''}
            <div class="customer-care">
              <span style="font-size:1.3em;">🤝</span>
              نحن هنا دائمًا لدعمك! لأي استفسار أو مساعدة لا تتردد في التواصل معنا عبر البريد أو الهاتف.
            </div>
            <div class="summary">
              <span style="font-size:1.2em;">🌟</span>
              <strong>شكراً لاختيارك منصتنا لتحقيق طموحاتك الرياضية!</strong>
              <span style="font-size:1.2em;">🏆</span>
            </div>
            <div class="thankyou">
              <span style="font-size:1.5em;">🎉</span> نتمنى لك رحلة نجاح رائعة معنا! <span style="font-size:1.5em;">🚀</span>
            </div>
            <div class="footer">
              <div class="icons">💙 ⚽ 🏅 🥇 🏆</div>
              منصة الحلم (el7lm) تحت مِيسك القابضة - جميع الحقوق محفوظة &copy; ${new Date().getFullYear()}
              <div style="margin-top:8px; font-size:13px; color:#888;">تم إصدار هذه الفاتورة إلكترونيًا ولا تحتاج إلى توقيع.</div>
              <div style="margin-top:18px; text-align:center;">
                <div style="display:inline-block; border:1px dashed #1976d2; border-radius:8px; padding:12px 24px; background:#f5faff;">
                  <div style="font-size:1.1em; color:#1976d2; font-weight:bold; margin-bottom:4px;">التوقيع الإلكتروني</div>
                  <img src="/signature.png" alt="التوقيع الإلكتروني" style="height:48px; margin-bottom:4px;" onerror="this.style.display='none'" />
                  <div style="font-size:0.95em; color:#555;">تمت الموافقة إلكترونيًا بواسطة إدارة الحلم (el7lm) تحت مِيسك القابضة</div>
                </div>
              </div>
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()" style="background:#1976d2;color:#fff;padding:10px 30px;border:none;border-radius:8px;font-size:1.1rem;cursor:pointer;">طباعة الفاتورة</button>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceContent);
    printWindow.document.close();
    printWindow.focus();
    setPrinting(false);
  };

  const handleDownloadInvoice = () => {
    // إنشاء الفاتورة كـ HTML للتحميل
    const packageInfo = getPackageInfo(subscription?.selectedPackage || subscription?.plan_name || '');
    const features = packageInfo?.features || [];
    const bonusFeatures = packageInfo?.bonusFeatures || [];

    const invoiceContent = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>فاتورة اشتراك - ${subscription?.plan_name}</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; padding: 0; margin: 0; background: #fff; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 32px 24px; }
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
            .package-features { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .feature-list { list-style: none; padding: 0; margin: 8px 0; }
            .feature-list li { padding: 4px 0; color: #555; }
            .feature-list li:before { content: "✓ "; color: #4caf50; font-weight: bold; }
            .bonus-features { background: #fff3e0; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .bonus-features h4 { color: #f57c00; margin-bottom: 8px; }
            @media print { body { background: #fff; } }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="/el7lm-logo.png" alt="Logo" class="logo" />
              <div class="company-info">
                <strong>منصة الحلم</strong><br>
                📧 info@el7lm.com<br>
                📱 +20 101 779 9580<br>
                🌐 www.el7lm.com
              </div>
            </div>

            <div class="invoice-title">فاتورة اشتراك <span style="font-size:1.3em;">🧾</span></div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 1.1rem;">
              <b>رقم الفاتورة:</b> ${subscription?.invoice_number || ''} &nbsp; | &nbsp;
              <b>تاريخ الإصدار:</b> ${new Date().toLocaleDateString('ar-EG')} &nbsp; | &nbsp;
              <b>حالة الاشتراك:</b> ${getStatusText(subscription?.status || '')}
            </div>

            <div class="section-title">📋 تفاصيل الاشتراك</div>
            <table class="details-table">
              <tr><th>اسم الباقة</th><td>${subscription?.plan_name || ''}</td></tr>
              <tr><th>المبلغ المدفوع</th><td>${subscription?.amount || 0} ${subscription?.currencySymbol || ''}</td></tr>
              <tr><th>تاريخ التفعيل</th><td>${subscription?.activated_at ? new Date(subscription.activated_at.seconds * 1000).toLocaleDateString('ar-EG') : 'غير محدد'}</td></tr>
              <tr><th>تاريخ الانتهاء</th><td>${subscription?.expires_at ? new Date(subscription.expires_at.seconds * 1000).toLocaleDateString('ar-EG') : 'غير محدد'}</td></tr>
              <tr><th>طريقة الدفع</th><td>${subscription?.payment_method || ''}</td></tr>
              <tr><th>رقم العملية</th><td>${subscription?.transaction_id || ''}</td></tr>
            </table>

            <div class="section-title">👤 معلومات العميل</div>
            <table class="details-table">
              <tr><th>الاسم</th><td>${subscription?.customer_name || ''}</td></tr>
              <tr><th>البريد الإلكتروني</th><td>${subscription?.customer_email || ''}</td></tr>
              <tr><th>رقم الهاتف</th><td>${subscription?.customer_phone || '-'}</td></tr>
              <tr><th>نوع الحساب</th><td>${subscription?.accountType || 'لاعب'}</td></tr>
            </table>

            ${features.length > 0 ? `
            <div class="package-features">
              <h4>🎯 مميزات الباقة:</h4>
              <ul class="feature-list">
                ${features.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${bonusFeatures.length > 0 ? `
            <div class="bonus-features">
              <h4>🎁 مميزات إضافية:</h4>
              <ul class="feature-list">
                ${bonusFeatures.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            <div class="summary">
              <strong>إجمالي المبلغ:</strong> ${subscription?.amount || 0} ${subscription?.currencySymbol || ''}
            </div>

            <div class="customer-care">
              🎧 خدمة العملاء متاحة 24/7 | 📧 info@el7lm.com | 📱 +20 101 779 9580
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
    link.download = `فاتورة-اشتراك-${subscription?.plan_name || 'subscription'}-${new Date().toISOString().split('T')[0]}.html`;

    // إضافة الرابط للصفحة وتنفيذ التحميل
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // تنظيف URL
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-500">جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">خطأ في تحميل البيانات</h2>
            <p className="text-gray-600 mb-6 text-lg">{error}</p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  // إعادة تحميل الصفحة بطريقة آمنة
                  if (typeof window !== 'undefined') {
                    window.location.href = window.location.href;
                  }
                }}
                className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                إعادة المحاولة
              </button>
              <Link
                href="/dashboard/shared/bulk-payment"
                className="inline-flex items-center justify-center w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                الذهاب لصفحة الدفع
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">لا توجد اشتراكات نشطة</h2>
            <p className="text-gray-600 mb-6 text-lg">
              لم يتم العثور على أي مدفوعات أو اشتراكات في حسابك.
              يرجى إتمام عملية الدفع أولاً للحصول على اشتراك نشط.
            </p>
            <div className="space-y-4">
              <Link
                href="/dashboard/shared/bulk-payment"
                className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                اشترك الآن
              </Link>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center justify-center w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <FileImage className="w-5 h-5 mr-2" />
                عرض سجل المدفوعات
              </Link>
            </div>
            {/* إضافة معلومات تشخيصية */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">معلومات التشخيص:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>معرف المستخدم: {user?.uid || 'غير محدد'}</div>
                <div>البريد الإلكتروني: {user?.email || 'غير محدد'}</div>
                <div>حالة التحميل: {loading ? 'جاري التحميل...' : 'مكتمل'}</div>
                <div>الخطأ: {error || 'لا يوجد خطأ'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const packageInfo = getPackageInfo(subscription.selectedPackage || subscription.plan_name);

  return (
    <div className="p-4 md:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              العودة
            </button>
            <Link
              href="/dashboard"
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <Home className="w-4 h-4 mr-2" />
              لوحة التحكم
            </Link>
          </div>
          <div className="flex items-center mb-2">
            <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">حالة الاشتراك</h1>
          </div>
          <p className="text-gray-600">عرض تفاصيل اشتراكك الحالي والفواتير</p>
        </div>

        {/* بطاقة حالة الاشتراك */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${getStatusColor(subscription.status)}`}>
                {subscription.status === 'active' && <Check className="w-5 h-5" />}
                {subscription.status === 'pending' && <Clock className="w-5 h-5" />}
                {subscription.status === 'expired' && <AlertCircle className="w-5 h-5" />}
                {subscription.status === 'cancelled' && <X className="w-5 h-5" />}
              </div>
              <div className="ml-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  {subscription.plan_name}
                </h2>
                <p className={`text-sm ${getStatusColor(subscription.status)}`}>
                  {getStatusText(subscription.status)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {subscription.amount} {subscription.currencySymbol}
              </div>
              <div className="text-sm text-gray-500">
                {subscription.currency}
              </div>
            </div>
          </div>

          {/* تفاصيل الباقة */}
          {packageInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{packageInfo.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900">{packageInfo.title}</h3>
                {packageInfo.popular && (
                  <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    الأكثر شعبية
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-3">{packageInfo.subtitle}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">المميزات الأساسية:</h4>
                  <ul className="space-y-1">
                    {packageInfo.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">المميزات الإضافية:</h4>
                  <ul className="space-y-1">
                    {packageInfo.bonusFeatures.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <Gift className="w-4 h-4 text-purple-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* تفاصيل الاشتراك */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">تفاصيل الاشتراك</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ البداية:</span>
                  <span className="font-medium">
                    {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString('ar-EG') : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ الانتهاء:</span>
                  <span className="font-medium">
                    {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('ar-EG') : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">طريقة الدفع:</span>
                  <span className="font-medium">{subscription.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم العملية:</span>
                  <span className="font-medium">{subscription.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تجديد تلقائي:</span>
                  <span className="font-medium">{subscription.autoRenew ? 'نعم' : 'لا'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">معلومات العميل</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">الاسم:</span>
                  <span className="font-medium">{subscription.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">البريد الإلكتروني:</span>
                  <span className="font-medium">{subscription.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الهاتف:</span>
                  <span className="font-medium">{subscription.customer_phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">نوع الحساب:</span>
                  <span className="font-medium">{subscription.accountType || 'لاعب'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadInvoice}
                className="flex-1 flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                تحميل الفاتورة PDF
              </button>

              <button
                onClick={handlePrintInvoice}
                disabled={printing}
                className="flex-1 flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {printing ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}
                {printing ? 'جاري الطباعة...' : 'طباعة الفاتورة'}
              </button>

              {subscription?.receipt_url && (
                <button
                  onClick={() => setShowReceiptDialog(true)}
                  className="flex-1 flex items-center justify-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  عرض الإيصال
                </button>
              )}
            </div>
          </div>
        </div>

        {/* قسم نقاط الإحالة والحوافز */}
        {playerRewards && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
            <div className="flex items-center mb-4">
              <Trophy className="w-8 h-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">نقاط الإحالة والحوافز</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* إجمالي النقاط */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 text-yellow-500 mr-2" />
                  <h3 className="font-semibold text-gray-900">إجمالي النقاط</h3>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {playerRewards?.totalPoints?.toLocaleString() || '0'}
                </div>
                <p className="text-sm text-gray-600">نقطة</p>
              </div>

              {/* النقاط المتاحة */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <DollarSign className="w-5 h-5 text-green-500 mr-2" />
                  <h3 className="font-semibold text-gray-900">النقاط المتاحة</h3>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {playerRewards?.availablePoints?.toLocaleString() || '0'}
                </div>
                <p className="text-sm text-gray-600">نقطة</p>
              </div>

              {/* الأرباح الإجمالية */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <Award className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="font-semibold text-gray-900">الأرباح الإجمالية</h3>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ${playerRewards?.totalEarnings?.toFixed(2) || '0.00'}
                </div>
                <p className="text-sm text-gray-600">
                  ≈ {getEarningsInEGP(playerRewards?.totalEarnings || 0)} جنيه مصري
                </p>
              </div>
            </div>

            {/* إحصائيات الإحالة */}
            {referralStats && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات الإحالة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center mb-2">
                      <Users className="w-5 h-5 text-indigo-500 mr-2" />
                      <h4 className="font-medium text-gray-900">إجمالي الإحالات</h4>
                    </div>
                    <div className="text-xl font-bold text-indigo-600">
                      {referralStats?.totalReferrals || 0}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center mb-2">
                      <Check className="w-5 h-5 text-green-500 mr-2" />
                      <h4 className="font-medium text-gray-900">الإحالات المكتملة</h4>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {referralStats?.completedReferrals || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* الشارات المكتسبة */}
            {playerRewards && playerRewards.badges && playerRewards.badges.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">الشارات المكتسبة</h3>
                <div className="flex flex-wrap gap-3">
                  {playerRewards.badges.map((badge, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${getBadgeColor(badge.category)}`}>
                          {getBadgeIcon(badge.category)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{badge.name}</div>
                          <div className="text-sm text-gray-600">{badge.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* رابط صفحة الإحالة */}
            <div className="mt-6 text-center">
              <Link
                href="/dashboard/referrals"
                className="inline-flex items-center bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Trophy className="w-5 h-5 mr-2" />
                إدارة الإحالات والحوافز
              </Link>
            </div>
          </div>
        )}

        {/* أزرار الطباعة والتحميل */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handlePrintInvoice}
            disabled={printing}
            className="flex-1 flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {printing ? (
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Printer className="w-5 h-5 mr-2" />
            )}
            {printing ? 'جاري الطباعة...' : 'طباعة الفاتورة'}
          </button>

          <button
            onClick={handleDownloadInvoice}
            className="flex-1 flex items-center justify-center bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5 mr-2" />
            تحميل الفاتورة
          </button>

          {subscription?.receipt_url && (
            <button
              onClick={() => setShowReceiptDialog(true)}
              className="flex-1 flex items-center justify-center bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              <FileImage className="w-5 h-5 mr-2" />
              عرض الإيصال
            </button>
          )}
        </div>

        {/* رابط للدفع المجمع */}
        <div className="mt-6 text-center">
          <Link
            href="/dashboard/shared/bulk-payment"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            تحديث الاشتراك أو الدفع الجماعي
          </Link>
        </div>

        {/* موديول عرض الإيصال */}
        {showReceiptDialog && subscription?.receipt_url && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-bold text-gray-900">إيصال الدفع</h3>
                <button
                  onClick={() => setShowReceiptDialog(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="text-center mb-4">
                  <img
                    src={subscription.receipt_url}
                    alt="إيصال الدفع"
                    className="max-w-full h-auto mx-auto rounded-lg shadow-lg max-h-[70vh]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = subscription.receipt_url;
                      link.download = `receipt-${subscription.invoice_number || 'payment'}.jpg`;
                      link.click();
                    }}
                    className="flex-1 flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    تحميل الإيصال
                  </button>

                  <button
                    onClick={() => window.open(subscription.receipt_url, '_blank')}
                    className="flex-1 flex items-center justify-center bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    فتح في تبويب جديد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

export default function SubscriptionStatusPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SubscriptionStatusContent />
    </div>
  );
}
