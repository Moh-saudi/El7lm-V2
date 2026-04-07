import { supabase } from '@/lib/supabase/config';

interface LoginAttempt {
  timestamp: Date;
  success: boolean;
  deviceInfo: string;
  ipAddress?: string;
  location?: string;
}

interface UserSecurityProfile {
  uid: string;
  phone: string;
  phoneVerified: boolean;
  totalLogins: number;
  successfulLogins: number;
  lastLogin: Date | null;
  lastLoginDevice: string;
  lastLoginIP: string;
  trustedDevices: string[];
  loginAttempts: LoginAttempt[];
  securityLevel: 'new' | 'trusted' | 'suspicious';
  requiresOTP: boolean;
  otpBypassEnabled: boolean;
}

export type LoginMethod = 'otp' | 'password' | 'both';
export type SecurityReason = 'new_user' | 'new_device' | 'suspicious_activity' | 'long_absence' | 'security_change' | 'user_choice';

interface LoginSecurityDecision {
  method: LoginMethod;
  reason: SecurityReason;
  message: string;
  otpRequired: boolean;
  canBypass: boolean;
}

export class SmartLoginSystem {

  /**
   * تحديد طريقة تسجيل الدخول المطلوبة بناءً على ملف الأمان
   */
  async determineLoginMethod(
    phone: string,
    deviceInfo: string,
    ipAddress?: string
  ): Promise<LoginSecurityDecision> {

    try {
      const userProfile = await this.getUserSecurityProfile(phone);

      if (!userProfile) {
        return {
          method: 'otp',
          reason: 'new_user',
          message: 'مستخدم جديد - التحقق من الهاتف مطلوب',
          otpRequired: true,
          canBypass: false
        };
      }

      // التحقق من عدد مرات الدخول الناجحة
      if (userProfile.successfulLogins < 3) {
        return {
          method: 'otp',
          reason: 'new_user',
          message: `مطلوب التحقق للمرة ${userProfile.successfulLogins + 1} من 3`,
          otpRequired: true,
          canBypass: false
        };
      }

      // التحقق من الجهاز
      if (!userProfile.trustedDevices.includes(deviceInfo)) {
        return {
          method: 'otp',
          reason: 'new_device',
          message: 'جهاز جديد - التحقق من الهاتف مطلوب للأمان',
          otpRequired: true,
          canBypass: false
        };
      }

      // التحقق من آخر دخول (أكثر من 30 يوم)
      const daysSinceLastLogin = userProfile.lastLogin
        ? (Date.now() - userProfile.lastLogin.getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      if (daysSinceLastLogin > 30) {
        return {
          method: 'otp',
          reason: 'long_absence',
          message: 'لم تسجل دخول منذ فترة طويلة - التحقق مطلوب',
          otpRequired: true,
          canBypass: false
        };
      }

      // التحقق من النشاط المشبوه
      const recentFailures = userProfile.loginAttempts
        .filter(attempt =>
          !attempt.success &&
          (Date.now() - attempt.timestamp.getTime()) < (1000 * 60 * 60) // آخر ساعة
        ).length;

      if (recentFailures >= 3) {
        return {
          method: 'otp',
          reason: 'suspicious_activity',
          message: 'نشاط مشبوه - التحقق الإضافي مطلوب',
          otpRequired: true,
          canBypass: false
        };
      }

      // المستخدم موثوق - يمكن استخدام كلمة المرور فقط
      return {
        method: 'password',
        reason: 'user_choice',
        message: 'مستخدم موثوق - يمكن الدخول بكلمة المرور',
        otpRequired: false,
        canBypass: true
      };

    } catch (error) {
      console.error('خطأ في تحديد طريقة تسجيل الدخول:', error);
      // في حالة الخطأ، نتخذ الخيار الأكثر أماناً
      return {
        method: 'otp',
        reason: 'new_user',
        message: 'خطأ في النظام - التحقق مطلوب للأمان',
        otpRequired: true,
        canBypass: false
      };
    }
  }

  /**
   * الحصول على ملف الأمان للمستخدم
   */
  private async getUserSecurityProfile(phone: string): Promise<UserSecurityProfile | null> {
    try {
      const { data } = await supabase.from('users').select('*').eq('phone', phone).limit(1);
      if (!data?.length) return null;

      const userData = data[0] as Record<string, unknown>;

      return {
        uid: String(userData.id || ''),
        phone: String(userData.phone || ''),
        phoneVerified: Boolean(userData.phoneVerified),
        totalLogins: Number(userData.totalLogins) || 0,
        successfulLogins: Number(userData.successfulLogins) || 0,
        lastLogin: userData.lastLogin ? new Date(String(userData.lastLogin)) : null,
        lastLoginDevice: String(userData.lastLoginDevice || ''),
        lastLoginIP: String(userData.lastLoginIP || ''),
        trustedDevices: (userData.trustedDevices as string[]) || [],
        loginAttempts: ((userData.loginAttempts as Record<string, any>[]) || []).map((attempt) => ({
          success: Boolean(attempt.success),
          deviceInfo: String(attempt.deviceInfo || 'unknown'),
          ipAddress: attempt.ipAddress ? String(attempt.ipAddress) : undefined,
          location: attempt.location ? String(attempt.location) : undefined,
          ...attempt,
          timestamp: attempt.timestamp ? new Date(String(attempt.timestamp)) : new Date()
        }) as LoginAttempt),
        securityLevel: (userData.securityLevel as 'new' | 'trusted' | 'suspicious') || 'new',
        requiresOTP: Boolean(userData.requiresOTP),
        otpBypassEnabled: Boolean(userData.otpBypassEnabled),
      };
    } catch (error) {
      console.error('خطأ في جلب ملف الأمان:', error);
      return null;
    }
  }

  /**
   * تسجيل محاولة تسجيل دخول
   */
  async recordLoginAttempt(
    phone: string,
    success: boolean,
    deviceInfo: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const { data } = await supabase.from('users').select('*').eq('phone', phone).limit(1);
      if (!data?.length) return;

      const userData = data[0] as Record<string, unknown>;
      const userId = String(userData.id);

      const newAttempt: LoginAttempt = {
        timestamp: new Date(),
        success,
        deviceInfo,
        ipAddress: ipAddress || 'unknown',
        location: 'unknown'
      };

      const updatedAttempts = [
        ...((userData.loginAttempts as LoginAttempt[]) || []),
        newAttempt
      ].slice(-10);

      const updateData: Record<string, unknown> = {
        totalLogins: (Number(userData.totalLogins) || 0) + 1,
        loginAttempts: updatedAttempts,
        lastLoginDevice: deviceInfo,
        lastLoginIP: ipAddress || 'unknown'
      };

      if (success) {
        const newSuccessful = (Number(userData.successfulLogins) || 0) + 1;
        updateData.successfulLogins = newSuccessful;
        updateData.lastLogin = new Date().toISOString();

        if (newSuccessful >= 3) {
          const trustedDevices = (userData.trustedDevices as string[]) || [];
          if (!trustedDevices.includes(deviceInfo)) {
            updateData.trustedDevices = [...trustedDevices, deviceInfo];
            updateData.securityLevel = 'trusted';
          }
        }
      }

      await supabase.from('users').update(updateData).eq('id', userId);
    } catch (error) {
      console.error('خطأ في تسجيل محاولة الدخول:', error);
    }
  }

  /**
   * تفعيل أو إلغاء OTP الإجباري للمستخدم
   */
  async setUserOTPPreference(phone: string, requiresOTP: boolean): Promise<void> {
    try {
      const { data } = await supabase.from('users').select('id').eq('phone', phone).limit(1);
      if (data?.length) {
        await supabase.from('users').update({ requiresOTP, otpBypassEnabled: !requiresOTP }).eq('id', String((data[0] as Record<string, unknown>).id));
      }
    } catch (error) {
      console.error('خطأ في تحديث تفضيلات OTP:', error);
    }
  }

  /**
   * الحصول على معلومات الجهاز
   */
  getDeviceInfo(): string {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'server';
    const language = typeof navigator !== 'undefined' ? navigator.language : 'unknown';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';

    return `${platform}-${language}-${userAgent.slice(0, 50)}`;
  }

  /**
   * التحقق من قوة كلمة المرور - أرقام فقط
   */
  validatePasswordStrength(password: string): { isStrong: boolean; message: string } {
    // التحقق من قوة كلمة المرور - 8 أحرف على الأقل
    if (password.length < 8) {
      return { isStrong: false, message: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' };
    }

    const isNumbersOnly = /^\d+$/.test(password);

    // منع الأرقام المتسلسلة والمتكررة إذا كانت كلمة المرور أرقام فقط
    const weakPatterns = [
      /^(\d)\1+$/, // نفس الرقم متكرر
      /^(0123456789|9876543210)/, // أرقام متسلسلة
      /^12345678$/, /^87654321$/,
      /^123456/, /^654321/,
      /^111111/, /^000000/, /^666666/, /^888888/
    ];

    if (isNumbersOnly && weakPatterns.some(pattern => pattern.test(password))) {
      return { isStrong: false, message: 'كلمة المرور ضعيفة جداً. تجنب الأرقام المتسلسلة أو المتكررة' };
    }

    return { isStrong: true, message: 'كلمة مرور مقبولة' };
  }
}

export const smartLoginSystem = new SmartLoginSystem();
