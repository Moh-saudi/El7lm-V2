'use client';

import React from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * خيارات Hook التحقق من نوع الحساب
 */
interface UseAccountTypeAuthOptions {
  /** أنواع الحسابات المسموح لها بالوصول (مثل: ['admin', 'player']) */
  allowedTypes: string[];
  /** الصفحة للتوجيه عند عدم وجود صلاحيات (افتراضي: '/') */
  redirectTo?: string;
}

/** أنواع الحسابات المدعومة في النظام */
const allowedAccountTypes = ['player', 'club', 'agent', 'academy', 'trainer', 'admin', 'marketer', 'parent'];

/**
 * Hook للتحقق من نوع الحساب والصلاحيات
 * 
 * يستخدم هذا Hook للتحقق من أن المستخدم لديه نوع حساب مسموح بالوصول إلى صفحة معينة.
 * إذا لم يكن المستخدم مسجل الدخول، يتم توجيهه لصفحة تسجيل الدخول.
 * إذا كان نوع الحساب غير مسموح، يتم توجيهه للوحة التحكم المناسبة.
 * 
 * @param {UseAccountTypeAuthOptions} options - خيارات التحقق
 * @param {string[]} options.allowedTypes - أنواع الحسابات المسموح لها
 * @param {string} [options.redirectTo='/'] - صفحة التوجيه عند عدم وجود صلاحيات
 * 
 * @returns {Object} كائن يحتوي على:
 * @returns {boolean} isAuthorized - هل المستخدم مصرح له بالوصول
 * @returns {boolean} isCheckingAuth - هل التحقق من الصلاحيات قيد التنفيذ
 * @returns {User|null} user - بيانات المستخدم من Firebase
 * @returns {any|null} userData - بيانات المستخدم الإضافية
 * @returns {string|null} accountType - نوع الحساب الحالي
 * 
 * @example
 * ```tsx
 * const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({ 
 *   allowedTypes: ['admin'] 
 * });
 * 
 * if (isCheckingAuth) return <Loading />;
 * if (!isAuthorized) return <AccessDenied />;
 * return <AdminContent />;
 * ```
 */
export const useAccountTypeAuth = ({ allowedTypes, redirectTo = '/' }: UseAccountTypeAuthOptions) => {
  const { user, loading, userData } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // المستخدم غير مسجل الدخول - توجيه لصفحة تسجيل الدخول
        router.push('/auth/login');
        return;
      }

      if (userData) {
        const userAccountType = (userData as any).accountType;
        console.log('🔍 AccountTypeProtection - User Data:', {
          userAccountType,
          allowedTypes,
          isAllowed: userAccountType && allowedTypes.includes(userAccountType)
        });

        if (userAccountType && allowedTypes.includes(userAccountType)) {
          console.log('✅ AccountTypeProtection - Access granted');
          setIsAuthorized(true);
        } else {
          console.log('❌ AccountTypeProtection - Access denied, redirecting...');
          // نوع الحساب غير مسموح أو غير محدد - توجيه للوحة المناسبة
          const correctRoute = getDashboardRoute(userAccountType || 'player');
          console.log('🔄 Redirecting to:', correctRoute);
          router.push(correctRoute);
        }
      }

      setIsCheckingAuth(false);
    }
  }, [user, loading, userData, allowedTypes, redirectTo, router]);

  /**
   * الحصول على مسار لوحة التحكم المناسب لنوع الحساب
   * @param {string} accountType - نوع الحساب
   * @returns {string} مسار لوحة التحكم
   */
  const getDashboardRoute = (accountType: string) => {
    switch (accountType) {
      case 'admin':
        return '/dashboard/admin';
      case 'player':
        return '/dashboard/player';
      case 'club':
        return '/dashboard/club';
      case 'agent':
        return '/dashboard/agent';
      case 'academy':
        return '/dashboard/academy';
      case 'trainer':
        return '/dashboard/trainer';
      case 'marketer':
        return '/dashboard/marketer';
      default:
        return '/dashboard';
    }
  };

  return {
    isAuthorized,
    isCheckingAuth,
    user,
    userData,
    accountType: userData ? (userData as any).accountType : null
  };
};

/**
 * Props لمكون حماية نوع الحساب
 */
interface AccountTypeProtectionProps {
  /** المحتوى المراد حمايته */
  children: React.ReactNode;
  /** أنواع الحسابات المسموح لها بالوصول */
  allowedTypes: string[];
  /** الصفحة للتوجيه عند عدم وجود صلاحيات */
  redirectTo?: string;
  /** مكون التحميل المخصص (اختياري) */
  loadingComponent?: React.ReactNode;
}

/**
 * مكون حماية عام لحماية المحتوى بناءً على نوع الحساب
 * 
 * يستخدم هذا المكون للتحقق تلقائياً من صلاحيات المستخدم وإظهار المحتوى فقط
 * إذا كان المستخدم لديه نوع حساب مسموح. إذا لم يكن مسموحاً، يتم توجيهه تلقائياً.
 * 
 * @param {AccountTypeProtectionProps} props - خصائص المكون
 * 
 * @example
 * ```tsx
 * <AccountTypeProtection allowedTypes={['admin']}>
 *   <AdminPanel />
 * </AccountTypeProtection>
 * ```
 */
export const AccountTypeProtection: React.FC<AccountTypeProtectionProps> = ({
  children,
  allowedTypes,
  redirectTo = '/',
  loadingComponent
}) => {
  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({ allowedTypes, redirectTo });

  if (isCheckingAuth) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600">جاري التحقق من صلاحيات الوصول...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // سيتم التوجيه تلقائياً
  }

  return <>{children}</>;
};
