'use client';

import { supabase } from '@/lib/supabase/config';

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  let token: string | null = null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch {}

  // Fallback 1: check localStorage for Supabase token
  if (!token && typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            token = parsed.access_token || parsed?.currentSession?.access_token || null;
            if (token) break;
          }
        }
      }
    } catch {}
  }

  // Fallback 2: check Firebase Auth
  if (!token) {
    try {
      const { auth } = await import('@/lib/firebase/config');
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
    } catch {}
  }

  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers,
  });
}
