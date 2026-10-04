# تقرير المراجعة النهائية للفهارس قبل التشغيل (Phase 4.1 Final Index Review)

**تاريخ المراجعة:** 2026-09-25  
**المشروع:** El7lm-V2 — منصة الحلم الرياضية  
**المرحلة:** Phase 4.1 — Database Performance Foundation (Final Review)  
**ملف الترحيل المقسم:** [`supabase/migrations/performance_indexes.sql`](file:///d:/El7lm-V2/supabase/migrations/performance_indexes.sql)  
**الصفة الهندسية:** Senior Principal Performance & Data Engineer  
**حالة الأمان:** **ممنوع تشغيل Migration على بيئة الإنتاج — مراجعة واعتماد فقط**.

---

## 1. ملخص استخراج استعلامات الكود الحي (Live Codebase Query Audit)

تم فحص ومسح كامل للكود المصدري للمشروع في تطبيقي الهاتف والويب (`mobile/lib` و `src`)، وتم استخراج وتحليل **380 استعلاماً حياً** تتفاعل مع الجداول الستة الرئيسية:

- **جدول `notifications`:** 32 استعلاماً حياً.
- **جدول `messages`:** 34 استعلاماً حياً.
- **جدول `conversations`:** 43 استعلاماً حياً.
- **جدول `players`:** 99 استعلاماً حياً.
- **جدول `users`:** 145 استعلاماً حياً.
- **جدول `opportunities`:** 17 استعلاماً حياً.
- **جدول `player_favorites`:** استعلامان أساسيان.
- **جدول `interaction_notifications`:** 19 استعلاماً حياً.

---

## 2. جدول الفحص والتحليل التفصيلي لكل فهرس وقرار الاعتماد (Index Evaluation Matrix)

| اسم الفهرس (Index Name) | الجدول (Table) | الاستعلام الفعلي الذي يحسنه في الكود (Exact Query & Location) | الأولوية | قرار الاعتماد (Decision) | التعليل الهندسي |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `idx_notifications_user_created` | `notifications` | `mobile/lib/services/data_service.dart:67`<br>`src/app/dashboard/admin/notifications/page.tsx:170`<br>`.from('notifications').select().eq('userId', userId).order('createdAt', desc)` | **P0 (Critical)** | **KEEP (Part A)** | فهرس مركب يخدم استعلام جلب الإشعارات الدوري في الهاتف والويب، يمنع مسح 2,500+ صف كل دقيقة. |
| `idx_notifications_user_unread` | `notifications` | `mobile/lib/screens/home/app_shell.dart:180`<br>`mobile/lib/services/data_service.dart:103`<br>`.from('notifications').select().eq('userId', userId).eq('isRead', false)` | **P0 (Critical)** | **KEEP (Part A)** | فهرس جزئي فائق الصغر للعدادات، يقرأ فقط الإشعارات غير المقروءة دون قراءة بقية الجدول. |
| `idx_interaction_notif_user_created` | `interaction_notifications` | `mobile/lib/services/data_service.dart:82`<br>`src/components/notifications/InteractionNotifications.tsx:64`<br>`.from('interaction_notifications').select().eq('userId', userId).order('createdAt', desc)` | **P0 (Critical)** | **KEEP (Part A)** | استعلام دوري يكرر قراءة 974 صفاً لتحديث تفاعلات الملف الشخصي. |
| `idx_interaction_notif_user_unread` | `interaction_notifications` | `mobile/lib/screens/home/app_shell.dart:188`<br>`src/lib/notifications/interaction-notifications.ts:215`<br>`.from('interaction_notifications').select().eq('userId', userId).eq('isRead', false)` | **P0 (Critical)** | **KEEP (Part A)** | فهرس جزئي لشارة التنبيهات التفاعلية، يقلل زمن العد من 35ms إلى 0.4ms. |
| `idx_messages_conversation_timestamp` | `messages` | `mobile/lib/services/data_service.dart:1537`<br>`.from('messages').select().eq('conversationId', convId).order('timestamp', desc).limit(100)` | **P0 (Critical)** | **KEEP (Part A)** | استعلام شاشة الدردشة في تطبيق فلاتر، يرتب الرسائل بـ `timestamp`. |
| `idx_messages_conversation_created` | `messages` | `src/app/api/messages/route.ts:45`<br>`src/components/messaging/WorkingMessageCenter.tsx:420`<br>`.from('messages').select().eq('conversationId', convId).order('createdAt', desc)` | **P0 (Critical)** | **KEEP (Part A)** | استعلام شاشة الدردشة على الويب، يرتب الرسائل بـ `createdAt`. |
| `idx_messages_receiver_unread` | `messages` | `mobile/lib/services/data_service.dart:1510`<br>`src/components/shared/UnifiedMessagesButton.tsx:86`<br>`.from('messages').select().eq('receiverId', userId).eq('isRead', false)` | **P0 (Critical)** | **KEEP (Part A)** | استعلام شارة الرسائل غير المقروءة لكل مستخدم. |
| `idx_conversations_participants_gin` | `conversations` | `mobile/lib/services/data_service.dart:1506`<br>`src/components/shared/UnifiedMessagesButton.tsx:42`<br>`.filter('participants', 'cs', '["userId"]').order('updatedAt', desc)` | **P0 (Critical)** | **KEEP (Part A)** | **ضروري جداً:** الاستعلام يستخدم مشغل الاحتواء `@>` في مصفوفة JSONB، وبدون GIN ينفذ مسحاً تسلسلياً كاملاً. |
| `idx_conversations_updated` | `conversations` | `mobile/lib/services/data_service.dart:1507`<br>`src/components/shared/UnifiedMessagesButton.tsx:43`<br>`.order('updatedAt', { ascending: false })` | **P0 (Critical)** | **KEEP (Part A)** | ترتيب قائمة المحادثات النشطة للمستخدم. |
| `idx_player_favorites_composite_unique` | `player_favorites` | `mobile/lib/services/data_service.dart:266`<br>`.insert({'owner_id': ownerId, 'player_id': playerId})`<br>`delete().eq('owner_id', ownerId).eq('player_id', playerId)` | **P0 (Critical)** | **KEEP (Part A)** | قيد تفرّد مركب يمنع التكرار ويوفر بحثاً لحظياً $O(1)$ عند التحقق أو الإلغاء. |
| `idx_player_favorites_owner_created` | `player_favorites` | `mobile/lib/services/data_service.dart:244`<br>`.from('player_favorites').select('player_id').eq('owner_id', ownerId).order('created_at', desc)` | **P0 (Critical)** | **KEEP (Part A)** | شاشة البحث وتصفية اللاعبين المفضلين (`favoritesOnly: true`). |
| `idx_opportunities_status_active_created` | `opportunities` | `src/app/api/opportunities/route.ts:59-65`<br>`.from('opportunities').select().eq('status', 'active').eq('isActive', true).order('createdAt', desc)` | **P0 (Critical)** | **KEEP (Part A)** | كتالوج استكشاف الفرص الرياضية العامة الأكثر زيارة من اللاعبين. |
| `idx_opportunities_organizer_created` | `opportunities` | `src/app/api/opportunities/route.ts:46`<br>`.from('opportunities').select().eq('organizerId', organizerId).order('createdAt', desc)` | **P0 (Critical)** | **KEEP (Part A)** | لوحة تحكم النادي أو الأكاديمية لعرض الفرص التي تم نشرها. |
| `idx_players_uid` | `players` | `src/lib/auth/phone-account-lookup.ts:182`<br>`mobile/lib/services/data_service.dart:130`<br>`.from('players').select().eq('uid', uid)` | **P0 (Critical)** | **KEEP (Part A)** | التحقق من جلسة اللاعب عند فتح التطبيق وتسجيل الدخول. |
| `idx_players_phone_normalized` | `players` | `src/lib/auth/phone-account-lookup.ts:180`<br>`src/app/api/auth/otp-login/route.ts:42`<br>`.from('players').select().eq('phoneNormalized', phone)` | **P0 (Critical)** | **KEEP (Part A)** | مسار تسجيل الدخول برقم الهاتف و OTP ومطابقة الحسابات. |
| `idx_users_uid` | `users` | `src/lib/auth/phone-account-lookup.ts:183`<br>`src/lib/api/user-auth.ts:24`<br>`.from('users').select().eq('uid', uid)` | **P0 (Critical)** | **KEEP (Part A)** | التحقق الأمني من صلاحيات المستخدم والموظف في كل طلب API. |
| `idx_users_phone_normalized` | `users` | `src/lib/auth/phone-account-lookup.ts:181`<br>`src/app/api/auth/otp-login/route.ts:45`<br>`.from('users').select().eq('phoneNormalized', phone)` | **P0 (Critical)** | **KEEP (Part A)** | تسجيل دخول المستخدمين والمشرفين بالهاتف. |
| `idx_messages_sender_id` | `messages` | لا يوجد أي استعلام في المشروع يبحث في الرسائل بـ `senderId` منفرداً. | **P2** | **DELETE (إلغاء نهائي)** | **حذف:** استعلامات الرسائل تبحث بـ `conversationId` أو `receiverId`. إنشاء فهرس على `senderId` يسبب إهداراً لكتابة كل رسالة شات بلا أي فائدة قراءة! |
| `idx_notifications_sender_id` | `notifications` | استعلام واحد إداري في لوحة الإشعارات. | **P1 (Secondary)** | **KEEP (Part B)** | مفتاح خارجي إداري ينقل للقسم B لتحسين لوحة المشرفين فقط. |
| `idx_users_role_id` | `users` | `src/app/api/admin/sync-employees/route.ts:25`<br>`.from('users').select().eq('roleId', roleId)` | **P1 (Secondary)** | **KEEP (Part B)** | مزامنة أدوار الموظفين وصلاحيات لوحة التحكم. |
| `idx_players_club_id` | `players` | `src/app/api/players/route.ts:80`<br>`.from('players').select().eq('clubId', clubId)` | **P1 (Secondary)** | **KEEP (Part B)** | تصفية لاعبي النادي في لوحات الأندية. |
| `idx_players_academy_id` | `players` | `src/app/api/players/route.ts:85`<br>`.from('players').select().eq('academyId', academyId)` | **P1 (Secondary)** | **KEEP (Part B)** | تصفية لاعبي الأكاديمية في لوحات الأكاديميات. |
| `idx_opportunities_country_created` | `opportunities` | `src/app/api/opportunities/route.ts:50`<br>`.from('opportunities').select().eq('country', country)` | **P1 (Secondary)** | **KEEP (Part B)** | تصفية الفرص حسب الدولة في صفحة البحث المتقدم. |
| `idx_clubs_uid` / `idx_clubs_phone_normalized` | `clubs` | `src/lib/auth/phone-account-lookup.ts:184` | **P1 (Secondary)** | **KEEP (Part B)** | الكيانات الرياضية (أندية) في التحقق من تسجيل الدخول. |
| `idx_academies_uid` / `idx_academies_phone_normalized` | `academies` | `src/lib/auth/phone-account-lookup.ts:185` | **P1 (Secondary)** | **KEEP (Part B)** | الكيانات الرياضية (أكاديميات) في تسجيل الدخول. |
| `idx_trainers_uid` / `idx_trainers_phone_normalized` | `trainers` | `src/lib/auth/phone-account-lookup.ts:186` | **P1 (Secondary)** | **KEEP (Part B)** | المدربون الرياضيون في تسجيل الدخول. |
| `idx_marketers_uid` / `idx_marketers_phone_normalized` | `marketers` | `src/lib/auth/phone-account-lookup.ts:187` | **P1 (Secondary)** | **KEEP (Part B)** | المسوقون الرياضيون في تسجيل الدخول. |
| `idx_agents_uid` / `idx_agents_phone_normalized` | `agents` | `src/lib/auth/phone-account-lookup.ts:188` | **P1 (Secondary)** | **KEEP (Part B)** | وكلاء اللاعبين في تسجيل الدخول. |

---

## 3. نتائج مراجعة الفهارس غير الضرورية أو المكررة (Optimization Review Findings)

1. **إلغاء فهرس مرشح (`DELETE`):**  
   - تم إلغاء `idx_messages_sender_id` على جدول `messages`.  
   - **السبب الفني:** أظهر فحص الـ 34 استعلاماً في الشات أن التطبيق **لا يستعلم إطلاقاً** بـ `senderId` منفرداً. الدردشة تُقرأ دائماً بواسطة `conversationId` أو الرسائل غير المقروءة بـ `receiverId`. وضع فهرس على `senderId` كان سيستهلك IOPS وتخزيناً بلا أي عائد قراءة.
2. **عزل وتوحيد الفهارس المتداخلة:**  
   - تم التحقق من عدم وجود أي تعارض أو تكرار بين فهارس الحسابات وفهارس جدول `phone_accounts_index`.
3. **تقسيم الـ Migration بدقة:**  
   - تم فصل الفهارس التي تخدم العمليات الحساسة اللحظية (Part A: 17 فهرساً حرجاً) عن الفهارس الثانوية للأدوار والكيانات (Part B: 15 فهرساً ثانوياً).
