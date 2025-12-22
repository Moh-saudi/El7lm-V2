'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhoneBasedPasswordReset from '@/components/auth/PhoneBasedPasswordReset';
import dynamic from 'next/dynamic';

// Lazy load the old WhatsApp-based component
const WhatsAppPasswordReset = dynamic(() => import('./WhatsAppPasswordReset'), {
  loading: () => <div className="text-center p-8 text-white">جاري التحميل...</div>
});

type ResetMethod = 'email' | 'whatsapp';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [method, setMethod] = useState<ResetMethod>('email');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4" dir="rtl">
      <div className="w-full max-w-md space-y-4">

        {/* Method Toggle */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setMethod('email')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${method === 'email'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'text-white/70 hover:text-white/90'
                }`}
            >
              📧 عبر البريد الإلكتروني
            </button>
            <button
              onClick={() => setMethod('whatsapp')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${method === 'whatsapp'
                  ? 'bg-white text-green-600 shadow-lg'
                  : 'text-white/70 hover:text-white/90'
                }`}
            >
              📱 عبر الواتساب
            </button>
          </div>
        </div>

        {/* Content */}
        {method === 'email' ? (
          <PhoneBasedPasswordReset
            onSuccess={() => { }}
            onCancel={() => router.push('/auth/login')}
          />
        ) : (
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
