# ✅ تم تحديث النظام بالكامل للهجرة إلى Cloudflare R2

لقد قمنا بتحديث جميع أجزاء النظام لتدعم Cloudflare R2 بدلاً من Supabase:

1.  **صور الملف الشخصي (Admin)** ✅
2.  **صور اللاعبين (Profile & Gallery)** ✅ (`src/lib/firebase/upload-media.ts`)
3.  **الفيديوهات** ✅ (`src/lib/supabase/video-storage.ts`)
4.  **الإعلانات** ✅ (`src/lib/supabase/ads-storage.ts`)

---

## ⚠️ خطوة أخيرة ومهمة جداً

أظهر الاختبار أن **API Token** الحالي ليس لديه صلاحية الكتابة (Write Permission).

### 🚨 يجب عليك:

1.  الذهاب إلى: https://dash.cloudflare.com/profile/api-tokens
2.  إنشاء **Token جديد** بالصلاحيات التالية:
    *   **Permissions**: `Object Read & Write` (مهم!)
    *   **Buckets**: `el7lmplatform` (أو All buckets)
3.  تحديث ملف `.env.local` بالقيم الجديدة:
    ```bash
    NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID=<New Access Key>
    NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY=<New Secret Key>
    ```
4.  **إعادة تشغيل النظام**:
    ```bash
    npm run dev
    ```

---

## 🧪 للتحقق

بعد تحديث الـ Token، يمكنك تشغيل سكريبت التحقق للتأكد:

```bash
npx tsx scripts/verify-r2-upload.ts
```

إذا ظهرت رسالة `✅ Upload successful!`، فهذا يعني أن النظام يعمل بالكامل ويمكنك البدء في رفع الصور والفيديوهات إلى Cloudflare R2.

---

**هل تريد مني تشغيل سكريبت التحقق مرة أخرى بعد أن تقوم بتحديث الـ Token؟**
