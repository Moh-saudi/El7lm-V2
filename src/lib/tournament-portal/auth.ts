/**
 * Tournament Portal — Auth helpers
 * يستخدم @supabase/supabase-js مباشرة (بدون SSR)
 * الحماية تتم client-side فقط
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Singleton client ─────────────────────────────────────────
let _client: SupabaseClient | null = null;

export function createPortalClient(): SupabaseClient {
    if (typeof window === 'undefined') {
        // server-side (نادر) — إنشاء instance مؤقت
        return createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
    if (!_client) {
        _client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: true,
                    storageKey: 'portal-auth-token',   // مفتاح مستقل عن باقي التطبيق
                    storage: window.localStorage,
                    autoRefreshToken: true,
                    detectSessionInUrl: false,
                },
            }
        );
    }
    return _client;
}

// ── تسجيل الدخول ────────────────────────────────────────────
export async function signInClient(email: string, password: string) {
    const supabase = createPortalClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
}

// ── تسجيل خروج ──────────────────────────────────────────────
export async function signOutClient() {
    const supabase = createPortalClient();
    await supabase.auth.signOut();
}

// ── إنشاء حساب جديد ───────────────────────────────────────
export async function signUpClient(params: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
    phone?: string;
    country?: string;
}) {
    const supabase = createPortalClient();
    const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
            data: {
                name: params.name,
                organization_name: params.organizationName,
                phone: params.phone,
                country: params.country,
            }
        }
    });
    if (error) throw new Error(error.message);
    return data;
}

// ── جلب المستخدم الحالي ──────────────────────────────────────
export async function getCurrentClient(): Promise<TournamentClient | null> {
    const supabase = createPortalClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: client } = await supabase
        .from('tournament_clients')
        .select('*')
        .eq('supabase_auth_id', session.user.id)
        .single();

    return client ?? null;
}

// ── Types ────────────────────────────────────────────────────
export interface TournamentClient {
    id:                string;
    supabase_auth_id:  string;
    name:              string;
    organization_name: string | null;
    email:             string;
    phone:             string | null;
    logo_url:          string | null;
    country:           string | null;
    is_active:         boolean;
    created_at:        string;
    updated_at:        string;
}
