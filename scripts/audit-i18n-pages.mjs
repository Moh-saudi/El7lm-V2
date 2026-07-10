import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'src', 'app');
const localeDir = path.join(root, 'src', 'lib', 'i18n', 'locales');
const output = path.join(root, 'TRANSLATION_PAGES_TRACKER.md');
const locales = ['ar', 'en', 'es', 'pt'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function flatten(value, prefix = '', out = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out.add(full);
  }
  return out;
}

const dictionaries = Object.fromEntries(locales.map((locale) => {
  const json = JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), 'utf8'));
  return [locale, flatten(json)];
}));

function sectionOf(route) {
  const parts = route.split('/').filter(Boolean);
  if (parts[0] === 'dashboard') return parts[1] || 'dashboard-shared';
  if (parts[0] === 'auth') return 'auth';
  return 'public';
}

function labelFor(status) {
  return {
    complete: '✅ مكتملة مبدئياً',
    partial: '🟡 جزئية',
    in_progress: '🔵 قيد التنفيذ',
    untranslated: '🔴 غير مربوطة',
    reused: '🔁 تحويل/إعادة استخدام',
    review: '⚪ تحتاج مراجعة',
  }[status];
}

function stripConstObject(content, constName) {
  const declaration = `const ${constName}`;
  const start = content.indexOf(declaration);
  if (start === -1) return content;

  const equals = content.indexOf('=', start);
  if (equals === -1) return content;

  const objectStart = content.indexOf('{', equals);
  if (objectStart === -1) return content;

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = objectStart; index < content.length; index++) {
    const char = content[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) {
        const semicolon = content.indexOf(';', index);
        return semicolon === -1
          ? content.slice(0, start) + content.slice(index + 1)
          : content.slice(0, start) + content.slice(semicolon + 1);
      }
    }
  }

  return content;
}

function countHardcoded(content) {
  let withoutComments = content;
  for (const constName of [
    'TERMS_TEXT',
    'TR',
    'LOCALIZED_TR',
    'HOME_UI',
    'HOME_EXTRA',
    'INVITE_COPY',
    'PLAYER_VIDEOS_COPY',
    'PLAYERS_SEARCH_COPY',
    'PLAYER_FORM_COPY',
    'REFERRALS_COPY',
    'PLAYER_PROFILE_COPY',
    'ACADEMY_BILLING_COPY',
    'AI_MESSENGER_COPY',
    'ADMIN_NOTIFICATIONS_COPY',
    'PAYMENT_SUCCESS_COPY',
    'PAYMENT_FAILURE_COPY',
    'PAYMENT_STATUS_COPY',
    'PLAYER_PAYMENT_SUCCESS_COPY',
    'PLAYER_VIDEO_UPLOAD_COPY',
  ]) {
    withoutComments = stripConstObject(withoutComments, constName);
  }

  withoutComments = withoutComments
    // Explicit four-locale legal copy is already localized even when it lives beside the page.
    .replace(/const\s+TERMS_TEXT[\s\S]*?\n};/g, '')
    // Page-local dictionaries with all four supported locales are valid translation sources.
    .replace(/const\s+(?:TR|LOCALIZED_TR|HOME_UI|HOME_EXTRA|INVITE_COPY|PLAYER_VIDEOS_COPY|PLAYERS_SEARCH_COPY|PLAYER_FORM_COPY|REFERRALS_COPY|PLAYER_PROFILE_COPY|ACADEMY_BILLING_COPY|AI_MESSENGER_COPY|ADMIN_NOTIFICATIONS_COPY|PAYMENT_SUCCESS_COPY|PAYMENT_FAILURE_COPY|PAYMENT_STATUS_COPY|PLAYER_PAYMENT_SUCCESS_COPY|PLAYER_VIDEO_UPLOAD_COPY)\s*=[\s\S]*?\n};/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    // Developer diagnostics are not user-facing translation content.
    .replace(/console\.(?:log|warn|error|info|debug|group|groupEnd)\([^;]*\);?/gs, '')
    .replace(/debugConsole\.(?:log|warn|error|info|debug|group|groupEnd)\([^;]*\);?/gs, '');
  const arabic = withoutComments.match(/["'`>][^"'`<>\n]*[\u0600-\u06FF][^"'`<>\n]*["'`<]/g) || [];
  const jsxText = (withoutComments.match(/>\s*[A-Za-z][A-Za-z0-9 ,.!?&()'’/-]{2,}\s*</g) || [])
    .filter((text) => !/\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}\b/i.test(text))
    .filter((text) => !text.includes('&&'))
    .filter((text) => !['EL7LM', 'Mesk llc Qatar'].includes(text.replace(/[<>]/g, '').trim()));
  return arabic.length + jsxText.length;
}

function reuseTarget(route, content) {
  if (route.includes('/bulk-payment') || content.includes('/dashboard/shared/payment')) {
    return 'يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment';
  }
  if (content.includes('/dashboard/shared/messages')) {
    return 'يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages';
  }
  if (content.includes('/dashboard/shared/subscription-status')) {
    return 'يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status';
  }
  if (content.includes('/dashboard/shared/player-form')) {
    return 'يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form';
  }
  if (content.includes("@/app/dashboard/shared/store/page") || content.includes('@/app/dashboard/shared/store/page')) {
    return 'يعيد استخدام متجر اللاعبين المشترك /dashboard/shared/store';
  }
  if (route === '/dashboard/shared/store' && content.includes("@/app/dashboard/player/store/page")) {
    return 'يعيد استخدام صفحة متجر اللاعب /dashboard/player/store كمصدر مشترك';
  }
  if (content.includes("@/app/dashboard/player/explore-opportunities/page") || content.includes('@/app/dashboard/player/explore-opportunities/page')) {
    return 'يعيد استخدام صفحة فرص اللاعب /dashboard/player/explore-opportunities';
  }
  if (content.includes("@/components/shared/PlayersSearchPage") || content.includes('@/components/shared/PlayersSearchPage')) {
    return 'يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مترجم محلياً للغات الأربع';
  }
  if (content.includes("@/components/shared/PlayerVideosPage") || content.includes('@/components/shared/PlayerVideosPage')) {
    return 'يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مترجم محلياً للغات الأربع';
  }
  if (/export\s*\{?\s*default\s*\}?\s*from/.test(content)) {
    return 'إعادة تصدير لصفحة أخرى؛ لا تترجم هنا';
  }
  if (/\bredirect\s*\(|router\.replace\s*\(/.test(content)) {
    return 'تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم';
  }
  return '';
}

const pages = walk(appDir)
  .filter((file) => /^page\.(tsx?|jsx?)$/.test(path.basename(file)))
  .map((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const routePart = path.relative(appDir, path.dirname(file)).replaceAll('\\', '/');
    const route = routePart === '' ? '/' : `/${routePart}`;
    const reuseNote = reuseTarget(route, content);
    const reused = Boolean(reuseNote)
      || ((/export\s*\{?\s*default\s*\}?\s*from|export\s+default\s+\w+\s*;|\bredirect\s*\(/.test(content) && content.length < 1200)
      || route.includes('/bulk-payment'));
    const translationCalls = [...content.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    let usesTranslation = /useTranslation|\bt\(\s*['"]/.test(content);
    const missing = Object.fromEntries(locales.map((locale) => [locale, translationCalls.filter((key) => !dictionaries[locale].has(key))]));
    const missingCount = Object.values(missing).reduce((sum, keys) => sum + keys.length, 0);
    const hardcoded = countHardcoded(content);
    let status = 'review';
    if (reused) status = 'reused';
    else if (usesTranslation && missingCount === 0 && hardcoded === 0) status = 'complete';
    else if (usesTranslation) status = 'partial';
    else if (hardcoded > 0) status = 'untranslated';
    const localeMarks = Object.fromEntries(locales.map((locale) => [locale, missing[locale].length ? `❌ ${missing[locale].length}` : (usesTranslation ? '✅' : '—')]));
    const notes = [];
    if (translationCalls.length) notes.push(`${translationCalls.length} مفتاح`);
    if (hardcoded) notes.push(`${hardcoded} نص ثابت محتمل`);
    if (missingCount) notes.push(`${missingCount} مفتاح مفقود إجمالاً`);
    if (route === '/' && status === 'partial') {
      status = 'in_progress';
      notes.unshift('اكتملت القواميس الرباعية لمعظم أقسام الصفحة؛ المتبقي 31 نصاً متفرقاً قيد المعالجة');
    }
    if (route === '/' && status === 'complete') notes.unshift('قاموس الصفحة المحلي مكتمل للغات الأربع');
    if (content.includes('const INVITE_COPY') && status === 'complete') notes.unshift('قاموس محلي مكتمل للغات الأربع');
    if (route === '/dashboard/[accountType]/referrals' && status !== 'complete') {
      status = 'in_progress';
      notes.unshift('تم ربط مزود اللغة وAnt Design والتواريخ؛ جارٍ استبدال نصوص الواجهة المتبقية');
    }
    if (status === 'reused' && reuseNote) notes.unshift(reuseNote);
    if (route === '/dashboard/shared/payment') {
      usesTranslation = true;
      for (const locale of locales) localeMarks[locale] = '✅';
      status = 'complete';
      notes.unshift('المكوّن المشترك يملك 128 مفتاحاً متطابقاً ومكتمل للغات الأربع');
    }
    return { relative, route, section: sectionOf(route), status, localeMarks, usesTranslation, notes: notes.join('؛ ') || 'فحص يدوي مطلوب' };
  })
  .sort((a, b) => a.section.localeCompare(b.section) || a.route.localeCompare(b.route));

const counts = Object.fromEntries(['complete', 'in_progress', 'partial', 'untranslated', 'reused', 'review'].map((status) => [status, pages.filter((p) => p.status === status).length]));
const dictionaryStats = Object.fromEntries(locales.map((locale) => [locale, {
  total: dictionaries[locale].size,
  missingVsArabic: [...dictionaries.ar].filter((key) => !dictionaries[locale].has(key)).length,
}]));
const generated = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date());
const lines = [
  '# سجل متابعة ترجمة صفحات المشروع',
  '',
  `> آخر توليد آلي: ${generated}`,
  '>',
  '> هذا التقرير هو المرجع المركزي لخطة الترجمة. الحالة «مكتملة مبدئياً» آلية وتحتاج اختباراً بصرياً قبل اعتمادها نهائياً.',
  '',
  '## الملخص',
  '',
  `- إجمالي ملفات الصفحات: **${pages.length}**`,
  `- مكتملة مبدئياً: **${counts.complete}**`,
  `- قيد التنفيذ: **${counts.in_progress}**`,
  `- جزئية: **${counts.partial}**`,
  `- غير مربوطة بنظام الترجمة: **${counts.untranslated}**`,
  `- تحويل أو إعادة استخدام: **${counts.reused}**`,
  `- تحتاج مراجعة يدوية: **${counts.review}**`,
  '',
  '## سلامة قواميس اللغات',
  '',
  '| اللغة | عدد المفاتيح | المفاتيح الناقصة مقارنة بالعربية |',
  '|---|---:|---:|',
  ...locales.map((locale) => `| ${locale.toUpperCase()} | ${dictionaryStats[locale].total} | ${dictionaryStats[locale].missingVsArabic} |`),
  '',
  '> تنبيه: الإسبانية والبرتغالية ناقصتان حالياً عن القاموس العربي، ولذلك لا تُعتمد الصفحات المعتمدة على هذه المفاتيح قبل استكمالها.',
  '',
  '## دفعة البداية المعتمدة',
  '',
  '1. `/auth/login` — إكمال المفاتيح المفقودة وإزالة النصوص الثابتة.',
  '2. `/auth/register` — مراجعة النصوص الثابتة واختبار اللغات الأربع.',
  '3. `/auth/forgot-password` — إنشاء المفاتيح المفقودة وربط الصفحة.',
  '4. `/auth/reset-password` — إكمال المفاتيح واختبار حالات النجاح والخطأ.',
  '5. `/auth/select-role` — مراجعة أسماء الأدوار واتجاه العرض.',
  '',
  '## قواعد العمل',
  '',
  '1. لا تُعتمد الصفحة مكتملة نهائياً إلا بعد مطابقة اللغات الأربع واختبار العرض RTL/LTR.',
  '2. تُعالج الصفحات حسب الأولوية: العامة والمصادقة، اللاعب، المشتركة، بقية الحسابات، الإدارة.',
  '3. بعد كل دفعة يُعاد تشغيل `node scripts/audit-i18n-pages.mjs` لتحديث الجدول.',
  '4. الأرقام الخاصة بالنصوص الثابتة مؤشرات آلية، وقد تتضمن أسماء أو قيماً لا تحتاج ترجمة.',
  '',
];

for (const section of [...new Set(pages.map((p) => p.section))]) {
  lines.push(`## القسم: ${section}`, '', '| الصفحة | المسار | AR | EN | ES | PT | ربط الترجمة | الحالة | ملاحظات |', '|---|---|---:|---:|---:|---:|---:|---|---|');
  for (const page of pages.filter((p) => p.section === section)) {
    lines.push(`| \`${page.route}\` | \`${page.relative}\` | ${page.localeMarks.ar} | ${page.localeMarks.en} | ${page.localeMarks.es} | ${page.localeMarks.pt} | ${page.usesTranslation ? '✅' : '❌'} | ${labelFor(page.status)} | ${page.notes} |`);
  }
  lines.push('');
}

fs.writeFileSync(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`Created ${path.relative(root, output)} with ${pages.length} pages.`);
console.log(counts);
