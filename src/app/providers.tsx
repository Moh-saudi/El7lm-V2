'use client';

import { ReactNode, useEffect } from 'react';
import { SupabaseAuthProvider } from '@/lib/firebase/auth-provider';
import { MantineProvider } from '@mantine/core';
import { initializeConsoleFilter } from '@/utils/console-filter';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Initialize console filter only on the client
    initializeConsoleFilter();
  }, []);

  return (
    <MantineProvider>
      <SupabaseAuthProvider>
        {children}
      </SupabaseAuthProvider>
    </MantineProvider>
  );
}
