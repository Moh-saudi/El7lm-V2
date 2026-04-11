/**
 * Auth Callback - Route Handler (Server-side)
 * يعالج PKCE code exchange على السيرفر حيث يمكن قراءة code verifier من الـ cookies
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const ACCOUNT_TABLES = ['admins', 'employees', 'clubs', 'academies', 'trainers', 'agents', 'players', 'marketers'];

const TABLE_TO_ACCOUNT_TYPE: Record<string, string> = {
  admins: 'admin', employees: 'admin',
  clubs: 'club', academies: 'academy',
  trainers: 'trainer', agents: 'agent',
  players: 'player', marketers: 'marketer',
};

const DASHBOARD_ROUTES: Record<string, string> = {
  player:   '/dashboard/player',
  club:     '/dashboard/club',
  academy:  '/dashboard/academy',
  agent:    '/dashboard/agent',
  trainer:  '/dashboard/trainer',
  marketer: '/dashboard/marketer',
  admin:    '/dashboard/admin',
};

async function resolveAccountTypeAndLinkUid(userId: string, email: string): Promise<string> {
  const db = getSupabaseAdmin();

  // البحث بالـ uid أولاً
  for (const table of ACCOUNT_TABLES) {
    const { data } = await db.from(table).select('id, accountType').eq('uid', userId).limit(1).maybeSingle();
    if (data) {
      return (data as any).accountType || TABLE_TO_ACCOUNT_TYPE[table] || 'player';
    }
  }

  // البحث بالإيميل + ربط تلقائي للـ uid
  if (email) {
    for (const table of ACCOUNT_TABLES) {
      const { data } = await db.from(table).select('id, accountType').eq('email', email).limit(1).maybeSingle();
      if (data) {
        // تحديث uid بالـ Supabase UUID الحالي لتسريع عمليات البحث المستقبلية
        await db.from(table).update({ uid: userId, lastLogin: new Date().toISOString() } as any).eq('id', (data as any).id);
        console.log(`🔗 [Auth Callback] Linked uid for ${email} in ${table}`);
        return (data as any).accountType || TABLE_TO_ACCOUNT_TYPE[table] || 'player';
      }
    }
  }

  return 'player';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const allCookies = request.cookies.getAll();

  console.log('🔵 [Auth Callback] GET hit');
  console.log('🔵 [Auth Callback] origin:', origin);
  console.log('🔵 [Auth Callback] code:', code ? code.substring(0, 20) + '...' : 'MISSING');
  console.log('🔵 [Auth Callback] cookies count:', allCookies.length);
  console.log('🔵 [Auth Callback] cookie names:', allCookies.map(c => c.name).join(', '));

  if (!code) {
    console.error('❌ [Auth Callback] No code in URL — redirecting to login');
    return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // v0.1.0 uses get/set/remove internally (not getAll/setAll)
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try { cookieStore.set({ name, value, ...options } as any); } catch {}
        },
        remove(name: string, options: Record<string, unknown>) {
          try { cookieStore.set({ name, value: '', ...options } as any); } catch {}
        },
      },
    }
  );

  console.log('🔵 [Auth Callback] calling exchangeCodeForSession...');
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  console.log('🔵 [Auth Callback] exchange result — error:', error?.message || 'none', '| session:', !!data.session);

  if (error || !data.session) {
    console.error('❌ [Auth Callback] exchangeCodeForSession failed:', error?.message, error?.status, JSON.stringify(error));
    return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', origin));
  }

  const userId = data.session.user.id;
  const email = data.session.user.email || '';

  const accountType = await resolveAccountTypeAndLinkUid(userId, email);
  const dashboardUrl = DASHBOARD_ROUTES[accountType] || '/dashboard/player';

  console.log(`[Auth Callback] ${email} → ${accountType} → ${dashboardUrl}`);

  return NextResponse.redirect(new URL(dashboardUrl, origin));
}
