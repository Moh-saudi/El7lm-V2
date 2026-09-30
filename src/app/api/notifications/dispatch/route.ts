/**
 * /api/notifications/dispatch - Supabase Edition
 * Central server-side notification dispatcher.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { sendChatAmanTemplate } from '@/lib/server/chataman-provider';

export type NotificationEventType =
  | 'profile_view' | 'video_view' | 'video_like' | 'video_comment'
  | 'video_share' | 'message_received' | 'follow';

interface DispatchPayload {
  eventType: NotificationEventType;
  targetUserId: string;
  actorId: string;
  actorName?: string;
  actorAccountType?: string;
  metadata?: { videoId?: string; commentText?: string; messagePreview?: string; source?: string };
}

const EVENT_TYPES = new Set<NotificationEventType>([
  'profile_view', 'video_view', 'video_like', 'video_comment',
  'video_share', 'message_received', 'follow',
]);

const ACCOUNT_LABELS: Record<string, string> = {
  player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
  agent: 'وكيل', trainer: 'مدرب', admin: 'مدير',
};

function buildInAppContent(payload: DispatchPayload) {
  const actorType = payload.actorAccountType || 'user';
  const actorLabel = ACCOUNT_LABELS[actorType] || actorType;
  const actor = payload.actorName || 'مستخدم';

  const map: Record<NotificationEventType, { title: string; message: string; emoji: string; priority: string }> = {
    profile_view:     { title: 'شخص مهتم بك! 👀', message: `${actorLabel} "${actor}" زار ملفك الشخصي`, emoji: '👀', priority: 'medium' },
    video_view:       { title: 'مشاهدة جديدة لفيديوك! 🎬', message: `${actorLabel} "${actor}" شاهد أحد فيديوهاتك`, emoji: '🎬', priority: 'low' },
    video_like:       { title: 'إعجاب بفيديوك! ❤️', message: `${actorLabel} "${actor}" أعجب بفيديوك`, emoji: '❤️', priority: 'medium' },
    video_comment:    { title: 'تعليق جديد! 💬', message: `${actorLabel} "${actor}" علّق على فيديوك: "${payload.metadata?.commentText?.substring(0, 40) || ''}"`, emoji: '💬', priority: 'high' },
    video_share:      { title: 'شارك فيديوك! 🔁', message: `${actorLabel} "${actor}" شارك أحد فيديوهاتك`, emoji: '🔁', priority: 'medium' },
    message_received: { title: 'رسالة جديدة! 💬', message: `${actorLabel} "${actor}" أرسل لك رسالة: "${payload.metadata?.messagePreview?.substring(0, 40) || ''}"`, emoji: '📩', priority: 'high' },
    follow:           { title: 'متابع جديد! ⭐', message: `${actorLabel} "${actor}" بدأ متابعتك`, emoji: '⭐', priority: 'medium' },
  };
  return map[payload.eventType];
}

async function resolveActorIdentity(authUserId: string): Promise<{ id: string; name: string; accountType: string } | null> {
  const db = getSupabaseAdmin();
  const matches = new Map<string, { id: string; name: string; accountType: string }>();

  const candidates = [
    { table: 'players', accountType: 'player', select: 'id, uid, full_name, name' },
    { table: 'clubs', accountType: 'club', select: 'id, uid, full_name, name' },
    { table: 'academies', accountType: 'academy', select: 'id, uid, full_name, name' },
    { table: 'agents', accountType: 'agent', select: 'id, uid, full_name' },
    { table: 'trainers', accountType: 'trainer', select: 'id, uid, full_name' },
    { table: 'marketers', accountType: 'marketer', select: 'id, uid, full_name' },
    { table: 'admins', accountType: 'admin', select: 'id, uid, name' },
    { table: 'users', accountType: 'user', select: 'id, uid, full_name, name, displayName' },
  ] as const;

  for (const candidate of candidates) {
    const query = db.from(candidate.table);
    let result;
    switch (candidate.table) {
      case 'players': result = await query.select('id, uid, full_name, name').eq('uid', authUserId).limit(1); break;
      case 'clubs': result = await query.select('id, uid, full_name, name').eq('uid', authUserId).limit(1); break;
      case 'academies': result = await query.select('id, uid, full_name, name').eq('uid', authUserId).limit(1); break;
      case 'agents': result = await query.select('id, uid, full_name').eq('uid', authUserId).limit(1); break;
      case 'trainers': result = await query.select('id, uid, full_name').eq('uid', authUserId).limit(1); break;
      case 'marketers': result = await query.select('id, uid, full_name').eq('uid', authUserId).limit(1); break;
      case 'admins': result = await query.select('id, uid, name').eq('uid', authUserId).limit(1); break;
      case 'users': result = await query.select('id, uid, full_name, name, displayName').eq('uid', authUserId).limit(1); break;
    }
    if (result.error) throw result.error;
    if (!result.data?.length) continue;
    const row = result.data[0] as unknown as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    const uid = String(row.uid ?? '').trim();
    if (!id || uid !== authUserId) continue;
    const name = String(row.full_name ?? row.displayName ?? row.name ?? '').trim() || 'مستخدم';
    matches.set(`${candidate.table}:${id}`, { id, name, accountType: candidate.accountType });
  }

  if (matches.size !== 1) return null;
  return [...matches.values()][0];
}
async function resolveTargetIdentity(userId: string): Promise<{ accountId: string; authUid: string } | null> {
  const db = getSupabaseAdmin();
  const matches = new Map<string, string>();

  for (const table of ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins'] as const) {
    const [byId, byUid] = await Promise.all([
      db.from(table).select('id, uid').eq('id', userId).limit(1),
      db.from(table).select('id, uid').eq('uid', userId).limit(1),
    ]);
    if (byId.error) throw byId.error;
    if (byUid.error) throw byUid.error;

    for (const row of [...(byId.data ?? []), ...(byUid.data ?? [])]) {
      const accountId = String(row.id ?? '').trim();
      const authUid = String(row.uid ?? '').trim();
      if (accountId && authUid) matches.set(authUid, accountId);
    }
  }

  if (matches.size !== 1) return null;
  const [authUid, accountId] = [...matches.entries()][0];
  return { accountId, authUid };
}
async function hasDuplicateRecent(
  targetUserId: string, actorId: string, eventType: string, windowMs: number
): Promise<boolean> {
  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await db
    .from('interaction_notifications')
    .select('createdAt')
    .eq('userId', targetUserId)
    .eq('viewerId', actorId)
    .eq('type', eventType)
    .gt('createdAt', since)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function getPhoneForUser(userId: string): Promise<string | null> {
  const db = getSupabaseAdmin();

  const users = await db.from('users').select('phone, phoneNumber').eq('id', userId).limit(1);
  if (users.error) throw users.error;
  if (users.data?.length) return String(users.data[0].phone ?? users.data[0].phoneNumber ?? '').trim() || null;

  const players = await db.from('players').select('phone, phoneNumber').eq('id', userId).limit(1);
  if (players.error) throw players.error;
  if (players.data?.length) return String(players.data[0].phone ?? players.data[0].phoneNumber ?? '').trim() || null;

  for (const table of ['clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins'] as const) {
    const { data, error } = await db.from(table).select('phone').eq('id', userId).limit(1);
    if (error) throw error;
    if (data?.length) return String(data[0].phone ?? '').trim() || null;
  }
  return null;
}
async function getChatAmanConfig(db: ReturnType<typeof getSupabaseAdmin>): Promise<{ apiKey: string; baseUrl: string; isActive: boolean } | null> {
    const { data, error } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);
    if (error) throw error;
    if (data?.length) {
      const d = data[0] as Record<string, unknown>;
      if (d.isActive && d.apiKey) return d as { apiKey: string; baseUrl: string; isActive: boolean };
    }
  return null;
}

async function getTemplateConfig(db: ReturnType<typeof getSupabaseAdmin>): Promise<Record<string, { templateName: string; params: string[] } | null>> {
  const defaults: Record<string, { templateName: string; params: string[] } | null> = {
    profile_view:     { templateName: 'profile_notification',      params: ['recipientName', 'actorName'] },
    video_view:       { templateName: 'video_notfiation',          params: ['recipientName', 'actorName'] },
    video_like:       { templateName: 'video_notfiation',          params: ['recipientName', 'actorName'] },
    video_comment:    { templateName: 'video_notfiation',          params: ['recipientName', 'actorName'] },
    video_share:      { templateName: 'video_notfiation',          params: ['recipientName', 'actorName'] },
    message_received: { templateName: 'new_message_notification',  params: ['recipientName', 'actorName'] },
    follow: null,
  };

  const { data, error } = await db.from('system_configs').select('*').eq('id', 'notification_templates').limit(1);
  if (error) throw error;
    if (data?.length) {
      const saved = data[0] as Record<string, unknown>;
      const merged = { ...defaults };
      for (const [key, val] of Object.entries(saved)) {
        if (val && typeof val === 'object' && (val as Record<string, unknown>).templateName) {
          merged[key] = val as { templateName: string; params: string[] };
        }
      }
      return merged;
    }
  return defaults;
}

async function sendWhatsAppTemplate(
  phone: string, templateName: string, bodyParams: string[],
  config: { apiKey: string; baseUrl: string },
): Promise<boolean> {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
  else if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = `966${cleaned.substring(1)}`;
  else if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.substring(1);
  if (cleaned.length < 8) return false;

  return sendChatAmanTemplate({
    phone: `+${cleaned}`,
    template: {
      name: templateName,
      language: { code: 'ar' },
      components: bodyParams.length > 0
        ? [{ type: 'body', parameters: bodyParams.map(p => ({ type: 'text', text: p })) }]
        : [],
    },
  }, config);
}

export async function POST(req: NextRequest) {
  const authorization = await authorizeUser(req);
  if (!authorization.ok) return authorization.response;
  try {
    const body: DispatchPayload = await req.json();
    const { eventType, targetUserId, metadata } = body;

    if (!eventType || !targetUserId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ success: false, error: 'Unsupported event type' }, { status: 400 });
    }
    const target = await resolveTargetIdentity(targetUserId);
    if (!target) {
      return NextResponse.json({ success: false, error: 'Target account has no authenticated identity' }, { status: 404 });
    }

    const actor = await resolveActorIdentity(authorization.user.id);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Authenticated account identity not found' }, { status: 403 });
    }
    const actorId = actor.id;
    const actorName = actor.name;
    const actorAccountType = actor.accountType;
    const trustedPayload: DispatchPayload = { ...body, actorId, actorName, actorAccountType };

    if (target.authUid === authorization.user.id) {
      return NextResponse.json({ success: true, skipped: 'self' });
    }

    const dedupWindow =
      eventType === 'video_view'   ? 24 * 60 * 60 * 1000 :
      eventType === 'profile_view' ?  1 * 60 * 60 * 1000 : 0;

    if (dedupWindow > 0 && await hasDuplicateRecent(target.authUid, authorization.user.id, eventType, dedupWindow)) {
      return NextResponse.json({ success: true, skipped: 'duplicate' });
    }

    const content = buildInAppContent(trustedPayload);
    const db = getSupabaseAdmin();

    // 1. Create in-app notification
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const { error: notificationError } = await db.from('interaction_notifications').insert({
      id: crypto.randomUUID(),
      userId: target.authUid, profileOwnerId: target.authUid,
      viewerId: authorization.user.id, viewerName: actorName,
      viewerType: ACCOUNT_LABELS[actorAccountType] || actorAccountType,
      viewerAccountType: actorAccountType,
      type: eventType, title: content.title, message: content.message,
      emoji: content.emoji, isRead: false, priority: content.priority,
      metadata: { ...(metadata || {}), targetAccountId: target.accountId, actorAccountId: actorId }, createdAt: now, expiresAt,
    });
    if (notificationError) {
      return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 });
    }

    // 2. WhatsApp template
    let whatsappResult: 'sent' | 'skipped' | 'failed' = 'skipped';
    const [chatAmanConfig, templateConfig, phone] = await Promise.all([
      getChatAmanConfig(db), getTemplateConfig(db), getPhoneForUser(target.accountId),
    ]);

    if (chatAmanConfig && phone) {
      const tmpl = templateConfig[eventType];
      if (tmpl) {
        let recipientName = 'مستخدم';
        const nameLookups = [
          await db.from('users').select('full_name, name, displayName').eq('id', target.accountId).limit(1),
          await db.from('players').select('full_name, name').eq('id', target.accountId).limit(1),
          await db.from('clubs').select('full_name, name').eq('id', target.accountId).limit(1),
          await db.from('academies').select('full_name, name').eq('id', target.accountId).limit(1),
          await db.from('agents').select('full_name').eq('id', target.accountId).limit(1),
          await db.from('trainers').select('full_name').eq('id', target.accountId).limit(1),
          await db.from('marketers').select('full_name').eq('id', target.accountId).limit(1),
          await db.from('admins').select('name').eq('id', target.accountId).limit(1),
        ];
        for (const result of nameLookups) {
          if (result.error) throw result.error;
          if (!result.data?.length) continue;
          const row = result.data[0] as unknown as Record<string, unknown>;
          const name = String(row.full_name ?? row.displayName ?? row.name ?? '').trim();
          if (name) { recipientName = name; break; }
        }

        const paramMap: Record<string, string> = {
          recipientName, actorName,
          messagePreview: metadata?.messagePreview?.substring(0, 40) || '',
          commentText: metadata?.commentText?.substring(0, 40) || '',
        };
        const bodyParams = tmpl.params.map(p => paramMap[p] || p);
        const ok = await sendWhatsAppTemplate(phone, tmpl.templateName, bodyParams, chatAmanConfig);
        whatsappResult = ok ? 'sent' : 'failed';
      }
    }

    return NextResponse.json({ success: true, whatsapp: whatsappResult });
  } catch (error: unknown) {
    console.error('[dispatch] Error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
