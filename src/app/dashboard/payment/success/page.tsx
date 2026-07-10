'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CheckCircle, ArrowRight, Star, Zap } from 'lucide-react';
import { Locale, useTranslation } from '@/lib/i18n';

const PAYMENT_SUCCESS_COPY: Record<Locale, {
  selectedPackage: string;
  unavailable: string;
  title: string;
  subtitle: string;
  detailsTitle: string;
  paidAmount: string;
  package: string;
  transactionId: string;
  transactionDate: string;
  benefitsTitle: string;
  instantAccessTitle: string;
  instantAccessDesc: string;
  exclusiveTitle: string;
  exclusiveDesc: string;
  supportTitle: string;
  supportDesc: string;
  backToDashboard: string;
  viewSubscription: string;
  emailTitle: string;
  emailDesc: string;
}> = {
  ar: {
    selectedPackage: 'الباقة المختارة',
    unavailable: 'غير متوفر',
    title: 'تم الدفع بنجاح! 🎉',
    subtitle: 'شكرًا لك على ثقتك بنا. تمت معالجة عملية الدفع بنجاح وتم تفعيل اشتراكك',
    detailsTitle: 'تفاصيل العملية',
    paidAmount: 'المبلغ المدفوع:',
    package: 'الباقة المختارة:',
    transactionId: 'رقم العملية:',
    transactionDate: 'تاريخ العملية:',
    benefitsTitle: 'مميزات اشتراكك الجديد ✨',
    instantAccessTitle: 'وصول فوري',
    instantAccessDesc: 'استمتع بجميع المميزات فورًا بعد الدفع',
    exclusiveTitle: 'مميزات حصرية',
    exclusiveDesc: 'وصول لجميع المحتويات والخدمات المميزة',
    supportTitle: 'دعم فني',
    supportDesc: 'دعم فني متواصل على مدار الساعة',
    backToDashboard: 'العودة للوحة التحكم',
    viewSubscription: 'عرض تفاصيل الاشتراك',
    emailTitle: '📧 تأكيد بالبريد الإلكتروني',
    emailDesc: 'تم إرسال تأكيد عملية الدفع إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها.',
  },
  en: {
    selectedPackage: 'Selected package',
    unavailable: 'Unavailable',
    title: 'Payment successful! 🎉',
    subtitle: 'Thank you for trusting us. Your payment was processed successfully and your subscription has been activated.',
    detailsTitle: 'Transaction details',
    paidAmount: 'Paid amount:',
    package: 'Selected package:',
    transactionId: 'Transaction ID:',
    transactionDate: 'Transaction date:',
    benefitsTitle: 'Your new subscription benefits ✨',
    instantAccessTitle: 'Instant access',
    instantAccessDesc: 'Enjoy all features immediately after payment.',
    exclusiveTitle: 'Exclusive benefits',
    exclusiveDesc: 'Access all premium content and services.',
    supportTitle: 'Technical support',
    supportDesc: 'Round-the-clock technical support.',
    backToDashboard: 'Back to dashboard',
    viewSubscription: 'View subscription details',
    emailTitle: '📧 Email confirmation',
    emailDesc: 'A payment confirmation has been sent to your email. Please check your inbox or spam folder.',
  },
  es: {
    selectedPackage: 'Paquete seleccionado',
    unavailable: 'No disponible',
    title: '¡Pago realizado con éxito! 🎉',
    subtitle: 'Gracias por confiar en nosotros. Tu pago se procesó correctamente y tu suscripción fue activada.',
    detailsTitle: 'Detalles de la transacción',
    paidAmount: 'Importe pagado:',
    package: 'Paquete seleccionado:',
    transactionId: 'ID de transacción:',
    transactionDate: 'Fecha de transacción:',
    benefitsTitle: 'Beneficios de tu nueva suscripción ✨',
    instantAccessTitle: 'Acceso inmediato',
    instantAccessDesc: 'Disfruta de todas las funciones inmediatamente después del pago.',
    exclusiveTitle: 'Beneficios exclusivos',
    exclusiveDesc: 'Accede a todos los contenidos y servicios premium.',
    supportTitle: 'Soporte técnico',
    supportDesc: 'Soporte técnico disponible las 24 horas.',
    backToDashboard: 'Volver al panel',
    viewSubscription: 'Ver detalles de la suscripción',
    emailTitle: '📧 Confirmación por correo',
    emailDesc: 'Hemos enviado la confirmación del pago a tu correo. Revisa tu bandeja de entrada o la carpeta de spam.',
  },
  pt: {
    selectedPackage: 'Pacote selecionado',
    unavailable: 'Indisponível',
    title: 'Pagamento realizado com sucesso! 🎉',
    subtitle: 'Obrigado pela confiança. Seu pagamento foi processado com sucesso e sua assinatura foi ativada.',
    detailsTitle: 'Detalhes da transação',
    paidAmount: 'Valor pago:',
    package: 'Pacote selecionado:',
    transactionId: 'ID da transação:',
    transactionDate: 'Data da transação:',
    benefitsTitle: 'Benefícios da sua nova assinatura ✨',
    instantAccessTitle: 'Acesso imediato',
    instantAccessDesc: 'Aproveite todos os recursos imediatamente após o pagamento.',
    exclusiveTitle: 'Benefícios exclusivos',
    exclusiveDesc: 'Acesse todos os conteúdos e serviços premium.',
    supportTitle: 'Suporte técnico',
    supportDesc: 'Suporte técnico disponível 24 horas por dia.',
    backToDashboard: 'Voltar ao painel',
    viewSubscription: 'Ver detalhes da assinatura',
    emailTitle: '📧 Confirmação por e-mail',
    emailDesc: 'Enviamos a confirmação do pagamento para seu e-mail. Verifique sua caixa de entrada ou pasta de spam.',
  },
};

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL } = useTranslation();
  const copy = PAYMENT_SUCCESS_COPY[locale] || PAYMENT_SUCCESS_COPY.en;
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency');
    const packageName = searchParams.get('package');
    const transactionId = searchParams.get('transactionId');

    if (amount && currency) {
      setPaymentDetails({
        amount,
        currency,
        packageName: packageName || copy.selectedPackage,
        transactionId: transactionId || copy.unavailable,
        timestamp: new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US')
      });
    }

    setLoading(false);
  }, [searchParams, copy.selectedPackage, copy.unavailable, isRTL]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{copy.title}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{copy.subtitle}</p>
          </div>

          {paymentDetails && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">{copy.detailsTitle}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">{copy.paidAmount}</span>
                    <span className="text-2xl font-bold text-green-600">{paymentDetails.amount} {paymentDetails.currency}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">{copy.package}</span>
                    <span className="text-lg font-semibold text-blue-600">{paymentDetails.packageName}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">{copy.transactionId}</span>
                    <span className="text-sm font-mono text-gray-800">{paymentDetails.transactionId}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">{copy.transactionDate}</span>
                    <span className="text-sm text-gray-800">{paymentDetails.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">{copy.benefitsTitle}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: copy.instantAccessTitle, desc: copy.instantAccessDesc },
                { icon: Star, title: copy.exclusiveTitle, desc: copy.exclusiveDesc },
                { icon: CheckCircle, title: copy.supportTitle, desc: copy.supportDesc },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="text-center" key={item.title}>
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-blue-100">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <span>{copy.backToDashboard}</span>
              <ArrowRight className="w-5 h-5 mx-2" />
            </button>
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="flex items-center justify-center px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <span>{copy.viewSubscription}</span>
              <Star className="w-5 h-5 mx-2" />
            </button>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">{copy.emailTitle}</h3>
              <p className="text-yellow-700">{copy.emailDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
