'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
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
        status: status || 'success'
      });
    }

    setIsLoading(false);

    // إرسال إشعار نجاح الدفع
    if (orderId && status === 'success') {
      console.log('✅ Payment successful:', orderId);
      // TODO: إرسال إشعار للمستخدم
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل تفاصيل الدفع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            تم الدفع بنجاح!
          </h1>
          <p className="text-gray-600">
            شكراً لك على الدفع. تم تأكيد معاملتك بنجاح.
          </p>
        </div>

        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-right">
            <h3 className="font-semibold text-gray-900 mb-3">تفاصيل الدفع</h3>
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
                <span className="font-medium text-green-600">مكتمل</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/dashboard/player')}
            className="w-full bg-green-600 hover:bg-green-700"
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
          <p>سيتم إرسال إيصال الدفع إلى بريدك الإلكتروني</p>
          <p>إذا كان لديك أي استفسار، يرجى التواصل مع الدعم الفني</p>
        </div>
      </Card>
    </div>
  );
}
