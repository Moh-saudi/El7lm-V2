'use client';

import SubscriptionStatusPage from '@/components/shared/SubscriptionStatusPage';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { Shield, AlertCircle } from 'lucide-react';

/**
 * صفحة حالة الاشتراك المشتركة لجميع أنواع الحسابات
 * 
 * 🔒 الحماية المطبقة:
 * - التحقق من تسجيل الدخول
 * - التحقق من نوع الحساب (يجب أن يكون من الأنواع المسموحة)
 * - التوجيه التلقائي للوحة التحكم المناسبة عند عدم وجود صلاحيات
 * 
 * تستخدمها: academy, trainer, agent, club, marketer, admin, player, parent
 */
export default function SharedSubscriptionStatusPage() {
  // التحقق من نوع الحساب - السماح لجميع أنواع الحسابات المدعومة
  const { isAuthorized, isCheckingAuth, user, userData, accountType } = useAccountTypeAuth({
    allowedTypes: ['academy', 'trainer', 'agent', 'club', 'marketer', 'admin', 'player', 'parent'],
    redirectTo: '/dashboard'
  });

  // شاشة التحميل أثناء التحقق من الصلاحيات
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600 text-lg">جاري التحقق من صلاحيات الوصول...</p>
          <p className="text-gray-400 text-sm mt-2">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  // التحقق الإضافي من أن المستخدم مسجل دخوله
  if (!user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-4">يجب تسجيل الدخول للوصول إلى صفحة حالة الاشتراك</p>
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  // التحقق من أن نوع الحساب صحيح
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <Shield className="w-16 h-16 mx-auto mb-4 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-2">
            نوع حسابك الحالي: <span className="font-bold">{accountType || 'غير محدد'}</span>
          </p>
          <p className="text-gray-500 text-sm mb-4">
            لا يمكنك الوصول إلى صفحة حالة الاشتراك بهذا النوع من الحساب
          </p>
          <p className="text-gray-400 text-xs">
            سيتم توجيهك تلقائياً إلى لوحة التحكم المناسبة...
          </p>
        </div>
      </div>
    );
  }

  // التحقق النهائي من أن نوع الحساب موجود وصحيح
  const validAccountTypes = ['academy', 'trainer', 'agent', 'club', 'marketer', 'admin', 'player', 'parent'];
  if (!accountType || !validAccountTypes.includes(accountType)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">خطأ في نوع الحساب</h2>
          <p className="text-gray-600 mb-4">
            نوع الحساب غير صحيح أو غير محدد. يرجى التواصل مع الدعم الفني.
          </p>
        </div>
      </div>
    );
  }

  // كل شيء صحيح - عرض صفحة حالة الاشتراك
  return <SubscriptionStatusPage accountType={accountType} />;
}





