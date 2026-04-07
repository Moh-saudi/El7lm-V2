import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123_build_fix');

const TABLES = [
  'invoices', 'geidea_payments', 'bulkPayments', 'bulk_payments',
  'wallet', 'instapay', 'payments', 'payment_results', 'tournament_payments',
];

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

const fmt = (amount: number, currency = 'EGP') =>
  Intl.NumberFormat('ar-EG', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount || 0);

const fmtDate = (d: Date | null) => {
  if (!d) return 'غير محدد';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const sourceLabel: Record<string, string> = {
  invoices: 'نظام الفواتير',
  geidea_payments: 'بطاقة بنكية (Geidea)',
  bulkPayments: 'دفع جماعي',
  bulk_payments: 'دفع جماعي',
  wallet: 'محفظة',
  instapay: 'InstaPay',
  payments: 'دفع عام',
  payment_results: 'نتائج الدفع',
  tournament_payments: 'مدفوعات البطولات',
};

const methodLabel: Record<string, string> = {
  geidea: 'بطاقة بنكية',
  bank_transfer: 'تحويل بنكي',
  instapay: 'InstaPay',
  skipcash: 'SkipCash',
  stc_pay: 'STC Pay',
  wallet: 'محفظة',
  cash: 'نقدي',
};

const statusLabel: Record<string, { text: string; color: string }> = {
  paid:           { text: 'مدفوع',          color: '#16a34a' },
  completed:      { text: 'مكتمل',          color: '#16a34a' },
  success:        { text: 'ناجح',            color: '#16a34a' },
  pending:        { text: 'قيد المعالجة',   color: '#d97706' },
  pending_review: { text: 'قيد المراجعة',   color: '#d97706' },
  failed:         { text: 'فاشل',            color: '#dc2626' },
  cancelled:      { text: 'ملغي',            color: '#6b7280' },
};

function buildInvoiceHTML(rec: Record<string, unknown>, invoiceUrl: string): string {
  const st = statusLabel[String(rec.status)] || { text: String(rec.status), color: '#6b7280' };
  const src = sourceLabel[String(rec.source)] || String(rec.source);
  const method = methodLabel[String(rec.paymentMethod)] || String(rec.paymentMethod || src);
  const refNum = [rec.transactionId, rec.orderId, rec.referenceNumber].find(Boolean) || '—';
  // تقصير رقم الفاتورة إن كان UUID أو طويلاً
  const rawNum = String(rec.invoiceNumber || rec.id || '');
  const shortNum = rawNum.length > 20 ? `INV-${rawNum.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : rawNum;
  // رابط الإنتاج دائماً
  const prodUrl = invoiceUrl.replace(/^https?:\/\/localhost:[0-9]+/, 'https://el7lm.com');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>فاتورة ${rec.invoiceNumber} - منصة الحلم</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', Arial, sans-serif; background: #f1f5f9; color: #1e293b; padding: 32px 16px; }
    .wrap { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .top-bar { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; }
    .brand { color: #fff; }
    .brand h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .brand p { font-size: 13px; opacity: .85; }
    .logo-area { text-align: left; }
    .logo-area img { height: 52px; object-fit: contain; }
    .status-banner { background: #f8fafc; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
    .inv-num { font-size: 15px; font-weight: 600; color: #1e293b; }
    .inv-num span { color: #3b82f6; }
    .status-badge { padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; color: #fff; background: ${st.color}; }
    .body { padding: 28px 32px; }
    h2 { font-size: 16px; font-weight: 700; color: #1e3a8a; margin: 24px 0 12px; padding-right: 10px; border-right: 3px solid #3b82f6; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    tr:nth-child(even) td, tr:nth-child(even) th { background: #f8fafc; }
    th { padding: 10px 14px; text-align: right; font-weight: 600; color: #475569; width: 38%; border: 1px solid #e2e8f0; }
    td { padding: 10px 14px; color: #1e293b; border: 1px solid #e2e8f0; }
    .amount-row td { font-size: 18px; font-weight: 700; color: #1e3a8a; }
    .footer-box { margin: 28px 32px 0; padding: 18px; background: #eff6ff; border-radius: 12px; text-align: center; font-size: 13px; color: #475569; }
    .footer-box a { color: #2563eb; font-weight: 600; }
    .bottom { padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print { body { background: #fff; padding: 0; } .wrap { box-shadow: none; border-radius: 0; } }
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

  <div class="status-banner">
    <div class="inv-num">رقم الفاتورة: <span>${shortNum}</span></div>
    <div class="status-badge">${st.text}</div>
  </div>

  <div class="body">
    <h2>تفاصيل الفاتورة</h2>
    <table>
      <tr><th>الخدمة / الباقة</th><td>${rec.planName || '—'}</td></tr>
      <tr><th>طريقة الدفع</th><td>${method}</td></tr>
      <tr><th>مصدر المعاملة</th><td>${src}</td></tr>
      <tr><th>الرقم المرجعي</th><td>${refNum}</td></tr>
      <tr><th>تاريخ الإنشاء</th><td>${fmtDate(rec.createdAt as Date)}</td></tr>
      ${rec.paidAt ? `<tr><th>تاريخ السداد</th><td>${fmtDate(rec.paidAt as Date)}</td></tr>` : ''}
      <tr class="amount-row"><th>المبلغ الإجمالي</th><td>${fmt(Number(rec.amount), String(rec.currency))}</td></tr>
    </table>

    <h2>بيانات العميل</h2>
    <table>
      <tr><th>الاسم</th><td>${rec.customerName || 'غير محدد'}</td></tr>
      <tr><th>البريد الإلكتروني</th><td>${rec.customerEmail || 'غير متوفر'}</td></tr>
      <tr><th>الهاتف</th><td>${rec.customerPhone || 'غير متوفر'}</td></tr>
    </table>

    <div class="footer-box">
      <p>يمكنك عرض هذه الفاتورة وطباعتها في أي وقت عبر الرابط:</p>
      <p style="margin-top:6px"><a href="${prodUrl}">${prodUrl}</a></p>
    </div>
  </div>

  <div class="bottom">
    <strong>منصة الحلم</strong> &nbsp;|&nbsp; info@el7lm.com &nbsp;|&nbsp; www.el7lm.com<br/>
    هذه فاتورة رسمية صادرة من منصة الحلم الرياضية.
  </div>
</div>
</body>
</html>`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { email: overrideEmail } = await request.json().catch(() => ({}));
    const invoiceId = params.id;
    if (!invoiceId) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });

    const db = getSupabaseAdmin();
    let invoiceData: Record<string, unknown> | null = null;
    let source = '';

    for (const tableName of TABLES) {
      try {
        const { data: byId } = await db.from(tableName).select('*').eq('id', invoiceId).limit(1);
        if (byId?.length) { invoiceData = byId[0] as Record<string, unknown>; source = tableName; break; }

        const fields = ['invoice_number', 'invoiceNumber', 'orderId', 'merchantReferenceId'];
        for (const field of fields) {
          const { data } = await db.from(tableName).select('*').eq(field, invoiceId).limit(1);
          if (data?.length) { invoiceData = data[0] as Record<string, unknown>; source = tableName; break; }
        }
        if (invoiceData) break;
      } catch { /* table may not exist */ }
    }

    if (!invoiceData) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const createdAt = toDate(invoiceData.created_at || invoiceData.createdAt || invoiceData.timestamp) || new Date();
    const paidAt = toDate(invoiceData.paid_at || invoiceData.paidAt || invoiceData.paymentDate);
    const amount = Number(invoiceData.amount ?? invoiceData.total ?? invoiceData.total_amount ?? 0) || 0;
    const currency = String(invoiceData.currency || invoiceData.currencyCode || 'EGP');

    const rec: Record<string, unknown> = {
      id: invoiceData.id,
      invoiceNumber: invoiceData.invoice_number || invoiceData.invoiceNumber || invoiceData.orderId || invoiceData.merchantReferenceId || `INV-${String(invoiceData.id).slice(0, 8)}`,
      source,
      paymentMethod: invoiceData.paymentMethod || invoiceData.method || invoiceData.gateway || source,
      transactionId: invoiceData.transactionId || invoiceData.transaction_id || null,
      orderId: invoiceData.orderId || invoiceData.order_id || null,
      referenceNumber: invoiceData.referenceNumber || invoiceData.merchantReferenceId || null,
      amount,
      currency,
      status: invoiceData.status || invoiceData.paymentStatus || 'pending',
      createdAt,
      paidAt,
      customerName: invoiceData.full_name || invoiceData.name || invoiceData.playerName || invoiceData.customerName || 'عميل',
      customerEmail: invoiceData.user_email || invoiceData.userEmail || invoiceData.customerEmail || invoiceData.email || '',
      customerPhone: invoiceData.phone || invoiceData.phoneNumber || invoiceData.mobile || '',
      planName: invoiceData.plan_name || invoiceData.planName || invoiceData.package || invoiceData.packageName || '',
    };

    const targetEmail = overrideEmail || String(rec.customerEmail);
    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ error: 'No valid email address found for this invoice' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://el7lm.com';
    const invoiceUrl = `${baseUrl}/invoice/${invoiceId}`;
    const html = buildInvoiceHTML(rec, invoiceUrl);

    const { data, error } = await resend.emails.send({
      from: 'منصة الحلم <noreply@el7lm.com>',
      to: targetEmail,
      subject: `فاتورة رقم ${rec.invoiceNumber} - منصة الحلم`,
      html,
    });

    if (error) {
      console.error('[send-email] Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: data?.id, sentTo: targetEmail });
  } catch (err: unknown) {
    console.error('[send-email] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
