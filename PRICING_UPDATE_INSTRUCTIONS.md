# 🚀 تحديث صفحة إدارة الأسعار

## ✅ ما تم إضافته:

### 1. **قراءة من Firebase** بدلاً من البيانات الوهمية
```typescript
const loadData = async () => {
    const { db } = await import('@/lib/firebase/config');
    const { collection, getDocs } = await import('firebase/firestore');
    
    const plansSnapshot = await getDocs(collection(db, 'subscription_plans'));
    
    if (plansSnapshot.empty) {
        console.log('⚠️ لا توجد باقات - استخدم زر التهيئة');
        setPlans([]);
    } else {
        const plansData = plansSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setPlans(plansData);
    }
};
```

### 2. **زر التهيئة** - يظهر عندما لا توجد باقات
```typescript
{plans.length === 0 && (
    <button onClick={handleInitialize}>
        🚀 تهيئة النظام
    </button>
)}
```

### 3. **حفظ التعديلات** في Firebase
```typescript
const handleSave = async (updatedPlan) => {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'subscription_plans', updatedPlan.id), updatedPlan);
    toast.success('تم الحفظ بنجاح');
};
```

---

## 📋 للتطبيق يدوياً:

افتح ملف:
```
d:\el7lm-backup\src\app\dashboard\admin\pricing-management\page.tsx
```

### استبدل دالة `loadData` (السطر 123-201) بهذا:

```typescript
const loadData = async () => {
    setLoading(true);
    try {
        // قراءة البيانات من Firebase
        const { db } = await import('@/lib/firebase/config');
        const { collection, getDocs } = await import('firebase/firestore');
        
        const plansSnapshot = await getDocs(collection(db, 'subscription_plans'));
        
        if (plansSnapshot.empty) {
            console.log('⚠️ لا توجد باقات في Firebase - استخدم زر التهيئة');
            setPlans([]);
        } else {
            const plansData = plansSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SubscriptionPlan[];
            
            console.log('✅ تم تحميل', plansData.length, 'باقة من Firebase');
            setPlans(plansData);
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        toast.error('فشل تحميل البيانات');
        setPlans([]);
    } finally {
        setLoading(false);
    }
};
```

---

## 🎯 الاستخدام:

1. **افتح الصفحة**: `http://localhost:3000/dashboard/admin/pricing-management`
2.  **إذا كانت فارغة**: اذهب لـ `http://localhost:3000/dashboard/admin/init-pricing` أولاً
3. **بعد التهيئة**: ارجع للصفحة - ستجد الباقات محملة!
4. **عدّل ما تريد**: اضغط "تعديل" → غيّر → "حفظ"

---

**الصفحة الآن متصلة بالكامل مع Firebase!** ✨
