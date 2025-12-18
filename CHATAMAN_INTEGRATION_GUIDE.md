# 📱 دليل التكامل مع ChatAman API

## 📋 نظرة عامة

تم تكامل منصة الحلم مع **ChatAman API** لإرسال رسائل واتساب تلقائياً للمستخدمين. يتيح لك هذا التكامل:

- ✅ إرسال رسائل نصية
- ✅ إرسال صور ومستندات
- ✅ إرسال رسائل صوتية
- ✅ إرسال قوالب رسائل (Templates)
- ✅ إرسال رسائل جماعية

---

## 🔑 معلومات الاتصال

### Access Token
```
lmVt2Y62QMdZUp52JnkTeJNhgKERlCA92Oyv1aEh
```

### Base URL
```
https://chataman.com/api
```

### تاريخ الإنشاء
2025-12-10 09:35 AM

---

## 📁 الملفات المضافة

### 1. خدمة ChatAman (`src/services/chataman.service.ts`)
الملف الرئيسي الذي يحتوي على جميع الدوال للتعامل مع API.

### 2. أمثلة الاستخدام (`src/examples/chataman-usage.ts`)
ملف يحتوي على 10 أمثلة عملية لاستخدام الخدمة.

### 3. متغيرات البيئة (`.env.local`)
تم إضافة الإعدادات التالية:
```bash
CHATAMAN_ACCESS_TOKEN=lmVt2Y62QMdZUp52JnkTeJNhgKERlCA92Oyv1aEh
CHATAMAN_BASE_URL=https://chataman.com/api
CHATAMAN_ENABLED=true
```

---

## 🚀 البدء السريع

### 1. استيراد الخدمة

```typescript
import ChatAmanService from '@/services/chataman.service';

// إنشاء instance من الخدمة
const chataman = new ChatAmanService({
  accessToken: process.env.CHATAMAN_ACCESS_TOKEN || '',
  baseUrl: process.env.CHATAMAN_BASE_URL
});
```

### 2. إرسال رسالة بسيطة

```typescript
const result = await chataman.sendMessage({
  phone: '+966501234567',
  message: 'مرحباً! هذه رسالة تجريبية'
});

if (result.success) {
  console.log('✅ تم الإرسال بنجاح');
} else {
  console.error('❌ فشل الإرسال:', result.error);
}
```

---

## 📚 أمثلة الاستخدام

### مثال 1: رسالة ترحيب للمستخدمين الجدد

```typescript
import { sendWelcomeMessage } from '@/examples/chataman-usage';

// عند تسجيل مستخدم جديد
await sendWelcomeMessage('+966501234567', 'أحمد');
```

**الرسالة المرسلة:**
```
مرحباً أحمد! 👋

شكراً لتسجيلك في منصة الحلم.
نحن سعداء بانضمامك إلينا! 🎉
```

---

### مثال 2: إشعار بحجز جديد

```typescript
import { sendBookingNotification } from '@/examples/chataman-usage';

await sendBookingNotification('+966501234567', {
  bookingId: 'BK-12345',
  serviceName: 'استشارة قانونية',
  date: '2025-12-15',
  time: '10:00 صباحاً',
  price: 500
});
```

**الرسالة المرسلة:**
```
🎫 تأكيد الحجز

رقم الحجز: BK-12345
الخدمة: استشارة قانونية
📅 التاريخ: 2025-12-15
⏰ الوقت: 10:00 صباحاً
💰 المبلغ: 500 ريال

شكراً لثقتكم بنا! 🙏
```

---

### مثال 3: إرسال فاتورة PDF

```typescript
import { sendInvoice } from '@/examples/chataman-usage';

await sendInvoice(
  '+966501234567',
  'https://example.com/invoices/INV-12345.pdf',
  'INV-12345',
  1500
);
```

---

### مثال 4: إرسال صورة ترويجية

```typescript
import { sendPromotionalImage } from '@/examples/chataman-usage';

await sendPromotionalImage(
  '+966501234567',
  'https://example.com/promo.jpg',
  '🎉 عرض خاص! خصم 50% على جميع الخدمات'
);
```

---

### مثال 5: إرسال رسائل جماعية

```typescript
import { sendBulkMessages } from '@/examples/chataman-usage';

const recipients = [
  { phone: '+966501234567', message: 'مرحباً أحمد!' },
  { phone: '+966507654321', message: 'مرحباً محمد!' },
  { phone: '+966509876543', message: 'مرحباً فاطمة!' }
];

const results = await sendBulkMessages(recipients, 1000); // انتظار ثانية بين كل رسالة
```

---

## 🔧 API Reference

### `sendMessage(params)`
إرسال رسالة نصية

**المعاملات:**
```typescript
{
  phone: string;      // رقم الهاتف مع كود الدولة (+966...)
  message: string;    // نص الرسالة
}
```

**الاستجابة:**
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

---

### `sendFile(params)`
إرسال ملف (صورة، فيديو، مستند)

**المعاملات:**
```typescript
{
  phone: string;      // رقم الهاتف
  fileUrl: string;    // رابط الملف
  caption?: string;   // نص مرفق (اختياري)
}
```

---

### `sendAudio(phone, audioUrl)`
إرسال رسالة صوتية

**المعاملات:**
- `phone`: رقم الهاتف
- `audioUrl`: رابط الملف الصوتي

---

### `sendTemplate(params)`
إرسال قالب رسالة

**المعاملات:**
```typescript
{
  phone: string;
  templateName: string;
  parameters?: Record<string, any>;
}
```

---

### `checkConnection()`
التحقق من حالة الاتصال مع API

**الاستجابة:**
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

---

### `getAccountInfo()`
الحصول على معلومات الحساب

---

## 🎯 حالات الاستخدام في المشروع

### 1. عند تسجيل مستخدم جديد
```typescript
// في ملف: src/app/api/auth/register/route.ts
import { sendWelcomeMessage } from '@/examples/chataman-usage';

// بعد نجاح التسجيل
await sendWelcomeMessage(user.phone, user.name);
```

---

### 2. عند إنشاء حجز جديد
```typescript
// في ملف: src/app/api/bookings/create/route.ts
import { sendBookingNotification } from '@/examples/chataman-usage';

await sendBookingNotification(user.phone, {
  bookingId: booking.id,
  serviceName: booking.service.name,
  date: booking.date,
  time: booking.time,
  price: booking.price
});
```

---

### 3. عند إصدار فاتورة
```typescript
// في ملف: src/app/api/invoices/create/route.ts
import { sendInvoice } from '@/examples/chataman-usage';

await sendInvoice(
  user.phone,
  invoice.pdfUrl,
  invoice.number,
  invoice.total
);
```

---

### 4. إرسال إشعارات دورية
```typescript
// في ملف: src/app/api/cron/daily-reminders/route.ts
import ChatAmanService from '@/services/chataman.service';

const chataman = new ChatAmanService({
  accessToken: process.env.CHATAMAN_ACCESS_TOKEN || ''
});

// إرسال تذكيرات للمواعيد القادمة
for (const appointment of upcomingAppointments) {
  await chataman.sendMessage({
    phone: appointment.user.phone,
    message: `تذكير: لديك موعد غداً في ${appointment.time}`
  });
}
```

---

## ⚠️ أفضل الممارسات

### 1. معالجة الأخطاء
```typescript
try {
  const result = await chataman.sendMessage({
    phone: userPhone,
    message: messageText
  });

  if (!result.success) {
    // تسجيل الخطأ
    console.error('فشل إرسال الرسالة:', result.error);
    
    // إشعار المسؤول
    await notifyAdmin(`فشل إرسال رسالة إلى ${userPhone}`);
  }
} catch (error) {
  console.error('خطأ غير متوقع:', error);
}
```

---

### 2. إعادة المحاولة عند الفشل
```typescript
import { sendMessageWithRetry } from '@/examples/chataman-usage';

// سيحاول 3 مرات قبل الفشل النهائي
const success = await sendMessageWithRetry(
  userPhone,
  message,
  3 // عدد المحاولات
);
```

---

### 3. تجنب Rate Limiting
```typescript
// عند إرسال رسائل جماعية، أضف تأخير بين الرسائل
import { sendBulkMessages } from '@/examples/chataman-usage';

await sendBulkMessages(recipients, 1000); // ثانية واحدة بين كل رسالة
```

---

### 4. التحقق من صحة رقم الهاتف
```typescript
function validatePhoneNumber(phone: string): boolean {
  // يجب أن يبدأ بـ + ويحتوي على كود الدولة
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

// قبل الإرسال
if (!validatePhoneNumber(userPhone)) {
  throw new Error('رقم الهاتف غير صحيح');
}
```

---

### 5. تخزين سجل الرسائل
```typescript
// حفظ سجل في قاعدة البيانات
await db.messageLogs.create({
  userId: user.id,
  phone: user.phone,
  message: messageText,
  status: result.success ? 'sent' : 'failed',
  error: result.error,
  sentAt: new Date()
});
```

---

## 🔒 الأمان

### 1. حماية Access Token
- ✅ **لا تشارك** المفتاح مع أحد
- ✅ **لا ترفعه** إلى Git (موجود في `.env.local`)
- ✅ **قم بتدويره** بشكل دوري من لوحة التحكم

### 2. التحقق من الصلاحيات
```typescript
// تأكد من أن المستخدم وافق على استقبال الرسائل
if (!user.acceptsWhatsAppNotifications) {
  console.log('المستخدم لم يوافق على استقبال الرسائل');
  return;
}
```

---

## 📊 المراقبة والتتبع

### إنشاء Dashboard للمراقبة
```typescript
// src/app/dashboard/admin/chataman-stats/page.tsx
import { getChatAmanAccountInfo } from '@/examples/chataman-usage';

export default async function ChatAmanStatsPage() {
  const accountInfo = await getChatAmanAccountInfo();
  
  return (
    <div>
      <h1>إحصائيات ChatAman</h1>
      {/* عرض الإحصائيات */}
    </div>
  );
}
```

---

## 🧪 الاختبار

### اختبار الاتصال
```typescript
import { checkChatAmanConnection } from '@/examples/chataman-usage';

// في ملف: src/app/api/test/chataman/route.ts
export async function GET() {
  const isConnected = await checkChatAmanConnection();
  
  return Response.json({
    status: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
}
```

### اختبار إرسال رسالة
```bash
# قم بإنشاء endpoint للاختبار
curl -X POST http://localhost:3001/api/test/chataman/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567", "message": "رسالة تجريبية"}'
```

---

## 📞 الدعم والمساعدة

### روابط مفيدة
- 🔗 لوحة التحكم: https://chataman.com/dashboard
- 🔗 Access Tokens: https://chataman.com/developer-tools/access-tokens
- 📧 الدعم الفني: support@chataman.com

### الحصول على مفتاح جديد
1. اذهب إلى: https://chataman.com/developer-tools/access-tokens
2. اضغط على "إنشاء مفتاح API"
3. انسخ المفتاح وأضفه إلى `.env.local`

---

## 📝 ملاحظات مهمة

1. **تنسيق رقم الهاتف**: يجب أن يكون بالصيغة الدولية (`+966501234567`)
2. **حد الإرسال**: تحقق من حدود الإرسال في حسابك
3. **أنواع الملفات المدعومة**: 
   - صور: JPG, PNG, GIF
   - مستندات: PDF, DOC, DOCX
   - فيديو: MP4, AVI
   - صوت: MP3, WAV, OGG

4. **حجم الملفات**: تحقق من الحد الأقصى لحجم الملفات المسموح به

---

## 🎉 الخلاصة

الآن لديك تكامل كامل مع ChatAman API! يمكنك:

✅ إرسال رسائل واتساب تلقائياً  
✅ إرسال الملفات والصور  
✅ إرسال إشعارات للمستخدمين  
✅ إدارة الرسائل الجماعية  

**ابدأ الآن** باستخدام الأمثلة الموجودة في `src/examples/chataman-usage.ts`!

---

**تم التحديث:** 2025-12-10  
**الإصدار:** 1.0.0
