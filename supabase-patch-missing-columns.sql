-- ============================================================
-- Patch: إضافة الأعمدة الناقصة المكتشفة أثناء نقل البيانات
-- شغّل هذا في Supabase SQL Editor
-- ============================================================

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastPasswordChange" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountTypeChangedAt" TEXT;

-- players
ALTER TABLE players ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS "family_history" JSONB;

-- academies
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- marketers
ALTER TABLE marketers ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "actionUrl" TEXT;

-- messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "senderAvatar" TEXT;

-- opportunities
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS "ageMax" INTEGER;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS "ageMin" INTEGER;

-- geidea_payments
ALTER TABLE geidea_payments ADD COLUMN IF NOT EXISTS "detailedResponseCode" TEXT;
ALTER TABLE geidea_payments ADD COLUMN IF NOT EXISTS "detailedResponseMessage" TEXT;

-- subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "bankInfo" JSONB;

-- tournament_registrations
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS "geideaOrderId" TEXT;

-- campaign_logs
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS "varMappings" JSONB;

-- clubs (extra fields)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- trainers / agents
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
