'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, Loader2, Shield, Eye, EyeOff, CheckCircle, XCircle, Info } from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

export default function AdminLoginNewPage() {
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
    addDebugInfo('تم تحميل صفحة تسجيل الدخول');
    addDebugInfo(`Firebase Auth: ${auth ? '✅ متاح' : '❌ غير متاح'}`);
    addDebugInfo(`Firestore DB: ${db ? '✅ متاح' : '❌ غير متاح'}`);

    // مراقبة حالة المصادقة
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        addDebugInfo(`✅ مستخدم مسجل بالفعل: ${user.email} (UID: ${user.uid})`);
      } else {
        addDebugInfo('ℹ️ لا يوجد مستخدم مسجل حالياً');
      }
    });

    return () => unsubscribe();
  }, []);

  const testFirebaseConnection = async () => {
    setStep('testing-firebase');
    addDebugInfo('🔄 اختبار اتصال Firebase...');

    try {
      // اختبار قراءة من Firestore
      const testDoc = await getDoc(doc(db, 'test', 'connection'));
      addDebugInfo('✅ اتصال Firestore يعمل بشكل صحيح');

      // اختبار Firebase Auth
      const currentUser = auth.currentUser;
      addDebugInfo(`Auth Current User: ${currentUser ? currentUser.email : 'null'}`);

      setSuccess('Firebase متصل بنجاح');
      setStep('ready');
    } catch (error: any) {
      addDebugInfo(`❌ خطأ في اتصال Firebase: ${error.message}`);
      setError(`خطأ في Firebase: ${error.message}`);
      setStep('ready');
    }
  };

  const directAdminAccess = () => {
    addDebugInfo('🚀 محاولة الوصول المباشر للأدمن...');
    setSuccess('جاري التوجيه للأدمن بانل...');
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

    addDebugInfo('🔄 بدء عملية تسجيل الدخول...');
    addDebugInfo(`📧 البريد: ${email}`);
    addDebugInfo(`🔐 كلمة المرور: ${password.replace(/./g, '*')}`);

    try {
      // الخطوة 1: تسجيل الدخول
      addDebugInfo('📝 الخطوة 1: تسجيل الدخول إلى Firebase Auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      addDebugInfo(`✅ تسجيل دخول ناجح! UID: ${user.uid}`);
      addDebugInfo(`📧 البريد: ${user.email}`);
      addDebugInfo(`✉️ البريد مؤكد: ${user.emailVerified}`);

      setStep('checking-user-data');

      // الخطوة 2: فحص بيانات المستخدم
      addDebugInfo('📝 الخطوة 2: فحص بيانات المستخدم في Firestore');
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        addDebugInfo('❌ مستند المستخدم غير موجود في users collection');
        throw new Error('لم يتم العثور على بيانات المستخدم');
      }

      const userData = userDoc.data();
      addDebugInfo(`✅ بيانات المستخدم موجودة`);
      addDebugInfo(`   - الاسم: ${userData.name}`);
      addDebugInfo(`   - نوع الحساب: ${userData.accountType}`);
      addDebugInfo(`   - حالة التفعيل: ${userData.isActive}`);

      setStep('checking-admin-permissions');

      // الخطوة 3: التحقق من صلاحيات الأدمن
      addDebugInfo('📝 الخطوة 3: التحقق من صلاحيات الأدمن');

      let isValidAdmin = false;

      if (userData.accountType === 'admin') {
        addDebugInfo('✅ المستخدم مصنف كـ admin في users collection');
        isValidAdmin = true;
      } else {
        addDebugInfo('ℹ️ المستخدم ليس admin في users، فحص admins collection...');

        const adminDocRef = doc(db, 'admins', user.uid);
        const adminDoc = await getDoc(adminDocRef);

        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          addDebugInfo(`✅ المستخدم موجود في admins collection`);
          addDebugInfo(`   - الدور: ${adminData.role}`);
          addDebugInfo(`   - نشط: ${adminData.isActive}`);
          addDebugInfo(`   - الصلاحيات: ${adminData.permissions?.length || 0} صلاحية`);

          if (adminData.isActive) {
            isValidAdmin = true;
          } else {
            addDebugInfo('❌ حساب الأدمن غير مفعل');
            throw new Error('حسابك غير مفعل. يرجى التواصل مع الإدارة');
          }
        } else {
          addDebugInfo('❌ المستخدم غير موجود في admins collection');
          throw new Error('ليس لديك صلاحيات الدخول لهذه اللوحة');
        }
      }

      if (isValidAdmin) {
        addDebugInfo('🎉 تم التحقق من صلاحيات الأدمن بنجاح!');
        setSuccess('تسجيل دخول ناجح! جاري التوجيه...');
        setStep('redirecting');

        // تسجيل نشاط تسجيل الدخول
        addDebugInfo('📝 تسجيل نشاط تسجيل الدخول...');

        setTimeout(() => {
          addDebugInfo('🚀 توجيه إلى لوحة الإدارة');
          router.push('/dashboard/admin');
        }, 2000);
      }

    } catch (error: any) {
      addDebugInfo(`❌ خطأ في تسجيل الدخول: ${error.message}`);
      addDebugInfo(`   - كود الخطأ: ${error.code || 'غير محدد'}`);

      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'البريد الإلكتروني غير مسجل';
        addDebugInfo('💡 المستخدم غير موجود في Firebase Auth');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'كلمة المرور غير صحيحة أو بيانات الدخول غير صالحة';
        addDebugInfo('💡 كلمة المرور خاطئة أو بيانات الدخول غير صحيحة');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'البريد الإلكتروني غير صالح';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة لاحقاً';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setStep('ready');
    } finally {
      setLoading(false);
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
    addDebugInfo('🧹 تم مسح معلومات التشخيص');
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

  const getStepText = () => {
    switch (step) {
      case 'ready': return 'جاهز لتسجيل الدخول';
      case 'testing-firebase': return 'اختبار اتصال Firebase...';
      case 'logging-in': return 'جاري تسجيل الدخول...';
      case 'checking-user-data': return 'فحص بيانات المستخدم...';
      case 'checking-admin-permissions': return 'التحقق من صلاحيات الأدمن...';
      case 'redirecting': return 'جاري التوجيه للوحة الإدارة...';
      default: return 'حالة غير معروفة';
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
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              لوحة التحكم الإدارية المتقدمة
            </CardTitle>
            <CardDescription className="text-gray-600">
              نسخة محسنة مع نظام تشخيص شامل
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* حالة النظام */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">حالة النظام:</span>
              <div className="flex items-center gap-2">
                {getStepIcon()}
                <span className="text-sm">{getStepText()}</span>
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
                    placeholder="admin@el7lm.com"
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
                    placeholder="Admin123!@#"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10 pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={testFirebaseConnection}
                  disabled={loading}
                >
                  اختبار Firebase
                </Button>
              </div>
            </form>

            {/* أزرار إضافية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={directAdminAccess}
                className="w-full"
              >
                🚀 وصول مباشر للأدمن
              </Button>

              <Button
                variant="outline"
                onClick={clearDebugInfo}
                className="w-full"
              >
                🧹 مسح التشخيص
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* لوحة التشخيص */}
        <Card className="bg-gray-900 text-white shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-green-400">
              🔍 لوحة التشخيص المباشر
            </CardTitle>
            <CardDescription className="text-gray-300">
              مراقبة مباشرة لعملية تسجيل الدخول
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">سجل الأحداث:</span>
                <span className="text-xs text-gray-500">{debugInfo.length} حدث</span>
              </div>

              <Textarea
                value={debugInfo.join('\n')}
                readOnly
                className="bg-gray-800 border-gray-700 text-green-400 font-mono text-xs h-96 resize-none"
                placeholder="سيتم عرض معلومات التشخيص هنا..."
              />
            </div>

            {/* معلومات النظام */}
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-400 mb-2">ℹ️ معلومات النظام</h4>
              <div className="space-y-1 text-xs text-gray-300">
                <div>🌐 العنوان: http://localhost:3000/admin/login-new</div>
                <div>🔥 Firebase: {auth ? '✅ متصل' : '❌ غير متصل'}</div>
                <div>💾 Firestore: {db ? '✅ متصل' : '❌ غير متصل'}</div>
                <div>📅 الوقت: {new Date().toLocaleString('ar-SA')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
