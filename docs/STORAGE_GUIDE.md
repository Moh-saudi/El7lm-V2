# 📦 نظام التخزين الموحد - دليل الاستخدام الشامل

## 📋 نظرة عامة

تم إنشاء طبقة تجريد موحدة لنظام التخزين تسمح بالتبديل السلس بين **Supabase Storage** و **Cloudflare R2** بدون تعديل الكود.

---

## 🎯 الفوائد الرئيسية

✅ **تبديل سهل**: تغيير المزود بمتغير بيئة واحد فقط  
✅ **دعم متعدد المزودين**: استخدام Supabase + Cloudflare معاً  
✅ **انتقال تدريجي**: نقل البيانات بدون توقف الخدمة  
✅ **نسخ احتياطي تلقائي**: رفع على كلا المزودين للأمان  
✅ **قابلية التوسع**: إضافة AWS S3 أو أي مزود آخر بسهولة  

---

## 📁 البنية الجديدة

```
src/lib/storage/
├── index.ts                          # نقطة الدخول الرئيسية
├── types.ts                          # الأنواع والواجهات المشتركة
├── providers/
│   ├── supabase-provider.ts         # محول Supabase
│   ├── cloudflare-provider.ts       # محول Cloudflare R2
│   └── hybrid-provider.ts           # محول مزدوج
└── migration/
    ├── migrate-files.ts             # سكريبت نقل الملفات (قريباً)
    └── update-urls.ts               # تحديث الروابط (قريباً)
```

---

## 🚀 الاستخدام السريع

### 1️⃣ الاستخدام الأساسي

```typescript
import { storageManager } from '@/lib/storage';

// رفع ملف
const result = await storageManager.upload(
  'videos',                    // اسم البوكت
  'user123/video.mp4',         // المسار
  file,                        // ملف File/Blob/Buffer
  {
    cacheControl: '3600',
    contentType: 'video/mp4'
  }
);

console.log(result.publicUrl); // رابط الملف العام

// حذف ملف
await storageManager.delete('videos', 'user123/video.mp4');

// حذف عدة ملفات
await storageManager.delete('videos', [
  'user123/video1.mp4',
  'user123/video2.mp4'
]);

// الحصول على رابط عام
const url = await storageManager.getPublicUrl('videos', 'user123/video.mp4');

// الحصول على قائمة الملفات
const files = await storageManager.list('videos', 'user123/', {
  limit: 50,
  search: 'video'
});

// التحقق من وجود ملف
const exists = await storageManager.exists('videos', 'user123/video.mp4');
```

---

## ⚙️ الإعدادات

### 1️⃣ إضافة المتغيرات إلى `.env.local`

انسخ محتوى `.env.storage.example` إلى `.env.local`:

```bash
# نوع المزود
NEXT_PUBLIC_STORAGE_PROVIDER=supabase  # أو cloudflare أو hybrid

# للوضع المزدوج
NEXT_PUBLIC_PRIMARY_STORAGE_PROVIDER=cloudflare
NEXT_PUBLIC_STORAGE_BACKUP_ENABLED=false

# إعدادات Cloudflare R2
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL=https://cdn.yourdomain.com
```

### 2️⃣ الحصول على بيانات Cloudflare R2

1. **إنشاء Bucket**:
   - اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - R2 → Create Bucket
   - اختر اسم البوكت (مثل: `el7lm-videos`)

2. **إنشاء API Token**:
   - R2 → Manage R2 API Tokens
   - Create API Token
   - احفظ `Access Key ID` و `Secret Access Key`

3. **الحصول على Account ID**:
   - موجود في R2 → Overview

---

## 🔄 سيناريوهات الاستخدام

### السيناريو 1: الوضع الحالي (Supabase فقط)

```env
NEXT_PUBLIC_STORAGE_PROVIDER=supabase
```

جميع الملفات تُرفع وتُقرأ من Supabase.

---

### السيناريو 2: الانتقال التدريجي (Hybrid Mode) ⭐ **الأفضل**

```env
NEXT_PUBLIC_STORAGE_PROVIDER=hybrid
NEXT_PUBLIC_PRIMARY_STORAGE_PROVIDER=cloudflare
NEXT_PUBLIC_STORAGE_BACKUP_ENABLED=false
```

**النتيجة**:
- ✅ الملفات **الجديدة** → Cloudflare R2
- ✅ الملفات **القديمة** → تبقى في Supabase
- ✅ القراءة تحاول من Cloudflare أولاً، ثم Supabase

**الفوائد**:
- لا توقف للخدمة
- نقل تدريجي بدون ضغط
- يمكن الرجوع بسهولة

---

### السيناريو 3: النسخ الاحتياطي المزدوج

```env
NEXT_PUBLIC_STORAGE_PROVIDER=hybrid
NEXT_PUBLIC_PRIMARY_STORAGE_PROVIDER=cloudflare
NEXT_PUBLIC_STORAGE_BACKUP_ENABLED=true
```

**النتيجة**:
- ✅ كل ملف يُرفع على **كلا المزودين**
- ✅ أمان إضافي
- ⚠️ تكلفة مضاعفة

---

### السيناريو 4: Cloudflare فقط (بعد الانتقال الكامل)

```env
NEXT_PUBLIC_STORAGE_PROVIDER=cloudflare
```

جميع الملفات على Cloudflare R2 فقط.

---

## 📝 تحديث الكود الموجود

### قبل (الكود القديم):

```typescript
import { supabase } from '@/lib/supabase/config';

const { data, error } = await supabase.storage
  .from('videos')
  .upload(filePath, file, { upsert: true });

const { data: urlData } = supabase.storage
  .from('videos')
  .getPublicUrl(filePath);
```

### بعد (الكود الجديد):

```typescript
import { storageManager } from '@/lib/storage';

const result = await storageManager.upload(
  'videos',
  filePath,
  file,
  { upsert: true }
);

const url = await storageManager.getPublicUrl('videos', filePath);
```

---

## 🔧 أمثلة عملية

### مثال 1: رفع صورة ملف شخصي

```typescript
import { storageManager } from '@/lib/storage';

export async function uploadProfileImage(file: File, userId: string) {
  const fileExt = file.name.split('.').pop();
  const filePath = `profile-images/${userId}.${fileExt}`;

  const result = await storageManager.upload(
    'profile-images',
    filePath,
    file,
    {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600'
    }
  );

  return result.publicUrl;
}
```

### مثال 2: رفع فيديو

```typescript
import { storageManager } from '@/lib/storage';

export async function uploadVideo(file: File, userId: string) {
  // التحقق من الحجم
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('حجم الفيديو كبير جداً (الحد الأقصى: 100MB)');
  }

  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const filePath = `videos/${userId}/${timestamp}.${fileExt}`;

  const result = await storageManager.upload(
    'videos',
    filePath,
    file,
    {
      contentType: file.type,
      cacheControl: '3600'
    }
  );

  return {
    url: result.publicUrl,
    path: result.path
  };
}
```

### مثال 3: حذف ملف قديم

```typescript
import { storageManager } from '@/lib/storage';

export async function deleteOldFile(fileUrl: string) {
  // استخراج المسار من الرابط
  const urlParts = fileUrl.split('/storage/v1/object/public/');
  if (urlParts.length < 2) return;

  const [bucket, ...pathParts] = urlParts[1].split('/');
  const filePath = pathParts.join('/');

  const result = await storageManager.delete(bucket, filePath);
  
  if (!result.success) {
    console.error('فشل الحذف:', result.error);
  }
}
```

---

## 🎯 خطة الانتقال الموصى بها

### المرحلة 1: التحضير (يوم واحد)

1. ✅ إنشاء حساب Cloudflare R2
2. ✅ إنشاء Buckets بنفس أسماء Supabase
3. ✅ الحصول على API Keys
4. ✅ إضافة المتغيرات إلى `.env.local`

### المرحلة 2: الاختبار (يومان)

```env
NEXT_PUBLIC_STORAGE_PROVIDER=hybrid
NEXT_PUBLIC_PRIMARY_STORAGE_PROVIDER=cloudflare
```

1. ✅ اختبار رفع ملفات جديدة
2. ✅ التأكد من عمل القراءة من كلا المزودين
3. ✅ اختبار الحذف

### المرحلة 3: الانتقال (أسبوع)

1. ✅ تفعيل Hybrid Mode في الإنتاج
2. ✅ مراقبة الأخطاء والأداء
3. ✅ بدء نقل الملفات القديمة تدريجياً (سكريبت قريباً)

### المرحلة 4: الإكمال

```env
NEXT_PUBLIC_STORAGE_PROVIDER=cloudflare
```

1. ✅ بعد نقل جميع الملفات
2. ✅ التبديل إلى Cloudflare فقط
3. ✅ حذف الملفات من Supabase (اختياري)

---

## 📊 مقارنة التكاليف

| المزود | التخزين (GB/شهر) | Bandwidth (GB/شهر) | السعر الشهري |
|--------|------------------|-------------------|--------------|
| **Supabase Free** | 1 GB | 10 GB | $0 |
| **Supabase Pro** | 100 GB | 200 GB | $25 |
| **Cloudflare R2** | 10 GB | Unlimited | $0 |
| **Cloudflare R2** | 100 GB | Unlimited | $1.50 |

**ملاحظة**: Cloudflare R2 لا يفرض رسوم على Egress (التحميل)!

---

## ⚠️ ملاحظات مهمة

### حدود Supabase المجانية

- **Bandwidth**: 10 GB/شهر (~333 MB/يوم)
- **Storage**: 1 GB
- لنقل 1 GB: سيستغرق ~3 أيام بأمان

### نصائح للانتقال

1. ✅ ابدأ بالملفات الجديدة فقط (Hybrid Mode)
2. ✅ انقل الملفات القديمة تدريجياً
3. ✅ احتفظ بنسخة في Supabase حتى تتأكد
4. ✅ راقب استهلاك Bandwidth في Supabase

---

## 🐛 استكشاف الأخطاء

### الخطأ: "Cloudflare credentials missing"

**الحل**: تأكد من إضافة جميع متغيرات Cloudflare في `.env.local`

### الخطأ: "Copy operation is not supported"

**الحل**: عمليات Copy/Move غير مدعومة في Supabase، استخدم Upload ثم Delete

### الخطأ: "فشل في رفع الملف"

**الحل**: 
1. تحقق من صلاحيات API Token
2. تأكد من وجود Bucket
3. تحقق من حجم الملف

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من Console للأخطاء
2. راجع ملف `.env.local`
3. جرب التبديل إلى `supabase` مؤقتاً

---

## 🚀 الخطوات التالية

- [ ] إنشاء سكريبت نقل الملفات التلقائي
- [ ] إنشاء سكريبت تحديث URLs في قاعدة البيانات
- [ ] إضافة دعم AWS S3
- [ ] إضافة Progress Tracking للرفع
- [ ] إضافة Image Optimization

---

**تم إنشاؤه بواسطة**: Antigravity AI  
**التاريخ**: 2025-12-10  
**الإصدار**: 1.0.0
