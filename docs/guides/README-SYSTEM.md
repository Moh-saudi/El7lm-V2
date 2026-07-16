# 🚀 نظام التسجيل والدخول بالهاتف فقط

## 📋 نظرة عامة

نظام تسجيل ودخول متكامل يعتمد على رقم الهاتف فقط مع التحقق عبر OTP. يدعم جميع الدول العربية ويوفر واجهة مستخدم محسنة وأمان عالي.

## ✨ الميزات الرئيسية

### 🔐 الأمان
- تسجيل ودخول بالهاتف فقط (بدون بريد إلكتروني)
- تحقق عبر OTP مع انتهاء صلاحية تلقائي
- حماية ضد الإرسال المتكرر للـ OTP
- حد أقصى للمحاولات (5 محاولات)
- تشفير البيانات الحساسة

### 🌍 الدعم الجغرافي
- دعم جميع الدول العربية
- تنسيق تلقائي لأرقام الهاتف
- دعم أكواد الدول المختلفة
- واجهة باللغة العربية

### 📱 واجهة المستخدم
- تصميم متجاوب (Responsive Design)
- رسائل خطأ واضحة باللغة العربية
- مؤشرات تحميل محسنة
- تجربة مستخدم سلسة

## 🛠️ التقنيات المستخدمة

### Frontend
- **Next.js 14** - إطار العمل الرئيسي
- **React** - واجهة المستخدم
- **TypeScript** - تطوير آمن
- **Tailwind CSS** - التصميم

### Backend
- **Firebase Admin SDK** - إدارة المستخدمين
- **Firestore** - قاعدة البيانات
- **Firebase Auth** - المصادقة

### خدمات خارجية
- **Firebase** - البنية التحتية

## 📁 هيكل المشروع

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── check-user-exists/
│   │   └── sms/
│   │       ├── send-otp/
│   │       ├── verify-otp/
│   │       └── otp-storage.ts
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   └── test-*
├── components/
│   └── shared/
│       ├── UnifiedOTPVerification.tsx
│       └── SMSOTPVerification.tsx
└── lib/
    ├── firebase/
    │   ├── admin.ts
    │   ├── config.ts
    │   └── auth-provider.tsx
        └── sms-service.ts
```

## 🔧 الإعداد والتشغيل

### 1. متطلبات النظام
- Node.js 18+
- npm أو yarn
- حساب Firebase

### 2. تثبيت التبعيات
```bash
npm install
```

### 3. إعداد متغيرات البيئة
أنشئ ملف `.env.local` في المجلد الجذر:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com

# Firebase Config (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

```

### 4. تشغيل الخادم
```bash
npm run dev
```

## 🧪 الاختبار

### صفحات الاختبار المتاحة
- `/test-firebase-config` - اختبار تكوين Firebase
- `/test-system` - اختبار شامل للنظام

### اختبار النظام
1. افتح `http://localhost:3000/test-system`
2. اضغط على "بدء الاختبار"
3. راجع النتائج

## 📱 استخدام النظام

### التسجيل الجديد
1. انتقل إلى `/auth/register`
2. اختر الدولة
3. أدخل رقم الهاتف
4. اختر نوع الحساب
5. أدخل كلمة المرور
6. انتظر OTP
7. أدخل رمز التحقق
8. أكمل التسجيل

### الدخول
1. انتقل إلى `/auth/login`
2. اختر الدولة
3. أدخل رقم الهاتف
4. أدخل كلمة المرور
5. انتظر OTP
6. أدخل رمز التحقق
7. تم الدخول بنجاح

## 🔒 الأمان

### حماية OTP
- انتهاء صلاحية تلقائي بعد 5 دقائق
- حد أقصى 5 محاولات
- حماية ضد الإرسال المتكرر
- تخزين آمن في الذاكرة

### حماية البيانات
- تشفير كلمات المرور
- حماية ضد SQL Injection
- التحقق من صحة المدخلات
- حماية CSRF

## 🌍 الدول المدعومة

| الدولة | كود الدولة | طول الرقم |
|--------|------------|-----------|
| السعودية | +966 | 9 |
| الإمارات | +971 | 9 |
| الكويت | +965 | 8 |
| قطر | +974 | 8 |
| البحرين | +973 | 8 |
| عمان | +968 | 8 |
| مصر | +20 | 10 |
| الأردن | +962 | 9 |
| لبنان | +961 | 8 |
| العراق | +964 | 10 |
| سوريا | +963 | 9 |
| المغرب | +212 | 9 |
| الجزائر | +213 | 9 |
| تونس | +216 | 8 |
| ليبيا | +218 | 9 |

## 🚨 استكشاف الأخطاء

### مشاكل شائعة

#### 1. خطأ Firebase Config
```
firebase.googleapis.com/v1alpha/projects/-/apps/... Failed to load resource: 400
```
**الحل:** تأكد من صحة متغيرات Firebase Config في `.env.local`

#### 2. خطأ OTP
```
Failed to send OTP
```

#### 3. خطأ Firestore
```
Missing or insufficient permissions
```
**الحل:** تأكد من نشر Firestore Rules

### خطوات التشخيص
1. تحقق من متغيرات البيئة: `node scripts/debug-env.js`
2. اختبر Firebase Config: `/test-firebase-config`
3. اختبر النظام: `/test-system`
4. راجع console للتفاصيل

## 📞 الدعم

### معلومات الاتصال
- **البريد الإلكتروني:** support@example.com
- **الهاتف:** +966-XX-XXX-XXXX
- **ساعات العمل:** الأحد - الخميس، 9 ص - 6 م

### تقارير الأخطاء
عند الإبلاغ عن خطأ، يرجى تضمين:
- وصف الخطأ
- خطوات إعادة الإنتاج
- لقطة شاشة (إن أمكن)
- معلومات المتصفح والنظام

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT. راجع ملف `LICENSE` للتفاصيل.

## 🤝 المساهمة

نرحب بالمساهمات! يرجى:
1. Fork المشروع
2. إنشاء branch جديد
3. إجراء التغييرات
4. إرسال Pull Request

---

**تم التطوير بحب ❤️ للعالم العربي** 
