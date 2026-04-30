-- ============================================================
-- Venues & Referees for Tournament Portal
-- Run in Supabase SQL Editor
-- ============================================================

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

CREATE TABLE IF NOT EXISTS tournament_referees (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournament_new(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  phone         TEXT,
  level         TEXT,        -- مبتدئ / متوسط / محترف / دولي
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE tournament_venues  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_referees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_public_read"  ON tournament_venues  FOR SELECT USING (true);
CREATE POLICY "venues_auth_write"   ON tournament_venues  FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "refs_public_read"    ON tournament_referees FOR SELECT USING (true);
CREATE POLICY "refs_auth_write"     ON tournament_referees FOR ALL    USING (auth.role() = 'authenticated');
