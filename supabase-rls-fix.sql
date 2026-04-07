-- =====================================================
-- إصلاح سياسات RLS - السماح للمستخدمين المصادق عليهم بقراءة البيانات
-- المنصة الرياضية تحتاج قراءة الملفات الشخصية من قِبَل جميع المستخدمين
-- =====================================================

-- users: قراءة للجميع، كتابة لصاحب الحساب فقط
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_auth" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- players: قراءة للجميع، كتابة لصاحب الحساب
DROP POLICY IF EXISTS "players_select_own" ON players;
CREATE POLICY "players_select_auth" ON players
  FOR SELECT USING (auth.role() = 'authenticated');

-- clubs: قراءة للجميع
DROP POLICY IF EXISTS "clubs_select_own" ON clubs;
CREATE POLICY "clubs_select_auth" ON clubs
  FOR SELECT USING (auth.role() = 'authenticated');

-- academies: قراءة للجميع
DROP POLICY IF EXISTS "academies_select_own" ON academies;
CREATE POLICY "academies_select_auth" ON academies
  FOR SELECT USING (auth.role() = 'authenticated');

-- agents: قراءة للجميع
DROP POLICY IF EXISTS "agents_select_own" ON agents;
CREATE POLICY "agents_select_auth" ON agents
  FOR SELECT USING (auth.role() = 'authenticated');

-- trainers: قراءة للجميع
DROP POLICY IF EXISTS "trainers_select_own" ON trainers;
CREATE POLICY "trainers_select_auth" ON trainers
  FOR SELECT USING (auth.role() = 'authenticated');

-- marketers: قراءة للجميع
DROP POLICY IF EXISTS "marketers_select_own" ON marketers;
CREATE POLICY "marketers_select_auth" ON marketers
  FOR SELECT USING (auth.role() = 'authenticated');

-- admins: قراءة للجميع
DROP POLICY IF EXISTS "admins_select_own" ON admins;
CREATE POLICY "admins_select_auth" ON admins
  FOR SELECT USING (auth.role() = 'authenticated');

-- notifications: قراءة صاحب الإشعار فقط
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    auth.uid()::text = "userId"
    OR auth.uid()::text IN (SELECT id FROM users WHERE id = auth.uid()::text AND "isAdmin" = true)
  );

-- messages: قراءة المشاركين فقط
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT USING (auth.uid()::text = "senderId" OR auth.uid()::text = "receiverId");

-- invoices: قراءة صاحب الفاتورة
DROP POLICY IF EXISTS "invoices_select_own" ON invoices;
CREATE POLICY "invoices_select_own" ON invoices
  FOR SELECT USING (auth.uid()::text = "userId");

-- subscriptions: قراءة صاحب الاشتراك
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid()::text = "userId" OR auth.uid()::text = id);
