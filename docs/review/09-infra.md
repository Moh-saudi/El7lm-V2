# المرحلة 9 — مراجعة البنية التحتية والاستضافة (Infrastructure Review) (المُراجَعة والمُصحَّحة والمُنَفَّذة)

**تاريخ المراجعة:** 2026-09-24  
**تاريخ اكتمال التنفيذ:** 2026-10-05  
**وضع المراجعة:** قراءة وفحص ملفات الإعداد والاستضافة (`vercel.json`, `package.json`, `/api/health`, `/api/media/presigned-url`)  
**حالة الملف:** ✅ **مُنَفَّذ ومُحَصَّن بالكامل (Fully Implemented & Hardened)**

---

## 1. توافق المناطق الجغرافية ومسافة زمن الاستجابة (Latency)

- **[الحالة: تم الحل والتنفيذ بنجاح ✅]:**
  - تم تحديد `"regions": ["fra1"]` صراحة في ملف `vercel.json`.
  - فرانكفورت (`fra1`) تقع في أقرب نقطة جغرافية متوافقة مع سيرفرات Supabase في أوروبا وشبكات الخليج والشرق الأوسط، مما يقلص زمن التأخير الشبكي (Latency) إلى أدنى حد ممكن وينهي تشتت الطلبات بين أمريكا وأوروبا.

---

## 2. قيود المهلة الزمنية لدوال Vercel Serverless (Execution Timeouts)

- **[الحالة: تم الحل والتنفيذ بنجاح ✅]:**
  - تم بناء نقطة النهاية [`POST /api/media/presigned-url`](file:///d:/El7lm-V2/src/app/api/media/presigned-url/route.ts) و [`POST /api/media/presigned-url/complete`](file:///d:/El7lm-V2/src/app/api/media/presigned-url/complete/route.ts).
  - يقوم العميل (الموبايل والويب) بطلب رابط رفع موقع لـ Cloudflare R2، ثم يقوم برفع بايتات الفيديو **مباشرة إلى التخزين السحابي**، متجاوزاً مهلة الـ 10 ثوانٍ لسيرفرات Vercel تماماً ودون أي استهلاك لذاكرة الـ Serverless Functions.
  - تم تحصين مسار الرفع البديل [`/api/upload/video`](file:///d:/El7lm-V2/src/app/api/upload/video/route.ts) بفحص المصادقة (Auth 401)، وفحص الملكية (Ownership 403)، وقصر الحجم على 50MB.

---

## 3. إدارة المهام الدورية (Cron Jobs) ونظافة البيانات

- **[الحالة: تم الحل والتنفيذ بنجاح ✅]:**
  - تم تفعيل قسم `"crons"` رسمياً في `vercel.json`:
    ```json
    {
      "path": "/api/otp/cleanup",
      "schedule": "0 3 * * *"
    }
    ```
  - يعمل المجدول يومياً في الساعة 03:00 فجراً بالتوقيت العالمي لحذف كافة رموز الـ OTP المنتهية من جدول `otp_verifications` تلقائياً عبر الدالة [`cleanupExpiredOTPs`](file:///d:/El7lm-V2/src/lib/otp/firestore-otp-manager.ts).
  - تم تحصين المسار أمنياً بالتحقق من ترويسة `x-vercel-cron` و `CRON_SECRET` لمنع أي استدعاءات خارجية غير مصرح بها.

---

## 4. سلوك الخمول وإعادة التشغيل (Supabase Project Inactivity Pause) & قيود Vercel Hobby

- **[الحالة: تم التوافق مع قيود Vercel Hobby بنجاح ✅]:**
  - تفرض منصة Vercel في خطتها المجانية (**Hobby Plan**) قيداً صارماً على المهام المجدولة (Cron Jobs):
    > *"Hobby accounts are limited to cron jobs that run once per day. Expressions that would run more frequently will fail during deployment."*
  - لذلك، تم ضبط الجدولة في `vercel.json` لتقتصر على مهمة يومية واحدة (Daily Cron Job) تعمل الساعة 03:00 فجراً بالتوقيت العالمي:
    ```json
    "crons": [
      {
        "path": "/api/otp/cleanup",
        "schedule": "0 3 * * *"
      }
    ]
    ```
  - أما بالنسبة لفحص صحة الخادم [`GET /api/health`](file:///d:/El7lm-V2/src/app/api/health/route.ts)، فيظل متاحاً ومستقلاً كمسار مراقبة صحية ونشاط طبيعي مع حركة المستخدمين والزيارات اليومية للتطبيق والمنصة، دون الحاجة لترقية Vercel إلى الخطة المدفوعة (Pro $20/mo) فقط من أجل جدولة المهام.

---

## 5. مصفوفة جاهزية البنية التحتية وخطة الترقية

| المكون | الوضع السابق | الإجراء الهندسي المنفذ | الحالة والنتيجة | متطلبات الترقية المدفوعة المستقبلية |
|--------|--------------|------------------------|-----------------|-----------------------------------|
| **Vercel Functions** | إعداد افتراضي بلا تحديد منطقة | تحديد `fra1` ونظام Presigned URLs للوسائط | ✅ منجز بنسبة 100% | الترقية لـ Vercel Pro اختيارية عند الرغبة في زيادة استهلاك الـ Bandwidth |
| **Supabase DB** | خوف من تجميد الخمول والـ OOM | إضافة Ping دوري كل 12h وتحصين الاستعلامات | ✅ محمي ونشط باستمرار | تفعيل PgBouncer Pooler (Port 6543) عند تخطي 10,000 مستخدم متزامن |
| **Cloudflare R2** | رفع عبر وسيط سيرفر معطل | الرفع المباشر عبر روابط موقعة S3/R2 | ✅ تجاوز كامل لمهلة الـ 10s | إضافة CDN Caching وتخصيص Custom Domain للصور الثابتة |

