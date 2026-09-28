'use client';

import { supabase } from '@/lib/supabase/config';

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers,
  });
}
