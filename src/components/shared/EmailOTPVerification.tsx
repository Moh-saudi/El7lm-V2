'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Clock, RefreshCw, X } from 'lucide-react';


interface EmailOTPVerificationProps {
  email: string;
  name: string;
  isOpen: boolean;
  onVerificationSuccess: (otp: string) => void;
  onVerificationFailed: (error: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  otpExpirySeconds?: number;
}

export default function EmailOTPVerification({
  email,
  name,
  isOpen,
  onVerificationSuccess,
  onVerificationFailed,
  onClose,
  title = 'التحقق من البريد الإلكتروني',
  subtitle = 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
  otpExpirySeconds = 30
}: EmailOTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentOtpCode, setCurrentOtpCode] = useState('');

  // حماية ضد الإرسال المتكرر
  const sentRef = useRef(false);
  const isInitializedRef = useRef(false);
  const lastEmailRef = useRef<string>('');
  const isSendingRef = useRef(false);

  // إرسال OTP عند فتح المكون (مرة واحدة فقط)
  useEffect(() => {
    console.log('🔍 EmailOTP: useEffect triggered:', {
      isOpen,
      initialized: isInitializedRef.current,
      sent: sentRef.current,
      email,
      lastEmail: lastEmailRef.current
    });

    if (isOpen && !isInitializedRef.current) {
      isInitializedRef.current = true;
      console.log('🚀 EmailOTP: Initial OTP send triggered for:', email);

      // التحقق من أن البريد الإلكتروني لم يتغير
      if (lastEmailRef.current === email && sentRef.current) {
        console.log('🛑 EmailOTP: OTP already sent for this email, skipping...');
        return;
      }

      // إرسال OTP الأولي
      sendOTP();
    }
  }, [isOpen]);

  // عداد الوقت المتبقي
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // تنظيف البيانات عند إغلاق المكون
  useEffect(() => {
    if (!isOpen) {
      console.log('🔒 EmailOTP: Component closing - resetting...');
      // إعادة تعيين جميع المتغيرات
      sentRef.current = false;
      isInitializedRef.current = false;
      isSendingRef.current = false;
      lastEmailRef.current = '';

      setOtp(['', '', '', '', '', '']);
      setLoading(false);
      setResendLoading(false);
      setError('');
      setMessage('');
      setTimeRemaining(0);
      setCurrentOtpCode('');
    }
  }, [isOpen]);

  // دالة إعادة تعيين المكون
  const resetComponent = () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(false);
    setResendLoading(false);
    setTimeRemaining(0);
    setMessage('');
    setError('');
    setCurrentOtpCode('');
  };

  // دالة إنشاء OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // دالة إرسال الإيميل عبر API (Resend)
  const sendEmailDirectly = async (otpCode: string) => {
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          otp: otpCode
        }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني!' };
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('خطأ في إرسال الإيميل:', error);
      return { success: false, message: 'فشل في إرسال الإيميل. يرجى المحاولة مرة أخرى.' };
    }
  };

  const sendOTP = async () => {
    // منع الإرسال المتكرر
    if (loading || isSendingRef.current) {
      console.log('🛑 Email OTP sending blocked - already loading');
      return;
    }

    // إذا كان الإرسال الأولي تم بالفعل
    if (sentRef.current && lastEmailRef.current === email) {
      console.log('🛑 EmailOTP: OTP already sent for this email');
      return;
    }

    isSendingRef.current = true;
    sentRef.current = true;
    lastEmailRef.current = email;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const newOtp = generateOTP();
      setCurrentOtpCode(newOtp);

      const emailResult = await sendEmailDirectly(newOtp);

      if (emailResult.success) {
        setMessage(emailResult.message);
        setTimeRemaining(otpExpirySeconds);
      } else {
        setError('فشل في إرسال الإيميل. يرجى المحاولة مرة أخرى.');
        onVerificationFailed('فشل في إرسال الإيميل');
        sentRef.current = false;
        isSendingRef.current = false;
        return;
      }
    } catch (error: any) {
      console.error('خطأ في إرسال OTP:', error);
      setError('حدث خطأ في إرسال رمز التحقق');
      onVerificationFailed('حدث خطأ في إرسال رمز التحقق');
      sentRef.current = false;
      isSendingRef.current = false;
    }

    setLoading(false);
    isSendingRef.current = false;
  };

  const handleOtpChange = (index: number, value: string) => {
    // السماح بالأرقام فقط
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // الانتقال للحقل التالي تلقائياً
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }

    // التحقق من اكتمال الرمز
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const verifyOTP = async (otpCode: string) => {
    setLoading(true);
    setError('');

    try {
      // التحقق من انتهاء صلاحية الرمز
      if (timeRemaining <= 0) {
        setError('انتهت صلاحية الرمز. أرسل رمزاً جديداً.');
        setOtp(['', '', '', '', '', '']);
        setLoading(false);
        return;
      }

      // التحقق من صحة الرمز
      if (currentOtpCode !== otpCode) {
        setError('رمز التحقق غير صحيح.');
        setOtp(['', '', '', '', '', '']);
        const firstInput = document.getElementById('otp-0') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
        setLoading(false);
        return;
      }

      // تحقق ناجح
      setMessage('تم التحقق من البريد الإلكتروني بنجاح!');

      setTimeout(() => {
        onVerificationSuccess(otpCode);
        resetComponent();
      }, 1500);

    } catch (error: any) {
      console.error('خطأ في التحقق:', error);
      setError('حدث خطأ في التحقق من الرمز');
      onVerificationFailed('حدث خطأ في التحقق من الرمز');
    }

    setLoading(false);
  };

  const handleResendOTP = async () => {
    // منع التكرار إذا كان الإرسال جارياً
    if (loading || resendLoading || isSendingRef.current) {
      console.log('🛑 Email resend already in progress, skipping...');
      return;
    }

    setResendLoading(true);
    setError('');

    // إعادة تعيين الحماية للسماح بالإرسال مرة أخرى
    setCurrentOtpCode('');
    setOtp(['', '', '', '', '', '']);
    sentRef.current = false;

    console.log('🔄 Starting email resend...');
    await sendOTP();
    setResendLoading(false);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">{title}</h2>
            <p className="text-gray-600 text-center">
              {subtitle}
              <br />
              <span className="font-semibold text-blue-600">{email}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="flex items-center gap-2 p-3 mb-4 text-green-700 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-red-700 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block mb-3 text-sm font-medium text-gray-700 text-center">
            أدخل رمز التحقق المكون من 6 أرقام
          </label>
          <div className="flex justify-center gap-2" dir="ltr">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={loading}
                style={{ direction: 'ltr', textAlign: 'center' }}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          {timeRemaining > 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>الوقت المتبقي: {formatTime(timeRemaining)}</span>
            </div>
          ) : (
            <div className="text-sm text-red-600">
              انتهت صلاحية الرمز
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleResendOTP}
            disabled={resendLoading || timeRemaining > 0}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${timeRemaining > 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            {resendLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                إعادة إرسال الرمز
              </>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-3 px-4 text-gray-600 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            لم تستلم الرمز؟ تحقق من مجلد الرسائل غير المرغوب فيها
          </p>
        </div>
      </div>
    </div>
  );
} 
