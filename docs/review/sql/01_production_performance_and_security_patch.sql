-- ==============================================================================
-- El7lm-V2 — Production Performance Indexes & Security Hardening
-- File: docs/review/sql/01_production_performance_and_security_patch.sql
-- Run in: Supabase Dashboard -> SQL Editor
-- Safety: All index creations use `IF NOT EXISTS`
-- Mode: Safe & Non-blocking
-- ==============================================================================

-- ==============================================================================
-- 1. NOTIFICATIONS TABLE PERFORMANCE INDEXES
-- Optimizes web and mobile notification feeds, unread badges, and admin dispatch.
-- ==============================================================================

-- User notifications ordered by creation date (Feed query)
CREATE INDEX IF NOT EXISTS "idx_notifications_user_created"
  ON public.notifications ("userId", "createdAt" DESC);

-- Partial index for fast unread count queries (<2ms instead of full table scan)
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
  ON public.notifications ("userId")
  WHERE "isRead" = false;

-- Sender index for admin dispatch and audit
CREATE INDEX IF NOT EXISTS "idx_notifications_sender_id"
  ON public.notifications ("senderId")
  WHERE "senderId" IS NOT NULL;


-- ==============================================================================
-- 2. MESSAGING & CHAT PERFORMANCE INDEXES
-- Optimizes conversations list, real-time message feeds, and unread counts.
-- ==============================================================================

-- Messages feed by conversation ordered by creation date (Web Next.js)
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created"
  ON public.messages ("conversationId", "createdAt" DESC);

-- Messages feed by conversation ordered by timestamp (Flutter Mobile)
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_timestamp"
  ON public.messages ("conversationId", "timestamp" DESC);

-- Partial index for unread messages count per receiver
CREATE INDEX IF NOT EXISTS "idx_messages_receiver_unread"
  ON public.messages ("receiverId")
  WHERE "isRead" = false;

-- Conversations ordering by latest activity
CREATE INDEX IF NOT EXISTS "idx_conversations_updated"
  ON public.conversations ("updatedAt" DESC);


-- ==============================================================================
-- 3. USERS, PLAYERS & AUTH LOOKUP INDEXES
-- Speeds up login, profile lookups, and account type filtering.
-- ==============================================================================

-- Users lookup by Auth UID
CREATE INDEX IF NOT EXISTS "idx_users_uid"
  ON public.users (uid)
  WHERE uid IS NOT NULL;

-- Users lookup by normalized phone (E.164)
CREATE INDEX IF NOT EXISTS "idx_users_phone_normalized"
  ON public.users ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;

-- Users lookup by account type (Admin notification broadcasts & filtering)
CREATE INDEX IF NOT EXISTS "idx_users_account_type"
  ON public.users ("accountType")
  WHERE "accountType" IS NOT NULL;

-- Players lookup by Auth UID
CREATE INDEX IF NOT EXISTS "idx_players_uid"
  ON public.players (uid)
  WHERE uid IS NOT NULL;

-- Players lookup by normalized phone
CREATE INDEX IF NOT EXISTS "idx_players_phone_normalized"
  ON public.players ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;


-- ==============================================================================
-- 4. OPPORTUNITIES & DISCOVERY INDEXES
-- Speeds up public opportunities exploration and filtering.
-- ==============================================================================

-- Active public opportunities feed
CREATE INDEX IF NOT EXISTS "idx_opportunities_status_active_created"
  ON public.opportunities (status, "isActive", "createdAt" DESC);

-- Organizer opportunity management
CREATE INDEX IF NOT EXISTS "idx_opportunities_organizer_created"
  ON public.opportunities ("organizerId", "createdAt" DESC);

-- Player favorites composite uniqueness & feed
CREATE UNIQUE INDEX IF NOT EXISTS "idx_player_favorites_composite_unique"
  ON public.player_favorites (owner_id, player_id);

CREATE INDEX IF NOT EXISTS "idx_player_favorites_owner_created"
  ON public.player_favorites (owner_id, created_at DESC);


-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES & PROTECTION
-- Ensures row-level isolation and prevents data leaks to unauthorized users.
-- ==============================================================================

-- Enable RLS on notifications (if not already enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'users_read_own_notifications'
  ) THEN
    CREATE POLICY "users_read_own_notifications"
      ON public.notifications
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL AND (
          "userId" = auth.uid()::text OR
          "userId" IN (SELECT id::text FROM public.users WHERE uid = auth.uid()::text OR id = auth.uid()::text)
        )
      );
  END IF;
END $$;

-- Policy: Users can update their own notifications (e.g. mark as read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'users_update_own_notifications'
  ) THEN
    CREATE POLICY "users_update_own_notifications"
      ON public.notifications
      FOR UPDATE
      USING (
        auth.uid() IS NOT NULL AND (
          "userId" = auth.uid()::text OR
          "userId" IN (SELECT id::text FROM public.users WHERE uid = auth.uid()::text OR id = auth.uid()::text)
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL AND (
          "userId" = auth.uid()::text OR
          "userId" IN (SELECT id::text FROM public.users WHERE uid = auth.uid()::text OR id = auth.uid()::text)
        )
      );
  END IF;
END $$;

-- Policy: Service role has full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'service_role_manage_notifications'
  ) THEN
    CREATE POLICY "service_role_manage_notifications"
      ON public.notifications
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role')
      WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Enable RLS on otp_verifications to prevent OTP sniffing
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full management on otp_verifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'otp_verifications' AND policyname = 'service_role_manage_otp'
  ) THEN
    CREATE POLICY "service_role_manage_otp"
      ON public.otp_verifications
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role')
      WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;
