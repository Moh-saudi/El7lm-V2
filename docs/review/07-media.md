# المرحلة 7 — مراجعة الوسائط وتخزين Cloudflare R2 (المُراجَعة والمُصحَّحة والمُنَفَّذة)

**تاريخ المراجعة:** 2026-09-24  
**تاريخ اكتمال التنفيذ:** 2026-10-05  
**وضع المراجعة:** قراءة وفحص كود معالجة ورفع الوسائط  
**حالة الملف:** ✅ **مُنَفَّذ ومُحَصَّن بالكامل (Fully Implemented & Hardened)**

---

## 1. فحص مسار رفع الفيديو `/api/upload/video`

**المصدر المباشر:** `src/app/api/upload/video/route.ts:25-90`

```typescript
// الأسطر 25-35: دالة المصادقة معرفة
async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// السطر 39: دالة الرفع الأساسية
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    // ... لا استدعاء إطلاقاً لـ getAuthUser!
```

### تدقيق متطلبات الأمان والمصادقة:
1. **هل يتطلب مصادقة (Authentication)؟**
   - **لا [مؤكد بالكود]:** على الرغم من وجود دالة `getAuthUser` في الأسطر 25-35، إلا أنها **لا تُستدعى مطلقاً** في مسار الـ POST. المسار مفتوح للعموم بلا أي توثيق.
2. **هل يوجد تحقق من الملكية (Ownership Validation)؟**
   - **لا [مؤكد بالكود]:** يتم استخراج `userId` و `ownerId` مباشرة من بيانات النموذج المرفوع (`formData`)، مما يتيح لأي شخص رفع وسائط منسوبة لأي لاعب أو نادي بمجرد إرسال معرّفه.
3. **هل يوجد تحقق من حجم الملف (File Size Validation)؟**
   - **لا في Route [مؤكد بالكود]:** لا يوجد أي فحص لقيمة `file.size` قبل توجيه الملف لـ Cloudflare R2، مما يفتح الباب لرفع ملفات ضخمة واستنزاف الموارد ومخالفة حدود الذاكرة والـ Timeout لخوادم Vercel Serverless (التي تنقطع عند 4.5MB في بعض الخطط أو تستهلك الذاكرة).
4. **هل يوجد تحقق من نوع الملف (MIME Type Validation)؟**
   - **لا في Route [مؤكد بالكود]:** لا يتم التحقق من امتداد الملف أو ترويسة `file.type` للتأكد من كونه فيديو مدعوماً (`video/mp4`, `video/quicktime`, etc.).

---

## 2. الضغط وتوليد الصور المصغرة (Compression & Thumbnails)

### من جانب تطبيق الهاتف (Flutter):
**المصدر:** `mobile/lib/screens/home/app_shell.dart:317-320`
```dart
final file = isVideo
    ? await picker.pickVideo(source: source)                      // ← بدون أي ضغط محلي
    : await picker.pickImage(source: source, imageQuality: 85); // ← ضغط الصور بجودة 85%
```
- **الصور:** يتم ضغطها محلياً بنسبة جودة 85% قبل إرسالها للشبكة [مؤكد بالكود].
- **الفيديوهات:** **لا يوجد أي ضغط محلي للفيديو**؛ يتم رفع الفيديو الخام بالحجم الكامل كما التقطه الهاتف.

### الصور المصغرة والتحويل (Thumbnails & Resizing):
- **[مؤكد بالكود بالغياب]:** لا يوجد في السيرفر أي Worker أو وظيفة Background تقوم بتوليد Thumbnails للفيديوهات المرفوعة، ويتم الاعتماد على روابط الفيديوهات مباشرة أو روابط يوتيوب/تيك توك الخارجية.

---

## 3. تدفق الوسائط ومخاطر استخدام السيرفر كوسيط (Vercel as Video Proxy)

```
[Flutter App] ──(Raw Video Stream)──> [Vercel Serverless Function] ──> [Cloudflare R2]
```

### المخاطر المعمارية الحالية:
1. **استهلاك موارد Vercel:** تمرير ملفات الفيديو الثقيلة عبر دوال Serverless على Vercel يستهلك الذاكرة المخصصة للدالة ويؤدي لأخطاء Function Invocation Timeout (بحد أقصى 10 إلى 60 ثانية).
2. **غياب روابط الرفع المؤقتة والمباشرة (Presigned Upload URLs):** العميل لا يرفع مباشرة لـ R2 بل يمر عبر خادم التطبيق.

---

## 4. خطة الإصلاح المعمارية للوسائط وموقف التنفيذ

1. **إصلاح أمني عاجل (Phase 1) — [✅ مُنَفَّذ ومُحَصَّن بالكامل]:**
   - تم استدعاء `getAuthUser` ورفض غير الموثقين بكود 401 والتأكد من مطابقة `user.id` مع `userId` المرفق أو صلاحية الأدمن (403).
   - تم وضع قيود برمجية صارمة على حجم الملف (أقصى حد 50MB) والتحقق من نوع وامتداد ملف الفيديو.
2. **التحول للرفع المباشر (Presigned URLs) (Phase 2) — [✅ مُنَفَّذ وجاهز]:**
   - تم إنشاء مسار [`POST /api/media/presigned-url`](file:///d:/El7lm-V2/src/app/api/media/presigned-url/route.ts) ومسار الإكمال [`POST /api/media/presigned-url/complete`](file:///d:/El7lm-V2/src/app/api/media/presigned-url/complete/route.ts).
   - يمنح التطبيق والمتصفح رابط رفع موقع وآمن يرفع من خلاله مباشرة إلى Cloudflare R2 دون المرور عبر خوادم Vercel ودون الخضوع لمهلة الـ 10 ثوانٍ.
3. **تفعيل ضغط الفيديو في التطبيق (Client-side Compression):**
   - متاح لعميل الموبايل كتحسين إضافي لاستهلاك باقات الجوال قبل استدعاء رابط الرفع.
