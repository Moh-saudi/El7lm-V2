/**
 * Unified Notification Service - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';
import { normalizeNotificationPayload } from '@/lib/notifications/sender-utils';

export interface NotificationData {
  userId: string;
  type: 'interactive' | 'smart' | 'message' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  accountType: string;
  read?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MessageData {
  /** @deprecated Sender identity is derived from the authenticated session. */
  senderId?: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  priority: 'low' | 'medium' | 'high';
  senderName: string;
  senderAvatar?: string;
  receiverName?: string;
  receiverAvatar?: string;
  senderAccountType?: string;
  receiverAccountType?: string;
  read?: boolean;
  metadata?: Record<string, unknown>;
}

export class UnifiedNotificationService {

  static async createNotification(data: NotificationData): Promise<string> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError || new Error('Authentication required');

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const payload = normalizeNotificationPayload({
      id,
      ...data,
      senderId: authData.user.id,
      read: false,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) throw error;
    return id;
  }

  static async createMessage(data: MessageData): Promise<string> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError || new Error('Authentication required');

    let receiverId = '';
    for (const table of ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins'] as const) {
      const { data: receiver, error: receiverError } = await supabase
        .from(table)
        .select('uid')
        .or(`id.eq.${data.receiverId},uid.eq.${data.receiverId}`)
        .limit(1);
      if (receiverError) throw receiverError;
      if (!receiver?.length) continue;
      receiverId = String(receiver[0].uid ?? '').trim();
      if (receiverId) break;
    }
    if (!receiverId) throw new Error('Receiver has no authenticated identity');

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const messageData = { ...data };
    delete messageData.senderId;
    delete messageData.receiverId;
    const { error } = await supabase.from('messages').insert({
      id,
      ...messageData,
      senderId: authData.user.id,
      receiverId,
      read: false,
      isRead: false,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
    });
    if (error) throw error;
    return id;
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
