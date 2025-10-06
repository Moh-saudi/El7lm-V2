# إصلاح مشاكل البناء في Vercel

## المشاكل التي تم إصلاحها

### 1. مشكلة Timeout في API Endpoints
- تم إضافة timeout handling للـ API routes
- تم تحسين التعامل مع Firebase أثناء البناء
- تم إضافة fallback values للبيانات

### 2. مشكلة serverExternalPackages
- تم إزالة `serverExternalPackages` من `next.config.js` لأنه غير مدعوم في Next.js 14

### 3. تحسين Firebase Configuration
- تم إضافة تحقق من متغيرات البيئة أثناء البناء
- تم إضافة fallback configuration للبناء
- تم تحسين التعامل مع Vercel build environment

### 4. تحسين Build Configuration
- تم زيادة `staticPageGenerationTimeout` إلى 30 ثانية
- تم إضافة `DISABLE_FIREBASE_DURING_BUILD=true` في scripts
- تم تحسين `vercel.json` configuration

## الملفات المحدثة

1. `src/app/api/admin/users/count/route.ts` - إضافة timeout handling
2. `src/app/api/admin/settings/route.ts` - إضافة timeout handling
3. `src/lib/firebase/config.ts` - تحسين build phase handling
4. `next.config.js` - إزالة serverExternalPackages وتحسين timeout
5. `package.json` - تحسين build scripts
6. `vercel.json` - إضافة function timeouts
7. `.vercelignore` - إضافة ملفات إضافية للتجاهل

## متغيرات البيئة المطلوبة

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Build Configuration
DISABLE_FIREBASE_DURING_BUILD=true
NODE_ENV=production
```

## كيفية التشغيل

1. تأكد من تعيين متغيرات البيئة في Vercel
2. استخدم `npm run vercel-build` للبناء المحسن
3. تأكد من أن Firebase credentials صحيحة

## ملاحظات مهمة

- تم إضافة timeout 5 ثوانٍ لكل Firebase query
- تم إضافة fallback values للبيانات أثناء البناء
- تم تحسين memory usage للبناء
- تم إضافة error handling محسن
