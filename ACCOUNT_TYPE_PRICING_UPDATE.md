# ✅ تحديث: إضافة أسعار أنواع الحسابات

## 📅 التاريخ: 2025-12-16 | 12:01 PM

##  🎯 الهدف
إضافة أسعار مخصصة لكل نوع حساب (club, academy, trainer, agent, player)

---

## ✅ التحديثات المنفذة

### 1️⃣ **تحديث Types** ✅
**الملف**: `src/types/pricing.ts`

**التعديلات**:
```typescript
export interface AccountTypePricing {
    original_price?: number;
    price?: number;
    discount_percentage?: number;
    active: boolean;
}

export interface SubscriptionPlan {
    // ... الحقول الموجودة
    
    // أسعار مخصصة حسب الدولة
    overrides?: {
        [countryCode: string]: CountryOverride;
    };
    
    // أسعار مخصصة حسب نوع الحساب ← جديد!
    accountTypeOverrides?: {
        club?: AccountTypePricing;
        academy?: AccountTypePricing;
        trainer?: AccountTypePricing;
        agent?: AccountTypePricing;
        player?: AccountTypePricing;
    };
}

export type AccountType = 'club' | 'academy' | 'trainer' | 'agent' | 'player';
```

---

### 2️⃣ **تحديث PricingService** ✅
**الملف**: `src/lib/pricing/pricing-service.ts`

**التعديلات**:
```typescript
resolvePrice(
    plan: SubscriptionPlan,
    userCountryCode: string,
    targetCurrency: string,
    rates: any,
    accountType?: 'club' | 'academy' | 'trainer' | 'agent' | 'player' ← معامل جديد!
): PriceResult {
    // الأولوية:
    // 1️⃣ أسعار نوع الحساب (أعلى أولوية)
    // 2️⃣ أسعار الدولة
    // 3️⃣ السعر الأساسي
}
```

**كيف يعمل**:
1. إذا كان accountType محدد (مثلاً 'club'):
   - يتحقق من وجود سعر مخصص أو نسبة خصم
   - يطبق التخصيص على السعر الأساسي
2. ثم يتحقق من أسعار الدولة
3. يطبق خصم نوع الحساب على أسعار الدولة أيضاً
4. النتيجة: سعر نهائي يأخذ كل التخصيصات في الاعتبار

---

### 3️⃣ **تبويب جديد في صفحة الأدمن** ✅
**الملف**: `src/app/dashboard/admin/pricing-management/page.tsx`
**المكون الجديد**: `src/components/admin/pricing/AccountTypePricingTab.tsx`

**المميزات**:
- ✅ جدول لجميع أنواع الحسابات (⚽ النوادي، 🏫 الأكاديميات، 👨‍🏫 المدربين، 💼 الوكلاء، 🏃 اللاعبين)
- ✅ إمكانية تحديد سعر مخصص لكل نوع
- ✅ إمكانية تحديد نسبة خصم بدلاً من السعر
- ✅ تفعيل/تعطيل لكل نوع
- ✅ حفظ/حذف التخصيصات
- ✅ نموذج تحرير منبثق جميل

---

## 🚀 كيفية الاستخدام

### **للأدمن**:

1. **افتح**: `/dashboard/admin/pricing-management`

2. **اذهب إلى تبويب**: "أسعار أنواع الحسابات"

3. **اختر الباقة**: (3 شهور، 6 شهور، سنة)

4. **أضف/عدّل سعر لنوع حساب**:
   ```
   مثال 1: سعر مخصص
   - النوادي: $25 بدلاً من $35
   
   مثال 2: نسبة خصم
   - الأكاديميات: خصم 20%
   - سيُطبق تلقائياً على السعر الأساسي وأسعار الدول
   ```

5. **احفظ** → يُطبق فوراً!

---

## 📊 **أمثلة عملية**

### **مثال 1: نادي من مصر**
```typescript
السعر الأساسي: $35
خصم النوادي: 20%
سعر مصر: 900 EGP

الحساب:
1. سعر مصر: 900 EGP
2. تطبيق خصم النوادي: 900 - (900 × 20%) = 720 EGP
3. السعر النهائي: 720 EGP ✅
```

### **مثال 2: أكاديمية من السعودية**
```typescript
السعر الأساسي: $35
سعر الأكاديميات المخصص: $25
سعر السعودية: 120 SAR

الحساب:
1. سعر السعودية: 120 SAR
2. لكن الأكاديميات لها سعر مخصص: $25
3. تحويل $25 إلى SAR: ~94 SAR
4. السعر النهائي: 94 SAR ✅
```

### **مثال 3: لاعب من قطر (لا توجد أسعار مخصصة)**
```typescript
السعر الأساسي: $35
لا توجد أسعار للاعبين
لا توجد أسعار لقطر

الحساب:
1. استخدام السعر الأساسي: $35
2. تحويل إلى QAR: $35 × 3.64 = 127 QAR
3. السعر النهائي: 127 QAR ✅
```

---

## 🎯 **الخلاصة**

### **نظام الأولويات**:
```
1. أسعار نوع الحساب (club, academy, إلخ)
   ↓
2. أسعار الدولة (EG, SA, إلخ)
   ↓
3. السعر الأساسي (USD)
```

### **الملفات المعدلة**:
1. ✅ `src/types/pricing.ts` - إضافة types جديدة
2. ✅ `src/lib/pricing/pricing-service.ts` - تحديث resolvePrice
3. ✅ `src/app/dashboard/admin/pricing-management/page.tsx` - إضافة تبويب
4. ✅ `src/components/admin/pricing/AccountTypePricingTab.tsx` - المكون الجديد (353 سطر)

---

## 🚀 **الخطوات التالية**

1. **اختبار الصفحة**: تأكد من أن التبويب يظهر ويعمل
2. **إضافة بيانات تجريبية**: جرّب إضافة أسعار لكل نوع
3. **اختبار صفحة البلك بايمنت**: تأكد من أن الأسعار تُطبق بشكل صحيح

---

**🎉 النظام جاهز لإدارة أسعار مخصصة لكل نوع حساب!**
