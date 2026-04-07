'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.replace('/auth/login?error=oauth_failed');
        return;
      }

      const accountType = session.user.user_metadata?.accountType || 'player';
      const routes: Record<string, string> = {
        player:   '/dashboard/player',
        club:     '/dashboard/club',
        academy:  '/dashboard/academy',
        agent:    '/dashboard/agent',
        trainer:  '/dashboard/trainer',
        marketer: '/dashboard/marketer',
        admin:    '/dashboard/admin',
      };

      router.replace(routes[accountType] || '/dashboard/player');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">جاري تسجيل الدخول...</p>
      </div>
    </div>
  );
}
