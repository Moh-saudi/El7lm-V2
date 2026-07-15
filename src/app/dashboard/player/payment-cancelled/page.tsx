'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Home, RefreshCw, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function PaymentCancelledPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('playerPaymentSuccess');

  useEffect(() => {
    // جلب تفاصيل الدفع من URL parameters
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency');
    const status = searchParams.get('status');

    if (orderId) {
      setPaymentDetails({
        orderId,
        amount: amount ? parseFloat(amount) : null,
        currency: currency || 'SAR',
        status: status || 'cancelled'
      });
    }

    setIsLoading(false);

    // إرسال إشعار إلغاء الدفع
    if (orderId && status === 'cancelled') {
      console.log('⚠️ Payment cancelled:', orderId);
      // TODO: إرسال إشعار للمستخدم
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <XCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {copy.cancelledTitle}
          </h1>
          <p className="text-gray-600">
            {copy.cancelledDescription}
          </p>
        </div>

        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-start">
            <h3 className="font-semibold text-gray-900 mb-3">{copy.detailsTitle}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{copy.orderId}</span>
                <span className="font-medium">{paymentDetails.orderId}</span>
              </div>
              {paymentDetails.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{copy.amount}</span>
                  <span className="font-medium">
                    {paymentDetails.amount} {paymentDetails.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">{copy.status}</span>
                <span className="font-medium text-orange-600">{copy.cancelledStatus}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/dashboard/shared/payment')}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            {copy.retry}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/player')}
            className="w-full gap-2"
          >
            <Home className="h-4 w-4" />
            {copy.backToDashboard}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full gap-2"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {copy.backToPrevious}
          </Button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>{copy.noCharge}</p>
          <p>{copy.retryAnytime}</p>
        </div>
      </Card>
    </div>
  );
}
