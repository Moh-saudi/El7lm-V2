# 📘 دليل نظام إدارة الأسعار والعروض الترويجية

## نظرة عامة

نظام متكامل لإدارة الأسعار والخصومات والعروض الترويجية مع دعم:
- ✅ أسعار أساسية بالدولار لجميع الباقات
- ✅ أسعار مخصصة حسب الدولة
- ✅ خصومات خاصة للجهات الشريكة (أسعار غير معلنة)
- ✅ عروض ترويجية محددة المدة
- ✅ دعم متعدد المستخدمين (Admin, Club, Academy)

---

## 📁 الملفات المهمة

```
d:\el7lm-backup\
├── PRICING_ADMIN_DESIGN.md                    # وثيقة التصميم الشاملة
├── PRICING_MANAGEMENT_GUIDE.md                # هذا الملف - دليل الاستخدام
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       └── admin/
│   │           └── pricing-management/
│   │               └── page.tsx               # صفحة إدارة الأسعار
│   ├── lib/
│   │   └── services/
│   │       └── pricing-management.service.ts  # خدمة إدارة الأسعار
│   └── components/
│       └── shared/
│           └── BulkPaymentPage.tsx            # صفحة الدفع الجماعي
```

---

## 🚀 البدء السريع

### 1. الوصول لصفحة الإدارة

```
URL: /dashboard/admin/pricing-management
```

**الصلاحيات المطلوبة:**
- `role: 'super_admin'` أو
- `permissions: ['manage_pricing']`

### 2. أقسام الصفحة

#### أ) نظرة عامة (Overview)
- عرض الإحصائيات الأساسية
- الباقات النشطة
- العروض الفعالة
- الشركاء النشطين
- الإيرادات الشهرية

#### ب) الأسعار الأساسية (Base Plans)
- عرض جميع الباقات (شهري، ربع سنوي، سنوي)
- تعديل الأسعار الأساسية بالدولار
- إدارة الميزات والمكافآت
- تفعيل/تعطيل الباقات

#### ج) الأسعار المخصصة (Custom Pricing)
- تحديد أسعار مخصصة لكل دولة
- تحديد أسعار خاصة لمؤسسات معينة
- خصومات مخصصة

#### د) العروض الترويجية (Promotional Offers)
- إنشاء عروض جديدة
- تحديد فترة العرض
- شروط الاستحقاق
- إحصائيات الاستخدام

#### هـ) الشركاء (Partners)
- قائمة الشركاء
- أسعار خاصة غير معلنة
- نظام الموافقات
- تتبع الاشتراكات

---

## 📊 استخدام Service Layer

### استيراد الخدمة

```typescript
import { pricingService } from '@/lib/services/pricing-management.service';
```

### أمثلة الاستخدام

#### 1. الحصول على جميع الباقات

```typescript
const plans = await pricingService.getAllPlans();
console.log('Available plans:', plans);
```

#### 2. تحديث سعر باقة

```typescript
await pricingService.updatePlanPrice('plan-id', 39.99);
toast.success('تم تحديث السعر بنجاح');
```

#### 3. إن��اء عرض ترويجي

```typescript
const offerId = await pricingService.createOffer({
  name: 'عرض رمضان 2024',
  description: 'خصم 30% على جميع الباقات',
  offerType: 'seasonal',
  applicablePlans: ['monthly', 'quarterly', 'yearly'],
  discountType: 'percentage',
  discountValue: 30,
  startDate: new Date('2024-03-11'),
  endDate: new Date('2024-04-10'),
  timezone: 'Africa/Cairo',
  conditions: {
    minPlayers: 5,
    userTypes: ['club', 'academy'],
  },
  status: 'scheduled',
  priority: 1,
  displayBadge: 'وفر 30%',
  displayColor: '#10B981',
  createdBy: currentUser.uid,
});
```

#### 4. حساب السعر النهائي

```typescript
const pricing = await pricingService.calculateFinalPrice({
  planKey: 'monthly',
  countryCode: 'EG',
  offerCode: 'RAMADAN2024',
  playerCount: 10,
  userType: 'club',
});

console.log('Original Price:', pricing.originalPrice);
console.log('Final Price:', pricing.finalPrice);
console.log('Discounts:', pricing.discounts);
console.log('Currency:', pricing.currency);
```

#### 5. إضافة سعر مخصص لدولة

```typescript
await pricingService.createPricingOverride({
  planKey: 'monthly',
  countryCode: 'SA',
  customPrice: 112.50, // 30 دولار × 3.75 سعر الريال
  customCurrency: 'SAR',
  discountType: 'fixed',
  discountValue: 0,
  isActive: true,
  notes: 'سعر مخصص للسعودية',
  createdBy: currentUser.uid,
});
```

#### 6. إضافة شريك جديد

```typescript
const partnerId = await pricingService.createPartner({
  partnerName: 'الاتحاد السعودي لكرة القدم',
  partnerCode: 'SAFF2024',
  partnerType: 'federation',
  customPricing: {
    monthly: 19.99,   // بدلاً من 29.99
    quarterly: 49.99, // بدلاً من 79.99
    yearly: 149.99,   // بدلاً من 249.99
  },
  isPublic: false, // أسعار غير معلنة
  requiresApproval: true,
  validFrom: new Date(),
  validUntil: new Date('2025-12-31'),
  status: 'active',
  contactPerson: 'أحمد محمد',
  contactEmail: 'ahmed@saff.sa',
  contactPhone: '+966501234567',
  createdBy: currentUser.uid,
});
```

---

## 🎯 حالات الاستخدام الشائعة

### Case 1: إنشاء عرض Flash Sale

```typescript
const createFlashSale = async () => {
  const offerId = await pricingService.createOffer({
    name: 'عرض الجمعة البيضاء',
    description: 'خصم 50% لمدة 24 ساعة فقط!',
    code: 'BLACKFRIDAY50',
    offerType: 'flash_sale',
    applicablePlans: ['quarterly', 'yearly'],
    discountType: 'percentage',
    discountValue: 50,
    maxDiscount: 150, // حد أقصى 150 دولار خصم
    startDate: new Date('2024-11-29 00:00:00'),
    endDate: new Date('2024-11-30 23:59:59'),
    timezone: 'Africa/Cairo',
    conditions: {
      minPlayers: 10,
      newUsersOnly: false,
    },
    status: 'scheduled',
    usageLimit: 100, // أول 100 مستخدم فقط
    priority: 10, // أعلى أولوية
    displayBadge: 'وفر 50%',
    displayColor: '#EF4444',
    createdBy: currentUser.uid,
  });

  toast.success('تم إنشاء عرض الجمعة البيضاء بنجاح!');
  return offerId;
};
```

### Case 2: سعر خاص لمدرسة حكومية

```typescript
const createSchoolPricing = async (schoolId: string) => {
  await pricingService.createPricingOverride({
    planKey: 'yearly',
    organizationType: 'school',
    organizationId: schoolId,
    discountType: 'percentage',
    discountValue: 40, // خصم 40% للمدارس الحكومية
    isActive: true,
    notes: 'خصم خاص للمدارس الحكومية - قرار وزاري',
    createdBy: currentUser.uid,
  });
};
```

### Case 3: عرض Early Bird للمستخدمين الجدد

```typescript
const createEarlyBirdOffer = async () => {
  await pricingService.createOffer({
    name: 'عرض المستخدمين الجدد',
    description: 'خصم 25% للمشتركين الجدد في أول 30 يوم',
    offerType: 'early_bird',
    applicablePlans: ['monthly', 'quarterly', 'yearly'],
    discountType: 'percentage',
    discountValue: 25,
    startDate: new Date(),
    endDate: new Date('2025-12-31'),
    timezone: 'Africa/Cairo',
    conditions: {
      newUsersOnly: true, // للمستخدمين الجدد فقط
      minPlayers: 3,
    },
    status: 'active',
    priority: 5,
    displayBadge: 'مستخدم جديد',
    displayColor: '#8B5CF6',
    createdBy: currentUser.uid,
  });
};
```

---

## 🔄 التكامل مع BulkPaymentPage

### في صفحة الدفع الجماعي

```typescript
import { pricingService } from '@/lib/services/pricing-management.service';

const BulkPaymentPage = () => {
  const [finalPricing, setFinalPricing] = useState(null);

  useEffect(() => {
    calculatePricing();
  }, [selectedPlan, selectedCountry, promoCode, playerCount]);

  const calculatePricing = async () => {
    try {
      const pricing = await pricingService.calculateFinalPrice({
        planKey: selectedPlan,
        countryCode: selectedCountry,
        offerCode: promoCode,
        playerCount: players.length,
        userType: accountType,
        organizationId: user?.uid,
      });

      setFinalPricing(pricing);
      
      // عرض الخصومات للمستخدم
      if (pricing.discounts.length > 0) {
        pricing.discounts.forEach(discount => {
          toast.success(discount.description);
        });
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
      toast.error('فشل حساب السعر');
    }
  };

  return (
    <div>
      {finalPricing && (
        <div>
          <p>السعر الأصلي: {finalPricing.originalPrice} {finalPricing.currency}</p>
          <p>السعر النهائي: {finalPricing.finalPrice} {finalPricing.currency}</p>
          <p>الخصومات المطبقة: {finalPricing.discounts.length}</p>
        </div>
      )}
    </div>
  );
};
```

---

## 🎨 تخصيص واجهة الإدارة

### إضافة مكون جديد

```typescript
// في src/components/admin/pricing/CustomComponent.tsx

interface CustomComponentProps {
  // ... props
}

export function CustomComponent({ }: CustomComponentProps) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      {/* محتوى المكون */}
    </div>
  );
}
```

### إضافة تبويب جديد

في `pricing-management/page.tsx`:

```typescript
const [activeTab, setActiveTab] = useState<'plans' | 'custom' | 'offers' | 'partners' | 'analytics'>('plans');

// إضافة زر التبويب
<TabButton
  active={activeTab === 'analytics'}
  onClick={() => setActiveTab('analytics')}
  icon={<BarChart3 className="w-5 h-5" />}
  label="التحليلات والتقارير"
/>

// إضافة محتوى التبويب
{activeTab === 'analytics' && <AnalyticsTab />}
```

---

## 📈 التقارير والإحصائيات

### حساب إجمالي الإيرادات من العروض

```typescript
const calculateOfferRevenue = async (offerId: string) => {
  // TODO: تنفيذ منطق حساب الإيرادات من العرض
  // يتطلب دمج مع نظام المدفوعات
};
```

### تتبع أداء الشركاء

```typescript
const updatePartnerStats = async (partnerId: string, subscriptionAmount: number) => {
  const partner = await pricingService.getPartnerByCode(partnerCode);
  if (partner) {
    await pricingService.updatePartner(partner.id, {
      activeSubscriptions: partner.activeSubscriptions + 1,
      totalRevenue: partner.totalRevenue + subscriptionAmount,
    });
  }
};
```

---

## 🔐 الأمان والصلاحيات

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Subscription Plans - Public Read, Admin Write
    match /subscription_plans/{planId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin' ||
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions.hasAny(['manage_pricing']));
    }
    
    // Pricing Overrides - Admin Only
    match /pricing_overrides/{overrideId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    // Promotional Offers - Public Read Active, Admin Write
    match /promotional_offers/{offerId} {
      allow read: if true; // All can read active offers
      allow write: if request.auth != null && 
                     (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin' ||
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions.hasAny(['manage_pricing', 'create_offers']));
    }
    
    // Partner Pricing - Restricted
    match /partner_pricing/{partnerId} {
      allow read: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
  }
}
```

---

## 🧪 الاختبار

### اختبار حساب السعر

```typescript
describe('Pricing Calculation', () => {
  it('should apply country override', async () => {
    const pricing = await pricingService.calculateFinalPrice({
      planKey: 'monthly',
      countryCode: 'EG',
    });

    expect(pricing.currency).toBe('EGP');
  });

  it('should apply promotional discount', async () => {
    const pricing = await pricingService.calculateFinalPrice({
      planKey: 'monthly',
      offerCode: 'TEST50',
    });

    expect(pricing.finalPrice).toBeLessThan(pricing.originalPrice);
  });

  it('should stack partner and promotional discounts', async () => {
    const pricing = await pricingService.calculateFinalPrice({
      planKey: 'monthly',
      partnerCode: 'PARTNER123',
      offerCode: 'PROMO20',
    });

    expect(pricing.discounts.length).toBeGreaterThan(1);
  });
});
```

---

## 📝 أفضل الممارسات

1. **دائماً استخدم `calculateFinalPrice()`** قبل عرض السعر للمستخدم
2. **تحقق من صلاحية العروض** قبل تطبيقها
3. **سجل جميع التغييرات** في الأسعار مع `createdBy` و `updatedAt`
4. **استخدم الأكواد الفريدة** للعروض والشركاء
5. **حدد فترات صلاحية** لجميع العروض
6. **راقب الاستخدام** لتجنب إساءة استخدام الخصومات

---

## 🚨 استكشاف الأخطاء

### المشكلة: السعر لا يتحدث

**الحل:**
```typescript
// امسح الكاش
localStorage.removeItem('pricing_cache');

// أعد تحميل البيانات
await pricingService.getAllPlans();
```

### المشكلة: العرض غير مطبق

**تحقق من:**
1. هل العرض في حالة `active`؟
2. هل التاريخ الحالي ضمن فترة العرض؟
3. هل المستخدم يستوفي الشروط؟
4. هل تم الوصول لحد الاستخدام؟

---

## 🔮 الخطوات القادمة

- [ ] إضافة واجهة إدارة الميزات
- [ ] نظام الإشعارات للعروض القادمة
- [ ] تقارير تحليلية متقدمة
- [ ] دمج مع نظام الفواتير
- [ ] API للأسعار للتكامل الخارجي
- [ ] نظام الموافقات متعدد المستويات

---

## 📞 الدعم

للأسئلة أو المساعدة، يرجى مراجعة:
- الوثائق الفنية: `PRICING_ADMIN_DESIGN.md`
- كود المصدر: `src/lib/services/pricing-management.service.ts`

---

**آخر تحديث:** 2024-12-15
