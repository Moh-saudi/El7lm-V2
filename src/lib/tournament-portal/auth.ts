/**
 * Tournament Portal — Auth helpers
 * يستخدم @supabase/supabase-js مباشرة (بدون SSR)
 * مع طبقة حماية احتياطية مدمجة (Portal Auth API Fallback)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function isUuid(val?: string | null): boolean {
    return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// ── Singleton client ─────────────────────────────────────────
let _client: SupabaseClient | null = null;

export function createPortalClient(): SupabaseClient {
    if (typeof window === 'undefined') {
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
                    storageKey: 'portal-auth-token',
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
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data?.user || !data.session) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const { data: client, error: clientError } = await supabase
        .from('tournament_clients')
        .select('*')
        .eq('supabase_auth_id', data.user.id)
        .maybeSingle();

    if (clientError || !client || client.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('حساب بوابة البطولات غير متاح');
    }

    if (typeof window !== 'undefined') {
        localStorage.setItem('portal-client-session', JSON.stringify(client));
    }
    return data;
}

// ── تسجيل خروج ──────────────────────────────────────────────
export async function signOutClient() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('portal-client-session');
        localStorage.removeItem('portal-auth-token');
    }
    const supabase = createPortalClient();
    try {
        await supabase.auth.signOut();
    } catch {}
}

export async function portalAuthenticatedFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    const supabase = createPortalClient();
    let token: string | null = null;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
    } catch {}

    const headers = new Headers(init.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
}

// ── إنشاء حساب جديد ───────────────────────────────────────
export async function signUpClient(params: {
    email: string;
    password: string;
    name: string;
    organizationName?: string | null;
    phone?: string | null;
    country?: string | null;
}) {
    const supabase = createPortalClient();
    const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
            data: {
                name:              params.name,
                organization_name: params.organizationName,
                phone:             params.phone,
                country:           params.country,
            },
        },
    });
    if (error) throw new Error(error.message);
    return data;
}

// ── جلب المستخدم الحالي ──────────────────────────────────────
export async function getCurrentClient(): Promise<TournamentClient | null> {
    const supabase = createPortalClient();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: client } = await supabase
            .from('tournament_clients')
            .select('*')
            .eq('supabase_auth_id', session.user.id)
            .maybeSingle();

        if (!client || client.is_active === false) return null;
        if (typeof window !== 'undefined') {
            localStorage.setItem('portal-client-session', JSON.stringify(client));
        }
        return client;
    } catch {
        return null;
    }
}

// ── Types ────────────────────────────────────────────────────
export interface TournamentClient {
    id:                string;
    supabase_auth_id:  string;
    name:              string;
    organization_name: string | null;
    email:             string;
    phone:             string | null;
    logo_url?:         string | null;
    country:           string | null;
    is_active:         boolean;
    created_at:        string;
}
