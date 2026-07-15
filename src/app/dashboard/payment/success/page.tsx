'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CheckCircle, ArrowRight, Star, Zap } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('paymentSuccess');
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
        timestamp: new Date().toLocaleString({ ar: 'ar-SA', en: 'en-US', es: 'es-ES', pt: 'pt-BR' }[locale])
      });
    }

    setLoading(false);
  }, [searchParams, copy.selectedPackage, copy.unavailable, locale]);

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
