# سجل متابعة ترجمة صفحات المشروع

> آخر توليد آلي: الجمعة، ١٠ يوليو ٢٠٢٦ في ١١:٣٧ م
>
> هذا التقرير هو المرجع المركزي لخطة الترجمة. الحالة «مكتملة مبدئياً» آلية وتحتاج اختباراً بصرياً قبل اعتمادها نهائياً.

## الملخص

- إجمالي ملفات الصفحات: **256**
- مكتملة مبدئياً: **58**
- قيد التنفيذ: **0**
- جزئية: **5**
- غير مربوطة بنظام الترجمة: **111**
- تحويل أو إعادة استخدام: **71**
- تحتاج مراجعة يدوية: **11**

## سلامة قواميس اللغات

| اللغة | عدد المفاتيح | المفاتيح الناقصة مقارنة بالعربية |
|---|---:|---:|
| AR | 1938 | 0 |
| EN | 1938 | 0 |
| ES | 1659 | 279 |
| PT | 1659 | 279 |

> تنبيه: الإسبانية والبرتغالية ناقصتان حالياً عن القاموس العربي، ولذلك لا تُعتمد الصفحات المعتمدة على هذه المفاتيح قبل استكمالها.

## دفعة البداية المعتمدة

1. `/auth/login` — إكمال المفاتيح المفقودة وإزالة النصوص الثابتة.
2. `/auth/register` — مراجعة النصوص الثابتة واختبار اللغات الأربع.
3. `/auth/forgot-password` — إنشاء المفاتيح المفقودة وربط الصفحة.
4. `/auth/reset-password` — إكمال المفاتيح واختبار حالات النجاح والخطأ.
5. `/auth/select-role` — مراجعة أسماء الأدوار واتجاه العرض.

## قواعد العمل

1. لا تُعتمد الصفحة مكتملة نهائياً إلا بعد مطابقة اللغات الأربع واختبار العرض RTL/LTR.
2. تُعالج الصفحات حسب الأولوية: العامة والمصادقة، اللاعب، المشتركة، بقية الحسابات، الإدارة.
3. بعد كل دفعة يُعاد تشغيل `node scripts/audit-i18n-pages.mjs` لتحديث الجدول.
4. الأرقام الخاصة بالنصوص الثابتة مؤشرات آلية، وقد تتضمن أسماء أو قيماً لا تحتاج ترجمة.

## القسم: [accountType]

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/[accountType]/invite-code` | `src/app/dashboard/[accountType]/invite-code/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | قاموس محلي مكتمل للغات الأربع |
| `/dashboard/[accountType]/referrals` | `src/app/dashboard/[accountType]/referrals/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 4 مفتاح |

## القسم: academy

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/academy` | `src/app/dashboard/academy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 17 مفتاح |
| `/dashboard/academy/billing` | `src/app/dashboard/academy/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/academy/bulk-payment` | `src/app/dashboard/academy/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/academy/explore-opportunities` | `src/app/dashboard/academy/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/academy/messages` | `src/app/dashboard/academy/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/academy/notifications` | `src/app/dashboard/academy/notifications/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/academy/player-videos` | `src/app/dashboard/academy/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/academy/players` | `src/app/dashboard/academy/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/academy/players/add` | `src/app/dashboard/academy/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form |
| `/dashboard/academy/profile` | `src/app/dashboard/academy/profile/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 78 نص ثابت محتمل |
| `/dashboard/academy/search-players` | `src/app/dashboard/academy/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/academy/store` | `src/app/dashboard/academy/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/academy/subscription-status` | `src/app/dashboard/academy/subscription-status/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |

## القسم: admin

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/admin` | `src/app/dashboard/admin/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/dashboard/admin/ads` | `src/app/dashboard/admin/ads/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 49 نص ثابت محتمل |
| `/dashboard/admin/ai-messenger` | `src/app/dashboard/admin/ai-messenger/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/admin/careers` | `src/app/dashboard/admin/careers/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 114 نص ثابت محتمل |
| `/dashboard/admin/chataman` | `src/app/dashboard/admin/chataman/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 94 نص ثابت محتمل |
| `/dashboard/admin/chataman-messenger` | `src/app/dashboard/admin/chataman-messenger/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/dashboard/admin/clarity` | `src/app/dashboard/admin/clarity/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 3 مفتاح |
| `/dashboard/admin/content` | `src/app/dashboard/admin/content/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 11 نص ثابت محتمل |
| `/dashboard/admin/customer-management` | `src/app/dashboard/admin/customer-management/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 191 نص ثابت محتمل |
| `/dashboard/admin/dream-academy` | `src/app/dashboard/admin/dream-academy/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 23 نص ثابت محتمل |
| `/dashboard/admin/dream-academy/categories` | `src/app/dashboard/admin/dream-academy/categories/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 31 نص ثابت محتمل |
| `/dashboard/admin/dream-academy/settings` | `src/app/dashboard/admin/dream-academy/settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 10 نص ثابت محتمل |
| `/dashboard/admin/dream-academy/videos` | `src/app/dashboard/admin/dream-academy/videos/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 77 نص ثابت محتمل |
| `/dashboard/admin/email-center` | `src/app/dashboard/admin/email-center/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/email-migration` | `src/app/dashboard/admin/email-migration/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 39 نص ثابت محتمل |
| `/dashboard/admin/employees` | `src/app/dashboard/admin/employees/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/employees-v2` | `src/app/dashboard/admin/employees-v2/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 30 نص ثابت محتمل |
| `/dashboard/admin/geidea-settings` | `src/app/dashboard/admin/geidea-settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 82 نص ثابت محتمل |
| `/dashboard/admin/geidea-transactions` | `src/app/dashboard/admin/geidea-transactions/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 125 نص ثابت محتمل |
| `/dashboard/admin/init-pricing` | `src/app/dashboard/admin/init-pricing/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment؛ 8 نص ثابت محتمل |
| `/dashboard/admin/inventory` | `src/app/dashboard/admin/inventory/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 97 نص ثابت محتمل |
| `/dashboard/admin/invoices` | `src/app/dashboard/admin/invoices/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 207 نص ثابت محتمل |
| `/dashboard/admin/invoices/[id]` | `src/app/dashboard/admin/invoices/[id]/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 56 نص ثابت محتمل |
| `/dashboard/admin/media` | `src/app/dashboard/admin/media/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 14 نص ثابت محتمل |
| `/dashboard/admin/message-management` | `src/app/dashboard/admin/message-management/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 76 نص ثابت محتمل |
| `/dashboard/admin/messages` | `src/app/dashboard/admin/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/admin/notification-center` | `src/app/dashboard/admin/notification-center/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 78 نص ثابت محتمل |
| `/dashboard/admin/notifications` | `src/app/dashboard/admin/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/admin/opportunities` | `src/app/dashboard/admin/opportunities/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 140 نص ثابت محتمل |
| `/dashboard/admin/opportunities/create` | `src/app/dashboard/admin/opportunities/create/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 83 نص ثابت محتمل |
| `/dashboard/admin/payments` | `src/app/dashboard/admin/payments/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 240 نص ثابت محتمل |
| `/dashboard/admin/payments-v2` | `src/app/dashboard/admin/payments-v2/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/dashboard/admin/payments/approval` | `src/app/dashboard/admin/payments/approval/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 33 نص ثابت محتمل |
| `/dashboard/admin/pricing` | `src/app/dashboard/admin/pricing/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 25 نص ثابت محتمل |
| `/dashboard/admin/pricing-management` | `src/app/dashboard/admin/pricing-management/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 193 نص ثابت محتمل |
| `/dashboard/admin/profile` | `src/app/dashboard/admin/profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 34 نص ثابت محتمل |
| `/dashboard/admin/reports` | `src/app/dashboard/admin/reports/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/admin/reports/financial` | `src/app/dashboard/admin/reports/financial/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 64 نص ثابت محتمل |
| `/dashboard/admin/send-notifications` | `src/app/dashboard/admin/send-notifications/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 97 نص ثابت محتمل |
| `/dashboard/admin/settings` | `src/app/dashboard/admin/settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 31 نص ثابت محتمل |
| `/dashboard/admin/skipcash` | `src/app/dashboard/admin/skipcash/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 20 نص ثابت محتمل |
| `/dashboard/admin/skipcash/return` | `src/app/dashboard/admin/skipcash/return/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 11 نص ثابت محتمل |
| `/dashboard/admin/store` | `src/app/dashboard/admin/store/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 13 نص ثابت محتمل |
| `/dashboard/admin/store-orders` | `src/app/dashboard/admin/store-orders/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/dashboard/admin/support` | `src/app/dashboard/admin/support/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 15 نص ثابت محتمل |
| `/dashboard/admin/system` | `src/app/dashboard/admin/system/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 28 نص ثابت محتمل |
| `/dashboard/admin/test-access` | `src/app/dashboard/admin/test-access/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 11 نص ثابت محتمل |
| `/dashboard/admin/tournament-clients` | `src/app/dashboard/admin/tournament-clients/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/dashboard/admin/tournaments` | `src/app/dashboard/admin/tournaments/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 34 نص ثابت محتمل |
| `/dashboard/admin/tournaments/[id]` | `src/app/dashboard/admin/tournaments/[id]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/admin/tournaments/[id]/bracket` | `src/app/dashboard/admin/tournaments/[id]/bracket/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/[id]/manage` | `src/app/dashboard/admin/tournaments/[id]/manage/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 4 نص ثابت محتمل |
| `/dashboard/admin/tournaments/[id]/matches` | `src/app/dashboard/admin/tournaments/[id]/matches/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/[id]/overview` | `src/app/dashboard/admin/tournaments/[id]/overview/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/[id]/settings` | `src/app/dashboard/admin/tournaments/[id]/settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 8 نص ثابت محتمل |
| `/dashboard/admin/tournaments/[id]/teams` | `src/app/dashboard/admin/tournaments/[id]/teams/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/registrations` | `src/app/dashboard/admin/tournaments/registrations/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 89 نص ثابت محتمل |
| `/dashboard/admin/users` | `src/app/dashboard/admin/users/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/users-v2` | `src/app/dashboard/admin/users-v2/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 22 نص ثابت محتمل |
| `/dashboard/admin/users/academies` | `src/app/dashboard/admin/users/academies/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 77 نص ثابت محتمل |
| `/dashboard/admin/users/check-phone` | `src/app/dashboard/admin/users/check-phone/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 26 نص ثابت محتمل |
| `/dashboard/admin/users/players` | `src/app/dashboard/admin/users/players/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 96 نص ثابت محتمل |
| `/dashboard/admin/users/referrals` | `src/app/dashboard/admin/users/referrals/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 81 نص ثابت محتمل |
| `/dashboard/admin/videos` | `src/app/dashboard/admin/videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 1 نص ثابت محتمل |
| `/dashboard/admin/whatsapp` | `src/app/dashboard/admin/whatsapp/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 51 نص ثابت محتمل |
| `/dashboard/admin/whatsapp-test` | `src/app/dashboard/admin/whatsapp-test/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 128 نص ثابت محتمل |

## القسم: agent

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/agent` | `src/app/dashboard/agent/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/agent/billing` | `src/app/dashboard/agent/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 3 مفتاح |
| `/dashboard/agent/bulk-payment` | `src/app/dashboard/agent/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/agent/explore-opportunities` | `src/app/dashboard/agent/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/agent/messages` | `src/app/dashboard/agent/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/agent/notifications` | `src/app/dashboard/agent/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 2 مفتاح |
| `/dashboard/agent/player-videos` | `src/app/dashboard/agent/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/agent/players` | `src/app/dashboard/agent/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/agent/players/add` | `src/app/dashboard/agent/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form |
| `/dashboard/agent/profile` | `src/app/dashboard/agent/profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 62 نص ثابت محتمل |
| `/dashboard/agent/search-players` | `src/app/dashboard/agent/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/agent/store` | `src/app/dashboard/agent/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/agent/subscription-status` | `src/app/dashboard/agent/subscription-status/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |

## القسم: auth

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/auth/forgot-password` | `src/app/auth/forgot-password/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 62 مفتاح |
| `/auth/login` | `src/app/auth/login/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 99 مفتاح |
| `/auth/register` | `src/app/auth/register/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 64 مفتاح |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 33 مفتاح |
| `/auth/select-role` | `src/app/auth/select-role/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 33 مفتاح |

## القسم: club

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/club` | `src/app/dashboard/club/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 17 مفتاح |
| `/dashboard/club/ai-analysis` | `src/app/dashboard/club/ai-analysis/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 27 نص ثابت محتمل |
| `/dashboard/club/billing` | `src/app/dashboard/club/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 10 مفتاح |
| `/dashboard/club/bulk-payment` | `src/app/dashboard/club/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/club/change-password` | `src/app/dashboard/club/change-password/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 8 نص ثابت محتمل |
| `/dashboard/club/contracts` | `src/app/dashboard/club/contracts/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 16 نص ثابت محتمل |
| `/dashboard/club/explore-opportunities` | `src/app/dashboard/club/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/club/market-values` | `src/app/dashboard/club/market-values/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 15 نص ثابت محتمل |
| `/dashboard/club/marketing` | `src/app/dashboard/club/marketing/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 29 نص ثابت محتمل |
| `/dashboard/club/messages` | `src/app/dashboard/club/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/club/negotiations` | `src/app/dashboard/club/negotiations/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 20 نص ثابت محتمل |
| `/dashboard/club/notifications` | `src/app/dashboard/club/notifications/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/club/player-evaluation` | `src/app/dashboard/club/player-evaluation/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 18 نص ثابت محتمل |
| `/dashboard/club/player-videos` | `src/app/dashboard/club/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/club/players` | `src/app/dashboard/club/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/players/[playerId]` | `src/app/dashboard/club/players/[playerId]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form |
| `/dashboard/club/players/add` | `src/app/dashboard/club/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form |
| `/dashboard/club/profile` | `src/app/dashboard/club/profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 77 نص ثابت محتمل |
| `/dashboard/club/search-players` | `src/app/dashboard/club/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/club/store` | `src/app/dashboard/club/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/club/subscription-status` | `src/app/dashboard/club/subscription-status/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |

## القسم: dashboard-shared

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 2 نص ثابت محتمل |

## القسم: dream-academy

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/dream-academy` | `src/app/dashboard/dream-academy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 5 مفتاح |

## القسم: marketer

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/marketer` | `src/app/dashboard/marketer/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/marketer/ai-analysis` | `src/app/dashboard/marketer/ai-analysis/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 19 نص ثابت محتمل |
| `/dashboard/marketer/billing` | `src/app/dashboard/marketer/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 26 مفتاح |
| `/dashboard/marketer/contracts` | `src/app/dashboard/marketer/contracts/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 16 نص ثابت محتمل |
| `/dashboard/marketer/dream-academy` | `src/app/dashboard/marketer/dream-academy/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/dashboard/marketer/explore-opportunities` | `src/app/dashboard/marketer/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/marketer/messages` | `src/app/dashboard/marketer/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/marketer/notifications` | `src/app/dashboard/marketer/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 2 مفتاح |
| `/dashboard/marketer/payment` | `src/app/dashboard/marketer/payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/marketer/player-videos` | `src/app/dashboard/marketer/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/marketer/players` | `src/app/dashboard/marketer/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/marketer/profile` | `src/app/dashboard/marketer/profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 67 نص ثابت محتمل |
| `/dashboard/marketer/referrals` | `src/app/dashboard/marketer/referrals/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 25 نص ثابت محتمل |
| `/dashboard/marketer/search-players` | `src/app/dashboard/marketer/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/marketer/store` | `src/app/dashboard/marketer/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/marketer/subscription` | `src/app/dashboard/marketer/subscription/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |
| `/dashboard/marketer/subscription-status` | `src/app/dashboard/marketer/subscription-status/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |

## القسم: messages

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/messages` | `src/app/dashboard/messages/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |

## القسم: opportunities

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/opportunities` | `src/app/dashboard/opportunities/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 46 نص ثابت محتمل |
| `/dashboard/opportunities/[id]/applications` | `src/app/dashboard/opportunities/[id]/applications/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 45 نص ثابت محتمل |
| `/dashboard/opportunities/create` | `src/app/dashboard/opportunities/create/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 87 نص ثابت محتمل |

## القسم: parent

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/parent` | `src/app/dashboard/parent/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/parent/store` | `src/app/dashboard/parent/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |

## القسم: payment

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/payment` | `src/app/dashboard/payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/payment/failure` | `src/app/dashboard/payment/failure/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/payment/status` | `src/app/dashboard/payment/status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/payment/success` | `src/app/dashboard/payment/success/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |

## القسم: player

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/player` | `src/app/dashboard/player/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 77 مفتاح |
| `/dashboard/player/academy` | `src/app/dashboard/player/academy/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 1 نص ثابت محتمل |
| `/dashboard/player/billing` | `src/app/dashboard/player/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 27 مفتاح |
| `/dashboard/player/bulk-payment` | `src/app/dashboard/player/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/player/career` | `src/app/dashboard/player/career/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 5 مفتاح |
| `/dashboard/player/entity-profile` | `src/app/dashboard/player/entity-profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 118 نص ثابت محتمل |
| `/dashboard/player/explore-opportunities` | `src/app/dashboard/player/explore-opportunities/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 122 مفتاح |
| `/dashboard/player/messages` | `src/app/dashboard/player/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/player/my-applications` | `src/app/dashboard/player/my-applications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 جزئية | 28 مفتاح؛ 4 نص ثابت محتمل |
| `/dashboard/player/notifications` | `src/app/dashboard/player/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 2 مفتاح |
| `/dashboard/player/payment-cancelled` | `src/app/dashboard/player/payment-cancelled/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment؛ 8 نص ثابت محتمل |
| `/dashboard/player/payment-success` | `src/app/dashboard/player/payment-success/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/player/player-videos` | `src/app/dashboard/player/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/player/profile` | `src/app/dashboard/player/profile/page.tsx` | ❌ 1 | ❌ 1 | ❌ 7 | ❌ 7 | ✅ | 🟡 جزئية | 18 مفتاح؛ 16 نص ثابت محتمل؛ 16 مفتاح مفقود إجمالاً |
| `/dashboard/player/referrals` | `src/app/dashboard/player/referrals/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 52 مفتاح |
| `/dashboard/player/reports` | `src/app/dashboard/player/reports/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 6 مفتاح |
| `/dashboard/player/search` | `src/app/dashboard/player/search/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | فحص يدوي مطلوب |
| `/dashboard/player/search-opportunities` | `src/app/dashboard/player/search-opportunities/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/dashboard/player/search-opportunities/profile` | `src/app/dashboard/player/search-opportunities/profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/dashboard/player/search-opportunities/profile/[type]/[id]` | `src/app/dashboard/player/search-opportunities/profile/[type]/[id]/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/dashboard/player/search-players` | `src/app/dashboard/player/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/player/search/profile` | `src/app/dashboard/player/search/profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/dashboard/player/search/profile/[type]/[id]` | `src/app/dashboard/player/search/profile/[type]/[id]/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/dashboard/player/shared-videos` | `src/app/dashboard/player/shared-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/player/stats` | `src/app/dashboard/player/stats/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 36 مفتاح |
| `/dashboard/player/store` | `src/app/dashboard/player/store/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 جزئية | 179 مفتاح؛ 96 نص ثابت محتمل |
| `/dashboard/player/subscription-status` | `src/app/dashboard/player/subscription-status/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |
| `/dashboard/player/tournaments` | `src/app/dashboard/player/tournaments/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/player/videos` | `src/app/dashboard/player/videos/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 83 مفتاح |
| `/dashboard/player/videos/upload` | `src/app/dashboard/player/videos/upload/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |

## القسم: public

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/` | `src/app/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | قاموس الصفحة المحلي مكتمل للغات الأربع |
| `/about` | `src/app/about/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 42 مفتاح |
| `/admin/convert-dependent-players` | `src/app/admin/convert-dependent-players/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/admin/fix-players-names` | `src/app/admin/fix-players-names/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 9 نص ثابت محتمل |
| `/admin/generate-invite-codes` | `src/app/admin/generate-invite-codes/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/admin/login` | `src/app/admin/login/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 16 نص ثابت محتمل |
| `/admin/login-advanced` | `src/app/admin/login-advanced/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/admin/login-new` | `src/app/admin/login-new/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 72 نص ثابت محتمل |
| `/careers` | `src/app/careers/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 98 مفتاح |
| `/careers/apply` | `src/app/careers/apply/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 22 مفتاح |
| `/contact` | `src/app/contact/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 55 مفتاح |
| `/debug/check-account` | `src/app/debug/check-account/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 12 نص ثابت محتمل |
| `/fix-admin` | `src/app/fix-admin/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 2 نص ثابت محتمل |
| `/invite/[code]` | `src/app/invite/[code]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 41 مفتاح |
| `/invoice/[id]` | `src/app/invoice/[id]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 56 نص ثابت محتمل |
| `/join/org/[code]` | `src/app/join/org/[code]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 27 مفتاح |
| `/labs-landing` | `src/app/labs-landing/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 16 نص ثابت محتمل |
| `/offline` | `src/app/offline/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 13 مفتاح |
| `/payment/success` | `src/app/payment/success/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 15 نص ثابت محتمل |
| `/platform` | `src/app/platform/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 65 نص ثابت محتمل |
| `/player-invite` | `src/app/player-invite/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 29 نص ثابت محتمل |
| `/preview` | `src/app/preview/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 13 نص ثابت محتمل |
| `/privacy` | `src/app/privacy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 81 مفتاح |
| `/profile` | `src/app/profile/page.tsx` | ❌ 59 | ❌ 59 | ❌ 59 | ❌ 59 | ✅ | 🟡 جزئية | 59 مفتاح؛ 236 مفتاح مفقود إجمالاً |
| `/store-preview` | `src/app/store-preview/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 52 نص ثابت محتمل |
| `/success-stories` | `src/app/success-stories/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 16 مفتاح |
| `/support` | `src/app/support/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 54 مفتاح |
| `/terms` | `src/app/terms/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 11 مفتاح |
| `/test-translate-simple` | `src/app/test-translate-simple/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 جزئية | 5 مفتاح؛ 7 نص ثابت محتمل |
| `/tournament-portal` | `src/app/tournament-portal/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 16 نص ثابت محتمل |
| `/tournament-portal/[id]/analytics` | `src/app/tournament-portal/[id]/analytics/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 30 نص ثابت محتمل |
| `/tournament-portal/[id]/bracket` | `src/app/tournament-portal/[id]/bracket/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 17 نص ثابت محتمل |
| `/tournament-portal/[id]/certificates` | `src/app/tournament-portal/[id]/certificates/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 27 نص ثابت محتمل |
| `/tournament-portal/[id]/draw` | `src/app/tournament-portal/[id]/draw/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 33 نص ثابت محتمل |
| `/tournament-portal/[id]/gallery` | `src/app/tournament-portal/[id]/gallery/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 29 نص ثابت محتمل |
| `/tournament-portal/[id]/groups` | `src/app/tournament-portal/[id]/groups/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/tournament-portal/[id]/matches` | `src/app/tournament-portal/[id]/matches/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 49 نص ثابت محتمل |
| `/tournament-portal/[id]/notifications` | `src/app/tournament-portal/[id]/notifications/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 53 نص ثابت محتمل |
| `/tournament-portal/[id]/overview` | `src/app/tournament-portal/[id]/overview/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 41 نص ثابت محتمل |
| `/tournament-portal/[id]/print` | `src/app/tournament-portal/[id]/print/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 39 نص ثابت محتمل |
| `/tournament-portal/[id]/registrations` | `src/app/tournament-portal/[id]/registrations/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 105 نص ثابت محتمل |
| `/tournament-portal/[id]/schedule` | `src/app/tournament-portal/[id]/schedule/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 42 نص ثابت محتمل |
| `/tournament-portal/[id]/setup` | `src/app/tournament-portal/[id]/setup/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 72 نص ثابت محتمل |
| `/tournament-portal/[id]/stats` | `src/app/tournament-portal/[id]/stats/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 28 نص ثابت محتمل |
| `/tournament-portal/[id]/team-view` | `src/app/tournament-portal/[id]/team-view/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/tournament-portal/login` | `src/app/tournament-portal/login/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 9 نص ثابت محتمل |
| `/tournament-portal/new` | `src/app/tournament-portal/new/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 82 نص ثابت محتمل |
| `/tournament-portal/register` | `src/app/tournament-portal/register/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/tournaments` | `src/app/tournaments/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 14 مفتاح |
| `/tournaments/_[id]` | `src/app/tournaments/_[id]/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 31 نص ثابت محتمل |
| `/tournaments/[slug]` | `src/app/tournaments/[slug]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 74 نص ثابت محتمل |
| `/tournaments/[slug]/register` | `src/app/tournaments/[slug]/register/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 55 نص ثابت محتمل |
| `/tournaments/unified-registration` | `src/app/tournaments/unified-registration/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 83 نص ثابت محتمل |
| `/videos` | `src/app/videos/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 3 نص ثابت محتمل |

## القسم: shared

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/shared/bulk-payment` | `src/app/dashboard/shared/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/shared/messages` | `src/app/dashboard/shared/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 12 مفتاح |
| `/dashboard/shared/payment` | `src/app/dashboard/shared/payment/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | المكوّن المشترك يملك 128 مفتاحاً متطابقاً ومكتمل للغات الأربع |
| `/dashboard/shared/player-form` | `src/app/dashboard/shared/player-form/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/shared/player-profile/[playerId]` | `src/app/dashboard/shared/player-profile/[playerId]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/shared/store` | `src/app/dashboard/shared/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة متجر اللاعب /dashboard/player/store كمصدر مشترك |
| `/dashboard/shared/subscription-status` | `src/app/dashboard/shared/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 14 مفتاح |

## القسم: subscription

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/subscription` | `src/app/dashboard/subscription/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |

## القسم: trainer

| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/trainer` | `src/app/dashboard/trainer/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/trainer/billing` | `src/app/dashboard/trainer/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 3 مفتاح |
| `/dashboard/trainer/bulk-payment` | `src/app/dashboard/trainer/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/trainer/explore-opportunities` | `src/app/dashboard/trainer/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/trainer/messages` | `src/app/dashboard/trainer/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/trainer/notifications` | `src/app/dashboard/trainer/notifications/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/trainer/player-videos` | `src/app/dashboard/trainer/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/trainer/players` | `src/app/dashboard/trainer/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/trainer/players/[playerId]` | `src/app/dashboard/trainer/players/[playerId]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/trainer/players/[playerId]/edit` | `src/app/dashboard/trainer/players/[playerId]/edit/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form |
| `/dashboard/trainer/players/add` | `src/app/dashboard/trainer/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form |
| `/dashboard/trainer/profile` | `src/app/dashboard/trainer/profile/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 87 نص ثابت محتمل |
| `/dashboard/trainer/search-players` | `src/app/dashboard/trainer/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مترجم محلياً للغات الأربع |
| `/dashboard/trainer/store` | `src/app/dashboard/trainer/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/trainer/subscription-status` | `src/app/dashboard/trainer/subscription-status/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 نص ثابت محتمل |

