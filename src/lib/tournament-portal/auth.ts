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
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Portal Auth API first (verifies credentials against registered tournament clients)
    try {
        const res = await fetch('/api/tournament-portal/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (res.ok) {
            const json = await res.json();
            if (json.success && json.client) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('portal-client-session', JSON.stringify(json.client));
                    localStorage.setItem('portal-auth-token', json.token);
                }
                return {
                    user: { id: json.client.supabase_auth_id || json.client.id, email: json.client.email },
                    session: { access_token: json.token },
                };
            } else if (json.error && !json.error.includes('غير مسجل')) {
                // Return specific error (e.g. account disabled or bad password)
                throw new Error(json.error);
            }
        }
    } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('fetch')) {
            throw apiErr;
        }
    }

    // 2. Fallback to Supabase Auth if needed
    const supabase = createPortalClient();
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (!error && data?.user) {
            const { data: client } = await supabase
                .from('tournament_clients')
                .select('*')
                .eq('supabase_auth_id', data.user.id)
                .maybeSingle();

            if (client && typeof window !== 'undefined') {
                localStorage.setItem('portal-client-session', JSON.stringify(client));
                localStorage.setItem('portal-auth-token', data.session?.access_token || client.id);
            }
            return data;
        }
    } catch {}

    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
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

    if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('portal-auth-token');
    }

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
    // 1. Check local active portal session
    if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('portal-client-session');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.id && parsed?.name) {
                    return parsed as TournamentClient;
                }
            } catch {}
        }
    }

    // 2. Check Supabase auth session
    const supabase = createPortalClient();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: client } = await supabase
            .from('tournament_clients')
            .select('*')
            .eq('supabase_auth_id', session.user.id)
            .maybeSingle();

        if (client) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('portal-client-session', JSON.stringify(client));
            }
            return client;
        }
    } catch {}

    return null;
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
