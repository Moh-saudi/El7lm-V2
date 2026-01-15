'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-provider';
import { Check, ArrowRight, Loader2, Sparkles, XCircle, Clock } from 'lucide-react';

interface PaymentData {
  orderId?: string;
  reference?: string;
  responseCode?: string;
  responseMessage?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  sessionId?: string;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userData } = useAuth();
  const [paymentData, setPaymentData] = useState<PaymentData>({});
  const [loading, setLoading] = useState(true);
  const [redirectTimeline, setRedirectTimeline] = useState(5);

  useEffect(() => {
    // استخراج بيانات الدفع من URL parameters
    const orderId = searchParams.get('orderId');
    const reference = searchParams.get('reference');
    const responseCode = searchParams.get('responseCode');
    const responseMessage = searchParams.get('responseMessage');
    const status = searchParams.get('status');
    const sessionId = searchParams.get('sessionId');

    // SkipCash specific
    const skipCashId = searchParams.get('id');
    const method = searchParams.get('method');

    console.log('🔍 [Payment Success] Processing:', { method, skipCashId, status });

    const handleSkipCash = async () => {
      if (method === 'skipcash' && skipCashId) {
        try {
          const res = await fetch('/api/skipcash/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: skipCashId,
              userId: userData?.uid,
              amount: searchParams.get('amount')
            })
          });
          const result = await res.json();
          if (result.success) {
            setPaymentData({
              orderId: skipCashId,
              amount: result.data?.amount || searchParams.get('amount') || '--',
              currency: result.data?.currency || 'QAR',
              status: 'success',
              responseCode: '000'
            });
          } else {
            setPaymentData({ status: 'failed', responseMessage: result.message });
          }
        } catch (err) {
          setPaymentData({ status: 'failed', responseMessage: 'Error verifying payment' });
        } finally {
          setLoading(false);
        }
      }
    };

    if (method === 'skipcash' && skipCashId && userData?.uid) {
      handleSkipCash();
    } else if (method === 'skipcash' && skipCashId && !userData?.uid && !loading) {
      // Still loading or guest or auth check failed
      console.log('⏳ Waiting for user auth...');
    }

    // Geidea existing logic (only if not skipcash)
    if (method !== 'skipcash') {
      const loadGeidea = async () => {
        try {
          const savedPayments = JSON.parse(localStorage.getItem('geidea_payments') || '[]');
          const latestPayment = savedPayments[savedPayments.length - 1];

          if (latestPayment) {
            setPaymentData({
              orderId: orderId || latestPayment.orderId,
              reference: reference || latestPayment.reference,
              responseCode: responseCode || latestPayment.responseCode,
              responseMessage: responseMessage || latestPayment.responseMessage,
              status: status || latestPayment.status,
              amount: latestPayment.amount,
              currency: latestPayment.currency,
              sessionId: sessionId || latestPayment.sessionId
            });
          } else {
            setPaymentData({ orderId, reference, responseCode, responseMessage, status, sessionId });
          }
        } catch (error) {
          setPaymentData({ orderId, reference, responseCode, responseMessage, status, sessionId });
        }
        setLoading(false);
      };
      loadGeidea();
    }
  }, [searchParams, userData, loading]);

  // التوجيه التلقائي عند النجاح
  useEffect(() => {
    const isSuccess = paymentData.responseCode === '000' || paymentData.status === 'success' || paymentData.status === 'Paid';

    if (isSuccess && !loading) {
      const timer = setInterval(() => {
        setRedirectTimeline((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.replace('/dashboard/shared/subscription-status');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentData, loading, router]);

  const isSuccess = paymentData.responseCode === '000' || paymentData.status === 'success' || paymentData.status === 'Paid';
  const isProcessing = paymentData.responseCode === '210' || paymentData.responseCode === '999';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-white font-medium text-lg animate-pulse">جاري التحقق من عملية الدفع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 overflow-hidden relative" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10 transition-all duration-500 transform scale-100">
        {isSuccess ? (
          <div className="bg-[#161618] border border-white/10 rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden group">
            {/* Glow effect on success */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-400"></div>

            <div className="mb-6 relative">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 relative z-10">
                <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
              </div>
              <div className="absolute inset-0 bg-green-500/10 rounded-full blur-xl scale-150 opacity-50"></div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">تم الدفع بنجاح!</h1>
            <p className="text-gray-400 mb-6 font-medium">شكراً لك، تم تفعيل اشتراكك بنجاح.</p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5 font-bold">
                <span className="text-gray-400">المبلغ الإجمالي</span>
                <span className="text-2xl text-white">
                  {paymentData.amount} <span className="text-sm font-normal text-gray-400">{paymentData.currency || 'QAR'}</span>
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">رقم العملية</span>
                  <span className="text-blue-400 font-mono truncate max-w-[150px]">{paymentData.orderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">الحالة</span>
                  <span className="text-green-400 flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3" /> مكتملة بنجاح
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm bg-white/5 py-3 px-4 rounded-2xl">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>سيتم تحويلك تلقائياً خلال <span className="text-white font-bold">{redirectTimeline}</span> ثوانٍ...</span>
              </div>

              <button
                onClick={() => router.push('/dashboard/shared/subscription-status')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 shadow-lg shadow-blue-500/20"
              >
                انتقل الآن لحالة الاشتراك
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="bg-[#161618] border border-white/10 rounded-3xl shadow-2xl p-8 text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">جاري معالجة العملية</h1>
            <p className="text-gray-400 mb-8 font-medium">يرجى عدم إغلاق هذه الصفحة، نقوم بتأكيد الدفع مع البنك المصدّر...</p>

            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
              <p className="text-xs text-yellow-500/70">قد تستغرق هذه العملية ما يصل إلى دقيقة واحدة في بعض الحالات.</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#161618] border border-white/10 rounded-3xl shadow-2xl p-8 text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-110">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">عذراً، فشلت العملية</h1>
            <p className="text-gray-400 mb-6 font-medium">{paymentData.responseMessage || 'لم تكتمل عملية الدفع بسبب خطأ تقني، يرجى المحاولة مرة أخرى.'}</p>

            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 mb-8 text-right">
              <p className="text-xs text-red-400/70 mb-1">كود الخطأ:</p>
              <p className="text-sm text-red-400 font-mono font-bold tracking-wider">{paymentData.responseCode || 'ERR_PAYMENT_FAILED'}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className="w-full bg-red-600 text-white py-4 px-6 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
              >
                العودة والمحاولة مجدداً
              </button>
              <button
                onClick={() => router.push('/dashboard/player/billing')}
                className="w-full bg-white/5 text-white py-4 px-6 rounded-2xl font-medium hover:bg-white/10 transition-all border border-white/5"
              >
                العودة لصفحة الفواتير
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Badge Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center px-4">
        <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em] font-medium flex items-center justify-center gap-2">
          🛡️ عمليات دفع مشفرة وآمنة تماماً
        </p>
      </div>
    </div>
  );
}

// مكون التحميل
function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
        <p className="text-gray-400 font-medium">جاري تحديث البيانات...</p>
      </div>
    </div>
  );
}

// المكون الرئيسي مع Suspense
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
