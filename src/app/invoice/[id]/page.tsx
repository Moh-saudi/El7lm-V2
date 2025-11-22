'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowRight, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

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

export default function PublicInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!params.id) {
        setError('رقم الفاتورة مطلوب');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let foundData: any = null;
        let source = '';

        // البحث في جميع المجموعات
        for (const collectionName of COLLECTIONS) {
          try {
            // البحث بـ ID مباشرة أولاً
            const docRef = doc(db, collectionName, params.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              foundData = { id: docSnap.id, ...docSnap.data() };
              source = collectionName;
              break;
            }

            // البحث في الحقول
            const ref = collection(db, collectionName);
            const queries = [
              query(ref, where('invoice_number', '==', params.id), limit(1)),
              query(ref, where('invoiceNumber', '==', params.id), limit(1)),
              query(ref, where('orderId', '==', params.id), limit(1)),
              query(ref, where('merchantReferenceId', '==', params.id), limit(1)),
            ];

            for (const q of queries) {
              const snap = await getDocs(q);
              if (!snap.empty) {
                const doc = snap.docs[0];
                foundData = { id: doc.id, ...doc.data() };
                source = collectionName;
                break;
              }
            }

            if (foundData) break;
          } catch (error) {
            console.warn(`Failed to search in ${collectionName}:`, error);
          }
        }

        if (!foundData) {
          setError('لم يتم العثور على الفاتورة');
          setLoading(false);
          return;
        }

        // تحويل البيانات
        const createdAt = toDate(foundData.created_at || foundData.createdAt || foundData.timestamp) || new Date();
        const paidAt = toDate(foundData.paid_at || foundData.paidAt || foundData.paymentDate) || null;
        
        const amount = Number(foundData.amount ?? foundData.total ?? foundData.total_amount ?? 0) || 0;
        const currency = foundData.currency || foundData.currencyCode || 'EGP';

        const normalizedRecord = {
          id: foundData.id,
          invoiceNumber: foundData.invoice_number || foundData.invoiceNumber || foundData.orderId || foundData.merchantReferenceId || `INV-${foundData.id.slice(0, 8)}`,
          source,
          paymentMethod: foundData.paymentMethod || foundData.method || foundData.gateway || source,
          amount,
          currency,
          status: foundData.status || foundData.paymentStatus || 'pending',
          createdAt,
          paidAt,
          customerName: foundData.full_name || foundData.name || foundData.playerName || foundData.customerName || 'غير محدد',
          customerEmail: foundData.user_email || foundData.userEmail || foundData.customerEmail || foundData.email || '',
          customerPhone: foundData.phone || foundData.phoneNumber || foundData.mobile || foundData.whatsapp || '',
          planName: foundData.plan_name || foundData.planName || foundData.package || foundData.packageName || '',
        };

        setInvoiceData(normalizedRecord);
      } catch (error: any) {
        console.error('❌ [Public Invoice] Error:', error);
        setError(error.message || 'حدث خطأ أثناء تحميل الفاتورة');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [params.id]);

  const handlePrint = () => {
    if (!invoiceData) return;
    const html = generateInvoiceHTML(invoiceData);
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleDownload = () => {
    // نفس دالة الطباعة - يمكن للمستخدم اختيار "Save as PDF" من نافذة الطباعة
    handlePrint();
    toast.success('اختر "Save as PDF" من نافذة الطباعة لتحميل الفاتورة');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">جاري تحميل الفاتورة...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">خطأ</h2>
          <p className="text-gray-600 mb-6">{error || 'لم يتم العثور على الفاتورة'}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للصفحة الرئيسية
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">فاتورة رقم: {invoiceData.invoiceNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">يمكنك طباعة الفاتورة أو حفظها كملف PDF</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownload} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4" />
              تحميل PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button onClick={() => router.push('/dashboard/shared/subscription-status')} variant="outline" className="gap-2">
              <ArrowRight className="w-4 h-4" />
              حالة الاشتراك
            </Button>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow-sm p-8"
          dangerouslySetInnerHTML={{ 
            __html: generateInvoiceHTML(invoiceData)
              .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '')
              .replace(/<\/body>[\s\S]*?<\/html>/, '')
          }}
        />
      </div>
    </div>
  );
}

