'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

export default function SkipCashReturnPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [invoiceId, setInvoiceId] = useState<string | null>(null);
    const [message, setMessage] = useState<string>('جاري التحقق من الدفع...');
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        const paymentId = searchParams.get('id'); // SkipCash typically returns ?id=...
        // Note: Sometimes params might differ (like ?paymentId=...). SkipCash docs say `?id={paymentId}&statusId={statusId}&status={status}` logic on return?
        // Or sometimes just ID.
        // Let's assume ?id= is the payment ID.

        const verifyPayment = async () => {
            if (!paymentId) {
                setStatus('error');
                setMessage('لم يتم العثور على معرف الدفع في الرابط (Reference Missing)');
                return;
            }

            try {
                const res = await fetch('/api/skipcash/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentId,
                        // We can also pass transactionId if we stored it in local storage, but Verify API should fetch via ID.
                    })
                });

                const data = await res.json();

                if (data.success) {
                    setStatus('success');
                    setMessage('تم الدفع والتحقق بنجاح! تم إصدار الفاتورة.');
                    setInvoiceId(data.invoiceId);
                    setDetails(data.data);
                } else {
                    setStatus('error');
                    setMessage('فشل التحقق: ' + (data.message || 'Unknown error'));
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage('حدث خطأ أثناء الاتصال بالخادم للتحقق.');
            }
        };

        verifyPayment();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-purple-600">
                <CardHeader className="text-center">
                    <CardTitle className="flex justify-center mb-4">
                        {status === 'loading' && <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />}
                        {status === 'success' && <CheckCircle2 className="w-12 h-12 text-green-500" />}
                        {status === 'error' && <XCircle className="w-12 h-12 text-red-500" />}
                    </CardTitle>
                    <CardTitle>
                        {status === 'loading' && 'جاري التحقق...'}
                        {status === 'success' && 'تمت العملية بنجاح!'}
                        {status === 'error' && 'فشلت العملية'}
                    </CardTitle>
                    <CardDescription>
                        {message}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'success' && details && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">رقم الفاتورة:</span>
                                <span className="font-bold font-mono">{invoiceId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">المبلغ:</span>
                                <span className="font-bold">{details.amount} {details.currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">المرجع:</span>
                                <span className="font-mono text-xs">{details.paymentId}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {status === 'success' && (
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => router.push('/dashboard/admin/invoices')}
                            >
                                <FileText className="w-4 h-4 ml-2" />
                                عرض الفواتير
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push('/dashboard/admin/skipcash')}
                        >
                            <ArrowRight className="w-4 h-4 ml-2" />
                            العودة لصفحة التجربة
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
