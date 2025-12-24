'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmailPasswordReset from '@/components/auth/EmailPasswordReset';
import PhoneBasedPasswordReset from '@/components/auth/PhoneBasedPasswordReset';
import dynamic from 'next/dynamic';

// Lazy load the old WhatsApp-based component
const WhatsAppPasswordReset = dynamic(() => import('./WhatsAppPasswordReset'), {
  loading: () => <div className="text-center p-8 text-white">جاري التحميل...</div>
});

type ResetMethod = 'email' | 'phone' | 'whatsapp';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [method, setMethod] = useState<ResetMethod>('email');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4" dir="rtl">
      <div className="w-full max-w-md space-y-4">

        {/* Method Toggle - 3 Options */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setMethod('email')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${method === 'email'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white/70 hover:text-white/90'
                }`}
            >
              ✉️ البريد
            </button>
            <button
              onClick={() => setMethod('phone')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${method === 'phone'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'text-white/70 hover:text-white/90'
                }`}
            >
              📱 الهاتف
            </button>
            <button
              onClick={() => setMethod('whatsapp')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${method === 'whatsapp'
                ? 'bg-white text-green-600 shadow-lg'
                : 'text-white/70 hover:text-white/90'
                }`}
            >
              💬 واتساب
            </button>
          </div>

          {/* Method Description */}
          <p className="text-center text-xs text-white/60 mt-2">
            {method === 'email' && 'إعادة التعيين عبر البريد الإلكتروني المسجل'}
            {method === 'phone' && 'إعادة التعيين عبر رقم الهاتف'}
            {method === 'whatsapp' && 'إعادة التعيين عبر رقم WhatsApp + OTP'}
          </p>
        </div>

        {/* Content */}
        {method === 'email' && (
          <EmailPasswordReset
            onSuccess={() => { }}
            onCancel={() => router.push('/auth/login')}
          />
        )}

        {method === 'phone' && (
          <PhoneBasedPasswordReset
            onSuccess={() => { }}
            onCancel={() => router.push('/auth/login')}
          />
        )}

        {method === 'whatsapp' && (
          <WhatsAppPasswordReset />
        )}

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/auth/login')}
          className="w-full text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة إلى تسجيل الدخول
        </Button>
      </div>
    </div>
  );
}
