'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { CheckCircle, Clock, ExternalLink, RefreshCw, Shield, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

type Payment = {
  id: string;
  payer_id: string;
  payer_type: string;
  plan_id: string | null;
  amount: number | string;
  currency: string;
  method: string;
  provider: string | null;
  status: string;
  review_status: string | null;
  receipt_url: string | null;
  created_at: string;
  payment_targets?: Array<{ id: string; target_player_id: string; status: string }>;
};

export default function PaymentsManagementPage() {
  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({ allowedTypes: ['admin'] });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('all');

  const fetchPayments = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', status });
      const response = await authenticatedFetch(`/api/admin/payments?${params}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to load payments');
      setPayments(result.data || []);
      setTotalPages(Math.max(1, result.pagination?.totalPages || 1));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تحميل المدفوعات');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, page, status]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const review = async (paymentId: string, action: 'approve' | 'reject') => {
    let rejectionReason: string | undefined;
    if (action === 'reject') {
      rejectionReason = window.prompt('سبب الرفض (اختياري):') || undefined;
    }
    setReviewing(paymentId);
    try {
      const response = await authenticatedFetch('/api/admin/payments/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action, rejectionReason }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Review failed');
      toast.success(action === 'approve' ? 'تم اعتماد الدفع وتفعيل الاشتراك' : 'تم رفض الدفع');
      await fetchPayments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تحديث الدفع');
    } finally {
      setReviewing(null);
    }
  };

  if (isCheckingAuth) return <div className="min-h-screen grid place-items-center"><RefreshCw className="animate-spin" /></div>;
  if (!isAuthorized) return <div className="min-h-screen grid place-items-center"><div className="text-center"><Shield className="mx-auto mb-3 text-red-600" /><h1 className="text-xl font-bold">غير مصرح لك</h1></div></div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">إدارة المدفوعات</h1>
            <p className="mt-1 text-sm text-gray-500">المصدر الموحد: payments + payment_targets</p>
          </div>
          <div className="flex gap-2">
            <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-lg border px-3 py-2">
              <option value="all">كل الحالات</option>
              <option value="pending_review">قيد المراجعة</option>
              <option value="processing">قيد المعالجة</option>
              <option value="paid">مدفوع</option>
              <option value="rejected">مرفوض</option>
              <option value="failed">فشل</option>
            </select>
            <button onClick={fetchPayments} className="rounded-lg border bg-white px-3 py-2 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-4">التاريخ</th><th className="p-4">الدافع</th><th className="p-4">الباقة</th>
                  <th className="p-4">المستفيدون</th><th className="p-4">المبلغ</th><th className="p-4">الطريقة</th>
                  <th className="p-4">الحالة</th><th className="p-4">الإثبات / الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="p-16 text-center"><RefreshCw className="mx-auto animate-spin" /></td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={8} className="p-16 text-center text-gray-500">لا توجد مدفوعات</td></tr>
                ) : payments.map((payment) => {
                  const pendingManual = payment.provider === 'manual' && payment.status === 'pending_review';
                  return (
                    <tr key={payment.id} className="align-top hover:bg-gray-50">
                      <td className="p-4 whitespace-nowrap">{new Date(payment.created_at).toLocaleString('ar-EG')}</td>
                      <td className="p-4"><div className="font-medium">{payment.payer_type}</div><div className="max-w-40 truncate font-mono text-xs text-gray-400" title={payment.payer_id}>{payment.payer_id}</div></td>
                      <td className="p-4 font-mono text-xs">{payment.plan_id || '—'}</td>
                      <td className="p-4"><span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-700">{payment.payment_targets?.length || 0}</span></td>
                      <td className="p-4 whitespace-nowrap font-bold">{Number(payment.amount).toLocaleString()} {payment.currency}</td>
                      <td className="p-4"><div>{payment.method}</div><div className="text-xs text-gray-400">{payment.provider || '—'}</div></td>
                      <td className="p-4"><Status status={payment.status} /></td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {payment.receipt_url && <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-blue-700"><ExternalLink className="h-3 w-3" />الإثبات</a>}
                          {pendingManual && <>
                            <button disabled={reviewing === payment.id} onClick={() => review(payment.id, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-white disabled:opacity-50"><CheckCircle className="h-3 w-3" />اعتماد</button>
                            <button disabled={reviewing === payment.id} onClick={() => review(payment.id, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-white disabled:opacity-50"><XCircle className="h-3 w-3" />رفض</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-4 border-t p-4">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">السابق</button>
            <span className="font-bold">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">التالي</button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Status({ status }: { status: string }) {
  if (status === 'paid') return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-700"><CheckCircle className="h-3 w-3" />مدفوع</span>;
  if (status === 'pending_review' || status === 'processing') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700"><Clock className="h-3 w-3" />{status === 'pending_review' ? 'مراجعة' : 'معالجة'}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700"><XCircle className="h-3 w-3" />{status}</span>;
}
