'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout.jsx';
import { XCircle, RefreshCw, ArrowLeft, HelpCircle, CreditCard } from 'lucide-react';
import { Locale, useTranslation } from '@/lib/i18n';

const PAYMENT_FAILURE_COPY: Record<Locale, {
  selectedPackage: string;
  defaultError: string;
  mailSubject: string;
  title: string;
  subtitle: string;
  detailsTitle: string;
  amount: string;
  package: string;
  errorCode: string;
  date: string;
  suggestedSolutions: string;
  checkCardTitle: string;
  checkCardDesc: string;
  retryTitle: string;
  retryDesc: string;
  supportTitle: string;
  supportDesc: string;
  retryPayment: string;
  backToDashboard: string;
  contactSupport: string;
  tipsTitle: string;
  tips: string[];
  errors: Record<string, string>;
}> = {
  ar: {
    selectedPackage: 'الباقة المختارة',
    defaultError: 'حدث خطأ غير متوقع أثناء عملية الدفع',
    mailSubject: 'مشكلة في الدفع',
    title: 'فشلت عملية الدفع',
    subtitle: 'عذرًا، لم نتمكن من إتمام عملية الدفع. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.',
    detailsTitle: 'تفاصيل الخطأ',
    amount: 'المبلغ:',
    package: 'الباقة:',
    errorCode: 'رمز الخطأ:',
    date: 'التاريخ:',
    suggestedSolutions: 'حلول مقترحة 🔧',
    checkCardTitle: 'تحقق من البطاقة',
    checkCardDesc: 'تأكد من صحة بيانات البطاقة وتاريخ انتهاء الصلاحية.',
    retryTitle: 'حاول مرة أخرى',
    retryDesc: 'أعد المحاولة بعد بضع دقائق أو استخدم بطاقة أخرى.',
    supportTitle: 'تواصل معنا',
    supportDesc: 'فريق الدعم الفني جاهز لمساعدتك في حل المشكلة.',
    retryPayment: 'إعادة المحاولة',
    backToDashboard: 'العودة للوحة التحكم',
    contactSupport: 'تواصل مع الدعم',
    tipsTitle: '💡 نصائح مهمة',
    tips: [
      'تأكد من أن البطاقة تدعم المدفوعات الإلكترونية',
      'تحقق من رصيد البطاقة قبل المحاولة',
      'استخدم متصفحًا محدثًا واتصال إنترنت مستقرًا',
      'إذا استمرت المشكلة، جرب بطاقة أخرى',
    ],
    errors: {
      INSUFFICIENT_FUNDS: 'رصيد غير كافٍ في البطاقة',
      CARD_DECLINED: 'تم رفض البطاقة من قبل البنك',
      EXPIRED_CARD: 'البطاقة منتهية الصلاحية',
      INVALID_CARD: 'بيانات البطاقة غير صحيحة',
      NETWORK_ERROR: 'خطأ في الاتصال بالشبكة',
      TIMEOUT: 'انتهت مهلة العملية',
      CANCELLED: 'تم إلغاء العملية من قبل المستخدم',
      UNKNOWN_ERROR: 'حدث خطأ غير متوقع',
    },
  },
  en: {
    selectedPackage: 'Selected package',
    defaultError: 'An unexpected error occurred during payment',
    mailSubject: 'Payment issue',
    title: 'Payment failed',
    subtitle: 'Sorry, we could not complete the payment. Please try again or contact support.',
    detailsTitle: 'Error details',
    amount: 'Amount:',
    package: 'Package:',
    errorCode: 'Error code:',
    date: 'Date:',
    suggestedSolutions: 'Suggested solutions 🔧',
    checkCardTitle: 'Check your card',
    checkCardDesc: 'Make sure the card details and expiry date are correct.',
    retryTitle: 'Try again',
    retryDesc: 'Retry after a few minutes or use another card.',
    supportTitle: 'Contact us',
    supportDesc: 'Our support team is ready to help you solve the issue.',
    retryPayment: 'Retry payment',
    backToDashboard: 'Back to dashboard',
    contactSupport: 'Contact support',
    tipsTitle: '💡 Important tips',
    tips: [
      'Make sure your card supports online payments',
      'Check your card balance before trying again',
      'Use an updated browser and a stable internet connection',
      'If the issue continues, try another card',
    ],
    errors: {
      INSUFFICIENT_FUNDS: 'Insufficient card balance',
      CARD_DECLINED: 'The card was declined by the bank',
      EXPIRED_CARD: 'The card has expired',
      INVALID_CARD: 'Invalid card details',
      NETWORK_ERROR: 'Network connection error',
      TIMEOUT: 'The transaction timed out',
      CANCELLED: 'The transaction was cancelled by the user',
      UNKNOWN_ERROR: 'An unexpected error occurred',
    },
  },
  es: {
    selectedPackage: 'Paquete seleccionado',
    defaultError: 'Ocurrió un error inesperado durante el pago',
    mailSubject: 'Problema de pago',
    title: 'El pago falló',
    subtitle: 'Lo sentimos, no pudimos completar el pago. Inténtalo de nuevo o contacta con soporte.',
    detailsTitle: 'Detalles del error',
    amount: 'Importe:',
    package: 'Paquete:',
    errorCode: 'Código de error:',
    date: 'Fecha:',
    suggestedSolutions: 'Soluciones sugeridas 🔧',
    checkCardTitle: 'Verifica la tarjeta',
    checkCardDesc: 'Asegúrate de que los datos de la tarjeta y la fecha de vencimiento sean correctos.',
    retryTitle: 'Inténtalo de nuevo',
    retryDesc: 'Vuelve a intentarlo después de unos minutos o usa otra tarjeta.',
    supportTitle: 'Contáctanos',
    supportDesc: 'Nuestro equipo de soporte está listo para ayudarte.',
    retryPayment: 'Reintentar pago',
    backToDashboard: 'Volver al panel',
    contactSupport: 'Contactar soporte',
    tipsTitle: '💡 Consejos importantes',
    tips: [
      'Asegúrate de que la tarjeta admite pagos en línea',
      'Verifica el saldo de la tarjeta antes de intentarlo',
      'Usa un navegador actualizado y una conexión estable',
      'Si el problema continúa, prueba otra tarjeta',
    ],
    errors: {
      INSUFFICIENT_FUNDS: 'Saldo insuficiente en la tarjeta',
      CARD_DECLINED: 'La tarjeta fue rechazada por el banco',
      EXPIRED_CARD: 'La tarjeta está vencida',
      INVALID_CARD: 'Datos de tarjeta inválidos',
      NETWORK_ERROR: 'Error de conexión de red',
      TIMEOUT: 'La transacción agotó el tiempo',
      CANCELLED: 'La transacción fue cancelada por el usuario',
      UNKNOWN_ERROR: 'Ocurrió un error inesperado',
    },
  },
  pt: {
    selectedPackage: 'Pacote selecionado',
    defaultError: 'Ocorreu um erro inesperado durante o pagamento',
    mailSubject: 'Problema no pagamento',
    title: 'Pagamento falhou',
    subtitle: 'Desculpe, não conseguimos concluir o pagamento. Tente novamente ou entre em contato com o suporte.',
    detailsTitle: 'Detalhes do erro',
    amount: 'Valor:',
    package: 'Pacote:',
    errorCode: 'Código do erro:',
    date: 'Data:',
    suggestedSolutions: 'Soluções sugeridas 🔧',
    checkCardTitle: 'Verifique o cartão',
    checkCardDesc: 'Confira se os dados do cartão e a validade estão corretos.',
    retryTitle: 'Tente novamente',
    retryDesc: 'Tente novamente em alguns minutos ou use outro cartão.',
    supportTitle: 'Fale conosco',
    supportDesc: 'Nossa equipe de suporte está pronta para ajudar.',
    retryPayment: 'Tentar novamente',
    backToDashboard: 'Voltar ao painel',
    contactSupport: 'Contatar suporte',
    tipsTitle: '💡 Dicas importantes',
    tips: [
      'Verifique se o cartão aceita pagamentos online',
      'Confira o saldo do cartão antes de tentar novamente',
      'Use um navegador atualizado e uma conexão estável',
      'Se o problema continuar, tente outro cartão',
    ],
    errors: {
      INSUFFICIENT_FUNDS: 'Saldo insuficiente no cartão',
      CARD_DECLINED: 'O cartão foi recusado pelo banco',
      EXPIRED_CARD: 'O cartão está vencido',
      INVALID_CARD: 'Dados do cartão inválidos',
      NETWORK_ERROR: 'Erro de conexão de rede',
      TIMEOUT: 'A transação expirou',
      CANCELLED: 'A transação foi cancelada pelo usuário',
      UNKNOWN_ERROR: 'Ocorreu um erro inesperado',
    },
  },
};

const errorIcons: Record<string, string> = {
  INSUFFICIENT_FUNDS: '💰',
  CARD_DECLINED: '❌',
  EXPIRED_CARD: '📅',
  INVALID_CARD: '🔒',
  NETWORK_ERROR: '🌐',
  TIMEOUT: '⏰',
  CANCELLED: '🚫',
  UNKNOWN_ERROR: '❓',
};

export default function PaymentFailurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL } = useTranslation();
  const copy = PAYMENT_FAILURE_COPY[locale] || PAYMENT_FAILURE_COPY.en;
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const error = searchParams.get('error');
    const errorCode = searchParams.get('errorCode') || 'UNKNOWN_ERROR';
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency');
    const packageName = searchParams.get('package');

    setErrorDetails({
      error: error || copy.defaultError,
      errorCode,
      amount,
      currency,
      packageName: packageName || copy.selectedPackage,
      timestamp: new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US')
    });

    setLoading(false);
  }, [searchParams, copy.defaultError, copy.selectedPackage, isRTL]);

  const getErrorMessage = (errorCode: string) => copy.errors[errorCode] || copy.errors.UNKNOWN_ERROR;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {copy.title} {errorIcons[errorDetails?.errorCode] || errorIcons.UNKNOWN_ERROR}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{copy.subtitle}</p>
          </div>

          {errorDetails && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">{copy.detailsTitle}</h2>
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="mx-3">
                      <h3 className="text-lg font-semibold text-red-800 mb-2">{getErrorMessage(errorDetails.errorCode)}</h3>
                      <p className="text-red-700">{errorDetails.error}</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">{copy.amount}</span>
                      <span className="text-lg font-semibold text-gray-800">{errorDetails.amount} {errorDetails.currency}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">{copy.package}</span>
                      <span className="text-lg font-semibold text-blue-600">{errorDetails.packageName}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">{copy.errorCode}</span>
                      <span className="text-sm font-mono text-gray-800">{errorDetails.errorCode}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">{copy.date}</span>
                      <span className="text-sm text-gray-800">{errorDetails.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">{copy.suggestedSolutions}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: CreditCard, title: copy.checkCardTitle, desc: copy.checkCardDesc },
                { icon: RefreshCw, title: copy.retryTitle, desc: copy.retryDesc },
                { icon: HelpCircle, title: copy.supportTitle, desc: copy.supportDesc },
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
            <button onClick={() => router.push('/dashboard/payment')} className="flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl">
              <RefreshCw className="w-5 h-5 mx-2" />
              <span>{copy.retryPayment}</span>
            </button>
            <button onClick={() => router.push('/dashboard')} className="flex items-center justify-center px-8 py-4 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors duration-200 shadow-lg hover:shadow-xl">
              <ArrowLeft className="w-5 h-5 mx-2" />
              <span>{copy.backToDashboard}</span>
            </button>
            <button onClick={() => window.open(`mailto:support@example.com?subject=${encodeURIComponent(copy.mailSubject)}`, '_blank')} className="flex items-center justify-center px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl">
              <HelpCircle className="w-5 h-5 mx-2" />
              <span>{copy.contactSupport}</span>
            </button>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">{copy.tipsTitle}</h3>
              <ul className="text-blue-700 text-start space-y-1">
                {copy.tips.map((tip) => <li key={tip}>• {tip}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
