'use client';

import EmailOTPVerification from '@/components/shared/EmailOTPVerification';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/config';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Settings,
  Shield,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [securityInfo, setSecurityInfo] = useState<any>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = async () => {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ipAddress: 'Loading...',
      };

      setSecurityInfo(deviceInfo);
    } catch (loadError) {
      console.error('Error loading security info:', loadError);
    }
  };

  const logSecurityEvent = async (event: string, details: any = {}) => {
    try {
      const eventData = {
        id: crypto.randomUUID(),
        event,
        details: {
          ...details,
          userAgent: navigator.userAgent || 'Unknown',
          ipAddress: securityInfo?.ipAddress || 'Unknown',
          location: securityInfo?.timezone || 'Unknown',
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      };

      await supabase.from('security_logs').insert(eventData);
    } catch (logError) {
      console.error('Error logging security event:', logError);
    }
  };

  const buildSyncedUserPayload = (payload: {
    id: string;
    accountType: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean | null;
    employeeId?: string | null;
    employeeRole?: string | null;
    role?: string | null;
    roleId?: string | null;
    permissions?: string[] | null;
  }) => ({
    id: payload.id,
    accountType: payload.accountType,
    name: payload.name || null,
    email: payload.email || null,
    phone: payload.phone || null,
    isActive: payload.isActive ?? true,
    employeeId: payload.employeeId || null,
    employeeRole: payload.employeeRole || null,
    role: payload.role || null,
    roleId: payload.roleId || null,
    permissions: payload.permissions || null,
    updated_at: new Date().toISOString(),
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await logSecurityEvent('login_attempt', { email, timestamp: new Date().toISOString() });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      const user = authData.user;
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let userDataFinal: any = userData;
      let isEmployee = false;

      if (!userDataFinal) {
        try {
          const { data: employeeByUid } = await supabase
            .from('employees')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          let employeeData: any = null;
          let employeeId: string | null = null;

          if (employeeByUid) {
            employeeData = employeeByUid;
            employeeId = employeeByUid.id;
          } else {
            const { data: employeesByAuthId } = await supabase
              .from('employees')
              .select('*')
              .eq('authUserId', user.id);

            if (employeesByAuthId && employeesByAuthId.length > 0) {
              employeeData = employeesByAuthId[0];
              employeeId = employeesByAuthId[0].id;
            }
          }

          if (employeeData && employeeId) {
            isEmployee = true;

            let rolePermissions: string[] = [];

            if (employeeData.roleId) {
              try {
                const { data: roleData } = await supabase
                  .from('roles')
                  .select('*')
                  .eq('id', employeeData.roleId)
                  .maybeSingle();

                if (roleData) {
                  rolePermissions = roleData.permissions || [];
                }
              } catch (roleError) {
                console.warn('Error fetching role permissions:', roleError);
              }
            }

            userDataFinal = {
              accountType: 'admin',
              name: employeeData.name,
              email: employeeData.email || user.email,
              phone: employeeData.phone,
              isActive: employeeData.isActive !== false,
              employeeId,
              employeeRole: employeeData.roleId || employeeData.role,
              role: employeeData.roleId || employeeData.role,
              roleId: employeeData.roleId,
              permissions: rolePermissions,
              ...employeeData,
            };

            try {
              await supabase.from('users').upsert(
                buildSyncedUserPayload({
                  id: user.id,
                  accountType: 'admin',
                  name: employeeData.name,
                  email: employeeData.email || user.email,
                  phone: employeeData.phone,
                  isActive: employeeData.isActive !== false,
                  employeeId,
                  employeeRole: employeeData.roleId || employeeData.role,
                  role: employeeData.roleId || employeeData.role,
                  roleId: employeeData.roleId,
                  permissions: rolePermissions,
                })
              );
            } catch (syncError) {
              console.warn('Error syncing employee data to users collection:', syncError);
            }
          }
        } catch (employeeError) {
          console.warn('Error searching employees collection:', employeeError);
        }
      }

      if (!userDataFinal) {
        try {
          const { data: adminData } = await supabase
            .from('admins')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (adminData) {
            userDataFinal = {
              accountType: 'admin',
              name: adminData.name || adminData.full_name || 'مدير النظام',
              email: adminData.email || user.email,
              phone: adminData.phone || '',
              isActive: adminData.isActive !== false,
              ...adminData,
            };

            try {
              await supabase.from('users').upsert(
                buildSyncedUserPayload({
                  id: user.id,
                  accountType: 'admin',
                  name: adminData.name || adminData.full_name || 'مدير النظام',
                  email: adminData.email || user.email,
                  phone: adminData.phone || '',
                  isActive: adminData.isActive !== false,
                  role: adminData.role || 'admin',
                  permissions: adminData.permissions || null,
                })
              );
            } catch (syncError) {
              console.warn('Error syncing admin data to users collection:', syncError);
            }
          }
        } catch (adminError) {
          console.warn('Error searching admins collection:', adminError);
        }
      }

      if (!userDataFinal) {
        throw new Error('User data not found in database');
      }

      if (userDataFinal.accountType !== 'admin' && !isEmployee) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!adminData) {
          await logSecurityEvent('unauthorized_access_attempt', {
            email,
            userRole: userDataFinal.accountType,
            timestamp: new Date().toISOString(),
          });
          throw new Error('You do not have admin permissions to access this panel');
        }

        if (!adminData.isActive) {
          await logSecurityEvent('inactive_admin_login_attempt', {
            email,
            timestamp: new Date().toISOString(),
          });
          throw new Error('Your admin account is deactivated. Please contact administration');
        }
      }

      if (isEmployee && userDataFinal.isActive === false) {
        await logSecurityEvent('inactive_employee_login_attempt', {
          email,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Your employee account is deactivated. Please contact administration');
      }

      const loginData = {
        lastLogin: new Date().toISOString(),
        lastLoginIP: securityInfo?.ipAddress || 'Unknown',
        lastLoginDevice: securityInfo?.userAgent || 'Unknown',
        lastLoginLocation: securityInfo?.timezone || 'Unknown',
        loginCount: (userDataFinal.loginCount || 0) + 1,
      };

      await supabase.from('users').update(loginData).eq('id', user.id);

      await logSecurityEvent('admin_login_success', {
        email,
        timestamp: new Date().toISOString(),
        sessionInfo: loginData,
      });

      try {
        if (rememberMe) {
          localStorage.setItem('adminRememberMe', 'true');
          localStorage.setItem('adminEmail', email);
        } else {
          localStorage.removeItem('adminRememberMe');
          localStorage.removeItem('adminEmail');
        }
      } catch (storageError) {
        console.error('Error saving remember me preference:', storageError);
      }

      setSuccess('تم تسجيل الدخول بنجاح، جاري تحويلك إلى لوحة التحكم...');

      try {
        sessionStorage.setItem('adminLoginSuccess', 'true');
        sessionStorage.setItem('adminLoginTime', Date.now().toString());
      } catch (sessionError) {
        console.warn('Could not set session storage:', sessionError);
      }

      setTimeout(() => {
        window.location.href = '/dashboard/admin';
      }, 3000);
    } catch (loginError: any) {
      console.error('Login error:', loginError);

      await logSecurityEvent('admin_login_failed', {
        email,
        error: loginError.message,
        timestamp: new Date().toISOString(),
      });

      let errorMessage = 'An error occurred during login';

      if (
        loginError.message?.includes('Failed to fetch') ||
        loginError.name === 'AuthRetryableFetchError'
      ) {
        errorMessage =
          'خطأ في الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت والتحقق من إعدادات Supabase.';
      } else if (loginError.message?.includes('Invalid login credentials')) {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (loginError.message?.includes('Email not confirmed')) {
        errorMessage = 'لم يتم تأكيد البريد الإلكتروني بعد';
      } else if (loginError.message?.includes('Too many requests')) {
        errorMessage = 'عدد المحاولات كبير جدًا. حاول مرة أخرى لاحقًا';
      } else if (loginError.message) {
        errorMessage = loginError.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('adminRememberMe');
      const savedEmail = localStorage.getItem('adminEmail');

      if (remembered === 'true' && savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (storageError) {
      console.error('Error loading remembered email:', storageError);
      localStorage.removeItem('adminRememberMe');
      localStorage.removeItem('adminEmail');
    }
  }, []);

  const handleAdminEmailVerification = async (otp: string) => {
    console.log('تم التحقق من OTP للأدمن:', otp);
    setShowEmailVerification(false);
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-slate-900">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[#eceff8] to-transparent" />
          <div className="absolute -top-16 right-[-60px] h-56 w-56 rounded-full bg-[#dfe7ff] opacity-70 blur-3xl" />
          <div className="absolute left-[-40px] top-1/3 h-60 w-60 rounded-full bg-[#f3d9e6] opacity-60 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <section className="w-full max-w-[340px] sm:max-w-[360px]">
            <div className="mb-4 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              <Shield className="h-4 w-4 text-indigo-600" />
              بوابة الإدارة الآمنة
              </div>
            </div>

            <Card className="w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
              <CardHeader className="space-y-3 px-4 pb-0 pt-4 text-center sm:px-5 sm:pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-700 shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                    <Shield className="ml-1 h-3 w-3 text-indigo-600" />
                    آمن
                  </Badge>
                </div>

                <div className="space-y-2 text-right">
                  <CardTitle className="text-xl font-black text-slate-900 sm:text-2xl">
                    تسجيل دخول الإدارة
                  </CardTitle>
                  <CardDescription className="text-xs leading-6 text-slate-500 sm:text-sm">
                    أدخل بياناتك للوصول إلى لوحة التحكم.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                {error && (
                  <Alert className="rounded-2xl border-red-200 bg-red-50 text-red-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-start justify-between gap-3">
                      <span className="text-xs leading-6 sm:text-sm">{error}</span>
                      <button
                        type="button"
                        onClick={() => setError('')}
                        className="rounded-lg p-1 text-red-400 transition hover:bg-red-100 hover:text-red-600"
                        aria-label="إغلاق رسالة الخطأ"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-900">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-start justify-between gap-3">
                      <span className="text-xs leading-6 sm:text-sm">{success}</span>
                      <button
                        type="button"
                        onClick={() => setSuccess('')}
                        className="rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-100 hover:text-emerald-600"
                        aria-label="إغلاق رسالة النجاح"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-800 sm:text-sm">
                      البريد الإلكتروني الإداري
                    </Label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@el7lm.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        dir="ltr"
                        className="h-10 rounded-2xl border-slate-200 bg-slate-50 pr-11 text-sm shadow-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold text-slate-800 sm:text-sm">
                      كلمة المرور
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="أدخل كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        dir="ltr"
                        className="h-10 rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-11 text-sm shadow-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-xl p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                      />
                      <Label htmlFor="remember" className="cursor-pointer text-xs font-medium text-slate-700 sm:text-sm">
                        تذكرني لاحقًا
                      </Label>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">SSL</span>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full rounded-2xl bg-slate-900 text-sm font-black text-white shadow-lg transition hover:bg-slate-800"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      <>
                        <LogIn className="ml-2 h-4 w-4" />
                        تسجيل الدخول
                      </>
                    )}
                  </Button>
                </form>

                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 sm:text-sm">
                    <div className="mb-1 flex items-center gap-2 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      إشعار أمني
                    </div>
                    هذه الصفحة مخصصة للإدارة فقط، ويتم تسجيل ومراجعة محاولات الدخول للحفاظ على
                    أمان النظام.
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-2xl border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50 sm:text-sm"
                      onClick={() => router.push('/admin/login-advanced')}
                    >
                      <Settings className="ml-2 h-4 w-4" />
                      دخول متقدم
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-2xl border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50 sm:text-sm"
                      onClick={() => router.push('/')}
                    >
                      <Globe className="ml-2 h-4 w-4" />
                      الموقع الرئيسي
                    </Button>
                  </div>

                  <p className="text-center text-xs leading-6 text-slate-500 sm:text-sm">
                    للمستخدمين العاديين، استخدم{' '}
                    <a href="/auth/login" className="font-bold text-slate-900 underline-offset-4 hover:underline">
                      صفحة تسجيل الدخول العادية
                    </a>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <EmailOTPVerification
        email="admin@el7lm.com"
        name="المشرف"
        isOpen={showEmailVerification}
        onVerificationSuccess={handleAdminEmailVerification}
        onVerificationFailed={(otpError) => console.error('خطأ في التحقق:', otpError)}
        onClose={() => setShowEmailVerification(false)}
        title="التحقق من هوية المشرف"
        subtitle="تم إرسال رمز التحقق إلى بريد المشرف"
        otpExpirySeconds={30}
      />
    </div>
  );
}
