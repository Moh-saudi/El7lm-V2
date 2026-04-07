-- ============================================================
-- Migration: Add AI Analysis & Metadata columns to player_videos
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- Add metadata columns (non-destructive — IF NOT EXISTS)
ALTER TABLE player_videos
  ADD COLUMN IF NOT EXISTS "storagePath"    TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize"       BIGINT,
  ADD COLUMN IF NOT EXISTS "mimeType"       TEXT,
  ADD COLUMN IF NOT EXISTS "resolution"     TEXT,
  ADD COLUMN IF NOT EXISTS "category"       TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS "tags"           JSONB DEFAULT '[]'::jsonb;

-- Add AI analysis columns
ALTER TABLE player_videos
  ADD COLUMN IF NOT EXISTS "analysisStatus"        TEXT NOT NULL DEFAULT 'not_queued',
  ADD COLUMN IF NOT EXISTS "analysisResult"        JSONB,
  ADD COLUMN IF NOT EXISTS "analysisRequestedAt"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "analysisCompletedAt"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "analysisProvider"      TEXT,
  ADD COLUMN IF NOT EXISTS "analysisVersion"       TEXT;

-- Constraint: valid analysis status values
ALTER TABLE player_videos
  DROP CONSTRAINT IF EXISTS player_videos_analysis_status_check;
ALTER TABLE player_videos
  ADD CONSTRAINT player_videos_analysis_status_check
  CHECK ("analysisStatus" IN ('not_queued', 'queued', 'processing', 'completed', 'failed'));

-- Index for the analysis queue (fetch queued videos in order)
CREATE INDEX IF NOT EXISTS idx_player_videos_analysis_status
  ON player_videos ("analysisStatus", "analysisRequestedAt")
  WHERE "analysisStatus" = 'queued';

-- Index for fetching player videos fast
CREATE INDEX IF NOT EXISTS idx_player_videos_player_id
  ON player_videos ("playerId", "createdAt" DESC);

-- Stored procedure: increment views atomically (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_video_views(video_id TEXT)
RETURNS VOID AS $$
  UPDATE player_videos SET views = views + 1 WHERE id = video_id;
$$ LANGUAGE sql;

-- Stored procedure: increment likes atomically
CREATE OR REPLACE FUNCTION increment_video_likes(video_id TEXT)
RETURNS VOID AS $$
  UPDATE player_videos SET likes = likes + 1 WHERE id = video_id;
$$ LANGUAGE sql;

-- Stored procedure: decrement likes atomically (floor at 0)
CREATE OR REPLACE FUNCTION decrement_video_likes(video_id TEXT)
RETURNS VOID AS $$
  UPDATE player_videos SET likes = GREATEST(likes - 1, 0) WHERE id = video_id;
$$ LANGUAGE sql;

-- ============================================================
-- Optional: RLS policies for player_videos
-- (DROP IF EXISTS first — PostgreSQL has no CREATE POLICY IF NOT EXISTS)
-- ============================================================

ALTER TABLE player_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved videos"    ON player_videos;
DROP POLICY IF EXISTS "Players can view own videos"        ON player_videos;
DROP POLICY IF EXISTS "Players can insert own videos"      ON player_videos;
DROP POLICY IF EXISTS "Players can update own pending videos" ON player_videos;

-- Players can read any approved video (public feed)
CREATE POLICY "Public can view approved videos"
  ON player_videos FOR SELECT
  USING (status = 'approved');

-- Players can read their own videos regardless of status
CREATE POLICY "Players can view own videos"
  ON player_videos FOR SELECT
  USING (auth.uid()::text = "playerId");

-- Players can insert their own videos
CREATE POLICY "Players can insert own videos"
  ON player_videos FOR INSERT
  WITH CHECK (auth.uid()::text = "playerId");

-- Players can update their own pending videos (edit title/description)
CREATE POLICY "Players can update own pending videos"
  ON player_videos FOR UPDATE
  USING (auth.uid()::text = "playerId" AND status = 'pending');
