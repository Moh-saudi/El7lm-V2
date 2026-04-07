'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// Storage bucket names
export const STORAGE_BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  PLAYER_AVATAR: 'avatars',
  ADDITIONAL_IMAGES: 'avatars',
  PLAYER_ADDITIONAL_IMAGES: 'avatars',
  VIDEOS: 'videos',
  DOCUMENTS: 'documents',
  PLAYER_VIDEOS: 'videos',
  CLUB_VIDEOS: 'videos',
  ACADEMY_VIDEOS: 'videos',
  ADS: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'ads',
  PLAYER_TRAINER: 'playertrainer',
  PLAYER_CLUB: 'playerclub',
  PLAYER_AGENT: 'playeragent',
  PLAYER_ACADEMY: 'playeracademy',
  WALLET: 'wallet',
  CLUB_AVATAR: 'clubavatar',
  AGENT: 'agent',
  ACADEMY: 'academy',
  TRAINER: 'trainer',
};

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Singleton browser client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: ReturnType<typeof createBrowserClient<any>> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = (() => {
  if (typeof window === 'undefined') {
    return createBrowserClient<any>(supabaseUrl, supabaseAnonKey);
  }
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient<any>(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
})();

export const getSupabaseClient = () => supabase;

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error || error.code === 'PGRST116';
  } catch {
    return false;
  }
};

export interface SupabaseUploadResponse {
  url?: string;
  error?: string;
  path?: string;
}

export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
}

export default { supabase, getSupabaseClient, checkSupabaseConnection, STORAGE_BUCKETS };
