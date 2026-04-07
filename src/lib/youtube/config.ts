import { supabase } from '@/lib/supabase/config';

let cachedKey: string | null | undefined;

export async function getYouTubeApiKey(): Promise<string | null> {
  if (typeof cachedKey !== 'undefined') return cachedKey;

  // Prefer environment variable
  const envKey = process.env.YOUTUBE_API_KEY?.trim();
  if (envKey) {
    cachedKey = envKey;
    return cachedKey;
  }

  try {
    // Fallback to Supabase app_settings table: row with id='youtube', column apiKey
    const { data } = await supabase.from('app_settings').select('apiKey').eq('id', 'youtube').limit(1);
    const apiKey = data?.length ? (String((data[0] as Record<string, unknown>).apiKey || '') || null) : null;
    cachedKey = apiKey;
    return cachedKey;
  } catch {
    cachedKey = null;
    return cachedKey;
  }
}


