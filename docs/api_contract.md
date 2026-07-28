# عقد الربط مع منصة الحلم

## الإعداد

| المتغير | الغرض |
|---|---|
| `API_BASE_URL` | عنوان Next.js API، افتراضيًا `https://el7lm.com` |
| `WEB_BASE_URL` | عنوان صفحات الويب التي تفتح مؤقتًا |
| `SUPABASE_URL` | عنوان مشروع Supabase الحالي |
| `SUPABASE_PUBLISHABLE_KEY` | المفتاح العام فقط |

## المسارات المستخدمة

| الوظيفة | المسار |
|---|---|
| إرسال OTP | `POST /api/otp/send` |
| فحص OTP/المستخدم | `POST /api/auth/verify-otp-and-check` |
| إنشاء حساب الهاتف | `POST /api/auth/create-user-with-phone` |
| دخول OTP | `POST /api/auth/otp-login` |
| كروت وسينما اللاعبين | `GET /api/players/videos` |
| الفرص | `GET /api/opportunities?explore=true` |
| التقديم | `POST /api/opportunities/apply` مع Bearer token |

## الوصول المباشر إلى Supabase

يستخدم فقط مع جلسة المستخدم والمفتاح العام:

- قراءة/حفظ ملف صاحب الحساب.
- قراءة اللاعبين المرتبطين بالجهة.
- إنشاء كود في `organization_referrals`.

يجب أن تمنع RLS كل مستخدم من قراءة أو تعديل صفوف لا يملكها. لا يكفي
`TO authenticated` وحده؛ يجب وجود شرط ملكية مناسب.

## توافق الحقول

- نماذج القوائم العامة تستخدم حقولًا مسماة مع الاحتفاظ بـ`rawPayload`.
- ملف اللاعب يحتفظ بكامل صف `players` داخل `UserProfile.values`.
- الحفظ يدمج القيم الجديدة فوق القيم الأصلية.
- لا يُحوّل كائن الملف إلى DTO محدود قبل `upsert`.
- حقول `users` الأساسية تُحدّث في عملية منفصلة.
