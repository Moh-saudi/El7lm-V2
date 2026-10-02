import { supabase } from '@/lib/supabase/config';

export interface AccountStatus {
  isActive: boolean;
  canLogin: boolean;
  message: string;
  messageType: 'success' | 'warning' | 'error';
  redirectTo?: string;
}

type AccountStatusRow = {
  found?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  suspension_reason?: string | null;
};

export async function checkAccountStatus(_userId: string): Promise<AccountStatus> {
  try {
    const { data, error } = await supabase.rpc('get_current_account_status');
    if (error) throw error;

    const row = (data?.[0] || null) as AccountStatusRow | null;

    if (!row?.found) {
      return {
        isActive: false,
        canLogin: false,
        message: 'حسابك غير موجود في النظام. يرجى التواصل مع الإدارة.',
        messageType: 'error',
      };
    }

    if (row.is_deleted === true) {
      return {
        isActive: false,
        canLogin: false,
        message: 'تم حذف حسابك — يمكنك إنشاء حساب جديد.',
        messageType: 'error',
      };
    }

    if (row.is_active === false) {
      const suspendReason = String(row.suspension_reason || 'لم يتم تحديد السبب');
      return {
        isActive: false,
        canLogin: false,
        message: `تم إيقاف حسابك مؤقتاً.\n\nالسبب: ${suspendReason}\n\nيرجى التواصل مع الإدارة لإعادة تفعيل الحساب.`,
        messageType: 'error',
      };
    }

    return {
      isActive: true,
      canLogin: true,
      message: 'مرحباً بك! تم تسجيل الدخول بنجاح.',
      messageType: 'success',
    };
  } catch (error) {
    console.error('Error checking account status:', error);
    return {
      isActive: false,
      canLogin: false,
      message: 'حدث خطأ أثناء التحقق من حالة الحساب. يرجى المحاولة لاحقاً.',
      messageType: 'error',
    };
  }
}
