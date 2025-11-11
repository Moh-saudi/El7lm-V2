'use client';

import WorkingMessageCenter from '@/components/messaging/WorkingMessageCenter';
import ClientOnlyToaster from '@/components/ClientOnlyToaster';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { Shield, AlertCircle } from 'lucide-react';

/**
 * صفحة الرسائل المشتركة لجميع أنواع الحسابات
 * 
 * ⚠️ ملاحظة مهمة: الرسائل منفصلة تماماً لكل حساب!
 * 
 * كيف يعمل النظام:
 * 1. WorkingMessageCenter يستخدم useAuth() للحصول على user.uid
 * 2. الرسائل يتم جلبها بناءً على user.uid للمستخدم الحالي فقط
 * 3. كل حساب (academy, trainer, agent, etc.) له uid مختلف
 * 4. لذلك الرسائل منفصلة تماماً - كل حساب يرى فقط رسائله الخاصة
 * 
 * 🔒 الحماية المطبقة:
 * - التحقق من تسجيل الدخول
 * - التحقق من نوع الحساب (يجب أن يكون من الأنواع المسموحة)
 * - التوجيه التلقائي للوحة التحكم المناسبة عند عدم وجود صلاحيات
 * 
 * تستخدمها: academy, trainer, agent, club, marketer, admin, player
 */
export default function SharedMessagesPage() {
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

  // التحقق الإضافي من أن المستخدم مسجل دخوله (حماية إضافية)
  if (!user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-4">يجب تسجيل الدخول للوصول إلى صفحة الرسائل</p>
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

  // التحقق من أن نوع الحساب صحيح (حماية إضافية)
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
            لا يمكنك الوصول إلى صفحة الرسائل بهذا النوع من الحساب
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

  // كل شيء صحيح - عرض صفحة الرسائل
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientOnlyToaster position="top-center" />
      <div className="h-full">
        <WorkingMessageCenter />
      </div>
    </div>
  );
}

