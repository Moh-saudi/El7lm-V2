# سجل متابعة ترجمة صفحات المشروع

> آخر توليد آلي: الأربعاء، ١٥ يوليو ٢٠٢٦ في ٢:٣٧ م
>
> هذا التقرير هو المرجع المركزي لخطة الترجمة. الحالة «مكتملة مبدئياً» آلية وتحتاج اختباراً بصرياً قبل اعتمادها نهائياً.
> صفحات وأدوات لوحة تحكم الأدمن خارج النطاق الحالي بناءً على قرار المشروع.

## الملخص

- إجمالي ملفات الصفحات: **256**
- مكتملة مبدئياً: **112**
- قيد التنفيذ: **0**
- جزئية: **0**
- تستخدم قاموساً محلياً وتحتاج نقله للمركزي: **0**
- غير مربوطة بنظام الترجمة: **63**
- تحويل أو إعادة استخدام: **76**
- قديمة أو غير مستخدمة: **1**
- تحتاج مراجعة يدوية: **4**
- المتبقي داخل النطاق غير الإداري (جزئي/غير مربوط/مراجعة): **0**

## سلامة قواميس اللغات

| اللغة | عدد المفاتيح | المفاتيح الناقصة مقارنة بالعربية |
|---|---:|---:|
| AR | 5707 | 0 |
| EN | 5707 | 0 |
| ES | 5707 | 0 |
| PT | 5707 | 0 |

> ✅ القواميس المركزية للغات الأربع متطابقة من حيث المفاتيح.

## آخر فحص بصري مسجل

- **بوابة تسجيل الدخول للبطولات:** تم التحقق من AR / EN / ES / PT واتجاهي RTL/LTR دون تمدد أفقي أو أخطاء واجهة.
- **صفحات البطولات العامة:** تم اكتشاف الرأس والتذييل العربيين الثابتين، ونقلهما إلى القاموس المركزي والتحقق من EN / ES / PT.
- **التسجيل الموحد:** تم التحقق من EN / ES / PT دون تمدد أفقي؛ إعادة جولة AR مؤجلة لأن خادم التطوير المحلي انتهت مهلته أثناء إعادة التجميع.
- **بروفايل المدرب:** نصا التحميل وإعادة التوجيه في التخطيط المشترك نُقلا إلى القاموس المركزي؛ التحقق التركيبي ناجح، ويلزم تسجيل دخول صالح لفحص محتوى البروفايل نفسه بصرياً.

## قواعد المصدر المركزي ومنع التكرار

1. المصدر المعتمد للترجمة هو `src/lib/i18n/locales/{ar,en,es,pt}.json` فقط.
2. أي قاموس داخل صفحة أو مكوّن يُسجل كدين تقني حتى يُنقل إلى القاموس المركزي.
3. صفحات التحويل وإعادة التصدير والواجهات التي تستخدم مكوّناً مشتركاً لا تُترجم مرة أخرى.
4. يشمل فحص الصفحة ملفات المكونات و`hooks` و`schemas` التابعة لها، مع استبعاد مسارات الصفحات الفرعية.

## الدفعة التالية المقترحة آلياً

✅ لا توجد صفحات متبقية داخل النطاق غير الإداري الحالي.

## القواميس المحلية المطلوب نقلها

| الملف | القواميس المحلية |
|---|---|

## قواعد العمل

1. لا تُعتمد الصفحة مكتملة نهائياً إلا بعد مطابقة اللغات الأربع واختبار العرض RTL/LTR.
2. تُعالج الصفحات حسب الأولوية: العامة والمصادقة، اللاعب، المشتركة، بقية الحسابات، الإدارة.
3. بعد كل دفعة يُعاد تشغيل `node scripts/audit-i18n-pages.mjs` لتحديث الجدول.
4. الأرقام الخاصة بالنصوص الثابتة مؤشرات آلية، وقد تتضمن أسماء أو قيماً لا تحتاج ترجمة.

## القسم: [accountType]

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/[accountType]/invite-code` | `src/app/dashboard/[accountType]/invite-code/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/[accountType]/referrals` | `src/app/dashboard/[accountType]/referrals/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 4 مفتاح |

## القسم: academy

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/academy` | `src/app/dashboard/academy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 17 مفتاح |
| `/dashboard/academy/billing` | `src/app/dashboard/academy/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/academy/bulk-payment` | `src/app/dashboard/academy/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/academy/explore-opportunities` | `src/app/dashboard/academy/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/academy/messages` | `src/app/dashboard/academy/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 مفتاح |
| `/dashboard/academy/notifications` | `src/app/dashboard/academy/notifications/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام موجز الإشعارات المشترك المرتبط بالقاموس المركزي |
| `/dashboard/academy/player-videos` | `src/app/dashboard/academy/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/academy/players` | `src/app/dashboard/academy/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/academy/players/add` | `src/app/dashboard/academy/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/academy/profile` | `src/app/dashboard/academy/profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/academy/search-players` | `src/app/dashboard/academy/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/academy/store` | `src/app/dashboard/academy/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/academy/subscription-status` | `src/app/dashboard/academy/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |

## القسم: admin

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/admin` | `src/app/dashboard/admin/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/dashboard/admin/ads` | `src/app/dashboard/admin/ads/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 49 نص ثابت محتمل |
| `/dashboard/admin/ai-messenger` | `src/app/dashboard/admin/ai-messenger/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فُحص ملف الصفحة و5 ملفاً تابعاً |
| `/dashboard/admin/careers` | `src/app/dashboard/admin/careers/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 114 نص ثابت محتمل |
| `/dashboard/admin/chataman` | `src/app/dashboard/admin/chataman/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 94 نص ثابت محتمل |
| `/dashboard/admin/chataman-messenger` | `src/app/dashboard/admin/chataman-messenger/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/dashboard/admin/clarity` | `src/app/dashboard/admin/clarity/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 3 مفتاح |
| `/dashboard/admin/content` | `src/app/dashboard/admin/content/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 214 نص ثابت محتمل؛ فُحص ملف الصفحة و11 ملفاً تابعاً |
| `/dashboard/admin/customer-management` | `src/app/dashboard/admin/customer-management/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 191 نص ثابت محتمل |
| `/dashboard/admin/dream-academy` | `src/app/dashboard/admin/dream-academy/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 23 نص ثابت محتمل |
| `/dashboard/admin/dream-academy/categories` | `src/app/dashboard/admin/dream-academy/categories/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 31 نص ثابت محتمل |
| `/dashboard/admin/dream-academy/settings` | `src/app/dashboard/admin/dream-academy/settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 10 نص ثابت محتمل |
| `/dashboard/admin/dream-academy/videos` | `src/app/dashboard/admin/dream-academy/videos/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 77 نص ثابت محتمل |
| `/dashboard/admin/email-center` | `src/app/dashboard/admin/email-center/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 54 نص ثابت محتمل؛ فُحص ملف الصفحة و1 ملفاً تابعاً |
| `/dashboard/admin/email-migration` | `src/app/dashboard/admin/email-migration/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 39 نص ثابت محتمل |
| `/dashboard/admin/employees` | `src/app/dashboard/admin/employees/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 184 نص ثابت محتمل؛ فُحص ملف الصفحة و7 ملفاً تابعاً |
| `/dashboard/admin/employees-v2` | `src/app/dashboard/admin/employees-v2/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 184 نص ثابت محتمل؛ فُحص ملف الصفحة و6 ملفاً تابعاً |
| `/dashboard/admin/geidea-settings` | `src/app/dashboard/admin/geidea-settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 82 نص ثابت محتمل |
| `/dashboard/admin/geidea-transactions` | `src/app/dashboard/admin/geidea-transactions/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 125 نص ثابت محتمل |
| `/dashboard/admin/init-pricing` | `src/app/dashboard/admin/init-pricing/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 8 نص ثابت محتمل |
| `/dashboard/admin/inventory` | `src/app/dashboard/admin/inventory/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 97 نص ثابت محتمل |
| `/dashboard/admin/invoices` | `src/app/dashboard/admin/invoices/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 207 نص ثابت محتمل |
| `/dashboard/admin/invoices/[id]` | `src/app/dashboard/admin/invoices/[id]/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 56 نص ثابت محتمل |
| `/dashboard/admin/media` | `src/app/dashboard/admin/media/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 107 نص ثابت محتمل؛ فُحص ملف الصفحة و7 ملفاً تابعاً |
| `/dashboard/admin/message-management` | `src/app/dashboard/admin/message-management/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 76 نص ثابت محتمل |
| `/dashboard/admin/messages` | `src/app/dashboard/admin/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 نص ثابت محتمل |
| `/dashboard/admin/notification-center` | `src/app/dashboard/admin/notification-center/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 78 نص ثابت محتمل |
| `/dashboard/admin/notifications` | `src/app/dashboard/admin/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام موجز الإشعارات المشترك المرتبط بالقاموس المركزي |
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
| `/dashboard/admin/send-notifications` | `src/app/dashboard/admin/send-notifications/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 97 نص ثابت محتمل؛ فُحص ملف الصفحة و1 ملفاً تابعاً |
| `/dashboard/admin/settings` | `src/app/dashboard/admin/settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 31 نص ثابت محتمل |
| `/dashboard/admin/skipcash` | `src/app/dashboard/admin/skipcash/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 20 نص ثابت محتمل |
| `/dashboard/admin/skipcash/return` | `src/app/dashboard/admin/skipcash/return/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 11 نص ثابت محتمل |
| `/dashboard/admin/store` | `src/app/dashboard/admin/store/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 13 نص ثابت محتمل |
| `/dashboard/admin/store-orders` | `src/app/dashboard/admin/store-orders/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 37 نص ثابت محتمل |
| `/dashboard/admin/support` | `src/app/dashboard/admin/support/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 95 نص ثابت محتمل؛ فُحص ملف الصفحة و7 ملفاً تابعاً |
| `/dashboard/admin/system` | `src/app/dashboard/admin/system/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 28 نص ثابت محتمل |
| `/dashboard/admin/test-access` | `src/app/dashboard/admin/test-access/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 11 نص ثابت محتمل |
| `/dashboard/admin/tournament-clients` | `src/app/dashboard/admin/tournament-clients/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/dashboard/admin/tournaments` | `src/app/dashboard/admin/tournaments/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 160 نص ثابت محتمل؛ فُحص ملف الصفحة و6 ملفاً تابعاً |
| `/dashboard/admin/tournaments/[id]` | `src/app/dashboard/admin/tournaments/[id]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/admin/tournaments/[id]/bracket` | `src/app/dashboard/admin/tournaments/[id]/bracket/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/[id]/manage` | `src/app/dashboard/admin/tournaments/[id]/manage/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 156 نص ثابت محتمل؛ فُحص ملف الصفحة و5 ملفاً تابعاً |
| `/dashboard/admin/tournaments/[id]/matches` | `src/app/dashboard/admin/tournaments/[id]/matches/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/[id]/overview` | `src/app/dashboard/admin/tournaments/[id]/overview/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/[id]/settings` | `src/app/dashboard/admin/tournaments/[id]/settings/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 8 نص ثابت محتمل |
| `/dashboard/admin/tournaments/[id]/teams` | `src/app/dashboard/admin/tournaments/[id]/teams/page.tsx` | — | — | — | — | ❌ | ⚪ تحتاج مراجعة | فحص يدوي مطلوب |
| `/dashboard/admin/tournaments/registrations` | `src/app/dashboard/admin/tournaments/registrations/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 89 نص ثابت محتمل |
| `/dashboard/admin/users` | `src/app/dashboard/admin/users/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 229 نص ثابت محتمل؛ فُحص ملف الصفحة و13 ملفاً تابعاً |
| `/dashboard/admin/users-v2` | `src/app/dashboard/admin/users-v2/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 229 نص ثابت محتمل؛ فُحص ملف الصفحة و12 ملفاً تابعاً |
| `/dashboard/admin/users/academies` | `src/app/dashboard/admin/users/academies/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 77 نص ثابت محتمل |
| `/dashboard/admin/users/check-phone` | `src/app/dashboard/admin/users/check-phone/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 26 نص ثابت محتمل |
| `/dashboard/admin/users/players` | `src/app/dashboard/admin/users/players/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 96 نص ثابت محتمل |
| `/dashboard/admin/users/referrals` | `src/app/dashboard/admin/users/referrals/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 81 نص ثابت محتمل |
| `/dashboard/admin/videos` | `src/app/dashboard/admin/videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 1 نص ثابت محتمل |
| `/dashboard/admin/whatsapp` | `src/app/dashboard/admin/whatsapp/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 51 نص ثابت محتمل |
| `/dashboard/admin/whatsapp-test` | `src/app/dashboard/admin/whatsapp-test/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 128 نص ثابت محتمل |

## القسم: agent

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/agent` | `src/app/dashboard/agent/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/agent/billing` | `src/app/dashboard/agent/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 3 مفتاح |
| `/dashboard/agent/bulk-payment` | `src/app/dashboard/agent/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/agent/explore-opportunities` | `src/app/dashboard/agent/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/agent/messages` | `src/app/dashboard/agent/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 مفتاح |
| `/dashboard/agent/notifications` | `src/app/dashboard/agent/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 2 مفتاح |
| `/dashboard/agent/player-videos` | `src/app/dashboard/agent/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/agent/players` | `src/app/dashboard/agent/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/agent/players/add` | `src/app/dashboard/agent/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/agent/profile` | `src/app/dashboard/agent/profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/agent/search-players` | `src/app/dashboard/agent/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/agent/store` | `src/app/dashboard/agent/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/agent/subscription-status` | `src/app/dashboard/agent/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |

## القسم: auth

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/auth/forgot-password` | `src/app/auth/forgot-password/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 48 مفتاح |
| `/auth/login` | `src/app/auth/login/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 70 مفتاح |
| `/auth/register` | `src/app/auth/register/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 52 مفتاح |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 25 مفتاح |
| `/auth/select-role` | `src/app/auth/select-role/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 32 مفتاح |

## القسم: club

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/club` | `src/app/dashboard/club/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 17 مفتاح |
| `/dashboard/club/ai-analysis` | `src/app/dashboard/club/ai-analysis/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/billing` | `src/app/dashboard/club/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 10 مفتاح |
| `/dashboard/club/bulk-payment` | `src/app/dashboard/club/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/club/change-password` | `src/app/dashboard/club/change-password/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/contracts` | `src/app/dashboard/club/contracts/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/explore-opportunities` | `src/app/dashboard/club/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/club/market-values` | `src/app/dashboard/club/market-values/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/marketing` | `src/app/dashboard/club/marketing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/messages` | `src/app/dashboard/club/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 مفتاح |
| `/dashboard/club/negotiations` | `src/app/dashboard/club/negotiations/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/notifications` | `src/app/dashboard/club/notifications/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام موجز الإشعارات المشترك المرتبط بالقاموس المركزي |
| `/dashboard/club/player-evaluation` | `src/app/dashboard/club/player-evaluation/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/player-videos` | `src/app/dashboard/club/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/club/players` | `src/app/dashboard/club/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/players/[playerId]` | `src/app/dashboard/club/players/[playerId]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/club/players/add` | `src/app/dashboard/club/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/club/profile` | `src/app/dashboard/club/profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/club/search-players` | `src/app/dashboard/club/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/club/store` | `src/app/dashboard/club/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/club/subscription-status` | `src/app/dashboard/club/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |

## القسم: dashboard-shared

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |

## القسم: dream-academy

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/dream-academy` | `src/app/dashboard/dream-academy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 5 مفتاح |

## القسم: marketer

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/marketer` | `src/app/dashboard/marketer/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/marketer/ai-analysis` | `src/app/dashboard/marketer/ai-analysis/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/marketer/billing` | `src/app/dashboard/marketer/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 24 مفتاح |
| `/dashboard/marketer/contracts` | `src/app/dashboard/marketer/contracts/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/marketer/dream-academy` | `src/app/dashboard/marketer/dream-academy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/marketer/explore-opportunities` | `src/app/dashboard/marketer/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/marketer/messages` | `src/app/dashboard/marketer/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 مفتاح |
| `/dashboard/marketer/notifications` | `src/app/dashboard/marketer/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 2 مفتاح |
| `/dashboard/marketer/payment` | `src/app/dashboard/marketer/payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/marketer/player-videos` | `src/app/dashboard/marketer/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/marketer/players` | `src/app/dashboard/marketer/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/marketer/profile` | `src/app/dashboard/marketer/profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/marketer/referrals` | `src/app/dashboard/marketer/referrals/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | إعادة تصدير لصفحة أخرى؛ لا تترجم هنا |
| `/dashboard/marketer/search-players` | `src/app/dashboard/marketer/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/marketer/store` | `src/app/dashboard/marketer/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/marketer/subscription` | `src/app/dashboard/marketer/subscription/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |
| `/dashboard/marketer/subscription-status` | `src/app/dashboard/marketer/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |

## القسم: messages

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/messages` | `src/app/dashboard/messages/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages |

## القسم: opportunities

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/opportunities` | `src/app/dashboard/opportunities/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/opportunities/[id]/applications` | `src/app/dashboard/opportunities/[id]/applications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/opportunities/create` | `src/app/dashboard/opportunities/create/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |

## القسم: parent

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/parent` | `src/app/dashboard/parent/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/parent/store` | `src/app/dashboard/parent/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |

## القسم: payment

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/payment` | `src/app/dashboard/payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/payment/failure` | `src/app/dashboard/payment/failure/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/payment/status` | `src/app/dashboard/payment/status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/payment/success` | `src/app/dashboard/payment/success/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |

## القسم: player

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/player` | `src/app/dashboard/player/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 76 مفتاح |
| `/dashboard/player/academy` | `src/app/dashboard/player/academy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 1 مفتاح |
| `/dashboard/player/billing` | `src/app/dashboard/player/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 26 مفتاح |
| `/dashboard/player/bulk-payment` | `src/app/dashboard/player/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/player/career` | `src/app/dashboard/player/career/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 5 مفتاح |
| `/dashboard/player/entity-profile` | `src/app/dashboard/player/entity-profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 7 مفتاح |
| `/dashboard/player/explore-opportunities` | `src/app/dashboard/player/explore-opportunities/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 106 مفتاح |
| `/dashboard/player/messages` | `src/app/dashboard/player/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 مفتاح |
| `/dashboard/player/my-applications` | `src/app/dashboard/player/my-applications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 20 مفتاح |
| `/dashboard/player/notifications` | `src/app/dashboard/player/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 2 مفتاح |
| `/dashboard/player/payment-cancelled` | `src/app/dashboard/player/payment-cancelled/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/player/payment-success` | `src/app/dashboard/player/payment-success/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 12 مفتاح |
| `/dashboard/player/player-videos` | `src/app/dashboard/player/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/player/profile` | `src/app/dashboard/player/profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 317 مفتاح؛ فُحص ملف الصفحة و11 ملفاً تابعاً |
| `/dashboard/player/referrals` | `src/app/dashboard/player/referrals/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 41 مفتاح |
| `/dashboard/player/reports` | `src/app/dashboard/player/reports/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 6 مفتاح |
| `/dashboard/player/search` | `src/app/dashboard/player/search/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | فحص يدوي مطلوب |
| `/dashboard/player/search-opportunities` | `src/app/dashboard/player/search-opportunities/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 34 مفتاح |
| `/dashboard/player/search-opportunities/profile` | `src/app/dashboard/player/search-opportunities/profile/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | إعادة تصدير لصفحة أخرى؛ لا تترجم هنا |
| `/dashboard/player/search-opportunities/profile/[type]/[id]` | `src/app/dashboard/player/search-opportunities/profile/[type]/[id]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | إعادة تصدير لصفحة أخرى؛ لا تترجم هنا |
| `/dashboard/player/search-players` | `src/app/dashboard/player/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/player/search/profile` | `src/app/dashboard/player/search/profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم؛ 1 مفتاح |
| `/dashboard/player/search/profile/[type]/[id]` | `src/app/dashboard/player/search/profile/[type]/[id]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 40 مفتاح |
| `/dashboard/player/shared-videos` | `src/app/dashboard/player/shared-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/player/stats` | `src/app/dashboard/player/stats/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 33 مفتاح |
| `/dashboard/player/store` | `src/app/dashboard/player/store/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 127 مفتاح |
| `/dashboard/player/subscription-status` | `src/app/dashboard/player/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |
| `/dashboard/player/tournaments` | `src/app/dashboard/player/tournaments/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/player/videos` | `src/app/dashboard/player/videos/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 72 مفتاح |
| `/dashboard/player/videos/upload` | `src/app/dashboard/player/videos/upload/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 51 مفتاح |

## القسم: public

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/` | `src/app/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | قاموس الصفحة المحلي مكتمل للغات الأربع |
| `/about` | `src/app/about/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 41 مفتاح |
| `/admin/convert-dependent-players` | `src/app/admin/convert-dependent-players/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/admin/fix-players-names` | `src/app/admin/fix-players-names/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 9 نص ثابت محتمل |
| `/admin/generate-invite-codes` | `src/app/admin/generate-invite-codes/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 38 نص ثابت محتمل |
| `/admin/login` | `src/app/admin/login/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 16 نص ثابت محتمل |
| `/admin/login-advanced` | `src/app/admin/login-advanced/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 40 نص ثابت محتمل |
| `/admin/login-new` | `src/app/admin/login-new/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 72 نص ثابت محتمل |
| `/careers` | `src/app/careers/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 78 مفتاح |
| `/careers/apply` | `src/app/careers/apply/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 21 مفتاح |
| `/contact` | `src/app/contact/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 45 مفتاح |
| `/debug/check-account` | `src/app/debug/check-account/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 12 نص ثابت محتمل |
| `/fix-admin` | `src/app/fix-admin/page.tsx` | — | — | — | — | ❌ | 🔴 غير مربوطة | 2 نص ثابت محتمل |
| `/invite/[code]` | `src/app/invite/[code]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 39 مفتاح |
| `/invoice/[id]` | `src/app/invoice/[id]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 56 نص ثابت محتمل |
| `/join/org/[code]` | `src/app/join/org/[code]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 27 مفتاح |
| `/labs-landing` | `src/app/labs-landing/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/offline` | `src/app/offline/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 13 مفتاح |
| `/payment/success` | `src/app/payment/success/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 15 نص ثابت محتمل |
| `/platform` | `src/app/platform/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/player-invite` | `src/app/player-invite/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/preview` | `src/app/preview/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/privacy` | `src/app/privacy/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 81 مفتاح |
| `/profile` | `src/app/profile/page.tsx` | ❌ 44 | ❌ 44 | ❌ 44 | ❌ 44 | ❌ | ⚫ قديمة/غير مستخدمة | صفحة قديمة منفصلة عن بروفايل اللاعب الرئيسي /dashboard/player/profile ولا تشير إليها قوائم التطبيق؛ 44 مفتاح؛ 176 مفتاح مفقود إجمالاً |
| `/store-preview` | `src/app/store-preview/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/success-stories` | `src/app/success-stories/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 16 مفتاح |
| `/support` | `src/app/support/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 52 مفتاح |
| `/terms` | `src/app/terms/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 11 مفتاح |
| `/test-translate-simple` | `src/app/test-translate-simple/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 12 مفتاح |
| `/tournament-portal` | `src/app/tournament-portal/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فُحص ملف الصفحة و1 ملفاً تابعاً |
| `/tournament-portal/[id]/analytics` | `src/app/tournament-portal/[id]/analytics/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/bracket` | `src/app/tournament-portal/[id]/bracket/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/certificates` | `src/app/tournament-portal/[id]/certificates/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/draw` | `src/app/tournament-portal/[id]/draw/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/gallery` | `src/app/tournament-portal/[id]/gallery/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/groups` | `src/app/tournament-portal/[id]/groups/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/matches` | `src/app/tournament-portal/[id]/matches/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/notifications` | `src/app/tournament-portal/[id]/notifications/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/overview` | `src/app/tournament-portal/[id]/overview/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/print` | `src/app/tournament-portal/[id]/print/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/registrations` | `src/app/tournament-portal/[id]/registrations/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/schedule` | `src/app/tournament-portal/[id]/schedule/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/setup` | `src/app/tournament-portal/[id]/setup/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/stats` | `src/app/tournament-portal/[id]/stats/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/[id]/team-view` | `src/app/tournament-portal/[id]/team-view/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/login` | `src/app/tournament-portal/login/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/new` | `src/app/tournament-portal/new/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournament-portal/register` | `src/app/tournament-portal/register/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournaments` | `src/app/tournaments/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 14 مفتاح |
| `/tournaments/_[id]` | `src/app/tournaments/_[id]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/tournaments/[slug]` | `src/app/tournaments/[slug]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournaments/[slug]/register` | `src/app/tournaments/[slug]/register/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/tournaments/unified-registration` | `src/app/tournaments/unified-registration/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/videos` | `src/app/videos/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |

## القسم: shared

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/shared/bulk-payment` | `src/app/dashboard/shared/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/shared/messages` | `src/app/dashboard/shared/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 11 مفتاح |
| `/dashboard/shared/payment` | `src/app/dashboard/shared/payment/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | المكوّن المشترك يملك 128 مفتاحاً متطابقاً ومكتمل للغات الأربع؛ يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/shared/player-form` | `src/app/dashboard/shared/player-form/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/shared/player-profile/[playerId]` | `src/app/dashboard/shared/player-profile/[playerId]/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 6 مفتاح |
| `/dashboard/shared/store` | `src/app/dashboard/shared/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة متجر اللاعب /dashboard/player/store كمصدر مشترك |
| `/dashboard/shared/subscription-status` | `src/app/dashboard/shared/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 13 مفتاح |

## القسم: subscription

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/subscription` | `src/app/dashboard/subscription/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |

## القسم: trainer

| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/dashboard/trainer` | `src/app/dashboard/trainer/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 8 مفتاح |
| `/dashboard/trainer/billing` | `src/app/dashboard/trainer/billing/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | 3 مفتاح |
| `/dashboard/trainer/bulk-payment` | `src/app/dashboard/trainer/bulk-payment/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment |
| `/dashboard/trainer/explore-opportunities` | `src/app/dashboard/trainer/explore-opportunities/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities |
| `/dashboard/trainer/messages` | `src/app/dashboard/trainer/messages/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages؛ 1 مفتاح |
| `/dashboard/trainer/notifications` | `src/app/dashboard/trainer/notifications/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام موجز الإشعارات المشترك المرتبط بالقاموس المركزي |
| `/dashboard/trainer/player-videos` | `src/app/dashboard/trainer/player-videos/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/trainer/players` | `src/app/dashboard/trainer/players/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/trainer/players/[playerId]` | `src/app/dashboard/trainer/players/[playerId]/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم |
| `/dashboard/trainer/players/[playerId]/edit` | `src/app/dashboard/trainer/players/[playerId]/edit/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/trainer/players/add` | `src/app/dashboard/trainer/players/add/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/trainer/profile` | `src/app/dashboard/trainer/profile/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ مكتملة مبدئياً | فحص يدوي مطلوب |
| `/dashboard/trainer/search-players` | `src/app/dashboard/trainer/search-players/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع |
| `/dashboard/trainer/store` | `src/app/dashboard/trainer/store/page.tsx` | — | — | — | — | ❌ | 🔁 تحويل/إعادة استخدام | يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store |
| `/dashboard/trainer/subscription-status` | `src/app/dashboard/trainer/subscription-status/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔁 تحويل/إعادة استخدام | يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status؛ 1 مفتاح |

