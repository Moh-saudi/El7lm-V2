# المرحلة 1 — مراجعة OTP و Login (المُراجَعة والمُصحَّحة)

**تاريخ المراجعة:** 2026-09-24  
**وضع المراجعة:** قراءة فقط — لا تعديل على الكود  
**حالة الملف:** مُصحَّح ومُثبَّت بالأدلة وأرقام الأسطر  

---

## جدول النتائج الرئيسي (مُصحَّح)

| الخطوة | الملف والسطر | عدد الاستعلامات الحقيقي | نوع الاستدعاء | التصنيف | الحالة والحل المطلوب |
|--------|-------------|-----------------------|--------------|---------|---------------------|
| A. إرسال OTP — findAccountByPhone | `phone-account-lookup.ts:33-41, 90-106` | **27 استعلاماً متوازياً** (7 جداول × مجموع 27 حقلاً) | متوازٍ (`Promise.all`) عبر `.in(field, variants)` | [مؤكد بالكود] | اختزالها بجدول مركزي `phone_accounts_index` أو RPC موحدة |
| B. إرسال OTP — listUsers fallback | `phone-account-lookup.ts:138-141` | 1 استعلام Supabase Auth (يجلب حتى 1000 مستخدم في الذاكرة) | متتابع (فقط عند فشل A) | [مؤكد بالكود] | إزالته بالاعتماد على حفظ `uid` بشكل موثوق |
| C. إرسال OTP — storeOTP | `otp-manager.ts:32-66` | 2-3 (select + delete/insert في `otp_verifications`) | متتابع | [مؤكد بالكود] | استبدالها بـ Upsert ذري واحد |
| D. إرسال OTP — إرسال WhatsApp/SMS | `unified-otp-service.ts:152, 276-337` | 2-3 HTTP external calls متتابعة | متزامن يبقي الطلب معلقاً | [مؤكد بالكود] | تحسين الـ Timeout أو نقله لـ Background Queue |
| E. verify-otp-and-check — loop البدائي | `verify-otp-and-check/route.ts:46-65` | N استعلام متتابع (8 جداول تشمل `admins`، يتوقف بـ `break`) | متتابع أحادي (`.eq`) | [مؤكد بالكود] | **حذفه يتطلب ضم `admins` إلى البحث المركزي أو فحص منفصل** |
| F. verify-otp-and-check — findAccountByPhone ثانية | `verify-otp-and-check/route.ts:67-74` | **27 استعلاماً متوازياً** ثانية | متوازٍ (`Promise.all`) | [مؤكد بالكود] | بحث مكرر يلغي نتيجة E؛ يجب توحيد المسار بالكامل |
| G. otp-login — getUserById | `otp-login/route.ts:92-99` | 1 | متتابع | [مؤكد بالكود] | مسار مثالي وسريع إذا توفر `uid` |
| H. otp-login — listUsers fallback | `otp-login/route.ts:105` | 1 (يجلب حتى 2000 مستخدم في الذاكرة) | متتابع (عند غياب `uid`) | [مؤكد بالكود] | كارثة قابلية توسع عند نمو المستخدمين |
| I. otp-login — updateUserById | `otp-login/route.ts:161` | 1 | متتابع | [مؤكد بالكود] | تحديث `app_metadata` |
| J. otp-login — update uid + lastLogin | `otp-login/route.ts:178` | 1 | متتابع | [مؤكد بالكود] | تحديث جدول الحساب |

---

## 1. كم عدد Queries الحقيقي في findAccountByPhone؟

**المصدر المباشر:** `src/lib/auth/phone-account-lookup.ts:33-106`

### طريقة الحساب الدقيقة من الكود:
1. الجداول المستعلمة (`ACCOUNT_TABLES` سطر 4-12): 7 جداول (`players, clubs, academies, agents, trainers, marketers, users`).
2. الحقول المفحوصة (`TABLE_PHONE_FIELDS` سطر 33-41):
   - `players`: 5 حقول `[phone, originalPhone, phoneNumber, phoneNormalized, whatsapp]`
   - `clubs`: 4 حقول `[phone, originalPhone, phoneNormalized, whatsapp]`
   - `academies`: 2 حقلان `[phone, whatsapp]`
   - `agents`: 4 حقول `[phone, originalPhone, phoneNormalized, whatsapp]`
   - `trainers`: 4 حقول `[phone, originalPhone, phoneNormalized, whatsapp]`
   - `marketers`: 3 حقول `[phone, originalPhone, phoneNormalized]`
   - `users`: 5 حقول `[phone, originalPhone, phoneNumber, phoneNormalized, whatsapp]`
   - **مجموع الحقول = 5 + 4 + 2 + 4 + 4 + 3 + 5 = 27 حقلاً**.
3. في الأسطر 90-103:
   ```typescript
   for (const table of ACCOUNT_TABLES) {
     const fields = TABLE_PHONE_FIELDS[table];
     for (const field of fields) {
       queries.push(
         db.from(table).select('...').in(field, variants)
       );
     }
   }
   const results = await Promise.all(queries);
   ```
4. **الرقم النهائي المبرهن:** **27 استعلاماً بالتمام والكمال** تُطلق دفعة واحدة في `Promise.all`.
5. **تصحيح الوصف الشائع:** لا يتم عمل استعلام لكل variant، بل تُمرر مصفوفة الـ variants في معامل `.in(field, variants)`. التكرار ناتج عن ضرب الجداول في حقول الهواتف المختلفة وليس variants.

---

## 2. استخدامات listUsers وحجمها

تم رصد وحصر كافة استدعاءات `listUsers()` في المشروع:

| الملف | السطر | المعاملات | متى يُستدعى؟ | هل في مسار تسجيل الدخول؟ | الخطورة والحل |
|-------|-------|-----------|-------------|-------------------------|---------------|
| `phone-account-lookup.ts` | 138-141 | `{ page: 1, perPage: 1000 }` | Fallback إذا لم يُعثر على الهاتف في أي من الجداول الـ 7 | نعم (عبر `otp/send`) | يجلب 1000 مستخدم في الذاكرة ويعمل `Array.find`. يجب إزالته. |
| `otp-login/route.ts` | 105 | `{ page: 1, perPage: 2000 }` | Fallback عندما لا يكون `uid` محفوظاً في جدول الحساب | **نعم — المسار الفعلي لمن فقد الـ uid** | خطورة شديدة: يفشل حتماً عند تجاوز 2000 مستخدم. |
| `verify-otp-and-check/route.ts` | 88 | `{ page: 1, perPage: 2000 }` | Fallback للتحقق من وجود حساب Auth مرتبط بالرقم | نعم (مسار التسجيل والتحقق) | استهلاك غير مبرر للذاكرة وشبكة Supabase. |
| `otp-login/route.ts` | 137 | `{ page: 1, perPage: 2000 }` | Fallback عند حدوث خطأ "already registered" أثناء إنشاء مستخدم جديد | مسار معالجة الاستثناءات | يكرر نفس جلب الـ 2000 مستخدم. |

**الخلاصة المثبتة:**
- لا يوجد أي استدعاء لـ `listUsers` يجلب أكثر من صفحة واحدة (لا يوجد loop ترقيم).
- الاعتماد على `listUsers` ناتج عن عَرَض أساسي: **عدم ربط أو مزامنة `uid` الصادر من Supabase Auth في جدول الحساب الخاص به**.
- إذا ضُمِن حفظ `uid`، يمكن إزالة جميع هذه الاستدعاءات واستبدالها بـ `admin.auth.getUserById(uid)` السريع والذري (O(1)).

---

## 3. مقارنة تفصيلية: loop التحقق مقابل findAccountByPhone

في ملف `src/app/api/auth/verify-otp-and-check/route.ts`:
- الأسطر 46-65 تنفذ Loop بدائي.
- الأسطر 67-74 تستدعي `findAccountByPhone`.

| وجه المقارنة | Loop البدائي (L46-65) | `findAccountByPhone` (L67-74) |
|--------------|----------------------|-------------------------------|
| **الجداول المستعلمة** | 8 جداول: `['clubs', 'academies', 'trainers', 'agents', 'marketers', 'admins', 'players', 'users']` | 7 جداول: لا تشمل `admins` |
| **الحقول المفحوصة** | حقل واحد فقط: `phone` | 27 حقلاً متنوعاً (phone, originalPhone, phoneNormalized, whatsapp...) |
| **أسلوب فحص الـ variants** | متتابع: `.eq('phone', variant)` داخل for loop مزدوج | دفعة واحدة: `.in(field, variants)` |
| **نمط التنفيذ** | تسلسلي متتابع ينتظر كل طلب، لكنه يكسر فور أول نتيجة (`break`) | متوازٍ بالكامل عبر `Promise.all` (27 استعلام) |
| **مصير النتيجة** | يتم الكتابة فوقها وتجاهلها بالكامل إذا أعاد `findAccountByPhone` نتيجة (L68)! | هي النتيجة المعتمدة النهائية |

### الحكم الهندسي: هل حذف الـ Loop آمن فوراً؟
- **ليس آمناً بالحذف الأعمى:** لأن الـ Loop يحتوي جدول `admins`، بينما `findAccountByPhone` **لا يحتوي جدول `admins`**.
- إذا قام مستخدم بدور أدمن بتسجيل الدخول برقم هاتفه، وحذفنا الـ Loop دون تعديل، سيعيد `findAccountByPhone` أن الحساب غير موجود (`found: false`) مما يوجه الأدمن لمسار تسجيل جديد (`isNew: true`) ويمنعه من لوحته.
- **الحل الصحيح والآمن:**
  1. إضافة `admins` لجدول البحث أو إنشاء فحص مخصص للأدمن.
  2. حذف الـ Loop البدائي واستبداله بالبحث المركزي الموحد.

---

## 4. تطبيع الهاتف وتتبع المفتاح (Phone Normalization Lifecycle)

**تتبع دورة حياة الرقم من الإدخال حتى قاعدة البيانات:**

1. **إدخال المستخدم في Flutter:**
   - المستخدم يكتب مثلاً: `01017799580` مع كود الدولة `+20`.
   - يتم تجميع الرقم ليكون: `+201017799580` (أو قد يُرسل بدون + حسب شاشة الهاتف).
2. **استدعاء `/api/otp/send`:**
   - يستقبل `phoneNumber`.
   - يتم تطبيق `formatPhoneNumber(phoneNumber)` في `unified-otp-service.ts:17-24`:
     ```typescript
     let cleaned = phone.replace(/[^\d+]/g, '');
     if (!cleaned.startsWith('+') && cleaned.startsWith('0')) cleaned = cleaned.substring(1);
     ```
   - ينتج `formattedPhone`.
3. **تخزين الـ OTP في `otp_verifications`:**
   - يستدعي `storeOTPInFirestore(formattedPhone, otp)` في `otp-manager.ts:18-20`:
     ```typescript
     function getDocId(phoneNumber: string): string {
       return `otp_${phoneNumber.replace(/[^0-9]/g, '')}`;
     }
     ```
   - المفتاح المخزن في قاعدة البيانات يكون: `otp_201017799580`.
4. **التحقق في `/api/auth/verify-otp-and-check` أو `/api/auth/otp-login`:**
   - التطبيق يرسل `phoneNumber` و `code`.
   - الاستدعاء ينفذ `verifyOTPInFirestore(phoneNumber, code)`.
   - الدالة تحسب المفتاح عبر: `getDocId(phoneNumber)`.
   - **الخطر الواقعي [مؤكد بالكود]:**
     إذا أرسل التطبيق في الإرسال `+201017799580` وتم التخزين كـ `otp_201017799580`، ثم أرسل في التحقق الرقم المحلي `01017799580`، سيتم البحث عن `otp_01017799580`، وسيرد السيرفر بأن الرمز منتهي أو غير موجود رغم صحته وصحة الوقت!
   - التطبيع يجب أن يكون دالة مركزية واحدة ومحكمة وموحدة بين Frontend و Backend.

---

## 5. توصيات وخطوات الإصلاح لمسار المصادقة

1. **إنشاء جدول الفهرس الموحد `phone_accounts_index`:**
   - الحقول: `phone_normalized (PK), account_id, account_type, uid, created_at, updated_at`.
   - استعلام واحد ذري وفوري (`SELECT * FROM phone_accounts_index WHERE phone_normalized = :phone`).
   - خفض عدد الاستعلامات من 27 استعلاماً إلى استعلام واحد فقط (تحسين بنسبة 96%).
2. **إصلاح حفظ الـ `uid`:**
   - عند التسجيل أو أول تسجيل دخول، كتابة الـ `uid` فوراً داخل جدول الحساب وجدول الفهرس الموحد.
   - إلغاء استدعاءات `listUsers()` نهائياً والاعتماد على `admin.auth.getUserById(uid)`.
3. **تنظيف `verify-otp-and-check`:**
   - دمج `admins` في الفهرس الموحد وحذف الـ Loop المتتابع المكرر في الأسطر 46-65.
4. **توحيد دالة التطبيع:**
   - اعتماد صيغة E.164 قياسية واحدة وإلزام طرفيتي العميل والخادم بها قبل أي استعلام أو تخزين.
