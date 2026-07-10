'use client';

import DashboardLayout from '@/components/layout/DashboardLayout.jsx';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { AlertCircle, Download, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Locale, useTranslation } from '@/lib/i18n';

interface SubscriptionStatus {
  plan_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  payment_method: string;
  amount: number;
  currency: string;
  currencySymbol: string;
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

const PAYMENT_STATUS_COPY: Record<Locale, {
  loading: string;
  notFoundError: string;
  fetchError: string;
  genericError: string;
  backToPayment: string;
  noSubscription: string;
  noActiveSubscription: string;
  title: string;
  subtitle: string;
  status: Record<string, string>;
  invoice: string;
  printInvoice: string;
  downloadInvoice: string;
  downloadSoon: string;
  customerInfo: string;
  subscriptionInfo: string;
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  plan: string;
  amount: string;
  paymentMethod: string;
  bankTransfer: string;
  cardOrOther: string;
  transactionId: string;
  paymentDate: string;
  startDate: string;
  endDate: string;
  autoRenew: string;
  yes: string;
  no: string;
  unavailable: string;
  supportNote: string;
  thankYou: string;
  footer: string;
  electronicInvoice: string;
  print: string;
}> = {
  ar: {
    loading: 'جاري تحميل البيانات...',
    notFoundError: 'لم يتم العثور على بيانات الاشتراك',
    fetchError: 'حدث خطأ أثناء جلب بيانات الاشتراك',
    genericError: 'حدث خطأ',
    backToPayment: 'العودة إلى صفحة الدفع',
    noSubscription: 'لا يوجد اشتراك',
    noActiveSubscription: 'لم يتم العثور على أي اشتراك نشط',
    title: 'حالة الدفع والاشتراك',
    subtitle: 'راجع حالة اشتراكك وتفاصيل الفاتورة',
    status: { pending: 'في انتظار التأكيد', active: 'نشط', expired: 'منتهي', cancelled: 'ملغي' },
    invoice: 'فاتورة اشتراك',
    printInvoice: 'طباعة الفاتورة',
    downloadInvoice: 'تحميل الفاتورة',
    downloadSoon: 'سيتم إضافة هذه الميزة قريبًا',
    customerInfo: 'معلومات العميل',
    subscriptionInfo: 'تفاصيل الاشتراك',
    invoiceNumber: 'رقم الفاتورة',
    issueDate: 'تاريخ الإصدار',
    customerName: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    address: 'العنوان',
    taxNumber: 'الرقم الضريبي',
    plan: 'الباقة',
    amount: 'المبلغ',
    paymentMethod: 'طريقة الدفع',
    bankTransfer: 'تحويل بنكي',
    cardOrOther: 'بطاقة ائتمان/أخرى',
    transactionId: 'رقم العملية',
    paymentDate: 'تاريخ الدفع',
    startDate: 'تاريخ بداية الاشتراك',
    endDate: 'تاريخ نهاية الاشتراك',
    autoRenew: 'تجديد تلقائي',
    yes: 'نعم',
    no: 'لا',
    unavailable: 'غير متوفر',
    supportNote: 'نحن هنا دائمًا لدعمك. لأي استفسار أو مساعدة لا تتردد في التواصل معنا عبر البريد أو الهاتف.',
    thankYou: 'شكرًا لاختيارك منصتنا لتحقيق طموحاتك الرياضية!',
    footer: 'منصة mesk llc & El7lm - جميع الحقوق محفوظة',
    electronicInvoice: 'تم إصدار هذه الفاتورة إلكترونيًا ولا تحتاج إلى توقيع.',
    print: 'طباعة الفاتورة',
  },
  en: {
    loading: 'Loading data...',
    notFoundError: 'Subscription data was not found',
    fetchError: 'An error occurred while loading subscription data',
    genericError: 'An error occurred',
    backToPayment: 'Back to payment page',
    noSubscription: 'No subscription',
    noActiveSubscription: 'No active subscription was found',
    title: 'Payment and subscription status',
    subtitle: 'Review your subscription status and invoice details',
    status: { pending: 'Pending confirmation', active: 'Active', expired: 'Expired', cancelled: 'Cancelled' },
    invoice: 'Subscription invoice',
    printInvoice: 'Print invoice',
    downloadInvoice: 'Download invoice',
    downloadSoon: 'This feature will be added soon',
    customerInfo: 'Customer information',
    subscriptionInfo: 'Subscription details',
    invoiceNumber: 'Invoice number',
    issueDate: 'Issue date',
    customerName: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    taxNumber: 'Tax number',
    plan: 'Plan',
    amount: 'Amount',
    paymentMethod: 'Payment method',
    bankTransfer: 'Bank transfer',
    cardOrOther: 'Credit card/other',
    transactionId: 'Transaction ID',
    paymentDate: 'Payment date',
    startDate: 'Subscription start date',
    endDate: 'Subscription end date',
    autoRenew: 'Auto renew',
    yes: 'Yes',
    no: 'No',
    unavailable: 'Unavailable',
    supportNote: 'We are always here to support you. For any questions or help, contact us by email or phone.',
    thankYou: 'Thank you for choosing our platform to pursue your sports ambitions!',
    footer: 'mesk llc & El7lm platform - All rights reserved',
    electronicInvoice: 'This invoice was issued electronically and does not require a signature.',
    print: 'Print invoice',
  },
  es: {
    loading: 'Cargando datos...',
    notFoundError: 'No se encontraron datos de suscripción',
    fetchError: 'Ocurrió un error al cargar los datos de suscripción',
    genericError: 'Ocurrió un error',
    backToPayment: 'Volver a la página de pago',
    noSubscription: 'No hay suscripción',
    noActiveSubscription: 'No se encontró ninguna suscripción activa',
    title: 'Estado de pago y suscripción',
    subtitle: 'Revisa el estado de tu suscripción y los detalles de la factura',
    status: { pending: 'Pendiente de confirmación', active: 'Activo', expired: 'Vencido', cancelled: 'Cancelado' },
    invoice: 'Factura de suscripción',
    printInvoice: 'Imprimir factura',
    downloadInvoice: 'Descargar factura',
    downloadSoon: 'Esta función se añadirá pronto',
    customerInfo: 'Información del cliente',
    subscriptionInfo: 'Detalles de la suscripción',
    invoiceNumber: 'Número de factura',
    issueDate: 'Fecha de emisión',
    customerName: 'Nombre',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    address: 'Dirección',
    taxNumber: 'Número fiscal',
    plan: 'Plan',
    amount: 'Importe',
    paymentMethod: 'Método de pago',
    bankTransfer: 'Transferencia bancaria',
    cardOrOther: 'Tarjeta de crédito/otro',
    transactionId: 'ID de transacción',
    paymentDate: 'Fecha de pago',
    startDate: 'Fecha de inicio',
    endDate: 'Fecha de finalización',
    autoRenew: 'Renovación automática',
    yes: 'Sí',
    no: 'No',
    unavailable: 'No disponible',
    supportNote: 'Siempre estamos aquí para ayudarte. Para cualquier consulta, contáctanos por correo o teléfono.',
    thankYou: '¡Gracias por elegir nuestra plataforma para lograr tus ambiciones deportivas!',
    footer: 'Plataforma mesk llc & El7lm - Todos los derechos reservados',
    electronicInvoice: 'Esta factura fue emitida electrónicamente y no requiere firma.',
    print: 'Imprimir factura',
  },
  pt: {
    loading: 'Carregando dados...',
    notFoundError: 'Dados da assinatura não encontrados',
    fetchError: 'Ocorreu um erro ao carregar os dados da assinatura',
    genericError: 'Ocorreu um erro',
    backToPayment: 'Voltar para a página de pagamento',
    noSubscription: 'Nenhuma assinatura',
    noActiveSubscription: 'Nenhuma assinatura ativa foi encontrada',
    title: 'Status do pagamento e assinatura',
    subtitle: 'Revise o status da assinatura e os detalhes da fatura',
    status: { pending: 'Aguardando confirmação', active: 'Ativo', expired: 'Expirado', cancelled: 'Cancelado' },
    invoice: 'Fatura da assinatura',
    printInvoice: 'Imprimir fatura',
    downloadInvoice: 'Baixar fatura',
    downloadSoon: 'Este recurso será adicionado em breve',
    customerInfo: 'Informações do cliente',
    subscriptionInfo: 'Detalhes da assinatura',
    invoiceNumber: 'Número da fatura',
    issueDate: 'Data de emissão',
    customerName: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    address: 'Endereço',
    taxNumber: 'Número fiscal',
    plan: 'Plano',
    amount: 'Valor',
    paymentMethod: 'Método de pagamento',
    bankTransfer: 'Transferência bancária',
    cardOrOther: 'Cartão de crédito/outro',
    transactionId: 'ID da transação',
    paymentDate: 'Data do pagamento',
    startDate: 'Data de início',
    endDate: 'Data de término',
    autoRenew: 'Renovação automática',
    yes: 'Sim',
    no: 'Não',
    unavailable: 'Indisponível',
    supportNote: 'Estamos sempre aqui para ajudar. Para dúvidas ou suporte, entre em contato por e-mail ou telefone.',
    thankYou: 'Obrigado por escolher nossa plataforma para realizar suas ambições esportivas!',
    footer: 'Plataforma mesk llc & El7lm - Todos os direitos reservados',
    electronicInvoice: 'Esta fatura foi emitida eletronicamente e não requer assinatura.',
    print: 'Imprimir fatura',
  },
};

const paymentStatusBrandName = 'mesk llc & El7lm';

function SubscriptionStatusContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale, isRTL } = useTranslation();
  const copy = PAYMENT_STATUS_COPY[locale] || PAYMENT_STATUS_COPY.en;
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateLocale = isRTL ? 'ar-EG' : 'en-US';
  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString(dateLocale) : copy.unavailable;

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) setSubscription(data as SubscriptionStatus);
        else setError(copy.notFoundError);
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(copy.fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, [user, router, copy.notFoundError, copy.fetchError]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => copy.status[status] || status;

  const rows = subscription ? [
    [copy.invoiceNumber, subscription.invoice_number],
    [copy.issueDate, formatDate(subscription.payment_date)],
    [copy.customerName, subscription.customer_name],
    [copy.email, subscription.customer_email],
    [copy.phone, subscription.customer_phone],
    [copy.address, subscription.billing_address || copy.unavailable],
    [copy.taxNumber, subscription.tax_number || copy.unavailable],
    [copy.plan, subscription.plan_name],
    [copy.amount, `${subscription.amount || ''} ${subscription.currencySymbol || subscription.currency || ''}`],
    [copy.paymentMethod, subscription.payment_method === 'bank_transfer' ? copy.bankTransfer : copy.cardOrOther],
    [copy.transactionId, subscription.transaction_id || copy.unavailable],
    [copy.paymentDate, formatDate(subscription.payment_date)],
    [copy.startDate, formatDate(subscription.start_date)],
    [copy.endDate, formatDate(subscription.end_date)],
    [copy.autoRenew, subscription.autoRenew ? copy.yes : copy.no],
  ] : [];

  const handlePrintInvoice = () => {
    if (!subscription) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dir = isRTL ? 'rtl' : 'ltr';
    const customerRows = rows.slice(0, 7).map(([label, value]) => `<tr><th>${label}</th><td>${value || copy.unavailable}</td></tr>`).join('');
    const subscriptionRows = rows.slice(7).map(([label, value]) => `<tr><th>${label}</th><td>${value || copy.unavailable}</td></tr>`).join('');
    const invoiceContent = `
      <!DOCTYPE html>
      <html dir="${dir}">
        <head>
          <title>${copy.invoice}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 0; margin: 0; background: #f7f7fa; }
            .invoice-container { max-width: 760px; margin: 40px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0001; padding: 32px 24px; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
            .invoice-title { font-size: 2rem; color: #1a237e; font-weight: bold; }
            .section-title { color: #1976d2; font-size: 1.1rem; margin: 24px 0 8px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { border: 1px solid #e0e0e0; padding: 10px 8px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 15px; }
            th { background: #f0f4fa; color: #1a237e; width: 38%; }
            td { background: #fafbfc; }
            .note { background: #e3f2fd; color: #1976d2; border-radius: 8px; padding: 12px; margin: 18px 0; }
            .thankyou { color: #388e3c; font-size: 1.1rem; margin-top: 18px; font-weight: bold; }
            .footer { border-top: 2px solid #eee; padding-top: 16px; margin-top: 24px; text-align: center; color: #555; font-size: 14px; }
            @media print { .no-print { display: none; } body { background: #fff; } .invoice-container { box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="invoice-title">${copy.invoice}</div>
              <div>${paymentStatusBrandName}</div>
            </div>
            <div class="section-title">${copy.customerInfo}</div>
            <table>${customerRows}</table>
            <div class="section-title">${copy.subscriptionInfo}</div>
            <table>${subscriptionRows}</table>
            <div class="note">${copy.supportNote}</div>
            <div class="thankyou">${copy.thankYou}</div>
            <div class="footer">${copy.footer} © ${new Date().getFullYear()}<br />${copy.electronicInvoice}</div>
            <div class="no-print" style="text-align:center;margin-top:20px;">
              <button onclick="window.print()" style="background:#1976d2;color:#fff;padding:10px 30px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">${copy.print}</button>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="mt-4 text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="p-6 text-center bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-800">{error ? copy.genericError : copy.noSubscription}</h2>
          <p className="mt-2 text-gray-600">{error || copy.noActiveSubscription}</p>
          <button onClick={() => router.push('/dashboard/payment')} className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            {copy.backToPayment}
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 py-10" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{copy.title}</h1>
              <p className="text-slate-600 mt-2">{copy.subtitle}</p>
            </div>
            <span className={`inline-flex w-fit px-4 py-2 rounded-full font-semibold ${getStatusColor(subscription.status)}`}>
              {getStatusText(subscription.status)}
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-900">{copy.invoice}</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={handlePrintInvoice} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Printer className="w-4 h-4" />
                  {copy.printInvoice}
                </button>
                <button onClick={() => alert(copy.downloadSoon)} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800">
                  <Download className="w-4 h-4" />
                  {copy.downloadInvoice}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <section>
                <h3 className="text-lg font-semibold text-blue-700 mb-3">{copy.customerInfo}</h3>
                <div className="space-y-3">
                  {rows.slice(0, 7).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-900 text-end">{value || copy.unavailable}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-lg font-semibold text-blue-700 mb-3">{copy.subscriptionInfo}</h3>
                <div className="space-y-3">
                  {rows.slice(7).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-900 text-end">{value || copy.unavailable}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SubscriptionStatusPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionStatusContent />
    </Suspense>
  );
}
