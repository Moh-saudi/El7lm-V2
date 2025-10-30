'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Info, Loader2, MessageSquare, QrCode, Send, Settings, Smartphone, Upload, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface BabaserviceConfig {
  baseUrl: string;
  hasAccessToken: boolean;
  hasInstanceId: boolean;
  hasWebhookUrl: boolean;
}

interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export default function BabaserviceWhatsAppAdminPage() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<BabaserviceConfig | null>(null);
  const [instanceId, setInstanceId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [groupId, setGroupId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Templates
  const messageTemplates = {
    welcome: 'مرحباً بك في منصة العلم! 🎓',
    otp: 'رمز التحقق الخاص بك هو: {otp}',
    order_confirmation: 'تم تأكيد طلبك بنجاح! رقم الطلب: {orderId}',
    order_update: 'تم تحديث حالة طلبك رقم {orderId} إلى: {status}',
    payment_success: 'تم استلام دفعتك بنجاح! شكراً لك.',
    course_enrollment: 'تم تسجيلك في الدورة: {courseName}',
    notification: 'لديك إشعار جديد: {message}'
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/babaservice?action=config');
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        if (result.data.hasInstanceId) {
          setInstanceId('موجود');
        }
      }
    } catch (error) {
      console.error('خطأ في جلب التكوين:', error);
    }
  };

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev]);
  };

  const testAPI = async (action: string, data: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/babaservice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await response.json();
      addResult(result);

      if (result.success && result.data?.instance_id) {
        setInstanceId(result.data.instance_id);
        toast.success('تم إنشاء Instance بنجاح');
      }

      if (result.success && result.data?.qr_code) {
        setQrCode(result.data.qr_code);
        toast.success('تم الحصول على QR Code');
      }

    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message || 'حدث خطأ في الاتصال'
      };
      addResult(errorResult);
      toast.error(errorResult.error);
    } finally {
      setLoading(false);
    }
  };

  const sendBulkNotification = async () => {
    if (!phoneNumber || !message) {
      toast.error('رقم الهاتف والرسالة مطلوبان');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/babaservice/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          type: 'admin_notification',
          phoneNumbers: [phoneNumber],
          message: message,
          instance_id: instanceId !== 'موجود' ? instanceId : undefined
        }),
      });

      const result = await response.json();
      addResult(result);

      if (result.success) {
        toast.success('تم إرسال الإشعار بنجاح');
      } else {
        toast.error(result.error || 'فشل في إرسال الإشعار');
      }

    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message || 'حدث خطأ في إرسال الإشعار'
      };
      addResult(errorResult);
      toast.error(errorResult.error);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    if (!phoneNumber) {
      toast.error('رقم الهاتف مطلوب');
      return;
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/babaservice/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          otp: otp,
          name: 'مستخدم النظام',
          instance_id: instanceId !== 'موجود' ? instanceId : undefined
        }),
      });

      const result = await response.json();
      addResult(result);

      if (result.success) {
        toast.success(`تم إرسال OTP: ${otp}`);
      } else {
        toast.error(result.error || 'فشل في إرسال OTP');
      }

    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message || 'حدث خطأ في إرسال OTP'
      };
      addResult(errorResult);
      toast.error(errorResult.error);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = () => {
    if (selectedTemplate && messageTemplates[selectedTemplate as keyof typeof messageTemplates]) {
      setMessage(messageTemplates[selectedTemplate as keyof typeof messageTemplates]);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">إدارة Babaservice WhatsApp</h1>
        <p className="text-muted-foreground">
          إدارة وإرسال الرسائل عبر WhatsApp API الجديد
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            حالة التكوين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Badge variant={config.hasAccessToken ? "default" : "destructive"}>
                  {config.hasAccessToken ? "Access Token" : "لا يوجد Token"}
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={config.hasInstanceId ? "default" : "secondary"}>
                  {config.hasInstanceId ? "Instance ID" : "لا يوجد Instance"}
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={config.hasWebhookUrl ? "default" : "secondary"}>
                  {config.hasWebhookUrl ? "Webhook" : "لا يوجد Webhook"}
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="outline">
                  {config.baseUrl}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">جاري تحميل التكوين...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">الإعداد</TabsTrigger>
          <TabsTrigger value="messages">الرسائل</TabsTrigger>
          <TabsTrigger value="bulk">الإرسال الجماعي</TabsTrigger>
          <TabsTrigger value="results">النتائج</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعداد Instance</CardTitle>
              <CardDescription>
                إنشاء وإدارة Instance للاتصال بـ WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => testAPI('create_instance')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  إنشاء Instance جديد
                </Button>

                <Button
                  onClick={() => testAPI('get_qr_code', { instance_id: instanceId })}
                  disabled={loading || !instanceId || instanceId === 'موجود'}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  الحصول على QR Code
                </Button>
              </div>

              {instanceId && instanceId !== 'موجود' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Instance ID: <Badge variant="secondary">{instanceId}</Badge>
                  </AlertDescription>
                </Alert>
              )}

              {qrCode && (
                <div className="space-y-2">
                  <Label>QR Code للاتصال بـ WhatsApp:</Label>
                  <div className="p-4 border rounded-lg bg-white">
                    <img src={qrCode} alt="QR Code" className="mx-auto" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="webhookUrl">رابط Webhook (اختياري)</Label>
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://webhook.site/your-unique-url"
                />
                <Button
                  onClick={() => testAPI('set_webhook', {
                    webhook_url: webhookUrl,
                    enable: true,
                    instance_id: instanceId !== 'موجود' ? instanceId : undefined
                  })}
                  disabled={loading || !webhookUrl}
                  variant="outline"
                  size="sm"
                >
                  إعداد Webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إرسال الرسائل</CardTitle>
              <CardDescription>
                إرسال رسائل فردية عبر WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="966501234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">قالب الرسالة</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر قالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(messageTemplates).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.substring(0, 30)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={applyTemplate} variant="outline" size="sm">
                    تطبيق القالب
                  </Button>
                </div>
              </div>

              {/* تنبيه مهم حول صيغة الأرقام */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">⚠️ مهم: صيغة رقم الهاتف الصحيحة</AlertTitle>
                <AlertDescription className="text-blue-700 space-y-2">
                  <p className="font-semibold">يجب إدخال الرقم بصيغة دولية كاملة:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>✅ 🇪🇬 مصر: <code className="bg-white px-1 py-0.5 rounded text-xs">01017799580</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>✅ 🇸🇦 السعودية: <code className="bg-white px-1 py-0.5 rounded text-xs">0501234567</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>✅ 🇶🇦 قطر: <code className="bg-white px-1 py-0.5 rounded text-xs">77123456</code> أو <code className="bg-white px-1 py-0.5 rounded text-xs">97477123456</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-600" />
                      <span>❌ خطأ: <code className="bg-white px-1 py-0.5 rounded text-xs">1017799580</code> (ناقص رقم)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-600" />
                      <span>❌ خطأ: <code className="bg-white px-1 py-0.5 rounded text-xs">501234567</code> (ناقص رقم)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-600" />
                      <span>❌ خطأ: <code className="bg-white px-1 py-0.5 rounded text-xs">7123456</code> (ناقص رقم)</span>
                    </div>
                  </div>
                  <p className="text-xs mt-2">💡 النظام يحول الأرقام تلقائياً، لكن يجب إدخال الرقم المحلي **كاملاً**</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="message">الرسالة</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => testAPI('send_text', {
                    phoneNumber: phoneNumber,
                    message: message,
                    instance_id: instanceId !== 'موجود' ? instanceId : undefined
                  })}
                  disabled={loading || !phoneNumber || !message}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  إرسال رسالة نصية
                </Button>

                <Button
                  onClick={() => testAPI('send_media', {
                    phoneNumber: phoneNumber,
                    message: message,
                    media_url: mediaUrl,
                    instance_id: instanceId !== 'موجود' ? instanceId : undefined
                  })}
                  disabled={loading || !phoneNumber || !message || !mediaUrl}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  إرسال مع ميديا
                </Button>

                <Button
                  onClick={sendOTP}
                  disabled={loading || !phoneNumber}
                  variant="secondary"
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  إرسال OTP
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mediaUrl">رابط الميديا (اختياري)</Label>
                <Input
                  id="mediaUrl"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Messages Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الإرسال الجماعي</CardTitle>
              <CardDescription>
                إرسال رسائل لعدة أرقام في نفس الوقت
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkMessage">الرسالة الجماعية</Label>
                <Textarea
                  id="bulkMessage"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب الرسالة الجماعية هنا..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkPhone">أرقام الهواتف (مفصولة بفواصل)</Label>
                <Textarea
                  id="bulkPhone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="966501234567, 966501234568, 966501234569"
                  rows={3}
                />
              </div>

              <Button
                onClick={sendBulkNotification}
                disabled={loading || !phoneNumber || !message}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                إرسال إشعار جماعي
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>نتائج العمليات</CardTitle>
                <Button onClick={clearResults} variant="outline" size="sm">
                  مسح النتائج
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    لم يتم إجراء أي عمليات بعد
                  </p>
                ) : (
                  results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? "نجح" : "فشل"}
                        </Badge>
                      </div>

                      {result.message && (
                        <p className="text-sm mb-2">{result.message}</p>
                      )}

                      {result.error && (
                        <p className="text-sm text-red-600 mb-2">{result.error}</p>
                      )}

                      {result.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground">
                            عرض التفاصيل
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

