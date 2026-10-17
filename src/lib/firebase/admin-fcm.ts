/**
 * Firebase Admin SDK — FCM Push Notification Dispatcher
 *
 * This module handles server-side FCM push notifications.
 * It reads Firebase service account credentials from environment variables
 * and sends push notifications to mobile devices via FCM HTTP v1 API.
 *
 * Required environment variable:
 *   FIREBASE_SERVICE_ACCOUNT_JSON — full JSON string of the service account key
 *   (Download from Firebase Console → Project Settings → Service Accounts)
 */

import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';

// ─── Singleton init ───────────────────────────────────────────────────────────

function getFirebaseAdminApp(): App {
  if (getApps().length > 0) return getApp();

  // 1. Try FIREBASE_SERVICE_ACCOUNT_JSON env var
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return initializeApp({ credential: cert(serviceAccount) });
    } catch (e) {
      console.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  // 2. Try individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey && projectId && !clientEmail.includes('your-project-name')) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // 3. Fallback: check for local file if in dev
  try {
    const fs = require('fs');
    const path = require('path');
    const localKeyPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(localKeyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      return initializeApp({ credential: cert(serviceAccount) });
    }
  } catch (_) {}

  throw new Error(
    '[FCM] No valid Firebase Admin credentials found. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_JSON or (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID).'
  );
}


// ─── Types ────────────────────────────────────────────────────────────────────

export interface FcmPayload {
  title: string;
  body: string;
  /** Optional deep-link URL opened when the user taps the notification */
  actionUrl?: string;
  /** Arbitrary key-value pairs forwarded to the app */
  data?: Record<string, string>;
}

export interface FcmDispatchResult {
  sent: number;
  failed: number;
  errors: string[];
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Sends a push notification to up to 500 FCM tokens at once.
 * FCM multicast limit is 500 tokens per request — callers must chunk if needed.
 */
async function sendMulticast(
  tokens: string[],
  payload: FcmPayload
): Promise<FcmDispatchResult> {
  if (tokens.length === 0) return { sent: 0, failed: 0, errors: [] };

  const app = getFirebaseAdminApp();
  const messaging = getMessaging(app);

  const data: Record<string, string> = {
    title: payload.title,
    body: payload.body,
    ...(payload.actionUrl ? { actionUrl: payload.actionUrl } : {}),
    ...(payload.data || {}),
  };

  const message: MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'el7lm_main',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
        // Clicking the notification opens the app
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          alert: { title: payload.title, body: payload.body },
          sound: 'default',
          badge: 1,
        },
      },
    },
    data,
  };

  const response = await messaging.sendEachForMulticast(message);

  const errors: string[] = [];
  response.responses.forEach((r, idx) => {
    if (!r.success) {
      errors.push(`Token[${idx}]: ${r.error?.message ?? 'unknown'}`);
    }
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
    errors,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a push notification to all provided FCM tokens.
 * Automatically chunks into batches of 500 (FCM multicast limit).
 *
 * @param fcmTokens  Array of raw FCM tokens from the `users.fcmToken` column
 * @param payload    Notification content
 */
export async function sendFcmPush(
  fcmTokens: string[],
  payload: FcmPayload
): Promise<FcmDispatchResult> {
  const validTokens = fcmTokens.filter(
    (t) => t && typeof t === 'string' && t.trim().length > 10
  );

  if (validTokens.length === 0) {
    return { sent: 0, failed: 0, errors: ['No valid FCM tokens provided'] };
  }

  const CHUNK = 500;
  let totalSent = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < validTokens.length; i += CHUNK) {
    const chunk = validTokens.slice(i, i + CHUNK);
    try {
      const result = await sendMulticast(chunk, payload);
      totalSent += result.sent;
      totalFailed += result.failed;
      allErrors.push(...result.errors);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[FCM] sendMulticast error:', msg);
      totalFailed += chunk.length;
      allErrors.push(msg);
    }
  }

  if (allErrors.length > 0) {
    console.warn(`[FCM] Dispatch complete — sent: ${totalSent}, failed: ${totalFailed}`, allErrors);
  }

  return { sent: totalSent, failed: totalFailed, errors: allErrors };
}
