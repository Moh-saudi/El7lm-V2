'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  method?: string;
  fallback?: boolean;
  code?: string;
  retryAfter?: number;
  timestamp?: string;
}

export default function TestBeOnV3Page() {
  const [phone, setPhone] = useState('+201017799580');
  const [message, setMessage] = useState('مرحباً! هذه رسالة اختبار من El7lm Platform مع BeOn V3 API');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const testSMS = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          singlePhone: phone,
          message: message
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'SMS' }]);
      
      if (result.success) {
        toast.success('تم إرسال SMS بنجاح!');
      } else {
        toast.error(result.error || 'فشل في إرسال SMS');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'SMS' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const testWhatsApp = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          singlePhone: phone,
          message: message,
          useFallback: true
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'WhatsApp' }]);
      
      if (result.success) {
        toast.success('تم إرسال WhatsApp بنجاح! (سيتم إرساله كـ SMS)');
      } else {
        toast.error(result.error || 'فشل في إرسال WhatsApp');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'WhatsApp' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const testUnifiedMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          singlePhone: phone,
          message: message,
          preferredMethod: 'sms'
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'Unified Messages' }]);
      
      if (result.success) {
        toast.success('تم إرسال الرسالة الموحدة بنجاح!');
      } else {
        toast.error(result.error || 'فشل في إرسال الرسالة الموحدة');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Unified Messages' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const checkAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/account', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'Account Check' }]);
      
      if (result.success) {
        toast.success('تم التحقق من الحساب بنجاح!');
      } else {
        toast.error(result.error || 'فشل في التحقق من الحساب');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Account Check' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const testAlternativeEndpoints = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/test-alternative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: message
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'Alternative Endpoints Test' }]);
      
      if (result.success) {
        toast.success('تم اختبار الـ endpoints البديلة!');
      } else {
        toast.error(result.error || 'فشل في اختبار الـ endpoints البديلة');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Alternative Endpoints Test' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const deepDiagnosis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/debug-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: message
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'Deep Diagnosis' }]);
      
      if (result.success) {
        toast.success('تم التشخيص العميق بنجاح!');
      } else {
        toast.error(result.error || 'فشل في التشخيص العميق');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Deep Diagnosis' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const checkBalance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/check-balance', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'Balance Check' }]);
      
      if (result.success) {
        toast.success('تم فحص الرصيد بنجاح!');
      } else {
        toast.error(result.error || 'فشل في فحص الرصيد');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Balance Check' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const testRealDelivery = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/test-real-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: message
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'Real Delivery Test' }]);
      
      if (result.success) {
        toast.success('تم اختبار الإرسال الحقيقي بنجاح!');
      } else {
        toast.error(result.error || 'فشل في اختبار الإرسال الحقيقي');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Real Delivery Test' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">اختبار BeOn V3 API</h1>
        <p className="text-muted-foreground">
          صفحة اختبار شاملة لجميع خدمات BeOn V3 API
        </p>
      </div>

      <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            <strong>ملاحظة مهمة:</strong> BeOn V3 لا يدعم WhatsApp فعلياً. جميع طلبات WhatsApp يتم إرسالها كـ SMS.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* نموذج الاختبار */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الاختبار</CardTitle>
            <CardDescription>
              أدخل رقم الهاتف والرسالة للاختبار
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">رقم الهاتف</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+201017799580"
                dir="ltr"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">الرسالة</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="أدخل رسالة الاختبار هنا..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length}/1000 حرف
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={checkAccount} 
                disabled={loading}
                className="w-full"
                variant="destructive"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                فحص الحساب
              </Button>
              
              <Button 
                onClick={testAlternativeEndpoints} 
                disabled={loading}
                className="w-full"
                variant="secondary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                اختبار Endpoints بديلة
              </Button>
              
              <Button 
                onClick={deepDiagnosis} 
                disabled={loading}
                className="w-full"
                variant="destructive"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                تشخيص عميق للمشكلة
              </Button>
              
              <Button 
                onClick={checkBalance} 
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                فحص رصيد الحساب
              </Button>
              
              <Button 
                onClick={testRealDelivery} 
                disabled={loading}
                className="w-full"
                variant="secondary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                اختبار إرسال حقيقي
              </Button>
              
              <Button 
                onClick={testSMS} 
                disabled={loading}
                className="w-full"
                variant="default"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                اختبار SMS
              </Button>
              
              <Button 
                onClick={testWhatsApp} 
                disabled={loading}
                className="w-full"
                variant="secondary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                اختبار WhatsApp (SMS)
              </Button>
              
              <Button 
                onClick={testUnifiedMessages} 
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                اختبار الرسائل الموحدة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* نتائج الاختبار */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>نتائج الاختبار</CardTitle>
                <CardDescription>
                  عرض نتائج جميع الاختبارات
                </CardDescription>
              </div>
              {results.length > 0 && (
                <Button onClick={clearResults} variant="outline" size="sm">
                  مسح النتائج
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                لم يتم إجراء أي اختبارات بعد
              </p>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.method}
                      </Badge>
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <p className="text-sm font-medium mb-1">
                      {result.success ? 'نجح' : 'فشل'}
                    </p>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {result.message || result.error}
                    </p>
                    
                    {/* عرض معلومات إضافية */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {result.code && (
                        <Badge variant="outline" className="text-xs">
                          Code: {result.code}
                        </Badge>
                      )}
                      {result.retryAfter && (
                        <Badge variant="outline" className="text-xs">
                          Retry After: {result.retryAfter}s
                        </Badge>
                      )}
                      {result.timestamp && (
                        <Badge variant="outline" className="text-xs">
                          {new Date(result.timestamp).toLocaleTimeString('ar-EG')}
                        </Badge>
                      )}
                    </div>
                    
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          تفاصيل إضافية
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* معلومات API */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>معلومات BeOn V3 API</CardTitle>
          <CardDescription>
            تفاصيل التكوين والخدمات المتاحة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">الخدمات المتاحة:</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  SMS API - يعمل بشكل مثالي
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  WhatsApp API - يعمل (يرسل كـ SMS)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unified Messages API - يعمل
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Template API - غير متاح
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">التكوين:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Base URL: https://v3.api.beon.chat</li>
                <li>Token: Yt3A3RwMQHx49trsz1EMgSKP8qOD0CSVJXdJxy6IqNNtcYblsYWtfVAtaJpv</li>
                <li>Sender: El7lm</li>
                <li>Language: Arabic (ar)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
