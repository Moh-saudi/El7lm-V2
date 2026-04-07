'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowRight, Printer, Download, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const TABLES = [
  'invoices', 'geidea_payments', 'bulk_payments', 'bulkPayments',
  'wallet', 'instapay', 'payments', 'payment_results', 'tournament_payments',
];

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCurrency = (amount: number, currency: string = 'EGP') =>
  Intl.NumberFormat('ar-EG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

const formatDate = (value?: Date | null) => {
  if (!value) return 'غير محدد';
  return value.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const SOURCE_LABELS: Record<string, string> = {
  invoices: 'نظام الفواتير', geidea_payments: 'بطاقة بنكية (Geidea)',
  bulkPayments: 'دفع جماعي', bulk_payments: 'دفع جماعي',
  wallet: 'محفظة', instapay: 'InstaPay', payments: 'دفع عام',
  payment_results: 'نتائج الدفع', tournament_payments: 'مدفوعات البطولات',
};

const METHOD_LABELS: Record<string, string> = {
  geidea: 'بطاقة بنكية', bank_transfer: 'تحويل بنكي', instapay: 'InstaPay',
  skipcash: 'SkipCash', stc_pay: 'STC Pay', wallet: 'محفظة', cash: 'نقدي',
};

const STATUS_MAP: Record<string, { text: string; color: string; bg: string }> = {
  paid:           { text: 'مدفوع',        color: '#16a34a', bg: '#dcfce7' },
  completed:      { text: 'مكتمل',        color: '#16a34a', bg: '#dcfce7' },
  success:        { text: 'ناجح',          color: '#16a34a', bg: '#dcfce7' },
  pending:        { text: 'قيد المعالجة', color: '#d97706', bg: '#fef3c7' },
  pending_review: { text: 'قيد المراجعة', color: '#d97706', bg: '#fef3c7' },
  failed:         { text: 'فاشل',          color: '#dc2626', bg: '#fee2e2' },
  cancelled:      { text: 'ملغي',          color: '#6b7280', bg: '#f3f4f6' },
};

const generateInvoiceHTML = (record: any, invoiceUrl: string) => {
  const st = STATUS_MAP[record.status] || { text: record.status, color: '#6b7280', bg: '#f3f4f6' };
  const src = SOURCE_LABELS[record.source] || record.source;
  const method = METHOD_LABELS[record.paymentMethod] || record.paymentMethod || src;
  const refNum = record.transactionId || record.orderId || record.referenceNumber || '—';
  // تقصير رقم الفاتورة إن كان طويلاً
  const rawNum = record.invoiceNumber || record.id || '';
  const shortNum = rawNum.length > 20 ? `INV-${rawNum.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : rawNum;
  // رابط الإنتاج دائماً بدون localhost
  const prodUrl = invoiceUrl.replace(/^https?:\/\/localhost:[0-9]+/, 'https://el7lm.com');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>فاتورة ${record.invoiceNumber} - منصة الحلم</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cairo',Arial,sans-serif;background:#f1f5f9;color:#1e293b;padding:32px 16px}
    .wrap{max-width:700px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .top-bar{background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:center}
    .brand{color:#fff}.brand h1{font-size:22px;font-weight:700;margin-bottom:4px}.brand p{font-size:13px;opacity:.85}
    .logo-area img{height:52px;object-fit:contain}
    .status-bar{background:#f8fafc;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0}
    .inv-num{font-size:15px;font-weight:600;color:#1e293b}.inv-num span{color:#3b82f6}
    .status-badge{padding:5px 16px;border-radius:999px;font-size:13px;font-weight:700;color:${st.color};background:${st.bg};border:1px solid ${st.color}33}
    .body{padding:28px 32px}
    h2{font-size:15px;font-weight:700;color:#1e3a8a;margin:24px 0 10px;padding-right:10px;border-right:3px solid #3b82f6}
    table{width:100%;border-collapse:collapse;font-size:14px}
    tr:nth-child(even) th,tr:nth-child(even) td{background:#f8fafc}
    th{padding:10px 14px;text-align:right;font-weight:600;color:#475569;width:38%;border:1px solid #e2e8f0}
    td{padding:10px 14px;color:#1e293b;border:1px solid #e2e8f0}
    .amount-row td{font-size:18px;font-weight:700;color:#1e3a8a}
    .verify-box{margin:24px 0 0;padding:16px;background:#eff6ff;border-radius:10px;text-align:center;font-size:13px;color:#475569}
    .verify-box a{color:#2563eb;font-weight:600}
    .bottom{padding:18px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8}
    @media print{body{background:#fff;padding:0}.wrap{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top-bar">
    <div class="brand">
      <h1>فاتورة رسمية</h1>
      <p>منصة الحلم الرياضية</p>
    </div>
    <div class="logo-area">
      <img src="https://el7lm.com/el7lm-logo.png" alt="El7lm" onerror="this.style.display='none'"/>
    </div>
  </div>

  <div class="status-bar">
    <div class="inv-num">رقم الفاتورة: <span>${shortNum}</span></div>
    <div class="status-badge">${st.text}</div>
  </div>

  <div class="body">
    <h2>تفاصيل الفاتورة</h2>
    <table>
      <tr><th>الخدمة / الباقة</th><td>${record.planName || '—'}</td></tr>
      <tr><th>طريقة الدفع</th><td>${method}</td></tr>
      <tr><th>مصدر المعاملة</th><td>${src}</td></tr>
      ${refNum !== '—' ? `<tr><th>الرقم المرجعي</th><td>${refNum}</td></tr>` : ''}
      <tr><th>تاريخ الإنشاء</th><td>${formatDate(record.createdAt)}</td></tr>
      ${record.paidAt ? `<tr><th>تاريخ السداد</th><td>${formatDate(record.paidAt)}</td></tr>` : ''}
      <tr class="amount-row"><th>المبلغ الإجمالي</th><td>${formatCurrency(record.amount, record.currency)}</td></tr>
    </table>

    <h2>بيانات العميل</h2>
    <table>
      <tr><th>الاسم</th><td>${record.customerName || 'غير محدد'}</td></tr>
      ${record.customerEmail ? `<tr><th>البريد الإلكتروني</th><td>${record.customerEmail}</td></tr>` : ''}
      ${record.customerPhone ? `<tr><th>الهاتف</th><td>${record.customerPhone}</td></tr>` : ''}
    </table>

    <div class="verify-box">
      <p>يمكنك عرض هذه الفاتورة وطباعتها في أي وقت:</p>
      <p style="margin-top:6px"><a href="${prodUrl}">${prodUrl}</a></p>
    </div>
  </div>

  <div class="bottom">
    <strong>منصة الحلم</strong> &nbsp;|&nbsp; info@el7lm.com &nbsp;|&nbsp; www.el7lm.com<br/>
    هذه فاتورة رسمية صادرة إلكترونياً — لا تحتاج إلى توقيع أو ختم.
  </div>
</div>
</body>
</html>`;
};

export default function PublicInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!params.id) { setError('رقم الفاتورة مطلوب'); setLoading(false); return; }

      try {
        setLoading(true);
        let foundData: any = null;
        let source = '';

        for (const tableName of TABLES) {
          try {
            const { data: byId } = await supabase.from(tableName).select('*').eq('id', params.id).single();
            if (byId) { foundData = byId; source = tableName; break; }

            const fieldQueries = [
              supabase.from(tableName).select('*').eq('invoice_number', params.id).limit(1),
              supabase.from(tableName).select('*').eq('invoiceNumber', params.id).limit(1),
              supabase.from(tableName).select('*').eq('orderId', params.id).limit(1),
              supabase.from(tableName).select('*').eq('merchantReferenceId', params.id).limit(1),
            ];
            for (const q of fieldQueries) {
              const { data } = await q;
              if (data?.length) { foundData = data[0]; source = tableName; break; }
            }
            if (foundData) break;
          } catch { /* ignore */ }
        }

        if (!foundData) { setError('لم يتم العثور على الفاتورة'); setLoading(false); return; }

        const createdAt = toDate(foundData.created_at || foundData.createdAt || foundData.timestamp) || new Date();
        const paidAt = toDate(foundData.paid_at || foundData.paidAt || foundData.paymentDate);
        const amount = Number(foundData.amount ?? foundData.total ?? foundData.total_amount ?? 0) || 0;
        const currency = foundData.currency || foundData.currencyCode || 'EGP';

        setInvoiceData({
          id: foundData.id,
          invoiceNumber: foundData.invoice_number || foundData.invoiceNumber || foundData.orderId || foundData.merchantReferenceId || `INV-${foundData.id.slice(0, 8)}`,
          source,
          paymentMethod: foundData.paymentMethod || foundData.method || foundData.gateway || source,
          transactionId: foundData.transactionId || foundData.transaction_id || null,
          orderId: foundData.orderId || foundData.order_id || null,
          referenceNumber: foundData.referenceNumber || foundData.merchantReferenceId || null,
          amount, currency,
          status: foundData.status || foundData.paymentStatus || 'pending',
          createdAt, paidAt,
          customerName: foundData.full_name || foundData.name || foundData.playerName || foundData.customerName || 'غير محدد',
          customerEmail: foundData.user_email || foundData.userEmail || foundData.customerEmail || foundData.email || '',
          customerPhone: foundData.phone || foundData.phoneNumber || foundData.mobile || foundData.whatsapp || '',
          planName: foundData.plan_name || foundData.planName || foundData.package || foundData.packageName || '',
        });
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل الفاتورة');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [params.id]);

  const invoiceUrl = typeof window !== 'undefined' ? window.location.href : `https://el7lm.com/invoice/${params.id}`;

  const handlePrint = () => {
    if (!invoiceData) return;
    const html = generateInvoiceHTML(invoiceData, invoiceUrl);
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) { toast.error('يرجى السماح بالنوافذ المنبثقة'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleSendEmail = async () => {
    const targetEmail = overrideEmail.trim() || invoiceData?.customerEmail;
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch(`/api/invoices/${params.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال');
      setEmailSent(true);
      setShowEmailInput(false);
      toast.success(`تم إرسال الفاتورة إلى ${data.sentTo}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">جاري تحميل الفاتورة...</p>
      </div>
    </div>
  );

  if (error || !invoiceData) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <Card className="p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">خطأ</h2>
        <p className="text-gray-600 mb-6">{error || 'لم يتم العثور على الفاتورة'}</p>
        <Button onClick={() => router.push('/')} variant="outline">
          <ArrowRight className="w-4 h-4 ml-2" />العودة للصفحة الرئيسية
        </Button>
      </Card>
    </div>
  );

  const hasEmail = !!invoiceData.customerEmail;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">فاتورة رقم: {invoiceData.invoiceNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">يمكنك طباعة الفاتورة أو إرسالها بالبريد الإلكتروني</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4" />تحميل / طباعة
            </Button>
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />طباعة
            </Button>
            {emailSent ? (
              <Button disabled variant="outline" className="gap-2 text-green-600 border-green-300">
                <CheckCircle className="w-4 h-4" />تم الإرسال
              </Button>
            ) : (
              <Button
                onClick={() => hasEmail ? handleSendEmail() : setShowEmailInput(v => !v)}
                disabled={emailSending}
                variant="outline"
                className="gap-2"
              >
                {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {hasEmail ? `إرسال لـ ${invoiceData.customerEmail}` : 'إرسال بالإيميل'}
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard/shared/subscription-status')} variant="outline" className="gap-2">
              <ArrowRight className="w-4 h-4" />حالة الاشتراك
            </Button>
          </div>
        </div>

        {/* Email override input (when no email on file) */}
        {showEmailInput && !hasEmail && (
          <div className="mb-4 flex gap-2 items-center bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <input
              type="email"
              placeholder="أدخل البريد الإلكتروني لإرسال الفاتورة"
              value={overrideEmail}
              onChange={e => setOverrideEmail(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              dir="ltr"
            />
            <Button onClick={handleSendEmail} disabled={emailSending} className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
              {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال'}
            </Button>
          </div>
        )}

        {/* Invoice Preview */}
        <div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          dangerouslySetInnerHTML={{
            __html: generateInvoiceHTML(invoiceData, invoiceUrl)
              .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '')
              .replace(/<\/body>[\s\S]*?<\/html>/, ''),
          }}
        />
      </div>
    </div>
  );
}
