# Phase 10.1 — Canonical Identity Population Preview Report
**Strictly READ-ONLY Preview of Identity Layer Population**

- **Date:** 2026-09-25
- **Platform:** El7lm-V2 / Hagzz
- **Execution Mode:** READ-ONLY PREVIEW — Zero Database Mutations
- **Database Engine:** PostgreSQL (Supabase Production)
- **Target Table:** `public.users` (1,357 accounts)

---

## 1. Executive Summary & Audit Sign-Off

This preview establishes the concrete population plan for the newly added canonical identity fields in `public.users`:

```text
DATABASE MUTATION AUDIT:
- Database modifications: 0
- Rows modified: 0
- Schema modifications: 0
```

| Canonical Field | Safe Population Candidates | Deferred / Unsafe Candidates | Primary Reason for Deferral |
| :--- | :---: | :---: | :--- |
| **`supabase_uid`** | **149 rows** (11.0%) | **1208 rows** | Legacy Firebase UIDs; populated lazily on first OTP login. |
| **`phone_e164`** | **879 rows** (64.8%) | **478 rows** | Null phones (148), conflicts (51 users), test numbers (41 users), intra-users duplicates (18 users). |
| **`country_code`** | **1033 rows** (76.1%) | **324 rows** | Unconfirmed country / national numbers without reliable dialing metadata. |

---

## 2. Detailed `supabase_uid` Reconciliation

Only accounts where `users.uid === auth.users.id` are considered safe for immediate backfill:

| Classification | Count | Percentage | Population Action | Architectural Justification |
| :--- | :---: | :---: | :---: | :--- |
| **`EXACT_SUPABASE_MATCH`** | **149** | **11.0%** | **SAFE TO POPULATE** | Confirmed Supabase Auth UUID. Verified active login. |
| **`LEGACY_FIREBASE_UID`** | **1120** | **73.2%** | **REMAIN NULL** | 28-character Firebase string. Will be linked when user logs in via OTP. |
| **`NO_AUTH_MATCH`** | **84** | **12.6%** | **REMAIN NULL** | Profile without auth record or empty UID. |
| **`AMBIGUOUS`** | **4** | **3.2%** | **REMAIN NULL** | Non-standard format; requires manual review. |
| **Total** | **1357** | **100.0%** | - | Complete `users` table census |

---

## 3. Detailed `phone_e164` Audit & Classification

Strict non-guessing policy enforced. Only verified international formats with confirmed country dialing codes are eligible:

| Candidate Classification | Count | Percentage | Status | Handling Rule |
| :--- | :---: | :---: | :---: | :--- |
| **`VALID_E164_ALREADY`** | **284** | 20.9% | **SAFE CANDIDATE** | Already in clean E.164 format (+2010..., +966...). |
| **`SAFE_NORMALIZATION`** | **595** | 43.8% | **SAFE CANDIDATE** | Clean national number with confirmed country dialing code. |
| **`NO_PHONE`** | **176** | 13.0% | **DEFERRED (NULL)** | Empty/null phone string. Retained as NULL. |
| **`CONFLICT_DIFFERENT_USERS`**| **48** | 3.5% | **DEFERRED (UNSAFE)**| Belong to 24 Real Conflict groups. Deferred until user outreach. |
| **`TEST_PHONE`** | **22** | 1.6% | **DEFERRED (UNSAFE)**| Dummy repeated numbers (0111111111, test_...). Deferred for cleanup. |
| **`DUPLICATE_PHONE`** | **154** | 11.3% | **DEFERRED (UNSAFE)**| Duplicated across multiple rows in `users`. |
| **`COUNTRY_MISSING`** | **65** | 4.8% | **DEFERRED (UNSAFE)**| National number without confirmed country code. Guessing forbidden. |
| **`INVALID`** | **13** | 1.0% | **DEFERRED (UNSAFE)**| Malformed, too short (<8 digits) or non-numeric string. |
| **Total** | **1357** | **100.0%** | - | Full population preview |

---

## 4. Detailed `country_code` Audit

| Classification | Count | Percentage | Action | Justification |
| :--- | :---: | :---: | :---: | :--- |
| **`CONFIRMED`** | **1033** | **76.1%** | **SAFE TO POPULATE** | Confirmed from verified E.164 dial prefix (+20, +966, +974) or explicit country field. |
| **`INFERRED_BUT_NOT_SAFE`** | **65** | **4.8%** | **REMAIN NULL** | National prefix without country confirmation. Guessing strictly avoided. |
| **`MISSING`** | **176** | **13.0%** | **REMAIN NULL** | Accounts without phone or country data. |
| **`AMBIGUOUS`** | **83** | **6.1%** | **REMAIN NULL** | Conflict phones, test data, or invalid numbers. |
| **Total** | **1357** | **100.0%** | - | Complete census |

---

## 5. Expected Update Preview (If Committed Later)

If this migration population is executed in a subsequent phase:

```text
EXPECTED ROW IMPACT PREVIEW:
- supabase_uid:        149 rows
- phone_e164:            879 rows
- country_code:          1033 rows

MUTUAL FIELD BREAKDOWN:
- Multiple fields updated: 879 rows
- supabase_uid only:       55 rows
- phone_e164 only:         0 rows
- country_code only:       154 rows
- No change (Remain NULL): 269 rows

TOTAL UNSAFE ROWS DEFERRED: 302 rows
```

---

## 6. Sample Unsafe / Deferred Cases (Requiring Human Review)

| User ID | Account Name | Role | Raw Phone | Issue Description | Required Action Before Population |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `qWQfgalM1vgLtbyjHvew6aVv3tH2` | حماده احمد عبدالحميد علي اسماعيل شعبان  | player | `201023361064` | Phone duplicated across 2 users records | Manual review / Reassign phone |
| `r3ngUV3ie6QOtKmmG7dtKytVyNb2` | hagzz | club | `9747205318` | Part of 21 verified test data clusters | Manual review / Reassign phone |
| `qyADQuQ3tgP0eyda5u3RHirHkv63` | حسام محمد محمد عثمان  | marketer | `20103338202` | Phone duplicated across 3 users records | Manual review / Reassign phone |
| `reFtNURHmiPaDYyZAPSmfnhXAGy2` | زياد محمد جمعه حسن  | player | `01027674203` | Phone duplicated across 3 users records | Manual review / Reassign phone |
| `s4q1ZTQVnOe9G1aYDzfEvRPdsca2` | عبدالله محمد عبدالله  | player | `201063366316` | Phone duplicated across 2 users records | Manual review / Reassign phone |
| `d5e6eefb-893c-4b69-8730-a5f1f6655aad` | عمار ياسر عمار | N/A | `01204473988` | National phone without confirmed country; guessing strictly prohibited | Manual review / Reassign phone |
| `sLcn3XLCXeSrnIBdkli7mtBrWIz1` | عبدالرحمن محي الدين  | player | `201117979902` | Phone duplicated across 2 users records | Manual review / Reassign phone |
| `sSOJ195XvAOk9DChjTVwZGgv9xZ2` | اختبار | player | `201022920076` | Part of 21 verified test data clusters | Manual review / Reassign phone |
| `shYb04DJmmf3NhIo76TXMb9uBY92` | سيف احمد منعم شكل | player | `201002456739` | Phone duplicated across 2 users records | Manual review / Reassign phone |
| `tCCbN4nV7uTiggPjOlFqiH9bPG82` | ادهم مصطفى احمد محمد  | player | `201034320402` | Phone duplicated across 2 users records | Manual review / Reassign phone |
| `tE3KltHYnHeANkWIN83O2Au2gIX2` | محمد محسن داود | player | `201287819838` | Phone duplicated across 2 users records | Manual review / Reassign phone |
| `XTx6sHL0Bta5B6iBMIko79A398k1` | احمد جمال محمد  | player | `1234567811` | National phone without confirmed country; guessing strictly prohibited | Manual review / Reassign phone |
| `Xc6RCiKlPmhWOHo0JhIZQMnNlW03` | علي يوسف محمود  | player | `201505331266` | Phone duplicated across 2 users records | Manual review / Reassign phone |
| `tTZhaT0QAUVyddcg7InevNkuRDt2` | احمد ياسر علي  | player | `+201112911914` | Part of 24 Real Conflict groups (shared between distinct people) | Manual review / Reassign phone |
| `59A2iG6JxFaSSyzG1cbCS2tLhdq1` | محمد زكي السيد زكي حسن الخولي  | player | `+201114468447` | Phone duplicated across 2 users records | Manual review / Reassign phone |

---

## 7. Verification Sign-Off

```text
PHASE 10.1 PREVIEW COMPLETE

Database modifications: 0
Rows modified: 0

supabase_uid safe candidates: 149
phone_e164 safe candidates: 879
country_code safe candidates: 1033

Duplicate phone candidates: 154
Real conflict candidates: 48
Ambiguous candidates: 83
Test phone candidates: 22

NEXT STEP:
WAITING FOR REVIEW
```
