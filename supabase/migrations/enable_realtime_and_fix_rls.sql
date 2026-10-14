-- ==============================================================================
-- 🚀 تفعيل البث اللحظي (Supabase Realtime) وإصلاح سياسات الأمان (RLS)
-- مشروع الحلم - El7lm Platform
-- ==============================================================================

-- 1. تفعيل البث اللحظي بجداول الإشعارات والرسائل في منشور supabase_realtime
DO $$
BEGIN
  -- إضافة جدول notifications للمنشور إن لم يكن مضافاً
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- إضافة جدول messages للمنشور إن لم يكن مضافاً
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  -- إضافة جدول broadcasts للمنشور إن لم يكن مضافاً
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'broadcasts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
  END IF;
END $$;

-- 2. ضبط REPLICA IDENTITY FULL لتمكين وصول السجلات كاملة في أحداث Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.broadcasts REPLICA IDENTITY FULL;

-- 3. تفعيل RLS وضمان قراءة المستخدمين لإشعاراتهم
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة الإشعارات: تسمح للمستخدم أو الجلسة بقراءة إشعاراته
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications"
  ON public.notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      "userId" = auth.uid()::text OR
      "userId" IN (
        SELECT id::text FROM public.users 
        WHERE uid = auth.uid()::text 
           OR id::text = auth.uid()::text 
           OR supabase_uid = auth.uid()
      )
    )
  );

-- سياسة قراءة الرسائل: تسمح للمرسل أو المستقبل بقراءة رسائله
DROP POLICY IF EXISTS "users_read_own_messages" ON public.messages;
CREATE POLICY "users_read_own_messages"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      "receiverId" = auth.uid()::text OR
      "senderId" = auth.uid()::text OR
      "receiverId" IN (
        SELECT id::text FROM public.users 
        WHERE uid = auth.uid()::text 
           OR id::text = auth.uid()::text 
           OR supabase_uid = auth.uid()
      ) OR
      "senderId" IN (
        SELECT id::text FROM public.users 
        WHERE uid = auth.uid()::text 
           OR id::text = auth.uid()::text 
           OR supabase_uid = auth.uid()
      )
    )
  );

-- سياسة Service Role: تمنح الخادم الإداري صلاحيات كاملة
DROP POLICY IF EXISTS "service_role_all_notifications" ON public.notifications;
CREATE POLICY "service_role_all_notifications"
  ON public.notifications
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_messages" ON public.messages;
CREATE POLICY "service_role_all_messages"
  ON public.messages
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
