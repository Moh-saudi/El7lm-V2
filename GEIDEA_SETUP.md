# إعداد Geidea للدفع

## المتطلبات

لتشغيل نظام الدفع مع Geidea، تحتاج إلى الحصول على بيانات الاعتماد التالية من فريق دعم Geidea:

### متغيرات البيئة المطلوبة

```env
# Geidea Payment Gateway Configuration
GEIDEA_MERCHANT_ID=your_merchant_id_here
GEIDEA_API_KEY=your_api_key_here
GEIDEA_BASE_URL=https://api.geidea.net
GEIDEA_ENVIRONMENT=sandbox
```

## خطوات الإعداد

### 1. الحصول على بيانات الاعتماد

- تواصل مع فريق دعم Geidea
- اطلب بيانات بيئة الاختبار (Sandbox)
- احصل على:
  - `MERCHANT_ID`: معرف التاجر
  - `API_KEY`: مفتاح API
  - `BASE_URL`: رابط API (عادة `https://api.geidea.net`)

### 2. إعداد متغيرات البيئة

#### في Vercel:
1. اذهب إلى إعدادات المشروع في Vercel
2. اختر "Environment Variables"
3. أضف المتغيرات التالية:
   - `GEIDEA_MERCHANT_ID`
   - `GEIDEA_API_KEY`
   - `GEIDEA_BASE_URL`
   - `GEIDEA_ENVIRONMENT`

#### في التطوير المحلي:
1. أنشئ ملف `.env.local` في جذر المشروع
2. أضف المتغيرات المطلوبة

### 3. اختبار التكامل

بعد إعداد متغيرات البيئة:

1. **اختبار إنشاء جلسة الدفع:**
   ```bash
   curl -X POST https://your-domain.com/api/geidea/create-session \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 100,
       "currency": "SAR",
       "orderId": "test_order_123",
       "customerEmail": "test@example.com",
       "customerName": "Test Customer"
     }'
   ```

2. **التحقق من الاستجابة:**
   - يجب أن تحصل على `sessionId` و `paymentUrl`
   - يجب أن تكون الاستجابة تحتوي على `success: true`

### 4. معالجة الأخطاء الشائعة

#### خطأ "Geidea configuration missing"
- تأكد من إعداد جميع متغيرات البيئة المطلوبة
- تحقق من أن المتغيرات لا تحتوي على مسافات إضافية

#### خطأ "Geidea API connection failed"
- تحقق من اتصال الإنترنت
- تأكد من صحة `GEIDEA_BASE_URL`
- تواصل مع دعم Geidea إذا استمر الخطأ

#### خطأ "Geidea API error"
- تحقق من صحة `GEIDEA_API_KEY`
- تأكد من أن `GEIDEA_MERCHANT_ID` صحيح
- راجع سجلات API للحصول على تفاصيل الخطأ

## API Endpoints

### إنشاء جلسة الدفع
```
POST /api/geidea/create-session
```

**المعاملات المطلوبة:**
- `amount`: المبلغ (رقم)
- `currency`: العملة (مثل "SAR", "USD")
- `orderId`: معرف الطلب (نص فريد)
- `customerEmail`: بريد العميل الإلكتروني

**المعاملات الاختيارية:**
- `customerName`: اسم العميل

### معالجة Callback
```
POST /api/geidea/callback
```

### معالجة Webhook
```
POST /api/geidea/webhook
```

### الحصول على الإعدادات
```
GET /api/geidea/config
```

## الدعم

إذا واجهت أي مشاكل:

1. راجع سجلات التطبيق
2. تحقق من متغيرات البيئة
3. تواصل مع دعم Geidea
4. راجع وثائق Geidea الرسمية

## ملاحظات مهمة

- استخدم `GEIDEA_ENVIRONMENT=sandbox` للاختبار
- استخدم `GEIDEA_ENVIRONMENT=production` للإنتاج
- تأكد من أن جميع URLs صحيحة ومتاحة
- احتفظ بمفاتيح API آمنة ولا تشاركها