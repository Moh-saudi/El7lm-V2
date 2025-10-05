'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Loader2, 
  Send, 
  MessageSquare, 
  Settings, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Phone,
  Mail,
  Zap,
  Shield,
  Database,
  Activity,
  TrendingUp,
  Users,
  Clock,
  RefreshCw,
  Save,
  Download,
  Upload,
  Trash2,
  Eye,
  Edit,
  Plus,
  Minus,
  Calendar,
  RotateCcw
} from 'lucide-react';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  method: string;
  code?: string;
  retryAfter?: number;
  timestamp?: string;
  data?: any;
}

interface BeOnConfig {
  baseUrl: string;
  token: string;
  sender: string;
  language: string;
  maxRetries: number;
  timeout: number;
  rateLimit: number;
  emergencyMode: boolean;
  backupProvider: string;
  autoRetry: boolean;
  logLevel: string;
}

interface MessageStats {
  totalSent: number;
  successful: number;
  failed: number;
  pending: number;
  todaySent: number;
  thisWeekSent: number;
  thisMonthSent: number;
}

interface AccountInfo {
  status: string;
  balance: number;
  currency: string;
  lastActivity: string;
  plan: string;
  limits: {
    daily: number;
    monthly: number;
    perMinute: number;
  };
}

export default function BeOnV3AdminPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('+201017799580');
  const [message, setMessage] = useState('مرحباً! هذه رسالة اختبار من El7lm Platform مع BeOn V3 API');
  const [results, setResults] = useState<TestResult[]>([]);
  const [config, setConfig] = useState<BeOnConfig>({
    baseUrl: 'https://v3.api.beon.chat',
    token: 'Yt3A3RwMQHx49trsz1EMgSKP8qOD0CSVJXdJxy6IqNNtcYblsYWtfVAtaJpv',
    sender: 'El7lm',
    language: 'ar',
    maxRetries: 3,
    timeout: 30000,
    rateLimit: 100,
    emergencyMode: false,
    backupProvider: 'none',
    autoRetry: true,
    logLevel: 'info'
  });
  const [stats, setStats] = useState<MessageStats>({
    totalSent: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    todaySent: 0,
    thisWeekSent: 0,
    thisMonthSent: 0
  });
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    status: 'unknown',
    balance: 0,
    currency: 'USD',
    lastActivity: '',
    plan: 'unknown',
    limits: {
      daily: 1000,
      monthly: 10000,
      perMinute: 10
    }
  });

  // تحميل الإعدادات من API
  useEffect(() => {
    loadConfig();
    loadStats();
    loadAccountInfo();
  }, []);

  // تحميل الإعدادات
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/beon/config');
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('خطأ في تحميل الإعدادات:', error);
    }
  };

  // تحميل الإحصائيات
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/beon/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  // تحميل معلومات الحساب
  const loadAccountInfo = async () => {
    try {
      const response = await fetch('/api/admin/beon/account');
      const result = await response.json();
      if (result.success) {
        setAccountInfo(result.data);
      }
    } catch (error) {
      console.error('خطأ في تحميل معلومات الحساب:', error);
    }
  };

  // حفظ الإعدادات
  const saveConfig = async () => {
    try {
      const response = await fetch('/api/admin/beon/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, updatedBy: 'admin' })
      });
      
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
        toast.success('تم حفظ الإعدادات بنجاح!');
      } else {
        toast.error(result.error || 'فشل في حفظ الإعدادات');
      }
    } catch (error) {
      toast.error('خطأ في حفظ الإعدادات');
    }
  };

  // إعادة تعيين الإعدادات
  const resetConfig = async () => {
    try {
      const response = await fetch('/api/admin/beon/config?reset=true', {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
        toast.info('تم إعادة تعيين الإعدادات!');
      } else {
        toast.error(result.error || 'فشل في إعادة تعيين الإعدادات');
      }
    } catch (error) {
      toast.error('خطأ في إعادة تعيين الإعدادات');
    }
  };

  // اختبار SMS
  const testSMS = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: [phone],
          message: message
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'SMS' }]);
      
        if (result.success) {
          toast.success('تم إرسال SMS بنجاح!');
          updateStats('success', phone, 'sms');
        } else {
          toast.error(result.error || 'فشل في إرسال SMS');
          updateStats('failed', phone, 'sms');
        }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'SMS' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
      updateStats('failed', phone, 'sms');
    } finally {
      setLoading(false);
    }
  };

  // اختبار WhatsApp
  const testWhatsApp = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: [phone],
          message: message
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'WhatsApp (SMS)' }]);
      
      if (result.success) {
        toast.success('تم إرسال WhatsApp بنجاح!');
        updateStats('success');
      } else {
        toast.error(result.error || 'فشل في إرسال WhatsApp');
        updateStats('failed');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'WhatsApp (SMS)' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
      updateStats('failed');
    } finally {
      setLoading(false);
    }
  };

  // اختبار الرسائل الموحدة
  const testUnified = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beon/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: [phone],
          message: message,
          type: 'sms'
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { ...result, method: 'Unified Messages' }]);
      
      if (result.success) {
        toast.success('تم إرسال الرسالة الموحدة بنجاح!');
        updateStats('success');
      } else {
        toast.error(result.error || 'فشل في إرسال الرسالة الموحدة');
        updateStats('failed');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Unified Messages' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
      updateStats('failed');
    } finally {
      setLoading(false);
    }
  };

  // فحص الحساب
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
        toast.success('تم فحص الحساب بنجاح!');
        if (result.data) {
          setAccountInfo(result.data);
        }
      } else {
        toast.error(result.error || 'فشل في فحص الحساب');
      }
    } catch (error) {
      const errorResult = { success: false, error: 'خطأ في الاتصال', method: 'Account Check' };
      setResults(prev => [...prev, errorResult]);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  // فحص الرصيد
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

  // اختبار الإرسال الحقيقي
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

  // التشخيص العميق
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

  // تحديث الإحصائيات
  const updateStats = async (type: 'success' | 'failed', phone?: string, messageType?: string) => {
    try {
      await fetch('/api/admin/beon/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sent',
          phone: phone,
          messageType: messageType || 'sms',
          success: type === 'success'
        })
      });

      await fetch('/api/admin/beon/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          phone: phone,
          messageType: messageType || 'sms'
        })
      });

      // إعادة تحميل الإحصائيات
      loadStats();
    } catch (error) {
      console.error('خطأ في تحديث الإحصائيات:', error);
    }
  };

  // مسح النتائج
  const clearResults = () => {
    setResults([]);
    toast.info('تم مسح النتائج');
  };

  // تصدير النتائج
  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beon-test-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('تم تصدير النتائج');
  };

  // تفعيل وضع الطوارئ
  const toggleEmergencyMode = () => {
    setConfig(prev => ({
      ...prev,
      emergencyMode: !prev.emergencyMode
    }));
    toast.info(`وضع الطوارئ ${!config.emergencyMode ? 'مفعل' : 'معطل'}`);
  };

  // إعادة تحميل الإعدادات
  const reloadConfig = () => {
    const savedConfig = localStorage.getItem('beon-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
      toast.success('تم إعادة تحميل الإعدادات');
    } else {
      toast.error('لا توجد إعدادات محفوظة');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">إدارة BeOn V3 API</h1>
        <p className="text-gray-600">لوحة تحكم شاملة لإدارة ومراقبة خدمات الرسائل</p>
      </div>

      {/* تنبيه مهم */}
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>ملاحظة مهمة:</strong> BeOn V3 لا يدعم WhatsApp فعلياً. جميع طلبات WhatsApp يتم إرسالها كـ SMS.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="testing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="testing">اختبارات</TabsTrigger>
          <TabsTrigger value="settings">إعدادات</TabsTrigger>
          <TabsTrigger value="stats">إحصائيات</TabsTrigger>
          <TabsTrigger value="account">الحساب</TabsTrigger>
          <TabsTrigger value="monitoring">مراقبة</TabsTrigger>
          <TabsTrigger value="emergency">طوارئ</TabsTrigger>
        </TabsList>

        {/* تبويب الاختبارات */}
        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* إعدادات الاختبار */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  إعدادات الاختبار
                </CardTitle>
                <CardDescription>أدخل رقم الهاتف والرسالة للاختبار</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+201017799580"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">الرسالة</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="مرحباً! هذه رسالة اختبار..."
                    className="mt-1"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">{message.length}/1000 حرف</p>
                </div>
              </CardContent>
            </Card>

            {/* أزرار الاختبار */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  اختبارات سريعة
                </CardTitle>
                <CardDescription>اختبار جميع الخدمات المتاحة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    onClick={testSMS} 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    variant="default"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                    اختبار SMS
                  </Button>
                  
                  <Button 
                    onClick={testWhatsApp} 
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    variant="default"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                    اختبار WhatsApp
                  </Button>
                  
                  <Button 
                    onClick={testUnified} 
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    variant="default"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    اختبار موحد
                  </Button>
                  
                  <Button 
                    onClick={checkAccount} 
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    variant="default"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                    فحص الحساب
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* اختبارات متقدمة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                اختبارات متقدمة
              </CardTitle>
              <CardDescription>اختبارات تشخيصية متقدمة لحل المشاكل</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button 
                  onClick={checkBalance} 
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  variant="default"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  فحص الرصيد
                </Button>
                
                <Button 
                  onClick={testRealDelivery} 
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  variant="default"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  اختبار حقيقي
                </Button>
                
                <Button 
                  onClick={deepDiagnosis} 
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  variant="default"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  تشخيص عميق
                </Button>
                
                <Button 
                  onClick={clearResults} 
                  disabled={loading}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  variant="default"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  مسح النتائج
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* نتائج الاختبار */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    نتائج الاختبار
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      onClick={exportResults} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      تصدير
                    </Button>
                    <Button 
                      onClick={clearResults} 
                      className="bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      مسح
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "نجح" : "فشل"}
                          </Badge>
                          <span className="font-medium">{result.method}</span>
                        </div>
                        {result.timestamp && (
                          <span className="text-sm text-gray-500">
                            {new Date(result.timestamp).toLocaleString('ar-EG')}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm mb-2">
                        {result.success ? result.message : result.error}
                      </p>
                      
                      {result.code && (
                        <Badge variant="outline" className="mb-2">
                          Code: {result.code}
                        </Badge>
                      )}
                      
                      {result.retryAfter && (
                        <Badge variant="outline" className="mb-2">
                          Retry After: {result.retryAfter}s
                        </Badge>
                      )}
                      
                      {result.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium text-blue-600">
                            تفاصيل إضافية
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* تبويب الإعدادات */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    إعدادات BeOn V3
                  </CardTitle>
                  <CardDescription>تكوين وإدارة إعدادات API</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={saveConfig} 
                    className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    حفظ
                  </Button>
                  <Button 
                    onClick={reloadConfig} 
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    إعادة تحميل
                  </Button>
                  <Button 
                    onClick={resetConfig} 
                    className="bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    إعادة تعيين
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* إعدادات أساسية */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">إعدادات أساسية</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Base URL</label>
                    <Input
                      value={config.baseUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Token</label>
                    <Input
                      value={config.token}
                      onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
                      type="password"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Sender Name</label>
                    <Input
                      value={config.sender}
                      onChange={(e) => setConfig(prev => ({ ...prev, sender: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Language</label>
                    <select
                      value={config.language}
                      onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full p-2 border rounded-md mt-1"
                      title="اختر اللغة"
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                {/* إعدادات متقدمة */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">إعدادات متقدمة</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Max Retries</label>
                    <Input
                      type="number"
                      value={config.maxRetries}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Timeout (ms)</label>
                    <Input
                      type="number"
                      value={config.timeout}
                      onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Rate Limit (per minute)</label>
                    <Input
                      type="number"
                      value={config.rateLimit}
                      onChange={(e) => setConfig(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Log Level</label>
                    <select
                      value={config.logLevel}
                      onChange={(e) => setConfig(prev => ({ ...prev, logLevel: e.target.value }))}
                      className="w-full p-2 border rounded-md mt-1"
                      title="اختر مستوى السجل"
                    >
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* إعدادات الطوارئ */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">إعدادات الطوارئ</h3>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.emergencyMode}
                      onChange={(e) => setConfig(prev => ({ ...prev, emergencyMode: e.target.checked }))}
                      className="rounded"
                    />
                    <span>وضع الطوارئ</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.autoRetry}
                      onChange={(e) => setConfig(prev => ({ ...prev, autoRetry: e.target.checked }))}
                      className="rounded"
                    />
                    <span>إعادة المحاولة التلقائية</span>
                  </label>
                </div>
                
                <div>
                  <label className="text-sm font-medium">مزود النسخ الاحتياطي</label>
                  <select
                    value={config.backupProvider}
                    onChange={(e) => setConfig(prev => ({ ...prev, backupProvider: e.target.value }))}
                    className="w-full p-2 border rounded-md mt-1"
                    title="اختر مزود النسخ الاحتياطي"
                  >
                    <option value="none">لا يوجد</option>
                    <option value="twilio">Twilio</option>
                    <option value="aws-sns">AWS SNS</option>
                    <option value="firebase">Firebase</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الإحصائيات */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">إجمالي المرسل</p>
                    <p className="text-2xl font-bold">{stats.totalSent}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Send className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">نجح</p>
                    <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">فشل</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">معدل النجاح</p>
                    <p className="text-2xl font-bold">
                      {stats.totalSent > 0 ? Math.round((stats.successful / stats.totalSent) * 100) : 0}%
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.todaySent}</p>
                <p className="text-sm text-gray-600">رسالة مرسلة اليوم</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  هذا الأسبوع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.thisWeekSent}</p>
                <p className="text-sm text-gray-600">رسالة مرسلة هذا الأسبوع</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  هذا الشهر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.thisMonthSent}</p>
                <p className="text-sm text-gray-600">رسالة مرسلة هذا الشهر</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب الحساب */}
        <TabsContent value="account" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  معلومات الحساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">الحالة:</span>
                  <Badge variant={accountInfo.status === 'active' ? 'default' : 'destructive'}>
                    {accountInfo.status}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">الرصيد:</span>
                  <span className="font-bold">{accountInfo.balance} {accountInfo.currency}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">الخطة:</span>
                  <span>{accountInfo.plan}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">آخر نشاط:</span>
                  <span className="text-sm">{accountInfo.lastActivity || 'غير محدد'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  حدود الاستخدام
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">يومياً:</span>
                  <span>{accountInfo.limits.daily}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">شهرياً:</span>
                  <span>{accountInfo.limits.monthly}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">في الدقيقة:</span>
                  <span>{accountInfo.limits.perMinute}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                إجراءات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button 
                  onClick={checkAccount} 
                  disabled={loading} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  فحص الحساب
                </Button>
                
                <Button 
                  onClick={checkBalance} 
                  disabled={loading} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  فحص الرصيد
                </Button>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  شحن الرصيد
                </Button>
                
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Users className="h-4 w-4 mr-2" />
                  إدارة المستخدمين
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب المراقبة */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                مراقبة الأداء
              </CardTitle>
              <CardDescription>مراقبة حالة الخدمات والأداء في الوقت الفعلي</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold">SMS API</h3>
                  <p className="text-sm text-gray-600">يعمل بشكل طبيعي</p>
                </div>
                
                <div className="text-center">
                  <div className="p-4 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold">WhatsApp API</h3>
                  <p className="text-sm text-gray-600">يرسل كـ SMS</p>
                </div>
                
                <div className="text-center">
                  <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="font-semibold">Template API</h3>
                  <p className="text-sm text-gray-600">غير متاح</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                سجل النشاط
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.slice(-5).map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "نجح" : "فشل"}
                      </Badge>
                      <span className="font-medium">{result.method}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {result.timestamp ? new Date(result.timestamp).toLocaleString('ar-EG') : 'الآن'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الطوارئ */}
        <TabsContent value="emergency" className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>تحذير:</strong> هذا القسم للإعدادات الطارئة فقط. استخدمه بحذر.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                إعدادات الطوارئ
              </CardTitle>
              <CardDescription>إعدادات خاصة بالحالات الطارئة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">وضع الطوارئ</h3>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">تفعيل وضع الطوارئ</h4>
                      <p className="text-sm text-gray-600">إيقاف جميع الخدمات مؤقتاً</p>
                    </div>
                    <Button 
                      onClick={toggleEmergencyMode}
                      className={config.emergencyMode 
                        ? "bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200" 
                        : "bg-green-600 hover:bg-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                      }
                    >
                      {config.emergencyMode ? "معطل" : "مفعل"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">مزود النسخ الاحتياطي</h4>
                      <p className="text-sm text-gray-600">التبديل التلقائي عند الفشل</p>
                    </div>
                    <Badge variant="outline">{config.backupProvider}</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">إجراءات سريعة</h3>
                  
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    إعادة تشغيل الخدمات
                  </Button>
                  
                  <Button 
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    مسح ذاكرة التخزين المؤقت
                  </Button>
                  
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    تصدير سجل الأخطاء
                  </Button>
                  
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    إعادة تعيين كاملة
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
