# 🏆 خطة الانتقال الكاملة: Firebase → Supabase
## مشروع إل-حلم | El7lm Football Platform

**آخر تحديث:** 2026-03-23
**الحالة الراهنة:** قاعدة البيانات منقولة ✅ | المصادقة لا تزال Firebase ❌ | الكود لا يزال يقرأ من Firebase ❌

---

## 📊 الوضع الحالي

| العنصر | الحالة | الملاحظة |
|--------|--------|----------|
| بيانات Firestore | ✅ منقولة | 70 collection في Supabase |
| المصادقة (Auth) | ❌ Firebase فقط | يجب الانتقال لـ Supabase Auth |
| التخزين (Storage) | ⚠️ هجين | Supabase buckets موجودة، الكود لا يزال يرفع لـ Firebase |
| Schema قاعدة البيانات | ❌ تحتاج إصلاح | 254 عمود في users، أعمدة مكررة، أنواع خاطئة |
| كود الـ Frontend | ❌ Firebase | 20+ صفحة admin، كل صفحات Auth |
| API Routes | ❌ Firebase | 15+ route لا تزال تستخدم Firestore |
| الفهارس (Indexes) | ❌ لا يوجد | صفر CREATE INDEX في الـ schema |
| Foreign Keys | ❌ لا يوجد | صفر علاقات مفروضة |

---

## 🗺️ الخطة الكاملة — 5 مراحل

---

## المرحلة 1️⃣ — إصلاح Schema قاعدة البيانات
**الأولوية: حرجة | المدة: 3-4 أيام**

> لا يمكن بناء شيء صحيح على أساس خاطئ. يجب إصلاح الـ schema أولاً.

### 1.1 — أمان فوري 🔴
- [ ] حذف أعمدة `password`, `confirmPassword`, `tempPassword` من جدول `users`
  - هذه الكلمات موجودة كـ plain text — خطر أمني حرج
  - المصادقة ستكون عبر Supabase Auth وليس هذه الأعمدة

### 1.2 — إصلاح أنواع البيانات الخاطئة
- [ ] تحويل `created_at`, `updated_at`, `createdAt` من `JSONB` إلى `TIMESTAMPTZ` في:
  - `players`, `trainers`, `agents`, `academies`, `academys`
- [ ] تحويل `startDate`, `endDate`, `registrationDeadline` في `tournaments` من `TEXT` إلى `TIMESTAMPTZ`
- [ ] تحويل `unreadCount` في `conversations` من `JSONB` إلى `INTEGER`
- [ ] تصحيح `created_at` في `players` (مخزنة كـ JSON object)

### 1.3 — دمج الجداول المكررة
- [ ] دمج `academys` (37) + `academies` (33) → جدول واحد `academies` (بعد إزالة التكرار)
- [ ] دمج `tournamentRegistrations` (5) + `tournament_registrations` (14) → `tournament_registrations`
- [ ] دمج `careerApplications` (1) + `careers_applications` (51) → `careers_applications`
- [ ] دمج جداول OTP الأربعة (`otps`, `otp_codes`, `otp_verifications`, `backup_otps`) → `otp_codes`
- [ ] دمج جداول الإشعارات الستة → استراتيجية موحدة

### 1.4 — حذف الأعمدة المكررة (camelCase vs snake_case)
القاعدة: **نحتفظ بـ snake_case فقط** — هذا معيار PostgreSQL

جداول تحتاج تنظيف:
- `subscriptions`: حذف `userId`→`user_id`, `packageName`→`package_name`, `paymentId`→`payment_id`, `activatedAt`→`activated_at`, `expiresAt`→`expires_at`, `createdAt`→`created_at`, `updatedAt`→`updated_at`, `autoRenew`→`auto_renew`
- `players`: حذف `clubId`→`club_id`, `agentId`→`agent_id`, `trainerId`→`trainer_id`, `academyId`→`academy_id`
- `messages`: حذف `isRead`→`read` (أو العكس، تقرير أيهما يحتوي بيانات أكثر), `messageType`→`type`, `createdAt`→`timestamp`
- جميع الجداول: `createdAt`→`created_at`, `updatedAt`→`updated_at`, `lastLogin`→`last_login`

### 1.5 — إضافة الفهارس (Indexes)
```sql
-- users & auth
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_deleted = false;

-- players
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_club_id ON players(club_id);
CREATE INDEX idx_players_agent_id ON players(agent_id);
CREATE INDEX idx_players_subscription_status ON players(subscription_status);

-- subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- messages & conversations
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = false;

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;

-- payments
CREATE INDEX idx_geidea_payments_status ON geidea_payments(status);
CREATE INDEX idx_geidea_payments_merchant_ref ON geidea_payments(merchant_reference_id);

-- analytics
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp DESC);
CREATE INDEX idx_analytics_visits_created_at ON analytics_visits(created_at DESC);
```

### 1.6 — إضافة Foreign Keys
```sql
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tournament_registrations ADD CONSTRAINT fk_treg_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id);
ALTER TABLE player_join_requests ADD CONSTRAINT fk_pjr_player FOREIGN KEY (player_id) REFERENCES players(id);
```

### 1.7 — تطبيع جدول `users` العملاق
**الهدف:** تقليل 254 عمود إلى 25 عمود أساسي

```
users (جدول base)
├── id, email, phone, full_name
├── account_type (player/club/academy/trainer/agent/marketer/admin)
├── is_active, is_deleted, is_verified
├── subscription_status, subscription_expires_at
├── profile_image, country, city
├── created_at, updated_at, last_login
└── firebase_uid (للـ backward compatibility مؤقتاً)

player_profiles (امتداد للاعبين فقط)
club_profiles (امتداد للأندية فقط)
academy_profiles (امتداد للأكاديميات فقط)
trainer_profiles (امتداد للمدربين فقط)
agent_profiles (امتداد للوكلاء فقط)
```

---

## المرحلة 2️⃣ — إعداد Supabase Auth
**الأولوية: عالية | المدة: 2-3 أيام**

> المصادقة هي قلب النظام — يجب الانتقال إليها بحذر شديد.

### 2.1 — تحضير Supabase Auth
- [ ] تفعيل Email/Password في Supabase Auth Dashboard
- [ ] تفعيل Phone OTP في Supabase Auth
- [ ] تفعيل Google OAuth في Supabase Auth
- [ ] إعداد Email Templates بالعربية (تأكيد البريد، إعادة تعيين كلمة المرور)
- [ ] إعداد JWT Secret وحدود الجلسة (7 أيام)

### 2.2 — نقل المستخدمين من Firebase Auth → Supabase Auth
```
الخطوات:
1. تشغيل scripts/migrate-auth.js (موجود مسبقاً)
2. التحقق من نقل جميع 1167 مستخدم
3. ربط Supabase Auth UUID بـ Firebase UID في جدول users
```

### 2.3 — ربط users table بـ Supabase Auth
```sql
-- إضافة عمود auth_id لربط Supabase Auth
ALTER TABLE users ADD COLUMN auth_id UUID REFERENCES auth.users(id);
CREATE UNIQUE INDEX idx_users_auth_id ON users(auth_id);

-- Trigger: إنشاء profile تلقائياً عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, auth_id, email, phone, created_at)
  VALUES (NEW.id::text, NEW.id, NEW.email, NEW.phone, NOW())
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.4 — إعداد Row Level Security (RLS)
```sql
-- تفعيل RLS على جميع الجداول الحساسة
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id OR auth.uid() = auth_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id OR auth.uid() = auth_id);

CREATE POLICY "Players can read own profile" ON players
  FOR SELECT USING (auth.uid()::text = id);
```

---

## المرحلة 3️⃣ — انتقال كود الـ Backend (API Routes)
**الأولوية: عالية | المدة: 4-5 أيام**

> تحويل جميع API routes من Firestore → Supabase PostgreSQL

### الملفات المستهدفة بالترتيب:

#### أولاً — Auth APIs (الأساس)
- [ ] `src/app/api/auth/check-user/route.ts` — Firestore → Supabase
- [ ] `src/app/api/auth/check-user-exists/route.ts`
- [ ] `src/app/api/auth/create-user-with-phone/route.ts`
- [ ] `src/app/api/auth/find-user-by-phone/route.ts`
- [ ] `src/app/api/auth/verify-and-sync-user/route.ts`
- [ ] `src/app/api/auth/sync-user-to-auth/route.ts`

#### ثانياً — User/Profile APIs
- [ ] `src/app/api/admin/users/` (كل الـ routes)
- [ ] `src/app/api/admin/settings/`
- [ ] `src/app/api/admin/sync-users/`

#### ثالثاً — Payment APIs
- [ ] `src/app/api/geidea/` — إضافة user_id للربط مع Supabase
- [ ] `src/app/api/geidea/fetch-transactions/`

#### رابعاً — Notifications APIs
- [ ] `src/app/api/notifications/broadcast/`
- [ ] `src/app/api/notifications/whatsapp/`

### نمط الانتقال الموحد:
```typescript
// قبل (Firebase)
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

const q = query(collection(db, 'users'), where('email', '==', email));
const snapshot = await getDocs(q);

// بعد (Supabase)
import { createClient } from '@/lib/supabase/server'; // server-side client

const supabase = createClient();
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();
```

### إنشاء ملفات helper جديدة:
- [ ] `src/lib/supabase/server.ts` — Server-side Supabase client
- [ ] `src/lib/supabase/admin.ts` — Admin client (service role)
- [ ] `src/lib/supabase/auth-helpers.ts` — Auth utilities
- [ ] `src/lib/supabase/queries/users.ts` — User queries
- [ ] `src/lib/supabase/queries/players.ts` — Player queries
- [ ] `src/lib/supabase/queries/subscriptions.ts` — Subscription queries

---

## المرحلة 4️⃣ — انتقال كود الـ Frontend
**الأولوية: متوسطة-عالية | المدة: 7-10 أيام**

> تحويل جميع pages من قراءة Firestore → Supabase

### 4.1 — نظام المصادقة في Frontend
- [ ] إنشاء `src/lib/supabase/auth-provider.tsx` (بديل Firebase auth-provider.tsx)
  - login بـ email/password
  - login بـ phone OTP
  - login بـ Google
  - logout
  - session management
  - onAuthStateChange listener
- [ ] تحديث `middleware.js` ليستخدم Supabase session بدلاً من Firebase token

### 4.2 — صفحات Auth (الأعلى أولوية)
- [ ] `src/app/auth/login/` → Supabase `signInWithPassword`
- [ ] `src/app/auth/register/` → Supabase `signUp`
- [ ] `src/app/auth/forgot-password/` → Supabase `resetPasswordForEmail`
- [ ] `src/app/auth/reset-password/` → Supabase `updateUser`
- [ ] OTP Pages → Supabase `signInWithOtp`

### 4.3 — Dashboard Pages (حسب الأولوية)

**Player Dashboard (981 مستخدم - أعلى أولوية):**
- [ ] profile page
- [ ] billing/subscriptions
- [ ] messages
- [ ] notifications
- [ ] videos

**Club Dashboard (35 مستخدم):**
- [ ] player management
- [ ] bulk operations
- [ ] billing

**Admin Dashboard (الأكبر - 65 صفحة):**
- [ ] users management
- [ ] payments (geidea)
- [ ] analytics
- [ ] notifications broadcast
- [ ] tournaments

### 4.4 — نمط الانتقال في Frontend:
```typescript
// قبل (Firebase)
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const { user } = useAuth();
const docRef = doc(db, 'players', user.uid);
const data = await getDoc(docRef);

// بعد (Supabase)
import { useSupabaseAuth } from '@/lib/supabase/auth-provider';
import { createClient } from '@/lib/supabase/client';

const { user } = useSupabaseAuth();
const supabase = createClient();
const { data } = await supabase
  .from('players')
  .select('*')
  .eq('id', user.id)
  .single();
```

---

## المرحلة 5️⃣ — انتقال التخزين (Storage)
**الأولوية: متوسطة | المدة: 2-3 أيام**

### الـ Buckets المطلوبة في Supabase (موجودة بالفعل ✅):
- `profile-images` — صور الملفات الشخصية
- `avatars` — الصور الرمزية
- `videos` — فيديوهات اللاعبين
- `documents` — المستندات
- `playertrainer`, `playerclub`, `playeragent`, `playeracademy` — صور خاصة

### الخطوات:
- [ ] إنشاء `src/lib/supabase/storage.ts` — دوال رفع/حذف موحدة
- [ ] تحديث `src/app/api/upload/` routes لترفع لـ Supabase
- [ ] تحديث `src/app/api/upload/video/route.ts` (موجود جزئياً ✅)
- [ ] تحديث كل مكونات رفع الصور في Frontend
- [ ] إعداد Storage RLS policies

### Storage Policies:
```sql
-- سياح قراءة الصور العامة
CREATE POLICY "Public profiles are viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

-- رفع فقط للمستخدم المصادق
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- حذف فقط من ملف المستخدم نفسه
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (auth.uid()::text = owner);
```

---

## 🔄 ترتيب التنفيذ اليومي المقترح

### الأسبوع 1 — الأساس
| اليوم | المهمة |
|-------|--------|
| 1 | إصلاح Schema: حذف passwords، إصلاح أنواع البيانات |
| 2 | دمج الجداول المكررة |
| 3 | إضافة Indexes + Foreign Keys |
| 4 | إعداد Supabase Auth + نقل المستخدمين |
| 5 | RLS Policies + Triggers |
| 6-7 | تطبيع جدول users |

### الأسبوع 2 — الـ Backend
| اليوم | المهمة |
|-------|--------|
| 8 | تحويل Auth API routes |
| 9 | إنشاء Supabase helper files |
| 10 | تحويل User/Profile API routes |
| 11 | تحويل Payment API routes |
| 12 | تحويل Notifications API routes |
| 13-14 | اختبار Backend كامل |

### الأسبوع 3 — الـ Frontend (Auth + Player)
| اليوم | المهمة |
|-------|--------|
| 15 | إنشاء Supabase auth-provider |
| 16 | تحويل صفحات login/register |
| 17 | تحويل OTP + Google Auth |
| 18 | تحويل Player Dashboard |
| 19 | تحويل Billing/Subscriptions |
| 20 | تحويل Messages |
| 21 | اختبار شامل |

### الأسبوع 4 — الـ Frontend (Clubs + Admin)
| اليوم | المهمة |
|-------|--------|
| 22 | تحويل Club Dashboard |
| 23 | تحويل Academy/Trainer/Agent |
| 24-26 | تحويل Admin Dashboard (أهم 20 صفحة) |
| 27 | تحويل Storage/Upload |
| 28 | اختبار نهائي + Deployment |

---

## 🚫 ما يجب تجنبه

1. **لا تحذف Firebase إلا بعد اختبار كامل** — احتفظ بـ Firebase كـ backup مؤقتاً
2. **لا تغير البيانات الحية أثناء Deployment** — استخدم maintenance mode
3. **لا تشغل migrations على production مباشرة** — اختبر على staging أولاً
4. **لا تدمج جداول دون نسخ احتياطي** — `firebase_full_export.json` هو الـ backup
5. **لا تحذف Firebase Auth قبل التأكد** من نجاح نقل جميع المستخدمين

---

## ✅ معايير الاكتمال

المشروع جاهز للإطلاق الكامل على Supabase عند:
- [ ] جميع المستخدمين يمكنهم تسجيل الدخول عبر Supabase Auth
- [ ] جميع صفحات Dashboard تقرأ من Supabase فقط
- [ ] جميع الـ API routes تكتب لـ Supabase فقط
- [ ] جميع الملفات ترفع لـ Supabase Storage
- [ ] لا توجد أي imports من `firebase/firestore` في صفحات الإنتاج
- [ ] الـ Schema نظيف (بدون أعمدة مكررة، مع Indexes وFKs)
- [ ] جميع الـ RLS policies فعالة
- [ ] اختبار شامل لـ 7 أنواع مستخدمين

---

## 📁 الملفات الرئيسية للانتقال

```
src/lib/
├── firebase/          ← سيُحذف تدريجياً
│   ├── auth-provider.tsx   (76KB - أكبر ملف)
│   ├── config.ts
│   └── ...
└── supabase/          ← سيُبنى هنا
    ├── config.tsx          ✅ موجود
    ├── server.ts           ❌ يجب إنشاؤه
    ├── client.ts           ❌ يجب إنشاؤه
    ├── admin.ts            ❌ يجب إنشاؤه
    ├── auth-provider.tsx   ❌ يجب إنشاؤه (الأهم)
    ├── storage.ts          ❌ يجب إنشاؤه
    └── queries/            ❌ يجب إنشاؤه
        ├── users.ts
        ├── players.ts
        ├── subscriptions.ts
        ├── notifications.ts
        └── messages.ts
```

---

*هذه الخطة حية — ستُحدَّث مع كل مرحلة مكتملة*
