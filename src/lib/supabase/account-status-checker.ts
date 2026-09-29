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
    const accountTypes = ['users', 'admins', 'clubs', 'academies', 'trainers', 'agents', 'players', 'marketers'];
    let userData: Record<string, unknown> | null = null;

    const results = await Promise.allSettled(
      accountTypes.map(t =>
        supabase.from(t).select('isDeleted,isActive,suspendReason').or(`id.eq.${userId},uid.eq.${userId}`).limit(1)
      )
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
