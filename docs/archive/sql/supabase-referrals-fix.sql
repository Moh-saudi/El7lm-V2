-- ============================================================
-- El7lm - Referrals Tables Fix
-- Run this in Supabase SQL Editor (mjuaefipdzxfqazzbyke)
-- ============================================================

-- ============================================================
-- 1. organization_referrals — إصلاح البنية الكاملة
-- الجدول القديم: referrerId, referrerType, commission
-- الكود يتوقع: organizationId, organizationType, organizationName, inviteLink, ...
-- ============================================================

ALTER TABLE "organization_referrals"
  ADD COLUMN IF NOT EXISTS "organizationId"   TEXT,
  ADD COLUMN IF NOT EXISTS "organizationType" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationName" TEXT,
  ADD COLUMN IF NOT EXISTS "inviteLink"       TEXT,
  ADD COLUMN IF NOT EXISTS "description"      TEXT,
  ADD COLUMN IF NOT EXISTS "isActive"         BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "maxUsage"         INTEGER,
  ADD COLUMN IF NOT EXISTS "currentUsage"     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt"        TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt"        TEXT;

-- تعيين القيم الافتراضية للصفوف الموجودة
UPDATE "organization_referrals"
SET
  "isActive"     = COALESCE("isActive", true),
  "currentUsage" = COALESCE("currentUsage", 0),
  "updatedAt"    = COALESCE("updatedAt", "createdAt")
WHERE "isActive" IS NULL OR "currentUsage" IS NULL;

-- إضافة index للبحث بالكود
CREATE INDEX IF NOT EXISTS "idx_org_referrals_code"
  ON "organization_referrals" ("referralCode");

CREATE INDEX IF NOT EXISTS "idx_org_referrals_org"
  ON "organization_referrals" ("organizationId");

-- ============================================================
-- 2. player_join_requests — إصلاح البنية الكاملة
-- الجدول القديم: playerId, organizerId, organizerType, message
-- الكود يتوقع: playerName, playerEmail, organizationId, organizationType, organizationName, referralCode, requestedAt, ...
-- ============================================================

ALTER TABLE "player_join_requests"
  ADD COLUMN IF NOT EXISTS "playerName"       TEXT,
  ADD COLUMN IF NOT EXISTS "playerEmail"      TEXT,
  ADD COLUMN IF NOT EXISTS "playerPhone"      TEXT,
  ADD COLUMN IF NOT EXISTS "organizationId"   TEXT,
  ADD COLUMN IF NOT EXISTS "organizationType" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationName" TEXT,
  ADD COLUMN IF NOT EXISTS "referralCode"     TEXT,
  ADD COLUMN IF NOT EXISTS "requestedAt"      TEXT,
  ADD COLUMN IF NOT EXISTS "processedAt"      TEXT,
  ADD COLUMN IF NOT EXISTS "processedBy"      TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt"       TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason"  TEXT,
  ADD COLUMN IF NOT EXISTS "playerData"       JSONB DEFAULT '{}';

-- تعيين القيم الافتراضية للصفوف الموجودة
UPDATE "player_join_requests"
SET
  "requestedAt" = COALESCE("requestedAt", "createdAt")
WHERE "requestedAt" IS NULL;

-- إضافة index للبحث
CREATE INDEX IF NOT EXISTS "idx_join_requests_player"
  ON "player_join_requests" ("playerId");

CREATE INDEX IF NOT EXISTS "idx_join_requests_org"
  ON "player_join_requests" ("organizationId");

CREATE INDEX IF NOT EXISTS "idx_join_requests_status"
  ON "player_join_requests" ("status");

-- ============================================================
-- 3. referrals — إضافة أعمدة ناقصة
-- ============================================================

ALTER TABLE "referrals"
  ADD COLUMN IF NOT EXISTS "referralType"     TEXT DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS "organizationType" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"        TEXT;

CREATE INDEX IF NOT EXISTS "idx_referrals_code"
  ON "referrals" ("referralCode");

CREATE INDEX IF NOT EXISTS "idx_referrals_referrer"
  ON "referrals" ("referrerId");

-- ============================================================
-- 4. player_rewards — إضافة عمود playerId منفصل
-- الكود يستخدم id = playerId لكن أيضاً يقرأ reward.playerId
-- ============================================================

ALTER TABLE "player_rewards"
  ADD COLUMN IF NOT EXISTS "playerId" TEXT;

-- نسخ id إلى playerId للصفوف الموجودة
UPDATE "player_rewards"
SET "playerId" = id
WHERE "playerId" IS NULL;

-- ============================================================
-- 5. RLS Policies — تأكيد الصلاحيات
-- ============================================================

-- organization_referrals
ALTER TABLE "organization_referrals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_referrals_all" ON "organization_referrals";
CREATE POLICY "org_referrals_all" ON "organization_referrals"
  FOR ALL USING (true) WITH CHECK (true);

-- player_join_requests
ALTER TABLE "player_join_requests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "join_requests_all" ON "player_join_requests";
CREATE POLICY "join_requests_all" ON "player_join_requests"
  FOR ALL USING (true) WITH CHECK (true);

-- referrals
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_all" ON "referrals";
CREATE POLICY "referrals_all" ON "referrals"
  FOR ALL USING (true) WITH CHECK (true);

-- player_rewards
ALTER TABLE "player_rewards" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_rewards_all" ON "player_rewards";
CREATE POLICY "player_rewards_all" ON "player_rewards"
  FOR ALL USING (true) WITH CHECK (true);

-- point_transactions
ALTER TABLE "point_transactions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "point_transactions_all" ON "point_transactions";
CREATE POLICY "point_transactions_all" ON "point_transactions"
  FOR ALL USING (true) WITH CHECK (true);

-- join_request_notifications
ALTER TABLE "join_request_notifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "join_notifs_all" ON "join_request_notifications";
CREATE POLICY "join_notifs_all" ON "join_request_notifications"
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. تحقق نهائي
-- ============================================================

SELECT
  'organization_referrals' AS table_name,
  COUNT(*) AS rows,
  COUNT("organizationId") AS has_organizationId,
  COUNT("isActive") AS has_isActive
FROM "organization_referrals"
UNION ALL SELECT
  'player_join_requests',
  COUNT(*),
  COUNT("organizationId"),
  COUNT("requestedAt")
FROM "player_join_requests"
UNION ALL SELECT
  'referrals',
  COUNT(*),
  COUNT("referralType"),
  COUNT("updatedAt")
FROM "referrals"
UNION ALL SELECT
  'player_rewards',
  COUNT(*),
  COUNT("playerId"),
  COUNT("badges")
FROM "player_rewards"
UNION ALL SELECT
  'point_transactions',
  COUNT(*),
  COUNT("playerId"),
  COUNT("type")
FROM "point_transactions";
