-- ==============================================================================
-- Migration: add_conflict_resolution_to_phone_accounts_index.sql
-- Description: تعديل جدول phone_accounts_index لدعم إدارة التعارضات والحساب الأساسي
-- Phase: El7lm-V2 Phase 3.1 — Phone Conflict Resolution Architecture
-- ==============================================================================

-- 1. إضافة الأعمدة الجديدة لدعم إدارة التعارضات
ALTER TABLE IF EXISTS public.phone_accounts_index
  ADD COLUMN IF NOT EXISTS conflict_status TEXT NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS primary_account_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT NULL;

-- 2. قيود التحقق لحالة التعارض
-- القيم المسموحة:
--   'clean'                    : رقم سليم غير متعارض (حساب وحيد)
--   'confirmed_same_user'      : الفئة A (نفس المستخدم بشكل مؤكد - تم اختيار Primary)
--   'conflict_different_users' : الفئة B (نفس الرقم لحسابات مختلفة - بانتظار قرار إداري)
--   'test_account'             : الفئة C (حساب اختبار / بذور قديمة)
--   'ambiguous'                : الفئة D (حالة غير واضحة / رقم مبتور / بيانات ناقصة)
--   'resolved'                 : تم حسم التعارض واعتماده إدارياً
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_phone_accounts_conflict_status'
  ) THEN
    ALTER TABLE public.phone_accounts_index
      ADD CONSTRAINT chk_phone_accounts_conflict_status
      CHECK (conflict_status IN (
        'clean', 
        'confirmed_same_user', 
        'conflict_different_users', 
        'test_account', 
        'ambiguous', 
        'resolved'
      ));
  END IF;
END $$;

-- 3. إنشاء الفهارس لتسريع استعلامات لوحة التحكم وفحص التعارضات
CREATE INDEX IF NOT EXISTS idx_phone_acc_conflict_status 
  ON public.phone_accounts_index (conflict_status);

CREATE INDEX IF NOT EXISTS idx_phone_acc_primary_account_id 
  ON public.phone_accounts_index (primary_account_id) 
  WHERE primary_account_id IS NOT NULL;

-- 4. توثيق الحقول
COMMENT ON COLUMN public.phone_accounts_index.conflict_status IS 'حالة التعارض: clean, confirmed_same_user, conflict_different_users, test_account, ambiguous, resolved';
COMMENT ON COLUMN public.phone_accounts_index.primary_account_id IS 'معرف الحساب الأساسي المعتمد للأولوية عند تسجيل الدخول بالـ OTP في حال تكرار الحسابات لنفس المستخدم';
COMMENT ON COLUMN public.phone_accounts_index.review_notes IS 'ملاحظات وتفاصيل المراجعة الهندسية أو الإدارية لسبب حسم التعارض أو عزل الرقم';
