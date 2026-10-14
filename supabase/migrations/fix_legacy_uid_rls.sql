-- إصلاح سياسات RLS لدعم كل من supabase_uid و legacy uid المهاجر من فايربيز

DROP POLICY IF EXISTS "users_read_own_notifications" ON notifications;
CREATE POLICY "users_read_own_notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  "userId" = auth.uid()::text 
  OR "userId" IN (
    SELECT uid FROM users WHERE supabase_uid = auth.uid()
    UNION
    SELECT id FROM users WHERE supabase_uid = auth.uid()
  )
  OR (metadata->>'supabase_uid') = auth.uid()::text
);

DROP POLICY IF EXISTS "users_read_own_messages" ON messages;
CREATE POLICY "users_read_own_messages"
ON messages FOR SELECT
TO authenticated
USING (
  "senderId" = auth.uid()::text 
  OR "receiverId" = auth.uid()::text
  OR "senderId" IN (
    SELECT uid FROM users WHERE supabase_uid = auth.uid()
    UNION
    SELECT id FROM users WHERE supabase_uid = auth.uid()
  )
  OR "receiverId" IN (
    SELECT uid FROM users WHERE supabase_uid = auth.uid()
    UNION
    SELECT id FROM users WHERE supabase_uid = auth.uid()
  )
);
