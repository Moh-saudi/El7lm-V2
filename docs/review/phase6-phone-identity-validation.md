# Phase 6 — Phone Identity Population & Validation Engine
**Validation Audit & Status Report (Strictly READ-ONLY)**

- **Date:** 2026-09-25
- **Platform:** El7lm-V2 / Hagzz
- **Audit Mode:** READ-ONLY (Zero Mutation)
- **Engine Rules:** E.164 Normalization (`country_code + phone_normalized`)

---

## 1. Compliance & Constraints Confirmation

In strict compliance with Phase 6 guidelines:
- [x] **Zero Records Updated:** No database record in any table has been modified.
- [x] **Zero Records Deleted:** No accounts or orphan rows have been deleted.
- [x] **Zero Records Merged:** No account data, player profiles, or credentials merged.
- [x] **Zero Migrations Executed:** No DDL scripts or schema alterations executed on live DB.
- [x] **Zero Constraints Added:** No unique constraints or foreign keys enforced on live DB.
- [x] **All 2,623 Accounts Analyzed:** Complete coverage across all 8 account tables.

---

## 2. Part A — Phone Identity Report

### 2.1 Global Summary Metrics

| Metric | Count | Percentage of Total | Notes |
| :--- | :--- | :--- | :--- |
| **Total Accounts Checked** | **2,623** | 100.0% | Complete inventory across 8 tables |
| **Valid Phones** | **1,914** | 73.0% | Normalized to valid E.164 format |
| **Invalid / Empty Phones** | **709** | 27.0% | 287 empty strings + 422 malformed/incomplete |
| **Missing Country Code (Recovered)** | **73** | 2.8% | Local format (e.g., `01x` -> `+20`, `05x` -> `+966`) |
| **Unique Phone Identities** | **1,093** | - | Distinct E.164 phone numbers |
| **Duplicate Phone Groups** | **962** | - | Phone numbers shared across 2 or more accounts |
| **Accounts in Duplicate Groups** | **2,205** | 84.1% | Accounts belonging to duplicate phone groups |
| **Test / Dummy Accounts Identified** | **82** | 3.1% | Test numbers, seed accounts, dev records |

### 2.2 Table-by-Table Breakdown

| Table Name | Total Checked Accounts | Role / Account Type |
| :--- | :--- | :--- |
| `users` | 1,357 | Base system users & auth records |
| `players` | 1,079 | Player profile records |
| `trainers` | 50 | Trainer / Coach profiles |
| `academies` | 39 | Academy profiles |
| `clubs` | 39 | Club profiles |
| `agents` | 29 | Player agent profiles |
| `marketers` | 27 | Marketer profiles |
| `admins` | 3 | System administrators |
| **Total** | **2,623** | **8 Tables Analyzed** |

---

## 3. Part B — Duplicate Phone Report

### 3.1 Root Cause & Duplicate Distribution

Of the **962** duplicate phone groups:
- **853 groups (88.7%)** consist of **exactly 2 accounts**: The overwhelming majority represent the identical human user having both a `users` record and a `players` record as an artifact of historical Firebase Firestore data exports.
- **72 groups (7.5%)** consist of **4 accounts**: Typically 2 re-registrations each having a `users` + `players` pair.
- **15 groups (1.6%)** consist of **3 accounts**: Multi-role registrations (e.g. user + player + trainer) or duplicated user rows.
- **22 groups (2.3%)** consist of **5 or more accounts**: Heavily duplicated test numbers, agency accounts, or shared facility contact numbers.

| Accounts per Phone Group | Groups Count | Total Associated Accounts | Primary Root Cause |
| :---: | :---: | :---: | :--- |
| **2** | 853 | 1,706 | Same-person dual record (`users` + `players`) |
| **3** | 15 | 45 | Multi-role or re-registration |
| **4** | 72 | 288 | Dual re-registration (`users` + `players` x 2) |
| **5** | 3 | 15 | Repeated test/demo registration |
| **6** | 9 | 54 | Repeated registration or shared agency contact |
| **7** | 1 | 7 | Shared support or test phone |
| **8** | 2 | 16 | Test/seed account cluster |
| **9** | 2 | 18 | Test/seed account cluster |
| **10** | 3 | 30 | High-frequency test & QA phone |
| **11** | 1 | 11 | Known dummy phone (`0111111111`) |
| **15** | 1 | 15 | Heavily repeated test number (`+201017799580`) |

---

### 3.2 Top Duplicate Phone Groups Breakdown

Here are the highest-density duplicate phone groups, including account IDs, tables, names, and activity scores (Activity Score = Videos x 10 + Messages x 5 + Notifications + Login Bonus):

#### Group 1: `+201017799580` (Egypt) — 15 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `2Uj9vwRn9jfVsQtrvX4B` | `users` | admin | مصطفي محمد | mo@el7lm.com | 0 / 1 / 0 | **10** |
| `AjZm7yasznYN5n7qgL9Z` | `users` | admin | شريف حسن | sh@el7lm.com | 0 / 0 / 0 | **5** |
| `IOLqqZ1Lvqep1RcPTAAz9px4CJU2` | `users` | player | مصطفي اسماعيل | 201017799580@el7lm.com | 0 / 0 / 0 | **5** |
| `ml99m6hRCYe2F9By1G7uDTBk8cn1` | `users` | player | محمد جمال الدين | None | 0 / 0 / 1 | **6** |
| `GQSMfDZabaaMbQxI22ZqOsWmcA32` | `players` | player | mohamed saudi | p20_201017799580@el7lm... | 0 / 31 / 58 | **218** |
| `HTMQqeUeTi8lsdlYfskV` | `players` | player | حمزة العليمي | user_20_201017799580_1... | 0 / 0 / 2 | **7** |
| `UCRYaIbDNBHqtA0Y4eJs` | `players` | player | Mohamed saudi | mo.saudi19@gmail.com | 0 / 0 / 0 | **5** |
| `7VwkM1UIFdcfiVSFBvm1` | `players` | player | مختار | eskllcqa@gmail.com | 0 / 0 / 0 | **5** |
| `XTx6sHL0Bta5B6iBMIko79A398k1` | `players` | player | احمد جمال محمد  | m@go.com | 0 / 0 / 1 | **6** |
| `XeiioYl6l3RXRiUqJyPi7jjrmz32` | `players` | player | احمد محمد ياسين | m@go.com | 0 / 1 / 4 | **14** |
| `wN7Tv9OnjPMP84qTfmp6` | `players` | player | محمد حسام | mo.saudi19@gmail.com | 0 / 0 / 1 | **6** |
| `orpTdxCsJVEWHFhSDFez` | `players` | player | سيسس | q@q.com | 1 / 0 / 3 | **18** |
| `M7UP64xP6aLdUR8spJae` | `players` | player | مازن السيد | mo.saudi19@gmail.com | 0 / 0 / 0 | **5** |
| `TnSvLJgehmftXNY024Y0cjib6NI3` | `players` | player | علي محمد | p218_0555555555@el7lm.com | 1 / 15 / 9 | **99** |
| `IOLqqZ1Lvqep1RcPTAAz9px4CJU2` | `players` | player | مصطفي اسماعيل | 201017799580@el7lm.com | 1 / 0 / 0 | **15** |

#### Group 2: `0111111111` (Invalid) — 11 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `Q2yKTAqbmeYxIeFqZmlljL1NJsS2` | `users` | agent | نادر شوقي  | ag20_0111111111@el7lm.com | 0 / 5 / 5 | **35** |
| `neqG4GAs7fWFSPew5xNBllh8wNC2` | `users` | player | محمد صلاح محسن | m@go.com | 0 / 0 / 6 | **11** |
| `8iuGxfKbL1xPHFfg3e4b` | `players` | player | علي مصطفي | m@go.com | 0 / 0 / 0 | **5** |
| `ELDzth11cuBv8nocdFcw` | `players` | player | الحاوي | m@go.com | 0 / 0 / 5 | **10** |
| `IANSStKPbyF4vC0awmlK` | `players` | player | خليل جميل | hagzz@mesk.com.qa | 0 / 0 / 0 | **5** |
| `64wYhyuYHaQGyI8bsLuz` | `players` | player | محمد صلاح محسن | m@go.com | 0 / 0 / 0 | **5** |
| `Tu0aTPYUh8UR7ETsH9pX` | `players` | player | عبدالظاهر السقا | m@go.com | 0 / 0 / 0 | **5** |
| `ihZnllLriZE5v8ciWtuI` | `players` | player | تيري هنري | m@go.com | 0 / 0 / 0 | **5** |
| `Q2yKTAqbmeYxIeFqZmlljL1NJsS2` | `clubs` | club | نادر شوقي  | 0111111111@hagzzgo.com | 0 / 5 / 5 | **35** |
| `Q2yKTAqbmeYxIeFqZmlljL1NJsS2` | `academies` | academy | نادر شوقي  | 0111111111@hagzzgo.com | 0 / 5 / 5 | **35** |
| `Q2yKTAqbmeYxIeFqZmlljL1NJsS2` | `trainers` | trainer | نادر شوقي  | 0111111111@hagzzgo.com | 0 / 5 / 5 | **35** |

#### Group 3: `+20106078056` (Egypt) — 10 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `uTNhyvCp9QWcVLZax7wXwTQjSyu2` | `users` | player | يوسف محمد السيد صفا  | user_20_20106078056_17... | 0 / 0 / 2 | **7** |
| `PGAdTYh8xpSF81fj8yxxG7cnDWD2` | `users` | player | يوسف محمد صفا | user_20_20106078056_17... | 0 / 0 / 2 | **2** |
| `jQprN3XSQ0T22vOtriGPiKHWQ3O2` | `users` | player | يوسف محمد السيد صفا  | user_20_20106078056_17... | 0 / 0 / 2 | **2** |
| `aygnJ71o5tTBXgtmLCCYKVw2zg82` | `users` | player | يوسف محمد السيد صفا  | user_20_20106078056_17... | 0 / 0 / 2 | **2** |
| `cboFvgjr8dU7RbcvHgfc3h7Eexo1` | `users` | player | يوسف محمد السيد صفا  | user_20_20106078056_17... | 0 / 0 / 2 | **2** |
| `aygnJ71o5tTBXgtmLCCYKVw2zg82` | `players` | player | يوسف محمد السيد صفا  | p20_20106078056@el7lm.com | 0 / 0 / 2 | **7** |
| `cboFvgjr8dU7RbcvHgfc3h7Eexo1` | `players` | player | يوسف محمد السيد صفا  | p20_20106078056@el7lm.com | 0 / 0 / 2 | **7** |
| `PGAdTYh8xpSF81fj8yxxG7cnDWD2` | `players` | player | يوسف محمد صفا | p20_20106078056@el7lm.com | 0 / 0 / 2 | **7** |
| `uTNhyvCp9QWcVLZax7wXwTQjSyu2` | `players` | player | يوسف محمد السيد صفا  | p20_20106078056@el7lm.com | 0 / 0 / 2 | **7** |
| `jQprN3XSQ0T22vOtriGPiKHWQ3O2` | `players` | player | يوسف محمد السيد صفا  | p20_20106078056@el7lm.com | 0 / 0 / 2 | **7** |

#### Group 4: `+97472053188` (Qatar) — 10 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `t1ev0surGVWVj3b5XOSxB22sycL2` | `users` | player | رضا جميل | p974_97472053188@el7lm... | 0 / 3 / 1 | **21** |
| `2qEmubLWjtU8yUyHJQtkJX9Fw582` | `users` | club | الدحيل اختبار | user_2qEmubLWjtU8yUyHJ... | 0 / 7 / 5 | **45** |
| `BgvcBwSls9WG97LSHAnMf53CSAx2` | `users` | club | الدحيل اختبار | user_BgvcBwSls9WG97LSH... | 0 / 1 / 4 | **14** |
| `Ei7gofYLCKc9oPFqmDcqLQhp0VS2` | `users` | club | الدحيل اختبار | user_Ei7gofYLCKc9oPFqm... | 0 / 0 / 3 | **8** |
| `E4P1SrsL2ban2fd5vwnnRJwmiLo1` | `users` | player | uuuuuuuSaudi | p974_72053188@el7lm.com | 0 / 0 / 4 | **4** |
| `E4P1SrsL2ban2fd5vwnnRJwmiLo1` | `players` | player | uuuuuuuSaudi | p974_72053188@el7lm.com | 3 / 0 / 4 | **39** |
| `t1ev0surGVWVj3b5XOSxB22sycL2` | `players` | player | رضا جميل | p974_97472053188@el7lm... | 0 / 3 / 1 | **21** |
| `Ei7gofYLCKc9oPFqmDcqLQhp0VS2` | `clubs` | club | الدحيل اختبار | c974_97472053188@el7lm... | 0 / 0 / 3 | **8** |
| `2qEmubLWjtU8yUyHJQtkJX9Fw582` | `clubs` | club | الدحيل اختبار | c974_97472053188@el7lm... | 0 / 7 / 5 | **45** |
| `BgvcBwSls9WG97LSHAnMf53CSAx2` | `clubs` | club | الدحيل اختبار | c974_97472053188@el7lm... | 0 / 1 / 4 | **14** |

#### Group 5: `72053188` (Invalid) — 10 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `F9UvdjTrtJbPvGf8F1ZzbFSKx6m1` | `users` | player | بلدية | meskll@gmail.com | 0 / 0 / 0 | **5** |
| `Jkzcp3U15UWgG8GD97oqPZFSvt92` | `users` | club | الدحيل اختبار | user_974_72053188_1753... | 0 / 0 / 3 | **8** |
| `YXYvy1LYBwbgpabpfhcWojAEAMG2` | `users` | player | بلديةx | melcqa@gmail.com | 0 / 0 / 1 | **6** |
| `mCp3B5xQG9PQ12TxdBb0GXte79p1` | `users` | player | محمد | None | 0 / 1 / 1 | **11** |
| `M9DDihHQZQyCwj6s1SoA` | `players` | player | mohamed saudi | mo.saudi19@gmail.com | 0 / 1 / 2 | **12** |
| `jG0lmo3x7wRODTZES9b9GddBYZa2` | `players` | player | Mohamed Saudi | mo.saudi19@gail.com | 0 / 1 / 5 | **10** |
| `bMu9qPx7m3VhhqxBpeCU2lyvKR13` | `players` | player | علي محمد علي | mo.saudi19@gmail.com | 0 / 1 / 6 | **16** |
| `slBxvl5YImGn6jw037Dk` | `players` | player | mohamed saudi | mo.saudi19@gmail.com | 0 / 0 / 2 | **7** |
| `zTFTwGU4v2GdYE9SCtmm` | `players` | player | mohamed saudi | mo.saudi19@gmail.com | 0 / 0 / 2 | **7** |
| `Jkzcp3U15UWgG8GD97oqPZFSvt92` | `clubs` | club | الدحيل اختبار | user_974_72053188_1753... | 0 / 0 / 3 | **8** |

#### Group 6: `+966500000000` (Saudi Arabia) — 9 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `QU7WtY4IoKYcXQWIFafOBKOeBYm1` | `users` | admin | مدير النظام الرئيسي | ad20_966500000000@el7l... | 0 / 0 / 4 | **9** |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `users` | club | مدير النظام | admin@hagzzgo.com | 0 / 1 / 37 | **47** |
| `kiQktw04FaZwoQQ8JT1WEZ7QcIP2` | `users` | admin | مدير النظام | admin@el7lm.com | 0 / 0 / 1 | **6** |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `clubs` | club | مدير النظام | admin@hagzzgo.com | 0 / 1 / 37 | **47** |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `academies` | academy | مدير النظام | admin@hagzzgo.com | 0 / 1 / 37 | **47** |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `trainers` | trainer | مدير النظام | admin@hagzzgo.com | 0 / 1 / 37 | **47** |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `agents` | agent | مدير النظام | admin@hagzzgo.com | 0 / 1 / 37 | **47** |
| `QU7WtY4IoKYcXQWIFafOBKOeBYm1` | `admins` | admin | مدير النظام الرئيسي | admin@hagzzgo.com | 0 / 0 / 4 | **9** |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `admins` | admin | مدير النظام | admin@hagzzgo.com | 0 / 1 / 37 | **47** |

#### Group 7: `+97450940559` (Qatar) — 9 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `c1X0Y332qGfX1EFEQyBNuoyhVsd2` | `users` | academy | Lions Athletic Academy  | lions.athletic.academy... | 0 / 0 / 0 | **5** |
| `thAtTp8CzEwOPrL2oyxn` | `players` | player | احمد رياض سوادى محمد ا... | a974_97450940559@el7lm... | 0 / 0 / 1 | **6** |
| `7P46Taqt3lT4u7rNrQKR` | `players` | player | يوسف عبدالرحمان محمد ب... | a974_97450940559@el7lm... | 0 / 0 / 1 | **6** |
| `CHhr85zBmKsKwWgRMo7a` | `players` | player | سيف محمد ابراهيم محمود... | a974_97450940559@el7lm... | 0 / 0 / 0 | **5** |
| `Pmh2ZQe7A0hcGeVfAFbN` | `players` | player | سيف يزن هاني قدورة | a974_97450940559@el7lm... | 0 / 0 / 1 | **6** |
| `aPoHOAKvScqDBFuJI6yW` | `players` | player | ادم نهاد قدري محمد نصر | a974_97450940559@el7lm... | 0 / 0 / 1 | **6** |
| `muzRU8v1DqT7dJkbPhwD` | `players` | player | عمار عاطف كمال احمد رضوان | a974_97450940559@el7lm... | 0 / 0 / 1 | **6** |
| `u4k7GW48smYUOWsRQho3` | `players` | player | يوسف عبدالوهاب محمد قا... | a974_97450940559@el7lm... | 0 / 0 / 1 | **6** |
| `c1X0Y332qGfX1EFEQyBNuoyhVsd2` | `academies` | academy | Lions Athletic Academy  | lions.athletic.academy... | 0 / 0 / 0 | **5** |

#### Group 8: `+201062838842` (Egypt) — 8 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `vA4uRGSveogXqck2fxztaoV655f1` | `users` | player | MOSTAFA Mohamed Ahmed  | sasa0106283@gmail.com | 5 / 0 / 0 | **55** |
| `gzPgIjjWwaQESEv0NdbYru8BGlz1` | `users` | player | mohamed ahmed | p20_1062838842@el7lm.com | 0 / 0 / 2 | **2** |
| `RF46N9BxiQRLVKB5s36LMzdWKYn2` | `users` | player |  MOSTAFA mohamed Ahmed  | p20_201062838842@el7lm... | 9 / 11 / 37 | **187** |
| `X4WTZrz5HRbbdMJGPkm0Ae524fI3` | `users` | player | MOSTAFA Mohamed Ahmed  | sasa0106283@gmail.com | 5 / 0 / 11 | **66** |
| `RF46N9BxiQRLVKB5s36LMzdWKYn2` | `players` | player |  MOSTAFA mohamed Ahmed  | p20_201062838842@el7lm... | 9 / 11 / 37 | **187** |
| `vA4uRGSveogXqck2fxztaoV655f1` | `players` | player | MOSTAFA Mohamed Ahmed  | sasa0106283@gmail.com | 5 / 0 / 0 | **55** |
| `X4WTZrz5HRbbdMJGPkm0Ae524fI3` | `players` | player | MOSTAFA Mohamed Ahmed  | sasa0106283@gmail.com | 5 / 0 / 11 | **66** |
| `gzPgIjjWwaQESEv0NdbYru8BGlz1` | `players` | player | mohamed ahmed | p20_1062838842@el7lm.com | 0 / 0 / 2 | **2** |

#### Group 9: `+20128059923` (Egypt) — 8 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `HPJaSUeMxpYPhNmHGnCTlBjnwdH3` | `users` | academy | يوسف احمد معوض غندور  | a20_0128059923@el7lm.com | 0 / 0 / 1 | **1** |
| `Kn3NlMQA0iT5TEIsr9DNvcCnJ1j2` | `users` | player | يوسف احمد معوض غندور  | p20_0128059923@el7lm.com | 0 / 0 / 2 | **2** |
| `L0q5pWIWNoeQTNAHTofFVBZR4Is2` | `users` | player | يوسف احمد معوض غندور  | user_20_20128059923_17... | 0 / 0 / 2 | **2** |
| `RWM6ipzXWCTlWKhVPuafwVLsEPf1` | `users` | player | يوسف احمد معوض غندور  | user_20_20128059923_17... | 0 / 0 / 2 | **2** |
| `Kn3NlMQA0iT5TEIsr9DNvcCnJ1j2` | `players` | player | يوسف احمد معوض غندور  | p20_0128059923@el7lm.com | 0 / 0 / 2 | **7** |
| `L0q5pWIWNoeQTNAHTofFVBZR4Is2` | `players` | player | يوسف احمد معوض غندور  | p20_20128059923@el7lm.com | 0 / 0 / 2 | **7** |
| `RWM6ipzXWCTlWKhVPuafwVLsEPf1` | `players` | player | يوسف احمد معوض غندور  | p20_20128059923@el7lm.com | 0 / 0 / 2 | **7** |
| `HPJaSUeMxpYPhNmHGnCTlBjnwdH3` | `academies` | academy | أكاديمية جديدة | a20_0128059923@el7lm.com | 0 / 0 / 1 | **6** |

#### Group 10: `+201000940321` (Egypt) — 7 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `FNu1kcoUJEa4FOujNvYLHOpoMg53` | `users` | player | Shref hasn | p20_1000940321@el7lm.com | 0 / 0 / 3 | **8** |
| `N1qlF0vA0WPRdVDfE41fWVOfFJD3` | `users` | agent | راشد محسن الشهواني | ag20_201000940321@el7l... | 0 / 1 / 1 | **6** |
| `QAMNwgNVVRVqKw5KhXhQayrtX6h1` | `users` | player | ابو مكه  | p20_201000940321@el7lm... | 0 / 0 / 1 | **6** |
| `M0bXmeytW5SqD023oxU8jcz95QC2` | `users` | agent | شريف حسن محمد  | user_M0bXmeytW5SqD023o... | 0 / 0 / 1 | **1** |
| `FNu1kcoUJEa4FOujNvYLHOpoMg53` | `players` | player | Shref hasn | p20_1000940321@el7lm.com | 0 / 0 / 3 | **3** |
| `QAMNwgNVVRVqKw5KhXhQayrtX6h1` | `players` | player | ابو مكه  | p20_201000940321@el7lm... | 0 / 0 / 1 | **1** |
| `M0bXmeytW5SqD023oxU8jcz95QC2` | `agents` | agent | شريف حسن محمد  | ag20_201000940321@el7l... | 0 / 0 / 1 | **1** |

#### Group 11: `+20103338202` (Egypt) — 6 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `qyADQuQ3tgP0eyda5u3RHirHkv63` | `users` | marketer | حسام محمد محمد عثمان  | user_20_20103338202_17... | 0 / 0 / 1 | **6** |
| `FfX9wD3YhpXvoBTn7kBbNn0gIow1` | `users` | trainer | حسام محمد محمد عثمان  | user_20_20103338202_17... | 0 / 2 / 3 | **18** |
| `PY5Nr0L7qZQJoceL8D2SgeD9mcv2` | `users` | marketer | حسام محمد محمد عثمان  | user_20_20103338202_17... | 0 / 0 / 1 | **6** |
| `FfX9wD3YhpXvoBTn7kBbNn0gIow1` | `trainers` | trainer | حسام محمد محمد عثمان  | t20_20103338202@el7lm.com | 0 / 2 / 3 | **13** |
| `PY5Nr0L7qZQJoceL8D2SgeD9mcv2` | `marketers` | marketer | حسام محمد محمد عثمان  | user_20_20103338202_17... | 0 / 0 / 1 | **6** |
| `qyADQuQ3tgP0eyda5u3RHirHkv63` | `marketers` | marketer | حسام محمد محمد عثمان  | user_20_20103338202_17... | 0 / 0 / 1 | **6** |

#### Group 12: `+201027674203` (Egypt) — 6 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `reFtNURHmiPaDYyZAPSmfnhXAGy2` | `users` | player | زياد محمد جمعه حسن  | p20_201027674203@el7lm... | 0 / 0 / 1 | **6** |
| `ywaTW5LUpaSgXHlZIVwPr9pWaJf1` | `users` | player | زياد محمد جمعه | p20_1027674203@el7lm.com | 0 / 0 / 2 | **7** |
| `ZxDD9qvjolYbpcpoXcP2FDetHL43` | `users` | player | زياد محمد جمعه | p20_201027674203@el7lm... | 0 / 0 / 4 | **4** |
| `ZxDD9qvjolYbpcpoXcP2FDetHL43` | `players` | player | زياد محمد جمعه | p20_201027674203@el7lm... | 0 / 0 / 4 | **4** |
| `reFtNURHmiPaDYyZAPSmfnhXAGy2` | `players` | player | زياد محمد جمعه حسن  | p20_201027674203@el7lm... | 0 / 0 / 1 | **6** |
| `ywaTW5LUpaSgXHlZIVwPr9pWaJf1` | `players` | player | زياد محمد جمعه | p20_1027674203@el7lm.com | 0 / 0 / 2 | **2** |

#### Group 13: `+201063493006` (Egypt) — 6 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `uWtwwXwtkBg4iGS7J0veMVQINjp1` | `users` | agent | قطب عبد الحميد حسين  | ag20_1063493006@el7lm.com | 0 / 0 / 1 | **6** |
| `575YGbCQyZavgQeN92Rke68hypo2` | `users` | marketer | قطب عبد الحميد حسين  | m20_1063493006@el7lm.com | 0 / 0 / 1 | **1** |
| `HTMembYmTsS4enT58DlGFNu6X8B2` | `users` | agent | قطب عبد الحميد حسين  | user_HTMembYmTsS4enT58... | 0 / 0 / 1 | **1** |
| `uWtwwXwtkBg4iGS7J0veMVQINjp1` | `agents` | agent | قطب عبد الحميد حسين  | ag20_1063493006@el7lm.com | 0 / 0 / 1 | **1** |
| `HTMembYmTsS4enT58DlGFNu6X8B2` | `agents` | agent | قطب عبد الحميد حسين  | ag20_201063493006@el7l... | 0 / 0 / 1 | **1** |
| `575YGbCQyZavgQeN92Rke68hypo2` | `marketers` | marketer | قطب عبد الحميد حسين  | m20_1063493006@el7lm.com | 0 / 0 / 1 | **6** |

#### Group 14: `+201006038037` (Egypt) — 6 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `uc3GjRdisuOeV6vVu3oYiQo1G6F2` | `users` | player | محمد احمد سيد  | user_uc3GjRdisuOeV6vVu... | 0 / 0 / 2 | **7** |
| `IAueTamMAydLDD875IL3ixyG50w1` | `users` | player | محمد احمد سيد | 201006038037@el7lm.com | 0 / 0 / 0 | **5** |
| `n4eIk2y6OIdIzOnwA97YMOiKHmh2` | `users` | player | محمد احمد سيد احمد  | p20_1006038037@el7lm.com | 0 / 0 / 2 | **2** |
| `uc3GjRdisuOeV6vVu3oYiQo1G6F2` | `players` | player | محمد احمد سيد  | p20_201006038037@el7lm... | 0 / 0 / 2 | **2** |
| `IAueTamMAydLDD875IL3ixyG50w1` | `players` | player | محمد احمد سيد | 201006038037@el7lm.com | 0 / 0 / 0 | **5** |
| `n4eIk2y6OIdIzOnwA97YMOiKHmh2` | `players` | player | محمد احمد سيد احمد  | p20_1006038037@el7lm.com | 4 / 0 / 2 | **42** |

#### Group 15: `+20101499936` (Egypt) — 6 Accounts

| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `iF6xsgnrNSQshXw5NNgQsQbH1702` | `users` | player | محمد رضا كمال عبد المج... | p20_20101499936@el7lm.com | 0 / 0 / 4 | **4** |
| `DUmbOIT7qsYNxL02QdYK4oPGobq1` | `users` | player | محمد رضا كمال عبدالمجي... | p20_20101499936@el7lm.com | 0 / 0 / 5 | **5** |
| `hk1WcoGFc2bKDofWl7kOCeKilI53` | `users` | player | محمد رضا كمال عبد المج... | user_20_20101499936_17... | 0 / 0 / 2 | **2** |
| `DUmbOIT7qsYNxL02QdYK4oPGobq1` | `players` | player | محمد رضا كمال عبدالمجي... | p20_20101499936@el7lm.com | 0 / 0 / 5 | **10** |
| `iF6xsgnrNSQshXw5NNgQsQbH1702` | `players` | player | محمد رضا كمال عبد المج... | p20_20101499936@el7lm.com | 0 / 0 / 4 | **4** |
| `hk1WcoGFc2bKDofWl7kOCeKilI53` | `players` | player | محمد رضا كمال عبد المج... | p20_20101499936@el7lm.com | 0 / 0 / 2 | **7** |


### 3.3 Sample Same-User Dual-Account Duplicates (Class B Patterns)

The following illustrates standard 2-account pairs where the identity belongs to the exact same player across `users` and `players`:

#### Example 1: `+201013714944` (Egypt)

| Account ID | Table | Name | Email | Activity Score |
| :--- | :--- | :--- | :--- | :---: |
| `qZfIOur8FTcNb3oEEl6LH24uMS43` | `users` | ادهم محمد رمضان | p20_201013714944@el7lm.com | 7 |
| `qZfIOur8FTcNb3oEEl6LH24uMS43` | `players` | ادهم محمد رمضان | p20_201013714944@el7lm.com | 2 |

#### Example 2: `+20102546196` (Egypt)

| Account ID | Table | Name | Email | Activity Score |
| :--- | :--- | :--- | :--- | :---: |
| `qhAtfyjq4ufwcFLgQaEgoISsbT82` | `users` | احمد رمضان عبد الله عمار محمود عمار | user_20_20102546196_1758040848956_4kf29b@el7lm.com | 7 |
| `qhAtfyjq4ufwcFLgQaEgoISsbT82` | `players` | احمد رمضان عبد الله عمار محمود عمار | p20_20102546196@el7lm.com | 2 |

#### Example 3: `+212773220551` (Morocco)

| Account ID | Table | Name | Email | Activity Score |
| :--- | :--- | :--- | :--- | :---: |
| `qjO2AGuhAwbXF8E6iliiUFw3A1u2` | `users` | mohammed yahya maanan | 212773220551@el7lm.com | 5 |
| `qjO2AGuhAwbXF8E6iliiUFw3A1u2` | `players` | mohammed yahya maanan | 212773220551@el7lm.com | 0 |

#### Example 4: `+97433423370` (Qatar)

| Account ID | Table | Name | Email | Activity Score |
| :--- | :--- | :--- | :--- | :---: |
| `qmtxAndV8CfiuTE4C9WBvxHybna2` | `users` | يوسف عبدالرحمن بوشيبة  | p974_97433423370@el7lm.com | 6 |
| `qmtxAndV8CfiuTE4C9WBvxHybna2` | `players` | يوسف عبدالرحمن بوشيبة  | p974_97433423370@el7lm.com | 1 |

#### Example 5: `+20109831918` (Egypt)

| Account ID | Table | Name | Email | Activity Score |
| :--- | :--- | :--- | :--- | :---: |
| `qpzGtUwptqfGMu97EXIDpw95bRj2` | `users` | Moaz bahaa mohamed | user_20_20109831918_1758095763710_g6e0tx@el7lm.com | 7 |
| `qpzGtUwptqfGMu97EXIDpw95bRj2` | `players` | Moaz bahaa mohamed | p20_20109831918@el7lm.com | 2 |

---

## 4. Part C — Test Data Report

A total of **82 accounts** across all tables have been identified as test data, seed accounts, or development artifacts.

### 4.1 Identified Test Patterns
1. **Dummy & Repetitive Numbers:** `0111111111`, `111111111`, `1234567811`, `000000`, numbers with 7+ repeated identical digits.
2. **Explicit Test Account Names:** Accounts named "اختبار", "تجربة", "test", "fake", "dummy", "seed", "hagzz".
3. **Synthetic / Seed Domains:** Emails ending with `@test.com`, `@example.com`, `@dev.com`, or containing `test_`.

### 4.2 Test Data Distribution by Table

| Table | Identified Test Accounts |
| :--- | :---: |
| `users` | 44 |
| `players` | 18 |
| `clubs` | 9 |
| `academies` | 4 |
| `admins` | 2 |
| `trainers` | 2 |
| `agents` | 2 |
| `marketers` | 1 |
| **Total** | **82** |

### 4.3 Full Inventory of Identified Test Accounts

| Account ID | Table | Name | Raw Phone | Normalized | Country | Flag / Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `r3ngUV3ie6QOtKmmG7dtKytVyNb2` | `users` | hagzz | `9747205318` | `+9747205318` | Qatar | Seed / Test pattern |
| `sSOJ195XvAOk9DChjTVwZGgv9xZ2` | `users` | اختبار | `201022920076` | `+201022920076` | Egypt | Seed / Test pattern |
| `XTx6sHL0Bta5B6iBMIko79A398k1` | `users` | احمد جمال محمد  | `1234567811` | `+1234567811` | USA/Canada | Seed / Test pattern |
| `vHD866cv0Vf08y1oEJpOVoCgELk1` | `users` | اكاديمية فرح | `1234567895` | `+1234567895` | USA/Canada | Seed / Test pattern |
| `test_trainer_01000000003` | `users` | الكابتن أحمد التجر.. | `+201000000003` | `+201000000003` | Egypt | Seed / Test pattern |
| `test_player_01000000004` | `users` | لاعب الحلم التجريبي | `+201000000004` | `+201000000004` | Egypt | Seed / Test pattern |
| `test_agent_01000000005` | `users` | وكيل لاعبين تجريبي | `+201000000005` | `+201000000005` | Egypt | Seed / Test pattern |
| `test_marketer_01000000006` | `users` | مسوّق الحلم التجريبي | `+201000000006` | `+201000000006` | Egypt | Seed / Test pattern |
| `xOqFL0agzofZMwLCEAqsSEymedv1` | `users` | احمد ياسين | `1234567897` | `+1234567897` | USA/Canada | Seed / Test pattern |
| `t1ev0surGVWVj3b5XOSxB22sycL2` | `users` | رضا جميل | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `0hHX4qaTDkhCQRyEhFLfFpq62Tu1` | `users` | محمد جمال الدين | `1234567896` | `+1234567896` | USA/Canada | Seed / Test pattern |
| `0mrTr58kqnQ0bKGsGAVZevHSNH02` | `users` | نادي اختبار | `3216547897` | `3216547897` | Invalid | Seed / Test pattern |
| `2hLPCeQszng4TQrjQlpYZ3PtYmm2` | `users` | احمد محمد فتحي | `1234567893` | `+1234567893` | USA/Canada | Seed / Test pattern |
| `1f2dWITeCTflSTzsPRxatkGGWO73` | `users` | hagzz app | `33333333333` | `+33333333333` | France | Seed / Test pattern |
| `4PhRmJVLdncNOcVBvAmUztAxkkm2` | `users` | Tttt | `705424366` | `705424366` | Invalid | Seed / Test pattern |
| `6ounHzVysQY3VDvlJ5OcF6qF3k02` | `users` | نادي اختبار | `3216547898` | `3216547898` | Invalid | Seed / Test pattern |
| `7be37m8KKmS4MKwAluaBFnUxvUw1` | `users` | Mohamed saudi | `1234567880` | `+1234567880` | USA/Canada | Seed / Test pattern |
| `30b0d90f-faad-4ad1-8f34-1999a821902a` | `users` | test | `EMPTY` | `None` | Missing | Seed / Test pattern |
| `2qEmubLWjtU8yUyHJQtkJX9Fw582` | `users` | الدحيل اختبار | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `3dOQ70vLVVSdDiEmpcMtgCcGAiO2` | `users` | محمد جلال  | `1234567892` | `+1234567892` | USA/Canada | Seed / Test pattern |
| `BgvcBwSls9WG97LSHAnMf53CSAx2` | `users` | الدحيل اختبار | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `BOBEWIhFyMgMXuRxGbvZh0J7ZKy1` | `users` | الاهلي | `1234567881` | `+1234567881` | USA/Canada | Seed / Test pattern |
| `Ei7gofYLCKc9oPFqmDcqLQhp0VS2` | `users` | الدحيل اختبار | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `QU7WtY4IoKYcXQWIFafOBKOeBYm1` | `users` | مدير النظام الرئيسي | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `01METNFmZIhS7OtQBt6OVh9Trdl2` | `users` | هههههههههه | `20123456789` | `+20123456789` | Egypt | Seed / Test pattern |
| `HxibD8KGk3X5FK0UCLE9DhcTFTF3` | `users` | hagzz | `9747205318` | `+9747205318` | Qatar | Seed / Test pattern |
| `E4P1SrsL2ban2fd5vwnnRJwmiLo1` | `users` | uuuuuuuSaudi | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `IX7VihuM2SVdAQygFOvuUZJVwJA3` | `users` | Year | `1234567809` | `+1234567809` | USA/Canada | Seed / Test pattern |
| `JJ8MJBUvdRhTz7XZeQU3qBdjSbG2` | `users` | fady | `70542458` | `70542458` | Invalid | Seed / Test pattern |
| `Jkzcp3U15UWgG8GD97oqPZFSvt92` | `users` | الدحيل اختبار | `72053188` | `72053188` | Invalid | Seed / Test pattern |
| `IOLqqZ1Lvqep1RcPTAAz9px4CJU2` | `users` | مصطفي اسماعيل | `+201017799580` | `+201017799580` | Egypt | Seed / Test pattern |
| `KugxKRoTH6ZUQ3jOjhClBagrvVH2` | `users` | Mohamed saudi | `963123456789` | `+963123456789` | Syria | Seed / Test pattern |
| `WiXjvlF7DZSqykzGNI9FojHjcQU2` | `users` | نادي اختبار | `3216547891` | `3216547891` | Invalid | Seed / Test pattern |
| `XeiioYl6l3RXRiUqJyPi7jjrmz32` | `users` | احمد محمد ياسين | `1234567894` | `+1234567894` | USA/Canada | Seed / Test pattern |
| `Y9Jpw2MGHpdu0fk3AGpo3lxCl9m1` | `users` | نادي الاهلي | `1234567899` | `+1234567899` | USA/Canada | Seed / Test pattern |
| `bQ6Uz4zNfWZhyEHqFPGZUNS5NmU2` | `users` | نادي اختبار | `3216547892` | `3216547892` | Invalid | Seed / Test pattern |
| `cAcwfAjp4WdKFRIekjzJOtTNVn72` | `users` | ابراهيم | `1234567890` | `+1234567890` | USA/Canada | Seed / Test pattern |
| `ZMMGQoZF8PREKSEh4LFYeVnJZq92` | `users` | أكاديمية جديدة | `70542458` | `70542458` | Invalid | Seed / Test pattern |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `users` | مدير النظام | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `kiQktw04FaZwoQQ8JT1WEZ7QcIP2` | `users` | مدير النظام | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `m0fduSBldXV8qr4qdMyVv4eKoGz1` | `users` | سيسس | `1234567891` | `+1234567891` | USA/Canada | Seed / Test pattern |
| `oWOfAwoRh3PzBWNDq8GTO5YSA1P2` | `users` | نادي اختبار | `3216547894` | `3216547894` | Invalid | Seed / Test pattern |
| `test_club_01000000001` | `users` | نادي الحلم التجريبي | `+201000000001` | `+201000000001` | Egypt | Seed / Test pattern |
| `test_academy_01000000002` | `users` | أكاديمية الحلم الد.. | `+201000000002` | `+201000000002` | Egypt | Seed / Test pattern |
| `2hLPCeQszng4TQrjQlpYZ3PtYmm2` | `players` | احمد محمد فتحي | `1234567892` | `+1234567892` | USA/Canada | Seed / Test pattern |
| `A2CoJhIglggDynZQc999dbuA6Wv2` | `players` | player test join  | `218122121212` | `218122121212` | Invalid | Seed / Test pattern |
| `E4P1SrsL2ban2fd5vwnnRJwmiLo1` | `players` | uuuuuuuSaudi | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `GQSMfDZabaaMbQxI22ZqOsWmcA32` | `players` | mohamed saudi | `201017799580` | `+201017799580` | Egypt | Seed / Test pattern |
| `HTMQqeUeTi8lsdlYfskV` | `players` | حمزة العليمي | `201017799580` | `+201017799580` | Egypt | Seed / Test pattern |
| `1f2dWITeCTflSTzsPRxatkGGWO73` | `players` | hagzz app | `33333333333` | `+33333333333` | France | Seed / Test pattern |
| `01METNFmZIhS7OtQBt6OVh9Trdl2` | `players` | هههههههههه | `20123456789` | `+20123456789` | Egypt | Seed / Test pattern |
| `YWGHzaxr08YE8vwmPK2i` | `players` | سيسس | `1234567891` | `+1234567891` | USA/Canada | Seed / Test pattern |
| `ZMMGQoZF8PREKSEh4LFYeVnJZq92` | `players` | Mohamed saudi | `70542458` | `70542458` | Invalid | Seed / Test pattern |
| `DvNaEk3LQ3ptbiZN1ucC` | `players` | سيسس | `12345678912` | `+12345678912` | USA/Canada | Seed / Test pattern |
| `ls9eL2YFKkoFi7kMfqKr` | `players` | Tttt | `705424366` | `705424366` | Invalid | Seed / Test pattern |
| `JJ8MJBUvdRhTz7XZeQU3qBdjSbG2` | `players` | fady | `70542458` | `70542458` | Invalid | Seed / Test pattern |
| `t1ev0surGVWVj3b5XOSxB22sycL2` | `players` | رضا جميل | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `3dOQ70vLVVSdDiEmpcMtgCcGAiO2` | `players` | محمد جلال  | `1234567892` | `+1234567892` | USA/Canada | Seed / Test pattern |
| `sSOJ195XvAOk9DChjTVwZGgv9xZ2` | `players` | اختبار | `201022920076` | `+201022920076` | Egypt | Seed / Test pattern |
| `google-play-review-player` | `players` | Google Play Review.. | `201000000000` | `+201000000000` | Egypt | Seed / Test pattern |
| `IOLqqZ1Lvqep1RcPTAAz9px4CJU2` | `players` | مصطفي اسماعيل | `+201017799580` | `+201017799580` | Egypt | Seed / Test pattern |
| `test_player_01000000004` | `players` | لاعب الحلم التجريبي | `+201000000004` | `+201000000004` | Egypt | Seed / Test pattern |
| `Jkzcp3U15UWgG8GD97oqPZFSvt92` | `clubs` | الدحيل اختبار | `72053188` | `72053188` | Invalid | Seed / Test pattern |
| `Ei7gofYLCKc9oPFqmDcqLQhp0VS2` | `clubs` | الدحيل اختبار | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `Y9Jpw2MGHpdu0fk3AGpo3lxCl9m1` | `clubs` | نادي الاهلي | `1234567899` | `+1234567899` | USA/Canada | Seed / Test pattern |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `clubs` | مدير النظام | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `2qEmubLWjtU8yUyHJQtkJX9Fw582` | `clubs` | الدحيل اختبار | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `BgvcBwSls9WG97LSHAnMf53CSAx2` | `clubs` | الدحيل اختبار | `97472053188` | `+97472053188` | Qatar | Seed / Test pattern |
| `7be37m8KKmS4MKwAluaBFnUxvUw1` | `clubs` | نادي العين | `1234567880` | `+1234567880` | USA/Canada | Seed / Test pattern |
| `test_club_01000000001` | `clubs` | نادي الحلم التجريبي | `+201000000001` | `+201000000001` | Egypt | Seed / Test pattern |
| `KugxKRoTH6ZUQ3jOjhClBagrvVH2` | `clubs` | Mohamed saudi | `963123456789` | `+963123456789` | Syria | Seed / Test pattern |
| `ZMMGQoZF8PREKSEh4LFYeVnJZq92` | `academies` | أكاديمية جديدة | `70542458` | `70542458` | Invalid | Seed / Test pattern |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `academies` | مدير النظام | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `83ded7fc-43e1-4451-96cb-8be4950004e6` | `academies` | الابداع والتطوير ا | `70542458` | `70542458` | Invalid | Seed / Test pattern |
| `test_academy_01000000002` | `academies` | أكاديمية الحلم الد.. | `+201000000002` | `+201000000002` | Egypt | Seed / Test pattern |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `trainers` | مدير النظام | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `test_trainer_01000000003` | `trainers` | الكابتن أحمد التجر.. | `+201000000003` | `+201000000003` | Egypt | Seed / Test pattern |
| `test_agent_01000000005` | `agents` | وكيل لاعبين تجريبي | `+201000000005` | `+201000000005` | Egypt | Seed / Test pattern |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `agents` | مدير النظام | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `test_marketer_01000000006` | `marketers` | مسوّق الحلم التجريبي | `+201000000006` | `+201000000006` | Egypt | Seed / Test pattern |
| `QU7WtY4IoKYcXQWIFafOBKOeBYm1` | `admins` | مدير النظام الرئيسي | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |
| `hWAd3JRCJnXAowZKJ5W9qSJlA7i1` | `admins` | مدير النظام | `+966500000000` | `+966500000000` | Saudi Arabia | Seed / Test pattern |


---

## 5. Part D — Validation Artifacts Summary

The following artifacts have been created as part of this validation engine:

1. `docs/review/phone-identity-report.json`
   - Full structured JSON audit file (1.3 MB) containing:
     - Global metadata & audit summary.
     - Table breakdown across 8 account collections.
     - Complete inventory of all 962 duplicate phone clusters with account-level activity indicators.
     - Complete list of all 82 test accounts.

2. `docs/review/phase6-phone-identity-validation.md` (This document)
   - Human-readable audit report documenting valid, invalid, duplicate, and test data.

3. `supabase/migrations/20260925_create_phone_identity_layer.sql`
   - DDL schema draft for `phone_accounts_index` (kept local, unapplied).

4. `src/types/phone-identity.ts` & `src/lib/auth/phone-account-lookup.ts`
   - Type-safe models and $O(1)$ phone lookup resolver supporting status-aware routing.

---

## 6. Execution Gate & Next Steps

> [!IMPORTANT]
> **STOP AND AWAIT APPROVAL:**
> All analysis completed in Phase 6 has been strictly READ-ONLY. No database records have been modified, deleted, or merged.
> Prior to applying any cleanup, migration, or backfill actions, explicit user approval is required.
