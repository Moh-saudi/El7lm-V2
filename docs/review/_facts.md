# _facts.md — الحقائق المثبتة من قراءة الكود

**تاريخ الفحص:** 2026-09-24
**المراجع:** قراءة مباشرة من الكود المصدري
**القاعدة:** كل حقيقة = ملف + رقم سطر أو "لم يُعثر عليه"

---

## FACT-1: عدد Queries الحقيقي في findAccountByPhone

**المصدر:** `src/lib/auth/phone-account-lookup.ts`

### البيانات المثبتة:
- **الجداول (ACCOUNT_TABLES):** 7 جداول (L4-12): `players, clubs, academies, agents, trainers, marketers, users`
- **حقول الهاتف لكل جدول (L33-41):**
  - `players`: 5 حقول `[phone, originalPhone, phoneNumber, phoneNormalized, whatsapp]`
  - `clubs`: 4 حقول `[phone, originalPhone, phoneNormalized, whatsapp]`
  - `academies`: 2 حقول `[phone, whatsapp]`
  - `agents`: 4 حقول `[phone, originalPhone, phoneNormalized, whatsapp]`
  - `trainers`: 4 حقول `[phone, originalPhone, phoneNormalized, whatsapp]`
  - `marketers`: 3 حقول `[phone, originalPhone, phoneNormalized]`
  - `users`: 5 حقول `[phone, originalPhone, phoneNumber, phoneNormalized, whatsapp]`
  - **المجموع: 27 حقلاً**

### ما يحدث فعلاً في الكود:
```typescript
// L90-103: loop يبني قائمة queries
for (const table of ACCOUNT_TABLES) {          // 7 جداول
  const fields = TABLE_PHONE_FIELDS[table];
  for (const field of fields) {                // N حقل لكل جدول
    queries.push(
      db.from(table).select(...).in(field, variants)  // استعلام واحد لكل حقل
    );
  }
}
const results = await Promise.all(queries);    // L106 — كل الـ queries تُطلق معاً
```

### **الرقم الدقيق:**
- **27 استعلاماً متوازياً** (Promise.all) — واحد لكل (جدول × حقل)
- **كل استعلام يستخدم `.in(field, variants)`** — أي variants متعددة في استعلام واحد (ليس per-variant)
- **لا تكرار لكل variant** — الـ variants تُمرَّر في `.in()` واحد

### التصحيح للتقرير السابق:
- التقرير السابق قال "27+ استعلام" — **صحيح: 27 بالضبط** في الحالة العادية
- التقرير السابق قال "7 جداول × N variants = 20+ استعلام" — **خطأ** في وصف الآلية: الـ variants تُدمَج في `.in()` لا تُولّد queries مستقلة
- **الصحيح:** واحد لكل (جدول × حقل) = 27، كل منها بـ `.in(field, variants)`

### listUsers Fallback (L136-180):
- يُستدعى **فقط إذا** لم يُعثر في الجداول الـ 7
- `listUsers({ page: 1, perPage: 1000 })` — صفحة واحدة، 1000 مستخدم
- يبحث في `phone` و`app_metadata.phone` و`user_metadata.phone`

---

## FACT-2: جميع استخدامات listUsers

| الملف | السطر | perPage | السبب | مسار Login؟ | مسار Registration؟ | ضروري؟ |
|-------|-------|---------|-------|------------|---------------------|--------|
| `phone-account-lookup.ts` | 138 | 1000 | fallback إذا لا record في الجداول | نعم (من otp/send) | نعم (من verify-otp) | **لا** إذا uid محفوظ |
| `otp-login/route.ts` | 105 | 2000 | uid غير محفوظ في الجدول | **نعم** — المسار الرئيسي | لا | **لا** — يمكن تجنبه |
| `verify-otp-and-check/route.ts` | 88 | 2000 | uid غير محفوظ في الجدول | لا | **نعم** — fallback | **لا** — يمكن تجنبه |
| `otp-login/route.ts` | 137 | 2000 | إعادة محاولة عند "already registered" | نعم | لا | **لا** — edge case |

**الخلاصة المثبتة:**
- جميع حالات `listUsers` تقع في مسار الـ fallback (uid غير محفوظ)
- `getUserById` (L93 في otp-login) يُستخدم أولاً إذا كان uid موجوداً
- المشكلة الحقيقية: **uid لا يُحفَظ بشكل موثوق في بعض الحالات** → يُجبَر على listUsers

---

## FACT-3: verify-otp-and-check loop مقارنة بـ findAccountByPhone

**المصدر:** `src/app/api/auth/verify-otp-and-check/route.ts:13-74`

### الـ Loop (L46-65):
```typescript
const SEARCH_COLLECTIONS = ['clubs', 'academies', 'trainers', 'agents', 'marketers', 'admins', 'players', 'users'];

for (const col of SEARCH_COLLECTIONS) {         // 8 collections (يشمل admins)
  for (const variant of phoneVariants) {         // N variants
    const { data } = await db
      .from(col)
      .select('id, uid, full_name, name, accountType, email')
      .eq('phone', variant)                      // .eq() لا .in() — استعلام لكل variant
      .limit(1)
      .single();
    if (data) break;
  }
  if (userId) break;
}
```

### findAccountByPhone (L67-74):
```typescript
const resolvedAccount = await findAccountByPhone(phoneNumber);
if (resolvedAccount.found) {
  userId = resolvedAccount.id;  // يُكتب فوق نتيجة الـ loop!
  ...
}
```

| العنصر | Loop (L46-65) | findAccountByPhone (L67-74) |
|--------|--------------|---------------------------|
| الجداول | 8 (يشمل admins) | 7 (لا admins) |
| الحقول | `phone` فقط | 27 حقل (phone, originalPhone, phoneNormalized, whatsapp...) |
| phone variants | `.eq()` واحد في كل iteration | `.in(field, variants)` — دفعة واحدة |
| النمط | متتابع (for loops) | متوازٍ (Promise.all) |
| النتيجة تُستخدم؟ | **تُلغى إذا وجد resolvedAccount** | **نعم — تُكتب فوق نتيجة الـ loop** |
| admins | نعم | لا |

### هل حذف الـ Loop آمن؟
**نعم مع تحفظ واحد:**
- الـ Loop يشمل `admins` — و`findAccountByPhone` لا يشملها
- بعد الـ Loop وقبل `findAccountByPhone`، إذا كان `userId` من `admins` → `findAccountByPhone` سيُلغيه بـ `{ found: false }` (لأن admins ليست في الـ 7 جداول) → **لكن لاحقاً في المسار: إذا كان مسجلاً دخولاً، سيُوجَّه كـ isNew:true وهذا خطأ**
- **الحل الآمن:** حذف الـ Loop + إضافة استعلام منفصل لـ admins أو إضافتهم لـ findAccountByPhone

---

## FACT-4: Phone Normalization — تتبع الرقم

**المصادر:**
- `mobile/lib/screens/auth/phone_auth_screen.dart` — [لم يُقرأ] للتحقق من الصيغة المُرسَلة
- `src/lib/validation/phone-validation.ts:112-153`
- `src/lib/otp/unified-otp-service.ts:17-24` و `src/lib/otp/unified-otp-service.ts:94-100`
- `src/lib/otp/otp-manager.ts:18-20`

### مثال متتبَّع: مستخدم مصري يدخل `01017799580`

**خطوة 1: Flutter → auth_service.dart:147-155**
```dart
// auth_service.dart يُرسل الرقم كما أدخله المستخدم مع country code
// الصيغة المُرسَلة تعتمد على phone_auth_screen (لم يُقرأ)
// الافتراض بناءً على country_picker: '+201017799580'
```
**[يحتاج تأكيد]** — لم يُقرأ `phone_auth_screen.dart` بالكامل

**خطوة 2: /api/otp/send → sendOTP() → formatPhoneNumber()**
```typescript
// unified-otp-service.ts:17-24
let cleaned = phone.replace(/[^\d+]/g, '');  // '+201017799580'
if (!cleaned.startsWith('+') && cleaned.startsWith('0')) cleaned = cleaned.substring(1);
// النتيجة: '+201017799580' (لا تغيير لأنها تبدأ بـ +)
```

**خطوة 3: storeOTPInFirestore() → getDocId()**
```typescript
// otp-manager.ts:18-20
function getDocId(phoneNumber: string): string {
  return `otp_${phoneNumber.replace(/[^0-9]/g, '')}`;
}
// '+201017799580' → 'otp_201017799580'
```

**خطوة 4: /api/auth/verify-otp-and-check أو /api/auth/otp-login → verifyOTPInFirestore()**
```typescript
// يستدعي getDocId(phoneNumber) بالرقم المُرسَل من Flutter
// إذا أرسل نفس الرقم '+201017799580' → 'otp_201017799580' ✓
// إذا أرسل '01017799580' → 'otp_01017799580' ✗ (مختلف!)
```

### **الخطر المؤكد:**
إذا أرسل Flutter الرقم بصيغة مختلفة عند الإرسال وعند التحقق:
- إرسال: `+201017799580` → stored key: `otp_201017799580`
- تحقق: `01017799580` → looked key: `otp_01017799580` → **لن يجد OTP!**

**[يحتاج تأكيد]** هل Flutter يُرسل نفس الصيغة دائماً؟ — يتوقف على `phone_auth_screen.dart`

### التطبيعات الثلاثة — مثبتة:
1. **`formatPhoneNumber()`** (`unified-otp-service.ts:17-24`): يُزيل الرموز غير الرقمية، يُزيل الصفر الأول فقط
2. **`sendOTPViaChatAman()` internal** (`unified-otp-service.ts:94-100`): تطبيع أكثر تفصيلاً بـ country code
3. **`getDocId()`** (`otp-manager.ts:18-20`): يُزيل كل غير رقمي

---

## FACT-5: Indexes في schema.sql

**المصدر:** `d:\El7lm-V2\schema.sql` (1800+ سطر)

**البحث بـ `Select-String -Pattern "CREATE INDEX"`:**
```
الناتج: لا شيء
```
**[مؤكد بالكود]** — لا توجد أي `CREATE INDEX` في `schema.sql`.

**ملاحظة:** هذا لا يعني بالضرورة غياب الـ Indexes فعلاً — قد تكون مُضافة عبر:
1. `supabase-*.sql` migration files في الجذر
2. مُضافة يدوياً في Supabase Dashboard
3. Primary Keys فقط (المُعرَّفة كـ `TEXT PRIMARY KEY` في schema.sql — هذه تُنشئ Indexes تلقائياً)

**[يحتاج تأكيد]** — تشغيل diagnostics.sql استعلام رقم 4 و8 في Supabase SQL Editor لمعرفة الـ Indexes الحقيقية.

---

## FACT-6: RLS في schema.sql

**البحث بـ `Select-String -Pattern "ENABLE ROW LEVEL SECURITY|CREATE POLICY"`:**
```
الناتج: لا شيء
```
**[مؤكد بالكود]** — لا توجد أي `ENABLE ROW LEVEL SECURITY` أو `CREATE POLICY` في `schema.sql`.

**التفسيرات الممكنة:**
1. RLS مُفعَّل يدوياً من Dashboard
2. RLS مُفعَّل في ملفات migration أخرى (`supabase-*.sql`)
3. RLS غير مُفعَّل أصلاً

**[يحتاج تأكيد]** — تشغيل diagnostics.sql استعلام رقم 6 و7.

---

## FACT-7: upload/video — الـ Auth

**المصدر:** `src/app/api/upload/video/route.ts`

```typescript
// L25-35: getAuthUser مُعرَّفة
async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  ...
}

// L39: دالة POST
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // ... لا استدعاء لـ getAuthUser
```

**بحث بـ `Select-String -Pattern "getAuthUser"`:**
```
LineNumber Line
---------- ----
        25 async function getAuthUser(request: NextRequest) {
```
**نتيجة واحدة فقط — التعريف وليس الاستدعاء.**

**[مؤكد بالكود]** — `getAuthUser` مُعرَّفة لكن **غير مُستدعاة** في `POST`. رفع الفيديو بلا مصادقة.

---

## FACT-8: Media Routes — حالة الـ Auth

**المصدر:** فحص بـ `Select-String -Pattern "authorizeUser|getAuthUser|Bearer|authorization"`

| المسار | الملف الكامل | Auth موجودة؟ |
|--------|------------|------------|
| `media/analyze-video` | `analyze-video/route.ts` | **لا** |
| `media/debug` | `debug/route.ts` | نعم |
| `media/delete` | `delete/route.ts` | نعم |
| `media/list-r2` | `list-r2/route.ts` | نعم |
| `media/proxy-video` | `proxy-video/route.ts` | **لا** |
| `media/tiktok-thumb` | `tiktok-thumb/route.ts` | **لا** |
| `media/update-status` | `update-status/route.ts` | نعم |

**[يحتاج تأكيد]** — هل `analyze-video`، `proxy-video`، `tiktok-thumb` مُصمَّمة للعمل بلا Auth (public) أم أنها ثغرة؟

---

## FACT-9: authorizeUser — كيف تعمل

**المصدر:** `src/lib/api/user-auth.ts`

```typescript
// L9-73: authorizeUser يتحقق من Bearer token
// يستخدم getSupabaseAdmin() لـ auth.getUser(token)
// Fallback: createClient مع anon key
// يُرجع { ok: true, user } أو { ok: false, response }
```

هذه الدالة تُستخدم في `notifications/dispatch/route.ts` (L156) وفي مسارات أخرى.

---

## FACT-10: OTP — أرقام الأمان

**المصدر:** `src/lib/otp/otp-manager.ts`

```typescript
const OTP_EXPIRY_MINUTES = 5;    // L10
const MAX_ATTEMPTS = 5;           // L11
const RATE_LIMIT_SECONDS = 30;    // L12

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');  // L14-16
}

function getDocId(phoneNumber: string): string {
  return `otp_${phoneNumber.replace(/[^0-9]/g, '')}`;  // L18-20
}
```

- **Hash:** SHA-256 بلا Salt — [مؤكد بالكود]
- **Rate Limit:** 30 ثانية بين الطلبات — [مؤكد بالكود]
- **Max Attempts:** 5 محاولات — [مؤكد بالكود]
- **Expiry:** 5 دقائق — [مؤكد بالكود]

---

## FACT-11: Polling Dashboard

**المصدر:** `mobile/lib/screens/home/app_shell.dart:54-67`

```dart
_initialUnreadTimer = Timer(const Duration(seconds: 2), () {
  if (mounted) _fetchUnreadCounts();
});
_unreadTimer = Timer.periodic(
  const Duration(seconds: 60),
  (_) => _fetchUnreadCounts(),
);
```

**`_fetchUnreadCounts()` (L173-196):**
```dart
final convs = await widget.dataService.fetchConversations();  // استعلام 1
final notifs = await widget.dataService.fetchNotifications(); // استعلامان 2+3
```

**[مؤكد بالكود]** = 3 استعلامات كل 60 ثانية، تبدأ بعد 2 ثانية من الفتح.

---

## FACT-12: sendOTP — تسلسل الاستدعاءات المثبت

**المصدر:** `src/lib/otp/unified-otp-service.ts`

```typescript
export async function sendOTP(options) {
  const otp = generateOTP();                                    // L276
  const formattedPhone = formatPhoneNumber(phoneNumber);        // L279
  const storeResult = await storeOTPInFirestore(formattedPhone, otp, purpose);  // L283 — AWAIT
  // ...
  sendResult = await sendOTPViaWhatsApp(formattedPhone, otp);  // L304 — AWAIT
  // إذا فشل: await sendOTPViaSMS(...)                          // L309 — AWAIT (SMS = دائماً فشل)
}
```

**[مؤكد بالكود]:**
1. `storeOTPInFirestore` يُستدعى بـ `formattedPhone` (مُعالَج بـ `formatPhoneNumber`)
2. `sendOTPViaWhatsApp` يُستدعى بنفس `formattedPhone`
3. `sendOTPViaChatAman` يُطبِّع الرقم مرة ثانية داخلياً (L94-100) قبل الإرسال

**تناقض مثبت:** `storeOTPInFirestore` يحفظ الـ OTP بمفتاح `getDocId(formattedPhone)` حيث `formattedPhone` من `formatPhoneNumber` — لكن `verifyOTPInFirestore` يُستدعى لاحقاً بـ `phoneNumber` الأصلي من الطلب → إذا اختلفا → لن يجد OTP.

---

## FACT-13: ChatAman — HTTP Calls

**المصدر:** `src/lib/otp/unified-otp-service.ts:152`

```typescript
if (await sendTemplate(true) || await sendTemplate(false)) {
```

هذه جملة `||` — تُشغِّل `sendTemplate(true)` أولاً، إذا نجح يتوقف. إذا فشل يُشغِّل `sendTemplate(false)`.

**في أسوأ الحالات:**
1. `await sendTemplate(true)` — HTTP call إلى ChatAman (فشل)
2. `await sendTemplate(false)` — HTTP call ثانٍ (فشل)
3. Fallback `await fetch(directMessage)` — HTTP call ثالث (L160)

**[مؤكد بالكود]** = 2-3 HTTP calls متتابعة، كل منها `await`.

---

## التصحيحات على التقارير السابقة

| # | التقرير السابق | الصواب | المصدر |
|---|--------------|--------|--------|
| 1 | "7 جداول × N fields = ~20+ استعلام" | **27 استعلاماً بالضبط** (حسب حقول كل جدول) | `phone-account-lookup.ts:33-41` |
| 2 | "loop N×M في verify-otp: 8×N متتابع" | الـ Loop يستخدم `.eq()` واحد لكل variant (متتابع)، لكن يتوقف عند أول نتيجة (`break`) | `verify-otp-and-check:46-65` |
| 3 | "findAccountByPhone مرة ثانية بعد loop" | **صحيح — لكن الحذف يحتاج تعامل مع `admins`** | `verify-otp-and-check:67` |
| 4 | "listUsers(perPage:1000) في phone-account-lookup" | صحيح — `{ page:1, perPage:1000 }` | `phone-account-lookup.ts:138-141` |
| 5 | "N×M queries في verify-otp loop" | Loop يتوقف عند أول إيجاد (`break`) — في أسوأ حال = 8×N، لكن عادةً أقل | `verify-otp-and-check:46-65` |
| 6 | "SELECT * من players في data_service" | `select()` = SELECT * فعلاً | `data_service.dart:125` |
| 7 | "badCertificateCallback=true في debug فقط" | **صحيح — محدود بـ `kDebugMode`** | `main.dart:10-16` |
