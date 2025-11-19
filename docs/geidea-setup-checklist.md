# ✅ قائمة التحقق من إعدادات جلب المدفوعات من جيديا

## 📋 الإعدادات المطلوبة

### 1. المتغيرات البيئية (Environment Variables)
- [ ] `GEIDEA_MERCHANT_PUBLIC_KEY` - المفتاح العام للتاجر
- [ ] `GEIDEA_API_PASSWORD` - كلمة مرور API
- [ ] `GEIDEA_BASE_URL` - رابط API (افتراضي: `https://api.merchant.geidea.net`)
- [ ] `GEIDEA_ENVIRONMENT` - البيئة (افتراضي: `production`)
- [ ] `NEXT_PUBLIC_BASE_URL` - رابط الموقع الأساسي (يُستخدم لـ callback URL)

### 2. إعدادات Callback URL في جيديا
- [ ] تم إضافة رابط Callback في لوحة تحكم جيديا: `https://www.el7lm.com/api/geidea/callback`
- [ ] الرابط نشط ومتاح من الإنترنت
- [ ] الرابط يستخدم HTTPS

### 3. ملفات API

#### ✅ `/api/geidea/create-session` (إنشاء جلسة الدفع)
- [x] يتحقق من وجود المتغيرات البيئية
- [x] ينشئ orderId فريد
- [x] ينشئ signature صحيح
- [x] يستخدم callback URL الصحيح: `https://www.el7lm.com/api/geidea/callback`
- [x] يرسل الطلب إلى Geidea API بشكل صحيح
- [x] يعيد sessionId و redirectUrl

#### ✅ `/api/geidea/callback` (استقبال إشعارات الدفع)
- [x] يدعم POST و GET و OPTIONS
- [x] يحتوي على CORS headers في جميع الاستجابات
- [x] يحفظ البيانات في مجموعة `geidea_payments`
- [x] يستخرج البيانات من payload بشكل صحيح
- [x] يحدد حالة الدفع بشكل صحيح
- [x] يربط الدفعة بالمستخدم إذا كان متاحاً

### 4. صفحة المدفوعات (Admin Payments Page)

#### ✅ جلب البيانات
- [x] `geidea_payments` موجودة في قائمة المجموعات
- [x] يتم جلب جميع المدفوعات من `geidea_payments`
- [x] يتم استخراج `paymentMethod: 'geidea'` بشكل صحيح
- [x] يتم عرض المدفوعات في القائمة

#### ✅ معالجة البيانات
- [x] استخراج اسم العميل من `customerName`
- [x] استخراج رقم الهاتف من `customerPhone`
- [x] استخراج المبلغ من `amount`
- [x] استخراج الحالة من `status`
- [x] استخراج تاريخ الإنشاء من `createdAt`

### 5. هيكل البيانات في Firestore

#### مجموعة `geidea_payments`
كل وثيقة تحتوي على:
- `orderId` - معرف الطلب
- `merchantReferenceId` - معرف التاجر
- `transactionId` - معرف المعاملة
- `status` - الحالة (success, failed, pending, cancelled)
- `statusSource` - مصدر الحالة
- `amount` - المبلغ
- `currency` - العملة
- `customerEmail` - بريد العميل
- `customerName` - اسم العميل
- `customerPhone` - رقم هاتف العميل
- `userId` - معرف المستخدم (إن وجد)
- `accountType` - نوع الحساب (إن وجد)
- `responseCode` - رمز الاستجابة
- `detailedResponseCode` - رمز الاستجابة التفصيلي
- `responseMessage` - رسالة الاستجابة
- `detailedResponseMessage` - رسالة الاستجابة التفصيلية
- `paidAt` - تاريخ الدفع
- `callbackReceivedAt` - تاريخ استقبال الإشعار
- `paymentMethod: 'geidea'` - طريقة الدفع
- `source: 'geidea_callback'` - المصدر
- `rawPayload` - البيانات الخام
- `createdAt` - تاريخ الإنشاء
- `updatedAt` - تاريخ التحديث

## 🔍 خطوات التحقق

### 1. التحقق من المتغيرات البيئية
```bash
# في Vercel أو بيئة الإنتاج، تأكد من وجود:
GEIDEA_MERCHANT_PUBLIC_KEY=your_key_here
GEIDEA_API_PASSWORD=your_password_here
NEXT_PUBLIC_BASE_URL=https://www.el7lm.com
```

### 2. التحقق من Callback URL
- افتح: `https://www.el7lm.com/api/geidea/callback?orderId=TEST123`
- يجب أن يعيد JSON response (حتى لو كان not_found)

### 3. اختبار جلب المدفوعات
- افتح صفحة المدفوعات في لوحة التحكم
- تحقق من وجود مدفوعات جيديا في القائمة
- تحقق من أن البيانات معروضة بشكل صحيح

### 4. اختبار عملية دفع كاملة
1. إنشاء جلسة دفع جديدة
2. إتمام عملية الدفع في جيديا
3. التحقق من وصول الإشعار إلى callback
4. التحقق من حفظ البيانات في `geidea_payments`
5. التحقق من ظهور المدفوعة في صفحة المدفوعات

## 🐛 استكشاف الأخطاء

### المشكلة: لا تظهر مدفوعات جيديا في صفحة المدفوعات
**الحل:**
1. تحقق من وجود مجموعة `geidea_payments` في Firestore
2. تحقق من أن البيانات تحتوي على `paymentMethod: 'geidea'`
3. تحقق من console logs في صفحة المدفوعات

### المشكلة: لا تصل إشعارات من جيديا
**الحل:**
1. تحقق من أن Callback URL صحيح في لوحة تحكم جيديا
2. تحقق من أن الرابط يستخدم HTTPS
3. تحقق من CORS headers في ملف callback
4. تحقق من logs في Vercel

### المشكلة: خطأ في إنشاء جلسة الدفع
**الحل:**
1. تحقق من وجود المتغيرات البيئية
2. تحقق من صحة المفتاح وكلمة المرور
3. تحقق من أن baseUrl صحيح
4. تحقق من logs في Vercel

## 📝 ملاحظات مهمة

1. **Callback URL يجب أن يكون مطلقاً** (يبدأ بـ https://)
2. **Geidea لا يقبل localhost URLs** - يجب استخدام رابط الإنتاج
3. **CORS headers ضرورية** - تم إضافتها في جميع الاستجابات
4. **البيانات تُحفظ تلقائياً** عند وصول إشعار من جيديا
5. **صفحة المدفوعات تجلب البيانات تلقائياً** من `geidea_payments`

