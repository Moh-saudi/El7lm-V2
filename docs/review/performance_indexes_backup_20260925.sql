-- ==============================================================================
-- Migration: performance_indexes.sql
-- Phase: 4.1 — Database Performance Foundation (Target: 10,000 DAU)
-- Platform: El7lm-V2
-- Safety: All statements use `IF NOT EXISTS` and low-overhead Partial/Composite indexes.
-- Execution Status: DRAFT / REVIEW COMPLETED — DO NOT RUN ON PRODUCTION WITHOUT APPROVAL
-- ==============================================================================


-- ==============================================================================
-- PART A: CRITICAL PRODUCTION INDEXES (P0)
-- Indexes addressing high-frequency 60s mobile polling, real-time chat,
-- auth session validations, and public discovery feeds.
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
-- Note: An index on messages.senderId was EXCLUDED based on code audit,
-- as messages are never queried by senderId alone.
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



-- ==============================================================================
-- PART B: SECONDARY OPTIMIZATION INDEXES (P1)
-- Foreign keys, organizational affiliations, and administrative lookups.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 6. ADMINISTRATIVE & AUDIT LOOKUPS
-- ------------------------------------------------------------------------------

-- Notifications sent by specific admin / entity
CREATE INDEX IF NOT EXISTS "idx_notifications_sender_id"
  ON public.notifications ("senderId")
  WHERE "senderId" IS NOT NULL;

-- Interaction notifications profile owner lookup
CREATE INDEX IF NOT EXISTS "idx_interaction_notif_owner"
  ON public.interaction_notifications ("profileOwnerId")
  WHERE "profileOwnerId" IS NOT NULL;

-- Users role foreign key (sync-employees and permission checks)
CREATE INDEX IF NOT EXISTS "idx_users_role_id"
  ON public.users ("roleId")
  WHERE "roleId" IS NOT NULL;

-- Country-based opportunity filtering
CREATE INDEX IF NOT EXISTS "idx_opportunities_country_created"
  ON public.opportunities (country, "createdAt" DESC)
  WHERE country IS NOT NULL;


-- ------------------------------------------------------------------------------
-- 7. PLAYER AFFILIATIONS (Club, Academy, Agent, Trainer)
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_players_club_id"
  ON public.players ("clubId")
  WHERE "clubId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_players_academy_id"
  ON public.players ("academyId")
  WHERE "academyId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_players_agent_id"
  ON public.players ("agentId")
  WHERE "agentId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_players_trainer_id"
  ON public.players ("trainerId")
  WHERE "trainerId" IS NOT NULL;


-- ------------------------------------------------------------------------------
-- 8. ENTITY TABLES AUTH & PHONE LOOKUPS
-- (Clubs, Academies, Trainers, Marketers, Agents)
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_clubs_uid"
  ON public.clubs (uid)
  WHERE uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_clubs_phone_normalized"
  ON public.clubs ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_academies_uid"
  ON public.academies (uid)
  WHERE uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_academies_phone_normalized"
  ON public.academies ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_trainers_uid"
  ON public.trainers (uid)
  WHERE uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_trainers_phone_normalized"
  ON public.trainers ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_marketers_uid"
  ON public.marketers (uid)
  WHERE uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_marketers_phone_normalized"
  ON public.marketers ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_agents_uid"
  ON public.agents (uid)
  WHERE uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_agents_phone_normalized"
  ON public.agents ("phoneNormalized")
  WHERE "phoneNormalized" IS NOT NULL;
