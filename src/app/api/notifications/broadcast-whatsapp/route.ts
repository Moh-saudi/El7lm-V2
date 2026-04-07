/**
 * POST /api/notifications/broadcast-whatsapp - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const BATCH_SIZE = 10;

interface Targeting {
  positions?: string[];
  ageMin?: number;
  ageMax?: number;
  country?: string;
  gender?: 'male' | 'female' | 'both';
}

function formatPhone(phone: string): string | null {
  try {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
    else if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = `966${cleaned.substring(1)}`;
    else if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.substring(1);
    if (cleaned.length < 8) return null;
    return `+${cleaned}`;
  } catch { return null; }
}

function calcAge(birthDate: unknown): number | null {
  try {
    const dob = new Date(String(birthDate));
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  } catch { return null; }
}

async function getTargetedPhones(targeting: Targeting, db: ReturnType<typeof getSupabaseAdmin>): Promise<{ phones: string[]; total: number; matched: number }> {
  const { data } = await db.from('players').select('phone, phoneNumber, position, primary_position, age, birth_date, birthDate, country, nationality, gender');
  const players = data ?? [];
  const total = players.length;
  const phoneSet = new Set<string>();

  for (const p of players as Record<string, unknown>[]) {
    if (targeting.positions && targeting.positions.length > 0) {
      const pos = String(p.position ?? p.primary_position ?? '').toLowerCase();
      if (!targeting.positions.some(tp => tp.toLowerCase() === pos || pos.includes(tp.toLowerCase()))) continue;
    }

    const playerAge = typeof p.age === 'number' ? p.age : calcAge(p.birth_date ?? p.birthDate);
    if (targeting.ageMin !== undefined && playerAge !== null && playerAge < targeting.ageMin) continue;
    if (targeting.ageMax !== undefined && playerAge !== null && playerAge > targeting.ageMax) continue;

    if (targeting.country) {
      const playerCountry = String(p.country ?? p.nationality ?? '').toLowerCase();
      if (playerCountry && !playerCountry.includes(targeting.country.toLowerCase())) continue;
    }

    if (targeting.gender && targeting.gender !== 'both') {
      const playerGender = String(p.gender ?? '').toLowerCase();
      if (playerGender && playerGender !== targeting.gender.toLowerCase()) continue;
    }

    const raw = p.phone ?? p.phoneNumber;
    if (raw) {
      const formatted = formatPhone(String(raw));
      if (formatted) phoneSet.add(formatted);
    }
  }

  return { phones: Array.from(phoneSet), total, matched: phoneSet.size };
}

async function sendOne(phone: string, templateName: string, params: string[], config: { apiKey: string; baseUrl: string }, origin: string): Promise<boolean> {
  try {
    const payload = {
      phone,
      template: {
        name: templateName, language: { code: 'ar' },
        components: params.length > 0 ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }] : [],
      },
    };
    const res = await fetch(`${origin}/api/chataman/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, apiKey: config.apiKey.trim(), baseUrl: config.baseUrl.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    return data.success === true;
  } catch { return false; }
}

async function sendInBatches(phones: string[], templateName: string, params: string[], config: { apiKey: string; baseUrl: string }, origin: string): Promise<{ sent: number; failed: number }> {
  let sent = 0; let failed = 0;
  for (let i = 0; i < phones.length; i += BATCH_SIZE) {
    const results = await Promise.all(phones.slice(i, i + BATCH_SIZE).map(p => sendOne(p, templateName, params, config, origin)));
    results.forEach(ok => ok ? sent++ : failed++);
  }
  return { sent, failed };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType = 'new_opportunity', templateName = 'opp_pick_up_3', params = [], targeting, broadcastData } = body;

    if (!Array.isArray(params)) return NextResponse.json({ success: false, error: 'params must be an array' }, { status: 400 });

    const db = getSupabaseAdmin();

    // ChatAman config
    const { data: cfgRows } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);
    if (!cfgRows?.length) return NextResponse.json({ success: false, error: 'ChatAman config not found' }, { status: 400 });
    const cfg = cfgRows[0] as Record<string, unknown>;
    if (!cfg.isActive || !cfg.apiKey) return NextResponse.json({ success: false, error: 'ChatAman inactive or missing apiKey' }, { status: 400 });

    // Write broadcast doc
    if (broadcastData) {
      await db.from('broadcasts').insert({
        id: crypto.randomUUID(), ...broadcastData, eventType,
        createdAt: new Date().toISOString(),
        actionUrl: broadcastData.actionUrl || '/dashboard/opportunities',
      });
    }

    const origin = new URL(req.url).origin;
    const hasTargeting = targeting && Object.keys(targeting).some(k => {
      const v = targeting[k];
      return v !== undefined && v !== null && v !== 'both' && (!Array.isArray(v) || v.length > 0);
    });

    let phones: string[];
    let total: number;
    let matched: number;

    if (hasTargeting) {
      const result = await getTargetedPhones(targeting, db);
      phones = result.phones; total = result.total; matched = result.matched;
    } else {
      const { data: players } = await db.from('players').select('phone, phoneNumber');
      total = (players ?? []).length;
      const phoneSet = new Set<string>();
      (players ?? []).forEach((p: Record<string, unknown>) => {
        const raw = p.phone ?? p.phoneNumber;
        if (raw) { const f = formatPhone(String(raw)); if (f) phoneSet.add(f); }
      });
      phones = Array.from(phoneSet);
      matched = phones.length;
    }

    if (phones.length === 0) {
      return NextResponse.json({ success: true, eventType, templateName, total, matched: 0, sent: 0, failed: 0, message: 'No matching players with phone numbers found' });
    }

    const { sent, failed } = await sendInBatches(phones, templateName, params, cfg as { apiKey: string; baseUrl: string }, origin);
    return NextResponse.json({ success: true, eventType, templateName, totalPlayers: total, matched, sent, failed });
  } catch (err: unknown) {
    console.error('[broadcast-whatsapp] error:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
