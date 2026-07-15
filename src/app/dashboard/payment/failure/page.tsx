'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout.jsx';
import { XCircle, RefreshCw, ArrowLeft, HelpCircle, CreditCard } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

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
  const { locale, isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('paymentFailure');
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
      timestamp: new Date().toLocaleString({ ar: 'ar-SA', en: 'en-US', es: 'es-ES', pt: 'pt-BR' }[locale])
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
