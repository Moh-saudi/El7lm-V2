/**
 * POST /api/notifications/broadcast-whatsapp
 *
 * Strategy:
 *  - In-app (broadcasts collection) → writes ONE doc → all logged-in users see it FREE
 *  - WhatsApp → sends ONLY to players matching opportunity criteria (smart targeting)
 *
 * Body:
 * {
 *   eventType: 'new_opportunity' | 'new_club' | 'custom',
 *   templateName?: string,          // default: 'opp_pick_up_3'
 *   params: string[],               // {{1}}, {{2}}, {{3}} ...
 *   targeting?: {                   // smart filter — omit a field = no filter applied
 *     positions?: string[];         // match player.position or player.primary_position
 *     ageMin?: number;
 *     ageMax?: number;
 *     country?: string;
 *     gender?: 'male' | 'female' | 'both';
 *   },
 *   broadcastData?: {               // writes to broadcasts collection (in-app, free)
 *     title: string;
 *     message: string;
 *     organizerName: string;
 *     actionUrl?: string;
 *     [key: string]: any;
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const BATCH_SIZE = 10; // concurrent WhatsApp sends per batch

interface Targeting {
  positions?: string[];
  ageMin?: number;
  ageMax?: number;
  country?: string;
  gender?: 'male' | 'female' | 'both';
}

// ─── phone formatter ──────────────────────────────────────────────────────────

function formatPhone(phone: string): string | null {
  try {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
    else if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = `966${cleaned.substring(1)}`;
    else if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.substring(1);
    if (cleaned.length < 8) return null;
    return `+${cleaned}`;
  } catch {
    return null;
  }
}

// ─── age helper ───────────────────────────────────────────────────────────────

function calcAge(birthDate: any): number | null {
  try {
    const dob = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}

// ─── smart targeting: fetch matched player phones ─────────────────────────────

async function getTargetedPhones(
  db: FirebaseFirestore.Firestore,
  targeting: Targeting,
): Promise<{ phones: string[]; total: number; matched: number }> {
  const snap = await db.collection('players')
    .select('phone', 'phoneNumber', 'position', 'primary_position', 'age', 'birth_date',
            'birthDate', 'country', 'nationality', 'gender')
    .get();

  const total = snap.size;
  const phones = new Set<string>();

  snap.docs.forEach((d) => {
    const p = d.data();

    // ── position filter ──
    if (targeting.positions && targeting.positions.length > 0) {
      const playerPos = (p.position || p.primary_position || '').toLowerCase();
      const match = targeting.positions.some(pos =>
        pos.toLowerCase() === playerPos ||
        playerPos.includes(pos.toLowerCase())
      );
      if (!match) return;
    }

    // ── age filter ──
    const playerAge = typeof p.age === 'number' ? p.age
      : calcAge(p.birth_date || p.birthDate);
    if (targeting.ageMin !== undefined && playerAge !== null && playerAge < targeting.ageMin) return;
    if (targeting.ageMax !== undefined && playerAge !== null && playerAge > targeting.ageMax) return;

    // ── country filter (loose match — only if explicitly set) ──
    if (targeting.country) {
      const playerCountry = (p.country || p.nationality || '').toLowerCase();
      if (playerCountry && !playerCountry.includes(targeting.country.toLowerCase())) return;
    }

    // ── gender filter ──
    if (targeting.gender && targeting.gender !== 'both') {
      const playerGender = (p.gender || '').toLowerCase();
      if (playerGender && playerGender !== targeting.gender.toLowerCase()) return;
    }

    // ── extract phone ──
    const raw = p.phone || p.phoneNumber;
    if (raw) {
      const formatted = formatPhone(String(raw));
      if (formatted) phones.add(formatted);
    }
  });

  return { phones: Array.from(phones), total, matched: phones.size };
}

// ─── send one WhatsApp ────────────────────────────────────────────────────────

async function sendOne(
  phone: string,
  templateName: string,
  params: string[],
  config: { apiKey: string; baseUrl: string },
  origin: string,
): Promise<boolean> {
  try {
    const payload = {
      phone,
      template: {
        name: templateName,
        language: { code: 'ar' },
        components: params.length > 0 ? [{
          type: 'body',
          parameters: params.map(p => ({ type: 'text', text: p })),
        }] : [],
      },
    };

    const res = await fetch(`${origin}/api/chataman/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload,
        apiKey: config.apiKey.trim(),
        baseUrl: config.baseUrl.trim(),
      }),
    });

    const text = await res.text().catch(() => '');
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    return data.success === true;
  } catch {
    return false;
  }
}

// ─── batch sender ─────────────────────────────────────────────────────────────

async function sendInBatches(
  phones: string[],
  templateName: string,
  params: string[],
  config: { apiKey: string; baseUrl: string },
  origin: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < phones.length; i += BATCH_SIZE) {
    const batch = phones.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(phone => sendOne(phone, templateName, params, config, origin))
    );
    results.forEach(ok => ok ? sent++ : failed++);
  }

  return { sent, failed };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventType = 'new_opportunity',
      templateName = 'opp_pick_up_3',
      params = [],
      targeting,
      broadcastData,
    } = body;

    if (!Array.isArray(params)) {
      return NextResponse.json({ success: false, error: 'params must be an array' }, { status: 400 });
    }

    const db = getAdminDb();

    // ── 1. ChatAman config ──
    const cfgSnap = await db.collection('system_configs').doc('chataman_config').get();
    if (!cfgSnap.exists) {
      return NextResponse.json({ success: false, error: 'ChatAman config not found' }, { status: 400 });
    }
    const cfg = cfgSnap.data() as any;
    if (!cfg.isActive || !cfg.apiKey) {
      return NextResponse.json({ success: false, error: 'ChatAman inactive or missing apiKey' }, { status: 400 });
    }

    // ── 2. Write broadcast doc → in-app notification for ALL users (free) ──
    if (broadcastData) {
      await db.collection('broadcasts').add({
        ...broadcastData,
        eventType,
        createdAt: FieldValue.serverTimestamp(),
        actionUrl: broadcastData.actionUrl || '/dashboard/opportunities',
      });
      console.log(`[broadcast-whatsapp] ✓ broadcast doc written for "${broadcastData.title}"`);
    }

    // ── 3. Smart targeting: only players matching criteria ──
    const origin = new URL(req.url).origin;
    const hasTargeting = targeting && Object.keys(targeting).some(k => {
      const v = (targeting as any)[k];
      return v !== undefined && v !== null && v !== 'both' && (!Array.isArray(v) || v.length > 0);
    });

    let phones: string[];
    let total: number;
    let matched: number;

    if (hasTargeting) {
      const result = await getTargetedPhones(db, targeting);
      phones = result.phones;
      total = result.total;
      matched = result.matched;
      console.log(`[broadcast-whatsapp] Smart targeting: ${matched} matched / ${total} total players`);
    } else {
      // No targeting criteria → send to all players only (not all users)
      const snap = await db.collection('players').select('phone', 'phoneNumber').get();
      total = snap.size;
      const phoneSet = new Set<string>();
      snap.docs.forEach(d => {
        const raw = d.data().phone || d.data().phoneNumber;
        if (raw) {
          const f = formatPhone(String(raw));
          if (f) phoneSet.add(f);
        }
      });
      phones = Array.from(phoneSet);
      matched = phones.length;
    }

    if (phones.length === 0) {
      return NextResponse.json({
        success: true, eventType, templateName,
        total, matched: 0, sent: 0, failed: 0,
        message: 'No matching players with phone numbers found',
      });
    }

    // ── 4. Send WhatsApp to matched players ──
    console.log(`[broadcast-whatsapp] Sending "${templateName}" to ${phones.length} phones, params: [${params.join(', ')}]`);
    const { sent, failed } = await sendInBatches(phones, templateName, params, cfg, origin);
    console.log(`[broadcast-whatsapp] Done — sent: ${sent}, failed: ${failed}, total: ${phones.length}`);

    return NextResponse.json({
      success: true,
      eventType,
      templateName,
      totalPlayers: total,
      matched,
      sent,
      failed,
    });
  } catch (err: any) {
    console.error('[broadcast-whatsapp] error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
