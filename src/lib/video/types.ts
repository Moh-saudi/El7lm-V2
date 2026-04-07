/**
 * Video System Types
 * Designed for AI analysis integration
 */

// ──────────────────────────────────────────────
// Video Status
// ──────────────────────────────────────────────

export type VideoModerationStatus = 'pending' | 'approved' | 'rejected';

export type VideoAnalysisStatus =
  | 'not_queued'   // just uploaded, no analysis requested yet
  | 'queued'       // waiting in the analysis queue
  | 'processing'   // AI model is currently analyzing
  | 'completed'    // analysis done
  | 'failed';      // analysis failed (retryable)

export type VideoCategory =
  | 'skills'
  | 'match'
  | 'training'
  | 'goalkeeper'
  | 'defense'
  | 'midfield'
  | 'attack'
  | 'other';

// ──────────────────────────────────────────────
// Core Video Record (maps to player_videos table)
// ──────────────────────────────────────────────

export interface PlayerVideo {
  id: string;
  playerId: string;

  // Content
  title: string;
  description?: string;
  category?: VideoCategory;
  tags?: string[];

  // Storage
  videoUrl: string;       // public CDN URL (Cloudflare R2)
  storagePath: string;    // R2 key, e.g. "videos/userId/timestamp_name.mp4"
  fileName: string;
  thumbnail?: string;

  // File metadata
  fileSize?: number;      // bytes
  mimeType?: string;      // e.g. "video/mp4"
  duration?: number;      // seconds
  resolution?: string;    // e.g. "1920x1080"

  // Moderation
  status: VideoModerationStatus;
  adminNotes?: string;
  approvedAt?: string;

  // AI Analysis
  analysisStatus: VideoAnalysisStatus;
  analysisResult?: VideoAnalysisResult;
  analysisRequestedAt?: string;
  analysisCompletedAt?: string;
  analysisProvider?: string;   // e.g. "gemini-1.5-pro", "gpt-4o-vision"
  analysisVersion?: string;    // model version

  // Stats
  views: number;
  likes: number;
  pointsEarned: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// AI Analysis Result Structure
// Flexible JSONB — grows as the model improves
// ──────────────────────────────────────────────

export interface VideoAnalysisResult {
  // Overall
  overallScore?: number;         // 0–100
  highlights?: VideoHighlight[];

  // Player detection
  playerDetected?: boolean;
  estimatedAge?: number;
  dominantFoot?: 'left' | 'right' | 'both';
  position?: string;             // detected position

  // Skill scores (0–100 each)
  skillScores?: {
    pace?: number;
    dribbling?: number;
    shooting?: number;
    passing?: number;
    defending?: number;
    heading?: number;
    firstTouch?: number;
    vision?: number;
  };

  // Physical attributes detected
  physicalAttributes?: {
    estimatedHeight?: string;
    estimatedWeight?: string;
    agility?: number;
    stamina?: number;
  };

  // Content moderation
  contentSafe?: boolean;
  contentFlags?: string[];

  // Quality assessment
  videoQuality?: 'low' | 'medium' | 'high';
  hasAudio?: boolean;
  lightingQuality?: 'poor' | 'fair' | 'good';

  // Raw model output (preserved for re-processing)
  rawOutput?: Record<string, unknown>;
  processingTimeMs?: number;
  error?: string;
}

export interface VideoHighlight {
  timestampSec: number;
  duration: number;
  label: string;           // e.g. "dribble", "goal", "tackle"
  confidence: number;      // 0–1
  thumbnailUrl?: string;
}

// ──────────────────────────────────────────────
// Upload Input
// ──────────────────────────────────────────────

export interface VideoUploadInput {
  file: File;
  playerId: string;
  title: string;
  description?: string;
  category?: VideoCategory;
  tags?: string[];
  ownerId?: string;         // who owns the upload (trainer, club, agent, academy — defaults to playerId)
  accountType?: string;     // 'independent' | 'club' | 'trainer' | 'agent' | 'academy'
  autoQueueAnalysis?: boolean;  // queue for AI analysis immediately after upload
}

export interface VideoUploadResult {
  video: PlayerVideo;
  uploadUrl: string;
}

// ──────────────────────────────────────────────
// Analysis Provider Interface
// Implement this for any AI model
// ──────────────────────────────────────────────

export interface VideoAnalysisProvider {
  readonly name: string;
  readonly version: string;

  /**
   * Analyze a video. Receives the public URL or signed URL.
   * Must resolve with a structured result or throw on failure.
   */
  analyze(input: VideoAnalysisInput): Promise<VideoAnalysisResult>;

  /**
   * Whether this provider supports polling (async jobs).
   */
  isAsync: boolean;

  /**
   * For async providers: check job status.
   */
  checkStatus?(jobId: string): Promise<{ status: VideoAnalysisStatus; result?: VideoAnalysisResult }>;
}

export interface VideoAnalysisInput {
  videoId: string;
  videoUrl: string;
  storagePath: string;
  playerId: string;
  metadata?: {
    title?: string;
    description?: string;
    category?: VideoCategory;
    duration?: number;
    mimeType?: string;
  };
}
