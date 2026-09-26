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

  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (typeof window !== 'undefined') {
    const userPhone = localStorage.getItem('userPhone') || sessionStorage.getItem('otp_phone');
    if (userPhone) headers.set('x-user-phone', userPhone);

    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) headers.set('x-user-email', userEmail);

    const accountType = sessionStorage.getItem('otp_account_type');
    if (accountType) headers.set('x-account-type', accountType);
  }

  return fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers,
  });
}
