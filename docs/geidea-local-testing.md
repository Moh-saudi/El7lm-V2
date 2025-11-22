# 🧪 اختبار جيديا محلياً قبل الرفع

## خطوات الاختبار المحلي

### 1. إعداد المتغيرات البيئية محلياً

أنشئ ملف `.env.local` في جذر المشروع:

```bash
GEIDEA_MERCHANT_PUBLIC_KEY=3448c010-87b1-41e7-9771-cac444268cfb
GEIDEA_API_PASSWORD=edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0
GEIDEA_BASE_URL=https://api.merchant.geidea.net
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. تشغيل المشروع محلياً

```bash
npm run dev
```

### 3. اختبار Create Session API

```bash
curl -X POST http://localhost:3000/api/geidea/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "currency": "EGP",
    "customerEmail": "test@example.com",
    "customerName": "Test User"
  }'
```

### 4. اختبار Callback API (محاكاة)

```bash
# محاكاة callback ناجح
curl -X POST http://localhost:3000/api/geidea/callback \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-123",
    "merchantReferenceId": "EL7LM123456",
    "status": "success",
    "responseCode": "000",
    "amount": 10.00,
    "currency": "EGP",
    "customerEmail": "test@example.com",
    "customerName": "Test User"
  }'

# محاكاة callback فاشل (Insufficient funds)
curl -X POST http://localhost:3000/api/geidea/callback \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-456",
    "merchantReferenceId": "EL7LM789012",
    "status": "failed",
    "responseCode": "100",
    "responseMessage": "Insufficient funds",
    "amount": 10.00,
    "currency": "EGP",
    "customerEmail": "test@example.com",
    "customerName": "Test User"
  }'
```

### 5. اختبار Fetch Transactions API

```bash
curl http://localhost:3000/api/geidea/fetch-transactions?limit=100
```

### 6. اختبار صفحة المعاملات

1. افتح المتصفح على: `http://localhost:3000/dashboard/admin/geidea-transactions`
2. انقر على "جلب من جيديا" لجلب المعاملات مباشرة
3. تحقق من ظهور المعاملات في الجدول

## ملاحظات مهمة

1. **Callback URL في جيديا:**
   - في بيئة التطوير، Callback URL يجب أن يكون: `https://your-ngrok-url.ngrok.io/api/geidea/callback`
   - أو استخدم ngrok لإنشاء tunnel: `ngrok http 3000`
   - ثم استخدم الـ URL من ngrok في Callback URL في جيديا

2. **Firebase Admin:**
   - تأكد من أن `GOOGLE_APPLICATION_CREDENTIALS` مضبوط محلياً
   - أو استخدم service account key محلياً

3. **الاختبار مع جيديا الحقيقي:**
   - في بيئة التطوير، قد تحتاج إلى استخدام Test Mode من جيديا
   - تحقق من أن Callback URL مسجل في لوحة تحكم جيديا

## سيناريوهات الاختبار

### سيناريو 1: معاملة ناجحة
1. إنشاء جلسة دفع
2. إتمام عملية الدفع بنجاح
3. التحقق من وصول Callback
4. التحقق من حفظ البيانات في Firestore
5. التحقق من ظهور المعاملة في صفحة المعاملات

### سيناريو 2: معاملة فاشلة (Insufficient funds)
1. إنشاء جلسة دفع
2. محاولة الدفع مع رصيد غير كافي
3. التحقق من وصول Callback (إن وجد)
4. التحقق من حفظ البيانات في Firestore
5. جلب المعاملات من جيديا مباشرة
6. التحقق من ظهور المعاملة في صفحة المعاملات

### سيناريو 3: جلب المعاملات من جيديا
1. فتح صفحة المعاملات
2. النقر على "جلب من جيديا"
3. التحقق من جلب جميع المعاملات
4. التحقق من حفظ المعاملات الجديدة في Firestore
5. التحقق من تحديث المعاملات الموجودة

## استكشاف الأخطاء

### المشكلة: Callback لا يصل
- تحقق من Callback URL في جيديا
- استخدم ngrok للاختبار المحلي
- تحقق من Vercel Logs في الإنتاج

### المشكلة: Fetch Transactions يفشل
- تحقق من API endpoint الصحيح في الوثائق
- تحقق من Authentication
- تحقق من المتغيرات البيئية

### المشكلة: البيانات لا تظهر
- تحقق من Firestore
- تحقق من Console logs
- تحقق من الفلاتر في صفحة المعاملات

