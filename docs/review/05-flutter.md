# المرحلة 5 — مراجعة تطبيق الهاتف (Flutter Review) (المُراجَعة والمُصحَّحة)

**تاريخ المراجعة:** 2026-09-24  
**وضع المراجعة:** قراءة وفحص كود Flutter في `mobile/lib`  
**حالة الملف:** مُصحَّح ومدعوم بأرقام الأسطر والمسارات البرمجية  

---

## 1. شاشة تسجيل الدخول والمصادقة (Login Flow)

**المصادر:** `mobile/lib/screens/auth/phone_auth_screen.dart` و `mobile/lib/screens/auth/otp_screen.dart`

### الطلبات المتكررة ومنع الضغط المزدوج (Debounce & Double-Tap):
- **حقل الهاتف:** لا يطلق أي استعلامات شبكية أو بحث متكرر أثناء الكتابة؛ يتم استدعاء الشبكة فقط عند الضغط على زر الإرسال `submit()` في السطر 195 [مؤكد بالكود].
- **الحماية من الضغط المزدوج:**
  ```dart
  // phone_auth_screen.dart:412-413
  FilledButton.icon(
    onPressed: loading ? null : submit,
  )
  ```
  الزر يعطل فوراً أثناء `loading = true` ويمنع تكرار الطلبات المتوازية لنفس الرقم [مؤكد بالكود].
- **المهل الزمنية (Timeout) وإعادة المحاولة (Retry):**
  - ملف `api_client.dart` ينفذ الطلبات المباشرة بمهلة اتصال قياسية ولكن دون وجود آلية إعادة محاولة ذكية (Exponential Backoff)؛ عند حدوث خطأ شبكي يرمي `ApiException` فوراً للمستخدم.

---

## 2. شاشة لوحة التحكم (Dashboard Screen) وتسلسل التحميل

**المصدر:** `mobile/lib/screens/home/app_shell.dart:45-67`

```dart
@override
void initState() {
  super.initState();
  _initDestinations();

  // الطلب الأولي للإشعارات والمحادثات بعد ثانيتين
  _initialUnreadTimer = Timer(const Duration(seconds: 2), () {
    if (mounted) _fetchUnreadCounts();
  });

  // التحقق من اكتمال الملف الشخصي بعد اكتمال أول إطار
  WidgetsBinding.instance.addPostFrameCallback((_) {
    _ensureProfileCompletionReminder();
  });

  // فحص دوري دائم كل 60 ثانية
  _unreadTimer = Timer.periodic(
    const Duration(seconds: 60),
    (_) => _fetchUnreadCounts(),
  );
}
```

### عدد استدعاءات الـ APIs عند الفتح وسلوك الـ Tabs:
- **عند الفتح:**
  1. تبويب البداية يتم تحميله فوراً (`_loadedTabs = {0}`).
  2. يتم استدعاء `_ensureProfileCompletionReminder` لجلب الملف الشخصي (`fetchProfile`).
  3. بعد مرور ثانيتين، يستدعي `_fetchUnreadCounts` عمليتين: `fetchConversations()` و `fetchNotifications()` (وهما 3 استعلامات لـ Supabase).
- **تبديل الـ Tabs (Tab Switching):**
  - يستخدم التطبيق أسلوب التحميل الكسول (Lazy Load) بإضافة التبويب لمجموعة `_loadedTabs` عند زيارته لأول مرة.
  - لا يتم تحميل كل التبويبات معاً في البداية [مؤكد بالكود].
- **إدارة الذاكرة والتخزين المؤقت (In-Flight vs In-Memory Cache):**
  - في `data_service.dart:25-28` توجد آلية Deduplication لمنع تكرار الطلبات المتطابقة المتزامنة (`_notificationsInFlight`, `_playersInFlight`).
  - **نقطة الضعف:** بمجرد اكتمال الـ Future بنجاح، يتم تصفير المتغير، ولا يوجد أي In-Memory Cache أو Local Cache للاحتفاظ بالبيانات؛ أي تنقل أو إعادة طلب لاحقة ستعيد الاستعلام بالكامل من الشبكة.

---

## 3. جدول الوصول المباشر لقاعدة بيانات Supabase (Direct Supabase Access)

يقوم التطبيق بالوصول المباشر لقاعدة بيانات Supabase عبر مكتبة `supabase_flutter` في ملف `mobile/lib/services/data_service.dart`:

| الملف | الجدول المستهدف | العملية البرمجية | هل يتطلب جلسة موثقة (Auth Session)؟ | السطر البرمجي | المخاطر والتقييم |
|-------|-----------------|------------------|------------------------------------|---------------|-------------------|
| `data_service.dart` | `notifications` | `SELECT` | نعم (`_auth.legacyUserId`) | L58-63 | استعلام مباشر لجدول الإشعارات بحد 100 سجل |
| `data_service.dart` | `interaction_notifications` | `SELECT` | نعم | L58-63 | مصدر إشعارات تفاعلية ثانوي |
| `data_service.dart` | `notifications` | `UPDATE` (N+1) | نعم | L95-100 | تحديث كل إشعار منفرداً عند تمييز الكل كمقروء |
| `data_service.dart` | `players` | `SELECT *` | نعم (`_auth.hasSession`) | L125 | كارثي: يجلب كامل جدول اللاعبين بجميع الأعمدة |
| `data_service.dart` | `users` | `SELECT` | نعم | L129 | يجلب مستخدمي نوع 'player' لدمجهم محلياً |
| `data_service.dart` | `player_favorites` | `SELECT` / `INSERT` / `DELETE` | نعم | L242, L264 | إدارة اللاعبين المفضلين |
| `data_service.dart` | `users` | `SELECT` / `UPDATE` | نعم | L398, L524 | قراءة وتحديث بيانات الحساب الأساسية |
| `data_service.dart` | `player_join_requests` | `SELECT` / `INSERT` | نعم | L674, L1249 | طلبات الانضمام للأكاديميات والأندية |
| `data_service.dart` | `organization_referrals` | `SELECT` / `INSERT` / `DELETE` | نعم | L843, L864, L1264 | إحالات المؤسسات الرياضية |
| `data_service.dart` | `conversations` | `SELECT` / `INSERT` | نعم | L1436, L1472 | قراءة وإنشاء المحادثات |
| `data_service.dart` | `messages` | `SELECT` / `INSERT` | نعم | L1535, L1601 | قراءة وإرسال رسائل الدردشة |
| `data_service.dart` | `documents` | `SELECT` | نعم | L1639 | قراءة مستندات اللاعبين والتحقق |

**الخطر الأمني والتشغيلي:**
- هذا الكم الضخم من الوصول المباشر يعتمد 100% على صحة ووجود سياسات RLS في قاعدة البيانات. وبما أن `schema.sql` خالية من تفعيل RLS، فإن أي مستخدم يسجل الدخول يمكنه كتابة أو قراءة بيانات الجداول الأخرى بحرية عبر الـ API المباشر إن لم تكن هناك سياسات مفعلة على السيرفر الحي.

---

## 4. استهلاك الموارد ومخاطر الـ Polling الدوري

- في `app_shell.dart:64-67`، يتم تشغيل مؤقت دوري كل 60 ثانية:
  ```dart
  _unreadTimer = Timer.periodic(const Duration(seconds: 60), (_) => _fetchUnreadCounts());
  ```
- هذا المؤقت يطلق **3 استعلامات قاعدة بيانات** كل دقيقة لكل مستخدم نشط.
- **الحل:**
  1. رفع الفاصل الزمني إلى 3-5 دقائق عند خمول المستخدم.
  2. استبدال الـ Polling بـ Supabase Realtime Channels للاستماع لجديد الإشعارات والمحادثات فورياً.
