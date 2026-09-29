import { supabase } from '@/lib/supabase/config';

export interface AccountStatus {
  isActive: boolean;
  canLogin: boolean;
  message: string;
  messageType: 'success' | 'warning' | 'error';
  redirectTo?: string;
}

export async function checkAccountStatus(userId: string): Promise<AccountStatus> {
  try {
    const accountTypes = ['clubs', 'academies', 'trainers', 'agents', 'players', 'users'];
    let userData: Record<string, unknown> | null = null;

    const results = await Promise.allSettled(
      accountTypes.map(t => {
        const query = supabase.from(t).select('*');
        return t === 'users'
          ? query.eq('id', userId).limit(1)
          : query.or(`id.eq.${userId},uid.eq.${userId}`).limit(1);
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value.data?.length) {
        userData = r.value.data[0] as Record<string, unknown>;
        break;
      }
    }

    if (!userData) {
      return {
        isActive: false,
        canLogin: false,
        message: 'حسابك غير موجود في النظام. يرجى التواصل مع الإدارة.',
        messageType: 'error'
      };
    }

    if (userData.isDeleted === true) {
      return {
        isActive: false,
        canLogin: false,
        message: 'تم حذف حسابك — يمكنك إنشاء حساب جديد.',
        messageType: 'error'
      };
    }

    if (userData.isActive === false) {
      const suspendReason = String(userData.suspendReason || 'لم يتم تحديد السبب');
      return {
        isActive: false,
        canLogin: false,
        message: `تم إيقاف حسابك مؤقتاً.\n\nالسبب: ${suspendReason}\n\nيرجى التواصل مع الإدارة لإعادة تفعيل الحساب.`,
        messageType: 'error'
      };
    }

    if (userData.subscription) {
      const subscription = userData.subscription as Record<string, unknown>;
      const now = new Date();
      const expiresAt = subscription.expiresAt ? new Date(String(subscription.expiresAt)) : null;

      if (subscription.status === 'expired' || (expiresAt && expiresAt < now)) {
        return {
          isActive: true,
          canLogin: true,
          message: 'انتهت صلاحية اشتراكك. يمكنك الدخول ولكن بعض الميزات قد تكون محدودة.',
          messageType: 'warning',
          redirectTo: '/dashboard/subscription'
        };
      }

      if (subscription.status === 'cancelled') {
        return {
          isActive: true,
          canLogin: true,
          message: 'تم إلغاء اشتراكك. يمكنك الدخول ولكن بعض الميزات قد تكون محدودة.',
          messageType: 'warning',
          redirectTo: '/dashboard/subscription'
        };
      }
    }

    return {
      isActive: true,
      canLogin: true,
      message: 'مرحباً بك! تم تسجيل الدخول بنجاح.',
      messageType: 'success'
    };

  } catch (error) {
    console.error('Error checking account status:', error);
    return {
      isActive: false,
      canLogin: false,
      message: 'حدث خطأ أثناء التحقق من حالة الحساب. يرجى المحاولة لاحقاً.',
      messageType: 'error'
    };
  }
}
