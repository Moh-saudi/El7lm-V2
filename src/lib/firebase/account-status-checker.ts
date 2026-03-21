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
    // نسمح بإعادة التسجيل بعد الحذف — يُعامَل كمستخدم جديد في auth-provider
    if (userData.isDeleted === true) {
      console.log('⚠️ Account Status Check - Account is deleted, will allow re-registration:', userId);
      return {
        isActive: false,
        canLogin: false,
        message: 'تم حذف حسابك — يمكنك إنشاء حساب جديد.',
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

const ACCOUNT_COLLECTIONS = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents', 'employees'];

export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const timestamp = new Date();
    const payload = {
      lastLogin: timestamp,
      last_login: timestamp, // للتوافق
      lastLoginIP: getClientIP()
    };

    // تنظيف البيانات
    const sanitized = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    // محاولة التحديث في جميع المجموعات المحتملة بشكل متوازي
    // هذا يضمن التحديث حتى لو كان المستخدم موجوداً في اكثر من مكان
    const updatePromises = ACCOUNT_COLLECTIONS.map(async (collectionName) => {
      try {
        const docRef = doc(db, collectionName, userId);
        // نتحقق أولاً من وجود المستند لتجنب الأخطاء (أو يمكن استخدام setDoc مع {merge: true} لإنشائه لو غير موجود، لكننا نريد تحديث الموجود فقط)
        // لكن updateDoc تفشل إذا لم يكن موجوداً، وهذا جيد هنا لأننا لا نريد إنشاء مستندات وهمية
        await updateDoc(docRef, sanitized);
      } catch (e) {
        // نتجاهل الأخطاء لأن المستند قد لا يكون موجوداً في هذه المجموعة وهذا طبيعي
      }
    });

    await Promise.all(updatePromises);

  } catch (error) {
    console.warn('Failed to update last login:', error);
  }
}

function getClientIP(): string {
  if (typeof window !== 'undefined') {
    return 'client-side';
  }
  return 'unknown';
}
