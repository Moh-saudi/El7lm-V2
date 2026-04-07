# ملخص تطوير بوابة إدارة البطولات
**التاريخ:** 2026-04-07  
**المشروع:** El7lm V2 — Tournament Portal

---

## 1. إصلاح الصور (Profile Images)

### المشكلة
الصور مخزنة في قاعدة البيانات كمسارات نسبية أو روابط Supabase قديمة، لكن الميديا انتقلت إلى Cloudflare R2.

### الحل
أضفنا دالة `resolveImg()` في كلا الملفين تحوّل:
- مسار نسبي `avatars/abc.jpg` → `https://assets.el7lm.com/avatars/abc.jpg`
- رابط Supabase قديم → رابط Cloudflare مكافئ
- رابط Cloudflare مكتمل → يُعاد كما هو
- روابط خارجية (Google, Firebase) → تُعاد كما هي

### الملفات المعدّلة
| الملف | التغيير |
|---|---|
| `src/app/api/tournament-portal/search-platform-users/route.ts` | دالة `resolveImageUrl()` server-side قبل إرجاع النتائج |
| `src/app/tournament-portal/[id]/registrations/page.tsx` | دالة `resolveImg()` client-side لصور الفرق ونتائج البحث |

---

## 2. تحسين جدول الفرق (Registrations Page)

### ما أُضيف لكل صف فريق
- **الفئة** — badge أزرق صغير
- **عدد اللاعبين** — أخضر إذا وُجد لاعبون، رمادي إذا كان صفراً
- **تاريخ التسجيل** — بالتاريخ الميلادي بالعربي
- **مصدر التسجيل** — بنفسجي "مستورد من المنصة" أو رمادي "إضافة يدوية"
- **حجم الصورة** أكبر (40×40 بدل 32×32)
- جميع الـ badges في سطر واحد مع الاسم، والمعلومات التفصيلية في سطر ثانٍ

### التغييرات التقنية
```typescript
// جلب عدد اللاعبين ضمن نفس الـ query
supabase.from('tournament_teams')
  .select('*, registration:..., players:tournament_players(id)')

// حساب العدد
players_count: Array.isArray(t.players) ? t.players.length : 0

// تحديد مصدر التسجيل
const isImported = team.notes?.includes('مستورد من المنصة');
```

### الملفات المعدّلة
- `src/app/tournament-portal/[id]/registrations/page.tsx`

---

## 3. صفحة المجموعات (Groups Page) — إعادة بناء كاملة

### ما كان موجوداً
فقط عرض جداول الترتيب وزر إعادة حساب النقاط.

### ما أُضيف
**قسم إدارة المجموعات في أعلى الصفحة:**
- **إنشاء دفعة** — حقل عدد + زر "إنشاء المجموعات" (يحذف القديمة وينشئ الجديدة)
- **إضافة مجموعة واحدة** — حقل نص + زر إضافة (أو Enter)
- **تعديل اسم مجموعة** — نقر أيقونة القلم → input inline → ✓ أو Escape
- **حذف مجموعة** — أيقونة حذف مع تأكيد toast

### سبب عدم عمل الكتابة سابقاً
`createPortalClient()` يستخدم مفتاح anon — RLS في Supabase يمنع INSERT/UPDATE/DELETE على `tournament_groups`.

### الحل
API route جديد `/api/tournament-portal/groups` يستخدم `SUPABASE_SERVICE_ROLE_KEY`.

### الملفات المعدّلة/المنشأة
| الملف | نوع التغيير |
|---|---|
| `src/app/tournament-portal/[id]/groups/page.tsx` | إعادة كتابة كاملة |
| `src/app/api/tournament-portal/groups/route.ts` | **جديد** — GET, POST, PATCH, DELETE |

---

## 4. صفحة القرعة (Draw Page) — إعادة بناء كاملة

### المشاكل التي كانت موجودة
1. زر "إنشاء المجموعات" يظهر فقط إذا `type === 'groups_knockout'`
2. إذا `group_count = null` يُظهر خطأ ويخرج
3. حقل العدد كان `readOnly` إذا كانت الفئة تحتوي على `group_count`
4. لا يمكن نقل الفرق بين المجموعات يدوياً
5. حفظ القرعة يستخدم مفتاح anon (يفشل بسبب RLS)

### ما أُضيف
**نظام النقل والتبديل (Click-based):**
- نقر على فريق → يُحدَّد (يتحول أزرق)
- نقر على رأس مجموعة أخرى → ينقل الفريق المحدد إليها
- نقر على فريق آخر → يتبادلان المجموعتين (مع أيقونة ⇄)
- نقر على X بجانب فريق → يُزيله من المجموعة

**قائمة الفرق غير الموزعة:**
- شريط يعرض الفرق التي لم تُوزَّع بعد مع عدادها
- كل فريق فيها يحتوي على dropdown لاختيار المجموعة مباشرة

**تحسينات UX:**
- عداد `+`/`−` بدل حقل رقم للتحكم في عدد المجموعات
- زر الحفظ يستخدم API جديد (service_role)
- دليل بصري في الأسفل يشرح طريقة النقل والتبديل
- رسائل toast توجيهية أثناء التحديد

### الملفات المعدّلة/المنشأة
| الملف | نوع التغيير |
|---|---|
| `src/app/tournament-portal/[id]/draw/page.tsx` | إعادة كتابة كاملة |
| `src/app/api/tournament-portal/save-draw/route.ts` | **جديد** — حفظ القرعة بـ service_role |
| `src/app/api/tournament-portal/groups/route.ts` | **جديد** — مشترك مع Groups Page |

---

## 5. ملخص API Routes المنشأة

| Route | Method | الوظيفة |
|---|---|---|
| `/api/tournament-portal/groups` | GET | جلب مجموعات بطولة/فئة |
| `/api/tournament-portal/groups` | POST (count) | إنشاء N مجموعات دفعة |
| `/api/tournament-portal/groups` | POST (name) | إضافة مجموعة واحدة |
| `/api/tournament-portal/groups` | PATCH | تعديل اسم مجموعة |
| `/api/tournament-portal/groups` | DELETE | حذف مجموعة |
| `/api/tournament-portal/save-draw` | POST | حفظ توزيع الفرق على المجموعات |
| `/api/tournament-portal/search-platform-users` | GET | بحث (محدّث بـ resolveImageUrl) |

---

## 6. SQL Views المنشأة في Supabase

يجب التحقق من وجودها في قاعدة البيانات:

```sql
-- v_players_search
CREATE OR REPLACE VIEW v_players_search AS
SELECT id, full_name AS display_name, phone, city,
    primary_position AS position, birth_date AS date_of_birth,
    NULLIF(profile_image_url, '') AS avatar_url, 'player' AS account_type
FROM players WHERE "isDeleted" IS NOT TRUE;

-- v_clubs_search
CREATE OR REPLACE VIEW v_clubs_search AS
SELECT id, COALESCE(NULLIF(name,''), NULLIF(full_name,'')) AS display_name,
    phone, city, NULLIF(logo,'') AS avatar_url, 'club' AS account_type
FROM clubs WHERE "isDeleted" IS NOT TRUE;

-- v_academies_search
CREATE OR REPLACE VIEW v_academies_search AS
SELECT id, COALESCE(NULLIF(academy_name,''), NULLIF(full_name,''), NULLIF(name,'')) AS display_name,
    phone, city, NULLIF(profile_image,'') AS avatar_url, 'academy' AS account_type
FROM academies WHERE "isDeleted" IS NOT TRUE;

-- v_trainers_search
CREATE OR REPLACE VIEW v_trainers_search AS
SELECT id, NULLIF(full_name,'') AS display_name, phone, current_location AS city,
    NULLIF(profile_image,'') AS avatar_url, 'trainer' AS account_type
FROM trainers WHERE "isDeleted" IS NOT TRUE;

GRANT SELECT ON v_players_search, v_clubs_search, v_academies_search, v_trainers_search
    TO anon, authenticated, service_role;
```

---

## 7. Migration SQL (tournament_players)

الملف `prisma/migrations/tournament_players_extend.sql` — **تحقق من تطبيقه في Supabase:**

```sql
ALTER TABLE tournament_players
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_registered BOOLEAN NOT NULL DEFAULT true;
```

> ⚠️ **ملاحظة:** حقل `platform_player_id UUID` تم إزالته من جميع عمليات الإدخال لأن Firebase IDs ليست UUIDs.

---

## 8. نقطة مهمة: مفتاح service_role

جميع عمليات الكتابة (INSERT/UPDATE/DELETE) في بوابة البطولات تستخدم:
- **مباشر عبر `createPortalClient()`** → قد يفشل بسبب RLS على بعض الجداول
- **عبر API routes** → يستخدم `SUPABASE_SERVICE_ROLE_KEY` ويتجاوز RLS ✅

**الجداول التي تحتاج API routes للكتابة:**
- `tournament_groups` ← `/api/tournament-portal/groups`
- `tournament_teams` (group_id) ← `/api/tournament-portal/save-draw`
- `tournament_players` ← `/api/tournament-portal/team-players`
- `tournament_team_regs` ← مباشر (قد يحتاج مراجعة RLS)

---

## 9. ما يحتاج اختباراً

- [ ] إنشاء مجموعات من صفحة المجموعات
- [ ] تعديل اسم مجموعة (inline edit)
- [ ] إنشاء مجموعات من صفحة القرعة
- [ ] القرعة العشوائية → نقل فريق يدوياً → حفظ
- [ ] مبادلة فريقين بين مجموعتين
- [ ] ظهور صور اللاعبين والأندية في نتائج البحث
- [ ] عدد اللاعبين يتحدث عند الإضافة/الحذف في صف الفريق
