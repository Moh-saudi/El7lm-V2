-- ============================================================
-- Gallery & Sponsors for Tournament Portal
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS tournament_gallery (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournament_new(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  caption       TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_sponsors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournament_new(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  logo_url      TEXT,
  tier          TEXT        NOT NULL DEFAULT 'gold',  -- platinum / gold / silver / bronze
  website_url   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE tournament_gallery  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_public_read"   ON tournament_gallery  FOR SELECT USING (true);
CREATE POLICY "gallery_auth_write"    ON tournament_gallery  FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "sponsors_public_read"  ON tournament_sponsors FOR SELECT USING (true);
CREATE POLICY "sponsors_auth_write"   ON tournament_sponsors FOR ALL    USING (auth.role() = 'authenticated');
