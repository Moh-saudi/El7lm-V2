import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export interface AccountStatus {
  isActive: boolean;
  canLogin: boolean;
  message: string;
  messageType: 'success' | 'warning' | 'error';
  redirectTo?: string;
}

export async function checkAccountStatus(userId: string): Promise<AccountStatus> {
  try {
    console.log('🔍 Account Status Check - Started:', {
      userId: userId,
      timestamp: new Date().toISOString()
    });

    // Search in all possible collections (same as auth-provider does)
    const accountTypes = ['clubs', 'academies', 'trainers', 'agents', 'players', 'users'];
    let userData = null;
    let foundCollection = null;

    // Search in parallel across all collections
    const queries = accountTypes.map(collection =>
      getDoc(doc(db, collection, userId))
    );

    const results = await Promise.all(queries);

    for (let i = 0; i < results.length; i++) {
      if (results[i].exists()) {
        userData = results[i].data();
        foundCollection = accountTypes[i];
        console.log(`✅ Account Status Check - User data found in ${foundCollection}:`, {
          userId: userId,
          email: userData.email,
          accountType: userData.accountType,
          isActive: userData.isActive,
          isDeleted: userData.isDeleted
        });
        break;
      }
    }

    if (!userData) {
      console.log('❌ Account Status Check - User document not found in any collection:', userId);
      return {
        isActive: false,
        canLogin: false,
        message: 'حسابك غير موجود في النظام. يرجى التواصل مع الإدارة.',
        messageType: 'error'
      };
    }

    // Check if account is deleted (priority check)
    if (userData.isDeleted === true) {
      console.log('❌ Account Status Check - Account is deleted:', userId);
      return {
        isActive: false,
        canLogin: false,
        message: 'تم حذف حسابك من النظام. يرجى التواصل مع الإدارة.',
        messageType: 'error'
      };
    }

    // Check if account is active
    if (userData.isActive === false) {
      const suspendReason = userData.suspendReason || 'لم يتم تحديد السبب';
      console.log('⚠️ Account Status Check - Account is suspended:', userId);
      return {
        isActive: false,
        canLogin: false,
        message: `تم إيقاف حسابك مؤقتاً.\n\nالسبب: ${suspendReason}\n\nيرجى التواصل مع الإدارة لإعادة تفعيل الحساب.`,
        messageType: 'error'
      };
    }

    // Check subscription status if applicable
    if (userData.subscription) {
      const subscription = userData.subscription;
      const now = new Date();
      const expiresAt = subscription.expiresAt?.toDate?.() || new Date(subscription.expiresAt);

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

    // Account is active and good
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

export async function updateLastLogin(userId: string): Promise<void> {
  try {
    // Update last login in users collection
    const payload = {
      lastLogin: new Date(),
      lastLoginIP: getClientIP() // Optional: track IP
    } as Record<string, any>;
    const sanitized = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
    await updateDoc(doc(db, 'users', userId), sanitized);
  } catch (error) {
    console.warn('Failed to update last login:', error);
    // Don't throw error as this is not critical
  }
}

function getClientIP(): string {
  // This is a simple implementation - in production you might want to use a service
  return 'unknown';
}
