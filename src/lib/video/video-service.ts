/**
 * VideoService — Unified entry point for all video operations.
 *
 * Responsibilities:
 *  1. Upload video file to Cloudflare R2
 *  2. Save full metadata record to `player_videos` table
 *  3. Optionally queue the video for AI analysis
 *  4. Provide CRUD operations on video records
 */

import { storageManager } from '@/lib/storage';
import { supabase } from '@/lib/supabase/config';
import type {
  PlayerVideo,
  VideoUploadInput,
  VideoUploadResult,
  VideoAnalysisStatus,
  VideoAnalysisResult,
  VideoCategory,
} from './types';

// ──────────────────────────────────────────────
// Bucket & path helpers
// ──────────────────────────────────────────────

const ACCOUNT_TYPE_BUCKET: Record<string, string> = {
  independent: 'avatars',
  club: 'playerclub',
  trainer: 'playertrainer',
  agent: 'playeragent',
  academy: 'playeracademy',
};

function resolveBucket(accountType?: string): string {
  return ACCOUNT_TYPE_BUCKET[accountType || 'independent'] ?? 'avatars';
}

function buildStoragePath(
  ownerId: string,
  playerId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const ext = fileName.split('.').pop() ?? 'mp4';
  const safeName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 60);
  return `videos/${ownerId}/${playerId}/${timestamp}_${safeName}.${ext}`;
}

// ──────────────────────────────────────────────
// VideoService class
// ──────────────────────────────────────────────

export class VideoService {

  // ── Upload + save ──────────────────────────────────────────────────────────

  async upload(input: VideoUploadInput): Promise<VideoUploadResult> {
    const {
      file,
      playerId,
      title,
      description,
      category,
      tags,
      ownerId = playerId,
      accountType = 'independent',
      autoQueueAnalysis = false,
    } = input;

    // 1. Validate
    this.validateVideoFile(file);

    // 2. Build storage path
    const bucket = resolveBucket(accountType);
    const storagePath = buildStoragePath(ownerId, playerId, file.name);

    // 3. Upload to R2
    const uploadResult = await storageManager.upload(bucket, storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

    // 4. Build DB record
    const now = new Date().toISOString();
    const videoId = crypto.randomUUID();

    const record: PlayerVideo = {
      id: videoId,
      playerId,
      title: title.trim(),
      description: description?.trim(),
      category: category ?? 'other',
      tags: tags ?? [],
      videoUrl: uploadResult.publicUrl,
      storagePath,
      fileName: file.name,
      thumbnail: '/images/video-placeholder.png',
      fileSize: file.size,
      mimeType: file.type,
      duration: 0,
      resolution: undefined,
      status: 'pending',
      analysisStatus: autoQueueAnalysis ? 'queued' : 'not_queued',
      views: 0,
      likes: 0,
      pointsEarned: 0,
      createdAt: now,
      updatedAt: now,
    };

    // 5. Save to Supabase
    const { error } = await supabase.from('player_videos').insert(record);
    if (error) throw new Error(`Failed to save video record: ${error.message}`);

    return { video: record, uploadUrl: uploadResult.publicUrl };
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async getByPlayer(playerId: string): Promise<PlayerVideo[]> {
    const { data, error } = await supabase
      .from('player_videos')
      .select('*')
      .eq('playerId', playerId)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as PlayerVideo[];
  }

  async getById(videoId: string): Promise<PlayerVideo | null> {
    const { data, error } = await supabase
      .from('player_videos')
      .select('*')
      .eq('id', videoId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as PlayerVideo | null;
  }

  // ── Analysis queue ─────────────────────────────────────────────────────────

  async queueForAnalysis(videoId: string): Promise<void> {
    const { error } = await supabase
      .from('player_videos')
      .update({
        analysisStatus: 'queued' as VideoAnalysisStatus,
        analysisRequestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', videoId);

    if (error) throw new Error(`Failed to queue video for analysis: ${error.message}`);
  }

  async saveAnalysisResult(
    videoId: string,
    result: VideoAnalysisResult,
    provider: string,
    version: string,
    status: 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    const { error } = await supabase
      .from('player_videos')
      .update({
        analysisStatus: status as VideoAnalysisStatus,
        analysisResult: result,
        analysisCompletedAt: new Date().toISOString(),
        analysisProvider: provider,
        analysisVersion: version,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', videoId);

    if (error) throw new Error(`Failed to save analysis result: ${error.message}`);
  }

  async getQueuedVideos(limit = 20): Promise<PlayerVideo[]> {
    const { data, error } = await supabase
      .from('player_videos')
      .select('*')
      .eq('analysisStatus', 'queued')
      .order('analysisRequestedAt', { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as PlayerVideo[];
  }

  // ── Update metadata ────────────────────────────────────────────────────────

  async updateDuration(videoId: string, durationSeconds: number): Promise<void> {
    await supabase
      .from('player_videos')
      .update({ duration: durationSeconds, updatedAt: new Date().toISOString() })
      .eq('id', videoId);
  }

  async updateThumbnail(videoId: string, thumbnailUrl: string): Promise<void> {
    await supabase
      .from('player_videos')
      .update({ thumbnail: thumbnailUrl, updatedAt: new Date().toISOString() })
      .eq('id', videoId);
  }

  async updateCategory(videoId: string, category: VideoCategory): Promise<void> {
    await supabase
      .from('player_videos')
      .update({ category, updatedAt: new Date().toISOString() })
      .eq('id', videoId);
  }

  // ── Moderation ─────────────────────────────────────────────────────────────

  async approve(videoId: string, notes?: string): Promise<void> {
    await supabase
      .from('player_videos')
      .update({
        status: 'approved',
        approvedAt: new Date().toISOString(),
        adminNotes: notes ?? null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', videoId);
  }

  async reject(videoId: string, notes: string): Promise<void> {
    await supabase
      .from('player_videos')
      .update({
        status: 'rejected',
        adminNotes: notes,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', videoId);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async delete(videoId: string): Promise<void> {
    const video = await this.getById(videoId);
    if (!video) return;

    // Delete from R2
    const bucket = resolveBucket();
    await storageManager.delete(bucket, video.storagePath).catch(() => {
      // Non-fatal — DB record still removed
      console.warn(`[VideoService] Could not delete R2 file: ${video.storagePath}`);
    });

    // Delete DB record
    const { error } = await supabase.from('player_videos').delete().eq('id', videoId);
    if (error) throw new Error(`Failed to delete video record: ${error.message}`);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async incrementView(videoId: string): Promise<void> {
    await supabase.rpc('increment_video_views', { video_id: videoId });
  }

  async toggleLike(videoId: string, userId: string): Promise<{ liked: boolean }> {
    // Check if already liked
    const { data: existing } = await supabase
      .from('video_action_logs')
      .select('id')
      .eq('videoId', videoId)
      .eq('playerId', userId)
      .eq('action', 'like')
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabase.from('video_action_logs').delete().eq('id', existing.id);
      await supabase.rpc('decrement_video_likes', { video_id: videoId });
      return { liked: false };
    } else {
      // Like
      await supabase.from('video_action_logs').insert({
        id: crypto.randomUUID(),
        videoId,
        playerId: userId,
        action: 'like',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      await supabase.rpc('increment_video_likes', { video_id: videoId });
      return { liked: true };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private validateVideoFile(file: File): void {
    const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
    const ALLOWED_TYPES = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`نوع الملف غير مدعوم (${file.type}). الأنواع المدعومة: mp4, webm, ogg, avi, mov`);
    }
    if (file.size > MAX_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(0);
      throw new Error(`حجم الملف كبير جداً (${mb} MB). الحد الأقصى: 500 MB`);
    }
  }
}

// Singleton export
export const videoService = new VideoService();
