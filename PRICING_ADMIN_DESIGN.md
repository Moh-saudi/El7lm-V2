# 🎯 نظام إدارة الأسعار والعروض الترويجية

## 📋 نظرة عامة

نظام متكامل لإدارة الأسعار والخصومات والعروض الترويجية مع دعم:
- أسعار أساسية بالدولار لجميع الباقات
- أسعار مخصصة حسب الدولة
- خصومات خاصة للجهات الشريكة
- عروض ترويجية محددة المدة
- دعم متعدد المستخدمين (Admin, Club, Academy)

---

## 🏗️ هيكلة قاعدة البيانات

### 1. Collection: `subscription_plans`
```typescript
{
  id: string;
  name: string; // "Monthly", "Quarterly", "Yearly"
  key: 'monthly' | 'quarterly' | 'yearly';
  basePrice: number; // السعر الأساسي بالدولار
  currency: 'USD';
  duration: number; // بالأيام
  features: Feature[]; // الميزات الأساسية
  bonusFeatures: Feature[]; // الميزات الإضافية
  isActive: boolean;
  displayOrder: number;
  
  // تواريخ
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Feature {
  id: string;
  name: string;
  description?: string;
  included: boolean;
}
```

### 2. Collection: `pricing_overrides`
```typescript
{
  id: string;
  planKey: 'monthly' | 'quarterly' | 'yearly';
  
  // تخصيص حسب الدولة
  countryCode?: string; // 'EG', 'SA', 'AE', etc.
  customPrice?: number;
  customCurrency?: string;
  
  // تخصيص حسب الجهة
  organizationType?: 'club' | 'academy' | 'school';
  organizationId?: string; // معرف الجهة المحددة
  
  // الخصم
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  
  // حالة التفعيل
  isActive: boolean;
  
  // ملاحظات
  notes?: string;
  createdBy: string;
  
  // تواريخ
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3. Collection: `promotional_offers`
```typescript
{
  id: string;
  
  // معلومات العرض
  name: string; // "عرض رمضان 2024"
  description: string;
  code?: string; // كود خصم اختياري
  
  // نوع العرض
  offerType: 'flash_sale' | 'seasonal' | 'partnership' | 'early_bird';
  
  // الباقات المشمولة
  applicablePlans: string[]; // ['monthly', 'quarterly', 'yearly']
  
  // الخصم
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number; // الحد الأقصى للخصم
  
  // الفترة الزمنية
  startDate: Timestamp;
  endDate: Timestamp;
  timezone: string; // 'Africa/Cairo'
  
  // الشروط
  conditions: {
    minPlayers?: number; // الحد الأدنى للاعبين
    maxPlayers?: number; // الحد الأقصى للاعبين
    userTypes?: ('admin' | 'club' | 'academy')[]; // أنواع المستخدمين المؤهلين
    countries?: string[]; // الدول المؤهلة
    newUsersOnly?: boolean; // للمستخدمين الجدد فقط
  };
  
  // التتبع
  status: 'draft' | 'scheduled' | 'active' | 'expired' | 'paused';
  usageLimit?: number; // عدد مرات الاستخدام الأقصى
  usageCount: number; // عدد مرات الاستخدام الحالي
  
  // العرض
  displayBadge?: string; // "وفر 30%"
  displayColor?: string; // "#FF6B6B"
  priority: number; // الأولوية في العرض
  
  // إدارية
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. Collection: `partner_pricing`
```typescript
{
  id: string;
  
  // معلومات الشريك
  partnerName: string; // "الاتحاد السعودي لكرة القدم"
  partnerCode: string; // "SAFF2024"
  partnerType: 'federation' | 'league' | 'government' | 'corporate';
  
  // الأسعار المخصصة
  customPricing: {
    monthly?: number;
    quarterly?: number;
    yearly?: number;
  };
  
  // أو نسبة خصم ثابتة
  fixedDiscount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  
  // الشروط
  isPublic: boolean; // هل الأسعار معلنة؟
  requiresApproval: boolean; // هل يحتاج موافقة؟
  
  // الصلاحية
  validFrom: Timestamp;
  validUntil?: Timestamp;
  
  // الإحصائيات
  activeSubscriptions: number;
  totalRevenue: number;
  
  // جهة الاتصال
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // إدارية
  status: 'active' | 'inactive' | 'pending';
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🎨 تصميم واجهة الإدارة

### الصفحة الرئيسية: Pricing Dashboard

#### القسم 1: نظرة عامة (Overview Cards)
```
┌─────────────────────────────────────────────────────────┐
│ 📊 نظرة عامة على الأسعار                              │
├─────────────┬─────────────┬─────────────┬─────────────┤
│ الباقات     │ العروض      │ الشركاء     │ الإيرادات   │
│ النشطة      │ الفعالة     │ النشطين     │ الشهرية     │
│   3        │    2        │    5        │  $15,420   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### القسم 2: إدارة الباقات الأساسية
```
┌─────────────────────────────────────────────────────────┐
│ 💎 الباقات الأساسية                                    │
│ ┌─────────────┬─────────────┬─────────────────────────┐│
│ │  Monthly    │  Quarterly  │     Yearly              ││
│ │  $29.99     │  $79.99     │    $249.99              ││
│ │  [تعديل]    │  [تعديل]    │    [تعديل]              ││
│ └─────────────┴─────────────┴─────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### القسم 3: التبويبات (Tabs)
```
[ الأسعار الأساسية ] [ الأسعار المخصصة ] [ العروض الترويجية ] [ الشركاء ]
```

---

## 🔧 الوظائف الأساسية

### 1. إدارة الأسعار الأساسية
- ✅ تعديل الأسعار بالدولار
- ✅ إدارة الميزات والمكافآت
- ✅ تفعيل/تعطيل الباقات
- ✅ معاينة مباشرة لتأثير التغييرات

### 2. الأسعار المخصصة حسب الدولة
- ✅ جدول تفاعلي لجميع الدول
- ✅ تحديد سعر مخصص لكل باقة
- ✅ عرض السعر المحلي والمعادل بالدولار
- ✅ إمكانية النسخ من دولة لأخرى

### 3. العروض الترويجية
- ✅ إنشاء عرض جديد مع معالج خطوة بخطوة
- ✅ تحديد الفترة الزمنية (من-إلى)
- ✅ اختيار الباقات المشمولة
- ✅ تحديد نوع الخصم (نسبة أو مبلغ ثابت)
- ✅ شروط الاستحقاق (عدد اللاعبين، نوع المستخدم، الدولة)
- ✅ جدولة العرض أو تفعيله فوراً
- ✅ إحصائيات الاستخدام في الوقت الفعلي

### 4. إدارة الشركاء
- ✅ قائمة الشركاء مع حالتهم
- ✅ أسعار خاصة غير معلنة
- ✅ نظام الموافقات
- ✅ تتبع الاشتراكات والإيرادات
- ✅ معلومات الاتصال

---

## 📱 مكونات الواجهة

### 1. PricingCard Component
```tsx
<PricingCard
  plan="monthly"
  basePrice={29.99}
  features={[...]}
  onEdit={handleEdit}
  isActive={true}
/>
```

### 2. CountryPricingTable Component
```tsx
<CountryPricingTable
  countries={supportedCountries}
  onUpdatePrice={handlePriceUpdate}
  onCopyPricing={handleCopyPricing}
/>
```

### 3. PromotionalOfferWizard Component
```tsx
<PromotionalOfferWizard
  onComplete={handleOfferCreation}
  existingOffers={offers}
/>
```

### 4. PartnerCard Component
```tsx
<PartnerCard
  partner={partnerData}
  onEdit={handleEdit}
  onToggleStatus={handleToggle}
/>
```

---

## 🎯 خطة التنفيذ

### المرحلة 1: تجهيز قاعدة البيانات ✅
- [x] إنشاء الـ Collections
- [ ] إضافة Indexes للأداء
- [ ] Security Rules

### المرحلة 2: الأسعار الأساسية
- [ ] واجهة عرض الباقات
- [ ] نموذج تعديل الأسعار
- [ ] إدارة الميزات

### المرحلة 3: الأسعار المخصصة
- [ ] جدول الدول
- [ ] نموذج التخصيص
- [ ] منطق حساب الأسعار

### المرحلة 4: العروض الترويجية
- [ ] معالج الإنشاء
- [ ] جدول العروض
- [ ] نظام الجدولة
- [ ] إحصائيات الاستخدام

### المرحلة 5: الشركاء
- [ ] قائمة الشركاء
- [ ] نموذج إضافة شريك
- [ ] نظام الموافقات
- [ ] لوحة تحكم الشريك

### المرحلة 6: التكامل
- [ ] ربط مع BulkPaymentPage
- [ ] API endpoints
- [ ] التحديثات الفورية
- [ ] الإشعارات

---

## 🔐 الصلاحيات

```typescript
const canManagePricing = (user: User) => {
  return user.role === 'super_admin' || 
         user.permissions?.includes('manage_pricing');
};

const canCreateOffers = (user: User) => {
  return user.role === 'super_admin' || 
         user.role === 'admin' ||
         user.permissions?.includes('create_offers');
};

const canManagePartners = (user: User) => {
  return user.role === 'super_admin';
};
```

---

## 📊 تقارير وإحصائيات

### 1. Revenue Analytics
- إجمالي الإيرادات
- الإيرادات حسب الباقة
- الإيرادات حسب الدولة
- تأثير العروض الترويجية

### 2. Conversion Tracking
- معدل التحويل لكل باقة
- أداء العروض الترويجية
- تحليل الأسعار المخصصة

### 3. Partner Performance
- اشتراكات الشركاء
- أداء كل شريك
- ROI للشراكات

---

## 🎨 تصميم UX/UI

### الألوان
- 🔵 Primary: `#3B82F6` (معلومات)
- 🟢 Success: `#10B981` (نشط)
- 🟡 Warning: `#F59E0B` (مجدول)
- 🔴 Danger: `#EF4444` (منتهي)
- ⚪ Neutral: `#6B7280` (معطل)

### الأيقونات
- 💎 Pricing Plans
- 🎁 Promotional Offers
- 🤝 Partners
- 🌍 Country Pricing
- 📊 Analytics

---

## 🚀 الخطوات التالية

1. مراجعة التصميم والموافقة عليه
2. بداية التنفيذ من المرحلة الأولى
3. إنشاء واجهة الإدارة الأساسية
4. إضافة الوظائف المتقدمة تدريجياً
5. الاختبار والتحسين

---

**ملاحظة**: هذا التصميم قابل للتوسع ويمكن إضافة المزيد من الميزات حسب الحاجة.
