'use client';

import ModernMessageCenter from '@/components/messaging/ModernMessageCenter';
import ClientOnlyToaster from '@/components/ClientOnlyToaster';

export default function SharedMessagesPage() {
  return (
    <>
      <ClientOnlyToaster position="top-center" />
      <ModernMessageCenter />
    </>
  );
} 
