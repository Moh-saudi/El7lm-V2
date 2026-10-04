# 00 — التقرير المعماري (المراجَع)

**تاريخ المراجعة:** 2026-09-24
**وضع المراجعة:** قراءة فقط — لم يُعدَّل أي كود
**حالة الملف:** مُراجَع ومُصحَّح

---

## 1. هيكل المجلدات

```
El7lm-V2/
├── src/                            ← Backend (Next.js 14 App Router)
│   ├── app/api/                    ← API Routes (Vercel Serverless Functions)
│   ├── lib/
│   │   ├── auth/                   ← phone-account-lookup.ts
│   │   ├── otp/                    ← otp-manager.ts, unified-otp-service.ts
│   │   ├── supabase/               ← admin.ts, client.ts
│   │   ├── validation/             ← phone-validation.ts
│   │   ├── video/                  ← video-service.ts
│   │   └── api/                    ← user-auth.ts (authorizeUser helper)
│   └── services/
├── mobile/                         ← تطبيق Flutter
│   └── lib/
│       ├── screens/
│       ├── services/               ← auth_service.dart, data_service.dart, api_client.dart
│       └── models/
├── schema.sql                      ← Schema (1800+ سطر) — لا Indexes ولا RLS [مؤكد]
├── supabase-*.sql                  ← 15+ migration files في الجذر
└── vercel.json                     ← إعدادات النشر
```

---

## 2. API Routes — الخريطة

| المسار | الطريقة | الملف | Auth؟ | الوظيفة |
|--------|---------|-------|-------|---------|
| `/api/otp/send` | POST | `otp/send/route.ts` | لا | إرسال OTP عبر ChatAman |
| `/api/otp/verify` | POST | `otp/verify/route.ts` | لا | التحقق من OTP (بلا Session) |
| `/api/otp/cleanup` | POST | `otp/cleanup/` | [لم يُفحص] | حذف OTPs المنتهية |
| `/api/auth/check-user` | ? | `auth/check-user/` | [لم يُفحص] | التحقق من وجود مستخدم |
| `/api/auth/check-user-exists` | ? | `auth/check-user-exists/` | [لم يُفحص] | **مكرر مع check-user** |
| `/api/auth/create-user-with-phone` | POST | `auth/create-user-with-phone/` | [لم يُفحص] | إنشاء حساب جديد |
| `/api/auth/find-user-by-phone` | ? | `auth/find-user-by-phone/` | [لم يُفحص] | **مكرر مع resolve-phone** |
| `/api/auth/otp-login` | POST | `auth/otp-login/route.ts` | لا | تسجيل الدخول بعد OTP |
| `/api/auth/resolve-phone` | POST | `auth/resolve-phone/` | [لم يُفحص] | كشف وجود الحساب |
| `/api/auth/verify-otp-and-check` | POST | `auth/verify-otp-and-check/route.ts` | لا | OTP + كشف مستخدم جديد/قديم |
| `/api/notifications/dispatch` | POST | `notifications/dispatch/route.ts` | **نعم** (authorizeUser) | إشعار داخلي + WhatsApp |
| `/api/players/videos` | GET | `players/videos/route.ts` | **لا** | قائمة اللاعبين بالفيديو |
| `/api/upload/video` | POST | `upload/video/route.ts` | **لا** [مؤكد — ثغرة] | رفع فيديو إلى Cloudflare R2 |
| `/api/media/analyze-video` | ? | `media/analyze-video/route.ts` | **لا** [مؤكد] | تحليل فيديو |
| `/api/media/debug` | ? | `media/debug/route.ts` | نعم | — |
| `/api/media/delete` | DELETE | `media/delete/route.ts` | نعم | حذف وسائط |
| `/api/media/list-r2` | GET | `media/list-r2/route.ts` | نعم | قائمة ملفات R2 |
| `/api/media/proxy-video` | GET | `media/proxy-video/route.ts` | **لا** [مؤكد] | proxy الفيديو |
| `/api/media/tiktok-thumb` | ? | `media/tiktok-thumb/route.ts` | **لا** [مؤكد] | صورة مصغرة TikTok |
| `/api/media/update-status` | ? | `media/update-status/route.ts` | نعم | — |

---

## 3. جداول القراءة/الكتابة الرئيسية

| الجدول | يُقرأ من | يُكتب فيه من |
|--------|---------|-------------|
| `players` | `phone-account-lookup.ts:90-103`، `otp-login/route.ts:49`، `data_service.dart:125`، `players/videos/route.ts:13` | `otp-login/route.ts:178`، `verify-otp-and-check/route.ts:127` |
| `clubs` | `phone-account-lookup.ts` | `otp-login/route.ts:178` |
| `academies` | `phone-account-lookup.ts` | `otp-login/route.ts:178` |
| `agents` | `phone-account-lookup.ts` | `otp-login/route.ts:178` |
| `trainers` | `phone-account-lookup.ts` | `otp-login/route.ts:178` |
| `marketers` | `phone-account-lookup.ts` | `otp-login/route.ts:178` |
| `users` | `phone-account-lookup.ts`، `data_service.dart:129` | — |
| `admins` | `otp-login/route.ts:62-74`، `verify-otp-and-check/route.ts:13` (في loop) | — |
| `otp_verifications` | `otp-manager.ts:32,84` | `otp-manager.ts:55,113,118` |
| `notifications` | `data_service.dart:58` | `notifications/dispatch/route.ts` |
| `interaction_notifications` | `data_service.dart:63` | `notifications/dispatch/route.ts:186` |
| `system_configs` | `unified-otp-service.ts:67`، `notifications/dispatch/route.ts:85` | — |
| `player_favorites` | `data_service.dart:241` | — |

---

## 4. الخدمات الخارجية

| الخدمة | الاستخدام | المكتبة | ملاحظة |
|--------|---------|---------|--------|
| **Supabase Auth** | Sessions، listUsers، createUser، updateUserById | `@supabase/supabase-js` REST | service_role فقط على الباك إند |
| **Supabase DB** | Postgres عبر REST | `@supabase/supabase-js` | لا Pooler، لا Prisma |
| **Cloudflare R2** | تخزين الفيديو والصور | `@aws-sdk/client-s3` S3-compatible | — |
| **ChatAman** | WhatsApp Business OTP والإشعارات | HTTP REST | API Key من `system_configs` في DB |
| **Firebase** (متبقٍّ) | الاسم `firestore-otp-manager.ts` هو alias لـ `otp-manager.ts` | — | تنظيف مطلوب |

---

## 5. vercel.json — مثبت

**المصدر:** `vercel.json` (تم قراءته سابقاً)

```json
{
  "functions": {
    "src/app/api/upload/video/route.ts":          { "maxDuration": 60 },
    "src/app/api/media/list-r2/route.ts":         { "maxDuration": 60 },
    "src/app/api/admin/users/count/route.ts":     { "maxDuration": 10 },
    "src/app/api/admin/settings/route.ts":        { "maxDuration": 10 }
  }
}
```

- **[مؤكد بالكود]** جميع API Routes أخرى (Auth, OTP, notifications) بلا `maxDuration` صريح → افتراضي 10 ثوانٍ
- **[يحتاج تأكيد]** هل الخطة Hobby (حد 10s) أم Pro (حد 300s)؟

---

## 6. رحلة المستخدم المثبتة

```
Flutter: phone_auth_screen → sendOtp() [auth_service.dart:147]
         ↓
POST /api/otp/send [otp/send/route.ts]
  ├─ findAccountByPhone() — 27 استعلاماً متوازياً [phone-account-lookup.ts:106]
  │    └─ fallback: listUsers({page:1, perPage:1000}) [L138]
  ├─ storeOTPInFirestore(formattedPhone, otp) — 2 استعلامات [otp-manager.ts:32-65]
  └─ sendOTPViaWhatsApp() → getChatAmanConfig() من DB → HTTP ChatAman [unified-otp-service.ts:64,126]
         ↓
Flutter: otp_screen → verifyOtp() [auth_service.dart:168]

إذا registration: POST /api/auth/verify-otp-and-check
  ├─ verifyOTPInFirestore() — 2 استعلامات [otp-manager.ts:84-118]
  ├─ loop متتابع (8 جداول × N variants، .eq()) [route.ts:46-65]
  ├─ findAccountByPhone() — 27 متوازٍ + listUsers fallback [L67]
  ├─ listUsers({perPage:2000}) إذا uid غير محفوظ [L88]
  ├─ auth.admin.updateUserById() [L115]
  └─ db.from(table).update(uid+lastLogin) [L127]

إذا login: POST /api/auth/otp-login
  ├─ verifyOTPInFirestore() [L33]
  ├─ findAccountByPhone() — 27 متوازٍ [L49]
  ├─ auth.admin.getUserById() إذا uid موجود [L93]
  │   أو listUsers({perPage:2000}) إذا uid غير موجود [L105]
  ├─ auth.admin.updateUserById() [L161]
  └─ db.from(table).update(uid+lastLogin) [L178]
         ↓
Flutter: Supabase.auth.signInWithPassword() [auth_service.dart:207]
         ↓
AppShell.initState():
  ├─ Timer(2s) → _fetchUnreadCounts() [app_shell.dart:58]
  │    ├─ fetchConversations() [L177]
  │    └─ fetchNotifications() — 2 استعلامات [data_service.dart:58-63]
  ├─ Timer.periodic(60s) → _fetchUnreadCounts() [app_shell.dart:64]
  └─ _ensureProfileCompletionReminder() → fetchProfile() [app_shell.dart:61]
```

---

## 7. ملاحظات عامة

| التصنيف | الملاحظة | الدليل |
|---------|---------|--------|
| [مؤكد بالكود] | `firestore-otp-manager.ts` هو re-export من `otp-manager.ts` (alias) | `unified-otp-service.ts:13` |
| [مؤكد بالكود] | لا Indexes في `schema.sql` | `schema.sql` grep |
| [مؤكد بالكود] | لا RLS في `schema.sql` | `schema.sql` grep |
| [مؤكد بالكود] | `admins` في verify-otp-and-check loop لكن ليس في findAccountByPhone | `verify-otp-and-check:13`، `phone-account-lookup.ts:4-12` |
| [مؤكد بالكود] | ChatAman API Key من DB لا من ENV | `unified-otp-service.ts:67` |
| [يحتاج تأكيد] | منطقة Vercel vs Supabase | Dashboard |
| [يحتاج تأكيد] | RLS الفعلي في DB (قد يكون مُفعَّلاً من Dashboard) | diagnostics.sql Q6+Q7 |
| [يحتاج تأكيد] | Indexes الفعلية في DB | diagnostics.sql Q4+Q8 |
| [لم يُفحص] | `src/app/api/auth/resolve-phone/route.ts` محتواه | — |
| [لم يُفحص] | `src/app/api/auth/create-user-with-phone/route.ts` | — |
| [لم يُفحص] | `mobile/lib/screens/auth/phone_auth_screen.dart` — صيغة الرقم المُرسَل | — |
