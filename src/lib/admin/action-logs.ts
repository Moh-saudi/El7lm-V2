/**
 * Action Log Service - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';
import { VideoActionLog, PlayerActionLog, VideoLogEntry, PlayerLogEntry } from '@/types/admin';

class ActionLogService {
  private static instance: ActionLogService;

  static getInstance(): ActionLogService {
    if (!ActionLogService.instance) {
      ActionLogService.instance = new ActionLogService();
    }
    return ActionLogService.instance;
  }

  async logVideoAction(logData: Omit<VideoActionLog, 'id' | 'timestamp'>): Promise<string> {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('video_action_logs').insert({
      id, ...logData, timestamp: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`✅ تم تسجيل إجراء الفيديو: ${logData.action} للفيديو ${logData.videoId}`);
    return id;
  }

  async logPlayerAction(logData: Omit<PlayerActionLog, 'id' | 'timestamp'>): Promise<string> {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('player_action_logs').insert({
      id, ...logData, timestamp: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`✅ تم تسجيل إجراء اللاعب: ${logData.action} للاعب ${logData.playerId}`);
    return id;
  }

  async getVideoLogs(videoId: string, limitCount = 50): Promise<VideoLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('video_action_logs')
        .select('*')
        .eq('videoId', videoId)
        .order('timestamp', { ascending: false })
        .limit(limitCount);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        videoId: String(row.videoId ?? ''),
        playerId: String(row.playerId ?? ''),
        playerName: String(row.playerName ?? 'مستخدم'),
        videoTitle: String(row.videoTitle ?? 'فيديو'),
        action: row.action as string,
        actionBy: row.actionBy as string,
        actionByType: row.actionByType as 'admin' | 'system' | 'player',
        timestamp: row.timestamp as string,
        status: String((row.details as Record<string, unknown>)?.newStatus ?? (row.details as Record<string, unknown>)?.oldStatus ?? 'غير محدد'),
        notes: String((row.details as Record<string, unknown>)?.notes ?? (row.details as Record<string, unknown>)?.adminNotes ?? ''),
        notificationSent: !!(row.details as Record<string, unknown>)?.notificationType,
        notificationType: (row.details as Record<string, unknown>)?.notificationType as 'sms' | 'whatsapp' | 'in_app' | undefined,
      }));
    } catch (error) {
      console.error('❌ خطأ في جلب سجل الفيديو:', error);
      return [];
    }
  }

  async getPlayerLogs(playerId: string, limitCount = 50): Promise<PlayerLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('player_action_logs')
        .select('*')
        .eq('playerId', playerId)
        .order('timestamp', { ascending: false })
        .limit(limitCount);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        playerId: String(row.playerId ?? ''),
        playerName: String(row.playerName ?? 'مستخدم'),
        action: row.action as string,
        actionBy: row.actionBy as string,
        actionByType: row.actionByType as 'admin' | 'system' | 'player',
        timestamp: row.timestamp as string,
        videoCount: (row.details as Record<string, unknown>)?.videoCount as number | undefined,
        videosAffected: (row.details as Record<string, unknown>)?.videosAffected as string[] | undefined,
        details: row.details,
      }));
    } catch (error) {
      console.error('❌ خطأ في جلب سجل اللاعب:', error);
      return [];
    }
  }

  async getAllVideoLogs(limitCount = 100): Promise<VideoLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('video_action_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limitCount);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        videoId: String(row.videoId ?? ''),
        playerId: String(row.playerId ?? ''),
        playerName: String(row.playerName ?? 'مستخدم'),
        videoTitle: String(row.videoTitle ?? 'فيديو'),
        action: row.action as string,
        actionBy: row.actionBy as string,
        actionByType: row.actionByType as 'admin' | 'system' | 'player',
        timestamp: row.timestamp as string,
        status: String((row.details as Record<string, unknown>)?.newStatus ?? (row.details as Record<string, unknown>)?.oldStatus ?? 'غير محدد'),
        notes: String((row.details as Record<string, unknown>)?.notes ?? (row.details as Record<string, unknown>)?.adminNotes ?? ''),
        notificationSent: !!(row.details as Record<string, unknown>)?.notificationType,
        notificationType: (row.details as Record<string, unknown>)?.notificationType as 'sms' | 'whatsapp' | 'in_app' | undefined,
      }));
    } catch (error) {
      console.error('❌ خطأ في جلب جميع سجلات الفيديوهات:', error);
      return [];
    }
  }

  async getAllPlayerLogs(limitCount = 100): Promise<PlayerLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('player_action_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limitCount);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        playerId: String(row.playerId ?? ''),
        playerName: String(row.playerName ?? 'مستخدم'),
        action: row.action as string,
        actionBy: row.actionBy as string,
        actionByType: row.actionByType as 'admin' | 'system' | 'player',
        timestamp: row.timestamp as string,
        videoCount: (row.details as Record<string, unknown>)?.videoCount as number | undefined,
        videosAffected: (row.details as Record<string, unknown>)?.videosAffected as string[] | undefined,
        details: row.details,
      }));
    } catch (error) {
      console.error('❌ خطأ في جلب جميع سجلات اللاعبين:', error);
      return [];
    }
  }

  async logVideoUpload(videoData: {
    videoId: string; playerId: string; playerName: string; videoTitle: string;
    actionBy: string; actionByType: 'admin' | 'system' | 'player';
  }): Promise<void> {
    await this.logVideoAction({
      videoId: videoData.videoId, playerId: videoData.playerId,
      action: 'upload', actionBy: videoData.actionBy, actionByType: videoData.actionByType,
      details: { newStatus: 'pending' },
      metadata: { playerName: videoData.playerName, videoTitle: videoData.videoTitle },
    });
    await this.logPlayerAction({
      playerId: videoData.playerId, action: 'video_upload',
      actionBy: videoData.actionBy, actionByType: videoData.actionByType,
      details: { videoId: videoData.videoId, videoTitle: videoData.videoTitle },
      metadata: { playerName: videoData.playerName },
    });
  }

  async logVideoReview(videoData: {
    videoId: string; playerId: string; playerName: string; videoTitle: string;
    oldStatus: string; newStatus: string; actionBy: string;
    actionByType: 'admin' | 'system' | 'player'; notes?: string; adminNotes?: string;
  }): Promise<void> {
    await this.logVideoAction({
      videoId: videoData.videoId, playerId: videoData.playerId,
      action: 'status_change', actionBy: videoData.actionBy, actionByType: videoData.actionByType,
      details: { oldStatus: videoData.oldStatus, newStatus: videoData.newStatus, notes: videoData.notes, adminNotes: videoData.adminNotes },
      metadata: { playerName: videoData.playerName, videoTitle: videoData.videoTitle },
    });
    await this.logPlayerAction({
      playerId: videoData.playerId, action: 'video_review',
      actionBy: videoData.actionBy, actionByType: videoData.actionByType,
      details: { videoId: videoData.videoId, videoTitle: videoData.videoTitle, oldStatus: videoData.oldStatus, newStatus: videoData.newStatus, adminNotes: videoData.adminNotes },
      metadata: { playerName: videoData.playerName },
    });
  }

  async logNotificationSent(videoData: {
    videoId: string; playerId: string; playerName: string; videoTitle: string;
    actionBy: string; actionByType: 'admin' | 'system' | 'player';
    notificationType: 'sms' | 'whatsapp' | 'in_app'; notificationMessage: string;
  }): Promise<void> {
    await this.logVideoAction({
      videoId: videoData.videoId, playerId: videoData.playerId,
      action: 'notification_sent', actionBy: videoData.actionBy, actionByType: videoData.actionByType,
      details: { notificationType: videoData.notificationType, notificationMessage: videoData.notificationMessage },
      metadata: { playerName: videoData.playerName, videoTitle: videoData.videoTitle },
    });
    await this.logPlayerAction({
      playerId: videoData.playerId, action: 'notification_sent',
      actionBy: videoData.actionBy, actionByType: videoData.actionByType,
      details: { videoId: videoData.videoId, videoTitle: videoData.videoTitle, notificationType: videoData.notificationType, notificationMessage: videoData.notificationMessage },
      metadata: { playerName: videoData.playerName },
    });
  }

  async ensureUploadLoggedAndNotified(params: {
    videoId: string; playerId: string; playerName: string; videoTitle: string;
    notificationTitle?: string; notificationMessage?: string;
  }): Promise<{ created: boolean }> {
    try {
      const { data } = await supabase
        .from('video_action_logs')
        .select('id, action')
        .eq('videoId', params.videoId)
        .limit(20);

      const hasUploadLog = (data ?? []).some((r: Record<string, unknown>) => r.action === 'upload');
      if (hasUploadLog) return { created: false };

      await this.logVideoUpload({
        videoId: params.videoId, playerId: params.playerId,
        playerName: params.playerName, videoTitle: params.videoTitle,
        actionBy: 'system', actionByType: 'system',
      });

      const notificationTitle = params.notificationTitle || 'تم رفع الفيديو';
      const notificationBody = params.notificationMessage || `تم رفع الفيديو "${params.videoTitle}" وهو الآن قيد المراجعة.`;
      const now = new Date().toISOString();

      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        userId: params.playerId,
        title: notificationTitle,
        body: notificationBody,
        type: 'video',
        senderName: 'النظام',
        senderId: 'system',
        senderType: 'system',
        link: '/dashboard/player/videos',
        isRead: false,
        createdAt: now,
        updatedAt: now,
        metadata: { videoId: params.videoId, event: 'upload' },
      });

      await this.logNotificationSent({
        videoId: params.videoId, playerId: params.playerId,
        playerName: params.playerName, videoTitle: params.videoTitle,
        actionBy: 'system', actionByType: 'system',
        notificationType: 'in_app', notificationMessage: notificationBody,
      });

      return { created: true };
    } catch (error) {
      console.error('❌ فشل ensureUploadLoggedAndNotified:', error);
      return { created: false };
    }
  }
}

export const actionLogService = ActionLogService.getInstance();
