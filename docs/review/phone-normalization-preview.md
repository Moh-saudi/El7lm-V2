# تقرير المعاينة لتصحيح أرقام الصنف B (Class B Phone Normalization Preview)

**تاريخ التقرير:** 2026-09-25  
**المشروع:** El7lm-V2 — منصة الحلم الرياضية  
**المرحلة:** Phase 2.7 — Safe Phone Normalization Execution  
**الحالة:** تقرير معاينة قبل التنفيذ (Preview Report - Pending User Approval)  
**القواعد الصارمة:**
- **لا دمج (No Merge)**
- **لا حذف (No Delete)**
- **لا تغيير للحسابات (No Account Replacement)**
- **تنفيذ التعديل فقط بعد الموافقة الصريحة بالـ `--commit`.**

---

## 1. الملخص الهندسي للتصحيح

| المؤشر | القيمة | الشرح الهندسي |
| :--- | :---: | :--- |
| **إجمالي أرقام الصنف B المستهدفة** | **10 أرقام** | أرقام مصرية مسجلة ببادئة مشوهة `+10...` أو `+12...` ينقصها كود `+20` |
| **إجمالي الحسابات المعنية بالتعديل** | **26 حساباً** | تتوزع عبر جدولي `players` (18 حساباً) و `users` (8 حسابات) |
| **التحقق من التعارضات (Conflict Check)** | **آمن بنسبة 100%** | جميع السجلات المرتبطة بالصيغة السليمة تخص **نفس المستخدمين** |
| **توافقية الـ OTP بعد التصحيح** | **100% متوافق** | تصبح كافة الأرقام بالصيغة الدولية القياسية E.164 (`+2010...` / `+2012...`) |
| **تعارضات الفهرس قبل التصحيح** | **121 رقماً** | إجمالي الأرقام المتعارضة المعزولة |
| **تعارضات الفهرس بعد التصحيح (المحاكاة)** | **111 رقماً** | انخفاض مباشر بمقدار 10 أرقام مشوهة تم شفاؤها |
| **أي تعارضات جديدة (New Conflicts)** | **0 (لا توجد أي تعارضات جديدة)** | لم يظهر أي رقم متعارض جديد إطلاقاً |

---

## 2. جدول المعاينة التفصيلي (Preview Table — TASK Requirements)

| # | old_phone | new_phone | account_id | table | conflict_check | otp_compatibility_check |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| 1 | `+101499936` | **`+20101499936`** | `DUmbOIT7qsYNxL02QdYK4oPGobq1` | `players` | ✅ آمن: يتطابق مع 4 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 2 | `+101499936` | **`+20101499936`** | `hk1WcoGFc2bKDofWl7kOCeKilI53` | `players` | ✅ آمن: يتطابق مع 4 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 3 | `+101824937` | **`+20101824937`** | `DAmzLbIdIDdgBFkpEPvQntVhQCC3` | `users` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 4 | `+101824937` | **`+20101824937`** | `0FuH5wD6PfTtGe4uXhkxcYFfaai1` | `users` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 5 | `+101993278` | **`+20101993278`** | `LGBFQZrBUzLxEmh77aLQRtv7KRw2` | `players` | ✅ آمن: يتطابق مع 3 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 6 | `+101993278` | **`+20101993278`** | `T2YwllYRmiWOTHycjW6tdUzjGuD3` | `players` | ✅ آمن: يتطابق مع 3 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 7 | `+101993278` | **`+20101993278`** | `ZINDYoIpWOX4LxwuCQP3CSd1F2l2` | `players` | ✅ آمن: يتطابق مع 3 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 8 | `+102939499` | **`+20102939499`** | `neEfb9khgDNT0EmA9zfmuakaLTi2` | `players` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 9 | `+102939499` | **`+20102939499`** | `IX34KOCXrccUHSaj7JGOgMO7nzA2` | `players` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 10 | `+102980282` | **`+20102980282`** | `YUezyttc4WPUTiq1wHgbwMsGnB82` | `players` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 11 | `+102980282` | **`+20102980282`** | `ttSoUdgH5yPfPVroOHwk76rGCS42` | `players` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 12 | `+103338202` | **`+20103338202`** | `FfX9wD3YhpXvoBTn7kBbNn0gIow1` | `users` | ✅ آمن: يتطابق مع 3 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 13 | `+103338202` | **`+20103338202`** | `PY5Nr0L7qZQJoceL8D2SgeD9mcv2` | `users` | ✅ آمن: يتطابق مع 3 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 14 | `+103338202` | **`+20103338202`** | `qyADQuQ3tgP0eyda5u3RHirHkv63` | `users` | ✅ آمن: يتطابق مع 3 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 15 | `+106078056` | **`+20106078056`** | `aygnJ71o5tTBXgtmLCCYKVw2zg82` | `players` | ✅ آمن: يتطابق مع 5 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 16 | `+106078056` | **`+20106078056`** | `cboFvgjr8dU7RbcvHgfc3h7Eexo1` | `players` | ✅ آمن: يتطابق مع 5 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 17 | `+106078056` | **`+20106078056`** | `PGAdTYh8xpSF81fj8yxxG7cnDWD2` | `players` | ✅ آمن: يتطابق مع 5 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 18 | `+106078056` | **`+20106078056`** | `uTNhyvCp9QWcVLZax7wXwTQjSyu2` | `players` | ✅ آمن: يتطابق مع 5 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 19 | `+106078056` | **`+20106078056`** | `jQprN3XSQ0T22vOtriGPiKHWQ3O2` | `players` | ✅ آمن: يتطابق مع 5 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 20 | `+106461108` | **`+20106461108`** | `5GPkOLHk0KhgzDPr3NrSR9yNfVl1` | `users` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 21 | `+106461108` | **`+20106461108`** | `v7lDpI2O42VXz3G1aUtqCiwMKcR2` | `users` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 22 | `+109270428` | **`+20109270428`** | `IT83aO1vtsPMb8ClCW6uNR6wLj73` | `players` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 23 | `+109270428` | **`+20109270428`** | `G0jJVt23N5WcuZwPiclLZFxE7Ny1` | `players` | ✅ آمن: يتطابق مع 2 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 24 | `+128059923` | **`+20128059923`** | `Kn3NlMQA0iT5TEIsr9DNvcCnJ1j2` | `players` | ✅ آمن: يتطابق مع 4 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 25 | `+128059923` | **`+20128059923`** | `L0q5pWIWNoeQTNAHTofFVBZR4Is2` | `players` | ✅ آمن: يتطابق مع 4 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |
| 26 | `+128059923` | **`+20128059923`** | `RWM6ipzXWCTlWKhVPuafwVLsEPf1` | `players` | ✅ آمن: يتطابق مع 4 سجل لنفس المستخدم بالاسم | سابقاً: ❌ INCOMPATIBLE (Missing +20 code)<br>لاحقاً: ✅ COMPATIBLE (Valid E.164 Egyptian mobile) |

---

## 3. تفصيل الحسابات حسب أرقام الهواتف (Group Breakdown)

### المجموعة: `+101499936` ➔ `+20101499936` (2 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `DUmbOIT7qsYNxL02QdYK4oPGobq1` | `players` | محمد رضا كمال عبدالمجيد محمود الشافعي | `p20_20101499936@el7lm.com` | `phone: 101499936` ➔ `+20101499936` |
| `hk1WcoGFc2bKDofWl7kOCeKilI53` | `players` | محمد رضا كمال عبد المجيد محمود الشافعي | `p20_20101499936@el7lm.com` | `phone: 101499936` ➔ `+20101499936` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20101499936`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+101824937` ➔ `+20101824937` (2 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `DAmzLbIdIDdgBFkpEPvQntVhQCC3` | `users` | كابتن محمود ساديو | `user_20_20101824937_1758021368774_j2un9g@el7lm.com` | `phone: 20101824937` ➔ `+20101824937` |
| `0FuH5wD6PfTtGe4uXhkxcYFfaai1` | `users` | ك محمود ساديو | `user_20_20101824937_1758021206212_vin53j@el7lm.com` | `phone: 20101824937` ➔ `+20101824937` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20101824937`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+101993278` ➔ `+20101993278` (3 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `LGBFQZrBUzLxEmh77aLQRtv7KRw2` | `players` | معاذ رمضان القاضي | `p20_20101993278@el7lm.com` | `phone: 101993278` ➔ `+20101993278` |
| `T2YwllYRmiWOTHycjW6tdUzjGuD3` | `players` | معاذ القاضي | `p20_20101993278@el7lm.com` | `phone: 101993278` ➔ `+20101993278` |
| `ZINDYoIpWOX4LxwuCQP3CSd1F2l2` | `players` | معاذ رمضان القاضي | `p20_20101993278@el7lm.com` | `phone: 101993278` ➔ `+20101993278` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20101993278`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+102939499` ➔ `+20102939499` (2 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `neEfb9khgDNT0EmA9zfmuakaLTi2` | `players` | محمد جمعه محمد | `p20_20102939499@el7lm.com` | `phone: 102939499` ➔ `+20102939499` |
| `IX34KOCXrccUHSaj7JGOgMO7nzA2` | `players` | محمد جمعه محمد | `p20_20102939499@el7lm.com` | `phone: 102939499` ➔ `+20102939499` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20102939499`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+102980282` ➔ `+20102980282` (2 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `YUezyttc4WPUTiq1wHgbwMsGnB82` | `players` | ادهم كمال الشهابي | `p20_20102980282@el7lm.com` | `phone: 102980282` ➔ `+20102980282` |
| `ttSoUdgH5yPfPVroOHwk76rGCS42` | `players` | ادهم كمال الشهابي | `p20_20102980282@el7lm.com` | `phone: 102980282` ➔ `+20102980282` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20102980282`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+103338202` ➔ `+20103338202` (3 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `FfX9wD3YhpXvoBTn7kBbNn0gIow1` | `users` | حسام محمد محمد عثمان | `user_20_20103338202_1759134537407_7tptpr@el7lm.com` | `phone: 20103338202` ➔ `+20103338202` |
| `PY5Nr0L7qZQJoceL8D2SgeD9mcv2` | `users` | حسام محمد محمد عثمان | `user_20_20103338202_1759169268994_rfidq9@el7lm.com` | `phone: 20103338202` ➔ `+20103338202` |
| `qyADQuQ3tgP0eyda5u3RHirHkv63` | `users` | حسام محمد محمد عثمان | `user_20_20103338202_1759134646636_j3wwsy@el7lm.com` | `phone: 20103338202` ➔ `+20103338202` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20103338202`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+106078056` ➔ `+20106078056` (5 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `aygnJ71o5tTBXgtmLCCYKVw2zg82` | `players` | يوسف محمد السيد صفا | `p20_20106078056@el7lm.com` | `phone: 106078056` ➔ `+20106078056` |
| `cboFvgjr8dU7RbcvHgfc3h7Eexo1` | `players` | يوسف محمد السيد صفا | `p20_20106078056@el7lm.com` | `phone: 106078056` ➔ `+20106078056` |
| `PGAdTYh8xpSF81fj8yxxG7cnDWD2` | `players` | يوسف محمد صفا | `p20_20106078056@el7lm.com` | `phone: 106078056` ➔ `+20106078056` |
| `uTNhyvCp9QWcVLZax7wXwTQjSyu2` | `players` | يوسف محمد السيد صفا | `p20_20106078056@el7lm.com` | `phone: 106078056` ➔ `+20106078056` |
| `jQprN3XSQ0T22vOtriGPiKHWQ3O2` | `players` | يوسف محمد السيد صفا | `p20_20106078056@el7lm.com` | `phone: 106078056` ➔ `+20106078056` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20106078056`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+106461108` ➔ `+20106461108` (2 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `5GPkOLHk0KhgzDPr3NrSR9yNfVl1` | `users` | شعبان محمد ركابى | `c20_20106461108@el7lm.com` | `phone: 20106461108` ➔ `+20106461108` |
| `v7lDpI2O42VXz3G1aUtqCiwMKcR2` | `users` | شعبان محمد ركابى | `m20_20106461108@el7lm.com` | `phone: 20106461108` ➔ `+20106461108` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20106461108`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+109270428` ➔ `+20109270428` (2 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `IT83aO1vtsPMb8ClCW6uNR6wLj73` | `players` | محمد خالد صقر | `p20_20109270428@el7lm.com` | `phone: 109270428` ➔ `+20109270428` |
| `G0jJVt23N5WcuZwPiclLZFxE7Ny1` | `players` | محمد خالد صقر | `p20_20109270428@el7lm.com` | `phone: 109270428` ➔ `+20109270428` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20109270428`). لا يتم دمج أو حذف أي حساب.

---

### المجموعة: `+128059923` ➔ `+20128059923` (3 حسابات)

| المعرف (Account ID) | الجدول | الاسم المسجل | البريد الإلكتروني | الحقل المتأثر في DB |
| :--- | :---: | :--- | :--- | :--- |
| `Kn3NlMQA0iT5TEIsr9DNvcCnJ1j2` | `players` | يوسف احمد معوض غندور | `p20_0128059923@el7lm.com` | `phone: 128059923` ➔ `+20128059923` |
| `L0q5pWIWNoeQTNAHTofFVBZR4Is2` | `players` | يوسف احمد معوض غندور | `p20_20128059923@el7lm.com` | `phone: 128059923` ➔ `+20128059923` |
| `RWM6ipzXWCTlWKhVPuafwVLsEPf1` | `players` | يوسف احمد معوض غندور | `p20_20128059923@el7lm.com` | `phone: 128059923` ➔ `+20128059923` |

> **ملاحظة التدقيق:** البريد الإلكتروني للحسابات يؤكد صحة الرقم المصري القياسي (`+20128059923`). لا يتم دمج أو حذف أي حساب.

---

## 4. خطة الأمان والتنفيذ (Safety Execution Protocol)

1. تم إعداد السكريبت المخصص `scripts/correct-class-b-phones.mjs` مع التزام كامل بعدم الحذف وعدم الدمج.
2. **التعديل ينحصر فقط في حقل الهاتف**: تحديث `phone` و `phoneNormalized` بالصيغة القياسية المصححة `+20...`.
3. **الخطوة التالية بانتظار الموافقة:** فور تأكيد المشرف/العميل للمعاينة، سيتم تشغيل:
   ```bash
   node scripts/correct-class-b-phones.mjs --commit
   node scripts/backfill-phone-accounts-index.mjs --commit
   ```
