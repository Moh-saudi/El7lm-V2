/**
 * Script: analyze-phone-conflicts.mjs
 * Description: Phase 3.1 — Phone Conflict Resolution Analysis & Primary Account Recommendation
 * Flags:
 *   --report-only: Outputs analytical classification summary without modifying database
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const isReportOnly = args.includes('--report-only');

function cleanArabic(str) {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isSyntheticEmail(email) {
  if (!email) return false;
  return /^([pcatm]|ag|ad|user_)\d+.*@el7lm\.com$/i.test(email);
}

function areNamesSamePerson(name1, name2, email1, email2) {
  const n1 = cleanArabic(name1);
  const n2 = cleanArabic(name2);

  // If both names are known and valid
  if (n1 && n2 && n1 !== 'غير مسجل' && n2 !== 'غير مسجل' && n1 !== 'n/a' && n2 !== 'n/a') {
    if (n1 === n2) return true;

    const w1 = n1.split(' ');
    const w2 = n2.split(' ');

    const commonWords = w1.filter(w => w2.includes(w) && w.length > 2);
    if (commonWords.length >= 2) return true;

    // Single word match with first + last name containment
    if (w1[0] === w2[0] && (n1.includes(w2[w2.length - 1]) || n2.includes(w1[w1.length - 1]))) {
      return true;
    }

    // Only if non-synthetic email matches
    if (email1 && email2 && !isSyntheticEmail(email1) && !isSyntheticEmail(email2) && email1.toLowerCase() === email2.toLowerCase()) {
      return true;
    }

    // Names are distinct and different
    return false;
  }

  // If one of the names is missing/unregistered
  if (email1 && email2 && !isSyntheticEmail(email1) && !isSyntheticEmail(email2) && email1.toLowerCase() === email2.toLowerCase()) {
    return true;
  }

  return null; // Ambiguous
}

const TEST_PHONES = new Set([
  '+111111111', 
  '+199999999', 
  '+966500000000', 
  '+17799580', 
  '+70542458', 
  '+705424366', 
  '+97472053188', 
  '+9747205318', 
  '+201017799580'
]);

async function main() {
  console.log('================================================================');
  console.log('🚀 Phase 3.1: Phone Conflict Resolution Analyzer');
  console.log(`Mode: ${isReportOnly ? 'REPORT-ONLY (Analysis & Markdown Generation)' : 'STANDARD'}`);
  console.log('================================================================\n');

  const reportPath = path.resolve(process.cwd(), 'docs/review/phone_conflicts_report.json');
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ File not found: ${reportPath}`);
    process.exit(1);
  }

  const conflictsReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const uniqueConflictingPhones = Array.from(new Set(conflictsReport.map(c => c.phone)));
  console.log(`Loaded ${conflictsReport.length} conflict pairs across ${uniqueConflictingPhones.length} unique phone numbers.`);

  const allAnalyzedPath = path.resolve(process.cwd(), 'scratch/final_analyzed_data.json');
  const allAnalyzed = fs.existsSync(allAnalyzedPath) ? JSON.parse(fs.readFileSync(allAnalyzedPath, 'utf8')) : [];
  const analyzedMap = new Map();
  for (const item of allAnalyzed) {
    analyzedMap.set(item.phone, item);
    const newPhone = item.phone.replace(/^\+/, '+20');
    analyzedMap.set(newPhone, item);
  }

  const classifiedList = [];
  const stats = { A: 0, B: 0, C: 0, D: 0 };

  for (let i = 0; i < uniqueConflictingPhones.length; i++) {
    const phone = uniqueConflictingPhones[i];
    const item = analyzedMap.get(phone);

    let accounts = item ? item.accounts : [];
    if (!accounts || accounts.length === 0) {
      const pairs = conflictsReport.filter(c => c.phone === phone);
      const seen = new Set();
      accounts = [];
      for (const p of pairs) {
        for (const acc of [p.account1, p.account2]) {
          if (!seen.has(acc.id)) {
            seen.add(acc.id);
            accounts.push({
              accountId: acc.id,
              table: acc.table,
              accountType: acc.type,
              name: 'غير مسجل',
              email: 'N/A',
              activity: { videos: 0, notifications: 0, messages: 0 }
            });
          }
        }
      }
    }

    let category = 'D';
    let categoryReason = '';
    let primaryCandidate = null;
    let primaryReason = '';

    const isTest = TEST_PHONES.has(phone) || accounts.some(a => 
      (a.name && (a.name.includes('اختبار') || a.name.toLowerCase().includes('hagzz') || a.name === 'No Name' || a.name === 'Tttt')) ||
      (a.email && (a.email.includes('hagzzgo.com') || a.email.includes('m@go.com') || a.email.includes('admin@hagzzgo.com')))
    );

    if (isTest) {
      category = 'C';
      categoryReason = 'حسابات اختبار تجريبية أو بذور تطوير سابقة';
      primaryCandidate = null;
      primaryReason = 'لا يوجد (حسابات اختبار ممنوعة من الفهرسة)';
      stats.C++;
    } else if (phone === '+8796796') {
      category = 'D';
      categoryReason = 'رقم ناقص ومبتور (7 أرقام فقط)';
      primaryCandidate = null;
      primaryReason = 'يتطلب تواصل مع المستخدم للتأكد من الرقم المكتمل';
      stats.D++;
    } else {
      let hasDifferentUsers = false;
      let hasAmbiguous = false;

      for (let x = 0; x < accounts.length; x++) {
        for (let y = x + 1; y < accounts.length; y++) {
          const match = areNamesSamePerson(accounts[x].name, accounts[y].name, accounts[x].email, accounts[y].email);
          if (match === false) {
            hasDifferentUsers = true;
          } else if (match === null) {
            hasAmbiguous = true;
          }
        }
      }

      if (hasDifferentUsers) {
        category = 'B';
        categoryReason = 'نفس الرقم مسجل لحسابات مختلفة (نزاع ملكية بين أطراف متعددة)';
        // Propose highest activity account as provisional candidate with human review rationale
        const bestAcc = accounts.reduce((prev, curr) => {
          const pScore = ((prev.activity?.videos || 0) * 10) + ((prev.activity?.messages || 0) * 5) + (prev.activity?.notifications || 0) + (prev.supabaseUid ? 3 : 0);
          const cScore = ((curr.activity?.videos || 0) * 10) + ((curr.activity?.messages || 0) * 5) + (curr.activity?.notifications || 0) + (curr.supabaseUid ? 3 : 0);
          return cScore > pScore ? curr : prev;
        }, accounts[0]);

        primaryCandidate = {
          accountId: bestAcc.accountId,
          table: bestAcc.table,
          accountType: bestAcc.accountType,
          name: bestAcc.name
        };
        const v = bestAcc.activity?.videos || 0;
        const n = bestAcc.activity?.notifications || 0;
        const m = bestAcc.activity?.messages || 0;
        primaryReason = `مرشح مبدئي للأولوية لحين البت الإداري (الحساب الأعلى نشاطاً: ${bestAcc.name} في ${bestAcc.table} — ${v} فيديو، ${n} إشعار، ${m} رسالة)`;
        stats.B++;
      } else if (hasAmbiguous && accounts.some(a => !a.name || a.name === 'غير مسجل')) {
        category = 'D';
        categoryReason = 'وجود حساب مجهول الاسم (غير مسجل) مع عدم كفاية البيانات للتحقق';
        const namedAcc = accounts.find(a => a.name && a.name !== 'غير مسجل') || accounts[0];
        primaryCandidate = {
          accountId: namedAcc.accountId,
          table: namedAcc.table,
          accountType: namedAcc.accountType,
          name: namedAcc.name
        };
        primaryReason = `الحساب الوحيد المسمى (${namedAcc.name} في ${namedAcc.table}) لحين استكمال الملف المجهول`;
        stats.D++;
      } else {
        category = 'A';
        categoryReason = 'نفس المستخدم بشكل مؤكد (تكرار لنفس الشخص عبر الجداول)';
        const bestAcc = accounts.reduce((prev, curr) => {
          const pScore = ((prev.activity?.videos || 0) * 10) + ((prev.activity?.messages || 0) * 5) + (prev.activity?.notifications || 0) + (prev.supabaseUid ? 3 : 0);
          const cScore = ((curr.activity?.videos || 0) * 10) + ((curr.activity?.messages || 0) * 5) + (curr.activity?.notifications || 0) + (curr.supabaseUid ? 3 : 0);
          return cScore > pScore ? curr : prev;
        }, accounts[0]);

        primaryCandidate = {
          accountId: bestAcc.accountId,
          table: bestAcc.table,
          accountType: bestAcc.accountType,
          name: bestAcc.name
        };
        const v = bestAcc.activity?.videos || 0;
        const n = bestAcc.activity?.notifications || 0;
        const m = bestAcc.activity?.messages || 0;
        primaryReason = `الحساب الأساسي المعتمد للأولوية والنشاط (${bestAcc.table}: ${v} فيديو، ${n} إشعار، ${m} رسالة)`;
        stats.A++;
      }
    }

    classifiedList.push({
      index: i + 1,
      phone,
      category,
      categoryReason,
      accountsCount: accounts.length,
      accounts,
      primaryCandidate,
      primaryReason
    });
  }

  console.log('\n📊 Category Distribution Summary:');
  console.log(`  الفئة A (نفس المستخدم بشكل مؤكد) : ${stats.A} رقماً`);
  console.log(`  الفئة B (نفس الرقم لكن حسابات مختلفة): ${stats.B} رقماً`);
  console.log(`  الفئة C (حسابات اختبار)          : ${stats.C} أرقام`);
  console.log(`  الفئة D (غير واضح)                : ${stats.D} أرقام`);
  console.log(`  المجموع الإجمالي                 : ${classifiedList.length} رقماً`);

  // Build Markdown Document
  let md = `# خطة حسم وتوجيه تعارضات أرقام الهواتف (Phone Conflict Resolution Plan)

**تاريخ الخطة:** 2026-09-25  
**المشروع:** El7lm-V2 — منصة الحلم الرياضية  
**المرحلة:** Phase 3.1 — Phone Conflict Resolution Architecture  
**الصفة الهندسية:** Senior Data Engineer  
**القواعد الصارمة:**
- **ممنوع الـ Merge التلقائي (No Automatic Merge)**
- **ممنوع حذف أي حساب (No Delete)**
- **ممنوع تعديل بيانات أي حساب (No Account Alteration)**
- **لا تنفيذ لأي Commit على البيانات في هذه المرحلة (Analysis & Plan Only)**

---

## 1. الملخص الإحصائي لتوزيع التعارضات الـ 114

| الفئة | الوصف والتعريف الهندسي | عدد الأرقام | النسبة | الإجراء المعماري المعتمد |
| :---: | :--- | :---: | :---: | :--- |
| **A** | **نفس المستخدم بشكل مؤكد** (تكرار إدخال لنفس الشخص) | **${stats.A}** | **${((stats.A/114)*100).toFixed(1)}%** | اعتماد الحساب الأكثر نشاطاً كـ Primary في الفهرس مع الاحتفاظ بالنسخ الأخرى |
| **B** | **نفس الرقم لكن حسابات مختلفة** (نزاع ملكية حقيقي) | **${stats.B}** | **${((stats.B/114)*100).toFixed(1)}%** | عزل الرقم في الفهرس (\`conflict_different_users\`) مع اقتراح مرشح أولي للمراجعة البشرية |
| **C** | **حسابات اختبار وبذور تجريبية** (أرقام مستحيلة وبذور) | **${stats.C}** | **${((stats.C/114)*100).toFixed(1)}%** | عزل تام من الفهرس (\`test_account\`) وترشيحها للتفريغ أو الأرشفة لاحقاً |
| **D** | **غير واضح / بيانات ناقصة** (رقم مبتور أو مجهول) | **${stats.D}** | **${((stats.D/114)*100).toFixed(1)}%** | وضع علامة \`ambiguous\` والتواصل المباشر مع المستخدم للتحقق |
| **المجموع** | **إجمالي الأرقام المتعارضة المتبقية** | **114** | **100%** | — |

---

## 2. التعديل المعماري المعتمد لجدول \`phone_accounts_index\`

تم تعديل كود ترحيل الجدول ليشمل حقول إدارة التعارضات والحساب الأساسي:

\`\`\`sql
ALTER TABLE IF EXISTS public.phone_accounts_index
  ADD COLUMN IF NOT EXISTS conflict_status TEXT NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS primary_account_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT NULL;

-- قيود التحقق
ALTER TABLE public.phone_accounts_index
  ADD CONSTRAINT chk_phone_accounts_conflict_status
  CHECK (conflict_status IN (
    'clean', 
    'confirmed_same_user', 
    'conflict_different_users', 
    'test_account', 
    'ambiguous', 
    'resolved'
  ));
\`\`\`

---

## 3. جدول حسم وتوجيه كافة التعارضات الـ 114 (Resolution Matrix)

| # | رقم الهاتف | الفئة | وصف الحالة والتعارض | الحساب المقترح (Primary Candidate) | سبب الاختيار المعتمد |
| :---: | :--- | :---: | :--- | :--- | :--- |
`;

  for (const item of classifiedList) {
    const primaryStr = item.primaryCandidate
      ? `\`${item.primaryCandidate.table}\`: **${item.primaryCandidate.name}** (\`${item.primaryCandidate.accountId.substring(0, 10)}...\`)`
      : '— لا يوجد (غير مؤهل) —';

    md += `| ${item.index} | \`${item.phone}\` | **${item.category}** | ${item.categoryReason} | ${primaryStr} | ${item.primaryReason} |\n`;
  }

  md += `\n---\n\n## 4. تفصيل الفئات الأربع واستراتيجية الحسم (Resolution Strategies)\n\n`;

  md += `### أولاً: الفئة A — نفس المستخدم بشكل مؤكد (${stats.A} رقماً)\n\n`;
  md += `هذه السجلات تمثل نفس الشخص المسجل أكثر من مرة (بين \`players\` و \`users\` أو تكرار تسجيل اللاعب).\n`;
  md += `- **استراتيجية الربط:** ربط حقل \`primary_account_id\` بمعرف الحساب المعتمد الأكثر نشاطاً.\n`;
  md += `- **حالة الفهرس:** تُسجل كـ \`confirmed_same_user\`.\n`;
  md += `- **الأثر:** يتمكن المستخدم فوراً من الدخول عبر الـ OTP لحسابه الأساسي دون أي تضارب.\n\n`;

  md += `### ثانياً: الفئة B — نزاع ملكية بين أشخاص مختلفين (${stats.B} رقماً)\n\n`;
  md += `هذه السجلات تخص مستخدمين حقيقيين مختلفين مسجلين بنفس الرقم.\n`;
  md += `- **استراتيجية الربط:** تُسجل كـ \`conflict_different_users\` ويبقى \`primary_account_id\` فارغاً (\`NULL\`) مؤقتاً.\n`;
  md += `- **الأثر:** يستمر النظام في توجيههم لمسار الـ Fallback المتعدد لحين حسم المالك الشرعي للرقم إدارياً.\n\n`;

  md += `### ثالثاً: الفئة C — حسابات اختبار وبذور (${stats.C} أرقام)\n\n`;
  md += `حسابات وهمية مؤكدة (مثل \`+111111111\`, \`+966500000000\`, حسابات باسم "الدحيل اختبار", "hagzz").\n`;
  md += `- **استراتيجية الربط:** تُسجل كـ \`test_account\` وممنوعة تماماً من الـ OTP.\n\n`;

  md += `### رابعاً: الفئة D — غير واضح (${stats.D} أرقام)\n\n`;
  md += `حسابات تحتوي على أرقام مبتورة (\`+8796796\`) أو سجلات مجهولة تتطلب استكمال الملف أولاً.\n`;
  md += `- **استراتيجية الربط:** تُسجل كـ \`ambiguous\` ومتابعتها مع الإدارة.\n\n`;

  const outputPath = path.resolve(process.cwd(), 'docs/review/phone-conflict-resolution-plan.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`✅ Generated conflict resolution plan: ${outputPath}`);

  fs.writeFileSync(
    path.resolve(process.cwd(), 'scratch/phase_3_1_summary.json'),
    JSON.stringify({ stats, total: classifiedList.length, classifiedList }, null, 2),
    'utf8'
  );
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
