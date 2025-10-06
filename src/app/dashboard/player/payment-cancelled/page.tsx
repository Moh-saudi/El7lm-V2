'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Home, RefreshCw, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentCancelledPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل تفاصيل الدفع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <XCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            تم إلغاء الدفع
          </h1>
          <p className="text-gray-600">
            تم إلغاء عملية الدفع. لم يتم خصم أي مبلغ من حسابك.
          </p>
        </div>

        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-right">
            <h3 className="font-semibold text-gray-900 mb-3">تفاصيل الطلب</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">رقم الطلب:</span>
                <span className="font-medium">{paymentDetails.orderId}</span>
              </div>
              {paymentDetails.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">المبلغ:</span>
                  <span className="font-medium">
                    {paymentDetails.amount} {paymentDetails.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">الحالة:</span>
                <span className="font-medium text-orange-600">ملغي</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/dashboard/shared/bulk-payment')}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            المحاولة مرة أخرى
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/player')}
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            العودة للوحة التحكم
          </Button>

          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة للصفحة السابقة
          </Button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>لم يتم خصم أي مبلغ من حسابك</p>
          <p>يمكنك المحاولة مرة أخرى في أي وقت</p>
        </div>
      </Card>
    </div>
  );
}
