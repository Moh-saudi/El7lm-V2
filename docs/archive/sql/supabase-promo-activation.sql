-- ============================================================
-- El7lm - Activation Promo Code for Dream Ambassadors
-- Run this in Supabase SQL Editor (mjuaefipdzxfqazzbyke)
-- ============================================================

-- إنشاء كود ترويجي لحملة "سفراء الحلم" / التذكير بالتفعيل
INSERT INTO "promotional_offers" (
  id,
  name,
  description,
  code,
  "discountType",
  "discountValue",
  "startDate",
  "endDate",
  "isActive",
  scope,
  "targetAccountTypes",
  "usageLimitType",
  "currentUses",
  "createdAt"
)
VALUES (
  gen_random_uuid()::text,
  'كود سفراء الحلم',
  'كود خصم خاص يُرسل تلقائياً عبر واتساب لتحفيز تفعيل الاشتراك',
  'EL7LM2026',
  'percentage',
  20,
  '2026-01-01',
  '2027-12-31',
  true,
  'activation',
  '["player", "club", "academy", "trainer", "agent", "marketer"]'::jsonb,
  'unlimited',
  0,
  now()::text
)
ON CONFLICT (code) DO UPDATE SET
  "isActive"    = true,
  scope         = 'activation',
  "discountType"  = EXCLUDED."discountType",
  "discountValue" = EXCLUDED."discountValue",
  "endDate"       = EXCLUDED."endDate";

-- تحقق
SELECT id, name, code, "discountType", "discountValue", scope, "isActive"
FROM "promotional_offers"
WHERE scope = 'activation';
