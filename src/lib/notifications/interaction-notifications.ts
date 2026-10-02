/**
 * Interaction Notification Service - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';

export interface InteractionNotification {
  id?: string;
  userId: string;
  viewerId: string;
  viewerName: string;
  viewerType: string;
  viewerAccountType: string;
  type: 'profile_view' | 'search_result' | 'connection_request' | 'message_sent' | 'follow' | 'video_like' | 'video_comment' | 'video_share' | 'video_view';
  title: string;
  message: string;
  emoji: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

const ACCOUNT_LABELS: Record<string, string> = {
  club: 'نادي', academy: 'أكاديمية', agent: 'وكيل',
  trainer: 'مدرب', player: 'لاعب', admin: 'مشرف', marketer: 'مسوق',
};

class InteractionNotificationService {

  async markAsRead(notificationId: string): Promise<void> {
    const { data, error } = await supabase.rpc('mark_interaction_notification_read', {
      p_notification_id: notificationId,
    });
    if (error) throw error;
    if (!data) throw new Error('Notification not found or not owned by current user');
  }

  subscribeToNotifications(userId: string, callback: (data: unknown[]) => void) {
    return supabase
      .channel(`interaction_notif:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interaction_notifications', filter: `userId=eq.${userId}` },
        async () => {
          const { data, error } = await supabase.from('interaction_notifications').select('*').eq('userId', userId).order('createdAt', { ascending: false }).limit(50);
          if (error) {
            console.error('[interaction-notifications] realtime refresh failed:', error);
            return;
          }
          callback(data ?? []);
        })
      .subscribe();
  }
}

export const interactionNotificationService = new InteractionNotificationService();
