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

  private getLabel(accountType: string): string {
    return ACCOUNT_LABELS[accountType] || accountType;
  }

  private randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async insertNotification(notification: Omit<InteractionNotification, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('interaction_notifications').insert({
      id,
      ...notification,
      createdAt: new Date().toISOString(),
    });
    if (error) throw error;
    return id;
  }

  async sendProfileViewNotification(
    profileOwnerId: string,
    viewerId: string,
    viewerName: string,
    viewerType: string,
    viewerAccountType: string,
    profileType = 'player'
  ): Promise<string> {
    if (profileOwnerId === viewerId) return '';

    const msg = this.randomItem([
      { title: 'شخص مهتم بك! 👀', message: `${this.getLabel(viewerAccountType)} يطلع عليك! أمامك خطوة للاحتراف 🚀`, emoji: '👀' },
      { title: 'مشاهدة جديدة! ⭐', message: `${this.getLabel(viewerAccountType)} اكتشف موهبتك! تميزك واضح ⭐`, emoji: '⭐' },
      { title: 'فرصة ذهبية! 🔥', message: `${this.getLabel(viewerAccountType)} يتابعك! خطوة للاحتراف 🏆`, emoji: '🔥' },
      { title: 'انتباه احترافي! ✨', message: `${this.getLabel(viewerAccountType)} معجب بك! النجاح قريب ✨`, emoji: '✨' },
    ]);

    return this.insertNotification({
      userId: profileOwnerId, viewerId, viewerName, viewerType, viewerAccountType,
      type: 'profile_view', title: msg.title, message: msg.message, emoji: msg.emoji,
      isRead: false, priority: 'medium',
      actionUrl: `/dashboard/${profileType}/profile`,
      metadata: { profileType, interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendSearchResultNotification(
    profileOwnerId: string,
    viewerId: string,
    viewerName: string,
    viewerType: string,
    viewerAccountType: string,
    searchTerm: string,
    rank: number
  ): Promise<string> {
    const msg = this.randomItem([
      { title: 'تم العثور عليك! 🔍', message: `شخص يبحث عن '${searchTerm}' وجدك في المرتبة ${rank}! ⭐`, emoji: '🔍' },
      { title: 'نتيجة بحث مميزة! 🎯', message: `أنت في المرتبة ${rank} لبحث '${searchTerm}'. 🏆`, emoji: '🎯' },
      { title: 'اكتشاف جديد! 💎', message: `${viewerName} يبحث عن '${searchTerm}' ووجدك! ✨`, emoji: '💎' },
    ]);

    return this.insertNotification({
      userId: profileOwnerId, viewerId, viewerName, viewerType, viewerAccountType,
      type: 'search_result', title: msg.title, message: msg.message, emoji: msg.emoji,
      isRead: false, priority: 'high',
      actionUrl: `/dashboard/player/search`,
      metadata: { searchTerm, searchRank: rank, interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendConnectionRequestNotification(
    targetUserId: string,
    requesterId: string,
    requesterName: string,
    requesterType: string,
    requesterAccountType: string
  ): Promise<string> {
    const msg = this.randomItem([
      { title: 'طلب تواصل جديد! 🤝', message: `${requesterName} من ${this.getLabel(requesterAccountType)} يريد التواصل معك. 🚀`, emoji: '🤝' },
      { title: 'اهتمام احترافي! 💼', message: `${requesterName} يبحث عن التعاون معك. ⭐`, emoji: '💼' },
      { title: 'فرصة جديدة! 🌟', message: `${requesterName} يريد التواصل معك. 💎`, emoji: '🌟' },
    ]);

    return this.insertNotification({
      userId: targetUserId, viewerId: requesterId, viewerName: requesterName,
      viewerType: requesterType, viewerAccountType: requesterAccountType,
      type: 'connection_request', title: msg.title, message: msg.message, emoji: msg.emoji,
      isRead: false, priority: 'high',
      actionUrl: `/dashboard/messages`,
      metadata: { interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendMessageNotification(
    receiverId: string,
    senderId: string,
    senderName: string,
    senderType: string,
    senderAccountType: string,
    messagePreview: string
  ): Promise<string> {
    const preview = messagePreview.substring(0, 30);
    const msg = this.randomItem([
      { title: 'رسالة جديدة! 💬', message: `${senderName} من ${this.getLabel(senderAccountType)} أرسل لك: "${preview}..."`, emoji: '💬' },
      { title: 'تواصل جديد! 📱', message: `رسالة من ${senderName}: "${preview}..."`, emoji: '📱' },
    ]);

    return this.insertNotification({
      userId: receiverId, viewerId: senderId, viewerName: senderName,
      viewerType: senderType, viewerAccountType: senderAccountType,
      type: 'message_sent', title: msg.title, message: msg.message, emoji: msg.emoji,
      isRead: false, priority: 'high',
      actionUrl: `/dashboard/messages`,
      metadata: { messagePreview, interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendVideoLikeNotification(videoOwnerId: string, actorId: string, actorName: string, actorType: string, actorAccountType: string, videoId: string): Promise<string> {
    return this.insertNotification({
      userId: videoOwnerId, viewerId: actorId, viewerName: actorName, viewerType: actorType, viewerAccountType: actorAccountType,
      type: 'video_like', title: 'إعجاب جديد على فيديوك ❤️',
      message: `${actorName} (${this.getLabel(actorAccountType)}) أعجب بفيديوك`,
      emoji: '❤️', isRead: false, priority: 'medium',
      actionUrl: `/dashboard/shared/videos`,
      metadata: { videoId, interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendVideoCommentNotification(videoOwnerId: string, actorId: string, actorName: string, actorType: string, actorAccountType: string, videoId: string, commentText: string): Promise<string> {
    return this.insertNotification({
      userId: videoOwnerId, viewerId: actorId, viewerName: actorName, viewerType: actorType, viewerAccountType: actorAccountType,
      type: 'video_comment', title: 'تعليق جديد على فيديوك 💬',
      message: `${actorName} علّق: "${commentText.substring(0, 50)}"`,
      emoji: '💬', isRead: false, priority: 'high',
      actionUrl: `/dashboard/shared/videos`,
      metadata: { videoId, commentText, interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendVideoShareNotification(videoOwnerId: string, actorId: string, actorName: string, actorType: string, actorAccountType: string, videoId: string): Promise<string> {
    return this.insertNotification({
      userId: videoOwnerId, viewerId: actorId, viewerName: actorName, viewerType: actorType, viewerAccountType: actorAccountType,
      type: 'video_share', title: 'تمت مشاركة فيديوك 🔗',
      message: `${actorName} (${this.getLabel(actorAccountType)}) شارك فيديوك`,
      emoji: '🔗', isRead: false, priority: 'medium',
      actionUrl: `/dashboard/shared/videos`,
      metadata: { videoId, interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendVideoViewNotification(videoOwnerId: string, actorId: string, actorName: string, actorType: string, actorAccountType: string, videoId: string): Promise<string> {
    return this.insertNotification({
      userId: videoOwnerId, viewerId: actorId, viewerName: actorName, viewerType: actorType, viewerAccountType: actorAccountType,
      type: 'video_view', title: 'شخص شاهد فيديوك 👀',
      message: `${actorName} (${this.getLabel(actorAccountType)}) شاهد فيديوك`,
      emoji: '👀', isRead: false, priority: 'low',
      actionUrl: `/dashboard/shared/videos`,
      metadata: { videoId, interactionTime: Date.now() },
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await supabase.from('interaction_notifications').update({ isRead: true }).eq('id', notificationId);
  }

  async cleanupExpiredNotifications(): Promise<void> {
    await supabase.from('interaction_notifications').delete().lt('expiresAt', new Date().toISOString());
  }

  subscribeToNotifications(userId: string, callback: (data: unknown[]) => void) {
    return supabase
      .channel(`interaction_notif:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interaction_notifications', filter: `userId=eq.${userId}` },
        async () => {
          const { data } = await supabase.from('interaction_notifications').select('*').eq('userId', userId).order('createdAt', { ascending: false }).limit(50);
          callback(data ?? []);
        })
      .subscribe();
  }
}

export const interactionNotificationService = new InteractionNotificationService();
