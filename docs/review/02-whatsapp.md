# المرحلة 2 — مراجعة تكامل WhatsApp (ChatAman) (المُراجَعة والمُصحَّحة)

**تاريخ المراجعة:** 2026-09-24  
**وضع المراجعة:** قراءة فقط — لا تعديل على الكود  
**حالة الملف:** مُصحَّح ومُثبَّت بالأدلة من الكود المصدري  

> **ملاحظة معمارية:** النظام يستخدم وسيط **ChatAman** كبوابة لـ WhatsApp Business API — ولا يتصل مباشرة بـ Meta Cloud API من الخادم.

---

## 1. آلية إرسال الـ OTP وهيكل الاستدعاءات

**المصدر:** `src/lib/otp/unified-otp-service.ts:104-180` و `src/lib/otp/unified-otp-service.ts:276-337`

### تسلسل الإرسال في الكود:
```typescript
// unified-otp-service.ts:104-155
const sendTemplate = async (includeUrlButton: boolean) => {
  const payload = {
    phone: formattedPhone,
    template: {
      name: 'otp_el7lmplatform',   // اسم القالب المسجل
      language: { code: 'ar' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: otp }] },
      ],
    },
  };
  const response = await fetch(`${baseUrl}/api/send/template`, { ... });
  return response.ok;
};
```

### تسلسل التنفيذ الفعلي عند الإرسال:
1. **السطر 152:**
   ```typescript
   if (await sendTemplate(true) || await sendTemplate(false)) { ... }
   ```
   - يحاول أولاً إرسال القالب مع زر الرابط (`sendTemplate(true)`).
   - إذا أخفق، ينفذ الشرط المنطقي `||` ويستدعي القالب بدون زر الرابط (`sendTemplate(false)`).
2. **السطور 157-175 (Fallback):**
   - إذا أخفق كلا القالبين، ينتقل إلى محاولة إرسال رسالة دردشة عادية نصية:
   ```typescript
   const directMessage = `*${otp}* هو كود التحقق لمنصة الحلم...`;
   const sendResponse = await fetch(`${baseUrl}/api/send`, { ... });
   ```

**[مؤكد بالكود]:**
- في أسوأ الاحتمالات عند مواجهة مشاكل في القالب، ينفذ السيرفر **3 طلبات HTTP خارجية متتابعة** متزامنة (`await`) ضد ChatAman قبل اتخاذ قرار الفشل.
- إرسال رسالة مباشرة بدون قالب (Session Message) سيفشل حتماً إذا لم تكن هناك نافذة محادثة نشطة (24-hour service window) تم فتحها مسبقاً من قِبل المستخدم وفق شروط Meta.

---

## 2. زمن الاستجابة والتزامن

**[مؤكد بالكود]** — المصدر: `src/lib/otp/unified-otp-service.ts:304`
```typescript
sendResult = await sendOTPViaWhatsApp(formattedPhone, otp);
```

- الاتصال بـ ChatAman يتم بأسلوب متزامن ومعلّق للطلب (`await`).
- يترتب على ذلك أن العميل (تطبيق Flutter) يظل في وضع الانتظار طوال فترة:
  1. الاستعلامات الـ 27 لقاعدة البيانات في `findAccountByPhone`.
  2. استعلامات Supabase لقراءة وتخزين OTP.
  3. استدعاءات HTTP لـ ChatAman (من 1 إلى 3 طلبات).
- هذا يفسر تجربة المستخدم البطيئة في شاشة تسجيل الدخول وظهور شاشات التحميل لفترات قد تلامس مهلة انتهاء الاتصال (Timeout).

---

## 3. Webhooks وحالة التسليم (Delivery Status)

**[مؤكد بالكود بالغياب]:**
- لا يوجد أي Route أو Controller في `src/app/api/` مخصص لاستقبال أحداث Webhooks من مزود WhatsApp أو ChatAman.
- قاعدة البيانات لا تحتفظ بحالة تسليم الرمز (`sent`, `delivered`, `read`, `failed`).
- النظام يتعامل مع حالة التسليم على أنها "ناجحة" بمجرد قبول خادم ChatAman للطلب الأولي (`response.ok`) دون معرفة ما إذا كانت Meta قد أوصلت الرسالة لهاتف المستخدم.

---

## 4. معايير أمان وتخزين الرمز (OTP Security Lifecycle)

**المصدر:** `src/lib/otp/otp-manager.ts:10-20`

| المعيار | القيمة المحققة في الكود | الدليل | التقييم الهندسي |
|---------|------------------------|--------|-----------------|
| خوارزمية التشفير | `crypto.createHash('sha256').update(otp).digest('hex')` | `otp-manager.ts:14-16` | [مؤكد بالكود] التخزين بصيغة Hash وليس كود صريح |
| إضافة Salt | **غير موجودة إطلاقاً** | `otp-manager.ts:14-16` | [مؤكد بالكود] نظراً لأن الكود 6 أرقام فقط (10^6 احتمالات)، يسهل نظرياً عمل Precomputed Table |
| مدة الصلاحية | 5 دقائق (`OTP_EXPIRY_MINUTES = 5`) | `otp-manager.ts:10` | [مؤكد بالكود] معيار قياسي ملائم |
| الحد الأقصى للمحاولات | 5 محاولات (`MAX_ATTEMPTS = 5`) | `otp-manager.ts:11` | [مؤكد بالكود] يمنع هجمات القوة الغاشمة (Brute-force) بفعالية |
| الإبطال الفوري | `UPDATE otp_verifications SET verified = true` | `otp-manager.ts:121` | [مؤكد بالكود] الرمز يُبطل فور نجاح التحقق |

---

## 5. ضوابط تقييد المعدل (Rate Limiting)

**المصدر:** `src/lib/otp/otp-manager.ts:44-55`

```typescript
const RATE_LIMIT_SECONDS = 30;
// ...
if (!existing.verified && expiresAt > now && secondsSinceCreation < RATE_LIMIT_SECONDS) {
  const waitSeconds = RATE_LIMIT_SECONDS - secondsSinceCreation;
  return { success: false, error: `يرجى الانتظار ${waitSeconds} ثانية...` };
}
```

- **حماية رقم الهاتف:** توجد مهلة إجبارية قدرها 30 ثانية بين طلبات الرمز لنفس الرقم مخزنة في قاعدة البيانات (`otp_verifications`)، وهو ما يضمن تطبيقها عبر كل الـ Serverless instances.
- **حماية عناوين الـ IP:** **[مؤكد بالكود بالغياب]** لا يوجد أي فحص أو تقييد لعنوان الـ IP (IP-based rate limiting) في مسار طلب الـ OTP.
- **الخطر:** يمكن لأي جهة خبيثة تكرار طلبات OTP لأرقام عشوائية متفرقة بسرعة عالية من نفس الخادم دون أن يوقفها الـ Rate Limiting، مما يؤدي لاستنزاف رصيد WhatsApp وزيادة التكاليف.

---

## 6. مسارات الطوارئ والبدائل (Fallback Channels)

**المصدر:** `src/lib/otp/unified-otp-service.ts:216-228`

```typescript
async function sendOTPViaSMS(phone: string, otp: string) {
  return { success: false, error: 'SMS service is not available.', code: 'OTP_CHANNEL_UNAVAILABLE' };
}

async function sendOTPViaFirebasePhone(phone: string, otp: string) {
  return { success: false, error: 'Firebase Phone Auth is not configured.', code: 'OTP_CHANNEL_UNAVAILABLE' };
}
```

**[مؤكد بالكود]:**
- قنوات الـ SMS والـ Firebase Phone معطلة برمجياً وترجع فشلاً دائماً.
- **لا توجد أي قناة بديلة نشطة إطلاقاً** في حال توقف خدمة ChatAman أو حظر رقم WhatsApp الخاص بالمنصة، مما يعني توقف تسجيل الدخول والتسجيل بالكامل للمستخدمين في حال حدوث عطل بمزود الخدمة.

---

## 7. ملخص المخاطر والإجراءات المقترحة

| # | الملاحظة | الخطورة | الأثر | الإجراء المطلوب |
|---|----------|---------|-------|-----------------|
| 1 | غياب أي قناة بديلة (Fallback) | **حرجة** | توقف كامل للمصادقة في حال تعطل WhatsApp | تفعيل مزود SMS احتياطي موثوق (مثل Twilio أو مزود محلي) |
| 2 | تتابع طلبات HTTP المتزامنة | عالية | بطء شديد واحتمال Timeout للعميل | جعل المحاولات مضبوطة بمهلة زمنية صارمة (Strict Timeout 3s) |
| 3 | غياب تقييد المعدل بحسب IP | عالية | استنزاف رصيد وحصص الرسائل عبر الـ Flooding | تطبيق Upstash Redis / Vercel KV Rate Limiter على المسار `/api/otp/send` |
| 4 | غياب Webhooks التتبع | متوسطة | غياب الرؤية التشغيلية لحالات تسليم الرسائل | إنشاء Endpoint لاستقبال وتحديث حالات تسليم الرسائل |
| 5 | عدم استخدام Salt في التجزئة | منخفضة | إمكانية مطابقة الأكواد الضعيفة نظرياً | دمج رقم الهاتف مع الرمز قبل حساب SHA-256 |
