/**
 * Client-side wrapper around /api/notifications/dispatch
 *
 * Use this instead of calling interactionNotificationService directly.
 * Works from any page — video player, search, profile, etc.
 */

export type NotificationEventType =
  | 'profile_view'
  | 'video_view'
  | 'video_like'
  | 'video_comment'
  | 'video_share'
  | 'message_received'
  | 'follow';

export interface DispatchOptions {
  eventType: NotificationEventType;
  targetUserId: string;
  actorId: string;
  actorName: string;
  actorAccountType: string;
  metadata?: {
    videoId?: string;
    commentText?: string;
    messagePreview?: string;
    source?: string;
  };
}

/**
 * Fire-and-forget — sends a notification event to the central dispatcher.
 * Logs the result in dev; never throws.
 */
export async function dispatchNotification(opts: DispatchOptions): Promise<void> {
  try {
    const res = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const data = await res.json().catch(() => ({}));
    if (process.env.NODE_ENV === 'development') {
      if (data.skipped) {
        console.log(`[notify] ${opts.eventType} skipped (${data.skipped})`);
      } else if (data.whatsapp === 'sent') {
        console.log(`[notify] ✅ ${opts.eventType} — in-app ✓ whatsapp ✓ → phone: ${data._debug?.phone ?? 'unknown'}`);
      } else if (data.whatsapp === 'failed') {
        console.warn(`[notify] ⚠️ ${opts.eventType} — in-app ✓ whatsapp ✗ → phone: ${data._debug?.phone ?? 'NOT FOUND'}`);
      } else {
        console.log(`[notify] ${opts.eventType} →`, data);
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[notify] fetch failed:', e);
    }
  }
}
