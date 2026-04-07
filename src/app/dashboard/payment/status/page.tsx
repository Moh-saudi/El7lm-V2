'use client';

import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { AlertCircle, Clock, Download, Printer } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface SubscriptionStatus {
  plan_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  payment_method: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  receipt_url?: string;
  receipt_uploaded_at?: string;
  autoRenew: boolean;
  transaction_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address?: string;
  tax_number?: string;
  payment_date: string;
}

function SubscriptionStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setSubscription(data as SubscriptionStatus);
        } else {
          setError('لم يتم العثور على بيانات الاشتراك');
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('حدث خطأ أثناء جلب بيانات الاشتراك');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, [user, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في انتظار التأكيد';
      case 'active':
        return 'نشط';
      case 'expired':
        return 'منتهي';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const handlePrintInvoice = () => {
    setPrinting(true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPrinting(false);
      return;
    }

    const invoiceContent = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>فاتورة اشتراك</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; padding: 0; margin: 0; background: #f7f7fa; }
            .invoice-container { max-width: 700px; margin: 40px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0001; padding: 32px 24px; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
            .logo { height: 64px; }
            .company-info { text-align: left; font-size: 14px; color: #444; }
            .invoice-title { font-size: 2rem; color: #1a237e; font-weight: bold; letter-spacing: 1px; }
            .section-title { color: #1976d2; font-size: 1.1rem; margin-bottom: 8px; font-weight: bold; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .details-table th, .details-table td { border: 1px solid #e0e0e0; padding: 10px 8px; text-align: right; font-size: 15px; }
            .details-table th { background: #f0f4fa; color: #1a237e; }
            .details-table td { background: #fafbfc; }
            .summary { margin: 24px 0; font-size: 1.1rem; }
            .summary strong { color: #1976d2; }
            .footer { border-top: 2px solid #eee; padding-top: 16px; margin-top: 24px; text-align: center; color: #555; font-size: 15px; }
            .footer .icons { font-size: 1.5rem; margin-bottom: 8px; }
            .customer-care { background: #e3f2fd; color: #1976d2; border-radius: 8px; padding: 12px; margin: 18px 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; justify-content: center; }
            .thankyou { color: #388e3c; font-size: 1.2rem; margin: 18px 0 0 0; font-weight: bold; }
            @media print { .no-print { display: none; } body { background: #fff; } .invoice-container { box-shadow: none; } }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="/el7lm-logo.png" alt="Logo" class="logo" />
              <div class="company-info">
                <div><b>mesk llc & El7lm</b> <span style="font-size:1.2em;">🚀</span></div>
                <div>قطر- الدوحة - مركز قطر للمال</div>
                <div>الرقم الضريبي: 02289</div>
                <div>البريد: El7lm@mesk.qa</div>
                <div>هاتف: 97470542458 قطر - 201017799580 مصر</div>
              </div>
            </div>
            <div class="invoice-title">فاتورة اشتراك <span style="font-size:1.3em;">🧾</span></div>
            <div style="margin: 16px 0 24px 0; color:#555;">
              <b>رقم الفاتورة:</b> ${subscription?.invoice_number || ''} &nbsp; | &nbsp;
              <b>تاريخ الإصدار:</b> ${subscription?.payment_date ? new Date(subscription.payment_date).toLocaleDateString('en-US') : ''}
            </div>
            <div class="section-title">معلومات العميل <span style="font-size:1.1em;">👤</span></div>
            <table class="details-table">
              <tr><th>الاسم</th><td>${subscription?.customer_name || ''}</td></tr>
              <tr><th>البريد الإلكتروني</th><td>${subscription?.customer_email || ''}</td></tr>
              <tr><th>رقم الهاتف</th><td>${subscription?.customer_phone || ''}</td></tr>
              <tr><th>العنوان</th><td>${subscription?.billing_address || '-'}</td></tr>
              <tr><th>الرقم الضريبي</th><td>${subscription?.tax_number || '-'}</td></tr>
            </table>
            <div class="section-title">تفاصيل الاشتراك <span style="font-size:1.1em;">💳</span></div>
            <table class="details-table">
              <tr><th>الباقة</th><td>${subscription?.plan_name || ''}</td></tr>
              <tr><th>المبلغ</th><td>${subscription?.amount || ''} ${subscription?.currencySymbol || subscription?.currency || ''}</td></tr>
              <tr><th>طريقة الدفع</th><td>${subscription?.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'بطاقة ائتمان/أخرى'}</td></tr>
              <tr><th>رقم العملية</th><td>${subscription?.transaction_id || '-'}</td></tr>
              <tr><th>تاريخ الدفع</th><td>${subscription?.payment_date ? new Date(subscription.payment_date).toLocaleDateString('en-US') : ''}</td></tr>
              <tr><th>تاريخ بداية الاشتراك</th><td>${subscription?.start_date ? new Date(subscription.start_date).toLocaleDateString('en-US') : ''}</td></tr>
              <tr><th>تاريخ نهاية الاشتراك</th><td>${subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('en-US') : ''}</td></tr>
              <tr><th>تجديد تلقائي</th><td>${subscription?.autoRenew ? 'نعم' : 'لا'}</td></tr>
            </table>
            <div class="customer-care">
              <span style="font-size:1.3em;">🤝</span>
              نحن هنا دائمًا لدعمك! لأي استفسار أو مساعدة لا تتردد في التواصل معنا عبر البريد أو الهاتف.
            </div>
            <div class="summary">
              <span style="font-size:1.2em;">🌟</span>
              <strong>شكراً لاختيارك منصتنا لتحقيق طموحاتك الرياضية!</strong>
              <span style="font-size:1.2em;">🏆</span>
            </div>
            <div class="thankyou">
              <span style="font-size:1.5em;">🎉</span> نتمنى لك رحلة نجاح رائعة معنا! <span style="font-size:1.5em;">🚀</span>
            </div>
            <div class="footer">
              <div class="icons">💙 ⚽ 🏅 🥇 🏆</div>
              منصة mesk llc & El7lm - جميع الحقوق محفوظة &copy; ${new Date().getFullYear()}
              <div style="margin-top:8px; font-size:13px; color:#888;">تم إصدار هذه الفاتورة إلكترونيًا ولا تحتاج إلى توقيع.</div>
              <div style="margin-top:18px; text-align:center;">
                <div style="display:inline-block; border:1px dashed #1976d2; border-radius:8px; padding:12px 24px; background:#f5faff;">
                  <div style="font-size:1.1em; color:#1976d2; font-weight:bold; margin-bottom:4px;">التوقيع الإلكتروني</div>
                  <img src="/signature.png" alt="التوقيع الإلكتروني" style="height:48px; margin-bottom:4px;" onerror="this.style.display='none'" />
                  <div style="font-size:0.95em; color:#555;">تمت الموافقة إلكترونيًا بواسطة إدارة mesk llc & El7lm</div>
                </div>
              </div>
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()" style="background:#1976d2;color:#fff;padding:10px 30px;border:none;border-radius:8px;font-size:1.1rem;cursor:pointer;">طباعة الفاتورة</button>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceContent);
    printWindow.document.close();
    setPrinting(false);
  };

  const handleDownloadInvoice = () => {
    // يمكن تنفيذ تحميل الفاتورة كملف PDF هنا
    alert('سيتم إضافة هذه الميزة قريباً');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 text-center bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-800">حدث خطأ</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/dashboard/payment')}
            className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            العودة إلى صفحة الدفع
          </button>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 text-center bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-800">لا يوجد اشتراك</h2>
          <p className="mt-2 text-gray-600">لم يتم العثور على أي اشتراك نشط</p>
          <button
            onClick={() => router.push('/dashboard/payment')}
            className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            العودة إلى صفحة الدفع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="max-w-4xl mx-auto">
        <div className="p-6 bg-white rounded-lg shadow-lg">
          {/* حالة الاشتراك */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">حالة الاشتراك</h1>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                {getStatusText(subscription.status)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintInvoice}
                  disabled={printing}
                  className="flex items-center px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 ml-1" />
                  طباعة الفاتورة
                </button>
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                >
                  <Download className="w-4 h-4 ml-1" />
                  تحميل PDF
                </button>
              </div>
            </div>
          </div>

          {/* تفاصيل الاشتراك */}
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">تفاصيل الاشتراك</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">الباقة</p>
                  <p className="font-medium">{subscription.plan_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">المبلغ</p>
                  <p className="font-medium">{subscription.amount} {subscription.currencySymbol || subscription.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">تاريخ البدء</p>
                  <p className="font-medium">{new Date(subscription.start_date).toLocaleDateString('ar-SA')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">تاريخ الانتهاء</p>
                  <p className="font-medium">{new Date(subscription.end_date).toLocaleDateString('ar-SA')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">رقم المعاملة</p>
                  <p className="font-medium">{subscription.transaction_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">رقم الفاتورة</p>
                  <p className="font-medium">{subscription.invoice_number}</p>
                </div>
              </div>
            </div>

            {/* معلومات العميل */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">معلومات العميل</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">الاسم</p>
                  <p className="font-medium">{subscription.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                  <p className="font-medium">{subscription.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">رقم الهاتف</p>
                  <p className="font-medium">{subscription.customer_phone}</p>
                </div>
                {subscription.billing_address && (
                  <div>
                    <p className="text-sm text-gray-500">العنوان</p>
                    <p className="font-medium">{subscription.billing_address}</p>
                  </div>
                )}
                {subscription.tax_number && (
                  <div>
                    <p className="text-sm text-gray-500">الرقم الضريبي</p>
                    <p className="font-medium">{subscription.tax_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* معلومات الدفع */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">معلومات الدفع</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">طريقة الدفع</p>
                  <p className="font-medium">
                    {subscription.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'بطاقة ائتمان'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">تاريخ الدفع</p>
                  <p className="font-medium">
                    {new Date(subscription.payment_date).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                {subscription.receipt_url && (
                  <div>
                    <p className="text-sm text-gray-500">صورة الإيصال</p>
                    <a
                      href={subscription.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      عرض الإيصال
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* رسالة الحالة */}
            {subscription.status === 'pending' && (
              <div className="p-4 rounded-lg bg-yellow-50">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <Clock className="w-5 h-5 mt-1 text-yellow-500" />
                  <div>
                    <h3 className="font-medium text-yellow-800">في انتظار التأكيد</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      تم استلام طلب الاشتراك الخاص بك وسيتم مراجعته من قبل إدارة المنصة قريباً.
                      سيتم إعلامك عبر البريد الإلكتروني عند تأكيد الاشتراك.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* تجديد تلقائي */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">تجديد تلقائي</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoRenew"
                    checked={subscription.autoRenew}
                    readOnly
                    className="w-4 h-4 ml-2 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRenew" className="text-sm text-gray-700">
                    تفعيل التجديد التلقائي للاشتراك
                  </label>
                </div>
                {subscription.autoRenew && (
                  <p className="text-sm text-gray-500">
                    سيتم تجديد اشتراكك تلقائياً في {new Date(subscription.end_date).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </div>
            </div>

            {/* أزرار التحكم */}
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => router.push('/dashboard/payment')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                العودة
              </button>
              {subscription.status === 'pending' && (
                <button
                  onClick={() => router.push('/dashboard/payment')}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  تحديث الحالة
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionStatusPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
          </div>
        </div>
      }>
        <SubscriptionStatusContent />
      </Suspense>
    </DashboardLayout>
  );
}
