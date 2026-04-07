import { UnifiedNotificationService } from '@/lib/notifications/unified-notification-service';
import { supabase } from '@/lib/supabase/config';

export async function notifyNewApplication(
  organizerId: string,
  organizerType: string,
  playerName: string,
  opportunityTitle: string,
  opportunityId: string
): Promise<void> {
  await UnifiedNotificationService.createNotification({
    userId: organizerId,
    type: 'interactive',
    title: 'طلب تقديم جديد',
    message: `${playerName} تقدم لفرصتك: ${opportunityTitle}`,
    priority: 'high',
    actionUrl: `/dashboard/opportunities/${opportunityId}/applications`,
    accountType: organizerType,
  });
}

export async function notifyApplicationAccepted(
  playerId: string,
  opportunityTitle: string,
  organizerName: string
): Promise<void> {
  await UnifiedNotificationService.createNotification({
    userId: playerId,
    type: 'interactive',
    title: 'تم قبول طلبك!',
    message: `قبلت ${organizerName} طلبك للانضمام إلى: ${opportunityTitle}`,
    priority: 'high',
    actionUrl: '/dashboard/opportunities',
    accountType: 'player',
  });
}

/**
 * Writes a single document to `broadcasts` table.
 */
export async function broadcastNewOpportunity(params: {
  opportunityId: string;
  opportunityTitle: string;
  opportunityType: string;
  organizerName: string;
  organizerType: string;
}): Promise<void> {
  await supabase.from('broadcasts').insert({
    id: crypto.randomUUID(),
    opportunityId: params.opportunityId,
    opportunityTitle: params.opportunityTitle,
    opportunityType: params.opportunityType,
    organizerName: params.organizerName,
    organizerType: params.organizerType,
    createdAt: new Date().toISOString(),
    actionUrl: '/dashboard/opportunities',
  });
}

export async function notifyApplicationRejected(
  playerId: string,
  opportunityTitle: string,
  organizerName: string
): Promise<void> {
  await UnifiedNotificationService.createNotification({
    userId: playerId,
    type: 'interactive',
    title: 'تحديث على طلبك',
    message: `${organizerName} اتخذ قراراً بشأن طلبك لـ: ${opportunityTitle}`,
    priority: 'medium',
    actionUrl: '/dashboard/opportunities',
    accountType: 'player',
  });
}
