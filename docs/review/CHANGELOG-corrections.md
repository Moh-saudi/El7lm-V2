# CHANGELOG — سجل التصحيحات

**التاريخ:** 2026-09-24
**المراجع:** قراءة مباشرة من الكود

| # | الملف | القسم | قبل | بعد | السبب | الدليل |
|---|-------|-------|-----|-----|-------|--------|
| 1 | 01-auth.md | عدد Queries في findAccountByPhone | "~20+" | **27 بالضبط** (Promise.all) | حساب دقيق من TABLE_PHONE_FIELDS | `phone-account-lookup.ts:33-41,90-106` |
| 2 | 01-auth.md | آلية الاستعلام | "7 جداول × N variants" | **7 جداول × N حقول = 27، كل استعلام يستخدم .in(field, variants)** | الكود يُولِّد query لكل حقل لا لكل variant | `phone-account-lookup.ts:90-103` |
| 3 | 01-auth.md | loop في verify-otp | "N×M queries متتابعة في كل الأحوال" | **يتوقف عند أول إيجاد (break) — أسوأ حال = 8 collections × N variants** | وجود `break` في الكود | `verify-otp-and-check:61,64` |
| 4 | 01-auth.md | حذف الـ Loop | "آمن تماماً" | **آمن مع تحفظ: admins في Loop وليس في findAccountByPhone** | `SEARCH_COLLECTIONS` تشمل 'admins' | `verify-otp-and-check:13` |
| 5 | 01-auth.md | listUsers في phone-account-lookup | "perPage:1000" | **صحيح `{page:1, perPage:1000}`** | تأكيد | `phone-account-lookup.ts:138-141` |
| 6 | 02-whatsapp.md | عدد HTTP calls | "1-3 calls" | **أقصاه 3 calls متتابعة (template+button, template-button, direct)** | منطق `||` ثم fallback | `unified-otp-service.ts:152,160` |
| 7 | 03-database.md | Indexes في schema.sql | "يحتاج قياس" | **[مؤكد بالكود] لا توجد CREATE INDEX في schema.sql** | grep لم يجد شيئاً | `schema.sql` |
| 8 | 03-database.md | RLS في schema.sql | "يحتاج قياس" | **[مؤكد بالكود] لا توجد ENABLE ROW LEVEL SECURITY في schema.sql** | grep لم يجد شيئاً | `schema.sql` |
| 9 | 04-api.md | upload/video auth | "getAuthUser موجودة لكن لا تُستخدم" | **مؤكد — grep وجد تعريفاً واحداً فقط (لا استدعاء)** | `Select-String` | `upload/video/route.ts:25,39` |
| 10 | 04-api.md | media/proxy-video | لم يُذكر | **[مؤكد] لا Auth** | grep | `media/proxy-video/route.ts` |
| 11 | 04-api.md | media/analyze-video | لم يُذكر | **[مؤكد] لا Auth** | grep | `media/analyze-video/route.ts` |
| 12 | 05-flutter.md | sendOTP phone format | "قد يختلف" | **مثبت: getDocId يستخدم رقماً مختلفاً إذا أرسل Flutter صيغة مختلفة** | تتبع الكود | `otp-manager.ts:18-20`, `unified-otp-service.ts:17-24` |
| 13 | 08-security.md | OTP hash | "SHA-256 مباشر" | **صحيح — بلا Salt** | `otp-manager.ts:14-16` | — |
