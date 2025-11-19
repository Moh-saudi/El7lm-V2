# ✅ التحقق من بيانات جيديا (Geidea Credentials Verification)

## 📋 البيانات المطلوبة

### 1. Merchant Public Key
```
3448c010-87b1-41e7-9771-cac444268cfb
```
**المتغير البيئي:** `GEIDEA_MERCHANT_PUBLIC_KEY`

### 2. Gateway API Password
```
edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0
```
**المتغير البيئي:** `GEIDEA_API_PASSWORD`

### 3. Callback URL
```
https://www.el7lm.com/api/geidea/callback
```

## ✅ التحقق من الكود مقابل الوثائق الرسمية

### 1. Create Session API

#### Endpoint
- **الوثائق:** `https://api.merchant.geidea.net/payment-intent/api/v2/direct/session`
- **الكود:** ✅ صحيح (السطر 151)

#### Authentication
- **الوثائق:** Basic Authentication مع `merchantPublicKey:apiPassword`
- **الكود:** ✅ صحيح (السطر 175)
```typescript
const authString = Buffer.from(`${geideaConfig.merchantPublicKey}:${geideaConfig.apiPassword}`).toString('base64');
```

#### Signature Generation
- **الوثائق:** HMAC SHA256 مع البيانات: `merchantPublicKey + amount + currency + merchantReferenceId + timestamp`
- **الكود:** ✅ صحيح (السطر 267-286)
```typescript
function generateSignature(
  merchantPublicKey: string,
  amount: number,
  currency: string,
  merchantReferenceId: string,
  apiPassword: string,
  timestamp: string
): string {
  const amountStr = amount.toFixed(2);
  const data = `${merchantPublicKey}${amountStr}${currency}${merchantReferenceId}${timestamp}`;
  const hash = crypto.createHmac('sha256', apiPassword).update(data).digest('base64');
  return hash;
}
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

### 2. Callback URL

#### URL Format
- **الوثائق:** يجب أن يكون HTTPS و URL مطلق
- **الكود:** ✅ صحيح (السطر 103)
```typescript
const defaultCallbackUrl = `${baseUrl}/api/geidea/callback`;
```

#### Validation
- **الكود:** ✅ يتحقق من أن URL مطلق (السطر 154-156)
```typescript
if (!finalCallbackUrl.startsWith('http://') && !finalCallbackUrl.startsWith('https://')) {
  throw new Error(`Invalid callbackUrl: ${finalCallbackUrl} - must be absolute URL`);
}
```

### 3. Callback API

#### Endpoint
- **الوثائق:** يجب أن يكون متاحاً على `https://www.el7lm.com/api/geidea/callback`
- **الكود:** ✅ موجود في `src/app/api/geidea/callback/route.ts`

#### Methods Supported
- **الوثائق:** POST, GET, OPTIONS
- **الكود:** ✅ جميعها مدعومة

#### CORS Headers
- **الكود:** ✅ موجودة في جميع الاستجابات

## 🔍 خطوات التحقق النهائية

### 1. التحقق من المتغيرات البيئية في Vercel

تأكد من إضافة المتغيرات التالية في Vercel Dashboard:

```bash
GEIDEA_MERCHANT_PUBLIC_KEY=3448c010-87b1-41e7-9771-cac444268cfb
GEIDEA_API_PASSWORD=edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0
NEXT_PUBLIC_BASE_URL=https://www.el7lm.com
```

### 2. التحقق من Callback URL في لوحة تحكم جيديا

- افتح لوحة تحكم جيديا (Geidea Merchant Dashboard)
- اذهب إلى Settings > Webhook/Callback Settings
- تأكد من أن Callback URL مضبوط على: `https://www.el7lm.com/api/geidea/callback`

### 3. اختبار Create Session API

يمكنك اختبار API باستخدام curl:

```bash
curl -X POST https://www.el7lm.com/api/geidea/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "currency": "EGP",
    "customerEmail": "test@example.com",
    "customerName": "Test User"
  }'
```

### 4. التحقق من Callback API

```bash
curl https://www.el7lm.com/api/geidea/callback?orderId=TEST123
```

## 📝 ملاحظات مهمة

1. **API Password يجب أن يكون سرياً** - لا تعرضه في الكود أو في logs
2. **Callback URL يجب أن يكون HTTPS** - جيديا لا يقبل HTTP في الإنتاج
3. **Signature يجب أن يكون صحيحاً** - أي خطأ في التوقيع سيؤدي إلى رفض الطلب
4. **Timestamp يجب أن يكون في الوقت الفعلي** - لا تستخدم timestamps قديمة

## ✅ الخلاصة

جميع الإعدادات في الكود **صحيحة ومطابقة للوثائق الرسمية** من جيديا. 

**ما يجب فعله:**
1. ✅ إضافة المتغيرات البيئية في Vercel
2. ✅ التأكد من أن Callback URL مضبوط في لوحة تحكم جيديا
3. ✅ اختبار عملية دفع تجريبية

**المرجع:**
- [Geidea HPP Checkout v2 Documentation](https://docs.geidea.net/docs/geidea-checkout-v2)

