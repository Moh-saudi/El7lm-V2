-- ==============================================================================
-- Migration: create_phone_accounts_index.sql
-- Description: إنشاء جدول الفهرس المركزي الموحد لأرقام الهواتف (phone_accounts_index)
-- Phase: El7lm-V2 Phase 3.1 Authentication & Conflict Resolution Architecture
-- ==============================================================================

-- 1. إنشاء جدول phone_accounts_index
CREATE TABLE IF NOT EXISTS public.phone_accounts_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  supabase_uid UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- أعمدة دعم إدارة التعارضات والحساب الأساسي (Phase 3.1)
  conflict_status TEXT NOT NULL DEFAULT 'clean',
  primary_account_id TEXT NULL,
  review_notes TEXT NULL,
  
  -- قيود التحقق والأمان
  CONSTRAINT uq_phone_accounts_index_phone UNIQUE (phone_normalized),
  CONSTRAINT chk_phone_normalized_format CHECK (phone_normalized ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT chk_account_id_not_empty CHECK (length(trim(account_id)) > 0),
  CONSTRAINT chk_account_type_not_empty CHECK (length(trim(account_type)) > 0),
  CONSTRAINT chk_source_table_not_empty CHECK (length(trim(source_table)) > 0),
  CONSTRAINT chk_phone_accounts_conflict_status CHECK (conflict_status IN (
    'clean', 
    'confirmed_same_user', 
    'conflict_different_users', 
    'test_account', 
    'ambiguous', 
    'resolved'
  ))
);

-- 2. إنشاء الفهارس المطلوبة لتحقيق أقصى سرعة استعلام (O(1))
CREATE INDEX IF NOT EXISTS idx_phone_acc_phone_normalized ON public.phone_accounts_index (phone_normalized);
CREATE INDEX IF NOT EXISTS idx_phone_acc_account_id ON public.phone_accounts_index (account_id);
CREATE INDEX IF NOT EXISTS idx_phone_acc_supabase_uid ON public.phone_accounts_index (supabase_uid);
CREATE INDEX IF NOT EXISTS idx_phone_acc_account_type ON public.phone_accounts_index (account_type);
CREATE INDEX IF NOT EXISTS idx_phone_acc_source_table ON public.phone_accounts_index (source_table);
CREATE INDEX IF NOT EXISTS idx_phone_acc_conflict_status ON public.phone_accounts_index (conflict_status);
CREATE INDEX IF NOT EXISTS idx_phone_acc_primary_account_id ON public.phone_accounts_index (primary_account_id) WHERE primary_account_id IS NOT NULL;

-- 3. دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.set_phone_accounts_index_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phone_accounts_index_updated_at ON public.phone_accounts_index;
CREATE TRIGGER trg_phone_accounts_index_updated_at
  BEFORE UPDATE ON public.phone_accounts_index
  FOR EACH ROW
  EXECUTE FUNCTION public.set_phone_accounts_index_updated_at();

-- 4. تعليقات التوثيق
COMMENT ON TABLE public.phone_accounts_index IS 'جدول الفهرس المركزي الموحد لربط أرقام الهواتف بصيغة E.164 بالحسابات ومعرفات Supabase Auth مع إدارة التعارضات';
COMMENT ON COLUMN public.phone_accounts_index.phone_normalized IS 'رقم الهاتف الموحد بصيغة E.164 الدولية (+[CountryCode][Number])';
COMMENT ON COLUMN public.phone_accounts_index.account_id IS 'المعرف الأساسي للحساب في جدول المصدر (id)';
COMMENT ON COLUMN public.phone_accounts_index.account_type IS 'نوع الحساب: player, club, academy, agent, trainer, marketer, admin, user';
COMMENT ON COLUMN public.phone_accounts_index.source_table IS 'اسم جدول المصدر الأساسي';
COMMENT ON COLUMN public.phone_accounts_index.supabase_uid IS 'معرف المستخدم في نظام Supabase Auth (auth.users.id)';
COMMENT ON COLUMN public.phone_accounts_index.conflict_status IS 'حالة التعارض: clean, confirmed_same_user, conflict_different_users, test_account, ambiguous, resolved';
COMMENT ON COLUMN public.phone_accounts_index.primary_account_id IS 'معرف الحساب الأساسي المعتمد للأولوية عند تسجيل الدخول بالـ OTP في حال تكرار الحسابات لنفس المستخدم';
COMMENT ON COLUMN public.phone_accounts_index.review_notes IS 'ملاحظات وتفاصيل المراجعة الهندسية أو الإدارية لسبب حسم التعارض أو عزل الرقم';
