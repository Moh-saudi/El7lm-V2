# 🎯 تحديث العروض الترويجية - اللوجيك المتقدم

## 📅 التاريخ: 2025-12-16 | 1:54 PM

---

## ✅ **التحديثات الجديدة:**

### **1. نطاق العرض (Scope)** 🎯

```typescript
scope: 'all' | 'accountTypes' | 'specificAccounts' | 'countries'
```

#### **الخيارات:**
- **`all`** - للكل (عرض عام)
- **`accountTypes`** - لأنواع حسابات محددة
  - `targetAccountTypes: ['club', 'academy', 'trainer']`
- **`specificAccounts`** - لحسابات محددة بالـ ID
  - `targetAccountIds: ['userId1', 'userId2']`
- **`countries`** - لدول محددة
  - `targetCountries: ['EG', 'SA', 'AE']`

---

### **2. الباقات المطبقة** 📦

```typescript
applicablePlans: string[]
```

- **`[]`** (فارغ) = جميع الباقات
- **`['subscription_6months', 'subscription_annual']`** = باقات محددة

---

### **3. حدود الاستخدام (Usage Limits)** 🔢

```typescript
usageLimitType: 'unlimited' | 'total' | 'perUser'
```

#### **الأنواع:**

**a) غير محدود (`unlimited`)**:
```typescript
{
  usageLimitType: 'unlimited'
  // يمكن للجميع استخدامه بدون حد
}
```

**b) حد كلي (`total`)**:
```typescript
{
  usageLimitType: 'total',
  totalUsageLimit: 100,  // أول 100 استخدام فقط
  usageCount: 0          // العدد الحالي
}
```

**c) حد لكل مستخدم (`perUser`)**:
```typescript
{
  usageLimitType: 'perUser',
  perUserLimit: 1        // استخدام واحد لكل مستخدم
}
```

---

### **4. شروط إضافية** ✅

```typescript
interface PromotionalOffer {
  minPlayers?: number;   // حد أدنى لعدد اللاعبين
  minAmount?: number;    // حد أدنى للمبلغ (USD)
}
```

#### **أمثلة:**

**عرض للمجموعات الكبيرة:**
```typescript
{
  title: "خصم المجموعات",
  discountValue: 30,
  minPlayers: 10  // ✅ يجب أن يكون 10 لاعبين على الأقل
}
```

**عرض للمبالغ الكبيرة:**
```typescript
{
  title: "خصم VIP",
  discountValue: 500, // $500 خصم ثابت
  discountType: 'fixed',
  minAmount: 2000  // ✅ المبلغ الإجمالي يجب أن يتجاوز $2000
}
```

---

## 🎯 **أمثلة كاملة:**

### **مثال 1: عرض عام للكل** 🌍
```typescript
{
  title: "عرض العيد - خصم 25%",
  scope: 'all',
  discountType: 'percentage',
  discountValue: 25,
  usageLimitType: 'unlimited',
  applicablePlans: [],  // جميع الباقات
  minPlayers: 0,
  minAmount: 0
}
```

### **مثال 2: عرض للنوادي فقط** ⚽
```typescript
{
  title: "عرض النوادي - 40% خصم",
  scope: 'accountTypes',
  targetAccountTypes: ['club'],
  discountType: 'percentage',
  discountValue: 40,
  usageLimitType: 'unlimited',
  applicablePlans: ['subscription_6months', 'subscription_annual']
}
```

### **مثال 3: عرض محدود لمصر والسعودية** 🇪🇬🇸🇦
```typescript
{
  title: "عرض الخليج - خصم 35%",
  scope: 'countries',
  targetCountries: ['EG', 'SA'],
  discountType: 'percentage',
  discountValue: 35,
  usageLimitType: 'total',
  totalUsageLimit: 50,  // أول 50 فقط
  usageCount: 0
}
```

### **مثال 4: عرض VIP للمبالغ الكبيرة** 💎
```typescript
{
  title: "VIP - $500 خصم",
  scope: 'all',
  discountType: 'fixed',
  discountValue: 500,   // $500 خصم
  minAmount: 2000,      // الحد الأدنى $2000
  minPlayers: 20,       // 20 لاعب على الأقل
  usageLimitType: 'perUser',
  perUserLimit: 1       // مرة واحدة لكل مستخدم
}
```

###  **مثال 5: عرض لحسابات محددة** 🎯
```typescript
{
  title: "عرض شركاء استراتيجيين",
  scope: 'specificAccounts',
  targetAccountIds: ['partnerId1', 'partnerId2', 'partnerId3'],
  discountType: 'percentage',
  discountValue: 50,
  usageLimitType: 'unlimited'
}
```

---

## 🔄 **لوجيك التحقق (Validation Logic)**

عند تطبيق العرض في صفحة الدفع، يتم التحقق من:

```typescript
function isOfferApplicable(
  offer: PromotionalOffer,
  user: User,
  selectedPlayers: number,
  totalAmount: number,
  selectedPlanId: string
): boolean {
  
  // 1. التحقق من التواريخ
  const now = new Date();
  if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) {
    return false;
  }
  
  // 2. التحقق من حالة العرض
  if (!offer.isActive) return false;
  
  // 3. التحقق من النطاق (Scope)
  if (offer.scope === 'accountTypes') {
    if (!offer.targetAccountTypes?.includes(user.accountType)) {
      return false;
    }
  } else if (offer.scope === 'specificAccounts') {
    if (!offer.targetAccountIds?.includes(user.uid)) {
      return false;
    }
  } else if (offer.scope === 'countries') {
    if (!offer.targetCountries?.includes(user.country)) {
      return false;
    }
  }
  
  // 4. التحقق من الباقات
  if (offer.applicablePlans.length > 0) {
    if (!offer.applicablePlans.includes(selectedPlanId)) {
      return false;
    }
  }
  
  // 5. التحقق من حدود الاستخدام
  if (offer.usageLimitType === 'total') {
    if (offer.usageCount >= offer.totalUsageLimit) {
      return false; // وصل للحد الأقصى
    }
  } else if (offer.usageLimitType === 'perUser') {
    // التحقق من سجلات المستخدم (من Firebase)
    if (userAlreadyUsedOffer(user.uid, offer.id)) {
      return false;
    }
  }
  
  // 6. التحقق من الشروط الإضافية
  if (offer.minPlayers && selectedPlayers < offer.minPlayers) {
    return false;
  }
  
  if (offer.minAmount && totalAmount < offer.minAmount) {
    return false;
  }
  
  // ✅ العرض قابل للتطبيق
  return true;
}
```

---

## 📊 **الواجهة المحدثة (Interface):**

```typescript
interface PromotionalOffer {
    id: string;
    title: string;
    name: string;
    description: string;
    
    // الخصم
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    
    // التواريخ
    startDate: string | Date;
    endDate: string | Date;
    
    // الحالة
    isActive: boolean;
    
    // نطاق العرض (Scope) 🎯
    scope: 'all' | 'accountTypes' | 'specificAccounts' | 'countries';
    targetAccountTypes?: ('club' | 'academy' | 'trainer' | 'agent' | 'player')[];
    targetAccountIds?: string[];
    targetCountries?: string[];
    
    // الباقات المطبقة 📦
    applicablePlans: string[];
    
    // حدود الاستخدام 🔢
    usageLimitType: 'unlimited' | 'total' | 'perUser';
    totalUsageLimit?: number;
    perUserLimit?: number;
    usageCount?: number;
    
    // شروط إضافية ✅
    minPlayers?: number;
   minAmount?: number;
    
    // عرض
    displayBadge?: string;
    displayColor?: string;
}
```

---

## ✅ **الخطوة التالية:**

1. تحديث Modal لإضافة واجهة لكل هذه الخيارات
2. إضافة validation logic في صفحة الدفع
3. تطبيق الخصومات تلقائياً

---

**هذا اللوجيك المتقدم يعطيك تحكم كامل في العروض!** 🎯
