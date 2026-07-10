'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function AgentBilling() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-purple-700">{t('billing.subscriptionsAndBills')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('billing.subscriptionDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{t('billing.agentBillingDesc')}</p>
        </CardContent>
      </Card>
    </div>
  );
} 
