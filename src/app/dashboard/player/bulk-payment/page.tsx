'use client';

import React, { Suspense } from 'react';
import BulkPaymentPage from '@/components/shared/BulkPaymentPage';

export default function PlayerSubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BulkPaymentPage accountType="player" />
    </Suspense>
  );
}
