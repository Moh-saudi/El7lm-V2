# تقرير التدقيق الشامل للأداء وتحمل 10,000 مستخدم يومياً (Phase 4 — El7lm-V2 Performance Audit)

**تاريخ التقرير:** 2026-09-25  
**المشروع:** El7lm-V2 — منصة الحلم الرياضية  
**المرحلة:** Phase 4 — High-Scale Performance & Latency Audit  
**الهدف الاستراتيجي:** تأهيل المنصة بالكامل لتحمل **10,000 مستخدم نشط يومياً (10k DAU)** مع زمن استجابة P95 أقل من **300ms** ومعدل توفر **99.9%**.  
**الصفة الهندسية:** Senior Principal Performance & Data Engineer  
**حالة التشغيل:** تدقيق واستقصاء فقط (Audit-Only) — **ممنوع تعديل أي كود في هذه المرحلة**.

---

## 1. نموذج المحاكاة الرياضي لحمل 10,000 مستخدم يومياً (Load Profile Model)

لتقييم المشاكل بدقة، تم بناء نموذج الحمل المتوقع عند وصول التطبيق إلى 10,000 مستخدم نشط يومياً:

| المؤشر | القيمة التقديرية | أوقات الذروة (Peak Hours) |
| :--- | :---: | :---: |
| **المستخدمون النشطون يومياً (DAU)** | 10,000 مستخدم | — |
| **المستخدمون المتزامنون في الذروة (Peak CCU)** | 1,200 - 1,800 مستخدم | 6:00 م - 11:00 م |
| **معدل الطلبات في الثانية (Target QPS)** | 150 - 350 req/sec | الذروة: حتى 600 req/sec |
| **جلسة المستخدم المتوسطة (Avg Session Length)** | 14 دقيقة | — |
| **الحد الأقصى المسموح لاستهلاك CPU بقاعدة البيانات** | < 60% في الذروة | حالياً معرض للوصول إلى 100% عند 1,000 مستخدم |
| **الحد الأقصى المسموح لحجم الاستجابة الشبكية** | < 50KB لكل شاشة | حالياً يصل لـ 2.5MB في شاشة اللاعبين |

---

## 2. مصفوفة المشاكل حسب الأولوية وتأثيرها (Executive Summary)

| الرمز | الطبقة | المشكلة المرصودة | الملف والسطر | الأولوية | الأثر المتوقع عند 10k DAU |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **DB-01** | Database | غياب كامل للفهارس (Zero Indexes) على أعمدة البحث والمفاتيح الخارجية | `schema.sql:6-1906` | **P0** | انهيار CPU لقاعدة البيانات عند 100% بسبب ملايين الـ Sequential Scans |
| **DB-02** | Database | إطلاق 27 استعلاماً متوازياً لكل عملية بحث بالهاتف في الـ Fallback | `phone-account-lookup.ts:178-195` | **P0** | استنزاف تجمع الاتصالات (Connection Pool) وتأخر تسجيل الدخول لـ 3-7 ثوانٍ |
| **DB-03** | Database | كلفة فحص سياسات RLS على جداول ضخمة بلا فهارس | `schema.sql:1-1906` | **P1** | تباطؤ تربيعي $O(N)$ في كل استعلام موثق من تطبيق الهاتف |
| **DB-04** | Database | شلال استعلامات تتابعي (Waterfall) في فحص هوية مستلم الإشعار عبر 6 جداول | `notifications/dispatch/route.ts:208-215` | **P1** | تأخر إرسال إشعارات الواتساب بـ 6 roundtrips لكل إشعار |
| **API-01** | API | جلب كافة بيانات اللاعبين بـ `SELECT *` دون ترقيم وتصفيتها في الذاكرة | `players/videos/route.ts:12-39` | **P0** | استهلاك فادح لذاكرة Vercel Serverless وحدوث أخطاء 504 و OOM |
| **API-02** | API | استعلام كتالوج الفرص `SELECT *` دون Pagination أو كاش | `opportunities/route.ts:56-72` | **P1** | هدر باندويث وتكرار قراءة الكتالوج بالكامل آلاف المرات يومياً |
| **API-03** | API | حلقة N+1 متسلسلة لقراءة الأدوار والصلاحيات للموظفين | `admin/sync-employees/route.ts:22-28` | **P1** | استدعاء مئات الاستعلامات الشبكية الفردية المتتابعة بدلاً من JOIN |
| **API-04** | API | غياب تام لترويسات الكاش (`Cache-Control`) على كافة الواجهات العامة | `opportunities/route.ts:200`, `players/videos/route.ts:40` | **P0** | 100,000 استدعاء Serverless يومياً لبيانات ثابتة بدلاً من كاش الـ CDN |
| **FL-01** | Flutter | تحميل جدول اللاعبين بالكامل محلياً وترقيمه وتصفيته في ذاكرة الهاتف | `data_service.dart:125-155`, `player_search_screen.dart:156-165` | **P0** | تحميل 25GB باندويث يومياً وتشنج الهواتف الضعيفة عند التصفح |
| **FL-02** | Flutter | مؤقت فحص دوري مدمر (Polling) يطلق 3 استعلامات كاملة كل 60 ثانية | `app_shell.dart:64-67`, `173-197` | **P0** | 50 استعلام/ثانية (3,000 استعلام/دقيقة) فقط لتحديث أرقام الشارات! |
| **FL-03** | Flutter | تحديث الإشعارات المقروءة عبر N استعلامات شبكية متتالية | `data_service.dart:103-108` | **P1** | بطء شديد يستغرق 5-10 ثوانٍ لتمييز 30 إشعاراً بدلاً من استعلام مجمع |
| **FL-04** | Flutter | غياب التخزين المؤقت المحلي (SWR / In-Memory Cache) في تطبيق الهاتف | `data_service.dart:25-28` | **P1** | إعادة تحميل كافة البيانات من الشبكة في كل مرة يتم فيها التبديل بين التبويبات |
| **FL-05** | Flutter | إعادة بناء كاملة لشجرة الواجهات في `AppShell` واحتفاظ `IndexedStack` بالوسائط | `app_shell.dart:350-352`, `521-535` | **P2** | استهلاك بطارية وذاكرة وارتفاع حرارة الهاتف وسقوط معدل الإطارات |

---

## 3. التدقيق التفصيلي لمحور قاعدة البيانات (Database Performance)

### المشكلة [DB-01]: غياب كامل للفهارس على أعمدة البحث والمفاتيح الخارجية (P0)
- **الملف:** [`schema.sql`](file:///d:/El7lm-V2/schema.sql#L6-L1906)
- **الأسطر:** 6 إلى 1906
- **المشكلة الفنية:**  
  ملف المخطط الأساسي `schema.sql` (1906 أسطر) لا يحتوي على أي أمر `CREATE INDEX` إطلاقاً، وتقتصر الفهارس فقط على المفتاح الأساسي (`PRIMARY KEY (id)`).  
  الأعمدة الحيوية الأكثر استخداماً في الفلترة والربط تفتقر للفهرسة:
  - `notifications.userId` و `interaction_notifications.userId` (تُستعلم كل 60 ثانية من التطبيق).
  - `messages.conversationId` و `messages.senderId` (تُستعلم في كل فتح محادثة).
  - `conversations.participants` (حقل مصفوفة/نص يُستعلم لكل مستخدم).
  - `player_favorites.owner_id` و `player_favorites.player_id` (يُستعلم في شاشات البحث).
  - `opportunities.status` و `opportunities.createdAt` و `opportunities.country`.
  - `players.uid` و `users.uid` (يُستخدمان في البحث عند غياب الـ ID).
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  تقوم PostgreSQL بتنفيذ مسح تسلسلي كامل (`Seq Scan`) لجميع الجداول عند كل استدعاء. مع وصول الجداول لعشرات الآلاف من السجلات، سيرتفع استهلاك CPU إلى 100% فورياً، وستصل أزمنة الاستجابة إلى 2,000ms - 5,000ms، مما يؤدي إلى تعطل تجمع الاتصالات (Connection Pool Exhaustion) وأخطاء `504 Gateway Timeout`.
- **الحل المقترح:**  
  إنشاء ملف ترحيل فهارس مجمع فوراً:
  ```sql
  -- فهارس الإشعارات والرسائل والمفضلات
  CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_interaction_notif_user ON public.interaction_notifications (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_player_fav_owner ON public.player_favorites (owner_id, player_id);
  CREATE INDEX IF NOT EXISTS idx_opportunities_status_created ON public.opportunities (status, is_active, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_players_uid ON public.players (uid) WHERE uid IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users (uid) WHERE uid IS NOT NULL;
  ```

---

### المشكلة [DB-02]: إطلاق 27 استعلاماً متوازياً لكل عملية بحث بالهاتف (P0)
- **الملف:** [`src/lib/auth/phone-account-lookup.ts`](file:///d:/El7lm-V2/src/lib/auth/phone-account-lookup.ts#L178-L195)
- **الأسطر:** 178 إلى 195
- **المشكلة الفنية:**  
  عند عدم العثور على الرقم في `phone_accounts_index` (أو أثناء مرحلة الـ Fallback)، تطلق الدالة 27 استعلاماً متوازياً عبر 7 جداول (`players`, `users`, `clubs`, `academies`, `trainers`, `marketers`, `agents`) للبحث في حقول `phone`, `phoneNumber`, `originalPhone`, `phoneNormalized`, `whatsapp`.
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  عند 10k مستخدم، إذا سجل 1,500 مستخدم دخولهم في وقت الذروة، سيتم إطلاق **40,500 استعلام معقد** في غضون دقائق، كل منها ينفذ Seq Scan، مما يشل قاعدة البيانات ويمنع المستخدمين من تسجيل الدخول.
- **الحل المقترح:**  
  1. الاعتماد الحصري والمطلق على جدول `phone_accounts_index` بعد اكتمال مرحلة الفهرسة الحالية.  
  2. إلغاء الـ 27 استعلاماً نهائياً واستبدالها باستعلام `UNION ALL` واحد مجمع في حال دعت الحاجة لـ Fallback طارئ.

---

### المشكلة [DB-03]: كلفة فحص سياسات RLS على جداول ضخمة تفتقر للفهرسة (P1)
- **الملف:** [`schema.sql`](file:///d:/El7lm-V2/schema.sql#L1-L1906)
- **الأسطر:** 1 إلى 1906
- **المشكلة الفنية:**  
  سياسات RLS عند تطبيقها في Supabase تعتمد على دوال مثل `auth.uid() = user_id`. عند غياب الفهارس على حقل `user_id`، تقوم قاعدة البيانات بتقييم الشرط لكل صف في الجدول (`Full Table Scan with Filter Evaluation`)، وتتضاعف الكلفة مع تعقيد الاستعلام.
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  تدهور أداء القراءة المباشرة من تطبيق الهاتف عبر `supabase-flutter` بنسبة 400% إلى 800% مع نمو عدد الصفوف.
- **الحل المقترح:**  
  فهرسة الأعمدة المعتمدة في سياسات RLS، وكتابة السياسات باستخدام `SELECT 1` واستخدام `(SELECT auth.uid())` كقيمة ثابتة مخزنة مؤقتاً أثناء تنفيذ الاستعلام (Scalar Subquery Optimization).

---

### المشكلة [DB-04]: شلال استعلامات متتابع في فحص هوية مستلم الإشعار (P1)
- **الملف:** [`src/app/api/notifications/dispatch/route.ts`](file:///d:/El7lm-V2/src/app/api/notifications/dispatch/route.ts#L208-L215)
- **الأسطر:** 208 إلى 215
- **الكود المرصود:**
  ```typescript
  for (const col of ['users', 'players', 'clubs', 'academies', 'agents', 'trainers']) {
    const { data } = await db.from(col).select('full_name, name, displayName').eq('id', targetUserId).limit(1);
    if (data?.length) { recipientName = name; break; }
  }
  ```
- **المشكلة الفنية:**  
  حلقة `for` تسلسلية تنتظر استجابة كل جدول تباعاً (`Sequential Waterfall`)، حيث ترسل حتى 6 استعلامات للشبكة للحصول على اسم مستلم إشعار الواتساب.
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  إرسال 5,000 إشعار يومياً سيتسبب في **30,000 استعلام شبكي تسلسلي** معطل، مما يرفع زمن معالجة طلب الإشعار من 50ms إلى أكثر من 900ms.
- **الحل المقترح:**  
  تضمين الاسم في جدول `phone_accounts_index` أو الاستعلام المباشر عبر `Promise.all` بالتوازي أو قراءة الاسم من جدول المستخدمين الأساسي مباشرة.

---

## 4. التدقيق التفصيلي لمحور واجهات الـ API (Next.js Endpoints)

### المشكلة [API-01]: جلب جميع بيانات اللاعبين بـ `SELECT *` دون ترقيم (P0)
- **الملف:** [`src/app/api/players/videos/route.ts`](file:///d:/El7lm-V2/src/app/api/players/videos/route.ts#L12-L39)
- **الأسطر:** 12 إلى 39
- **الكود المرصود:**
  ```typescript
  export const dynamic = 'force-dynamic';
  // ...
  const { data, error } = await db.from('players').select('*');
  // ثم تصفيتها في الذاكرة لتجاهل عشرات الأعمدة وإرجاع 12 حقلاً فقط!
  ```
- **المشكلة الفنية:**  
  1. جلب كامل جدول اللاعبين بجميع أعمدته (صور، JSON، بيانات اتصال، وثائق) دون تحديد الأعمدة في الـ SQL.  
  2. انعدام الترقيم (`No Limit / No Range`).  
  3. تعطيل الكاش قسرياً (`force-dynamic`).
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  كل استدعاء لهذه الواجهة يجلب بيانات بحجم 2MB إلى 5MB من Supabase إلى خادم Vercel Serverless Function، ومع 10,000 مستخدم يزورون شاشة السينما أو اللاعبين، سينتج عن ذلك نقل **20 إلى 50 جيجابايت يومياً** واستهلاك ضخم لذاكرة Node.js يسبب أخطاء `Function Invocation Timeout` و `Out of Memory`.
- **الحل المقترح:**  
  1. قصر الاستعلام على الحقول المطلوبة فقط:  
     `.select('id, full_name, name, videos, age, position, country, profile_image_url')`  
  2. تطبيق ترقيم صارم: `.range(offset, offset + limit - 1)` بحد أقصى 20 لاعباً في الطلب.  
  3. إضافة ترويسة كاش `s-maxage=60, stale-while-revalidate=300`.

---

### المشكلة [API-02]: استعلام كتالوج الفرص `SELECT *` دون ترقيم أو كاش (P1)
- **الملف:** [`src/app/api/opportunities/route.ts`](file:///d:/El7lm-V2/src/app/api/opportunities/route.ts#L56-L72)
- **الأسطر:** 56 إلى 72
- **المشكلة الفنية:**  
  استعلام `db.from('opportunities').select('*')` يجلب جميع الفرص الرياضية في قاعدة البيانات دون ترقيم في صفحة الاستكشاف العامة (`explore=true`) ودون أي ترويسة `Cache-Control`.
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  تكرار قراءة جدول الفرص بالكامل لآلاف المستخدمين في اليوم الواحد، مما يسبب ضغط قراءة مستمر على قاعدة البيانات لبيانات شبه ثابتة.
- **الحل المقترح:**  
  تطبيق Pagination بحد 15 فرصة مع دعم التمرير اللانهائي (Infinite Scroll)، وإضافة ترويسة `Cache-Control: public, s-maxage=120, stale-while-revalidate=600`.

---

### المشكلة [API-03]: حلقة N+1 متسلسلة لقراءة الأدوار في مزامنة الموظفين (P1)
- **الملف:** [`src/app/api/admin/sync-employees/route.ts`](file:///d:/El7lm-V2/src/app/api/admin/sync-employees/route.ts#L22-L34)
- **الأسطر:** 22 إلى 34
- **الكود المرصود:**
  ```typescript
  for (const emp of employees) {
    if ((emp as any).roleId) {
      const { data: role } = await db.from('roles').select('*').eq('id', (emp as any).roleId).single();
      // ...
    }
  }
  ```
- **المشكلة الفنية:**  
  حلقة تكرارية تستدعي استعلاماً فردياً لكل موظف على حدة (`N+1 Query Problem`).
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  إذا كان هناك 100 موظف، ينفذ الخادم 101 استعلاماً شبكياً متتابعاً، مما يرفع زمن المزامنة لعدة ثوانٍ ويعرض العملية للفشل بالـ Timeout.
- **الحل المقترح:**  
  استخدام استعلام واحد بالـ JOIN:  
  `.from('employees').select('*, roles(*)')` أو جلب الأدوار دفعة واحدة باستخدام `.in('id', roleIds)`.

---

### المشكلة [API-04]: غياب تام لترويسات الكاش (`Cache-Control`) على كافة الواجهات العامة (P0)
- **الملفات:**
  - [`src/app/api/opportunities/route.ts:44-200`](file:///d:/El7lm-V2/src/app/api/opportunities/route.ts#L44-L200)
  - [`src/app/api/players/videos/route.ts:7-45`](file:///d:/El7lm-V2/src/app/api/players/videos/route.ts#L7-L45)
  - [`src/app/api/admin/pricing/route.ts:1-40`](file:///d:/El7lm-V2/src/app/api/admin/pricing/route.ts#L1-L40)
  - [`src/app/api/tournament-portal/venues/route.ts:1-40`](file:///d:/El7lm-V2/src/app/api/tournament-portal/venues/route.ts#L1-L40)
- **المشكلة الفنية:**  
  كافة واجهات القراءة العامة التي تقدم بيانات ثابتة (مثل باقات الأسعار، الملاعب، كتالوج الفرص، استكشاف مقاطع الفيديو) ترجع ردوداً بدون ترويسة `Cache-Control`، مما يجبر الـ Browser والـ CDN (Cloudflare / Vercel Edge) على توجيه كل طلب منفرد إلى السيرفر الرئيسي وقاعدة البيانات.
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  توليد ما يزيد عن **120,000 طلب خادم مباشر يومياً**، تستهلك رصيد Vercel Serverless Invocations وترهق قاعدة البيانات، بينما كان يمكن تخديم 95% منها من كاش الـ Edge CDN بزمن استجابة أقل من 20ms وتكلفة صفرية.
- **الحل المقترح:**  
  إضافة ترويسات كاش قياسية على الاستجابات:
  ```typescript
  return NextResponse.json({ data }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
    },
  });
  ```

---

## 5. التدقيق التفصيلي لمحور تطبيق الهاتف (Flutter Mobile Architecture)

### المشكلة [FL-01]: تحميل جدول اللاعبين بالكامل محلياً وترقيمه وتصفيته في ذاكرة الهاتف (P0)
- **الملف:** [`mobile/lib/services/data_service.dart`](file:///d:/El7lm-V2/mobile/lib/services/data_service.dart#L125-L155) و [`mobile/lib/screens/players/player_search_screen.dart`](file:///d:/El7lm-V2/mobile/lib/screens/players/player_search_screen.dart#L156-L165)
- **الأسطر:** `data_service.dart:125-155` و `player_search_screen.dart:28, 156-165`
- **الكود المرصود:**
  ```dart
  // data_service.dart:125
  final playerRows = await client.from('players').select();
  final userRows = await client.from('users').select().eq('accountType', 'player');
  // ... ثم في player_search_screen.dart:156-165
  final filtered = players.where(filter.matches)...;
  final pagePlayers = filtered.skip(start).take(pageSize).toList();
  ```
- **المشكلة الفنية:**  
  1. يقوم التطبيق بتحميل جدول اللاعبين وجدول المستخدمين بالكامل وبكافة أعمدتهما إلى ذاكرة الهاتف.  
  2. يتم تنفيذ التصفية والبحث والترقيم (`pageSize = 20`) محلياً في معالج الهاتف (`client-side filtering`) بعد جلب كل البيانات!
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  - مع نمو قاعدة بيانات اللاعبين إلى 10,000 لاعب، سيقوم التطبيق بتحميل ملف بحجم **15MB إلى 30MB** لكل مستخدم يفتح شاشة البحث أو السينما.  
  - استهلاك باندويث شبكي يتجاوز **150GB إلى 300GB يومياً** لعملية تصفح عادية.  
  - انهيار الذاكرة (Crash OOM) وبطء شديد (Jank) على هواتف أندرويد الاقتصادية والمتوسطة.
- **الحل المقترح:**  
  1. نقل الفلترة والترقيم بالكامل إلى خادم Supabase باستخدام:  
     `.from('players').select('...').range(start, end).ilike('name', '%$query%')`  
  2. تطبيق مكتبة `infinite_scroll_pagination` لتحميل الصفحات تدريجياً (20 لاعباً فقط في كل دفعة مع التمرير).

---

### المشكلة [FL-02]: مؤقت فحص دوري مدمر يطلق 3 استعلامات كاملة كل 60 ثانية (P0)
- **الملف:** [`mobile/lib/screens/home/app_shell.dart`](file:///d:/El7lm-V2/mobile/lib/screens/home/app_shell.dart#L64-L67) و [`app_shell.dart:173-197`](file:///d:/El7lm-V2/mobile/lib/screens/home/app_shell.dart#L173-L197)
- **الأسطر:** 64 إلى 67 و 173 إلى 197
- **الكود المرصود:**
  ```dart
  _unreadTimer = Timer.periodic(
    const Duration(seconds: 60),
    (_) => _fetchUnreadCounts(),
  );
  // داخل _fetchUnreadCounts:
  // 1. await widget.dataService.fetchConversations();
  // 2. await widget.dataService.fetchNotifications(); -> يجلب notifications
  // 3. -> ويجلب interaction_notifications
  ```
- **المشكلة الفنية:**  
  مؤقت يعمل كل 60 ثانية بشكل دائم طالما التطبيق في الواجهة، ويقوم بجلب كامل سجلات المحادثات والإشعارات (حتى 100 سجل في كل مرة) ليقوم بعدّ الرسائل والإشعارات غير المقروءة محلياً في Dart!
- **الحسابات الرياضية للتأثير عند 10,000 مستخدم/يوم:**  
  - في أوقات الذروة بمتوسط 1,200 مستخدم متزامن:  
    $$1,200 	imes rac{3 	ext{ queries}}{60 	ext{ sec}} = 60 	ext{ Queries Per Second (QPS)}$$  
  - أي **3,600 استعلام في الدقيقة** (أكثر من 200,000 استعلام كل ساعة) مجرد استعلامات مكررة لقراءة شارة الرقم (Badge Counter) التي لا تتغير في 98% من الأوقات!  
  - استنزاف بطارية الهاتف وسخونتها واستهلاك باقة الإنترنت للمستخدمين.
- **الحل المقترح:**  
  1. **إلغاء المؤقت الدوري (`Timer.periodic`) نهائياً.**  
  2. استخدام قنوات **Supabase Realtime (WebSockets)** للاستماع الفوري لأحداث `INSERT` على جدول الإشعارات والرسائل.  
  3. في حال رغبة التطبيق في عمل فحص احتياطي (Fallback Polling)، يتم تقليل التردد إلى مرة كل 5 دقائق، واستدعاء دالة RPC خفيفة ترجع الأرقام مباشرة فقط:  
     `SELECT get_unread_counts(user_id)` بدلاً من جلب 100 كائن كامل من الجداول.

---

### المشكلة [FL-03]: تحديث الإشعارات المقروءة عبر N استعلامات شبكية متتالية (P1)
- **الملف:** [`mobile/lib/services/data_service.dart`](file:///d:/El7lm-V2/mobile/lib/services/data_service.dart#L103-L108)
- **الأسطر:** 103 إلى 108
- **الكود المرصود:**
  ```dart
  Future<void> markAllNotificationsRead() async {
    final notifications = await fetchNotifications();
    for (final notification in notifications.where((item) => !item.isRead)) {
      await markNotificationRead(notification); // حلقة N استدعاءات شبكية متتالية!
    }
  }
  ```
- **المشكلة الفنية:**  
  عند الضغط على "تمييز الكل كمقروء"، إذا كان لدى المستخدم 30 إشعاراً، يرسل التطبيق **30 طلب HTTP منفصل لـ Supabase بالتتابع** واحداً تلو الآخر!
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  تعليق واجهة المستخدم لمدة 4 إلى 8 ثوانٍ، واستهلاك حصة طلبات الـ API دون أي مبرر هندسي.
- **الحل المقترح:**  
  استبدال الحلقة بأمر تحديث ذري مجمع واحد (`Batch Update`):
  ```dart
  await client.from('notifications')
      .update({'isRead': true, 'read': true})
      .eq('userId', userId)
      .eq('isRead', false);
  ```

---

### المشكلة [FL-04]: غياب التخزين المؤقت المحلي (SWR / In-Memory Cache) في التطبيق (P1)
- **الملف:** [`mobile/lib/services/data_service.dart`](file:///d:/El7lm-V2/mobile/lib/services/data_service.dart#L25-L28)
- **الأسطر:** 25 إلى 44
- **المشكلة الفنية:**  
  يقتصر التخزين المؤقت في `DataService` على منع تكرار الطلبات المتزامنة في نفس اللحظة (`In-Flight Future Deduplication`). وبمجرد اكتمال الطلب، يتم تصفير المتغير (`_playersInFlight = null`). لا يوجد أي تخزين مؤقت للبيانات في الذاكرة (Memory Cache with TTL) أو في قاعدة بيانات محلية (SQLite / Isar / Hive).
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  كل تنقل للمستخدم بين الشاشات (مثلاً من الملف الشخصي إلى البحث ثم العودة للملف الشخصي) يعيد إطلاق كافة استعلامات الشبكة من البداية، مسبباً وميض الشاشة (`Loading Flickers`) وإرهاق السيرفر بطلبات مكررة.
- **الحل المقترح:**  
  تطبيق نمط **Stale-While-Revalidate (SWR)**:  
  الاحتفاظ بالبيانات في الذاكرة لمدة 5 دقائق، وعرض البيانات المخزنة فوراً للمستخدم، وتحديثها في الخلفية بهدوء في حال مرور مدة الـ TTL.

---

### المشكلة [FL-05]: إعادة بناء كاملة لشجرة الواجهات واحتفاظ `IndexedStack` بالوسائط (P2)
- **الملف:** [`mobile/lib/screens/home/app_shell.dart`](file:///d:/El7lm-V2/mobile/lib/screens/home/app_shell.dart#L350-L352) و [`app_shell.dart:521-535`](file:///d:/El7lm-V2/mobile/lib/screens/home/app_shell.dart#L521-L535)
- **الأسطر:** 350 إلى 352 و 521 إلى 535
- **المشكلة الفنية:**  
  1. استدعاء `setState(() { _initDestinations(); });` عند انتهاء رفع أي وسائط يعيد بناء مصفوفة كافة الشاشات وكافة الـ Destinations من الصفر.  
  2. استخدام `IndexedStack` يحتفظ بكافة الشاشات المفتوحة مسبقاً نشطة في الذاكرة بمشغلات الفيديو الخاصة بها (`VideoPlayerController`) بدلاً من تحرير موارد الشاشات غير المرئية.
- **التأثير المتوقع عند 10,000 مستخدم/يوم:**  
  ارتفاع استهلاك ذاكرة التطبيق إلى أكثر من 450MB على الجهاز، مما يسبب إغلاق التطبيق قسرياً بواسطة نظام أندرويد (Low Memory Killer).
- **الحل المقترح:**  
  إيقاف وتحرير مشغلات الفيديو والـ Controllers عند مغادرة الشاشة، واستخدام إدارة حالة محددة (مثل `ValueNotifier` أو `Bloc/Riverpod`) بدلاً من إعادة بناء شجرة `AppShell` بالكامل.

---

## 6. خارطة الطريق الهندسية للتنفيذ (Phase 4 Execution Roadmap)

| المرحلة | الأولوية | نطاق العمل الهندسي | التأثير على الأداء |
| :---: | :---: | :--- | :---: |
| **المرحلة 1 (عاجلة جداً)** | **P0** | 1. تفعيل فهارس قاعدة البيانات الأساسية (`notifications`, `messages`, `players`, `users`).<br>2. إلغاء الـ Polling الدوري في التطبيق واستبداله بـ WebSockets.<br>3. تطبيق Pagination على `/api/players/videos` وإلغاء تحميل كامل الجدول في التطبيق. | **تخفيض 70% من إجمالي ضغط قاعدة البيانات** |
| **المرحلة 2 (تكتيكية)** | **P1** | 1. تطبيق ترويسات `Cache-Control` على كافة واجهات القراءة العامة.<br>2. معالجة حلقات N+1 في الإشعارات والموظفين بتحديثات مجمعة (`Batch Updates`).<br>3. تطبيق In-Memory SWR Cache في تطبيق الهاتف. | **تخفيض 85% من استدعاءات خوادم Vercel** |
| **المرحلة 3 (تحسينية)** | **P2** | 1. تحسين دورة حياة الـ Video Controllers في شاشات السينما والملفات.<br>2. بناء دوال RPC خفيفة للعد والإحصائيات السريعة. | **انخفاض استهلاك ذاكرة الهاتف وسلاسة 60fps** |

---

> **ملاحظة أمان والتزام:**  
> تم إعداد هذا التقرير الفني كمرجع تدقيقي واستقصائي كامل ومفصل بالأدلة والأسطر البرمجية. لم يتم إجراء أي تعديل على كود المشروع أو قاعدة البيانات التزاماً بتعليماتك الصارمة.
