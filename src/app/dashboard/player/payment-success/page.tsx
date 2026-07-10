'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Locale, useTranslation } from '@/lib/i18n';

const PLAYER_PAYMENT_SUCCESS_COPY: Record<Locale, {
  loading: string;
  title: string;
  description: string;
  detailsTitle: string;
  orderId: string;
  amount: string;
  status: string;
  completed: string;
  backToDashboard: string;
  backToPrevious: string;
  receiptNote: string;
  supportNote: string;
}> = {
  ar: {
    loading: 'جاري تحميل تفاصيل الدفع...',
    title: 'تم الدفع بنجاح!',
    description: 'شكرًا لك على الدفع. تم تأكيد معاملتك بنجاح.',
    detailsTitle: 'تفاصيل الدفع',
    orderId: 'رقم الطلب:',
    amount: 'المبلغ:',
    status: 'الحالة:',
    completed: 'مكتمل',
    backToDashboard: 'العودة للوحة التحكم',
    backToPrevious: 'العودة للصفحة السابقة',
    receiptNote: 'سيتم إرسال إيصال الدفع إلى بريدك الإلكتروني',
    supportNote: 'إذا كان لديك أي استفسار، يرجى التواصل مع الدعم الفني',
  },
  en: {
    loading: 'Loading payment details...',
    title: 'Payment successful!',
    description: 'Thank you for your payment. Your transaction has been confirmed successfully.',
    detailsTitle: 'Payment details',
    orderId: 'Order ID:',
    amount: 'Amount:',
    status: 'Status:',
    completed: 'Completed',
    backToDashboard: 'Back to dashboard',
    backToPrevious: 'Back to previous page',
    receiptNote: 'The payment receipt will be sent to your email',
    supportNote: 'If you have any questions, please contact technical support',
  },
  es: {
    loading: 'Cargando detalles del pago...',
    title: '¡Pago realizado con éxito!',
    description: 'Gracias por tu pago. Tu transacción se confirmó correctamente.',
    detailsTitle: 'Detalles del pago',
    orderId: 'ID del pedido:',
    amount: 'Importe:',
    status: 'Estado:',
    completed: 'Completado',
    backToDashboard: 'Volver al panel',
    backToPrevious: 'Volver a la página anterior',
    receiptNote: 'El recibo de pago será enviado a tu correo electrónico',
    supportNote: 'Si tienes alguna pregunta, contacta con soporte técnico',
  },
  pt: {
    loading: 'Carregando detalhes do pagamento...',
    title: 'Pagamento realizado com sucesso!',
    description: 'Obrigado pelo pagamento. Sua transação foi confirmada com sucesso.',
    detailsTitle: 'Detalhes do pagamento',
    orderId: 'ID do pedido:',
    amount: 'Valor:',
    status: 'Status:',
    completed: 'Concluído',
    backToDashboard: 'Voltar ao painel',
    backToPrevious: 'Voltar à página anterior',
    receiptNote: 'O recibo do pagamento será enviado para seu e-mail',
    supportNote: 'Se tiver alguma dúvida, entre em contato com o suporte técnico',
  },
};

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL } = useTranslation();
  const copy = PLAYER_PAYMENT_SUCCESS_COPY[locale] || PLAYER_PAYMENT_SUCCESS_COPY.en;
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    if (orderId && status === 'success') {
      console.log('Payment successful:', orderId);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{copy.title}</h1>
          <p className="text-gray-600">{copy.description}</p>
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
                  <span className="font-medium">{paymentDetails.amount} {paymentDetails.currency}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">{copy.status}</span>
                <span className="font-medium text-green-600">{copy.completed}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={() => router.push('/dashboard/player')} className="w-full bg-green-600 hover:bg-green-700">
            <Home className="h-4 w-4 mx-2" />
            {copy.backToDashboard}
          </Button>

          <Button variant="outline" onClick={() => router.back()} className="w-full">
            <ArrowLeft className="h-4 w-4 mx-2" />
            {copy.backToPrevious}
          </Button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>{copy.receiptNote}</p>
          <p>{copy.supportNote}</p>
        </div>
      </Card>
    </div>
  );
}
