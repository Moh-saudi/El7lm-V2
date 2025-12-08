# 🔐 حل مشكلة OTP - استخدام Firestore

## 📋 المشكلة الأصلية

كان نظام OTP يستخدم **تخزين في الذاكرة** (`in-memory store`)، مما أدى إلى:
- ❌ فقدان OTP عند إعادة تشغيل الخادم
- ❌ عدم العمل مع عدة خوادم (multi-server)
- ❌ عدم الأمان الكافي
- ❌ مشاكل في الإنتاج

## ✅ الحل المطبق

تم نقل نظام OTP بالكامل إلى **Firestore** مع المميزات التالية:

### 1. تخزين دائم وآمن
- ✅ OTP محفوظ في Firestore collection: `otp_verifications`
- ✅ OTP مشفر قبل التخزين (SHA-256)
- ✅ لا يضيع عند إعادة التشغيل
- ✅ يعمل مع عدة خوادم

### 2. Rate Limiting
- ✅ منع إرسال OTP متكرر لنفس الرقم
- ✅ حد أقصى 5 محاولات للتحقق
- ✅ رسائل خطأ واضحة

### 3. إدارة محسنة
- ✅ انتهاء صلاحية تلقائي (1 دقيقة بناءً على طلبك)
- ✅ Rate Limiting (منع إرسال جديد خلال 30 ثانية)
- ✅ تنظيف تلقائي للـ OTP المنتهية
- ✅ تتبع المحاولات الفاشلة

## 📁 الملفات الجديدة

### 1. `src/lib/otp/firestore-otp-manager.ts`
نظام إدارة OTP الكامل:
- `storeOTPInFirestore()` - حفظ OTP
- `verifyOTPInFirestore()` - التحقق من OTP
- `deleteOTPFromFirestore()` - حذف OTP
- `cleanupExpiredOTPs()` - تنظيف OTP المنتهية
- `hasActiveOTP()` - التحقق من وجود OTP نشط

### 2. `src/app/api/otp/cleanup/route.ts`
API route لتنظيف OTP المنتهية (يمكن استخدامه مع cron job)

## 🔄 التغييرات على الملفات الموجودة

### 1. `src/app/api/whatsapp/babaservice/verify-otp/route.ts`
- ✅ تم استبدال `otpStore` (الذاكرة) بـ `verifyOTPInFirestore()`
- ✅ إزالة جميع الكود المتعلق بالذاكرة

### 2. `src/app/api/whatsapp/babaservice/otp/route.ts`
- ✅ تم استبدال `storeOtp()` بـ `storeOTPInFirestore()`
- ✅ إضافة Rate Limiting (منع إرسال OTP متكرر)

## 🚀 كيفية الاستخدام

### إرسال OTP
```typescript
import { storeOTPInFirestore } from '@/lib/otp/firestore-otp-manager';

const result = await storeOTPInFirestore(
  '+966501234567', 
  '123456',
  'registration' // أو 'login' أو 'password_reset'
);
```

### التحقق من OTP
```typescript
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';

const result = await verifyOTPInFirestore('+966501234567', '123456');
if (result.success) {
  // OTP صحيح
} else {
  // OTP غير صحيح أو منتهي
  console.error(result.error);
}
```

## 📊 هيكل البيانات في Firestore

```typescript
otp_verifications/
  otp_966501234567/
    phoneNumber: "+966501234567"
    otpHash: "sha256_hash_of_otp"
    attempts: 0
    createdAt: Timestamp
    expiresAt: Timestamp
    verified: false
    purpose: "registration"
```

## 🔒 الأمان

1. **تشفير OTP**: يتم تشفير OTP باستخدام SHA-256 قبل التخزين
2. **انتهاء الصلاحية**: OTP صالح لمدة 10 دقائق فقط
3. **حد المحاولات**: أقصى 5 محاولات للتحقق
4. **Rate Limiting**: منع إرسال OTP متكرر

## 🧹 التنظيف التلقائي

يمكن إعداد cron job لتنظيف OTP المنتهية:

```bash
# مثال: تنظيف كل ساعة
0 * * * * curl -X POST https://your-domain.com/api/otp/cleanup \
  -H "Authorization: Bearer your-cleanup-token"
```

أو استخدام Vercel Cron:
```json
{
  "crons": [{
    "path": "/api/otp/cleanup",
    "schedule": "0 * * * *"
  }]
}
```

## ✅ المزايا

1. **موثوقية**: لا يضيع OTP عند إعادة التشغيل
2. **قابلية التوسع**: يعمل مع عدة خوادم
3. **الأمان**: OTP مشفر وآمن
4. **سهولة الصيانة**: تنظيف تلقائي
5. **Rate Limiting**: حماية من الإساءة

## 🔄 Migration

لا حاجة لـ migration - النظام الجديد يعمل مباشرة مع الحسابات الجديدة.
الحسابات القديمة ستستخدم النظام الجديد تلقائياً عند طلب OTP جديد.

## 📝 ملاحظات مهمة

1. **Firestore Rules**: تأكد من إضافة rules مناسبة:
```javascript
match /otp_verifications/{phoneId} {
  allow read, write: if request.auth != null || 
    request.resource.data.phoneNumber == request.resource.id;
}
```

2. **Indexes**: قد تحتاج لإضافة index على `expiresAt` للتنظيف السريع

3. **Cost**: Firestore reads/writes - تأكد من مراقبة الاستخدام

## 🎯 الخطوات التالية

- [ ] إضافة Firestore Rules
- [ ] إعداد cron job للتنظيف
- [ ] مراقبة الاستخدام والتكاليف
- [ ] إضافة monitoring/logging

---

**تم إنشاء هذا الحل بواسطة Auto** 🚀

