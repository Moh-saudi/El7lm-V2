/**
 * /api/notifications/dispatch
 *
 * Central server-side notification dispatcher.
 * Uses Firebase Admin SDK to bypass Firestore security rules.
 *
 * Does 3 things per event:
 *  1. Creates an in-app interaction_notification in Firestore
 *  2. Fetches the target user's phone and sends a WhatsApp template via ChatAman
 *  3. Returns result so caller can handle failures gracefully
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationEventType =
  | 'profile_view'
  | 'video_view'
  | 'video_like'
  | 'video_comment'
  | 'video_share'
  | 'message_received'
  | 'follow';

interface DispatchPayload {
  eventType: NotificationEventType;
  targetUserId: string;       // who receives the notification
  actorId: string;            // who triggered the event
  actorName: string;
  actorAccountType: string;
  metadata?: {
    videoId?: string;
    commentText?: string;
    messagePreview?: string;
    source?: string;
  };
}

// ─── In-app notification content per event ────────────────────────────────────

const ACCOUNT_LABELS: Record<string, string> = {
  player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
  agent: 'وكيل', trainer: 'مدرب', admin: 'مدير',
};

function buildInAppContent(payload: DispatchPayload) {
  const actorLabel = ACCOUNT_LABELS[payload.actorAccountType] || payload.actorAccountType;
  const actor = payload.actorName;

  const map: Record<NotificationEventType, { title: string; message: string; emoji: string; priority: string }> = {
    profile_view: {
      title: 'شخص مهتم بك! 👀',
      message: `${actorLabel} "${actor}" زار ملفك الشخصي`,
      emoji: '👀', priority: 'medium',
    },
    video_view: {
      title: 'مشاهدة جديدة لفيديوك! 🎬',
      message: `${actorLabel} "${actor}" شاهد أحد فيديوهاتك`,
      emoji: '🎬', priority: 'low',
    },
    video_like: {
      title: 'إعجاب بفيديوك! ❤️',
      message: `${actorLabel} "${actor}" أعجب بفيديوك`,
      emoji: '❤️', priority: 'medium',
    },
    video_comment: {
      title: 'تعليق جديد! 💬',
      message: `${actorLabel} "${actor}" علّق على فيديوك: "${payload.metadata?.commentText?.substring(0, 40) || ''}"`,
      emoji: '💬', priority: 'high',
    },
    video_share: {
      title: 'شارك فيديوك! 🔁',
      message: `${actorLabel} "${actor}" شارك أحد فيديوهاتك`,
      emoji: '🔁', priority: 'medium',
    },
    message_received: {
      title: 'رسالة جديدة! 💬',
      message: `${actorLabel} "${actor}" أرسل لك رسالة: "${payload.metadata?.messagePreview?.substring(0, 40) || ''}"`,
      emoji: '📩', priority: 'high',
    },
    follow: {
      title: 'متابع جديد! ⭐',
      message: `${actorLabel} "${actor}" بدأ متابعتك`,
      emoji: '⭐', priority: 'medium',
    },
  };

  return map[payload.eventType];
}

// ─── Deduplication check (Admin SDK) ─────────────────────────────────────────

async function hasDuplicateRecent(
  targetUserId: string, actorId: string, eventType: string, windowMs = 5 * 60 * 1000
): Promise<boolean> {
  try {
    const db = getAdminDb();
    const since = new Date(Date.now() - windowMs);
    const snap = await db.collection('interaction_notifications')
      .where('userId', '==', targetUserId)
      .where('viewerId', '==', actorId)
      .where('type', '==', eventType)
      .get();

    return snap.docs.some(d => {
      const ts = d.data().createdAt;
      if (!ts) return false;
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date > since;
    });
  } catch {
    return false;
  }
}

// ─── WhatsApp helpers (Admin SDK) ─────────────────────────────────────────────

async function getPhoneForUser(userId: string): Promise<string | null> {
  try {
    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(userId).get();
    if (userSnap.exists) {
      const phone = userSnap.data()?.phone || userSnap.data()?.phoneNumber;
      if (phone) return phone;
    }
    for (const col of ['players', 'clubs', 'academies', 'agents', 'trainers']) {
      const snap = await db.collection(col).doc(userId).get();
      if (snap.exists) {
        const phone = snap.data()?.phone || snap.data()?.phoneNumber;
        if (phone) return phone;
      }
    }
  } catch {}
  return null;
}

async function getChatAmanConfig(): Promise<{ apiKey: string; baseUrl: string; isActive: boolean } | null> {
  try {
    const db = getAdminDb();
    const snap = await db.collection('system_configs').doc('chataman_config').get();
    if (snap.exists) {
      const d = snap.data() as any;
      if (d.isActive && d.apiKey) return d;
    }
  } catch {}
  return null;
}

async function getTemplateConfig(): Promise<Record<string, { templateName: string; params: string[] } | null>> {
  const defaults: Record<string, { templateName: string; params: string[] } | null> = {
    profile_view:     { templateName: 'profile_notification',  params: ['recipientName', 'actorName'] },
    video_view:       { templateName: 'video_notfiation',    params: ['recipientName', 'actorName'] },
    video_like:       { templateName: 'video_notfiation',    params: ['recipientName', 'actorName'] },
    video_comment:    { templateName: 'video_notfiation',    params: ['recipientName', 'actorName'] },
    video_share:      { templateName: 'video_notfiation',    params: ['recipientName', 'actorName'] },
    message_received: { templateName: 'new_message_notification',        params: ['recipientName', 'actorName'] },
    follow:           null,
  };

  try {
    const db = getAdminDb();
    const snap = await db.collection('system_configs').doc('notification_templates').get();
    if (snap.exists) {
      const saved = snap.data() || {};
      const merged = { ...defaults };
      for (const [key, val] of Object.entries(saved)) {
        // Only override if explicitly set to a valid template — null means "not configured yet, use default"
        if (val && typeof val === 'object' && (val as any).templateName) {
          merged[key] = val as any;
        }
      }
      return merged;
    }
  } catch {}
  return defaults;
}

async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  bodyParams: string[],
  config: { apiKey: string; baseUrl: string },
  reqUrl: string,
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
        name: templateName,
        language: { code: 'ar' },
        components: bodyParams.length > 0 ? [{
          type: 'body',
          parameters: bodyParams.map(p => ({ type: 'text', text: p })),
        }] : [],
      },
    };

    const origin = new URL(reqUrl).origin;
    const proxyUrl = `${origin}/api/chataman/send-template`;

    console.log(`[dispatch] ── sendWhatsAppTemplate ──`);
    console.log(`[dispatch] phone raw: ${phone} → formatted: ${formattedPhone}`);
    console.log(`[dispatch] template: ${templateName}`);
    console.log(`[dispatch] bodyParams: [${bodyParams.join(', ')}]`);
    console.log(`[dispatch] proxy URL: ${proxyUrl}`);
    console.log(`[dispatch] chataman baseUrl: ${config.baseUrl}`);
    console.log(`[dispatch] chataman apiKey (first 10): ${config.apiKey.substring(0, 10)}...`);
    console.log(`[dispatch] full payload:`, JSON.stringify(whatsappPayload, null, 2));

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: whatsappPayload,
        apiKey: config.apiKey.trim(),
        baseUrl: config.baseUrl.trim(),
      }),
    });

    const responseText = await response.text().catch(() => '');
    console.log(`[dispatch] proxy HTTP status: ${response.status}`);
    console.log(`[dispatch] proxy raw response: ${responseText}`);

    let data: any = {};
    try { data = JSON.parse(responseText); } catch { data = {}; }

    if (!data.success) {
      console.error(`[dispatch] ChatAman proxy error:`, JSON.stringify(data));
      return false;
    }
    console.log(`[dispatch] ChatAman proxy success:`, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('[dispatch] sendWhatsAppTemplate error:', e);
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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

    // video_view: one WhatsApp per visitor per player per day (24h) regardless of how many videos watched
    // profile_view: 1 hour dedup
    const dedupWindow =
      eventType === 'video_view'   ? 24 * 60 * 60 * 1000 :
      eventType === 'profile_view' ?  1 * 60 * 60 * 1000 :
      0;
    if (dedupWindow > 0) {
      const isDuplicate = await hasDuplicateRecent(targetUserId, actorId, eventType, dedupWindow);
      if (isDuplicate) {
        return NextResponse.json({ success: true, skipped: 'duplicate' });
      }
    }

    const content = buildInAppContent(body);
    const db = getAdminDb();

    // ── 1. Create in-app notification ──
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.collection('interaction_notifications').add({
      userId: targetUserId,
      viewerId: actorId,
      viewerName: actorName,
      viewerType: ACCOUNT_LABELS[actorAccountType] || actorAccountType,
      viewerAccountType: actorAccountType,
      type: eventType,
      title: content.title,
      message: content.message,
      emoji: content.emoji,
      isRead: false,
      priority: content.priority,
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    // ── 2. WhatsApp template ──
    let whatsappResult: 'sent' | 'skipped' | 'failed' = 'skipped';
    const [chatAmanConfig, templateConfig, phone] = await Promise.all([
      getChatAmanConfig(),
      getTemplateConfig(),
      getPhoneForUser(targetUserId),
    ]);

    console.log(`[dispatch] ${eventType} → phone=${phone ?? 'NOT FOUND'} chataman=${chatAmanConfig ? 'active' : 'inactive'}`);

    if (!chatAmanConfig) {
      console.warn('[dispatch] ChatAman config not found or inactive');
    } else if (!phone) {
      console.warn(`[dispatch] Phone not found for user ${targetUserId}`);
    } else {
      const tmpl = templateConfig[eventType];
      if (!tmpl) {
        console.warn(`[dispatch] No template configured for event: ${eventType}`);
      } else {
        let recipientName = 'اللاعب';
        try {
          // Try users first, then all profile collections
          for (const col of ['users', 'players', 'clubs', 'academies', 'agents', 'trainers']) {
            const snap = await db.collection(col).doc(targetUserId).get();
            if (snap.exists) {
              const name = snap.data()?.full_name || snap.data()?.displayName || snap.data()?.name;
              if (name) { recipientName = name; break; }
            }
          }
        } catch {}

        const paramMap: Record<string, string> = {
          recipientName,
          actorName,
          messagePreview: metadata?.messagePreview?.substring(0, 40) || '',
          commentText: metadata?.commentText?.substring(0, 40) || '',
        };
        const bodyParams = tmpl.params.map(p => paramMap[p] || p);

        console.log(`[dispatch] Sending "${tmpl.templateName}" to ${phone} params=[${bodyParams.join(', ')}]`);
        const ok = await sendWhatsAppTemplate(phone, tmpl.templateName, bodyParams, chatAmanConfig, req.url);
        whatsappResult = ok ? 'sent' : 'failed';
        console.log(`[dispatch] WhatsApp result: ${whatsappResult}`);
      }
    }

    return NextResponse.json({ success: true, whatsapp: whatsappResult, _debug: { phone: phone || null, targetUserId } });
  } catch (error: any) {
    console.error('[dispatch] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
