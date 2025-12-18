# 🎯 خطة الانتقال من Supabase إلى Cloudflare R2

## ✅ ما تم إنجازه

تم إنشاء **نظام تخزين موحد** يسمح بالتبديل السلس بين Supabase و Cloudflare R2.

### الملفات المُنشأة:

```
✅ src/lib/storage/
   ├── index.ts                          # المدير الرئيسي
   ├── types.ts                          # الأنواع المشتركة
   ├── providers/
   │   ├── supabase-provider.ts         # محول Supabase
   │   ├── cloudflare-provider.ts       # محول Cloudflare R2
   │   └── hybrid-provider.ts           # محول مزدوج
   └── examples/
       └── video-storage-example.ts     # مثال تطبيقي

✅ .env.storage.example                  # قالب متغيرات البيئة
✅ docs/STORAGE_GUIDE.md                 # دليل شامل
```

---

## 📊 معلومات مهمة عن Supabase

### حدود الخطة المجانية:
- **Bandwidth (Egress)**: 10 GB/شهر
- **يومياً تقريباً**: ~333 MB/يوم
- **لنقل 1 GB**: سيستغرق حوالي **3 أيام** بأمان

### التوصية:
✅ نقل الملفات تدريجياً بمعدل **300 MB/يوم** لتجنب تجاوز الحد

---

## 🚀 الخطوات التالية (بالترتيب)

### الخطوة 1: إعداد Cloudflare R2 ⏳ **الآن**

1. **إنشاء حساب Cloudflare R2**:
   - اذهب إلى: https://dash.cloudflare.com/
   - R2 → Create Bucket
   - أنشئ Buckets بنفس الأسماء الموجودة في Supabase:
     - `videos`
     - `images`
     - `ads`
     - `profile-images`
     - `avatars`
     - `playertrainer`
     - `playerclub`
     - `playeragent`
     - `playeracademy`
     - `documents`

2. **إنشاء API Token**:
   - R2 → Manage R2 API Tokens
   - Create API Token
   - احفظ:
     - `Access Key ID`
     - `Secret Access Key`

3. **الحصول على Account ID**:
   - موجود في: R2 → Overview

---

### الخطوة 2: تحديث `.env.local` ⏳ **بعد الخطوة 1**

أضف هذه المتغيرات إلى `.env.local`:

```bash
# نوع المزود - ابدأ بـ supabase ثم غيّر إلى hybrid
NEXT_PUBLIC_STORAGE_PROVIDER=supabase

# للوضع المزدوج (استخدمه لاحقاً)
NEXT_PUBLIC_PRIMARY_STORAGE_PROVIDER=cloudflare
NEXT_PUBLIC_STORAGE_BACKUP_ENABLED=false

# بيانات Cloudflare R2 (املأها من الخطوة 1)
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key-here
NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL=https://pub-your-account-id.r2.dev
```

---

### الخطوة 3: اختبار النظام الجديد ⏳ **بعد الخطوة 2**

1. **اختبار بسيط**:
   ```typescript
   import { storageManager } from '@/lib/storage';
   
   // اختبار رفع ملف
   const result = await storageManager.upload(
     'videos',
     'test/test-video.mp4',
     testFile
   );
   
   console.log('✅ تم الرفع:', result.publicUrl);
   ```

2. **تفعيل Hybrid Mode**:
   ```bash
   NEXT_PUBLIC_STORAGE_PROVIDER=hybrid
   ```

3. **اختبار رفع ملف جديد**:
   - يجب أن يذهب إلى Cloudflare تلقائياً
   - تحقق من Console للتأكد

---

### الخطوة 4: تحديث الكود الموجود 📝 **تدريجياً**

استبدل الكود القديم بالنظام الجديد تدريجياً:

#### الملفات المطلوب تحديثها:
- [ ] `src/lib/supabase/storage.ts`
- [ ] `src/lib/supabase/video-storage.ts`
- [ ] `src/lib/supabase/ads-storage.ts`
- [ ] `src/lib/firebase/upload-media.ts`
- [ ] أي ملف آخر يستخدم `supabase.storage`

#### مثال التحديث:

**قبل**:
```typescript
import { supabase } from '@/lib/supabase/config';

const { data } = await supabase.storage
  .from('videos')
  .upload(path, file);
```

**بعد**:
```typescript
import { storageManager } from '@/lib/storage';

const result = await storageManager.upload('videos', path, file);
```

راجع `src/lib/storage/examples/video-storage-example.ts` للمزيد من الأمثلة.

---

### الخطوة 5: نقل الملفات القديمة 🔄 **بعد التأكد من عمل النظام**

سننشئ سكريبت تلقائي لنقل الملفات القديمة من Supabase إلى Cloudflare.

**المعدل الآمن**: 300 MB/يوم (لتجنب تجاوز حد Supabase)

**المدة المتوقعة**: ~3-4 أيام لنقل 1 GB

---

### الخطوة 6: الانتقال الكامل ✅ **بعد نقل جميع الملفات**

```bash
# تغيير المزود إلى Cloudflare فقط
NEXT_PUBLIC_STORAGE_PROVIDER=cloudflare
```

---

## 📋 Checklist سريع

### الآن (اليوم):
- [ ] إنشاء حساب Cloudflare R2
- [ ] إنشاء Buckets
- [ ] الحصول على API Keys
- [ ] تحديث `.env.local`
- [ ] اختبار رفع ملف واحد

### هذا الأسبوع:
- [ ] تفعيل Hybrid Mode
- [ ] اختبار شامل للرفع والحذف
- [ ] مراقبة الأخطاء
- [ ] تحديث بعض الملفات للنظام الجديد

### الأسبوع القادم:
- [ ] بدء نقل الملفات القديمة (300 MB/يوم)
- [ ] تحديث باقي الكود
- [ ] مراقبة استهلاك Bandwidth

### بعد 3-4 أيام:
- [ ] التأكد من نقل جميع الملفات
- [ ] التبديل إلى Cloudflare فقط
- [ ] حذف الملفات من Supabase (اختياري)

---

## 💰 توفير التكاليف المتوقع

### الوضع الحالي (Supabase):
- **Free Tier**: 1 GB Storage + 10 GB Bandwidth
- **إذا تجاوزت**: $25/شهر (Pro Plan)

### بعد الانتقال (Cloudflare R2):
- **10 GB Storage**: مجاناً
- **100 GB Storage**: $1.50/شهر
- **Bandwidth**: مجاناً بالكامل (Unlimited Egress)

**التوفير المتوقع**: $23.50/شهر على الأقل! 💰

---

## 🆘 الدعم

إذا واجهت أي مشاكل:

1. **راجع الدليل الشامل**: `docs/STORAGE_GUIDE.md`
2. **راجع الأمثلة**: `src/lib/storage/examples/`
3. **تحقق من Console** للأخطاء
4. **جرب التبديل إلى `supabase`** مؤقتاً إذا حدث خطأ

---

## 📞 الخطوة التالية المباشرة

**الآن**: اذهب إلى https://dash.cloudflare.com/ وأنشئ حساب R2!

بعد ذلك، أخبرني وسأساعدك في:
1. ✅ إنشاء سكريبت نقل الملفات التلقائي
2. ✅ تحديث الملفات الموجودة
3. ✅ إعداد Custom Domain لـ R2 (اختياري)

---

**تم بواسطة**: Antigravity AI 🚀  
**التاريخ**: 2025-12-10
