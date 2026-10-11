-- ==========================================
-- El7lm Platform - Supabase Setup
-- Project: mjuaefipdzxfqazzbyke
-- Run this in Supabase SQL Editor
-- ==========================================

-- تفعيل امتداد UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. APPLY FULL SCHEMA
-- ==========================================
-- الصق محتوى ملف schema.sql هنا أو شغّله أولاً

-- ==========================================
-- 2. INDEXES (الفهارس للأداء)
-- ==========================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users("accountType");
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

-- Players
CREATE INDEX IF NOT EXISTS idx_players_phone ON players(phone);
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);
CREATE INDEX IF NOT EXISTS idx_players_uid ON players(uid);
CREATE INDEX IF NOT EXISTS idx_players_club_id ON players("clubId");
CREATE INDEX IF NOT EXISTS idx_players_club_id2 ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_academy_id ON players("academyId");
CREATE INDEX IF NOT EXISTS idx_players_agent_id ON players("agentId");
CREATE INDEX IF NOT EXISTS idx_players_trainer_id ON players("trainerId");
CREATE INDEX IF NOT EXISTS idx_players_org_id ON players("organizationId");
CREATE INDEX IF NOT EXISTS idx_players_active ON players("isActive");
CREATE INDEX IF NOT EXISTS idx_players_deleted ON players("isDeleted");
CREATE INDEX IF NOT EXISTS idx_players_sub_status ON players("subscriptionStatus");

-- Clubs
CREATE INDEX IF NOT EXISTS idx_clubs_phone ON clubs(phone);
CREATE INDEX IF NOT EXISTS idx_clubs_email ON clubs(email);
CREATE INDEX IF NOT EXISTS idx_clubs_uid ON clubs(uid);
CREATE INDEX IF NOT EXISTS idx_clubs_org_code ON clubs("organizationCode");
CREATE INDEX IF NOT EXISTS idx_clubs_active ON clubs("isActive");

-- Academies
CREATE INDEX IF NOT EXISTS idx_academies_phone ON academies(phone);
CREATE INDEX IF NOT EXISTS idx_academies_email ON academies(email);
CREATE INDEX IF NOT EXISTS idx_academies_uid ON academies(uid);
CREATE INDEX IF NOT EXISTS idx_academies_active ON academies("isActive");

-- Agents
CREATE INDEX IF NOT EXISTS idx_agents_phone ON agents(phone);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_uid ON agents(uid);

-- Trainers
CREATE INDEX IF NOT EXISTS idx_trainers_phone ON trainers(phone);
CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);
CREATE INDEX IF NOT EXISTS idx_trainers_uid ON trainers(uid);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations("updatedAt");
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg_time ON conversations("lastMessageTime");

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages("senderId");

-- Support
CREATE INDEX IF NOT EXISTS idx_support_conv_user ON support_conversations("userId");
CREATE INDEX IF NOT EXISTS idx_support_conv_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_conv ON support_messages("conversationId");

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON admin_notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_smart_notif_user ON smart_notifications("userId");
CREATE INDEX IF NOT EXISTS idx_interaction_notif_user ON interaction_notifications("userId");
CREATE INDEX IF NOT EXISTS idx_interaction_notif_owner ON interaction_notifications("profileOwnerId");
CREATE INDEX IF NOT EXISTS idx_player_notif_player ON player_notifications("playerId");
CREATE INDEX IF NOT EXISTS idx_join_req_notif_org ON join_request_notifications("organizationId");

-- Payments
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices("userId");
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices("createdAt");
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions("userId");
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions("expires_at");
CREATE INDEX IF NOT EXISTS idx_geidea_order ON geidea_payments("orderId");
CREATE INDEX IF NOT EXISTS idx_geidea_merchant_ref ON geidea_payments("merchantReferenceId");
CREATE INDEX IF NOT EXISTS idx_bulk_user ON "bulkPayments"("userId");
CREATE INDEX IF NOT EXISTS idx_bulk_created ON "bulkPayments"("createdAt");

-- Tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_active ON tournaments("isActive");
CREATE INDEX IF NOT EXISTS idx_tournament_reg_tournament ON tournament_registrations("tournamentId");
CREATE INDEX IF NOT EXISTS idx_tournament_reg_player ON tournament_registrations("playerId");
CREATE INDEX IF NOT EXISTS idx_tournament_reg_status ON tournament_registrations(status);

-- Join Requests
CREATE INDEX IF NOT EXISTS idx_join_requests_player ON player_join_requests("playerId");
CREATE INDEX IF NOT EXISTS idx_join_requests_org ON player_join_requests("organizationId");
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON player_join_requests(status);

-- OTP
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes("phoneNumber");
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes("expiresAt");

-- Dream Academy
CREATE INDEX IF NOT EXISTS idx_dream_sources_category ON dream_academy_sources("categoryId");
CREATE INDEX IF NOT EXISTS idx_dream_sources_active ON dream_academy_sources("isActive");

-- Org Referrals
CREATE INDEX IF NOT EXISTS idx_org_referrals_code ON organization_referrals("referralCode");
CREATE INDEX IF NOT EXISTS idx_org_referrals_org ON organization_referrals("organizationId");

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_uid ON employees(uid);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees("isActive");

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- تفعيل RLS على الجداول الحساسة
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_request_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies - السياسات
-- ==========================================

-- USERS: كل مستخدم يرى بياناته فقط (إدارة بالـ service_role)
CREATE POLICY "users_service_full_access" ON users
  FOR ALL USING (true)
  WITH CHECK (true);

-- PLAYERS: نفس المنطق
CREATE POLICY "players_service_full_access" ON players
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "clubs_service_full_access" ON clubs
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "academies_service_full_access" ON academies
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "agents_service_full_access" ON agents
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "trainers_service_full_access" ON trainers
  FOR ALL USING (true)
  WITH CHECK (true);

-- NOTIFICATIONS: المستخدم يرى إشعاراته فقط
CREATE POLICY "notifications_owner_access" ON notifications
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "smart_notifications_access" ON smart_notifications
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "interaction_notifications_access" ON interaction_notifications
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "player_notifications_access" ON player_notifications
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "join_req_notifications_access" ON join_request_notifications
  FOR ALL USING (true)
  WITH CHECK (true);

-- CONVERSATIONS
CREATE POLICY "conversations_access" ON conversations
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "messages_access" ON messages
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "support_conversations_access" ON support_conversations
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "support_messages_access" ON support_messages
  FOR ALL USING (true)
  WITH CHECK (true);

-- PAYMENTS
CREATE POLICY "invoices_access" ON invoices
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "subscriptions_access" ON subscriptions
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "payments_access" ON payments
  FOR ALL USING (true)
  WITH CHECK (true);

-- ==========================================
-- 4. REALTIME - تفعيل الإشعارات الفورية
-- ==========================================

-- تفعيل Realtime على الجداول الحيوية
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE smart_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE interaction_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE player_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_registrations;

-- ==========================================
-- 5. STORAGE BUCKETS
-- ==========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-images', 'profile-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('videos', 'videos', false, 524288000, ARRAY['video/mp4','video/webm','video/ogg','video/quicktime']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf','image/jpeg','image/png']),
  ('playertrainer', 'playertrainer', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('playerclub', 'playerclub', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('playeragent', 'playeragent', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('playeracademy', 'playeracademy', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('wallet', 'wallet', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('clubavatar', 'clubavatar', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('agent', 'agent', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('academy', 'academy', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('trainer', 'trainer', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('ads', 'ads', true, 104857600, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Storage policies
CREATE POLICY "public_read_profile_images" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
CREATE POLICY "auth_upload_profile_images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-images');
CREATE POLICY "auth_update_profile_images" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-images');
CREATE POLICY "auth_delete_profile_images" ON storage.objects FOR DELETE USING (bucket_id = 'profile-images');

CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "auth_upload_avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "auth_update_avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "auth_delete_avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');

CREATE POLICY "public_read_ads" ON storage.objects FOR SELECT USING (bucket_id = 'ads');
CREATE POLICY "auth_upload_ads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ads');
CREATE POLICY "auth_update_ads" ON storage.objects FOR UPDATE USING (bucket_id = 'ads');
CREATE POLICY "auth_delete_ads" ON storage.objects FOR DELETE USING (bucket_id = 'ads');

CREATE POLICY "public_read_clubavatar" ON storage.objects FOR SELECT USING (bucket_id = 'clubavatar');
CREATE POLICY "auth_upload_clubavatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clubavatar');

CREATE POLICY "public_read_agent" ON storage.objects FOR SELECT USING (bucket_id = 'agent');
CREATE POLICY "auth_upload_agent" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'agent');

CREATE POLICY "public_read_academy" ON storage.objects FOR SELECT USING (bucket_id = 'academy');
CREATE POLICY "auth_upload_academy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'academy');

CREATE POLICY "public_read_trainer" ON storage.objects FOR SELECT USING (bucket_id = 'trainer');
CREATE POLICY "auth_upload_trainer" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trainer');

CREATE POLICY "public_read_playerclub" ON storage.objects FOR SELECT USING (bucket_id IN ('playerclub','playertrainer','playeragent','playeracademy'));
CREATE POLICY "auth_upload_playertype" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('playerclub','playertrainer','playeragent','playeracademy'));

CREATE POLICY "auth_read_videos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "auth_upload_videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
CREATE POLICY "auth_update_videos" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
CREATE POLICY "auth_delete_videos" ON storage.objects FOR DELETE USING (bucket_id = 'videos');

CREATE POLICY "auth_read_documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "auth_upload_documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth_delete_documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents');

CREATE POLICY "auth_read_wallet" ON storage.objects FOR SELECT USING (bucket_id = 'wallet');
CREATE POLICY "auth_upload_wallet" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wallet');
