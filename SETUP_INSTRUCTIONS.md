# تعليمات إعداد المشروع

## 1. إعداد متغيرات البيئة في Vercel

### الخطوات:
1. اذهب إلى: https://vercel.com/dashboard
2. اختر مشروع `el7lm-backup`
3. اضغط على **Settings** > **Environment Variables**
4. أضف جميع المتغيرات من ملف `VERCEL_ENV_VARS.md`

### النتيجة:
- ✅ ستختفي جميع التحذيرات (Firebase, GTM, Clarity)
- ✅ ستعمل جميع الميزات بشكل كامل
- ✅ ستحصل على analytics حقيقي

## 2. إعداد متغيرات البيئة محلياً

### إنشاء ملف `.env.local`:
```bash
# انسخ محتوى VERCEL_ENV_VARS.md إلى ملف .env.local
cp VERCEL_ENV_VARS.md .env.local
```

### تعديل BASE_URL للاستخدام المحلي:
```bash
# في ملف .env.local، غيّر:
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

## 3. تشغيل المشروع محلياً

```bash
# تثبيت المتطلبات
npm install

# تشغيل المشروع
npm run dev
```

## 4. التحقق من الإعدادات

### بعد إضافة المتغيرات في Vercel:
1. **انتظر إعادة النشر التلقائي**
2. **تحقق من اختفاء التحذيرات**:
   - ⚠️ Firebase configuration is missing
   - ⚠️ Google Tag Manager ID غير صحيح
   - ⚠️ Clarity Project ID غير صحيح

### الميزات التي ستعمل:
- ✅ Firebase Authentication
- ✅ Google Analytics & Tag Manager
- ✅ Microsoft Clarity Analytics
- ✅ Supabase Storage
- ✅ BeOn SMS/WhatsApp API
- ✅ Geidea Payment Gateway
- ✅ YouTube API Integration

## 5. اختبار الميزات

### Firebase Auth:
- تسجيل الدخول/الخروج
- إنشاء حسابات جديدة
- إعادة تعيين كلمة المرور

### Analytics:
- تتبع الصفحات في Google Analytics
- تتبع المستخدمين في Clarity

### المدفوعات:
- اختبار عملية الدفع عبر Geidea

### الإشعارات:
- إرسال SMS عبر BeOn
- إرسال WhatsApp عبر BeOn

## 6. استكشاف الأخطاء

### إذا لم تختف التحذيرات:
1. تأكد من إضافة جميع المتغيرات
2. تأكد من اختيار البيئات الصحيحة (Production, Preview, Development)
3. انتظر إعادة النشر
4. امسح cache المتصفح

### إذا لم تعمل الميزات:
1. تحقق من صحة المفاتيح
2. تحقق من إعدادات Firebase Console
3. تحقق من إعدادات Vercel Environment Variables

## 7. الأمان

### متغيرات حساسة:
- `FIREBASE_PRIVATE_KEY` - لا تشاركها أبداً
- `GEIDEA_API_PASSWORD` - لا تشاركها أبداً
- `BEON_V3_TOKEN` - لا تشاركها أبداً

### متغيرات آمنة للمشاركة:
- جميع المتغيرات التي تبدأ بـ `NEXT_PUBLIC_`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_GTM_ID`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
