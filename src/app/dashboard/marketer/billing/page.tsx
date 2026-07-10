'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  packageType: string;
  createdAt: any;
  description: string;
  transactionId?: string;
}

export default function MarketerBillingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      // جلب المدفوعات من جدول bulkPayments
      const { data: bulkPayments, error: bulkError } = await supabase
        .from('bulkPayments')
        .select('*')
        .eq('userId', user?.id)
        .order('createdAt', { ascending: false });

      if (bulkError) throw bulkError;

      // جلب المدفوعات من جدول payments (إذا وجدت)
      let regularPayments: PaymentRecord[] = [];
      try {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('userId', user?.id)
          .order('createdAt', { ascending: false });

        if (paymentsData) {
          regularPayments = paymentsData as PaymentRecord[];
        }
      } catch (error) {
        console.log('No regular payments table found');
      }

      // دمج المدفوعات وترتيبها حسب التاريخ
      const allPayments = [...(bulkPayments || []), ...regularPayments].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setPayments(allPayments as PaymentRecord[]);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'paid':
        return t('billing.statusCompleted');
      case 'pending':
        return t('billing.statusPending');
      case 'failed':
        return t('billing.statusFailed');
      case 'cancelled':
        return t('billing.statusCancelled');
      default:
        return t('billing.statusUnknown');
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'geidea': return t('billing.methodCard');
      case 'skipcash': return t('billing.methodSkipCash');
      case 'vodafone_cash': return t('billing.methodVodafoneCash');
      case 'etisalat_cash': return t('billing.methodEtisalatCash');
      case 'instapay': return t('billing.methodInstapay');
      case 'bank_transfer': return t('billing.methodBankTransfer');
      default: return method || t('billing.unknown');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return t('billing.unknown');
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString(t('common.dayjsLocale') || 'ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('billing.loadingBilling')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('billing.title')}
        </h1>
        <p className="text-gray-600">
          {t('billing.subtitle')}
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('billing.noPayments')}
          </h3>
          <p className="text-gray-600">
            {t('billing.noPaymentsDesc')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('billing.colDescription')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('billing.colAmount')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('billing.colStatus')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('billing.colPaymentMethod')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('billing.colDate')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.description || payment.packageType || t('billing.title')}
                      </div>
                      {payment.transactionId && (
                        <div className="text-sm text-gray-500">
                          {t('billing.transactionId')} {payment.transactionId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.amount} {payment.currency || 'EGP'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodText(payment.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
