# المرحلة 4 — مراجعة واجهات برمجة التطبيقات (API Review) (المُراجَعة والمُصحَّحة)

**تاريخ المراجعة:** 2026-09-24  
**وضع المراجعة:** قراءة وفحص كود الـ API ومسارات Next.js  
**حالة الملف:** مُصحَّح ومدعوم بالأدلة من مسارات `src/app/api/`  

---

## 1. جدول تدقيق الأمان والمصادقة للواجهات الحساسة (API Audit Matrix)

| Route | Authentication (المصادقة) | Authorization / Ownership | Database Access Client | Risk (مستوى الخطورة) | الدليل البرمجي والسطر |
|-------|--------------------------|---------------------------|------------------------|---------------------|-----------------------|
| `/api/upload/video` | **معدومة** | لا يوجد أي تحقق من المالك | Service Role (غير مباشر) | **حرجة جداً** | `src/app/api/upload/video/route.ts:25-39`: دالة `getAuthUser` معرفة ولكن **لم يتم استدعاؤها نهائياً** في الـ POST Handler! أي شخص يرفع فيديوهات لمساحة التخزين مباشرة. |
| `/api/media/delete` | موجودة (`authorizeUser`) | فحص جزئي (يتأكد من وجود المستخدم) | Service Role | متوسطة | `media/delete/route.ts:16-30`: يستدعي `authorizeUser` ويحصل على `user.id`. يحذف من Cloudflare R2 وقاعدة البيانات. |
| `/api/media/list-r2` | موجودة (`authorizeUser`) | يرجع قائمة الوسائط للمستخدم | Service Role | منخفضة | `media/list-r2/route.ts:10-25`: محمي بالتوكن. |
| `/api/media/proxy-video` | **معدومة** | لا يوجد | لا يوجد (Proxy مباشر) | متوسطة | `media/proxy-video/route.ts:1-25`: تدفق مباشر للوسائط دون أي تحقق من جلسة أو ملكية، مما يسمح باستهلاك الباندويث كبروكسي عام. |
| `/api/media/analyze-video` | **معدومة** | لا يوجد | Service Role | **حرجة** | `media/analyze-video/route.ts`: يمكن لأي طرف استدعاء معالجة واستهلاك موارد السيرفر دون توثيق. |
| `/api/media/tiktok-thumb` | **معدومة** | لا يوجد | لا يوجد | منخفضة | `media/tiktok-thumb/route.ts`: أداة جلب صورة مصغرة عامة. |
| `/api/notifications/dispatch` | موجودة (`authorizeUser`) | صلاحيات المشرف أو المستخدم | Service Role | متوسطة | `notifications/dispatch/route.ts:156`: يتحقق من التوكن، لكن ينفذ 6 استعلامات متتابعة لجلب الاسم. |
| `/api/notifications/subscribe` | موجودة جزئياً | لا يوجد فحص ملكية صارم | Service Role | متوسطة | `notifications/subscribe/route.ts`: يسجل FCM Token. |
| `/api/admin/*` | تعتمد على مفتاح السر/Session | فحص دور الأدمن | Service Role | عالية | مسارات الإدارة تستخدم الـ Service Role ويجب التأكد من عزل مساراتها عبر Middleware موحد. |
| `/api/players/videos` | **معدومة** | لا يوجد | Service Role (`select('*')`) | عالية | `players/videos/route.ts:13`: يجلب جميع بيانات اللاعبين دفعة واحدة دون توثيق ودون Pagination. |
| `/api/otp/send` | عام (بدون جلسة مسبقة) | Rate Limit بالهاتف فقط | Service Role | عالية | `otp/send/route.ts`: يطلق 27 استعلاماً متوازياً ويستدعي ChatAman خارجياً. يفتقر لـ IP Rate Limiting. |
| `/api/auth/verify-otp-and-check` | عام برمز OTP | تحقق من تطابق الرمز | Service Role | عالية | `verify-otp-and-check/route.ts:46-74`: حلقة تكرارية مهدرة متبوعة بـ 27 استعلاماً متوازياً. |

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

## 5. توصيات الإصلاح العاجلة

1. **إغلاق ثغرة رفع الفيديو فوراً:**
   - تفعيل استدعاء `authorizeUser` داخل دالة `POST` في `src/app/api/upload/video/route.ts` والتأكد من تطابق `user.id` مع الحساب المرفوع له، ورفض أي طلب لا يحمل توكن مصادقة صالح.
2. **تأمين مسار تحليل الفيديو `media/analyze-video` و `proxy-video`:**
   - فرض التحقق من هوية الطالب وإلزام وجود توقيع صالح للوسائط (Signed URLs).
3. **تصحيح استعلام تحديث الإشعارات (Batch Update):**
   - تعديل دالة `markAllNotificationsRead` في Flutter لتنفذ أمراً واحداً.
4. **تطبيق Pagination على `/api/players/videos`:**
   - قصر التحديد على الأعمدة المعروضة فقط (`.select('id, full_name, profile_image_url, ...')`) مع وضع حد أعلى 20-50 لاعباً في الطلب مع إمكانية التمرير (Infinite Scrolling).
