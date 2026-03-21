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
 * Never throws; failures are silently swallowed so callers don't need try/catch.
 */
export async function dispatchNotification(opts: DispatchOptions): Promise<void> {
  try {
    await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
  } catch {
    // intentionally silent — notifications are non-critical
  }
}
