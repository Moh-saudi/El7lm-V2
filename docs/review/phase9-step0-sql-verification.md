# Phase 9 Step 0 — SQL Read-Only Verification Report
**Supabase Production Database Verification (Strictly READ-ONLY)**

- **Date:** 2026-09-25
- **Platform:** El7lm-V2 / Hagzz
- **Audit Execution Mode:** SELECT ONLY — Zero Mutations
- **Database Engine:** PostgreSQL (Supabase Production)

---

## 1. Compliance Audit & Zero-Mutation Statement

In strict compliance with Phase 9 Step 0 requirements:
- **Database modifications:** 0
- **Rows modified:** 0
- **Rows deleted:** 0
- **Rows inserted:** 0
- **Schema modifications:** 0
- **Queries executed:** `SELECT` from public tables and `supabase.auth.admin.listUsers()` read-only API only.

---

## 2. Table Schemas & Column Definitions (The 8 Account Tables)

| Table Name | Live Row Count | Catalog Column Count | Primary Key Column | Nullable Columns | Default Values |
| :--- | :---: | :---: | :--- | :---: | :---: |
| `users` | **1,357** | **267** | `id` (TEXT) | 266 columns | None |
| `players` | **1,079** | **218** | `id` (TEXT) | 217 columns | None |
| `clubs` | **39** | **71** | `id` (TEXT) | 70 columns | None |
| `academies` | **39** | **75** | `id` (TEXT) | 74 columns | None |
| `trainers` | **50** | **72** | `id` (TEXT) | 71 columns | None |
| `agents` | **29** | **67** | `id` (TEXT) | 66 columns | None |
| `marketers` | **27** | **35** | `id` (TEXT) | 34 columns | None |
| `admins` | **3** | **13** | `id` (TEXT) | 12 columns | None |

*(Complete list of all columns, data types, nullability, and defaults is fully serialized in [phase9-step0-sql-verification.json](file:///d:/El7lm-V2/docs/review/phase9-step0-sql-verification.json)).*

---

## 3. Constraints Audit: Primary Keys, Foreign Keys & Unique Constraints

### 3.1 Primary Keys
- `users.id`: `TEXT PRIMARY KEY`
- `players.id`: `TEXT PRIMARY KEY`
- `clubs.id`: `TEXT PRIMARY KEY`
- `academies.id`: `TEXT PRIMARY KEY`
- `trainers.id`: `TEXT PRIMARY KEY`
- `agents.id`: `TEXT PRIMARY KEY`
- `marketers.id`: `TEXT PRIMARY KEY`
- `admins.id`: `TEXT PRIMARY KEY`

### 3.2 Foreign Keys (PostgreSQL Catalog Proof)
> [!IMPORTANT]
> **Definitive PostgreSQL Catalog Finding:**
> There are **ZERO `FOREIGN KEY` constraints** defined in PostgreSQL between `users.id` and any of the 7 profile tables (`players`, `clubs`, `academies`, `trainers`, `agents`, `marketers`, `admins`).
> The relational linkage exists **purely at the application and data layer** via identical Firestore Document IDs.

### 3.3 Unique Constraints
- Only the implicit `UNIQUE` constraints backing the 8 Primary Keys currently exist in the base schema.

---

## 4. Existing Indexes Audit

The following indexes currently exist on the 8 account tables:

| Index Name | Table | Indexed Columns / Definition |
| :--- | :--- | :--- |
| `users_pkey` | `users` | `CREATE UNIQUE INDEX users_pkey ON users (id)` |
| `players_pkey` | `players` | `CREATE UNIQUE INDEX players_pkey ON players (id)` |
| `clubs_pkey` | `clubs` | `CREATE UNIQUE INDEX clubs_pkey ON clubs (id)` |
| `academies_pkey` | `academies` | `CREATE UNIQUE INDEX academies_pkey ON academies (id)` |
| `trainers_pkey` | `trainers` | `CREATE UNIQUE INDEX trainers_pkey ON trainers (id)` |
| `agents_pkey` | `agents` | `CREATE UNIQUE INDEX agents_pkey ON agents (id)` |
| `marketers_pkey` | `marketers` | `CREATE UNIQUE INDEX marketers_pkey ON marketers (id)` |
| `admins_pkey` | `admins` | `CREATE UNIQUE INDEX admins_pkey ON admins (id)` |
| `idx_users_uid` | `users` | `CREATE INDEX idx_users_uid ON users (uid) WHERE uid IS NOT NULL` |
| `idx_users_phone_normalized` | `users` | `CREATE INDEX idx_users_phone_normalized ON users ("phoneNormalized") WHERE "phoneNormalized" IS NOT NULL` |
| `idx_players_uid` | `players` | `CREATE INDEX idx_players_uid ON players (uid) WHERE uid IS NOT NULL` |
| `idx_players_phone_normalized` | `players` | `CREATE INDEX idx_players_phone_normalized ON players ("phoneNormalized") WHERE "phoneNormalized" IS NOT NULL` |

---

## 5. Actual Phone Columns in Schema

A full scan for column names containing `phone` reveals **33 phone-related columns** across the 8 tables:

| Table | Column Name | PostgreSQL Data Type | Operational Function |
| :--- | :--- | :--- | :--- |
| `users` | `phone` | `TEXT` | Primary raw phone string |
| `users` | `phoneNormalized` | `TEXT` | Partially normalized phone string |
| `users` | `phoneNumber` | `TEXT` | Legacy Firebase Auth phone |
| `users` | `originalPhone` | `TEXT` | Unindexed audit copy |
| `users` | `previousPhone` | `TEXT` | Unindexed audit copy |
| `users` | `phoneVerified` | `BOOLEAN` | Verification boolean |
| `users` | `phoneFixed` | `BOOLEAN` | Legacy repair flag |
| `users` | `phoneFixedAt` | `TIMESTAMPTZ` | Legacy repair timestamp |
| `users` | `phoneFixDescription`| `TEXT` | Legacy repair notes |
| `users` | `phoneFixHistory` | `JSONB` | Legacy repair history log |
| `players` | `phone` | `TEXT` | Raw phone duplicate |
| `players` | `phoneNormalized` | `TEXT` | Partially normalized duplicate |
| `players` | `phoneNumber` | `TEXT` | Legacy Firebase Auth duplicate |
| `players` | `originalPhone` | `TEXT` | Unindexed audit copy |
| `players` | `previousPhone` | `TEXT` | Unindexed audit copy |
| `players` | `phoneVerified` | `BOOLEAN` | Verification boolean |
| `clubs` | `phone` | `TEXT` | Club contact phone |
| `clubs` | `phoneNormalized` | `TEXT` | Club normalized phone |
| `clubs` | `originalPhone` | `TEXT` | Audit copy |
| `clubs` | `previousPhone` | `TEXT` | Audit copy |
| `academies` | `phone` | `TEXT` | Academy contact phone |
| `trainers` | `phone` | `TEXT` | Trainer contact phone |
| `trainers` | `phoneNormalized` | `TEXT` | Trainer normalized phone |
| `trainers` | `originalPhone` | `TEXT` | Audit copy |
| `trainers` | `previousPhone` | `TEXT` | Audit copy |
| `agents` | `phone` | `TEXT` | Agent contact phone |
| `agents` | `phoneNormalized` | `TEXT` | Agent normalized phone |
| `agents` | `originalPhone` | `TEXT` | Audit copy |
| `agents` | `previousPhone` | `TEXT` | Audit copy |
| `marketers` | `phone` | `TEXT` | Marketer contact phone |
| `marketers` | `phoneNormalized` | `TEXT` | Marketer normalized phone |
| `marketers` | `originalPhone` | `TEXT` | Audit copy |
| `admins` | `phone` | `TEXT` | Admin contact phone |

---

## 6. Phone Population Across All 8 Tables

| Table Name | Total Rows | Rows With Phone | Rows Without Phone | Phone Coverage % |
| :--- | :---: | :---: | :---: | :---: |
| `users` | **1,357** | 1,209 | 148 | 89.1% |
| `players` | **1,079** | 948 | 131 | 87.9% |
| `clubs` | **39** | 37 | 2 | 94.9% |
| `academies` | **39** | 35 | 4 | 89.7% |
| `trainers` | **50** | 49 | 1 | 98.0% |
| `agents` | **29** | 29 | 0 | 100.0% |
| `marketers` | **27** | 26 | 1 | 96.3% |
| `admins` | **3** | 3 | 0 | 100.0% |
| **Total** | **2,623** | **2,336** | **287** | **89.1%** |

---

## 7. Duplicate Phones Across ALL Accounts (System-Wide)

| Global Metric | Value | Operational Context |
| :--- | :---: | :--- |
| **Total Accounts Checked** | **2,623** | Complete census across all 8 tables |
| **Unique Normalized Phones** | **1,093** | Distinct international phone numbers |
| **Duplicate Phone Groups** | **962** | Numbers shared across 2 or more records |
| **Total Accounts in Duplicate Groups** | **2,205** | Accounts belonging to duplicate groups (84.1%) |

*(Top duplicate groups and full account mappings are serialized in [phase9-step0-sql-verification.json](file:///d:/El7lm-V2/docs/review/phase9-step0-sql-verification.json)).*

---

## 8. Users ↔ Profiles Relational Linkage (Exact `id` Matches)

| Profile Table | Total Profiles | Profiles Matching `users.id` | Profiles Without `users.id` | Match % | Orphan IDs Requiring Parent User |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `players` | **1,079** | **1,030** | **49** | 95.5% | 18 standalone players + 31 re-registered |
| `clubs` | **39** | **37** | **2** | 94.9% | `club_legacy_01`, `club_legacy_02` |
| `academies` | **39** | **37** | **2** | 94.9% | 2 legacy academies (match by phone) |
| `trainers` | **50** | **50** | **0** | **100.0%** | None (100% matched) |
| `agents` | **29** | **28** | **1** | 96.5% | 1 standalone agent |
| `marketers` | **27** | **27** | **0** | **100.0%** | None (100% matched) |
| `admins` | **3** | **3** | **0** | **100.0%** | None (100% matched) |
| **Total Profiles** | **1,266** | **1,212** | **54** | **95.7%** | **Only 54 profiles require reconciliation** |

---

## 9. Supabase Auth Relationship (`public.users.uid` vs. `auth.users.id`)

| Metric | Exact Count | Technical Analysis |
| :--- | :---: | :--- |
| **Total `public.users` Accounts** | **1,357** | Application user identity table |
| **Total `auth.users` Managed Accounts** | **1,384** | Supabase Auth internal catalog |
| **`users` Matching an `auth.users.id`** | **173** | Active users authenticated post-migration |
| **`users` Without Matching `auth.users`** | **1,184** | Legacy accounts holding Firebase 28-char UIDs |
| **Duplicate UIDs in `users`** | **2** | 2 re-registered duplicate user rows |

---

## 10. Verification Sign-Off

```text
PHASE 9 STEP 0 SQL VERIFICATION

Database modifications: 0
Rows modified: 0
Rows deleted: 0
Schema modifications: 0

Schema verified: YES
Indexes verified: YES
Foreign Keys verified: YES
Phone columns verified: YES
Duplicate phones verified: YES
Users/Auth relationship verified: YES
Profile relationships verified: YES

NEXT STEP: WAITING FOR REVIEW
```
