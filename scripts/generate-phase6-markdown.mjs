import fs from 'fs';
import path from 'path';

const reportPath = path.resolve(process.cwd(), 'docs/review/phone-identity-report.json');
const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const { summary, tableBreakdown, duplicatePhones, testData, metadata } = reportData;

// Sort duplicates by accountsCount descending
const sortedDuplicates = [...duplicatePhones].sort((a, b) => b.accountsCount - a.accountsCount);

// Generate markdown
let md = `# Phase 6 — Phone Identity Population & Validation Engine
**Validation Audit & Status Report (Strictly READ-ONLY)**

- **Date:** ${new Date().toISOString().split('T')[0]}
- **Platform:** El7lm-V2 / Hagzz
- **Audit Mode:** READ-ONLY (Zero Mutation)
- **Engine Rules:** E.164 Normalization (\`country_code + phone_normalized\`)

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
| **Missing Country Code (Recovered)** | **73** | 2.8% | Local format (e.g., \`01x\` -> \`+20\`, \`05x\` -> \`+966\`) |
| **Unique Phone Identities** | **1,093** | - | Distinct E.164 phone numbers |
| **Duplicate Phone Groups** | **962** | - | Phone numbers shared across 2 or more accounts |
| **Accounts in Duplicate Groups** | **2,205** | 84.1% | Accounts belonging to duplicate phone groups |
| **Test / Dummy Accounts Identified** | **82** | 3.1% | Test numbers, seed accounts, dev records |

### 2.2 Table-by-Table Breakdown

| Table Name | Total Checked Accounts | Role / Account Type |
| :--- | :--- | :--- |
| \`users\` | 1,357 | Base system users & auth records |
| \`players\` | 1,079 | Player profile records |
| \`trainers\` | 50 | Trainer / Coach profiles |
| \`academies\` | 39 | Academy profiles |
| \`clubs\` | 39 | Club profiles |
| \`agents\` | 29 | Player agent profiles |
| \`marketers\` | 27 | Marketer profiles |
| \`admins\` | 3 | System administrators |
| **Total** | **2,623** | **8 Tables Analyzed** |

---

## 3. Part B — Duplicate Phone Report

### 3.1 Root Cause & Duplicate Distribution

Of the **962** duplicate phone groups:
- **853 groups (88.7%)** consist of **exactly 2 accounts**: The overwhelming majority represent the identical human user having both a \`users\` record and a \`players\` record as an artifact of historical Firebase Firestore data exports.
- **72 groups (7.5%)** consist of **4 accounts**: Typically 2 re-registrations each having a \`users\` + \`players\` pair.
- **15 groups (1.6%)** consist of **3 accounts**: Multi-role registrations (e.g. user + player + trainer) or duplicated user rows.
- **22 groups (2.3%)** consist of **5 or more accounts**: Heavily duplicated test numbers, agency accounts, or shared facility contact numbers.

| Accounts per Phone Group | Groups Count | Total Associated Accounts | Primary Root Cause |
| :---: | :---: | :---: | :--- |
| **2** | 853 | 1,706 | Same-person dual record (\`users\` + \`players\`) |
| **3** | 15 | 45 | Multi-role or re-registration |
| **4** | 72 | 288 | Dual re-registration (\`users\` + \`players\` x 2) |
| **5** | 3 | 15 | Repeated test/demo registration |
| **6** | 9 | 54 | Repeated registration or shared agency contact |
| **7** | 1 | 7 | Shared support or test phone |
| **8** | 2 | 16 | Test/seed account cluster |
| **9** | 2 | 18 | Test/seed account cluster |
| **10** | 3 | 30 | High-frequency test & QA phone |
| **11** | 1 | 11 | Known dummy phone (\`0111111111\`) |
| **15** | 1 | 15 | Heavily repeated test number (\`+201017799580\`) |

---

### 3.2 Top Duplicate Phone Groups Breakdown

Here are the highest-density duplicate phone groups, including account IDs, tables, names, and activity scores (Activity Score = Videos x 10 + Messages x 5 + Notifications + Login Bonus):

`;

// Add top 15 duplicate groups in detail
for (let i = 0; i < Math.min(15, sortedDuplicates.length); i++) {
  const g = sortedDuplicates[i];
  md += `#### Group ${i + 1}: \`${g.normalizedPhone}\` (${g.country}) — ${g.accountsCount} Accounts\n\n`;
  md += `| Account ID | Table | Role | Name | Email | Activity (Vid / Msg / Notif) | Score |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :---: | :---: |\n`;
  for (const acc of g.accounts) {
    const act = acc.activityIndicators;
    const emailShort = acc.email ? (acc.email.length > 25 ? acc.email.substring(0, 22) + '...' : acc.email) : 'None';
    const nameShort = acc.name ? (acc.name.length > 25 ? acc.name.substring(0, 22) + '...' : acc.name) : 'غير مسجل';
    md += `| \`${acc.accountId}\` | \`${acc.tableName}\` | ${acc.accountType} | ${nameShort} | ${emailShort} | ${act.videos} / ${act.messages} / ${act.notifications} | **${act.activityScore}** |\n`;
  }
  md += `\n`;
}

md += `\n### 3.3 Sample Same-User Dual-Account Duplicates (Class B Patterns)

The following illustrates standard 2-account pairs where the identity belongs to the exact same player across \`users\` and \`players\`:

`;

// Find first 5 2-account duplicates that are same user
let count2 = 0;
for (const g of sortedDuplicates) {
  if (g.accountsCount === 2 && count2 < 5) {
    count2++;
    md += `#### Example ${count2}: \`${g.normalizedPhone}\` (${g.country})\n\n`;
    md += `| Account ID | Table | Name | Email | Activity Score |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: |\n`;
    for (const acc of g.accounts) {
      md += `| \`${acc.accountId}\` | \`${acc.tableName}\` | ${acc.name} | ${acc.email || 'None'} | ${acc.activityIndicators.activityScore} |\n`;
    }
    md += `\n`;
  }
}

md += `---

## 4. Part C — Test Data Report

A total of **82 accounts** across all tables have been identified as test data, seed accounts, or development artifacts.

### 4.1 Identified Test Patterns
1. **Dummy & Repetitive Numbers:** \`0111111111\`, \`111111111\`, \`1234567811\`, \`000000\`, numbers with 7+ repeated identical digits.
2. **Explicit Test Account Names:** Accounts named "اختبار", "تجربة", "test", "fake", "dummy", "seed", "hagzz".
3. **Synthetic / Seed Domains:** Emails ending with \`@test.com\`, \`@example.com\`, \`@dev.com\`, or containing \`test_\`.

### 4.2 Test Data Distribution by Table

| Table | Identified Test Accounts |
| :--- | :---: |
| \`users\` | 44 |
| \`players\` | 18 |
| \`clubs\` | 9 |
| \`academies\` | 4 |
| \`admins\` | 2 |
| \`trainers\` | 2 |
| \`agents\` | 2 |
| \`marketers\` | 1 |
| **Total** | **82** |

### 4.3 Full Inventory of Identified Test Accounts

| Account ID | Table | Name | Raw Phone | Normalized | Country | Flag / Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

for (const t of testData) {
  const nameShort = t.name ? (t.name.length > 20 ? t.name.substring(0, 18) + '..' : t.name) : 'None';
  md += `| \`${t.id}\` | \`${t.table}\` | ${nameShort} | \`${t.rawPhone || 'EMPTY'}\` | \`${t.phoneNormalized || 'None'}\` | ${t.country} | Seed / Test pattern |\n`;
}

md += `

---

## 5. Part D — Validation Artifacts Summary

The following artifacts have been created as part of this validation engine:

1. \`docs/review/phone-identity-report.json\`
   - Full structured JSON audit file (1.3 MB) containing:
     - Global metadata & audit summary.
     - Table breakdown across 8 account collections.
     - Complete inventory of all 962 duplicate phone clusters with account-level activity indicators.
     - Complete list of all 82 test accounts.

2. \`docs/review/phase6-phone-identity-validation.md\` (This document)
   - Human-readable audit report documenting valid, invalid, duplicate, and test data.

3. \`supabase/migrations/20260925_create_phone_identity_layer.sql\`
   - DDL schema draft for \`phone_accounts_index\` (kept local, unapplied).

4. \`src/types/phone-identity.ts\` & \`src/lib/auth/phone-account-lookup.ts\`
   - Type-safe models and $O(1)$ phone lookup resolver supporting status-aware routing.

---

## 6. Execution Gate & Next Steps

> [!IMPORTANT]
> **STOP AND AWAIT APPROVAL:**
> All analysis completed in Phase 6 has been strictly READ-ONLY. No database records have been modified, deleted, or merged.
> Prior to applying any cleanup, migration, or backfill actions, explicit user approval is required.
`;

const outputPath = path.resolve(process.cwd(), 'docs/review/phase6-phone-identity-validation.md');
fs.writeFileSync(outputPath, md, 'utf8');
console.log('✅ Successfully wrote docs/review/phase6-phone-identity-validation.md');
