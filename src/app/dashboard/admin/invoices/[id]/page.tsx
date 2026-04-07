'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Download, Printer, Loader2 } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  paid:           { label: 'تم الدفع',           color: '#16a34a', bg: '#dcfce7' },
  completed:      { label: 'مكتمل',              color: '#16a34a', bg: '#dcfce7' },
  success:        { label: 'ناجح',                color: '#16a34a', bg: '#dcfce7' },
  pending:        { label: 'بانتظار الدفع',       color: '#d97706', bg: '#fef3c7' },
  pending_review: { label: 'قيد مراجعة الإيصال', color: '#2563eb', bg: '#dbeafe' },
  cancelled:      { label: 'ملغي',                color: '#6b7280', bg: '#f3f4f6' },
  failed:         { label: 'فاشل',                color: '#dc2626', bg: '#fee2e2' },
  overdue:        { label: 'متأخر',               color: '#ea580c', bg: '#ffedd5' },
};

const METHOD_MAP: Record<string, string> = {
  geidea: 'جيديا (بطاقة)', bank_transfer: 'تحويل بنكي', instapay: 'InstaPay',
  skipcash: 'SkipCash', stc_pay: 'STC Pay', wallet: 'محفظة إلكترونية',
  cash: 'نقدي', vodafone_cash: 'فودافون كاش', card: 'بطاقة بنكية',
};

const formatDateTime = (dateLike: any) => {
  const d = (() => {
    if (!dateLike) return undefined as any;
    if (typeof dateLike === 'string' || typeof dateLike === 'number') {
      const v = new Date(dateLike); if (!isNaN(v.getTime())) return v;
    }
    if (dateLike instanceof Date) return dateLike;
    return undefined;
  })();
  if (!d) return 'غير محدد';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateLike: any) => {
  const d = (() => {
    if (!dateLike) return undefined as any;
    if (typeof dateLike === 'string' || typeof dateLike === 'number') {
      const v = new Date(dateLike); if (!isNaN(v.getTime())) return v;
    }
    if (dateLike instanceof Date) return dateLike;
    return undefined;
  })();
  if (!d) return 'غير محدد';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatCurrency = (amount: number, currency = 'EGP') => {
  try {
    return Intl.NumberFormat('ar-EG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount || 0);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function InvoiceDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('invoices').select('*').eq('id', params.id).single();
        if (error || !data) { router.push('/dashboard/admin/invoices'); return; }
        setInvoice(data);
      } finally {
        setLoading(false);
      }
    };
    if (params?.id) load();
  }, [params, router]);

  const handlePrint = () => {
    if (!invoice) return;
    const st = STATUS_MAP[invoice.status] || { label: invoice.status, color: '#6b7280', bg: '#f3f4f6' };
    const method = METHOD_MAP[invoice.payment_method] || invoice.payment_method || '—';
    const amount = Number(invoice.amount || 0);
    const currency = invoice.currency || 'EGP';
    const printDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    // دائماً رابط الإنتاج — لا يُظهر localhost للعميل أبداً
    const invoiceUrl = `https://el7lm.com/invoice/${invoice.id}`;
    const logoUrl = `${window.location.origin}/el7lm-logo.png`;
    // تقصير رقم الفاتورة إن كان UUID أو طويلاً
    const rawInvNum = invoice.invoice_number || invoice.id || '';
    const shortInvNum = rawInvNum.length > 20 ? `INV-${rawInvNum.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : rawInvNum;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>فاتورة ${invoice.invoice_number || invoice.id} - منصة الحلم</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cairo',Arial,sans-serif;background:#f1f5f9;color:#1e293b;padding:32px 16px}
    .wrap{max-width:720px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
    /* HEADER */
    .header{background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:center}
    .brand{color:#fff}.brand h1{font-size:22px;font-weight:900;margin-bottom:4px}.brand p{font-size:12px;opacity:.8}
    .logo img{height:52px;object-fit:contain}
    /* STATUS BAR */
    .status-bar{background:#f8fafc;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0}
    .inv-num{font-size:14px;font-weight:700;color:#1e293b}.inv-num span{color:#3b82f6;font-family:monospace}
    .status-badge{padding:5px 16px;border-radius:999px;font-size:12px;font-weight:700;color:${st.color};background:${st.bg};border:1px solid ${st.color}40}
    /* BODY */
    .body{padding:28px 32px}
    h2{font-size:14px;font-weight:700;color:#1e3a8a;margin:22px 0 10px;padding-right:10px;border-right:3px solid #3b82f6}
    table{width:100%;border-collapse:collapse;font-size:13px}
    tr:nth-child(even) th,tr:nth-child(even) td{background:#f8fafc}
    th{padding:10px 14px;text-align:right;font-weight:600;color:#475569;width:36%;border:1px solid #e2e8f0}
    td{padding:10px 14px;color:#1e293b;border:1px solid #e2e8f0}
    .amount-row td{font-size:20px;font-weight:900;color:#1e3a8a}
    /* VERIFY */
    .verify-box{margin:22px 0 0;padding:14px 16px;background:#eff6ff;border-radius:10px;text-align:center;font-size:12px;color:#475569}
    .verify-box a{color:#2563eb;font-weight:600}
    /* FOOTER */
    .footer{padding:18px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8}
    .footer-brand{font-size:13px;font-weight:700;color:#1e3a8a}
    /* PRINT BUTTONS */
    .no-print{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:999}
    .btn{background:#1e3a8a;color:#fff;border:none;padding:12px 28px;border-radius:12px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:14px}
    .btn-close{background:#f1f5f9;color:#475569}
    @media print{body{background:#fff;padding:0}.wrap{box-shadow:none;border-radius:0}.no-print{display:none!important}@page{margin:15mm 12mm}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="brand">
      <h1>فاتورة رسمية</h1>
      <p>منصة الحلم الرياضية — إدارة الاشتراكات</p>
    </div>
    <div class="logo">
      <img src="${logoUrl}" alt="El7lm" onerror="this.style.display='none'"/>
    </div>
  </div>

  <div class="status-bar">
    <div class="inv-num">رقم الفاتورة: <span>${shortInvNum}</span></div>
    <div class="status-badge">${st.label}</div>
  </div>

  <div class="body">
    <h2>تفاصيل الفاتورة</h2>
    <table>
      <tr><th>الباقة / الخدمة</th><td>${invoice.plan_name || '—'}</td></tr>
      <tr><th>طريقة الدفع</th><td>${method}</td></tr>
      ${invoice.transactionId || invoice.transaction_id ? `<tr><th>رقم المعاملة</th><td>${invoice.transactionId || invoice.transaction_id}</td></tr>` : ''}
      <tr><th>تاريخ الإصدار</th><td>${formatDate(invoice.created_at)}</td></tr>
      ${invoice.paid_at || invoice.paidAt ? `<tr><th>تاريخ السداد</th><td>${formatDate(invoice.paid_at || invoice.paidAt)}</td></tr>` : ''}
      <tr class="amount-row"><th>المبلغ الإجمالي</th><td>${formatCurrency(amount, currency)}</td></tr>
    </table>

    <h2>بيانات العميل</h2>
    <table>
      <tr><th>الاسم</th><td>${invoice.user_name || invoice.customerName || 'غير محدد'}</td></tr>
      ${invoice.user_email || invoice.customerEmail ? `<tr><th>البريد الإلكتروني</th><td>${invoice.user_email || invoice.customerEmail}</td></tr>` : ''}
      ${invoice.phone || invoice.customerPhone ? `<tr><th>الهاتف</th><td>${invoice.phone || invoice.customerPhone}</td></tr>` : ''}
    </table>

    <div class="verify-box">
      <p>رابط الفاتورة الإلكتروني:</p>
      <p style="margin-top:6px"><a href="${invoiceUrl}">${invoiceUrl}</a></p>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="footer-brand">منصة الحلم</div>
      <div>info@el7lm.com | www.el7lm.com</div>
    </div>
    <div style="text-align:center;color:#475569;font-size:12px">
      هذه فاتورة رسمية — لا تحتاج إلى توقيع أو ختم
    </div>
    <div style="text-align:left">طُبعت: ${printDate}</div>
  </div>
</div>

<div class="no-print">
  <button class="btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <button class="btn btn-close" onclick="window.close()">✕ إغلاق</button>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) { alert('يرجى السماح بالنوافذ المنبثقة'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!invoice) return (
    <div className="min-h-[50vh] flex items-center justify-center text-gray-500">
      لم يتم العثور على الفاتورة
    </div>
  );

  const st = STATUS_MAP[invoice.status] || { label: invoice.status, color: '#6b7280', bg: '#f3f4f6' };
  const method = METHOD_MAP[invoice.payment_method] || invoice.payment_method || '—';
  const amount = Number(invoice.amount || 0);
  const currency = invoice.currency || 'EGP';

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl" dir="rtl">
      {/* Nav */}
      <Button variant="ghost" onClick={() => router.push('/dashboard/admin/invoices')} className="mb-4 gap-2">
        <ArrowRight className="w-4 h-4" /> العودة للقائمة
      </Button>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">فاتورة {invoice.invoice_number || invoice.id}</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDateTime(invoice.created_at)}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> طباعة
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-blue-700 hover:bg-blue-800 text-white">
            <Download className="w-4 h-4" /> تحميل PDF
          </Button>
        </div>
      </div>

      {/* Invoice Card */}
      <Card className="overflow-hidden shadow-sm">
        {/* Gradient Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }} className="p-6 flex justify-between items-center">
          <div className="text-white">
            <h2 className="text-xl font-black">فاتورة رسمية</h2>
            <p className="text-sm opacity-80">منصة الحلم الرياضية</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://assets.el7lm.com/logo.png" alt="El7lm" className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center px-6 py-3 bg-gray-50 border-b">
          <span className="text-sm font-semibold text-gray-700">
            رقم الفاتورة: <span className="font-mono text-blue-600">{invoice.invoice_number || invoice.id}</span>
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full border" style={{ color: st.color, background: st.bg, borderColor: `${st.color}40` }}>
            {st.label}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Details */}
          <div>
            <h3 className="text-sm font-bold text-blue-800 mb-3 pr-3 border-r-2 border-blue-500">تفاصيل الفاتورة</h3>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['الباقة / الخدمة', invoice.plan_name || '—'],
                  ['طريقة الدفع', method],
                  ...(invoice.transactionId || invoice.transaction_id ? [['رقم المعاملة', invoice.transactionId || invoice.transaction_id]] : []),
                  ['تاريخ الإصدار', formatDate(invoice.created_at)],
                  ...(invoice.paid_at || invoice.paidAt ? [['تاريخ السداد', formatDate(invoice.paid_at || invoice.paidAt)]] : []),
                ].map(([label, value], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <th className="text-right p-3 font-semibold text-gray-500 border border-gray-200 w-36">{label}</th>
                    <td className="p-3 text-gray-800 border border-gray-200">{value}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50">
                  <th className="text-right p-3 font-semibold text-gray-500 border border-gray-200 w-36">المبلغ الإجمالي</th>
                  <td className="p-3 text-xl font-black text-blue-800 border border-gray-200">{formatCurrency(amount, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Customer Details */}
          <div>
            <h3 className="text-sm font-bold text-blue-800 mb-3 pr-3 border-r-2 border-blue-500">بيانات العميل</h3>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['الاسم', invoice.user_name || invoice.customerName || 'غير محدد'],
                  ...(invoice.user_email || invoice.customerEmail ? [['البريد الإلكتروني', invoice.user_email || invoice.customerEmail]] : []),
                  ...(invoice.phone || invoice.customerPhone ? [['الهاتف', invoice.phone || invoice.customerPhone]] : []),
                ].map(([label, value], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <th className="text-right p-3 font-semibold text-gray-500 border border-gray-200 w-36">{label}</th>
                    <td className="p-3 text-gray-800 border border-gray-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Verify Link */}
          <div className="bg-blue-50 rounded-xl p-4 text-center text-sm text-gray-500">
            <p>رابط الفاتورة الإلكتروني:</p>
            <a href={`/invoice/${invoice.id}`} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold break-all">
              {typeof window !== 'undefined' ? window.location.origin : 'https://el7lm.com'}/invoice/{invoice.id}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 text-xs text-gray-400">
          <div>
            <span className="font-bold text-blue-800 text-sm">منصة الحلم</span>
            <span className="mx-2">|</span>info@el7lm.com | www.el7lm.com
          </div>
          <div>هذه فاتورة رسمية — لا تحتاج إلى توقيع أو ختم</div>
        </div>
      </Card>
    </div>
  );
}
