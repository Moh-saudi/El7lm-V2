# 🔍 استكشاف مشكلة المدفوعات المفقودة من جيديا

## المشكلة
المدفوعة تظهر في صفحة جيديا (مع رسالة "Insufficient funds") لكنها لا تظهر في لوحة تحكم المدفوعات.

## البيانات من جيديا
- **orderId من جيديا:** `bea301b8-bd7e-47da-f914-08de1d1bfced`
- **merchantReferenceId:** `EL7LM1763594235677AI83`
- **سبب الفشل:** `Insufficient funds`

## خطوات التحقق

### 1. التحقق من Callback في Vercel Logs

1. افتح Vercel Dashboard
2. اذهب إلى Project > Logs
3. ابحث عن `[Geidea Callback]`
4. تحقق من وجود log مثل:
   ```
   🔄 [Geidea Callback] Received payment callback: {...}
   📋 [Geidea Callback] Processing orderId: bea301b8-bd7e-47da-f914-08de1d1bfced
   💾 [Geidea Callback] Payment stored in geidea_payments
   ```

**إذا لم تجد logs:**
- Callback لم يصل من جيديا
- تحقق من Callback URL في لوحة تحكم جيديا
- تحقق من أن Callback URL صحيح: `https://www.el7lm.com/api/geidea/callback`

### 2. التحقق من Firestore

1. افتح Firebase Console
2. اذهب إلى Firestore Database
3. ابحث في مجموعة `geidea_payments`
4. ابحث عن:
   - Document ID: `bea301b8-bd7e-47da-f914-08de1d1bfced` (orderId من جيديا)
   - أو Document ID: `EL7LM1763594235677AI83` (merchantReferenceId)
   - أو ابحث في الحقول: `merchantReferenceId == "EL7LM1763594235677AI83"`

**إذا لم تجد:**
- Callback لم يصل أو فشل في الحفظ
- تحقق من Vercel Logs للأخطاء

### 3. التحقق من Callback API يدوياً

#### باستخدام orderId:
```bash
curl "https://www.el7lm.com/api/geidea/callback?orderId=bea301b8-bd7e-47da-f914-08de1d1bfced"
```

#### باستخدام merchantReferenceId:
```bash
curl "https://www.el7lm.com/api/geidea/callback?merchantReferenceId=EL7LM1763594235677AI83"
```

**النتائج المحتملة:**
- `{"success": true, ...}` - المدفوعة موجودة ✅
- `{"success": false, "status": "not_found"}` - المدفوعة غير موجودة ❌

### 4. التحقق من صفحة المدفوعات

1. افتح صفحة المدفوعات في لوحة التحكم
2. افتح Console في المتصفح (F12)
3. ابحث عن logs مثل:
   ```
   ✅ [Geidea Payment] Extracted paymentMethod: ...
   ```
4. تحقق من أن `geidea_payments` موجودة في قائمة المجموعات

## الحلول المحتملة

### الحل 1: Callback لم يصل من جيديا

**السبب:** جيديا قد لا ترسل callback للمدفوعات الفاشلة قبل إتمام العملية.

**الحل:**
1. تحقق من Callback URL في لوحة تحكم جيديا
2. تأكد من أن Callback URL صحيح: `https://www.el7lm.com/api/geidea/callback`
3. جرب عملية دفع أخرى ومراقبة Vercel Logs

### الحل 2: Callback وصل لكن فشل في الحفظ

**السبب:** خطأ في معالجة Callback أو في Firestore.

**الحل:**
1. تحقق من Vercel Logs للأخطاء
2. تحقق من أن Firebase Admin SDK يعمل بشكل صحيح
3. تحقق من صلاحيات Firestore

### الحل 3: Callback وصل وتم حفظه لكن صفحة المدفوعات لا تجلبه

**السبب:** مشكلة في استخراج البيانات أو في الفلاتر.

**الحل:**
1. تحقق من أن `geidea_payments` موجودة في قائمة المجموعات
2. تحقق من Console logs في صفحة المدفوعات
3. تحقق من الفلاتر (قد تكون المدفوعة مفلترة)

## التحسينات المضافة

### 1. تحسين استخراج orderId
- البحث في جميع الحقول المحتملة
- استخدام merchantReferenceId كبديل إذا لم يوجد orderId

### 2. تحسين حفظ البيانات
- حفظ orderId و merchantReferenceId بشكل منفصل
- استخدام orderId كـ document ID (الأولوية)

### 3. تحسين البحث
- البحث باستخدام orderId أو merchantReferenceId
- البحث في جميع الحقول المحتملة

### 4. تحسين Logging
- تسجيل تفصيلي لجميع Callbacks
- تسجيل خاص للمدفوعات الفاشلة
- تسجيل خاص لـ Insufficient funds

## خطوات التحقق السريعة

1. ✅ تحقق من Vercel Logs
2. ✅ تحقق من Firestore
3. ✅ تحقق من Callback API يدوياً
4. ✅ تحقق من صفحة المدفوعات

## ملاحظات مهمة

1. **جيديا قد لا ترسل callback للمدفوعات الفاشلة قبل إتمام العملية**
   - هذا سلوك طبيعي من جيديا
   - المدفوعات الفاشلة قد لا تصل callbacks لها

2. **Callback URL يجب أن يكون صحيحاً**
   - يجب أن يكون HTTPS
   - يجب أن يكون URL مطلق
   - يجب أن يكون مسجل في لوحة تحكم جيديا

3. **Firestore يجب أن يكون متاحاً**
   - تحقق من أن Firebase Admin SDK يعمل
   - تحقق من صلاحيات Firestore

## المراجع

- [Geidea HPP Checkout v2 Documentation](https://docs.geidea.net/docs/geidea-checkout-v2)
- [Webhook/Callback Notifications](https://docs.geidea.net/docs/geidea-checkout-v2#callback-validation)

