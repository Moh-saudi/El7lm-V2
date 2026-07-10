'use client';

import React, { Suspense } from 'react';
import BulkPaymentPage from '@/components/shared/BulkPaymentPage';
import { useAuth } from '@/lib/firebase/auth-provider';

export default function SharedPaymentPage() {
  const { userData } = useAuth();
  const accountType = userData?.accountType || 'player';

  // Safe mapping to prevent TypeScript or runtime issues
  const safeAccountType = ['club', 'academy', 'trainer', 'agent', 'player'].includes(accountType)
    ? accountType
    : 'player';

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BulkPaymentPage accountType={safeAccountType as any} />
    </Suspense>
  );
}
