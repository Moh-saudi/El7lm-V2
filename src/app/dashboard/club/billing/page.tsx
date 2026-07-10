'use client';
import { FileText, CheckCircle, XCircle, Clock, Eye, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

export default function BillingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const bills = [
    {
      id: 'INV-001',
      amountVal: 500,
      statusKey: 'billing.statusPaid',
      issued: '2024-05-01',
      due: '2024-05-10',
    },
    {
      id: 'INV-002',
      amountVal: 700,
      statusKey: 'billing.statusPending',
      issued: '2024-06-01',
      due: '2024-06-10',
    },
    {
      id: 'INV-003',
      amountVal: 300,
      statusKey: 'billing.statusOverdue',
      issued: '2024-04-01',
      due: '2024-04-10',
    },
  ];

  const statusColor = (statusKey: string) => {
    switch (statusKey) {
      case 'billing.statusPaid': return 'bg-green-100 text-green-700';
      case 'billing.statusPending': return 'bg-yellow-100 text-yellow-700';
      case 'billing.statusOverdue': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const statusIcon = (statusKey: string) => {
    switch (statusKey) {
      case 'billing.statusPaid': return <CheckCircle className="text-green-500" size={20} />;
      case 'billing.statusPending': return <Clock className="text-yellow-500" size={20} />;
      case 'billing.statusOverdue': return <XCircle className="text-red-500" size={20} />;
      default: return <FileText size={20} />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        {t('billing.backToDashboard')}
      </button>
      <h1 className="text-2xl font-bold mb-8 text-primary">{t('billing.subscriptionsAndBills')}</h1>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <table className="w-full text-right">
          <thead>
            <tr className="text-gray-600 border-b">
              <th className="py-2">{t('billing.colBillNumber')}</th>
              <th className="py-2">{t('billing.colAmount')}</th>
              <th className="py-2">{t('billing.colStatus')}</th>
              <th className="py-2">{t('billing.colIssuedDate')}</th>
              <th className="py-2">{t('billing.colDueDate')}</th>
              <th className="py-2">{t('billing.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-b hover:bg-gray-50 transition">
                <td className="py-3 font-bold">{bill.id}</td>
                <td className="py-3">{bill.amountVal} {t('billing.currencyRiyal')}</td>
                <td className="py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${statusColor(bill.statusKey)}`}>
                    {statusIcon(bill.statusKey)}
                    {t(bill.statusKey)}
                  </span>
                </td>
                <td className="py-3">{bill.issued}</td>
                <td className="py-3">{bill.due}</td>
                <td className="py-3">
                  <button className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-l from-blue-400 to-blue-600 text-white hover:scale-105 transition">
                    <Eye size={16} /> {t('billing.details')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
