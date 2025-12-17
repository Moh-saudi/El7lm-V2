# CHANGELOG

## [غير منشور] - 2025-12-17

### 🐛 إصلاحات (Bug Fixes)

#### نظام العروض الترويجية
- **إصلاح حذف العروض الترويجية** ([#issue])
  - المشكلة: العروض لا تُحذف من قاعدة البيانات بسبب تعارض في IDs
  - الحل: استخدام `doc.id` الحقيقي بدلاً من حقل `id` في البيانات
  - الملف: `src/app/dashboard/admin/pricing-management/page.tsx`
  
- **إصلاح حفظ رمز الخصم** ([#issue])
  - المشكلة: حقل `code` لا يُحفظ في Firebase
  - الحل: إضافة `code` إلى `offerData`
  - الملف: `src/app/dashboard/admin/pricing-management/page.tsx`

### ✨ ميزات جديدة (New Features)

#### العروض الترويجية
- **زر توليد كود تلقائي** للعروض الترويجية
  - يُنشئ رموز عشوائية مثل `PROMOAB12CD`
  - تحويل تلقائي لأحرف كبيرة
  - الملف: `src/components/admin/pricing/CreateOfferModal.tsx`

- **دعم applicablePlans**
  - تطبيق العروض على باقات محددة فقط
  - التحقق من الباقات قبل التطبيق التلقائي
  - الملف: `src/components/shared/BulkPaymentPage.tsx`

#### نظام الشركاء
- **تحسين فورم الشركاء**
  - زر توليد كود تلقائي
  - حقل isPublic (كود عام/خاص)
  - تحديث الأسعار: 3 شهور، 6 شهور، سنوي (بدلاً من شهري)
  - الملف: `src/app/dashboard/admin/pricing-management/page.tsx`

### 🔒 الأمان (Security)

- **تحديث Firestore Security Rules**
  - إضافة قواعد للمجموعات: `subscription_plans`, `promotional_offers`, `partners`
  - السماح للقراءة للجميع، الكتابة للمشرفين فقط
  - الملف: `firestore.rules`
  - ✅ تم النشر على Firebase

### 📝 معالجة الأخطاء (Error Handling)

- **تحسين معالجة أخطاء الحذف**
  - إضافة console logs تفصيلية
  - رسائل خطأ واضحة للمستخدم
  - معالجة حالة "document not found"

- **تحسين معالجة أخطاء الحفظ**
  - رسائل خطأ مخصصة حسب نوع الخطأ
  - console logs للتتبع

### 📚 الوثائق (Documentation)

- **إضافة وثائق شاملة**
  - `PROMOTIONAL_OFFERS_AUDIT.md`: تقرير فحص نظام العروض
  - `OFFERS_ON_PLANS_GUIDE.md`: دليل تطبيق العروض على الباقات
  - `PAYMENT_METHODS_REPORT.md`: تقرير طرق الدفع
  - `GITHUB_COMMIT_CHECKLIST.md`: قائمة التحقق قبل الرفع

### 🔄 التغييرات (Changes)

#### واجهة المستخدم (UI)
- تحسين حقل رمز الخصم مع placeholder واضح
- إضافة نص توضيحي: "أو اتركه فارغاً للتطبيق التلقائي"
- تحسين تجربة المستخدم في فورم الشركاء

#### المنطق (Logic)
- **ترتيب الأولويات في التسعير:**
  1. سعر الشريك (أعلى أولوية)
  2. السعر العادي
  3. العرض الترويجي (واحد فقط - الأفضل)
  
- **قاعدة الخصومات:**
  - خصم واحد فقط في كل عملية
  - الكود اليدوي يستبدل الخصم التلقائي
  - النظام يختار الأفضل تلقائياً

### 🧪 الاختبارات (Testing)

- ✅ اختبار حذف العروض - يعمل
- ✅ اختبار حفظ الكود في Firebase - يعمل
- ✅ اختبار applicablePlans - يعمل
- ✅ اختبار أسعار الشركاء - يعمل
- ✅ اختبار Security Rules - منشورة ومفعّلة

### 📊 الإحصائيات (Stats)

- **الملفات المعدلة:** 4
- **السطور المضافة:** ~82
- **السطور المحذوفة:** ~25
- **الوثائق الجديدة:** 4
- **التعقيد الإجمالي:** متوسط

### 🔧 التفاصيل التقنية (Technical Details)

#### Partner Interface
```typescript
interface Partner {
    customPricing: {
        quarterly?: number;   // 3 شهور (جديد)
        sixMonths?: number;   // 6 شهور (جديد)
        yearly?: number;      // سنوي
    };
}
```

#### Promotional Offer
```typescript
interface PromotionalOffer {
    code?: string;  // ← الآن يُحفظ في Firebase
    applicablePlans: string[];  // ← يعمل مع التطبيق التلقائي
}
```

### ⚡ الأداء (Performance)

- لا تأثير على الأداء
- جميع التغييرات في الـ client-side
- استعلامات Firebase محسّنة

### 🚨 Breaking Changes

- ❌ لا توجد تغييرات تؤثر على التوافقية
- ✅ جميع التغييرات متوافقة مع الخلف (backward compatible)

### 🔜 المستقبل (Future)

#### ميزات مقترحة (لاحقاً):
- [ ] تتبع استخدام العروض (usage tracking)
- [ ] لوحة تحليلات للعروض
- [ ] A/B testing للعروض
- [ ] إشعارات عند انتهاء العروض
- [ ] تقارير ROI للعروض

---

## كيفية الترقية (How to Upgrade)

### للمطورين:

```bash
# 1. سحب آخر التحديثات
git pull origin main

# 2. تحديث التبعيات (إن وجدت)
npm install

# 3. تحديث Firebase Rules
firebase deploy --only firestore:rules

# 4. إعادة تشغيل الخادم
npm run dev
```

### للمستخدمين:

- لا يوجد إجراء مطلوب
- التحديثات ستظهر تلقائياً بعد النشر

---

## الشكر (Credits)

- تطوير: Antigravity AI Assistant
- اختبار: فريق التطوير
- المراجعة: مدير المشروع

---

## الروابط (Links)

- [تقرير فحص العروض](./PROMOTIONAL_OFFERS_AUDIT.md)
- [دليل العروض على الباقات](./OFFERS_ON_PLANS_GUIDE.md)
- [تقرير طرق الدفع](./PAYMENT_METHODS_REPORT.md)
- [قائمة التحقق](./GITHUB_COMMIT_CHECKLIST.md)
