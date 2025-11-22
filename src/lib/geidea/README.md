# Geidea Payment Library - المكتبة المركزية

هذه المكتبة المركزية توفر واجهة موحدة لاستخدام Geidea في جميع أنحاء التطبيق.

## البنية

```
src/lib/geidea/
├── config.ts          # إعدادات Geidea (live/test mode, API keys)
├── signature.ts       # توليد التوقيع (HMAC-SHA256)
├── client.ts          # عميل Geidea لإنشاء جلسات الدفع
├── callback-handler.ts # معالج callbacks من Geidea
└── index.ts           # تصدير جميع الوظائف
```

## الاستخدام

### 1. إنشاء جلسة دفع (من API Route)

```typescript
import { createGeideaSession } from '@/lib/geidea/client';

const result = await createGeideaSession({
  amount: 100,
  currency: 'EGP',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  merchantReferenceId: 'ORDER_123',
  returnUrl: 'https://example.com/success',
  callbackUrl: 'https://example.com/api/geidea/callback',
  metadata: { tournamentId: '123' }, // بيانات إضافية
});
```

### 2. معالجة Callback (في API Route)

```typescript
import { processGeideaCallback } from '@/lib/geidea/callback-handler';

const processed = await processGeideaCallback(payload);
// يتم حفظ البيانات تلقائياً في Firestore (geidea_payments collection)
```

## المميزات

✅ **مركزي**: مكتبة واحدة لجميع عمليات Geidea  
✅ **ذكي**: يعمل مع جميع الصفحات (بطولات، دفع جماعي، إلخ)  
✅ **موثوق**: يضمن تسجيل جميع البيانات (نجاح/فشل)  
✅ **نظيف**: بدون تكرارات، سهل الصيانة  

## Callback Route

الـ callback route (`/api/geidea/callback`) يستخدم `processGeideaCallback` تلقائياً لحفظ جميع البيانات في Firestore.

## Create Session Route

الـ create session route (`/api/geidea/create-session`) يستخدم `createGeideaSession` لإنشاء جلسات الدفع.

