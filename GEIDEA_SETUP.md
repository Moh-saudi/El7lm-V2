# إعداد Geidea للدفع - HPP Checkout v2

## المتطلبات

لتشغيل نظام الدفع مع Geidea HPP Checkout v2، تحتاج إلى الحصول على بيانات الاعتماد التالية من فريق دعم Geidea:

### متغيرات البيئة المطلوبة

```env
# Geidea Payment Gateway Configuration - HPP Checkout v2
GEIDEA_MERCHANT_PUBLIC_KEY=your_merchant_public_key_here
GEIDEA_API_PASSWORD=your_api_password_here
GEIDEA_BASE_URL=https://api.merchant.geidea.net
GEIDEA_ENVIRONMENT=production
```

## خطوات الإعداد

### 1. الحصول على بيانات الاعتماد

- تواصل مع فريق دعم Geidea
- اطلب بيانات الإنتاج (Production credentials)
- احصل على:
  - `MERCHANT_PUBLIC_KEY`: المفتاح العام للتاجر
  - `API_PASSWORD`: كلمة مرور API
  - `BASE_URL`: رابط API (عادة `https://api.merchant.geidea.net`)

### 2. إعداد متغيرات البيئة

#### في Vercel:
1. اذهب إلى إعدادات المشروع في Vercel
2. اختر "Environment Variables"
3. أضف المتغيرات التالية:
   - `GEIDEA_MERCHANT_PUBLIC_KEY`
   - `GEIDEA_API_PASSWORD`
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
- تأكد من استخدام `GEIDEA_MERCHANT_PUBLIC_KEY` و `GEIDEA_API_PASSWORD`

#### خطأ "Geidea API connection failed"
- تحقق من اتصال الإنترنت
- تأكد من صحة `GEIDEA_BASE_URL` (يجب أن يكون `https://api.merchant.geidea.net`)
- تواصل مع دعم Geidea إذا استمر الخطأ

#### خطأ "Geidea API error"
- تحقق من صحة `GEIDEA_API_PASSWORD`
- تأكد من أن `GEIDEA_MERCHANT_PUBLIC_KEY` صحيح
- راجع سجلات API للحصول على تفاصيل الخطأ
- تحقق من `responseCode` و `detailedResponseCode` في الاستجابة

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

## Geidea HPP Checkout v2

هذا التكامل يستخدم **Geidea HPP Checkout v2** الذي يوفر:

### المميزات:
- ✅ **واجهة دفع مدمجة** - لا حاجة لصفحات خارجية
- ✅ **دعم جميع طرق الدفع** - بطاقات ائتمان، مدى، Apple Pay، Google Pay
- ✅ **3D Secure 2.0** - أمان عالي للمعاملات
- ✅ **دعم متعدد العملات** - SAR, EGP, AED, USD, EUR
- ✅ **واجهة قابلة للتخصيص** - تخصيص الألوان والشعار
- ✅ **دعم اللغة العربية** - واجهة باللغة العربية

### طرق العرض:
1. **Popup Mode** - نافذة منبثقة
2. **Drop-in Mode** - مدمج في الصفحة
3. **Redirection Mode** - إعادة توجيه لصفحة منفصلة

## ملاحظات مهمة

- استخدم `GEIDEA_ENVIRONMENT=production` للإنتاج
- تأكد من أن جميع URLs صحيحة ومتاحة
- احتفظ بمفاتيح API آمنة ولا تشاركها
- استخدم HTTPS فقط للـ callback URLs
- تأكد من صحة التوقيع (signature) في كل طلب