'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, RefreshCw, ShieldCheck, ShieldOff, Sparkles, Wallet } from 'lucide-react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';

interface ConfigStatus {
  hasMerchantKey: boolean;
  hasApiPassword: boolean;
  baseUrl: string;
  callbackUrl: string;
}

interface ConfigResponse {
  live: ConfigStatus;
  test: ConfigStatus;
}

type GeideaMode = 'live' | 'test';

interface OrderResult {
  success: boolean;
  error?: string;
  data?: any;
  response?: any;
  status?: number;
  environment?: string;
  endpoint?: string;
  saved?: boolean;
  savedData?: any;
}

const credentialPresets = {
  test: {
    merchantId: 'e510dca3-d113-47bf-b4b0-9b92bac661f6',
    publicKey: 'e510dca3-d113-47bf-b4b0-9b92bac661f6',
    apiPassword: '9b794cd5-9b42-4048-8e97-2c162f35710f',
    callbackUrl: 'https://www.el7lm.com/api/geidea/callback',
  },
  live: {
    merchantId: '3448c010-87b1-41e7-9771-cac444268cfb',
    publicKey: '3448c010-87b1-41e7-9771-cac444268cfb',
    apiPassword: 'edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0',
    callbackUrl: 'https://www.el7lm.com/api/geidea/callback',
  },
};

const SectionCard = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
    {children}
  </div>
);

const StatusPill = ({ active, label }: { active: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      }`}
  >
    {active ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
    {label}
  </span>
);

const CredentialRow = ({ label, value }: { label: string; value: string }) => {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success('تم نسخ القيمة');
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <code className="text-sm text-gray-800 break-all">{value}</code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:text-gray-900 hover:border-gray-300"
          aria-label={`نسخ ${label}`}
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ModePill = ({ mode, active }: { mode: GeideaMode; active: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${active
      ? 'bg-indigo-600 text-white shadow-md'
      : 'bg-gray-100 text-gray-500'
      }`}
  >
    {active && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
    {mode === 'live' ? 'البيئة الحية' : 'بيئة الاختبار'}
    {active && <span className="text-xs">(نشط)</span>}
  </span>
);

export default function GeideaSettingsPage() {
  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({ allowedTypes: ['admin'] });
  const [configStatus, setConfigStatus] = useState<ConfigResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [env, setEnv] = useState<GeideaMode>('live');
  const [mode, setMode] = useState<GeideaMode>('live');
  const [modeSaving, setModeSaving] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [merchantReferenceId, setMerchantReferenceId] = useState('');
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [testingCallback, setTestingCallback] = useState(false);
  const [callbackTestResult, setCallbackTestResult] = useState<any>(null);

  const loadConfigStatus = async () => {
    try {
      setStatusLoading(true);
      console.log('🔄 [Geidea Settings] Loading config status...');

      const response = await fetch('/api/geidea/config-status');
      const data = await response.json();

      console.log('🔄 [Geidea Settings] Config status response:', data);

      if (data.success) {
        setConfigStatus(data.config);
        if (data.mode === 'test' || data.mode === 'live') {
          console.log('✅ [Geidea Settings] Setting mode to:', data.mode);
          setMode(data.mode);
          setEnv(data.mode);
        } else {
          console.warn('⚠️ [Geidea Settings] Invalid mode received:', data.mode);
        }
      } else {
        console.error('❌ [Geidea Settings] Failed to load config status:', data.error);
        toast.error(data.error || 'تعذر تحميل حالة الإعدادات');
      }
    } catch (error) {
      console.error('❌ [Geidea Settings] Error fetching Geidea config status:', error);
      toast.error('حدث خطأ أثناء تحميل حالة الإعدادات');
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadConfigStatus();
  }, []);

  const handleModeUpdate = async (newMode: GeideaMode) => {
    if (newMode === mode || modeSaving) return;
    try {
      setModeSaving(true);
      console.log('🔄 [Geidea Settings] Updating mode to:', newMode);

      const response = await fetch('/api/geidea/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });

      const data = await response.json();
      console.log('🔄 [Geidea Settings] Mode update response:', data);

      if (data.success) {
        setMode(newMode);
        setEnv(newMode);
        toast.success(newMode === 'live' ? '✅ تم تفعيل البيئة الحية' : '✅ تم تفعيل بيئة الاختبار');

        // إعادة تحميل حالة الإعدادات بعد التحديث
        setTimeout(() => {
          loadConfigStatus();
        }, 500);
      } else {
        console.error('❌ [Geidea Settings] Mode update failed:', data);
        const errorMessage = data.error || 'تعذر تحديث وضع Geidea';

        // معالجة خاصة لأخطاء Quota
        if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota exceeded')) {
          toast.error('تم تجاوز الحصة المسموحة في Firestore. يرجى المحاولة مرة أخرى بعد قليل.', {
            duration: 8000,
          });
        } else {
          toast.error(errorMessage, { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('❌ [Geidea Settings] Error updating Geidea mode:', error);
      toast.error('حدث خطأ أثناء تحديث الوضع: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setModeSaving(false);
    }
  };

  const handleFetchOrder = async () => {
    if (!orderId && !merchantReferenceId) {
      toast.error('يرجى إدخال orderId أو merchantReferenceId');
      return;
    }

    try {
      setIsFetchingOrder(true);
      setOrderResult(null);

      const params = new URLSearchParams({ env });
      if (orderId) params.append('orderId', orderId.trim());
      if (merchantReferenceId) params.append('merchantReferenceId', merchantReferenceId.trim());

      const response = await fetch(`/api/geidea/fetch-order?${params.toString()}`);
      const data = await response.json();

      setOrderResult(data);

      if (data.success) {
        toast.success('تم جلب بيانات المعاملة بنجاح');
      } else if (data.status === 200) {
        toast.error(data.error || 'تعذر جلب بيانات المعاملة');
      } else {
        toast.error(data.error || 'حدث خطأ أثناء الاتصال بجيديا');
      }
    } catch (error) {
      console.error('Error fetching Geidea order:', error);
      toast.error('حدث خطأ أثناء الاتصال بجيديا');
    } finally {
      setIsFetchingOrder(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!orderResult || !orderResult.success || !orderResult.data) {
      toast.error('لا توجد بيانات معاملة صالحة للحفظ');
      return;
    }

    try {
      setIsSavingOrder(true);

      const response = await fetch('/api/geidea/save-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData: orderResult.data }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ تم حفظ المعاملة بنجاح في قاعدة البيانات (${data.status})`);
        // تحديث orderResult لإظهار أن البيانات تم حفظها
        setOrderResult({
          ...orderResult,
          saved: true,
          savedData: data.savedData,
        });
      } else {
        toast.error(data.error || 'تعذر حفظ بيانات المعاملة');
      }
    } catch (error) {
      console.error('Error saving Geidea order:', error);
      toast.error('حدث خطأ أثناء حفظ بيانات المعاملة');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const statusSummary = useMemo(() => {
    if (!configStatus) return null;
    return [
      {
        label: 'البيئة الحية',
        status: configStatus.live,
      },
      {
        label: 'بيئة الاختبار',
        status: configStatus.test,
      },
    ];
  }, [configStatus]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600 font-medium">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* أيقونة القفل */}
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* العنوان */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            غير مصرح لك بالوصول
          </h2>

          {/* الوصف */}
          <p className="text-gray-600 mb-8">
            هذه الصفحة مخصصة للمسؤولين فقط. يرجى تسجيل الدخول بحساب إداري للوصول إلى إعدادات جيديا.
          </p>

          {/* الأزرار */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.href = '/admin/login'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              تسجيل الدخول
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              الصفحة الرئيسية
            </button>
          </div>

          {/* رابط المساعدة */}
          <p className="mt-6 text-sm text-gray-500">
            هل تحتاج مساعدة؟{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
              اتصل بالدعم الفني
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <Sparkles className="w-3 h-3" />
          Geidea Integration Hub
        </div>
        <h1 className="text-3xl font-bold text-gray-900">مركز إدارة ربط جيديا</h1>
        <p className="text-gray-600">
          إعداد وربط نظام المدفوعات مع Geidea، مع دعم بيئة الاختبار والبيئة الحية، بالإضافة إلى أدوات اختبار فورية.
        </p>
      </header>

      <SectionCard
        title="حالة الإعدادات البيئية"
        description="تحقق من اكتمال مفاتيح Geidea في بيئة الاختبار والبيئة الحية."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ModePill mode="live" active={mode === 'live'} />
          <ModePill mode="test" active={mode === 'test'} />
          {modeSaving && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              جاري التحديث...
            </span>
          )}
          <div className="flex gap-2 text-xs">
            {(['live', 'test'] as GeideaMode[]).map((type) => (
              <button
                key={type}
                onClick={() => handleModeUpdate(type)}
                disabled={modeSaving || mode === type}
                className={`rounded-full border px-3 py-1 font-medium transition ${mode === type
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 cursor-default'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {mode === type ? '✓ ' : ''}اجعل {type === 'live' ? 'الإنتاج' : 'الاختبار'} نشطاً
              </button>
            ))}
          </div>
        </div>

        {statusLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            جاري تحميل الحالة...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {statusSummary?.map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800">{item.label}</h4>
                  <button
                    onClick={loadConfigStatus}
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
                  >
                    تحديث
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill active={item.status.hasMerchantKey} label="مفتاح التاجر" />
                  <StatusPill active={item.status.hasApiPassword} label="API Password" />
                  <StatusPill active={Boolean(item.status.callbackUrl && item.status.callbackUrl !== 'غير محدد')} label="Callback URL" />
                </div>
                <div className="text-xs text-gray-500">
                  <div>Base URL: {item.status.baseUrl}</div>
                  <div>Callback URL: {item.status.callbackUrl}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="مفاتيح Geidea الرسمية"
        description="استخدم هذه البيانات لضبط متغيرات البيئة طبقاً للدليل الرسمي لجيديا."
      >
        <div className="grid gap-6 md:grid-cols-2">
          {(['test', 'live'] as const).map((type) => (
            <div key={type} className="space-y-3 rounded-2xl border border-gray-100 p-4 bg-gradient-to-b from-white to-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">{type === 'live' ? 'البيئة الحية' : 'بيئة الاختبار'}</h4>
                  <p className="text-xs text-gray-500">
                    {type === 'live' ? 'معاملات حقيقية' : 'للاختبارات والتجارب دون تأثير على العملاء'}
                  </p>
                </div>
                <Wallet className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="space-y-3 text-sm">
                <CredentialRow label="Merchant ID" value={credentialPresets[type].merchantId} />
                <CredentialRow label="Merchant Public Key" value={credentialPresets[type].publicKey} />
                <CredentialRow label="Gateway API Password" value={credentialPresets[type].apiPassword} />
                <CredentialRow label="Callback URL" value={credentialPresets[type].callbackUrl} />
              </div>
              <p className="text-xs text-gray-500">
                قم بتخزين هذه القيم في متغيرات البيئة داخل الخادم، ولا تقم بمشاركتها خارج فريق البنية التحتية.
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="اختبار Callback يدوياً"
        description="استخدم هذا القسم لاختبار Callback يدوياً إذا لم يصل Callback تلقائياً من Geidea."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="font-semibold text-blue-900 mb-3">اختبار Callback من الواجهة:</h4>
                <p className="text-sm text-blue-800 mb-3">
                  استخدم الزر أدناه لاختبار Callback باستخدام البيانات من المعاملة الفاشلة:
                </p>
                <button
                  onClick={async () => {
                    setTestingCallback(true);
                    setCallbackTestResult(null);
                    try {
                      const response = await fetch('/api/geidea/test-callback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          orderId: '3ffba51b-26bd-49e9-0b73-08de1d1bfcee',
                          merchantReferenceId: 'BULKGQSMFDZABAAMBQXI22ZQOSWMCA',
                          responseCode: '999',
                          responseMessage: 'فشلت عملية التحقق للدفع',
                          detailedResponseCode: '999',
                          detailedResponseMessage: 'فشلت عملية التحقق للدفع',
                          status: 'failed',
                        }),
                      });
                      const data = await response.json();
                      setCallbackTestResult(data);
                      if (data.success) {
                        toast.success('✅ تم حفظ Callback بنجاح! تحقق من صفحة معاملات Geidea.');
                      } else {
                        toast.error('❌ فشل حفظ Callback: ' + (data.error || 'Unknown error'));
                      }
                    } catch (error) {
                      console.error('Error testing callback:', error);
                      toast.error('❌ حدث خطأ أثناء اختبار Callback');
                      setCallbackTestResult({ error: error instanceof Error ? error.message : 'Unknown error' });
                    } finally {
                      setTestingCallback(false);
                    }
                  }}
                  disabled={testingCallback}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${testingCallback ? 'animate-spin' : ''}`} />
                  {testingCallback ? 'جاري الاختبار...' : 'اختبار Callback'}
                </button>
              </div>

              {callbackTestResult && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">نتيجة الاختبار:</h4>
                  <pre className="h-48 overflow-auto rounded bg-white p-3 text-xs text-gray-800">
                    {JSON.stringify(callbackTestResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="font-semibold text-blue-900 mb-2">أو استخدم Console:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 mb-3">
                <li>افتح Developer Tools في المتصفح (F12)</li>
                <li>اذهب إلى Console</li>
                <li>انسخ والصق الكود التالي:</li>
              </ol>
              <pre className="p-3 bg-white rounded border border-blue-200 text-xs overflow-x-auto">
                {`fetch('/api/geidea/test-callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: '3ffba51b-26bd-49e9-0b73-08de1d1bfcee',
    merchantReferenceId: 'BULKGQSMFDZABAAMBQXI22ZQOSWMCA',
    responseCode: '999',
    responseMessage: 'فشلت عملية التحقق للدفع',
    detailedResponseCode: '999',
    detailedResponseMessage: 'فشلت عملية التحقق للدفع',
    status: 'failed'
  })
}).then(r => r.json()).then(console.log)`}
              </pre>
              <p className="mt-2 text-xs text-blue-700">
                بعد التنفيذ، تحقق من صفحة معاملات Geidea لرؤية البيانات المحفوظة.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="اختبار جلب معاملة مباشرة من Geidea"
        description="استخدم واجهة Fetch Transaction أو Fetch by Merchant Reference للتحقق من حالة معاملات محددة عبر واجهة Geidea الرسمية."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اختر البيئة</label>
              <div className="flex gap-3">
                {(['live', 'test'] as GeideaMode[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEnv(type)}
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition ${env === type ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'
                      }`}
                  >
                    {type === 'live' ? 'البيئة الحية' : 'بيئة الاختبار'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">orderId (من Geidea)</label>
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="مثال: 6ea00782-957a-459b-9ff7-08db103ef12c"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">merchantReferenceId (اختياري)</label>
              <input
                value={merchantReferenceId}
                onChange={(e) => setMerchantReferenceId(e.target.value)}
                placeholder="مثال: EL7LM123456789"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              onClick={handleFetchOrder}
              disabled={isFetchingOrder}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingOrder ? 'animate-spin' : ''}`} />
              {isFetchingOrder ? 'جاري الجلب...' : 'جلب بيانات المعاملة'}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800">نتيجة الطلب</h4>
              <div className="flex items-center gap-2">
                {orderResult && (
                  <>
                    <span
                      className={`text-xs font-semibold ${orderResult.success ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                    >
                      {orderResult.success ? 'نجاح' : 'فشل'}
                    </span>
                    {orderResult.saved && (
                      <span className="text-xs font-semibold text-blue-600">
                        ✓ محفوظ
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <pre className="h-64 overflow-auto rounded-xl bg-white p-3 text-xs text-gray-800">
              {orderResult ? JSON.stringify(orderResult, null, 2) : '// لم يتم تنفيذ أي طلب حتى الآن'}
            </pre>
            {orderResult && orderResult.success && orderResult.data && !orderResult.saved && (
              <div className="mt-3">
                <button
                  onClick={handleSaveOrder}
                  disabled={isSavingOrder}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSavingOrder ? 'animate-spin' : ''}`} />
                  {isSavingOrder ? 'جاري الحفظ...' : '💾 حفظ في قاعدة البيانات'}
                </button>
              </div>
            )}
            {orderResult && orderResult.saved && (
              <div className="mt-3">
                <p className="text-sm text-emerald-600 font-semibold">
                  ✅ تم حفظ المعاملة في قاعدة البيانات بنجاح
                </p>
                {orderResult.savedData && (
                  <p className="text-xs text-gray-500 mt-1">
                    الحالة: {orderResult.savedData.status} |
                    المبلغ: {orderResult.savedData.amount} {orderResult.savedData.currency}
                  </p>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              تعتمد هذه الواجهة على Geidea API الرسمي حسب{' '}
              <a
                href="https://docs.geidea.net/docs/fetch-1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline"
              >
                وثائق Fetch Transaction أو Order Details
              </a>
              .
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="روابط مفيدة" description="مصادر Geidea الرسمية لمساعدتك في الإعداد.">
        <ul className="grid gap-3 md:grid-cols-2 text-sm">
          <li className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <a
              href="https://docs.geidea.net/docs/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-semibold hover:underline"
            >
              نظرة عامة على حلول Geidea
            </a>
            <p className="text-xs text-gray-500 mt-1">دليل البدء وربط البوابة.</p>
          </li>
          <li className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <a
              href="https://docs.geidea.net/docs/fetch-1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Fetch Transaction or Order Details
            </a>
            <p className="text-xs text-gray-500 mt-1">واجهة جلب تفاصيل المعاملة بواسطة orderId.</p>
          </li>
          <li className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <a
              href="https://docs.geidea.net/docs/fetch-transaction-or-order-details-by-merchant-reference"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Fetch by Merchant Reference
            </a>
            <p className="text-xs text-gray-500 mt-1">واجهة جلب تفاصيل المعاملة باستخدام merchantReferenceId.</p>
          </li>
          <li className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <a
              href="https://docs.geidea.net/docs/geidea-checkout-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Geidea Checkout v2
            </a>
            <p className="text-xs text-gray-500 mt-1">الدليل الرسمي لتجهيز جلسات الدفع.</p>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}

