'use client';

import { ReactNode, useEffect } from 'react';
import { FirebaseAuthProvider } from '@/lib/firebase/auth-provider';
import { initializePerformanceOptimizations } from '@/lib/performance/console-optimizer';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    initializePerformanceOptimizations();
  }, []);

  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
