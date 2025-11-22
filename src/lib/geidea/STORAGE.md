# Geidea Payment Storage - تخزين بيانات Geidea

## مكان التخزين

جميع البيانات الواردة من Geidea (نجاح/فشل) تُحفظ في:

**Collection:** `geidea_payments`  
**Document ID:** `orderId` من Geidea (أو `merchantReferenceId` كبديل)

## البيانات المحفوظة

كل callback من Geidea يُحفظ مع البيانات التالية:

### الحقول الأساسية
- `orderId`: معرف الطلب من Geidea (يُستخدم كـ document ID)
- `merchantReferenceId`: المعرف المرجعي للتاجر
- `geideaOrderId`: orderId من Geidea (للتوضيح)
- `ourMerchantReferenceId`: merchantReferenceId الذي أرسلناه (للتوضيح)
- `transactionId`: معرف المعاملة
- `status`: حالة الدفعة (`success`, `failed`, `pending`, `cancelled`)

### بيانات الاستجابة
- `responseCode`: كود الاستجابة
- `detailedResponseCode`: كود الاستجابة التفصيلي
- `responseMessage`: رسالة الاستجابة
- `detailedResponseMessage`: رسالة الاستجابة التفصيلية

### بيانات المبلغ
- `amount`: المبلغ
- `currency`: العملة (افتراضياً: EGP)

### بيانات العميل
- `customerEmail`: بريد العميل
- `customerName`: اسم العميل
- `customerPhone`: هاتف العميل

### بيانات إضافية
- `paidAt`: تاريخ ووقت الدفع
- `rawPayload`: البيانات الخام من Geidea
- `callbackReceivedAt`: تاريخ ووقت استقبال callback
- `paymentMethod`: طريقة الدفع (دائماً: `geidea`)
- `source`: مصدر البيانات (دائماً: `geidea_callback`)
- `createdAt`: تاريخ الإنشاء (Firestore timestamp)
- `updatedAt`: تاريخ التحديث (Firestore timestamp)

## مثال على البيانات المحفوظة

```json
{
  "orderId": "bea301b8-bd7e-47da-f914-08de1d1bfced",
  "merchantReferenceId": "EL7LM1763594235677AI83",
  "geideaOrderId": "bea301b8-bd7e-47da-f914-08de1d1bfced",
  "ourMerchantReferenceId": "EL7LM1763594235677AI83",
  "status": "failed",
  "responseCode": "999",
  "detailedResponseCode": "999",
  "responseMessage": "Insufficient funds",
  "detailedResponseMessage": "Insufficient funds",
  "amount": 100.00,
  "currency": "EGP",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerPhone": "+201234567890",
  "paidAt": null,
  "rawPayload": { /* البيانات الخام */ },
  "callbackReceivedAt": "2025-01-20T13:17:00.000Z",
  "paymentMethod": "geidea",
  "source": "geidea_callback",
  "createdAt": "2025-01-20T13:17:00.000Z",
  "updatedAt": "2025-01-20T13:17:00.000Z"
}
```

## كيفية الوصول للبيانات

### من الكود
```typescript
import { adminDb } from '@/lib/firebase/admin';

// البحث باستخدام orderId
const doc = await adminDb.collection('geidea_payments').doc(orderId).get();

// البحث باستخدام merchantReferenceId
const query = await adminDb
  .collection('geidea_payments')
  .where('merchantReferenceId', '==', merchantReferenceId)
  .limit(1)
  .get();
```

### من API
```bash
# GET /api/geidea/callback?orderId=bea301b8-bd7e-47da-f914-08de1d1bfced
# GET /api/geidea/callback?merchantReferenceId=EL7LM1763594235677AI83
```

## ملاحظات مهمة

1. **جميع البيانات تُحفظ**: نجاح وفشل على حد سواء
2. **Document ID**: يُستخدم `orderId` من Geidea كـ document ID (الأولوية)
3. **Merge Strategy**: إذا كان المستند موجوداً، يتم تحديثه (`merge: true`)
4. **Timestamp**: `createdAt` يُضاف فقط عند الإنشاء الأول
5. **Raw Payload**: جميع البيانات الخام من Geidea تُحفظ في `rawPayload`

