/**
 * POST /api/notifications/broadcast-whatsapp - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';
import { sendChatAmanTemplate } from '@/lib/server/chataman-provider';

const BATCH_SIZE = 10;
const MAX_RECIPIENTS_PER_REQUEST = 500;

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
  const { data, error } = await db.from('players').select('phone, phoneNumber, position, primary_position, age, birth_date, birthDate, country, nationality, gender');
  if (error) throw error;
  const players = data ?? [];
  const total = players.length;
  const phoneSet = new Set<string>();

  for (const p of players as Record<string, unknown>[]) {
    if (targeting.positions && targeting.positions.length > 0) {
      const pos = String(p.position ?? p.primary_position ?? '').toLowerCase();
      if (!targeting.positions.some(tp => tp.toLowerCase() === pos || pos.includes(tp.toLowerCase()))) continue;
    }

    const playerAge = typeof p.age === 'number' ? p.age : calcAge(p.birth_date ?? p.birthDate);
    if (targeting.ageMin !== undefined && (playerAge === null || playerAge < targeting.ageMin)) continue;
    if (targeting.ageMax !== undefined && (playerAge === null || playerAge > targeting.ageMax)) continue;

    if (targeting.country) {
      const playerCountry = String(p.country ?? p.nationality ?? '').toLowerCase();
      if (!playerCountry || !playerCountry.includes(targeting.country.toLowerCase())) continue;
    }

    if (targeting.gender && targeting.gender !== 'both') {
      const playerGender = String(p.gender ?? '').toLowerCase();
      if (!playerGender || playerGender !== targeting.gender.toLowerCase()) continue;
    }

    const raw = p.phone ?? p.phoneNumber;
    if (raw) {
      const formatted = formatPhone(String(raw));
      if (formatted) phoneSet.add(formatted);
    }
  }

  return { phones: Array.from(phoneSet), total, matched: phoneSet.size };
}

async function sendOne(phone: string, templateName: string, params: string[], config: { apiKey: string; baseUrl: string }): Promise<boolean> {
  const payload = {
    phone,
    template: {
      name: templateName,
      language: { code: 'ar' },
      components: params.length > 0
        ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }]
        : [],
    },
  };
  return sendChatAmanTemplate(payload, config);
}

async function sendInBatches(phones: string[], templateName: string, params: string[], config: { apiKey: string; baseUrl: string }): Promise<{ sent: number; failed: number }> {
  let sent = 0; let failed = 0;
  for (let i = 0; i < phones.length; i += BATCH_SIZE) {
    const results = await Promise.all(phones.slice(i, i + BATCH_SIZE).map(p => sendOne(p, templateName, params, config)));
    results.forEach(ok => ok ? sent++ : failed++);
  }
  return { sent, failed };
}

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req, 'manage:communications');
  if (!authorization.ok) return authorization.response;
  try {
    const body = await req.json();
    const { eventType = 'new_opportunity', templateName = 'opp_pick_up_3', params = [], targeting, broadcastData } = body;

    if (typeof templateName !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(templateName)) {
      return NextResponse.json({ success: false, error: 'Invalid templateName' }, { status: 400 });
    }
    if (!Array.isArray(params) || params.length > 20 || params.some(p => typeof p !== 'string' || p.length > 1024)) {
      return NextResponse.json({ success: false, error: 'Invalid template params' }, { status: 400 });
    }
    if (targeting && (typeof targeting !== 'object' || Array.isArray(targeting))) {
      return NextResponse.json({ success: false, error: 'Invalid targeting' }, { status: 400 });
    }
    if (targeting) {
      const t = targeting as Targeting;
      if (t.positions && (!Array.isArray(t.positions) || t.positions.length > 20 || t.positions.some(p => typeof p !== 'string' || p.length > 64))) {
        return NextResponse.json({ success: false, error: 'Invalid targeting positions' }, { status: 400 });
      }
      if (t.ageMin !== undefined && (!Number.isInteger(t.ageMin) || t.ageMin < 0 || t.ageMin > 120)) {
        return NextResponse.json({ success: false, error: 'Invalid ageMin' }, { status: 400 });
      }
      if (t.ageMax !== undefined && (!Number.isInteger(t.ageMax) || t.ageMax < 0 || t.ageMax > 120)) {
        return NextResponse.json({ success: false, error: 'Invalid ageMax' }, { status: 400 });
      }
      if (t.ageMin !== undefined && t.ageMax !== undefined && t.ageMin > t.ageMax) {
        return NextResponse.json({ success: false, error: 'ageMin cannot exceed ageMax' }, { status: 400 });
      }
      if (t.country !== undefined && (typeof t.country !== 'string' || t.country.length > 100)) {
        return NextResponse.json({ success: false, error: 'Invalid targeting country' }, { status: 400 });
      }
      if (t.gender !== undefined && !['male', 'female', 'both'].includes(t.gender)) {
        return NextResponse.json({ success: false, error: 'Invalid targeting gender' }, { status: 400 });
      }
    }

    const db = getSupabaseAdmin();

    // ChatAman config
    const { data: cfgRows, error: configError } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);
    if (configError) throw configError;
    if (!cfgRows?.length) return NextResponse.json({ success: false, error: 'ChatAman config not found' }, { status: 400 });
    const cfg = cfgRows[0] as Record<string, unknown>;
    if (!cfg.isActive || !cfg.apiKey || !cfg.baseUrl) return NextResponse.json({ success: false, error: 'ChatAman inactive or incomplete config' }, { status: 400 });

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
      const { data: players, error: playersError } = await db.from('players').select('phone, phoneNumber');
      if (playersError) throw playersError;
      total = (players ?? []).length;
      const phoneSet = new Set<string>();
      (players ?? []).forEach((p: Record<string, unknown>) => {
        const raw = p.phone ?? p.phoneNumber;
        if (raw) { const f = formatPhone(String(raw)); if (f) phoneSet.add(f); }
      });
      phones = Array.from(phoneSet);
      matched = phones.length;
    }

    if (phones.length > MAX_RECIPIENTS_PER_REQUEST) {
      return NextResponse.json(
        { success: false, error: 'Too many recipients for a synchronous broadcast', matched: phones.length, limit: MAX_RECIPIENTS_PER_REQUEST },
        { status: 413 },
      );
    }

    if (phones.length === 0) {
      return NextResponse.json({ success: true, eventType, templateName, total, matched: 0, sent: 0, failed: 0, message: 'No matching players with phone numbers found' });
    }

    // Write broadcast doc
    if (broadcastData) {
      if (typeof broadcastData !== 'object' || Array.isArray(broadcastData)) {
        return NextResponse.json({ success: false, error: 'Invalid broadcastData' }, { status: 400 });
      }
      const safeBroadcast = broadcastData as Record<string, unknown>;
      const { error: broadcastError } = await db.from('broadcasts').insert({
        id: crypto.randomUUID(),
        opportunityId: safeBroadcast.opportunityId,
        opportunityTitle: safeBroadcast.opportunityTitle,
        opportunityType: safeBroadcast.opportunityType,
        organizerName: safeBroadcast.organizerName,
        organizerType: safeBroadcast.organizerType,
        eventType,
        title: safeBroadcast.title,
        message: safeBroadcast.message,
        actionUrl: typeof safeBroadcast.actionUrl === 'string' ? safeBroadcast.actionUrl : '/dashboard/opportunities',
        targetType: safeBroadcast.targetType,
        data: safeBroadcast.data,
        createdAt: new Date().toISOString(),
      });
      if (broadcastError) throw broadcastError;
    }

    const { sent, failed } = await sendInBatches(phones, templateName, params, cfg as { apiKey: string; baseUrl: string });
    return NextResponse.json({ success: true, eventType, templateName, totalPlayers: total, matched, sent, failed });
  } catch (err: unknown) {
    console.error('[broadcast-whatsapp] error:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
