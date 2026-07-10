'use client';

import React, { useEffect } from 'react';
import SubscriptionStatusPage from '@/components/shared/SubscriptionStatusPage';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { Shield, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

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
  const { t, isRTL } = useTranslation();
  // التحقق من نوع الحساب - السماح لجميع أنواع الحسابات المدعومة
  const { isAuthorized, isCheckingAuth, user, userData, accountType } = useAccountTypeAuth({
    allowedTypes: ['academy', 'trainer', 'agent', 'club', 'marketer', 'admin', 'player', 'parent'],
    redirectTo: '/dashboard'
  });

  // Add Geidea real-time listener
  useEffect(() => {
    const handleGeideaMessage = (event: MessageEvent) => {
      if (event.origin === 'https://geidea.net' && event.data === 'payment_success') {
        // Handle successful payment, e.g., refresh subscription status
        console.log('Geidea payment successful! Refreshing subscription status...');
        // You might want to trigger a re-fetch of subscription data here
        // For example, if you have a state management solution or a refetch function
      }
    };

    window.addEventListener('message', handleGeideaMessage);

    return () => {
      window.removeEventListener('message', handleGeideaMessage);
    };
  }, []);

  // شاشة التحميل أثناء التحقق من الصلاحيات
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600 text-lg">{t('sharedPages.verifyingAuth')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('sharedPages.waitPlease')}</p>
        </div>
      </div>
    );
  }

  // التحقق الإضافي من أن المستخدم مسجل دخوله
  if (!user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('sharedPages.unauthorized')}</h2>
          <p className="text-gray-600 mb-4">{t('sharedPages.loginRequiredSubscription')}</p>
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t('sharedPages.login')}
          </a>
        </div>
      </div>
    );
  }

  // التحقق من أن نوع الحساب صحيح
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <Shield className="w-16 h-16 mx-auto mb-4 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('sharedPages.unauthorized')}</h2>
          <p className="text-gray-600 mb-2">
            {t('sharedPages.currentAccountType').replace('{{type}}', accountType || t('sharedPages.unknown'))}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {t('sharedPages.cannotAccessSubscription')}
          </p>
          <p className="text-gray-400 text-xs">
            {t('sharedPages.redirectingToDashboard')}
          </p>
        </div>
      </div>
    );
  }

  // التحقق النهائي من أن نوع الحساب موجود وصحيح
  const validAccountTypes = ['academy', 'trainer', 'agent', 'club', 'marketer', 'admin', 'player', 'parent'];
  if (!accountType || !validAccountTypes.includes(accountType)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('sharedPages.accountTypeErrorTitle')}</h2>
          <p className="text-gray-600 mb-4">
            {t('sharedPages.accountTypeErrorDesc')}
          </p>
        </div>
      </div>
    );
  }



  // كل شيء صحيح - عرض صفحة حالة الاشتراك
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('subStatus.manageSubscription')}</h1>
          <p className="text-gray-600 font-medium">{t('sharedPages.subscriptionDesc').replace('{{type}}', accountType)}</p>
        </div>
      </div>
      <SubscriptionStatusPage accountType={accountType} />
    </div>
  );
}








