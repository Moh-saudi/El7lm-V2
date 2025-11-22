import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLLECTIONS = [
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

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
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

const generateInvoiceHTML = (record: any) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <title>فاتورة ${record.invoiceNumber}</title>
    <style>
      body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 24px; background: #f5f7fb; color: #1f2933; }
      .invoice-container { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); padding: 32px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eef2ff; padding-bottom: 16px; margin-bottom: 24px; }
      .logo { height: 64px; }
      .title { font-size: 28px; margin: 0; color: #312e81; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; background: #eef2ff; color: #4338ca; margin-top: 8px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-size: 14px; }
      th { background: #f8fafc; color: #0f172a; }
      .section-title { font-size: 18px; margin: 24px 0 12px; color: #0f172a; }
      .footer { margin-top: 32px; text-align: center; color: #475569; font-size: 15px; }
      .footer strong { color: #0f172a; }
      @media print { body { background: #fff; } .invoice-container { box-shadow: none; } }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <div class="header">
        <div>
          <h1 class="title">فاتورة موحدة - منصة الحلم</h1>
          <span class="badge">${record.invoiceNumber}</span>
        </div>
      </div>

      <h2 class="section-title">تفاصيل الفاتورة</h2>
      <table>
        <tbody>
          <tr>
            <th>المصدر</th>
            <td>${record.source}</td>
          </tr>
          <tr>
            <th>الخدمة / الباقة</th>
            <td>${record.planName || '—'}</td>
          </tr>
          <tr>
            <th>طريقة الدفع</th>
            <td>${record.paymentMethod || record.source}</td>
          </tr>
          <tr>
            <th>المبلغ</th>
            <td>${formatCurrency(record.amount, record.currency)}</td>
          </tr>
          <tr>
            <th>حالة الفاتورة</th>
            <td>${record.status}</td>
          </tr>
          <tr>
            <th>تاريخ الإنشاء</th>
            <td>${formatDate(record.createdAt)}</td>
          </tr>
          ${record.paidAt ? `
          <tr>
            <th>تاريخ التحصيل</th>
            <td>${formatDate(record.paidAt)}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>

      <h2 class="section-title">بيانات العميل</h2>
      <table>
        <tbody>
          <tr>
            <th>الاسم</th>
            <td>${record.customerName || 'غير محدد'}</td>
          </tr>
          <tr>
            <th>البريد الإلكتروني</th>
            <td>${record.customerEmail || 'غير متوفر'}</td>
          </tr>
          <tr>
            <th>الهاتف</th>
            <td>${record.customerPhone || 'غير متوفر'}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p><strong>منصة الحلم</strong> - نعمل معك لبناء رحلة رياضية مُلهمة ومتكاملة.</p>
        <p>📧 info@el7lm.com &nbsp; | &nbsp; 🌐 www.el7lm.com</p>
      </div>
    </div>
  </body>
</html>
`;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'html'; // html or pdf

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // البحث في جميع المجموعات
    let invoiceData: any = null;
    let source = '';

    for (const collectionName of COLLECTIONS) {
      try {
        // البحث بـ ID مباشرة أولاً (أسرع)
        const docRef = doc(db, collectionName, invoiceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          invoiceData = { id: docSnap.id, ...docSnap.data() };
          source = collectionName;
          break;
        }

        // إذا لم نجد بـ ID، نبحث في الحقول
        const ref = collection(db, collectionName);
        const queries = [
          query(ref, where('invoice_number', '==', invoiceId), limit(1)),
          query(ref, where('invoiceNumber', '==', invoiceId), limit(1)),
          query(ref, where('orderId', '==', invoiceId), limit(1)),
          query(ref, where('merchantReferenceId', '==', invoiceId), limit(1)),
        ];

        for (const q of queries) {
          const snap = await getDocs(q);
          if (!snap.empty) {
            const doc = snap.docs[0];
            invoiceData = { id: doc.id, ...doc.data() };
            source = collectionName;
            break;
          }
        }

        if (invoiceData) break;
      } catch (error) {
        console.warn(`Failed to search in ${collectionName}:`, error);
      }
    }

    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // تحويل البيانات إلى تنسيق موحد
    const createdAt = toDate(invoiceData.created_at || invoiceData.createdAt || invoiceData.timestamp) || new Date();
    const paidAt = toDate(invoiceData.paid_at || invoiceData.paidAt || invoiceData.paymentDate) || null;
    
    const amount = Number(invoiceData.amount ?? invoiceData.total ?? invoiceData.total_amount ?? 0) || 0;
    const currency = invoiceData.currency || invoiceData.currencyCode || 'EGP';

    const normalizedRecord = {
      id: invoiceData.id,
      invoiceNumber: invoiceData.invoice_number || invoiceData.invoiceNumber || invoiceData.orderId || invoiceData.merchantReferenceId || `INV-${invoiceData.id.slice(0, 8)}`,
      source,
      paymentMethod: invoiceData.paymentMethod || invoiceData.method || invoiceData.gateway || source,
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
      // يمكن إضافة PDF generation هنا لاحقاً
      return NextResponse.json(
        { error: 'PDF format not yet implemented' },
        { status: 501 }
      );
    }

    // إرجاع HTML
    const html = generateInvoiceHTML(normalizedRecord);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('❌ [API /invoices/[id]] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

