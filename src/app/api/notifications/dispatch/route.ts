/**
 * /api/notifications/dispatch
 *
 * Central server-side notification dispatcher.
 * Called by any part of the system when an interaction event occurs.
 *
 * Does 3 things per event:
 *  1. Creates an in-app interaction_notification in Firestore
 *  2. Fetches the target user's phone and sends a WhatsApp template via ChatAman
 *  3. Returns result so caller can handle failures gracefully
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, Timestamp,
} from 'firebase/firestore';

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

// ─── Deduplication check ──────────────────────────────────────────────────────

async function hasDuplicateRecent(targetUserId: string, actorId: string, eventType: string, windowMs = 5 * 60 * 1000): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowMs);
    const q = query(
      collection(db, 'interaction_notifications'),
      where('userId', '==', targetUserId),
      where('viewerId', '==', actorId),
      where('type', '==', eventType),
    );
    const snap = await getDocs(q);
    return snap.docs.some(d => {
      const ts = d.data().createdAt;
      if (!ts) return false;
      const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
      return date > since;
    });
  } catch {
    return false;
  }
}

// ─── WhatsApp sending ─────────────────────────────────────────────────────────

async function getPhoneForUser(userId: string): Promise<string | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const phone = userSnap.data().phone || userSnap.data().phoneNumber;
      if (phone) return phone;
    }
    // Fallback: check players/clubs collections
    for (const col of ['players', 'clubs', 'academies', 'agents', 'trainers']) {
      const snap = await getDoc(doc(db, col, userId));
      if (snap.exists()) {
        const phone = snap.data().phone || snap.data().phoneNumber;
        if (phone) return phone;
      }
    }
  } catch {}
  return null;
}

async function getChatAmanConfig(): Promise<{ apiKey: string; baseUrl: string; isActive: boolean } | null> {
  try {
    const snap = await getDoc(doc(db, 'system_configs', 'chataman_config'));
    if (snap.exists()) {
      const d = snap.data();
      if (d.isActive && d.apiKey) return d as any;
    }
  } catch {}
  return null;
}

async function getTemplateConfig(): Promise<Record<string, { templateName: string; params: string[] } | null>> {
  // Default mapping — can be overridden by Firestore
  const defaults: Record<string, { templateName: string; params: string[] } | null> = {
    profile_view:     { templateName: 'profile_notification',  params: ['recipientName'] },
    video_view:       { templateName: 'profile_notification',  params: ['recipientName'] },
    message_received: { templateName: 'new_message_alert',     params: ['actorName'] },
    video_like:       null,
    video_comment:    null,
    video_share:      null,
    follow:           null,
  };

  try {
    const snap = await getDoc(doc(db, 'system_configs', 'notification_templates'));
    if (snap.exists()) {
      return { ...defaults, ...snap.data() };
    }
  } catch {}
  return defaults;
}

async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  bodyParams: string[],
  config: { apiKey: string; baseUrl: string },
): Promise<boolean> {
  try {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
    else if (cleaned.startsWith('1') && cleaned.length === 10) cleaned = `20${cleaned}`;
    const formattedPhone = `+${cleaned}`;

    const payload = {
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

    const cleanBaseUrl = config.baseUrl.trim().replace(/\/+$/, '');
    const response = await fetch(`${cleanBaseUrl}/api/send/template`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey.trim()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch {
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

    // Skip self-notifications
    if (targetUserId === actorId) {
      return NextResponse.json({ success: true, skipped: 'self' });
    }

    // Deduplication (5 min window for views, 0 for messages/likes)
    const dedupWindow = ['profile_view', 'video_view'].includes(eventType) ? 5 * 60 * 1000 : 0;
    if (dedupWindow > 0) {
      const isDuplicate = await hasDuplicateRecent(targetUserId, actorId, eventType, dedupWindow);
      if (isDuplicate) {
        return NextResponse.json({ success: true, skipped: 'duplicate' });
      }
    }

    const content = buildInAppContent(body);

    // ── 1. Create in-app notification ──
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await addDoc(collection(db, 'interaction_notifications'), {
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
      createdAt: serverTimestamp(),
      expiresAt,
    });

    // ── 2. WhatsApp template ──
    let whatsappResult: 'sent' | 'skipped' | 'failed' = 'skipped';
    const [chatAmanConfig, templateConfig, phone] = await Promise.all([
      getChatAmanConfig(),
      getTemplateConfig(),
      getPhoneForUser(targetUserId),
    ]);

    if (chatAmanConfig && phone) {
      const tmpl = templateConfig[eventType];
      if (tmpl) {
        // Get recipient name for templates that need it
        let recipientName = 'اللاعب';
        try {
          const targetSnap = await getDoc(doc(db, 'users', targetUserId));
          if (targetSnap.exists()) {
            recipientName = targetSnap.data().displayName || targetSnap.data().full_name || recipientName;
          }
        } catch {}

        const paramMap: Record<string, string> = {
          recipientName,
          actorName,
          messagePreview: metadata?.messagePreview?.substring(0, 40) || '',
          commentText: metadata?.commentText?.substring(0, 40) || '',
        };
        const bodyParams = tmpl.params.map(p => paramMap[p] || p);

        const ok = await sendWhatsAppTemplate(phone, tmpl.templateName, bodyParams, chatAmanConfig);
        whatsappResult = ok ? 'sent' : 'failed';
      }
    }

    return NextResponse.json({ success: true, whatsapp: whatsappResult });
  } catch (error: any) {
    console.error('[dispatch] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
