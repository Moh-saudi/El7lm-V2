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
  senderId: string;
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
    const now = new Date().toISOString();
    const payload = normalizeNotificationPayload({
      ...data,
      read: false,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    const id = crypto.randomUUID();
    const { error } = await supabase.from('notifications').insert({ id, ...payload });
    if (error) throw error;
    return id;
  }

  static async createMessage(data: MessageData): Promise<string> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const { error } = await supabase.from('messages').insert({
      id,
      ...data,
      read: false,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
    });
    if (error) throw error;
    return id;
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, isRead: true, updatedAt: new Date().toISOString() })
      .eq('id', notificationId);
    if (error) throw error;
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read: true, isRead: true, updatedAt: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw error;
  }

  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, isRead: true, updatedAt: new Date().toISOString() })
      .eq('userId', userId)
      .eq('read', false);
    if (error) throw error;
  }

  static async markAllMessagesAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read: true, isRead: true, updatedAt: new Date().toISOString() })
      .eq('receiverId', userId)
      .eq('read', false);
    if (error) throw error;
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) throw error;
  }

  static async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
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
