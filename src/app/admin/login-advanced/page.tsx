'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, Loader2, Shield, Eye, EyeOff, CheckCircle, XCircle, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

export default function AdminLoginAdvancedPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@el7lm.com');
  const [password, setPassword] = useState('Admin123!@#');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [step, setStep] = useState('ready');

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ar-SA');
    const debugMessage = `[${timestamp}] ${message}`;
    setDebugInfo(prev => [...prev, debugMessage]);
    console.log('🔍 DEBUG:', debugMessage);
  };

  useEffect(() => {
    addDebugInfo('تم تحميل صفحة تسجيل الدخول المتقدمة');
    addDebugInfo(`Supabase: ${supabase ? '✅ متاح' : '❌ غير متاح'}`);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        addDebugInfo(`✅ مستخدم مسجل: ${session.user.email} (${session.user.id})`);
      } else {
        addDebugInfo('ℹ️ لا يوجد مستخدم مسجل');
      }
    });
  }, []);

  const testSupabaseConnection = async () => {
    setStep('testing-firebase');
    addDebugInfo('🔄 اختبار اتصال Supabase...');

    try {
      const { data, error } = await supabase.from('test').select('*').eq('id', 'connection').single();
      addDebugInfo('✅ اتصال Supabase يعمل');

      const { data: { user } } = await supabase.auth.getUser();
      addDebugInfo(`Auth Current User: ${user ? user.email : 'null'}`);

      setSuccess('Supabase متصل بنجاح');
      setStep('ready');
    } catch (error: any) {
      addDebugInfo(`❌ خطأ Supabase: ${error.message}`);
      setError(`خطأ Supabase: ${error.message}`);
      setStep('ready');
    }
  };

  const directAdminAccess = () => {
    addDebugInfo('🚀 وصول مباشر للأدمن...');
    setSuccess('جاري التوجيه...');
    setTimeout(() => {
      router.push('/dashboard/admin');
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    setStep('logging-in');

    addDebugInfo('🔄 بدء تسجيل الدخول...');
    addDebugInfo(`📧 البريد: ${email}`);

    try {
      addDebugInfo('📝 الخطوة 1: Supabase Auth');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const user = authData.user;

      addDebugInfo(`✅ تسجيل دخول ناجح! UID: ${user.id}`);
      setStep('checking-user-data');

      addDebugInfo('📝 الخطوة 2: فحص بيانات المستخدم');
      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();

      if (!userData) {
        addDebugInfo('❌ مستند المستخدم غير موجود');
        throw new Error('بيانات المستخدم غير موجودة');
      }

      addDebugInfo(`✅ بيانات المستخدم: ${userData.name} (${userData.accountType})`);

      setStep('checking-admin-permissions');

      addDebugInfo('📝 الخطوة 3: التحقق من صلاحيات الأدمن');

      let isValidAdmin = false;

      if (userData.accountType === 'admin') {
        addDebugInfo('✅ المستخدم admin في users collection');
        isValidAdmin = true;
      } else {
        addDebugInfo('ℹ️ فحص admins collection...');

        const { data: adminData } = await supabase.from('admins').select('*').eq('id', user.id).single();

        if (adminData) {
          addDebugInfo(`✅ موجود في admins: ${adminData.role} (نشط: ${adminData.isActive})`);

          if (adminData.isActive) {
            isValidAdmin = true;
          } else {
            throw new Error('حساب الأدمن غير مفعل');
          }
        } else {
          throw new Error('ليس لديك صلاحيات أدمن');
        }
      }

      if (isValidAdmin) {
        addDebugInfo('🎉 تم التحقق من صلاحيات الأدمن!');
        setSuccess('تسجيل دخول ناجح! جاري التوجيه...');
        setStep('redirecting');

        setTimeout(() => {
          addDebugInfo('🚀 توجيه للأدمن بانل');
          router.push('/dashboard/admin');
        }, 2000);
      }

    } catch (error: any) {
      addDebugInfo(`❌ خطأ: ${error.message} (${error.code || 'no-code'})`);

      let errorMessage = 'حدث خطأ في تسجيل الدخول';

      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setStep('ready');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 'ready': return <Shield className="w-5 h-5 text-blue-500" />;
      case 'testing-firebase': return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'logging-in': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'checking-user-data': return <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />;
      case 'checking-admin-permissions': return <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;
      case 'redirecting': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* صفحة تسجيل الدخول */}
        <Card className="bg-white/95 backdrop-blur-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-blue-600">
              لوحة التحكم الإدارية المتقدمة
            </CardTitle>
            <CardDescription>
              نسخة محسنة مع تشخيص شامل
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* حالة النظام */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">حالة النظام:</span>
              <div className="flex items-center gap-2">
                {getStepIcon()}
                <span className="text-sm">{step}</span>
              </div>
            </div>

            {/* رسائل التنبيه */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* نموذج تسجيل الدخول */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10 pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={testSupabaseConnection}
                >
                  اختبار Supabase
                </Button>
              </div>
            </form>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={directAdminAccess}
              >
                🚀 وصول مباشر
              </Button>

              <Button
                variant="outline"
                onClick={() => setDebugInfo([])}
              >
                🧹 مسح السجل
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* لوحة التشخيص */}
        <Card className="bg-gray-900 text-white shadow-2xl">
          <CardHeader>
            <CardTitle className="text-green-400">
              🔍 لوحة التشخيص
            </CardTitle>
            <CardDescription className="text-gray-300">
              مراقبة مباشرة للعمليات
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Textarea
              value={debugInfo.join('\n')}
              readOnly
              className="bg-gray-800 border-gray-700 text-green-400 font-mono text-xs h-96"
              placeholder="سجل الأحداث..."
            />

            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <h4 className="text-yellow-400 mb-2">معلومات النظام</h4>
              <div className="space-y-1 text-xs text-gray-300">
                <div>🔗 الحالة: {supabase ? '✅ متصل' : '❌ غير متصل'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
