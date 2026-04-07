/**
 * /api/notifications/dispatch - Supabase Edition
 * Central server-side notification dispatcher.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type NotificationEventType =
  | 'profile_view' | 'video_view' | 'video_like' | 'video_comment'
  | 'video_share' | 'message_received' | 'follow';

interface DispatchPayload {
  eventType: NotificationEventType;
  targetUserId: string;
  actorId: string;
  actorName: string;
  actorAccountType: string;
  metadata?: { videoId?: string; commentText?: string; messagePreview?: string; source?: string };
}

const ACCOUNT_LABELS: Record<string, string> = {
  player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
  agent: 'وكيل', trainer: 'مدرب', admin: 'مدير',
};

function buildInAppContent(payload: DispatchPayload) {
  const actorLabel = ACCOUNT_LABELS[payload.actorAccountType] || payload.actorAccountType;
  const actor = payload.actorName;

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

async function hasDuplicateRecent(
  targetUserId: string, actorId: string, eventType: string, windowMs: number
): Promise<boolean> {
  try {
    const db = getSupabaseAdmin();
    const since = new Date(Date.now() - windowMs).toISOString();
    const { data } = await db
      .from('interaction_notifications')
      .select('createdAt')
      .eq('userId', targetUserId)
      .eq('viewerId', actorId)
      .eq('type', eventType)
      .gt('createdAt', since)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch { return false; }
}

async function getPhoneForUser(userId: string): Promise<string | null> {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db.from('users').select('phone, phoneNumber').eq('id', userId).limit(1);
    if (data?.length) {
      const row = data[0] as Record<string, unknown>;
      if (row.phone) return String(row.phone);
      if (row.phoneNumber) return String(row.phoneNumber);
    }
    for (const col of ['players', 'clubs', 'academies', 'agents', 'trainers']) {
      const { data: rows } = await db.from(col).select('phone, phoneNumber').eq('id', userId).limit(1);
      if (rows?.length) {
        const r = rows[0] as Record<string, unknown>;
        if (r.phone) return String(r.phone);
        if (r.phoneNumber) return String(r.phoneNumber);
      }
    }
  } catch {}
  return null;
}

async function getChatAmanConfig(db: ReturnType<typeof getSupabaseAdmin>): Promise<{ apiKey: string; baseUrl: string; isActive: boolean } | null> {
  try {
    const { data } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);
    if (data?.length) {
      const d = data[0] as Record<string, unknown>;
      if (d.isActive && d.apiKey) return d as { apiKey: string; baseUrl: string; isActive: boolean };
    }
  } catch {}
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

  try {
    const { data } = await db.from('system_configs').select('*').eq('id', 'notification_templates').limit(1);
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
  } catch {}
  return defaults;
}

async function sendWhatsAppTemplate(
  phone: string, templateName: string, bodyParams: string[],
  config: { apiKey: string; baseUrl: string }, reqUrl: string,
): Promise<boolean> {
  try {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
    else if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = `966${cleaned.substring(1)}`;
    else if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.substring(1);
    const formattedPhone = `+${cleaned}`;

    const whatsappPayload = {
      phone: formattedPhone,
      template: {
        name: templateName, language: { code: 'ar' },
        components: bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams.map(p => ({ type: 'text', text: p })) }] : [],
      },
    };

    const origin = new URL(reqUrl).origin;
    const response = await fetch(`${origin}/api/chataman/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: whatsappPayload, apiKey: config.apiKey.trim(), baseUrl: config.baseUrl.trim() }),
    });

    const data = await response.json().catch(() => ({}));
    return !!data.success;
  } catch (e) {
    console.error('[dispatch] sendWhatsAppTemplate error:', e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: DispatchPayload = await req.json();
    const { eventType, targetUserId, actorId, actorName, actorAccountType, metadata } = body;

    if (!eventType || !targetUserId || !actorId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (targetUserId === actorId) {
      return NextResponse.json({ success: true, skipped: 'self' });
    }

    const dedupWindow =
      eventType === 'video_view'   ? 24 * 60 * 60 * 1000 :
      eventType === 'profile_view' ?  1 * 60 * 60 * 1000 : 0;

    if (dedupWindow > 0 && await hasDuplicateRecent(targetUserId, actorId, eventType, dedupWindow)) {
      return NextResponse.json({ success: true, skipped: 'duplicate' });
    }

    const content = buildInAppContent(body);
    const db = getSupabaseAdmin();

    // 1. Create in-app notification
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    await db.from('interaction_notifications').insert({
      id: crypto.randomUUID(),
      userId: targetUserId, viewerId: actorId, viewerName: actorName,
      viewerType: ACCOUNT_LABELS[actorAccountType] || actorAccountType,
      viewerAccountType: actorAccountType,
      type: eventType, title: content.title, message: content.message,
      emoji: content.emoji, isRead: false, priority: content.priority,
      metadata: metadata || {}, createdAt: now, expiresAt,
    });

    // 2. WhatsApp template
    let whatsappResult: 'sent' | 'skipped' | 'failed' = 'skipped';
    const [chatAmanConfig, templateConfig, phone] = await Promise.all([
      getChatAmanConfig(db), getTemplateConfig(db), getPhoneForUser(targetUserId),
    ]);

    if (chatAmanConfig && phone) {
      const tmpl = templateConfig[eventType];
      if (tmpl) {
        // Get recipient name
        let recipientName = 'اللاعب';
        try {
          for (const col of ['users', 'players', 'clubs', 'academies', 'agents', 'trainers']) {
            const { data } = await db.from(col).select('full_name, name, displayName').eq('id', targetUserId).limit(1);
            if (data?.length) {
              const r = data[0] as Record<string, unknown>;
              const name = String(r.full_name ?? r.displayName ?? r.name ?? '');
              if (name) { recipientName = name; break; }
            }
          }
        } catch {}

        const paramMap: Record<string, string> = {
          recipientName, actorName,
          messagePreview: metadata?.messagePreview?.substring(0, 40) || '',
          commentText: metadata?.commentText?.substring(0, 40) || '',
        };
        const bodyParams = tmpl.params.map(p => paramMap[p] || p);
        const ok = await sendWhatsAppTemplate(phone, tmpl.templateName, bodyParams, chatAmanConfig, req.url);
        whatsappResult = ok ? 'sent' : 'failed';
      }
    }

    return NextResponse.json({ success: true, whatsapp: whatsappResult, _debug: { phone: phone || null, targetUserId } });
  } catch (error: unknown) {
    console.error('[dispatch] Error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
