-- =============================================================================
-- El7lm-V2 — SQL Diagnostics (Read-Only)
-- شغّل هذه الاستعلامات في Supabase SQL Editor
-- جميعها للقراءة فقط — لا تُعدِّل البيانات
-- =============================================================================

-- =============================================================================
-- 1) أبطأ الاستعلامات إجمالاً (يتطلب pg_stat_statements)
-- كيف تقرأ النتائج: ابحث عن mean_ms > 100 وtotal_ms العالية
-- =============================================================================
SELECT
  left(query, 150) AS query,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(total_exec_time::numeric, 0) AS total_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- =============================================================================
-- 2) حجم الجداول وعدد صفوفها
-- =============================================================================
SELECT
  relname AS table_name,
  n_live_tup AS approx_rows,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- =============================================================================
-- 3) الجداول التي تُقرأ بمسح كامل كثيراً (seq_scan عالية = غياب Index)
-- كيف تقرأ: seq_scan عالية مع idx_scan منخفض = تحتاج Index
-- =============================================================================
SELECT
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE
    WHEN seq_scan > 0 AND idx_scan = 0 THEN 'NO INDEX USED!'
    WHEN seq_scan > idx_scan THEN 'seq_scan dominant'
    ELSE 'index OK'
  END AS status
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC
LIMIT 15;

-- =============================================================================
-- 4) كل الـ Indexes في public
-- =============================================================================
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =============================================================================
-- 5) Indexes غير المستخدمة
-- تحذير: العدّاد يبدأ من آخر RESET للإحصاءات — لا تحذف بلا تحقق
-- =============================================================================
SELECT
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC
LIMIT 20;

-- =============================================================================
-- 6) سياسات RLS
-- =============================================================================
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- 7) هل RLS مفعَّل على كل جدول؟
-- relrowsecurity = false يعني جدول بلا RLS = خطر أمني!
-- =============================================================================
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY rls_enabled ASC, relname;

-- =============================================================================
-- 8) البحث في الأعمدة المستخدمة للبحث بالهاتف — هل لها Index؟
-- =============================================================================
SELECT
  t.table_name,
  c.column_name,
  CASE WHEN i.indexname IS NOT NULL THEN 'YES' ELSE 'NO' END AS has_index
FROM information_schema.tables t
JOIN information_schema.columns c
  ON t.table_name = c.table_name AND t.table_schema = 'public'
LEFT JOIN pg_indexes i
  ON i.tablename = t.table_name
  AND i.indexdef LIKE '%' || c.column_name || '%'
  AND i.schemaname = 'public'
WHERE t.table_schema = 'public'
  AND t.table_name IN ('players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'users')
  AND c.column_name IN ('phone', 'originalPhone', 'phoneNumber', 'phoneNormalized', 'whatsapp', 'uid', 'email')
ORDER BY t.table_name, c.column_name;

-- =============================================================================
-- 9) تنوع صيغ أرقام الهاتف في جدول players
-- هذا يُساعد في تحديد استراتيجية التطبيع
-- =============================================================================
SELECT
  CASE
    WHEN phone LIKE '+%' THEN 'international (+)'
    WHEN phone LIKE '00%' THEN 'international (00)'
    WHEN phone ~ '^01[0-9]{9}$' THEN 'egypt local (01...)'
    WHEN phone ~ '^05[0-9]{8}$' THEN 'saudi local (05...)'
    WHEN phone ~ '^20[0-9]{10}$' THEN 'egypt no+ (20...)'
    WHEN phone ~ '^966[0-9]{9}$' THEN 'saudi no+ (966...)'
    WHEN LENGTH(phone) BETWEEN 8 AND 15 THEN 'other numeric'
    ELSE 'invalid/null'
  END AS phone_format,
  COUNT(*) AS count
FROM players
WHERE phone IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;

-- =============================================================================
-- 10) هل يوجد رقم مسجَّل في أكثر من جدول؟ (تحقق من التكرار)
-- =============================================================================
WITH all_phones AS (
  SELECT phone, 'players' AS source FROM players WHERE phone IS NOT NULL
  UNION ALL
  SELECT phone, 'users' FROM users WHERE phone IS NOT NULL
  UNION ALL
  SELECT phone, 'clubs' FROM clubs WHERE phone IS NOT NULL
  UNION ALL
  SELECT phone, 'academies' FROM academies WHERE phone IS NOT NULL
)
SELECT
  phone,
  COUNT(DISTINCT source) AS source_count,
  STRING_AGG(source, ', ') AS sources
FROM all_phones
GROUP BY phone
HAVING COUNT(DISTINCT source) > 1
ORDER BY source_count DESC
LIMIT 20;

-- =============================================================================
-- 11) الـ otp_verifications — حالة الجدول
-- =============================================================================
SELECT
  COUNT(*) AS total_records,
  SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) AS verified,
  SUM(CASE WHEN "expiresAt" < NOW() THEN 1 ELSE 0 END) AS expired,
  SUM(CASE WHEN verified = false AND "expiresAt" > NOW() THEN 1 ELSE 0 END) AS active
FROM otp_verifications;

-- =============================================================================
-- 12) الاتصالات النشطة بقاعدة البيانات
-- =============================================================================
SELECT
  state,
  COUNT(*) AS count,
  MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) AS max_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
