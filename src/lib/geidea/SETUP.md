# Geidea Setup Guide - دليل إعداد Geidea

## بيانات الاختبار (Test)

### Merchant Public Key
```
e510dca3-d113-47bf-b4b0-9b92bac661f6
```

### Gateway API Password
```
9b794cd5-9b42-4048-8e97-2c162f35710f
```

### Callback URL
```
https://www.el7lm.com/api/geidea/callback
```

### Base URL
```
https://api.merchant.geidea.net
```

## بيانات الإنتاج (Live)

### Merchant Public Key
```
3448c010-87b1-41e7-9771-cac444268cfb
```

### Gateway API Password
```
edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0
```

### Callback URL
```
https://www.el7lm.com/api/geidea/callback
```

### Base URL
```
https://api.merchant.geidea.net
```

## Environment Variables المطلوبة

يجب إضافة هذه المتغيرات في Vercel (أو .env.local للتطوير):

```bash
# Live Environment
GEIDEA_LIVE_MERCHANT_PUBLIC_KEY=3448c010-87b1-41e7-9771-cac444268cfb
GEIDEA_LIVE_API_PASSWORD=edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0
GEIDEA_LIVE_CALLBACK_URL=https://www.el7lm.com/api/geidea/callback
GEIDEA_LIVE_BASE_URL=https://api.merchant.geidea.net

# Test Environment
GEIDEA_TEST_MERCHANT_PUBLIC_KEY=e510dca3-d113-47bf-b4b0-9b92bac661f6
GEIDEA_TEST_API_PASSWORD=9b794cd5-9b42-4048-8e97-2c162f35710f
GEIDEA_TEST_CALLBACK_URL=https://www.el7lm.com/api/geidea/callback
GEIDEA_TEST_BASE_URL=https://api.merchant.geidea.net
```

## التحقق من الإعدادات

### 1. في Vercel
- اذهب إلى Project Settings → Environment Variables
- أضف جميع المتغيرات المذكورة أعلاه
- تأكد من أن Mode = Production (أو All)

### 2. في صفحة الإعدادات
- اذهب إلى `/dashboard/admin/geidea-settings`
- تحقق من أن جميع الإعدادات تظهر بشكل صحيح
- تأكد من أن Mode = Live

### 3. اختبار Callback
- تأكد من أن Callback URL في Geidea Dashboard هو: `https://www.el7lm.com/api/geidea/callback`
- جرب عملية دفع تجريبية
- تحقق من أن البيانات تُحفظ في `geidea_payments` collection

## ملاحظات مهمة

1. **Callback URL**: يجب أن يكون دائماً URL الإنتاج (`https://www.el7lm.com/api/geidea/callback`)
   - Geidea لا يقبل `localhost` في callbackUrl
   - الكود يستخدم URL الإنتاج تلقائياً حتى في التطوير

2. **Return URL**: يمكن أن يكون localhost في التطوير
   - في الإنتاج: `https://www.el7lm.com/dashboard/shared/bulk-payment?status=success`
   - في التطوير: `http://localhost:3000/dashboard/shared/bulk-payment?status=success`

3. **Mode**: يمكن التبديل بين Live و Test من صفحة الإعدادات
   - يتم حفظ Mode في Firestore: `geidea_settings/config`

## استكشاف الأخطاء

### خطأ "Invalid callback url"
- تأكد من أن callbackUrl هو URL الإنتاج (`https://www.el7lm.com/api/geidea/callback`)
- تأكد من أن Callback URL في Geidea Dashboard يطابق الكود

### خطأ "Geidea configuration missing"
- تأكد من إضافة Environment Variables في Vercel
- تأكد من أن Mode = Live في صفحة الإعدادات
- تحقق من أن المتغيرات موجودة: `GEIDEA_LIVE_MERCHANT_PUBLIC_KEY` و `GEIDEA_LIVE_API_PASSWORD`

### البيانات لا تُحفظ
- تحقق من أن Callback URL في Geidea Dashboard صحيح
- تحقق من logs في Vercel
- تحقق من `geidea_payments` collection في Firestore

