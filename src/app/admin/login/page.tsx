'use client';

import EmailOTPVerification from '@/components/shared/EmailOTPVerification';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, updateDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    BarChart3,
    CheckCircle,
    Clock,
    Eye,
    EyeOff,
    Globe,
    Info,
    Loader2,
    Lock,
    LogIn,
    Mail,
    Monitor,
    Settings,
    Shield,
    Smartphone,
    TrendingUp,
    Users,
    XCircle
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
  const [systemStats, setSystemStats] = useState<any>(null);
  const [lastLogin, setLastLogin] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load system stats and security info
  useEffect(() => {
    loadSystemInfo();
    loadSecurityInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      // Simulate loading system stats
      const stats = {
        totalUsers: 1250,
        activeToday: 85,
        systemLoad: 23,
        uptime: '99.9%'
      };
      setSystemStats(stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const loadSecurityInfo = async () => {
    try {
      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ipAddress: 'Loading...' // Would normally get from IP service
      };

      setSecurityInfo(deviceInfo);
    } catch (error) {
      console.error('Error loading security info:', error);
    }
  };

  const logSecurityEvent = async (event: string, details: any = {}) => {
    try {
      // Create a more structured event document
      const eventData = {
        event,
        details: {
          ...details,
          userAgent: navigator.userAgent || 'Unknown',
          ipAddress: securityInfo?.ipAddress || 'Unknown',
          location: securityInfo?.timezone || 'Unknown'
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };

      // Generate a more reliable document ID
      const docId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Use collection reference instead of direct doc creation
      const securityLogsRef = collection(db, 'security_logs');
      await addDoc(securityLogsRef, eventData);
    } catch (error) {
      // Log error but don't block the login process
      console.error('Error logging security event:', error);
      // Continue execution without throwing
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Log login attempt
      await logSecurityEvent('login_attempt', { email, timestamp: new Date() });

      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check user document
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let userData: any = null;
      let isEmployee = false;

      if (userDoc.exists()) {
        userData = userDoc.data();
      } else {
        // إذا لم توجد في users، ابحث في employees collection
        try {
          const employeesQuery = query(
            collection(db, 'employees'),
            where('authUserId', '==', user.uid)
          );
          const employeesSnapshot = await getDocs(employeesQuery);

          if (!employeesSnapshot.empty) {
            const employeeDoc = employeesSnapshot.docs[0];
            const employeeData = employeeDoc.data();
            isEmployee = true;
            
            // إنشاء userData من بيانات الموظف
            userData = {
              accountType: 'admin', // الموظفون يستخدمون dashboard المدير
              name: employeeData.name,
              email: employeeData.email || user.email,
              phone: employeeData.phone,
              isActive: employeeData.isActive !== false,
              employeeId: employeeDoc.id,
              employeeRole: employeeData.role,
              role: employeeData.role,
              ...employeeData
            };

            // إنشاء document في users collection للموظف
            try {
              await setDoc(userDocRef, {
                ...userData,
                updated_at: new Date()
              }, { merge: true });
            } catch (syncError) {
              console.warn('Error syncing employee data to users collection:', syncError);
            }
          }
        } catch (employeeError) {
          console.warn('Error searching employees collection:', employeeError);
        }
      }

      if (!userData) {
        throw new Error('User data not found in database');
      }

      // Check admin permissions
      if (userData.accountType !== 'admin' && !isEmployee) {
        // Check admins collection as fallback
        const adminDocRef = doc(db, 'admins', user.uid);
        const adminDoc = await getDoc(adminDocRef);

        if (!adminDoc.exists()) {
          await logSecurityEvent('unauthorized_access_attempt', {
            email,
            userRole: userData.accountType,
            timestamp: new Date()
          });
          throw new Error('You do not have admin permissions to access this panel');
        }

        const adminData = adminDoc.data();
        if (!adminData.isActive) {
          await logSecurityEvent('inactive_admin_login_attempt', { email, timestamp: new Date() });
          throw new Error('Your admin account is deactivated. Please contact administration');
        }
      }

      // التحقق من حالة الموظف إذا كان موظفاً
      if (isEmployee && userData.isActive === false) {
        await logSecurityEvent('inactive_employee_login_attempt', { email, timestamp: new Date() });
        throw new Error('Your employee account is deactivated. Please contact administration');
      }

      // Update last login info
      const loginData = {
        lastLogin: new Date(),
        lastLoginIP: securityInfo?.ipAddress || 'Unknown',
        lastLoginDevice: securityInfo?.userAgent || 'Unknown',
        lastLoginLocation: securityInfo?.timezone || 'Unknown',
        loginCount: (userData.loginCount || 0) + 1
      };

      await updateDoc(userDocRef, loginData);

      // Log successful login
      await logSecurityEvent('admin_login_success', {
        email,
        timestamp: new Date(),
        sessionInfo: loginData
      });

      // Handle remember me
      try {
        if (rememberMe) {
          localStorage.setItem('adminRememberMe', 'true');
          localStorage.setItem('adminEmail', email);
        } else {
          localStorage.removeItem('adminRememberMe');
          localStorage.removeItem('adminEmail');
        }
      } catch (error) {
        console.error('Error saving remember me preference:', error);
        // Continue even if localStorage fails
      }

      setSuccess('تم تسجيل الدخول بنجاح! جاري التوجيه...');

      // Wait for AuthProvider to sync before redirecting
      // This ensures user data is loaded before navigation
      setTimeout(() => {
        // Use replace instead of push to avoid back button issues
        router.replace('/dashboard/admin');
      }, 2000); // Increased delay to allow auth state to sync

    } catch (error: any) {
      console.error('Login error:', error);

      // Log failed login
      await logSecurityEvent('admin_login_failed', {
        email,
        error: error.message,
        timestamp: new Date()
      });

      let errorMessage = 'An error occurred during login';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email address not registered';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load remembered email on component mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('adminRememberMe');
      const savedEmail = localStorage.getItem('adminEmail');

      if (remembered === 'true' && savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading remembered email:', error);
      // Clear invalid data
      localStorage.removeItem('adminRememberMe');
      localStorage.removeItem('adminEmail');
    }
  }, []);

  const getDeviceIcon = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mobile')) return <Smartphone className="w-4 h-4" />;
    if (ua.includes('tablet')) return <Smartphone className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  // دالة التحقق من البريد الإلكتروني للأدمن
  const handleAdminEmailVerification = async (otp: string) => {
    // منطق التحقق من OTP للأدمن
    console.log('تم التحقق من OTP للأدمن:', otp);
    setShowEmailVerification(false);
    // متابعة عملية تسجيل الدخول
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs - Smaller on mobile */}
        <div className="absolute top-0 -left-4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 sm:opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 sm:opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 sm:opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Grid pattern overlay - Smaller on mobile */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] sm:bg-[size:24px_24px]"></div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left Panel - System Info (Enhanced) */}
        <div className="hidden lg:flex lg:w-2/5 xl:w-1/3 flex-col justify-center p-8 lg:p-12">
          <div className="space-y-6 animate-fade-in">
            {/* Brand/Logo Section */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">لوحة التحكم الإدارية</h1>
              <p className="text-indigo-200 text-sm">نظام إدارة آمن ومتقدم</p>
            </div>

            {/* System Stats - Enhanced */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-indigo-300" />
                  <span>نظرة عامة على النظام</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-indigo-200">إجمالي المستخدمين</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">{systemStats.totalUsers.toLocaleString()}</div>
                    </div>
                    <div className="space-y-2 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-indigo-200">نشط اليوم</span>
                      </div>
                      <div className="text-2xl font-bold text-green-400">{systemStats.activeToday}</div>
                    </div>
                    <div className="space-y-2 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-indigo-200">حمل النظام</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-400">{systemStats.systemLoad}%</div>
                    </div>
                    <div className="space-y-2 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-indigo-200">وقت التشغيل</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{systemStats.uptime}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Info - Enhanced */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="w-5 h-5 text-indigo-300" />
                  <span>معلومات الأمان</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {securityInfo && (
                  <>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      {getDeviceIcon()}
                      <span className="text-sm text-indigo-100">نوع الجهاز: {navigator.platform}</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <Globe className="w-4 h-4 text-indigo-300" />
                      <span className="text-sm text-indigo-100">الموقع: {securityInfo.timezone}</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <Clock className="w-4 h-4 text-indigo-300" />
                      <span className="text-sm text-indigo-100">الوقت الحالي: {currentTime.toLocaleTimeString('ar-SA')}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Links - Enhanced */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-indigo-300" />
                  <span>وصول سريع</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-white hover:bg-white/20 transition-all"
                  onClick={() => router.push('/admin/login-advanced')}
                >
                  <Info className="w-4 h-4 ml-2" />
                  تسجيل دخول متقدم
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-white hover:bg-white/20 transition-all"
                  onClick={() => router.push('/')}
                >
                  <Globe className="w-4 h-4 ml-2" />
                  الموقع الرئيسي
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Login Form (Enhanced) */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md">
            <Card className="bg-white/95 backdrop-blur-2xl shadow-2xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden">
              {/* Gradient top border */}
              <div className="h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
              
              <CardHeader className="space-y-4 sm:space-y-6 text-center pb-6 sm:pb-8 pt-6 sm:pt-8 px-4 sm:px-6">
                {/* Icon */}
                <div className="mx-auto mb-3 sm:mb-4 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl transform transition-transform hover:scale-105">
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                </div>
                
                <div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                    لوحة التحكم الإدارية
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm sm:text-base">
                    بوابة الوصول الآمنة للإدارة
                  </CardDescription>
                </div>

                {/* Status badges - Enhanced */}
                <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50/80 px-2.5 sm:px-3 py-1 text-xs sm:text-sm">
                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                    النظام متصل
                  </Badge>
                  <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50/80 px-2.5 sm:px-3 py-1 text-xs sm:text-sm">
                    <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                    آمن SSL
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                  {error && (
                    <div className="relative overflow-hidden rounded-xl border border-red-200/80 bg-gradient-to-r from-red-50 via-red-50/95 to-red-50 shadow-lg backdrop-blur-sm animate-fade-in">
                      {/* Gradient accent border */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500"></div>
                      
                      <div className="flex items-start gap-3 p-4 sm:p-4">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-100/80 backdrop-blur-sm">
                            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm sm:text-base font-semibold text-red-900">خطأ في تسجيل الدخول</h4>
                          </div>
                          <p className="text-xs sm:text-sm text-red-800 leading-relaxed">{error}</p>
                        </div>
                        <button
                          onClick={() => setError('')}
                          className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 hover:bg-red-100/50 rounded-lg transition-colors"
                          aria-label="إغلاق"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="relative overflow-hidden rounded-xl border border-green-200/80 bg-gradient-to-r from-green-50 via-emerald-50/95 to-green-50 shadow-lg backdrop-blur-sm animate-fade-in">
                      {/* Gradient accent border */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500"></div>
                      
                      <div className="flex items-start gap-3 p-4 sm:p-4">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-green-100/80 backdrop-blur-sm">
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm sm:text-base font-semibold text-green-900">تم بنجاح!</h4>
                          </div>
                          <p className="text-xs sm:text-sm text-green-800 leading-relaxed">{success}</p>
                        </div>
                        <button
                          onClick={() => setSuccess('')}
                          className="flex-shrink-0 p-1 text-green-400 hover:text-green-600 hover:bg-green-100/50 rounded-lg transition-colors"
                          aria-label="إغلاق"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-semibold text-xs sm:text-sm">
                      البريد الإلكتروني
                    </Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@el7lm.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="pr-9 sm:pr-10 h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-xl"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-semibold text-xs sm:text-sm">
                      كلمة المرور
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="أدخل كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="pr-9 sm:pr-10 pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-xl"
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                      className="border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 h-4 w-4 sm:h-5 sm:w-5"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-xs sm:text-sm text-gray-600 cursor-pointer font-medium"
                    >
                      تذكرني في المستقبل
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span className="text-xs sm:text-sm">جاري التحقق...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">تسجيل الدخول</span>
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                  {/* Security Notice - Enhanced */}
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg sm:rounded-xl">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs sm:text-sm text-amber-900">
                        <p className="font-semibold mb-1 text-xs sm:text-sm">إشعار الأمان</p>
                        <p className="text-[10px] sm:text-xs leading-relaxed">هذه منطقة إدارية مقيدة. يتم مراقبة وتسجيل جميع محاولات تسجيل الدخول.</p>
                      </div>
                    </div>
                  </div>

                  {/* Links - Enhanced */}
                  <div className="text-center text-xs sm:text-sm text-gray-600 space-y-2 sm:space-y-3">
                    <p className="leading-relaxed text-xs sm:text-sm">
                      للمستخدمين العاديين، يرجى استخدام{' '}
                      <a href="/auth/login" className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline transition-colors break-words">
                        صفحة تسجيل الدخول العادية
                      </a>
                    </p>
                    <div className="flex justify-center items-center gap-2 sm:gap-3 pt-2 flex-wrap">
                      <a href="/admin/login-advanced" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors text-xs sm:text-sm">
                        تسجيل دخول متقدم
                      </a>
                      <span className="text-gray-400">•</span>
                      <a href="/" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors text-xs sm:text-sm">
                        الموقع الرئيسي
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 8s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>

      <EmailOTPVerification
        email="admin@el7lm.com"
        name="المشرف"
        isOpen={showEmailVerification}
        onVerificationSuccess={handleAdminEmailVerification}
        onVerificationFailed={(error) => console.error('خطأ في التحقق:', error)}
        onClose={() => setShowEmailVerification(false)}
        title="التحقق من هوية المشرف"
        subtitle="تم إرسال رمز التحقق إلى بريد المشرف"
        otpExpirySeconds={30}
      />
    </div>
  );
}
