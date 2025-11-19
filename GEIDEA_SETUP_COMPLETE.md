# ✅ إعدادات جيديا - التحقق النهائي

## 📋 البيانات المطلوبة (من لوحة تحكم جيديا)

### 1. Merchant Public Key
```
3448c010-87b1-41e7-9771-cac444268cfb
```

### 2. Gateway API Password
```
edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0
```

### 3. Callback URL (في لوحة تحكم جيديا)
```
https://www.el7lm.com/api/geidea/callback
```

## ✅ التحقق من الكود مقابل الوثائق الرسمية

### المرجع: [Geidea HPP Checkout v2 Documentation](https://docs.geidea.net/docs/geidea-checkout-v2)

### 1. Create Session API ✅

#### Endpoint
- **الوثائق:** `https://api.merchant.geidea.net/payment-intent/api/v2/direct/session`
- **الكود:** ✅ `src/app/api/geidea/create-session/route.ts` (السطر 151)

#### Authentication
- **الوثائق:** Basic Authentication مع `merchantPublicKey:apiPassword`
- **الكود:** ✅ صحيح (السطر 175)
```typescript
const authString = Buffer.from(`${geideaConfig.merchantPublicKey}:${geideaConfig.apiPassword}`).toString('base64');
```

#### Signature Generation
- **الوثائق:** 
  - البيانات: `merchantPublicKey + amount (2 decimals) + currency + merchantReferenceId + timestamp`
  - Algorithm: HMAC SHA256
  - Encoding: Base64
- **الكود:** ✅ صحيح تماماً (السطر 267-286)
```typescript
const amountStr = amount.toFixed(2);
const data = `${merchantPublicKey}${amountStr}${currency}${merchantReferenceId}${timestamp}`;
const hash = crypto.createHmac('sha256', apiPassword).update(data).digest('base64');
```

#### Timestamp Format
- **الوثائق:** `Y/m/d H:i:s` (مثال: `2024/01/15 14:30:45`)
- **الكود:** ✅ صحيح (السطر 54)
```typescript
const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
```

#### Required Parameters
- **الوثائق:** amount, currency, timestamp, merchantReferenceId, signature, callbackUrl
- **الكود:** ✅ جميعها موجودة (السطر 134-148)

#### Optional Parameters
- **الوثائق:** language, returnUrl, customer
- **الكود:** ✅ جميعها موجودة (السطر 141-147)

### 2. Callback URL ✅

#### URL Format
- **الوثائق:** يجب أن يكون HTTPS و URL مطلق
- **الكود:** ✅ `https://www.el7lm.com/api/geidea/callback` (السطر 103)

#### Validation
- **الكود:** ✅ يتحقق من أن URL مطلق (السطر 154-156)
- **الكود:** ✅ يتحقق من عدم وجود localhost (السطر 162-164)

### 3. Callback API ✅

#### Endpoint
- **الوثائق:** يجب أن يكون متاحاً على `https://www.el7lm.com/api/geidea/callback`
- **الكود:** ✅ موجود في `src/app/api/geidea/callback/route.ts`

#### Methods Supported
- **الوثائق:** POST, GET, OPTIONS
- **الكود:** ✅ جميعها مدعومة

#### CORS Headers
- **الكود:** ✅ موجودة في جميع الاستجابات

## 🔧 الإعدادات المطلوبة في Vercel

### المتغيرات البيئية (Environment Variables)

يجب إضافة المتغيرات التالية في Vercel Dashboard:

```bash
GEIDEA_MERCHANT_PUBLIC_KEY=3448c010-87b1-41e7-9771-cac444268cfb
GEIDEA_API_PASSWORD=edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0
NEXT_PUBLIC_BASE_URL=https://www.el7lm.com
```

### خطوات الإضافة في Vercel:

1. افتح Vercel Dashboard
2. اذهب إلى Project Settings > Environment Variables
3. أضف المتغيرات الثلاثة أعلاه
4. تأكد من أنها مضبوطة لجميع البيئات (Production, Preview, Development)
5. أعد نشر المشروع (Redeploy)

## ✅ التحقق النهائي

### 1. التحقق من المتغيرات البيئية
- [ ] `GEIDEA_MERCHANT_PUBLIC_KEY` موجود في Vercel
- [ ] `GEIDEA_API_PASSWORD` موجود في Vercel
- [ ] `NEXT_PUBLIC_BASE_URL` موجود في Vercel (أو سيستخدم الافتراضي)

### 2. التحقق من Callback URL في جيديا
- [ ] Callback URL مضبوط في لوحة تحكم جيديا على: `https://www.el7lm.com/api/geidea/callback`
- [ ] Callback URL يستخدم HTTPS (ليس HTTP)

### 3. اختبار API
- [ ] اختبار Create Session API
- [ ] اختبار Callback API
- [ ] اختبار عملية دفع تجريبية

## 📝 ملاحظات مهمة

1. **API Password سري** - لا تعرضه في الكود أو في logs العامة
2. **Callback URL يجب أن يكون HTTPS** - جيديا لا يقبل HTTP في الإنتاج
3. **Signature يجب أن يكون صحيحاً** - أي خطأ سيؤدي إلى رفض الطلب
4. **Timestamp يجب أن يكون في الوقت الفعلي** - لا تستخدم timestamps قديمة
5. **merchantReferenceId يجب أن يكون فريداً** - الكود ينشئه تلقائياً

## 🎯 الخلاصة

✅ **جميع الإعدادات في الكود صحيحة ومطابقة 100% للوثائق الرسمية من جيديا**

**ما تم التحقق منه:**
- ✅ Endpoint صحيح
- ✅ Authentication صحيح
- ✅ Signature generation صحيح
- ✅ Timestamp format صحيح
- ✅ Parameters صحيحة
- ✅ Callback URL صحيح
- ✅ Callback API جاهز

**ما يجب فعله:**
1. ✅ إضافة المتغيرات البيئية في Vercel
2. ✅ التأكد من أن Callback URL مضبوط في لوحة تحكم جيديا
3. ✅ اختبار عملية دفع تجريبية

---

**تاريخ التحقق:** $(date)
**المرجع:** [Geidea HPP Checkout v2 Documentation](https://docs.geidea.net/docs/geidea-checkout-v2)

