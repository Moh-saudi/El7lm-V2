'use client';

import { AlertTriangle, CheckCircle, Clock, RefreshCw, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface WhatsAppOTPVerificationProps {
  phoneNumber: string;
  name?: string;
  isOpen: boolean;
  onVerificationSuccess: (phoneNumber: string) => void;
  onVerificationFailed: (error: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  otpExpirySeconds?: number;
  maxAttempts?: number;
  language?: string;
  t?: (key: string) => string;
  onOTPVerify?: (otp: string) => Promise<void>; // دالة مخصصة للتحقق من OTP
}

export default function WhatsAppOTPVerification({
  phoneNumber,
  name,
  isOpen,
  onVerificationSuccess,
  onVerificationFailed,
  onClose,
  title,
  subtitle,
  otpExpirySeconds = 180,
  maxAttempts = 3,
  language,
  t: suppliedT,
  onOTPVerify,
}: WhatsAppOTPVerificationProps) {
  const { t: contextT, isRTL } = useTranslation();
  const translate = suppliedT || contextT;
  const resolvedTitle = title || translate('sharedComponents.otp.titleWhatsapp');
  const resolvedSubtitle = subtitle || translate('sharedComponents.otp.subtitleWhatsapp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const isInitializedRef = useRef(false);
  const isVerifyingRef = useRef(false); // منع double-invocation

  useEffect(() => {
    if (isOpen && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setTimeRemaining(otpExpirySeconds);
      setMessage(translate('sharedComponents.otp.sentTo').replace('{{phone}}', phoneNumber));
    }
  }, [isOpen, phoneNumber, otpExpirySeconds, translate]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
      setResendLoading(false);
      setError('');
      setMessage('');
      setTimeRemaining(0);
      setAttempts(0);
    }
  }, [isOpen]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`whatsapp-otp-${index + 1}`)?.focus();
    }

    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6) {
      verifyOTP(fullOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`whatsapp-otp-${index - 1}`)?.focus();
    }
  };

  const verifyOTP = useCallback(async (otpCode: string) => {
    if (loading || isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setLoading(true);
    setError('');

    if (attempts >= maxAttempts) {
      setError(translate('sharedComponents.otp.maxAttempts'));
      setLoading(false);
      return;
    }

    setAttempts(prev => prev + 1);

    try {
      // إذا كانت هناك دالة مخصصة للتحقق من OTP، استخدمها
      if (onOTPVerify) {
        console.log('🔐 Calling custom OTP verification function with:', otpCode);
        await onOTPVerify(otpCode);
        console.log('✅ Custom OTP verification succeeded');
        // إذا وصلنا هنا بدون خطأ، يعني التحقق نجح
        setMessage(translate('sharedComponents.otp.verified'));
        setTimeout(() => onVerificationSuccess(phoneNumber), 1000);
      } else {
        // API call to verify OTP via unified Firestore-based endpoint
        const verifyResponse = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber, otp: otpCode }),
        });

        const verifyResult = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyResult.success) {
          throw new Error(verifyResult.error || translate('sharedComponents.otp.invalidCode'));
        }

        setMessage(translate('sharedComponents.otp.verified'));
        setTimeout(() => onVerificationSuccess(phoneNumber), 1000);
      }

    } catch (err: any) {
      console.error('❌ OTP verification error in WhatsAppOTPVerification:', err);
      const errorMessage = err.message || translate('sharedComponents.otp.invalidCode');
      setError(errorMessage);
      onVerificationFailed(errorMessage);
      setOtp(['', '', '', '', '', '']);
      document.getElementById('whatsapp-otp-0')?.focus();
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  }, [phoneNumber, onVerificationSuccess, onVerificationFailed, loading, attempts, maxAttempts, onOTPVerify, translate]);

  const handleResendOTP = useCallback(async () => {
    if (resendLoading || timeRemaining > 0) return;
    setResendLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, name, channel: 'whatsapp' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || translate('sharedComponents.otp.resendFailed'));

      setMessage(translate('sharedComponents.otp.resentWhatsapp'));
      setTimeRemaining(otpExpirySeconds);
      setAttempts(0);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  }, [resendLoading, timeRemaining, phoneNumber, name, language, otpExpirySeconds, translate]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{resolvedTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title={translate('sharedComponents.otp.close')} aria-label={translate('sharedComponents.otp.close')}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-center text-gray-600 mb-4">{resolvedSubtitle}</p>

        {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-red-700 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
                <p>{error}</p>
            </div>
        )}
        {message && !error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-green-700 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <p>{message}</p>
            </div>
        )}

        <div className="flex justify-center gap-2 my-6" dir="ltr">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`whatsapp-otp-${index}`}
              type="tel"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-green-500"
              maxLength={1}
              disabled={loading}
              placeholder="0"
              title={translate('sharedComponents.otp.digitLabel').replace('{{number}}', String(index + 1))}
              aria-label={translate('sharedComponents.otp.digitLabel').replace('{{number}}', String(index + 1))}
            />
          ))}
        </div>

        <div className="text-center text-gray-600 mb-6">
          {timeRemaining > 0 ? (
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{translate('sharedComponents.otp.timeRemaining')}: {formatTime(timeRemaining)}</span>
            </div>
          ) : (
            <p className="text-red-500">{translate('sharedComponents.otp.expired')}</p>
          )}
        </div>

        <button
          onClick={handleResendOTP}
          disabled={resendLoading || timeRemaining > 0}
          className="w-full py-3 px-4 rounded-lg font-medium text-lg flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
        >
          {resendLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          {translate('sharedComponents.otp.resend')}
        </button>
      </div>
    </div>
  );
}
