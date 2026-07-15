'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Download, Eye } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function AcademyBilling() {
  const { getTranslations } = useTranslation();
  const copy = getTranslations<any>('academyBilling');

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
