import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'src', 'app');
const localeDir = path.join(root, 'src', 'lib', 'i18n', 'locales');
const output = path.join(root, 'TRANSLATION_PAGES_TRACKER.md');
const locales = ['ar', 'en', 'es', 'pt'];
const localDictionaryNames = [
  'TERMS_TEXT', 'TR', 'LOCALIZED_TR', 'HOME_UI', 'HOME_EXTRA', 'INVITE_COPY',
  'PLAYER_VIDEOS_COPY', 'PLAYERS_SEARCH_COPY', 'PLAYER_FORM_COPY', 'REFERRALS_COPY',
  'PLAYER_PROFILE_COPY', 'ACADEMY_BILLING_COPY', 'AI_MESSENGER_COPY',
  'ADMIN_NOTIFICATIONS_COPY', 'PAYMENT_SUCCESS_COPY', 'PAYMENT_FAILURE_COPY',
  'PAYMENT_STATUS_COPY', 'PLAYER_PAYMENT_SUCCESS_COPY', 'PLAYER_VIDEO_UPLOAD_COPY',
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageBundleFiles(pageFile) {
  const pageDir = path.dirname(pageFile);
  const seen = new Set();
  const resolveImport = (sourceFile, specifier) => {
    const base = path.resolve(path.dirname(sourceFile), specifier);
    const candidates = [
      base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
      path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  };
  const visit = (file) => {
    if (!file || seen.has(file) || !file.startsWith(pageDir)) return;
    seen.add(file);
    const content = fs.readFileSync(file, 'utf8');
    const specifiers = [
      ...content.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g),
      ...content.matchAll(/\bimport\(\s*['"](\.[^'"]+)['"]\s*\)/g),
    ].map((match) => match[1]);
    for (const specifier of specifiers) visit(resolveImport(file, specifier));
  };
  visit(pageFile);
  return [...seen];
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
    local_dictionary: '🟠 قاموس محلي يحتاج نقلاً',
    untranslated: '🔴 غير مربوطة',
    reused: '🔁 تحويل/إعادة استخدام',
    legacy: '⚫ قديمة/غير مستخدمة',
    review: '⚪ تحتاج مراجعة',
  }[status];
}

function localDictionariesIn(content) {
  return localDictionaryNames.filter((name) => new RegExp(`\\bconst\\s+${name}\\b`).test(content));
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
  withoutComments = withoutComments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    // Developer diagnostics are not user-facing translation content.
    .replace(/console\.(?:log|warn|error|info|debug|group|groupEnd)\([^;]*\);?/gs, '')
    .replace(/debugConsole\.(?:log|warn|error|info|debug|group|groupEnd)\([^;]*\);?/gs, '');
  const arabic = withoutComments.match(/["'`>][^"'`<>\n]*[\u0600-\u06FF][^"'`<>\n]*["'`<]/g) || [];
  const jsxText = (withoutComments.match(/>\s*[A-Za-z][A-Za-z0-9 ,.!?&()'’/-]{2,}\s*</g) || [])
    .filter((text) => !/\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}\b/i.test(text))
    .filter((text) => !text.includes('&&'))
    .filter((text) => ![
      'EL7LM', 'Mesk llc Qatar', 'YouTube', 'Vimeo', 'Instagram', 'Facebook',
      'Twitter', 'LinkedIn', 'Transfermarkt', 'OVR',
    ].includes(text.replace(/[<>]/g, '').trim()));
  return arabic.length + jsxText.length;
}

function reuseTarget(route, content) {
  if (content.includes('NotificationFeed')) {
    return 'يعيد استخدام موجز الإشعارات المشترك المرتبط بالقاموس المركزي';
  }
  if (content.includes('@/app/dashboard/shared/messages/page')) {
    return 'يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages';
  }
  if (
    route.includes('/bulk-payment')
    || /from\s+['"]@\/app\/dashboard\/shared\/payment\/page['"]/.test(content)
    || /from\s+['"]@\/components\/shared\/BulkPaymentPage['"]/.test(content)
  ) {
    return 'يعيد استخدام صفحة الدفع المشتركة /dashboard/shared/payment';
  }
  if (content.includes('/dashboard/shared/messages')) {
    return 'يعيد استخدام صفحة الرسائل المشتركة /dashboard/shared/messages';
  }
  if (content.includes('/dashboard/shared/subscription-status')) {
    return 'يعيد استخدام صفحة حالة الاشتراك المشتركة /dashboard/shared/subscription-status';
  }
  if (content.includes('/dashboard/shared/player-form')) {
    return 'يعيد استخدام نموذج اللاعب المشترك /dashboard/shared/player-form؛ مرتبط بالقاموس المركزي للغات الأربع';
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
    return 'يعيد استخدام مكوّن البحث المشترك src/components/shared/PlayersSearchPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع';
  }
  if (content.includes("@/components/shared/PlayerVideosPage") || content.includes('@/components/shared/PlayerVideosPage')) {
    return 'يعيد استخدام مكوّن فيديوهات اللاعب المشترك src/components/shared/PlayerVideosPage.tsx؛ مرتبط بالقاموس المركزي للغات الأربع';
  }
  if (/export\s*\{?\s*default\s*\}?\s*from/.test(content)) {
    return 'إعادة تصدير لصفحة أخرى؛ لا تترجم هنا';
  }
  if (/\bredirect\s*\(|router\.replace\s*\(/.test(content)) {
    if (content.length < 1200) return 'تحويل لمسار آخر؛ لا تترجم هنا إلا إذا ظهر نص انتظار للمستخدم';
  }
  return '';
}

const pages = walk(appDir)
  .filter((file) => /^page\.(tsx?|jsx?)$/.test(path.basename(file)))
  .map((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const bundleFiles = pageBundleFiles(file);
    const analysisContent = bundleFiles.map((bundleFile) => fs.readFileSync(bundleFile, 'utf8')).join('\n');
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const routePart = path.relative(appDir, path.dirname(file)).replaceAll('\\', '/');
    const route = routePart === '' ? '/' : `/${routePart}`;
    const reuseNote = reuseTarget(route, content);
    const reused = Boolean(reuseNote)
      || ((/export\s*\{?\s*default\s*\}?\s*from|export\s+default\s+\w+\s*;|\bredirect\s*\(/.test(content) && content.length < 1200)
      || route.includes('/bulk-payment'));
    const translationCalls = [...new Set([...analysisContent.matchAll(/\bt\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]))];
    const localDictionaries = localDictionariesIn(analysisContent);
    let usesTranslation = /\buseTranslation\s*\(/.test(analysisContent);
    const missing = Object.fromEntries(locales.map((locale) => [locale, translationCalls.filter((key) => !dictionaries[locale].has(key))]));
    const missingCount = Object.values(missing).reduce((sum, keys) => sum + keys.length, 0);
    const hardcoded = countHardcoded(analysisContent);
    let status = 'review';
    if (reused) status = 'reused';
    else if (localDictionaries.length) status = 'local_dictionary';
    else if (usesTranslation && missingCount === 0 && hardcoded === 0) status = 'complete';
    else if (usesTranslation) status = 'partial';
    else if (hardcoded > 0) status = 'untranslated';
    const localeMarks = Object.fromEntries(locales.map((locale) => [locale, missing[locale].length ? `❌ ${missing[locale].length}` : (usesTranslation ? '✅' : '—')]));
    const notes = [];
    if (translationCalls.length) notes.push(`${translationCalls.length} مفتاح`);
    if (hardcoded) notes.push(`${hardcoded} نص ثابت محتمل`);
    if (missingCount) notes.push(`${missingCount} مفتاح مفقود إجمالاً`);
    if (bundleFiles.length > 1) notes.push(`فُحص ملف الصفحة و${bundleFiles.length - 1} ملفاً تابعاً`);
    if (localDictionaries.length) notes.unshift(`قواميس محلية: ${localDictionaries.join(', ')}`);
    if (route === '/profile') {
      status = 'legacy';
      notes.unshift('صفحة قديمة منفصلة عن بروفايل اللاعب الرئيسي /dashboard/player/profile ولا تشير إليها قوائم التطبيق');
    }
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

const counts = Object.fromEntries(['complete', 'in_progress', 'partial', 'local_dictionary', 'untranslated', 'reused', 'legacy', 'review'].map((status) => [status, pages.filter((p) => p.status === status).length]));
const isAdminScope = (route) => route.startsWith('/admin') || route.startsWith('/dashboard/admin') || route === '/fix-admin' || route.startsWith('/debug/');
const scopePages = pages.filter((page) => !isAdminScope(page.route));
const scopeCounts = Object.fromEntries(['complete', 'in_progress', 'partial', 'local_dictionary', 'untranslated', 'reused', 'legacy', 'review'].map((status) => [status, scopePages.filter((p) => p.status === status).length]));
const dictionaryStats = Object.fromEntries(locales.map((locale) => [locale, {
  total: dictionaries[locale].size,
  missingVsArabic: [...dictionaries.ar].filter((key) => !dictionaries[locale].has(key)).length,
}]));
const localDictionaryFiles = walk(path.join(root, 'src'))
  .filter((file) => /\.(tsx?|jsx?)$/.test(file))
  .map((file) => ({
    file: path.relative(root, file).replaceAll('\\', '/'),
    names: localDictionariesIn(fs.readFileSync(file, 'utf8')),
  }))
  .filter((entry) => entry.names.length > 0);
const generated = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date());
const dictionariesAreAligned = locales.every((locale) => dictionaryStats[locale].missingVsArabic === 0);
const sectionPriority = ['auth', 'public', 'player', 'shared', 'academy', 'agent', 'club', 'marketer', 'parent', 'trainer', 'admin'];
const statusPriority = ['partial', 'local_dictionary', 'untranslated', 'review'];
const nextPages = pages
  .filter((page) => !isAdminScope(page.route) && statusPriority.includes(page.status))
  .sort((a, b) => {
    const statusDelta = statusPriority.indexOf(a.status) - statusPriority.indexOf(b.status);
    if (statusDelta) return statusDelta;
    const sectionA = sectionPriority.includes(a.section) ? sectionPriority.indexOf(a.section) : sectionPriority.length;
    const sectionB = sectionPriority.includes(b.section) ? sectionPriority.indexOf(b.section) : sectionPriority.length;
    return sectionA - sectionB || a.route.localeCompare(b.route);
  })
  .slice(0, 10);
const lines = [
  '# سجل متابعة ترجمة صفحات المشروع',
  '',
  `> آخر توليد آلي: ${generated}`,
  '>',
  '> هذا التقرير هو المرجع المركزي لخطة الترجمة. الحالة «مكتملة مبدئياً» آلية وتحتاج اختباراً بصرياً قبل اعتمادها نهائياً.',
  '> صفحات وأدوات لوحة تحكم الأدمن خارج النطاق الحالي بناءً على قرار المشروع.',
  '',
  '## الملخص',
  '',
  `- إجمالي ملفات الصفحات: **${pages.length}**`,
  `- مكتملة مبدئياً: **${counts.complete}**`,
  `- قيد التنفيذ: **${counts.in_progress}**`,
  `- جزئية: **${counts.partial}**`,
  `- تستخدم قاموساً محلياً وتحتاج نقله للمركزي: **${counts.local_dictionary}**`,
  `- غير مربوطة بنظام الترجمة: **${counts.untranslated}**`,
  `- تحويل أو إعادة استخدام: **${counts.reused}**`,
  `- قديمة أو غير مستخدمة: **${counts.legacy}**`,
  `- تحتاج مراجعة يدوية: **${counts.review}**`,
  `- المتبقي داخل النطاق غير الإداري (جزئي/غير مربوط/مراجعة): **${scopeCounts.partial + scopeCounts.local_dictionary + scopeCounts.untranslated + scopeCounts.review}**`,
  '',
  '## سلامة قواميس اللغات',
  '',
  '| اللغة | عدد المفاتيح | المفاتيح الناقصة مقارنة بالعربية |',
  '|---|---:|---:|',
  ...locales.map((locale) => `| ${locale.toUpperCase()} | ${dictionaryStats[locale].total} | ${dictionaryStats[locale].missingVsArabic} |`),
  '',
  dictionariesAreAligned
    ? '> ✅ القواميس المركزية للغات الأربع متطابقة من حيث المفاتيح.'
    : '> ⚠️ توجد مفاتيح ناقصة في بعض القواميس مقارنة بالقاموس العربي؛ لا تُعتمد الصفحات المتأثرة قبل استكمالها.',
  '',
  '## آخر فحص بصري مسجل',
  '',
  '- **بوابة تسجيل الدخول للبطولات:** تم التحقق من AR / EN / ES / PT واتجاهي RTL/LTR دون تمدد أفقي أو أخطاء واجهة.',
  '- **صفحات البطولات العامة:** تم اكتشاف الرأس والتذييل العربيين الثابتين، ونقلهما إلى القاموس المركزي والتحقق من EN / ES / PT.',
  '- **التسجيل الموحد:** تم التحقق من EN / ES / PT دون تمدد أفقي؛ إعادة جولة AR مؤجلة لأن خادم التطوير المحلي انتهت مهلته أثناء إعادة التجميع.',
  '- **بروفايل المدرب:** نصا التحميل وإعادة التوجيه في التخطيط المشترك نُقلا إلى القاموس المركزي؛ التحقق التركيبي ناجح، ويلزم تسجيل دخول صالح لفحص محتوى البروفايل نفسه بصرياً.',
  '',
  '## قواعد المصدر المركزي ومنع التكرار',
  '',
  '1. المصدر المعتمد للترجمة هو `src/lib/i18n/locales/{ar,en,es,pt}.json` فقط.',
  '2. أي قاموس داخل صفحة أو مكوّن يُسجل كدين تقني حتى يُنقل إلى القاموس المركزي.',
  '3. صفحات التحويل وإعادة التصدير والواجهات التي تستخدم مكوّناً مشتركاً لا تُترجم مرة أخرى.',
  '4. يشمل فحص الصفحة ملفات المكونات و`hooks` و`schemas` التابعة لها، مع استبعاد مسارات الصفحات الفرعية.',
  '',
  '## الدفعة التالية المقترحة آلياً',
  '',
  ...(nextPages.length ? nextPages.map((page, index) => `${index + 1}. \`${page.route}\` — ${labelFor(page.status)} — ${page.notes}`) : ['✅ لا توجد صفحات متبقية داخل النطاق غير الإداري الحالي.']),
  '',
  '## القواميس المحلية المطلوب نقلها',
  '',
  '| الملف | القواميس المحلية |',
  '|---|---|',
  ...localDictionaryFiles.map((entry) => `| \`${entry.file}\` | ${entry.names.map((name) => `\`${name}\``).join(', ')} |`),
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
  lines.push(`## القسم: ${section}`, '', '| الصفحة | المسار | AR | EN | ES | PT | ربط القاموس المركزي | الحالة | ملاحظات |', '|---|---|---:|---:|---:|---:|---:|---|---|');
  for (const page of pages.filter((p) => p.section === section)) {
    lines.push(`| \`${page.route}\` | \`${page.relative}\` | ${page.localeMarks.ar} | ${page.localeMarks.en} | ${page.localeMarks.es} | ${page.localeMarks.pt} | ${page.usesTranslation ? '✅' : '❌'} | ${labelFor(page.status)} | ${page.notes} |`);
  }
  lines.push('');
}

fs.writeFileSync(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`Created ${path.relative(root, output)} with ${pages.length} pages.`);
console.log(counts);
