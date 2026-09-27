-- Phase 6 — Performance/Data Foundation
-- Read/merge safety:
-- 1) This migration does NOT drop any legacy/duplicate table.
-- 2) Canonical application tables are indexed for current Supabase query patterns.
-- 3) Run the duplicate-table audit before dropping legacy tables.
--
-- Canonical tables:
--   academies (not academys)
--   career_applications (not careerApplications / careers_applications)
--   tournament_registrations (not tournamentRegistrations)
--   bulkPayments (current Prisma mapping; bulk_payments requires separate verification)

BEGIN;

-- Preserve legacy career applications before the application/API is switched to the
-- canonical snake_case table. The two schemas are intentionally compatible.
INSERT INTO career_applications (
  id, fullName, email, phone, country, governorate, experience,
  linkedin, facebook, notes, roles, role, createdAt, status
)
SELECT
  id, fullName, email, phone, country, governorate, experience,
  linkedin, facebook, notes, roles, role, createdAt, status
FROM careerApplications
ON CONFLICT (id) DO NOTHING;

-- Some older migrations used a plural snake_case name as well.
INSERT INTO career_applications (
  id, fullName, email, phone, country, governorate, experience,
  linkedin, facebook, notes, roles, role, createdAt, status
)
SELECT
  id, fullName, email, phone, country, governorate, experience,
  linkedin, facebook, notes, roles, role, createdAt, NULL
FROM careers_applications
ON CONFLICT (id) DO NOTHING;

-- High-frequency identity lookups.
CREATE INDEX IF NOT EXISTS idx_users_uid
  ON users (uid)
  WHERE uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email)
  WHERE email IS NOT NULL;

-- Player discovery / management.
CREATE INDEX IF NOT EXISTS idx_players_uid
  ON players (uid)
  WHERE uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_created_at
  ON players ("createdAt" DESC)
  WHERE "createdAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_trainer_id
  ON players (trainer_id)
  WHERE trainer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_country_position
  ON players (country, primary_position)
  WHERE country IS NOT NULL AND primary_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_active_verified
  ON players (isActive, "isVerifiedLocal")
  WHERE isActive IS NOT NULL OR "isVerifiedLocal" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_phone_normalized
  ON players (phoneNormalized)
  WHERE phoneNormalized IS NOT NULL;

-- Notification feeds.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_interaction_notifications_user_created
  ON interaction_notifications ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_interaction_notifications_user_read_created
  ON interaction_notifications ("userId", "isRead", "createdAt" DESC);

-- Messaging.
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created
  ON messages ("receiverId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages ("conversationId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON conversations ("updatedAt" DESC);

-- Organization/player workflows.
CREATE INDEX IF NOT EXISTS idx_player_join_requests_org_status
  ON player_join_requests ("organizationId", status, "requestedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_organization_referrals_code
  ON organization_referrals ("referralCode")
  WHERE "referralCode" IS NOT NULL;

-- Subscriptions/payments.
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions ("userId", status);

CREATE INDEX IF NOT EXISTS idx_geidea_payments_order
  ON geidea_payments ("orderId")
  WHERE "orderId" IS NOT NULL;

-- OTP lifecycle cleanup.
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires
  ON otp_verifications ("expiresAt");

-- Support and audit feeds.
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_timestamp
  ON support_messages ("conversationId", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_video_action_logs_player_timestamp
  ON video_action_logs ("playerId", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_route_timestamp
  ON analytics (route, "timestamp" DESC);

COMMIT;
