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
  content?: string;
  message?: string;
  type?: 'text' | 'image' | 'file' | 'voice' | 'system';
  messageType?: string;
  priority?: 'low' | 'medium' | 'high';
  senderName: string;
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

  static async resolveAuthUserId(identifier: string): Promise<string> {
    const matches = new Set<string>();
    for (const table of ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins'] as const) {
      const byId = await supabase.from(table).select('uid').eq('id', identifier).limit(1);
      if (byId.error) throw byId.error;
      if (byId.data?.[0]?.uid) matches.add(String(byId.data[0].uid).trim());

      const byUid = await supabase.from(table).select('uid').eq('uid', identifier).limit(1);
      if (byUid.error) throw byUid.error;
      if (byUid.data?.[0]?.uid) matches.add(String(byUid.data[0].uid).trim());
    }
    matches.delete('');
    if (matches.size === 0) throw new Error('Target has no authenticated identity');
    if (matches.size > 1) throw new Error('Target identity is ambiguous');
    return [...matches][0];
  }

  private static async resolveSenderProfile(authUserId: string): Promise<{ name: string; accountType: string }> {
    const matches: Array<{ table: string; name: string; accountType: string }> = [];
    const candidates = [
      { table: 'players', accountType: 'player' },
      { table: 'clubs', accountType: 'club' },
      { table: 'academies', accountType: 'academy' },
      { table: 'agents', accountType: 'agent' },
      { table: 'trainers', accountType: 'trainer' },
      { table: 'marketers', accountType: 'marketer' },
      { table: 'admins', accountType: 'admin' },
      { table: 'users', accountType: 'user' },
    ] as const;

    for (const candidate of candidates) {
      const query = supabase.from(candidate.table);
      let result;
      switch (candidate.table) {
        case 'players': result = await query.select('uid, full_name, name').eq('uid', authUserId).limit(2); break;
        case 'clubs': result = await query.select('uid, full_name, name').eq('uid', authUserId).limit(2); break;
        case 'academies': result = await query.select('uid, full_name, name').eq('uid', authUserId).limit(2); break;
        case 'agents': result = await query.select('uid, full_name').eq('uid', authUserId).limit(2); break;
        case 'trainers': result = await query.select('uid, full_name').eq('uid', authUserId).limit(2); break;
        case 'marketers': result = await query.select('uid, full_name').eq('uid', authUserId).limit(2); break;
        case 'admins': result = await query.select('uid, name').eq('uid', authUserId).limit(2); break;
        case 'users': result = await query.select('uid, full_name, name, displayName').eq('uid', authUserId).limit(2); break;
      }

      if (result.error) throw result.error;
      if ((result.data?.length ?? 0) > 1) throw new Error('Authenticated sender identity is ambiguous');
      if (!result.data?.length) continue;

      const row = result.data[0] as unknown as Record<string, unknown>;
      if (String(row.uid ?? '').trim() !== authUserId) continue;
      const name = String(row.full_name ?? row.displayName ?? row.name ?? '').trim() || 'مستخدم';
      matches.push({ table: candidate.table, name, accountType: candidate.accountType });
    }

    const roleMatches = matches.filter(match => match.table !== 'users');
    if (roleMatches.length > 1) throw new Error('Authenticated sender identity is ambiguous');
    if (roleMatches.length === 1) {
      return { name: roleMatches[0].name, accountType: roleMatches[0].accountType };
    }

    if (matches.length !== 1) throw new Error('Authenticated sender identity not found');
    return { name: matches[0].name, accountType: matches[0].accountType };
  }

  static async createNotification(data: NotificationData): Promise<string> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError || new Error('Authentication required');

    const targetUserId = await this.resolveAuthUserId(data.userId);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const payload = normalizeNotificationPayload({
      id,
      ...data,
      userId: targetUserId,
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

    const [receiverId, senderProfile] = await Promise.all([
      this.resolveAuthUserId(data.receiverId),
      this.resolveSenderProfile(authData.user.id),
    ]);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const messageData = { ...data };
    delete messageData.senderId;
    delete messageData.receiverId;
    delete messageData.senderName;
    delete messageData.senderType;
    delete messageData.senderAccountType;
    const content = String(data.content ?? data.message ?? '').trim();
    if (!content) throw new Error('Message content is required');
    const { error } = await supabase.from('messages').insert({
      id,
      ...messageData,
      content,
      message: content,
      type: data.type ?? 'text',
      priority: data.priority ?? 'medium',
      senderId: authData.user.id,
      senderName: senderProfile.name,
      senderType: senderProfile.accountType,
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
