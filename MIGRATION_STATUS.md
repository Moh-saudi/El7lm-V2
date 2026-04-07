# حالة الهجرة: Firebase → Supabase

## المشروع الجديد
- **Project ID**: `mjuaefipdzxfqazzbyke`
- **URL**: `https://mjuaefipdzxfqazzbyke.supabase.co`

---

## ما تم إنجازه ✅

### ملفات جديدة/محدّثة:
| الملف | الوصف |
|-------|--------|
| `.env.local` | متغيرات البيئة مع مفاتيح المشروع الجديد |
| `src/lib/supabase/config.tsx` | عميل Supabase محدّث للمشروع الجديد |
| `src/lib/supabase/server.ts` | **جديد** - عميل الخادم (يحل محل firebase/admin في API routes) |
| `src/lib/supabase/admin.ts` | **جديد** - Admin client يحل محل Firebase Admin SDK |
| `src/lib/db/index.ts` | **جديد** - طبقة قاعدة البيانات (CRUD helpers تحاكي Firestore) |
| `src/lib/firebase/admin.ts` | محدّث - wrapper يعيد توجيه كل شيء لـ Supabase |
| `prisma/schema.prisma` | محدّث - Schema كامل لـ 60+ جدول |
| `supabase-setup-new-project.sql` | **جديد** - SQL لإعداد المشروع (indexes + RLS + Storage + Realtime) |

---

## الخطوات التالية المطلوبة ⚠️

### الخطوة 1: احصل على DATABASE_URL
من لوحة Supabase → **Settings → Database → Connection string**
اختر **URI** واستبدل `YOUR_DB_PASSWORD` في `.env.local`

```
DATABASE_URL=postgresql://postgres.mjuaefipdzxfqazzbyke:[كلمة_المرور]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.mjuaefipdzxfqazzbyke:[كلمة_المرور]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

### الخطوة 2: طبّق Schema على المشروع الجديد
في Supabase SQL Editor:
1. افتح `schema.sql` وشغّله أولاً (يُنشئ كل الجداول)
2. ثم شغّل `supabase-setup-new-project.sql` (indexes + RLS + Storage + Realtime)

### الخطوة 3: توليد Prisma Client
```bash
npx prisma generate
```

### الخطوة 4: اختبار الاتصال
```bash
npx prisma db pull  # للتحقق من الجداول
```

---

## الهجرة التدريجية - الملفات التي لا تزال تستخدم Firebase

### API Routes تحتاج تحديث (استبدال adminDb من firebase بـ supabase):
- `src/app/api/auth/**` - 15 ملف
- `src/app/api/admin/**` - 14 ملف
- `src/app/api/notifications/**` - 3 ملفات

### طريقة الاستبدال:
```typescript
// قديم
import { adminDb } from '@/lib/firebase/admin';
const snapshot = await adminDb.collection('players').doc(id).get();
const data = snapshot.data();

// جديد
import { getDoc } from '@/lib/db';
const data = await getDoc('players', id);
```

### Realtime - تحديث onSnapshot:
```typescript
// قديم (Firebase)
onSnapshot(collection(db, 'notifications'), callback);

// جديد (Supabase Realtime)
supabase
  .channel('notifications')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, callback)
  .subscribe();
```

---

## الملفات التي تستخدم Firebase (تحتاج هجرة لاحقة)
- `src/lib/notifications/**` - 8 ملفات (إشعارات)
- `src/lib/auth/smart-login-system.ts` - نظام تسجيل الدخول
- `src/lib/firebase/auth-provider.tsx` - مزود المصادقة
- `src/hooks/useRealtimeUpdates.ts` - Real-time hooks
- 100+ صفحة في `src/app/dashboard/**`
