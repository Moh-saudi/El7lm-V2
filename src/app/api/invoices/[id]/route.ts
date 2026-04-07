import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLES = [
  'invoices',
  'geidea_payments',
  'bulkPayments',
  'bulk_payments',
  'wallet',
  'instapay',
  'payments',
  'payment_results',
  'tournament_payments',
];

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCurrency = (amount: number, currency: string = 'EGP') =>
  Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (value?: Date | null) => {
  if (!value) return 'غير محدد';
  return value.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

const generateInvoiceHTML = (record: Record<string, unknown>, invoiceUrl = 'https://el7lm.com') => {
  const st = STATUS_MAP[String(record.status)] || { text: String(record.status), color: '#6b7280', bg: '#f3f4f6' };
  const src = SOURCE_LABELS[String(record.source)] || String(record.source);
  const method = METHOD_LABELS[String(record.paymentMethod)] || String(record.paymentMethod || src);
  const refNum = [record.transactionId, record.orderId, record.referenceNumber].find(Boolean) || null;

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
    <div class="brand"><h1>فاتورة رسمية</h1><p>منصة الحلم الرياضية</p></div>
    <div class="logo-area"><img src="https://assets.el7lm.com/logo.png" alt="El7lm" onerror="this.style.display='none'"/></div>
  </div>
  <div class="status-bar">
    <div class="inv-num">رقم الفاتورة: <span>${record.invoiceNumber}</span></div>
    <div class="status-badge">${st.text}</div>
  </div>
  <div class="body">
    <h2>تفاصيل الفاتورة</h2>
    <table>
      <tr><th>الخدمة / الباقة</th><td>${record.planName || '—'}</td></tr>
      <tr><th>طريقة الدفع</th><td>${method}</td></tr>
      <tr><th>مصدر المعاملة</th><td>${src}</td></tr>
      ${refNum ? `<tr><th>الرقم المرجعي</th><td>${refNum}</td></tr>` : ''}
      <tr><th>تاريخ الإنشاء</th><td>${formatDate(record.createdAt as Date | null)}</td></tr>
      ${record.paidAt ? `<tr><th>تاريخ السداد</th><td>${formatDate(record.paidAt as Date | null)}</td></tr>` : ''}
      <tr class="amount-row"><th>المبلغ الإجمالي</th><td>${formatCurrency(Number(record.amount), String(record.currency))}</td></tr>
    </table>
    <h2>بيانات العميل</h2>
    <table>
      <tr><th>الاسم</th><td>${record.customerName || 'غير محدد'}</td></tr>
      ${record.customerEmail ? `<tr><th>البريد الإلكتروني</th><td>${record.customerEmail}</td></tr>` : ''}
      ${record.customerPhone ? `<tr><th>الهاتف</th><td>${record.customerPhone}</td></tr>` : ''}
    </table>
    <div class="verify-box">
      <p>يمكنك عرض هذه الفاتورة وطباعتها في أي وقت:</p>
      <p style="margin-top:6px"><a href="${invoiceUrl}">${invoiceUrl}</a></p>
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'html';

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    let invoiceData: Record<string, unknown> | null = null;
    let source = '';

    for (const tableName of TABLES) {
      try {
        // Search by ID first
        const { data: byId } = await db.from(tableName).select('*').eq('id', invoiceId).limit(1);
        if (byId?.length) {
          invoiceData = byId[0] as Record<string, unknown>;
          source = tableName;
          break;
        }

        // Search by invoice number fields
        const fields = ['invoice_number', 'invoiceNumber', 'orderId', 'merchantReferenceId'];
        for (const field of fields) {
          const { data: byField } = await db.from(tableName).select('*').eq(field, invoiceId).limit(1);
          if (byField?.length) {
            invoiceData = byField[0] as Record<string, unknown>;
            source = tableName;
            break;
          }
        }

        if (invoiceData) break;
      } catch {
        // Table may not exist, continue
      }
    }

    if (!invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const createdAt = toDate(invoiceData.created_at || invoiceData.createdAt || invoiceData.timestamp) || new Date();
    const paidAt = toDate(invoiceData.paid_at || invoiceData.paidAt || invoiceData.paymentDate) || null;

    const amount = Number(invoiceData.amount ?? invoiceData.total ?? invoiceData.total_amount ?? 0) || 0;
    const currency = String(invoiceData.currency || invoiceData.currencyCode || 'EGP');

    const normalizedRecord: Record<string, unknown> = {
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
      customerName: invoiceData.full_name || invoiceData.name || invoiceData.playerName || invoiceData.customerName || 'غير محدد',
      customerEmail: invoiceData.user_email || invoiceData.userEmail || invoiceData.customerEmail || invoiceData.email || '',
      customerPhone: invoiceData.phone || invoiceData.phoneNumber || invoiceData.mobile || invoiceData.whatsapp || '',
      planName: invoiceData.plan_name || invoiceData.planName || invoiceData.package || invoiceData.packageName || '',
    };

    if (format === 'pdf') {
      return NextResponse.json({ error: 'PDF format not yet implemented' }, { status: 501 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://el7lm.com';
    const invoiceUrl = `${baseUrl}/invoice/${invoiceId}`;
    const html = generateInvoiceHTML(normalizedRecord, invoiceUrl);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: unknown) {
    console.error('❌ [API /invoices/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
