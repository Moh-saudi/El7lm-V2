-- ==============================================================================
-- Migration: performance_indexes_part_a.sql
-- Phase: 4.1-B — Execute Critical Production Indexes (Part A ONLY)
-- Platform: El7lm-V2
-- Scope: 17 Critical Indexes for High-Frequency Queries (P0)
-- Instructions: Run this script directly in Supabase Dashboard -> SQL Editor
-- Safety: All statements include IF NOT EXISTS. Zero data or table changes.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NOTIFICATIONS & INTERACTIONS (High-frequency mobile polling & badge counters)
-- ------------------------------------------------------------------------------

-- User notifications feed ordered by creation date
CREATE INDEX IF NOT EXISTS "idx_notifications_user_created"
  ON public.notifications ("userId", "createdAt" DESC);

-- Partial index for instantaneous unread count calculation & badge updates
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
  ON public.notifications ("userId")
  WHERE "isRead" = false;

-- Interaction notifications feed
CREATE INDEX IF NOT EXISTS "idx_interaction_notif_user_created"
  ON public.interaction_notifications ("userId", "createdAt" DESC);

-- Partial index for unread interaction notifications
CREATE INDEX IF NOT EXISTS "idx_interaction_notif_user_unread"
  ON public.interaction_notifications ("userId")
  WHERE "isRead" = false;


-- ------------------------------------------------------------------------------
-- 2. MESSAGES & CONVERSATIONS (Chat screens & JSONB array searches)
-- ------------------------------------------------------------------------------

-- Messages lookup by conversation and client timestamp (Flutter Mobile)
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_timestamp"
  ON public.messages ("conversationId", "timestamp" DESC);

-- Messages lookup by conversation and createdAt timestamp (Web Next.js)
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created"
  ON public.messages ("conversationId", "createdAt" DESC);

-- Partial index for unread incoming messages count
CREATE INDEX IF NOT EXISTS "idx_messages_receiver_unread"
  ON public.messages ("receiverId")
  WHERE "isRead" = false;

-- GIN Index on conversations participants (JSONB array containment `@>`)
CREATE INDEX IF NOT EXISTS "idx_conversations_participants_gin"
  ON public.conversations USING GIN (participants jsonb_path_ops);

-- Conversations sorting by latest update
CREATE INDEX IF NOT EXISTS "idx_conversations_updated"
  ON public.conversations ("updatedAt" DESC);


-- ------------------------------------------------------------------------------
-- 3. PLAYER FAVORITES (Player discovery screen & unique constraint)
-- ------------------------------------------------------------------------------

-- Composite Unique index ensuring one favorite entry per player per owner (O(1) checks)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_player_favorites_composite_unique"
  ON public.player_favorites (owner_id, player_id);

-- Feed of owner favorites ordered by time
CREATE INDEX IF NOT EXISTS "idx_player_favorites_owner_created"
  ON public.player_favorites (owner_id, created_at DESC);


-- ------------------------------------------------------------------------------
-- 4. OPPORTUNITIES (Public explore catalog & organizer management)
-- ------------------------------------------------------------------------------

-- Composite index for explore opportunities catalog (status = active AND isActive = true)
CREATE INDEX IF NOT EXISTS "idx_opportunities_status_active_created"
  ON public.opportunities (status, "isActive", "createdAt" DESC);

-- Organizer opportunity management dashboard
CREATE INDEX IF NOT EXISTS "idx_opportunities_organizer_created"
  ON public.opportunities ("organizerId", "createdAt" DESC);


-- ------------------------------------------------------------------------------
-- 5. PLAYERS & USERS AUTH FOUNDATION (UID & Normalized Phone)
-- ------------------------------------------------------------------------------

-- Players auth UID lookup
CREATE INDEX IF NOT EXISTS "idx_players_uid"
  ON public.players (uid)
  WHERE uid IS NOT NULL;

-- Players normalized phone index
CREATE INDEX IF NOT EXISTS "idx_players_phone_normalized"
  ON public.players ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;

-- Users auth UID lookup
CREATE INDEX IF NOT EXISTS "idx_users_uid"
  ON public.users (uid)
  WHERE uid IS NOT NULL;

-- Users normalized phone index
CREATE INDEX IF NOT EXISTS "idx_users_phone_normalized"
  ON public.users ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;
