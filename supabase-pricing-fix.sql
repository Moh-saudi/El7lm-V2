-- ============================================================
-- El7lm - Pricing Tables Fix & Complete Setup
-- Run this in Supabase SQL Editor (mjuaefipdzxfqazzbyke)
-- ============================================================

-- ============================================================
-- 1. subscription_plans — إضافة الأعمدة الناقصة
-- ============================================================

ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "badges"               JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "highlights"           JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "recommendedFor"       TEXT,
  ADD COLUMN IF NOT EXISTS "description"          TEXT,
  ADD COLUMN IF NOT EXISTS "accountTypeOverrides" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "updatedAt"            TEXT;

-- تحديث الباقات الافتراضية الثلاث إن لم تكن موجودة
INSERT INTO "subscription_plans" (
  "id", "title", "subtitle", "period",
  "base_currency", "base_original_price", "base_price",
  "features", "bonusFeatures", "popular", "icon", "color",
  "overrides", "accountTypeOverrides", "isActive", "order", "updatedAt"
) VALUES
(
  'subscription_3months',
  'باقة الانطلاقة (The Kickoff)',
  'للتجربة والبداية',
  '3 شهور',
  'USD', 30, 20,
  '["ملف رياضي موثق وعلامة لاعب نشط","مساحة تخزين تصل إلى 5 فيديوهات مهارات HD","إضافة الإحصائيات الأساسية","الظهور في نتائج البحث العامة","رفع وتحديث السجل الطبي الأساسي"]',
  '[]',
  false, '📅', 'blue',
  '{"EG": {"currency": "EGP", "original_price": 150, "price": 100, "active": true}}',
  '{}',
  true, 1,
  NOW()::TEXT
),
(
  'subscription_6months',
  'باقة الاحتراف (The Pro)',
  'الخيار الأذكى',
  '6 شهور',
  'USD', 55, 35,
  '["ملف رياضي موثق وعلامة لاعب نشط","مساحة تخزين تصل إلى 5 فيديوهات مهارات HD","إضافة الإحصائيات الأساسية","الظهور في نتائج البحث العامة","رفع وتحديث السجل الطبي الأساسي","أولوية الظهور في مقدمة نتائج البحث","تحليلات أداء ذكية ورسوم بيانية تفاعلية","تنبيهات فورية عند زيارة ملفك","معرض صور احترافي","دعم فني مخصص"]',
  '[]',
  true, '👑', 'purple',
  '{"EG": {"currency": "EGP", "original_price": 250, "price": 180, "active": true}}',
  '{}',
  true, 2,
  NOW()::TEXT
),
(
  'subscription_annual',
  'باقة الحلم (The Dream)',
  'أفضل قيمة وتوفير',
  '12 شهر',
  'USD', 80, 50,
  '["ملف رياضي موثق وعلامة لاعب نشط","مساحة تخزين تصل إلى 5 فيديوهات مهارات HD","إضافة الإحصائيات الأساسية","الظهور في نتائج البحث العامة","رفع وتحديث السجل الطبي الأساسي","أولوية الظهور في مقدمة نتائج البحث","تحليلات أداء ذكية ورسوم بيانية تفاعلية","تنبيهات فورية عند زيارة ملفك","معرض صور احترافي","دعم فني مخصص","ظهور مميز في قسم مواهب الأسبوع","خاصية التواصل المباشر مع الوكلاء","مونتاج فيديو أفضل المهارات","أولوية التسجيل في تجارب الأداء","شارة نخبة الحلم الذهبية","تقرير تقييم نصف سنوي بالذكاء الاصطناعي"]',
  '[]',
  false, '⭐', 'emerald',
  '{"EG": {"currency": "EGP", "original_price": 400, "price": 250, "active": true}}',
  '{}',
  true, 3,
  NOW()::TEXT
)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 2. promotional_offers — جدول جديد غير موجود
-- ============================================================

CREATE TABLE IF NOT EXISTS "promotional_offers" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "code"             TEXT UNIQUE,
  "discountType"     TEXT DEFAULT 'percentage',  -- 'percentage' | 'fixed'
  "discountValue"    NUMERIC DEFAULT 0,
  "startDate"        TEXT,
  "endDate"          TEXT,
  "isActive"         BOOLEAN DEFAULT true,
  "scope"            TEXT DEFAULT 'all',          -- 'all' | 'accountTypes' | 'countries'
  "targetAccountTypes" JSONB DEFAULT '[]',
  "targetCountries"  JSONB DEFAULT '[]',
  "applicablePlans"  JSONB DEFAULT '[]',
  "usageLimitType"   TEXT DEFAULT 'unlimited',    -- 'unlimited' | 'total' | 'perUser'
  "totalUsageLimit"  INTEGER,
  "currentUses"      INTEGER DEFAULT 0,
  "minPlayers"       INTEGER DEFAULT 0,
  "minAmount"        NUMERIC DEFAULT 0,
  "createdAt"        TEXT DEFAULT NOW()::TEXT,
  "updatedAt"        TEXT DEFAULT NOW()::TEXT
);

-- RLS للعروض الترويجية
ALTER TABLE "promotional_offers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotional_offers_admin_all" ON "promotional_offers";
CREATE POLICY "promotional_offers_admin_all"
  ON "promotional_offers"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. partners — جدول موجود في Prisma لكن مفقود من migration
-- ============================================================

CREATE TABLE IF NOT EXISTS "partners" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "partnerName"         TEXT NOT NULL,
  "name"                TEXT,          -- alias مكرر للتوافق
  "partnerCode"         TEXT UNIQUE,
  "partnerType"         TEXT DEFAULT 'federation',  -- 'federation' | 'league' | 'government' | 'corporate'
  "status"              TEXT DEFAULT 'active',       -- 'active' | 'inactive'
  "isPublic"            BOOLEAN DEFAULT true,
  "customPricing"       JSONB DEFAULT '{}',
  "activeSubscriptions" INTEGER DEFAULT 0,
  "totalRevenue"        NUMERIC DEFAULT 0,
  "createdAt"           TEXT DEFAULT NOW()::TEXT,
  "updatedAt"           TEXT DEFAULT NOW()::TEXT
);

-- RLS للشركاء
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_admin_all" ON "partners";
CREATE POLICY "partners_admin_all"
  ON "partners"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. payment_settings — إصلاح البنية
-- الكود يتوقع: { id: countryCode, countryCode, countryName, currency, methods: [] }
-- الجدول القديم يحتوي أعمدة مختلفة — نضيف الأعمدة الناقصة
-- ============================================================

ALTER TABLE "payment_settings"
  ADD COLUMN IF NOT EXISTS "countryCode"  TEXT,
  ADD COLUMN IF NOT EXISTS "countryName"  TEXT,
  ADD COLUMN IF NOT EXISTS "currency"     TEXT,
  ADD COLUMN IF NOT EXISTS "methods"      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "updatedAt"    TEXT;

-- إدخال الإعدادات الافتراضية للدول الأربع
INSERT INTO "payment_settings" ("id", "countryCode", "countryName", "currency", "methods", "updatedAt")
VALUES
(
  'EG', 'EG', 'مصر', 'EGP',
  '[
    {"id": "geidea", "name": "بطاقة بنكية", "type": "card", "enabled": true, "isDefault": true, "icon": "💳"},
    {"id": "vodafone_cash", "name": "فودافون كاش", "type": "wallet", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "📱"},
    {"id": "instapay", "name": "انستاباي", "type": "wallet", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "⚡"},
    {"id": "bank_transfer", "name": "تحويل بنكي", "type": "bank_transfer", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "🏦"}
  ]',
  NOW()::TEXT
),
(
  'QA', 'QA', 'قطر', 'QAR',
  '[
    {"id": "skipcash", "name": "SkipCash (بطاقة بنكية)", "type": "card", "enabled": true, "isDefault": true, "icon": "💳"},
    {"id": "fawran", "name": "خدمة فورا", "type": "wallet", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "⚡"},
    {"id": "bank_transfer", "name": "تحويل بنكي", "type": "bank_transfer", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "🏦"}
  ]',
  NOW()::TEXT
),
(
  'SA', 'SA', 'السعودية', 'SAR',
  '[
    {"id": "geidea", "name": "بطاقة بنكية", "type": "card", "enabled": true, "isDefault": true, "icon": "💳"},
    {"id": "stc_pay", "name": "STC Pay", "type": "wallet", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "📱"},
    {"id": "bank_transfer", "name": "تحويل بنكي", "type": "bank_transfer", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "🏦"}
  ]',
  NOW()::TEXT
),
(
  'GLOBAL', 'GLOBAL', 'دولي (USD)', 'USD',
  '[
    {"id": "geidea", "name": "بطاقة بنكية", "type": "card", "enabled": true, "isDefault": true, "icon": "💳"},
    {"id": "paypal", "name": "PayPal", "type": "wallet", "enabled": true, "isDefault": false, "icon": "💙"},
    {"id": "bank_transfer", "name": "تحويل بنكي", "type": "bank_transfer", "enabled": true, "isDefault": false, "accountNumber": "", "icon": "🏦"}
  ]',
  NOW()::TEXT
)
ON CONFLICT ("id") DO UPDATE SET
  "countryCode" = EXCLUDED."countryCode",
  "countryName" = EXCLUDED."countryName",
  "currency"    = EXCLUDED."currency",
  "methods"     = CASE
                    WHEN "payment_settings"."methods" IS NULL OR "payment_settings"."methods" = '[]'
                    THEN EXCLUDED."methods"
                    ELSE "payment_settings"."methods"
                  END,
  "updatedAt"   = NOW()::TEXT;

-- ============================================================
-- 5. RLS على subscription_plans — تأكيد الصلاحيات
-- ============================================================

ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_read_all" ON "subscription_plans";
CREATE POLICY "plans_read_all"
  ON "subscription_plans"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "plans_write_admin" ON "subscription_plans";
CREATE POLICY "plans_write_admin"
  ON "subscription_plans"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 6. تحقق من الجداول — استعلام للتأكد
-- ============================================================

SELECT
  'subscription_plans'  AS table_name, COUNT(*) AS row_count FROM "subscription_plans"
UNION ALL SELECT
  'promotional_offers', COUNT(*) FROM "promotional_offers"
UNION ALL SELECT
  'partners',           COUNT(*) FROM "partners"
UNION ALL SELECT
  'payment_settings',   COUNT(*) FROM "payment_settings";
