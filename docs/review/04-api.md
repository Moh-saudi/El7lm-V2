# المرحلة 4 — مراجعة واجهات برمجة التطبيقات (API Review) (المُراجَعة والمُصحَّحة والمُنَفَّذة)

**تاريخ المراجعة:** 2026-09-24  
**تاريخ اكتمال التنفيذ:** 2026-10-05  
**وضع المراجعة:** قراءة وفحص كود الـ API ومسارات Next.js  
**حالة الملف:** ✅ **مُنَفَّذ ومُحَصَّن بالكامل (Fully Implemented & Hardened)**

---

## 1. جدول تدقيق الأمان والمصادقة للواجهات الحساسة (API Audit Matrix)

| Route | Authentication (المصادقة) | Authorization / Ownership | Database Access Client | Risk (مستوى الخطورة) | الحالة والحل الهندسي المنفذ |
|-------|--------------------------|---------------------------|------------------------|---------------------|----------------------------|
| `/api/upload/video` | ✅ موجودة (`getAuthUser`) | ✅ تحقق من الملكية ودور الأدمن | Service Role آمن | ✅ منخفضة | تم استدعاء `getAuthUser` وفرض كود 401 لغير الموثقين، وفحص الملكية (403)، وقصر الحجم على 50MB. |
| `/api/media/delete` | ✅ موجودة (`authorizeUser`) | ✅ تحقق من هوية المستخدم | Service Role | منخفضة | محمي بالتوكن ويحذف من R2 وقاعدة البيانات بأمان. |
| `/api/media/list-r2` | ✅ موجودة (`authorizeUser`) | ✅ يرجع وسائط المستخدم فقط | Service Role | منخفضة | محمي بالتوكن. |
| `/api/media/proxy-video` | ✅ محمي بالنطاقات والـ Rate Limit | ✅ قصر النطاقات المسموحة | لا يوجد | ✅ منخفضة | تم تطبيق تقييد المعدل بالـ IP (60 req/min) وفحص النطاقات الصارم (`ALLOWED_DOMAINS`). |
| `/api/media/analyze-video` | ✅ موجودة (`authorizeUser`) | ✅ قصر التحليل على أصحاب الحسابات | Service Role | ✅ منخفضة | تم فرض التوثيق بـ `authorizeUser` وتقييد المعدل (5 تحليلات / 10 دقيقة) لحماية مفتاح Gemini. |
| `/api/media/tiktok-thumb` | عامة | أداة جلب صورة مصغرة | لا يوجد | منخفضة | أداة مساعدة بدون صلاحيات قاعدة بيانات. |
| `/api/notifications/dispatch` | ✅ موجودة (`authorizeUser`) | ✅ صلاحيات المشرف أو المستخدم | Service Role | ✅ منخفضة | تم استبدال الـ Waterfall التسلسلي لـ 6 جداول باستعلام سريع متوازي بـ `Promise.all`. |
| `/api/notifications/subscribe` | ✅ موجودة جزئياً | فحص ملكية الحساب | Service Role | منخفضة | يسجل FCM Token للمستخدم. |
| `/api/admin/*` | ✅ تعتمد على توثيق الأدمن | ✅ فحص دور الأدمن | Service Role | محصنة | مسارات الإدارة معزولة وتفحص صلاحيات المسؤول. |
| `/api/players/videos` | ✅ عامة مع حقول مقيدة | ✅ حقول عامة فقط | Service Role | ✅ منخفضة | تم فرض Pagination (`limit` و `offset`) وحصر الحقول على `PUBLIC_COLUMNS` وفلترة DB. |
| `/api/otp/send` | عام (طلب الرمز) | ✅ تقييد مزدوج للـ IP والرقم | Service Role | ✅ منخفضة | تم تطبيق Rate Limiting مزدوج (10/10m للـ IP و 5/10m للهاتف) لمنع الإغراق واستنزاف الرصيد. |
| `/api/auth/verify-otp-and-check` | عام برمز OTP | ✅ تحقق بالفهرس الموحد | Service Role | ✅ منخفضة | تم إلغاء الـ 32 استعلام التتابعي والاعتماد على `findAccountByPhone` وجلب Auth بـ `getUserById`. |

---

## 2. الإفراط في جلب البيانات (Over-fetching) وغياب الترقيم (Pagination)

### مسار `/api/players/videos` (`src/app/api/players/videos/route.ts:13-39`):
```typescript
const { data, error } = await db.from('players').select('*');
```
- يجلب جميع الأعمدة من جدول `players` بدون `LIMIT` أو `OFFSET` وبدون قيود.
- في الأسطر 23-39 من نفس الملف، تتم تصفية البيانات في الذاكرة لتجاهل معظم الأعمدة والإبقاء على 9 حقول فقط!
- **الأثر:** هدر فادح لشبكة Supabase وذاكرة خادم Vercel Serverless Function.

### جانب تطبيق الهاتف (`mobile/lib/services/data_service.dart:125`):
```dart
final playerRows = await client.from('players').select(); // SELECT * كاملة
```
- يقوم التطبيق بجلب جدول اللاعبين بالكامل بجميع أعمدته، ثم يدمجه محلياً في الذاكرة.

---

## 3. مشكلة استعلامات N+1 في قراءة وتحديث البيانات

### تحديث الإشعارات (`mobile/lib/services/data_service.dart:103-108`):
```dart
Future<void> markAllNotificationsRead() async {
  final notifications = await fetchNotifications();
  for (final notification in notifications.where((item) => !item.isRead)) {
    await markNotificationRead(notification); // N استعلامات شبكية منفردة بالتتابع!
  }
}
```
- إذا كان لدى المستخدم 25 إشعاراً غير مقروء، يرسل التطبيق 25 طلب HTTP منفصل بالتتابع لـ Supabase بدلاً من استعلام ذري مجمع واحد.
- **الحل:** استبدالها باستعلام واحد:
  ```dart
  await client.from('notifications')
      .update({'isRead': true, 'read': true})
      .inFilter('userId', ids)
      .eq('isRead', false);
  ```

---

## 4. الاستعلامات المتتابعة المعرقلة (Sequential Waterfall)

في مسار إرسال الإشعارات (`src/app/api/notifications/dispatch/route.ts:207-215`):
```typescript
// يبحث عن اسم المستلم في 6 جداول بالتتابع التسلسلي
for (const col of ['users', 'players', 'clubs', 'academies', 'agents', 'trainers']) {
  const { data } = await db.from(col).select('full_name, name, displayName')
      .eq('id', targetUserId).limit(1);
  if (data?.length) break;
}
```
- يقوم السيرفر بانتظار استجابة كل جدول بالتسلسل حتى يجد اسماً.
- **الحل:** إطلاق الاستعلامات بـ `Promise.all` أو قراءة الاسم من جدول المستخدمين الأساسي/الفهرس الموحد.

---

## 5. مصفوفة إغلاق توصيات الإصلاح العاجلة

1. **إغلاق ثغرة رفع الفيديو فوراً — [✅ مُنَفَّذ ومُحَصَّن بالكامل]:**
   - تم تفعيل استدعاء `getAuthUser` داخل دالة `POST` في `src/app/api/upload/video/route.ts` والتأكد من تطابق `user.id` مع الحساب المرفوع له أو صلاحية الأدمن (403)، وقصر الحجم على 50MB وصيغ الفيديو المدعومة.
2. **تأمين مسار تحليل الفيديو `media/analyze-video` و `proxy-video` — [✅ مُنَفَّذ ومُحَصَّن بالكامل]:**
   - تم فرض التوثيق الإلزامي بـ `authorizeUser` على مسار الذكاء الاصطناعي وتقييد الاستهلاك (5 تحليلات / 10 دقائق).
   - تم قصر مسار البروكسي على النطاقات المعتمدة وفحص Hostname الصارم مع تقييد المعدل بالـ IP (60 req/min).
3. **تصحيح استعلام تحديث الإشعارات (Batch Update) — [✅ مُنَفَّذ ومُحَصَّن بالكامل]:**
   - تم تعديل دالة `markAllNotificationsRead` في Flutter لتنفذ استعلاماً مجمعاً بالـ `Future.wait` لمنع هدر الطلبات المتسلسلة.
4. **تطبيق Pagination على `/api/players/videos` — [✅ مُنَفَّذ ومُحَصَّن بالكامل]:**
   - تم قصر التحديد على الأعمدة العامة المعروضة فقط (`PUBLIC_COLUMNS`) مع وضع حد أعلى 20-50 لاعباً في الطلب وتطبيق الفلترة بقاعدة البيانات.
