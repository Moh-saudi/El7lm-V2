'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';

interface SimpleOTPTestProps {
  phoneNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SimpleOTPTest({ phoneNumber, isOpen, onClose }: SimpleOTPTestProps) {
  const { t, isRTL } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const hasSentRef = useRef(false);
  const initRef = useRef(false);

  // إرسال OTP عند فتح المكون
  useEffect(() => {
    console.log('🔍 [SIMPLE] useEffect triggered:', { isOpen, initRef: initRef.current, hasSent: hasSentRef.current });
    
    if (isOpen && !initRef.current) {
      initRef.current = true;
      console.log('🚀 [SIMPLE] Initializing OTP send for:', phoneNumber);
      
      const sendOTP = async () => {
        console.log('📞 [SIMPLE] sendOTP called for:', phoneNumber, 'hasSent:', hasSentRef.current);
        
        if (hasSentRef.current) {
          console.log('🛑 [SIMPLE] OTP already sent, blocking');
          return;
        }
        
        hasSentRef.current = true;
        setLoading(true);
        setError('');
        setMessage('');
        
        try {
          console.log('📤 [SIMPLE] Sending OTP to:', phoneNumber);
          
          // محاكاة إرسال OTP
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('✅ [SIMPLE] OTP sent successfully');
          setMessage(t('sharedComponents.otp.testSent'));
        } catch (error) {
          console.error('❌ [SIMPLE] Error sending OTP:', error);
          setError(t('sharedComponents.otp.testSendFailed'));
          hasSentRef.current = false;
        }
        
        setLoading(false);
      };
      
      sendOTP();
    }
  }, [isOpen, phoneNumber, t]);

  // إعادة تعيين عند الإغلاق
  useEffect(() => {
    if (!isOpen) {
      console.log('🔒 [SIMPLE] Component closing, resetting flags');
      initRef.current = false;
      hasSentRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl" dir={isRTL ? 'rtl' : 'ltr'}>
        <h2 className="text-2xl font-bold mb-4 text-center">{t('sharedComponents.otp.testTitle')}</h2>
        
        <div className="space-y-4">
          <p className="text-center">{t('sharedComponents.otp.phoneNumber').replace('{{phone}}', phoneNumber)}</p>
          
          {loading && (
            <p className="text-center text-blue-600">{t('sharedComponents.otp.sending')}</p>
          )}
          
          {message && (
            <p className="text-center text-green-600">{message}</p>
          )}
          
          {error && (
            <p className="text-center text-red-600">{error}</p>
          )}
          
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
          >
            {t('sharedComponents.otp.close')}
          </button>
        </div>
      </div>
    </div>
  );
} 
