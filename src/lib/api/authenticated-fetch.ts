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

  return fetch(input, { ...init, headers });
}
