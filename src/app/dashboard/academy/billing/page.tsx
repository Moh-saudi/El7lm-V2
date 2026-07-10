'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Download, Eye } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const ACADEMY_BILLING_COPY = {
  ar: {
    title: 'الاشتراكات والفواتير',
    subscriptionDetails: 'تفاصيل الاشتراك',
    description: 'صفحة إدارة الاشتراكات والفواتير للأكاديميات',
  },
  en: {
    title: 'Subscriptions and invoices',
    subscriptionDetails: 'Subscription details',
    description: 'Academy subscriptions and invoices management page',
  },
  es: {
    title: 'Suscripciones y facturas',
    subscriptionDetails: 'Detalles de la suscripción',
    description: 'Página de gestión de suscripciones y facturas para academias',
  },
  pt: {
    title: 'Assinaturas e faturas',
    subscriptionDetails: 'Detalhes da assinatura',
    description: 'Página de gestão de assinaturas e faturas para academias',
  },
} as const;

export default function AcademyBilling() {
  const { locale } = useTranslation();
  const copy = ACADEMY_BILLING_COPY[locale] || ACADEMY_BILLING_COPY.en;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-orange-700">{copy.title}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {copy.subscriptionDetails}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{copy.description}</p>
        </CardContent>
      </Card>
    </div>
  );
} 
