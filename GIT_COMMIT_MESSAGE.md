# Git Commit Message

## الرسالة الموصى بها:

```
fix(pricing): إصلاح حذف العروض وتحسين نظام الأسعار

✨ الميزات الجديدة:
- إضافة زر توليد كود تلقائي للعروض الترويجية
- دعم applicablePlans لتطبيق العروض على باقات محددة
- تحسين فورم الشركاء (زر توليد كود + أسعار 3/6/12 شهر)
- إضافة حقل isPublic للشركاء

🐛 الإصلاحات:
- إصلاح مشكلة حذف العروض (استخدام doc.id الصحيح)
- إصلاح حفظ رمز الخصم في Firebase
- تحسين معالجة الأخطاء مع console logs تفصيلية

🔒 الأمان:
- تحديث Firestore Security Rules للمجموعات الجديدة
- قواعد محكمة للقراءة والكتابة

📝 الوثائق:
- إضافة PROMOTIONAL_OFFERS_AUDIT.md
- إضافة OFFERS_ON_PLANS_GUIDE.md
- إضافة PAYMENT_METHODS_REPORT.md
- إضافة CHANGELOG.md

الملفات المعدلة:
- src/app/dashboard/admin/pricing-management/page.tsx
- src/components/admin/pricing/CreateOfferModal.tsx
- src/components/shared/BulkPaymentPage.tsx
- firestore.rules

Closes #[issue-number]
```

---

## الأوامر الكاملة:

```bash
# 1. التحقق من الحالة
git status

# 2. إضافة الملفات
git add src/app/dashboard/admin/pricing-management/page.tsx
git add src/components/admin/pricing/CreateOfferModal.tsx
git add src/components/shared/BulkPaymentPage.tsx
git add firestore.rules
git add PROMOTIONAL_OFFERS_AUDIT.md
git add OFFERS_ON_PLANS_GUIDE.md
git add PAYMENT_METHODS_REPORT.md
git add CHANGELOG.md
git add GITHUB_COMMIT_CHECKLIST.md

# 3. أو إضافة كل شيء مرة واحدة
git add -A

# 4. Commit
git commit -m "fix(pricing): إصلاح حذف العروض وتحسين نظام الأسعار

✨ الميزات الجديدة:
- إضافة زر توليد كود تلقائي للعروض الترويجية
- دعم applicablePlans لتطبيق العروض على باقات محددة
- تحسين فورم الشركاء (زر توليد كود + أسعار 3/6/12 شهر)
- إضافة حقل isPublic للشركاء

🐛 الإصلاحات:
- إصلاح مشكلة حذف العروض (استخدام doc.id الصحيح)
- إصلاح حفظ رمز الخصم في Firebase
- تحسين معالجة الأخطاء مع console logs تفصيلية

🔒 الأمان:
- تحديث Firestore Security Rules للمجموعات الجديدة

📝 الوثائق:
- إضافة 4 ملفات وثائق شاملة"

# 5. Push
git push origin main

# أو إذا كنت تعمل على فرع
git push origin [branch-name]
```

---

## رسالة مختصرة (إذا كنت تفضل الاختصار):

```bash
git commit -m "fix: إصلاح حذف العروض الترويجية وتحسين نظام الأسعار

- إصلاح doc.id في العروض
- إضافة حقل code
- دعم applicablePlans
- تحسين فورم الشركاء
- تحديث firestore.rules"
```

---

## ✅ قبل التنفيذ:

### تأكد من:
- [ ] اختبار الحذف - يعمل؟
- [ ] اختبار الكود - يُحفظ؟
- [ ] لا توجد أخطاء في Console؟
- [ ] الملفات الصحيحة فقط مُضافة؟

### بعد Push:
- [ ] تحقق من GitHub - التغييرات ظهرت؟
- [ ] CI/CD يعمل؟ (إن وجد)
- [ ] إنشاء Pull Request؟ (إن كان مطلوباً)

---

## 🎯 الأوامر السريعة:

```bash
# الطريقة السريعة الكاملة:
git add -A && \
git commit -m "fix(pricing): إصلاح حذف العروض وتحسين نظام الأسعار" && \
git push origin main
```

---

## 📋 ملاحظات:

1. **استبدل `[issue-number]`** برقم المشكلة إن وجد
2. **استبدل `main`** باسم الفرع إذا كان مختلفاً
3. **راجع `git status`** قبل الإضافة للتأكد
4. **استخدم `git log`** للتحقق من الـ commit

---

**جاهز للتنفيذ!** 🚀
