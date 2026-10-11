-- ============================================================
-- Tournament Portal — New Tables & Column Patches
-- شغّل هذا الملف في Supabase SQL Editor
-- ============================================================

-- ── 1. جدول الملاعب ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_venues (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournament_new(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  address       TEXT,
  city          TEXT,
  capacity      INT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. جدول الحكام ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_referees (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournament_new(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  phone         TEXT,
  level         TEXT,        -- مبتدئ / متوسط / محترف / دولي
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. معرض الصور ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_gallery (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournament_new(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  caption       TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. الرعاة ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_sponsors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournament_new(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  logo_url      TEXT,
  tier          TEXT        NOT NULL DEFAULT 'gold',  -- platinum / gold / silver / bronze
  website_url   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. إضافة عمود channel لجدول الإشعارات ────────────────────
-- (اختياري — يُستخدم مستقبلاً للتمييز بين app/whatsapp/sms)
ALTER TABLE tournament_notifications
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'app';

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tv_tournament  ON tournament_venues(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tr_tournament  ON tournament_referees(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tg2_tournament ON tournament_gallery(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tsp_tournament ON tournament_sponsors(tournament_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE tournament_venues   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_gallery  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_sponsors ENABLE ROW LEVEL SECURITY;

-- Venues
DROP POLICY IF EXISTS "venues_public_read" ON tournament_venues;
DROP POLICY IF EXISTS "venues_auth_write"  ON tournament_venues;
CREATE POLICY "venues_public_read" ON tournament_venues  FOR SELECT USING (true);
CREATE POLICY "venues_auth_write"  ON tournament_venues  FOR ALL    USING (auth.role() = 'authenticated');

-- Referees
DROP POLICY IF EXISTS "refs_public_read" ON tournament_referees;
DROP POLICY IF EXISTS "refs_auth_write"  ON tournament_referees;
CREATE POLICY "refs_public_read"   ON tournament_referees FOR SELECT USING (true);
CREATE POLICY "refs_auth_write"    ON tournament_referees FOR ALL    USING (auth.role() = 'authenticated');

-- Gallery
DROP POLICY IF EXISTS "gallery_public_read" ON tournament_gallery;
DROP POLICY IF EXISTS "gallery_auth_write"  ON tournament_gallery;
CREATE POLICY "gallery_public_read" ON tournament_gallery FOR SELECT USING (true);
CREATE POLICY "gallery_auth_write"  ON tournament_gallery FOR ALL    USING (auth.role() = 'authenticated');

-- Sponsors
DROP POLICY IF EXISTS "sponsors_public_read" ON tournament_sponsors;
DROP POLICY IF EXISTS "sponsors_auth_write"  ON tournament_sponsors;
CREATE POLICY "sponsors_public_read" ON tournament_sponsors FOR SELECT USING (true);
CREATE POLICY "sponsors_auth_write"  ON tournament_sponsors FOR ALL    USING (auth.role() = 'authenticated');
