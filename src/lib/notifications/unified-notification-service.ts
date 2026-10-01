/**
 * Unified Notification Service - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

export interface MessageData {
  /** @deprecated Sender identity is derived from the authenticated session. */
  senderId?: string;
  receiverId: string;
  content?: string;
  message?: string;
  type?: 'text' | 'image' | 'file' | 'voice' | 'system';
  messageType?: string;
  priority?: 'low' | 'medium' | 'high';
  /** @deprecated Sender display identity is derived from the authenticated account. */
  senderName?: string;
  senderType?: string;
  senderAvatar?: string;
  receiverName?: string;
  receiverAvatar?: string;
  senderAccountType?: string;
  receiverAccountType?: string;
  conversationId?: string;
  subject?: string | null;
  imageUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  isPinned?: boolean;
  deliveryStatus?: string;
  read?: boolean;
  metadata?: Record<string, unknown>;
}

export class UnifiedNotificationService {

  static async createMessage(data: MessageData): Promise<string> {
    const content = String(data.content ?? data.message ?? '').trim();
    if (!content) throw new Error('Message content is required');

    const response = await authenticatedFetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: data.receiverId,
        conversationId: data.conversationId,
        content,
        type: data.type,
        messageType: data.messageType,
        priority: data.priority,
        subject: data.subject,
        imageUrl: data.imageUrl,
        voiceUrl: data.voiceUrl,
        voiceDuration: data.voiceDuration,
        isPinned: data.isPinned,
        metadata: data.metadata,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success || !result?.id) {
      throw new Error(result?.error || `Failed to send message (${response.status})`);
    }

    return String(result.id);
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });
    if (error) throw error;
    if (!data) throw new Error('Notification not found or not owned by current user');
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    const { data, error } = await supabase.rpc('mark_message_read', {
      p_message_id: messageId,
    });
    if (error) throw error;
    if (!data) throw new Error('Message not found or not owned by current receiver');
  }

  static async getNotificationStats(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('type, priority, read')
      .eq('userId', userId);

    if (error) throw error;

    const stats = { total: 0, unread: 0, interactive: 0, smart: 0, system: 0, high: 0, medium: 0, low: 0 };

    (data || []).forEach((n) => {
      stats.total++;
      if (!n.read) stats.unread++;
      if (n.type === 'interactive') stats.interactive++;
      if (n.type === 'smart') stats.smart++;
      if (n.type === 'system') stats.system++;
      if (n.priority === 'high') stats.high++;
      if (n.priority === 'medium') stats.medium++;
      if (n.priority === 'low') stats.low++;
    });

    return stats;
  }

  static async getUserNotifications(userId: string, limitCount = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return data ?? [];
  }

  static async getUserMessages(userId: string, limitCount = 20) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order('createdAt', { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Realtime subscription - يحل محل onSnapshot
   */
  static subscribeToNotifications(userId: string, callback: (notifications: unknown[]) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${userId}` },
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false })
            .limit(50);
          callback(data ?? []);
        }
      )
      .subscribe();
  }

  static subscribeToMessages(userId: string, callback: (messages: unknown[]) => void) {
    return supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `receiverId=eq.${userId}` },
        async () => {
          const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
            .order('createdAt', { ascending: false })
            .limit(50);
          callback(data ?? []);
        }
      )
      .subscribe();
  }
}

export default UnifiedNotificationService;
