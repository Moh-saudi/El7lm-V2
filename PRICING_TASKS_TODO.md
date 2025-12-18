# ✅ قائمة المهام التنفيذية - نظام إدارة الأسعار

## 🎯 المهام الفورية (اليوم/غداً)

### المهمة 1: تطبيق Security Rules ⏱️ 5 دقائق
```bash
الخطوات:
1. افتح Firebase Console
2. اذهب إلى Firestore Database → Rules
3. انسخ محتوى ملف: firestore-pricing.rules
4. الصق في المحرر
5. اضغط "Publish"
```

**الملف المطلوب:** `d:\el7lm-backup\firestore-pricing.rules`

---

### المهمة 2: تهيئة البيانات الأولية ⏱️ 2 دقيقة
```typescript
// افتح Console في المتصفح (F12)
// على صفحة: http://localhost:3000/dashboard/admin

// انسخ والصق:
const init = async () => {
  const { initializePricingData } = await import('./src/lib/services/pricing-init');
  const userId = 'YOUR_USER_ID_HERE'; // ضع معرف المستخدم الحالي
  await initializePricingData(userId);
};

init();
```

**النتيجة المتوقعة:**
```
✅ تمت إضافة: اشتراك شهري
✅ تمت إضافة: اشتراك ربع سنوي
✅ تمت إضافة: اشتراك سنوي
✅ تمت إضافة: EG - monthly
✅ تمت إضافة: SA - quarterly
✅ تمت إضافة: عرض الترحيب
✨ تمت التهيئة بنجاح!
```

---

### المهمة 3: دمج CreateOfferModal ⏱️ 10 دقائق

افتح: `src/app/dashboard/admin/pricing-management/page.tsx`

**أضف في البداية:**
```typescript
import CreateOfferModal from '@/components/admin/pricing/CreateOfferModal';
```

**أضف في المكون:**
```typescript
const [showCreateOffer, setShowCreateOffer] = useState(false);
```

**استبدل زر "إنشاء عرض جديد" في OffersTab:**
```typescript
<button 
  onClick={() => setShowCreateOffer(true)}
  className="flex gap-2 items-center px-4 py-2 text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg transition-all hover:shadow-lg"
>
  <Plus className="w-4 h-4" />
  إنشاء عرض جديد
</button>
```

**أضف قبل الـ closing div:**
```typescript
{/* Create Offer Modal */}
<CreateOfferModal
  isOpen={showCreateOffer}
  onClose={() => setShowCreateOffer(false)}
  onSuccess={() => {
    loadData();
    setShowCreateOffer(false);
  }}
/>
```

---

### المهمة 4: اختبار النظام ⏱️ 15 دقيقة

#### 4.1 اختبر الواجهة
```bash
1. افتح: http://localhost:3000/dashboard/admin/pricing-management
2. تحقق من:
   - ✅ ظهور البطاقات الإحصائية
   - ✅ عمل التبويبات
   - ✅ عرض الباقات الثلاث
```

#### 4.2 اختبر إنشاء عرض
```bash
1. اضغط "إنشاء عرض جديد"
2. املأ الخطوة 1:
   - الاسم: "اختبار العرض"
   - الوصف: "عرض تجريبي"
   - اختر نوع: Seasonal
   - اختر الباquet: Monthly
3. الخطوة 2:
   - نوع الخصم: نسبة مئوية
   - القيمة: 20%
4. الخطوة 3:
   - تاريخ البداية: اليوم
   - تاريخ الانتهاء: غداً
5. الخطوة 4:
   - اترك كل شيء فارغ
6. اضغط "إنشاء العرض"
```

**النتيجة:** يجب أن ترى toast نجاح ✅

#### 4.3 اختبر الخدمة
```typescript
// في Console
const { pricingService } = await import('./src/lib/services/pricing-management.service');

// اختبار 1: جلب الباقات
const plans = await pricingService.getAllPlans();
console.log('Plans:', plans);

// اختبار 2: حساب السعر
const pricing = await pricingService.calculateFinalPrice({
  planKey: 'monthly',
  countryCode: 'EG',
});
console.log('Pricing:', pricing);
```

---

## 📋 المهام الإضافية (الأسبوع القادم)

### المهمة 5: بناء جدول الأسعار المخصصة ⏱️ 2 ساعات
- [ ] إنشاء `CountryPricingTable.tsx`
- [ ] عرض جميع الدول المدعومة
- [ ] إضافة نموذج تحرير السعر
- [ ] حفظ التغييرات في Firestore

### المهمة 6: بناء بطاقات الشركاء ⏱️ 1.5 ساعة
- [ ] إنشاء `PartnerCard.tsx`
- [ ] إضافة نموذج شريك جديد
- [ ] عرض الإحصائيات
- [ ] نظام الموافقات

### المهمة 7: الدمج مع BulkPaymentPage ⏱️ 3 ساعات
- [ ] استيراد `pricingService`
- [ ] استبدال حساب الأسعار الحالي
- [ ] إضافة حقل كود الخصم
- [ ] عرض الخصومات المطبقة
- [ ] اختبار شامل

### المهمة 8: التقارير والإحصائيات ⏱️ 4 ساعات
- [ ] إنشاء `PricingAnalytics.tsx`
- [ ] رسوم بيانية للإيرادات
- [ ] أداء العروض
- [ ] استخدام الشركاء
- [ ] تصدير التقارير

---

## 🎯 الأولويات

### عالية (هذا الأسبوع)
1. ✅ تطبيق Security Rules
2. ✅ تهيئة البيانات
3. ✅ دمج CreateOfferModal
4. ✅ اختبار النظام الأساسي

### متوسطة (الأسبوع القادم)
5. 🔄 جدول الأسعار المخصصة
6. 🔄 بطاقات الشركاء
7. 🔄 الدمج مع BulkPaymentPage

### منخفضة (الشهر القادم)
8. ⏳ التقارير والإحصائيات
9. ⏳ تحسينات UX
10. ⏳ تطبيق الجوال

---

## ✅ معايير الإنجاز

### المهمة تُعتبر منجزة عندما:
- ✅ الكود يعمل بدون أخطاء
- ✅ النتيجة كما هو متوقع
- ✅ تم الاختبار على بيانات حقيقية
- ✅ تم التوثيق (إذا لزم الأمر)
- ✅ تم الـ commit في Git

---

## 📝 ملاحظات

### عند تشغيل البيانات الأولية:
- ⚠️ تأكد من تسجيل الدخول كـ Super Admin
- ⚠️ شغلها مرة واحدة فقط
- ⚠️ إذا أردت إعادة التشغيل، احذف البيانات القديمة أولاً

### عند اختبار العروض:
- 💡 تأكد من أن التواريخ صحيحة
- 💡 اختبر مع باقات مختلفة
- 💡 جرب شروط مختلفة

### عند الدمج مع BulkPaymentPage:
- 🔍 تأكد من عدم كسر الوظائف الحالية
- 🔍 اختبر جميع السيناريوهات
- 🔍 راجع الأسعار المعروضة

---

## 🎉 بعد إكمال المهام الأساسية

### يمكنك:
1. ✅ إدارة الأسعار من واجهة واحدة
2. ✅ إنشاء عروض ترويجية بسهولة
3. ✅ تخصيص الأسعار لكل دولة
4. ✅ إضافة شركاء بأسعار خاصة
5. ✅ تتبع الأداء والإحصائيات

---

**تم الإعداد:** 15 ديسمبر 2024  
**الحالة:** 📋 جاهز للتنفيذ  
**المدة التقديرية للمهام الأساسية:** ~30 دقيقة
