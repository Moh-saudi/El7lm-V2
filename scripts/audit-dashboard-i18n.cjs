const fs = require('fs');
const path = require('path');

let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('../node_modules/.ignored/typescript');
}

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');
const dashboardRoot = path.join(srcRoot, 'app', 'dashboard');
const outputPath = path.join(root, 'DASHBOARD_TRANSLATION_AUDIT.md');
const locales = ['ar', 'en', 'es', 'pt'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function resolveImport(sourceFile, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = path.join(srcRoot, specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(sourceFile), specifier);
  else return null;

  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function dependencyGraph(entryFile) {
  const seen = new Set();
  function visit(file) {
    file = path.resolve(file);
    if (
      seen.has(file)
      || !file.startsWith(srcRoot)
      || file.includes(`${path.sep}admin${path.sep}`)
      || file.includes(`${path.sep}api${path.sep}`)
    ) return;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    const imports = [
      ...source.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g),
    ].map((match) => match[1]);
    for (const specifier of imports) {
      const resolved = resolveImport(file, specifier);
      if (resolved) visit(resolved);
    }
  }
  visit(entryFile);
  return [...seen];
}

const ignoredExact = new Set([
  'EL7LM', 'YouTube', 'Vimeo', 'Instagram', 'Facebook', 'Twitter', 'LinkedIn',
  'TikTok', 'WhatsApp', 'Transfermarkt', 'PDF', 'CSV', 'FIFA', 'Apple Pay',
  'SAR', 'USD', 'OVR', 'BMI', 'Profile', 'Preview', 'Video', 'placeholder',
]);

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function looksUserFacing(text) {
  text = normalize(text);
  if (text.length < 3 || ignoredExact.has(text)) return false;
  if (/^(?:https?:|[/#.]|[+]?\d[\dXx -]+$)/.test(text)) return false;
  if (/^[A-Z0-9_ -]+$/.test(text) && !/[a-z\u0600-\u06ff]/.test(text)) return false;
  return /[A-Za-z\u0600-\u06ff]/.test(text);
}

function scanUiFile(file) {
  if (!/\.(tsx|jsx)$/.test(file) || file.includes(`${path.sep}components${path.sep}ui${path.sep}`)) return [];
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const samples = [];
  const add = (text, node) => {
    text = normalize(text);
    if (!looksUserFacing(text) || samples.some((sample) => sample.text === text)) return;
    samples.push({
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      text: text.slice(0, 120),
    });
  };
  function visit(node) {
    if (ts.isJsxText(node)) add(node.text, node);
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      if (['placeholder', 'title', 'aria-label', 'alt'].includes(node.name.text)) add(node.initializer.text, node);
    }
    if (ts.isStringLiteralLike(node) && node.parent && ts.isJsxExpression(node.parent)) add(node.text, node);
    if (ts.isCallExpression(node)) {
      const callName = node.expression.getText(sourceFile);
      if (/(?:toast(?:\.\w+)?|alert|confirm)$/.test(callName)) {
        const first = node.arguments[0];
        if (first && ts.isStringLiteralLike(first)) add(first.text, first);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return samples;
}

function analyzeGraph(files) {
  const issues = [];
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (relative.startsWith('src/lib/i18n/page-copy/')) {
      issues.push({ file: relative, localCopy: true, usesI18n: false, samples: [] });
      continue;
    }
    const samples = scanUiFile(file);
    if (!samples.length) continue;
    const source = fs.readFileSync(file, 'utf8');
    issues.push({
      file: relative,
      localCopy: false,
      usesI18n: /useTranslation|getTranslations|\bt\s*\(/.test(source),
      samples,
    });
  }
  return issues;
}

function routeFor(file) {
  const relativeDir = path.relative(dashboardRoot, path.dirname(file)).replaceAll('\\', '/');
  return relativeDir ? `/dashboard/${relativeDir}` : '/dashboard';
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

const dictionarySets = Object.fromEntries(locales.map((locale) => {
  const file = path.join(srcRoot, 'lib', 'i18n', 'locales', `${locale}.json`);
  return [locale, flatten(JSON.parse(fs.readFileSync(file, 'utf8')))];
}));
const arabicKeys = dictionarySets.ar;
const dictionaryRows = locales.map((locale) => ({
  locale,
  total: dictionarySets[locale].size,
  missing: [...arabicKeys].filter((key) => !dictionarySets[locale].has(key)).length,
  extra: [...dictionarySets[locale]].filter((key) => !arabicKeys.has(key)).length,
}));

const pageFiles = walk(dashboardRoot)
  .filter((file) => path.basename(file) === 'page.tsx')
  .filter((file) => !file.includes(`${path.sep}admin${path.sep}`))
  .sort((a, b) => routeFor(a).localeCompare(routeFor(b)));
const layoutFile = path.join(dashboardRoot, 'layout.tsx');
const layoutIssues = analyzeGraph(dependencyGraph(layoutFile));
const pageRows = pageFiles.map((file) => {
  const graph = dependencyGraph(file);
  const issues = analyzeGraph(graph);
  const hardcoded = issues.reduce((sum, issue) => sum + issue.samples.length, 0);
  const localCopies = issues.filter((issue) => issue.localCopy).length;
  const untranslatedFiles = issues.filter((issue) => !issue.usesI18n && !issue.localCopy).length;
  return { route: routeFor(file), file: path.relative(root, file).replaceAll('\\', '/'), graph, issues, hardcoded, localCopies, untranslatedFiles };
});

const cleanPages = pageRows.filter((row) => row.issues.length === 0).length;
const affectedPages = pageRows.length - cleanPages;
const issueFiles = new Map();
for (const issue of [...layoutIssues, ...pageRows.flatMap((row) => row.issues)]) issueFiles.set(issue.file, issue);
const generated = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date());

const lines = [
  '# تقرير فحص ترجمة لوحات التحكم غير الإدارية',
  '',
  `> آخر توليد آلي: ${generated}`,
  '>',
  '> يستبعد التقرير جميع مسارات `/dashboard/admin`. النصوص المرصودة مؤشرات واجهة فعلية، مع استبعاد الروابط والعلامات التجارية والقيم التقنية الشائعة.',
  '',
  '## الملخص',
  '',
  `- صفحات تم فحصها: **${pageRows.length}**`,
  `- صفحات سليمة في نطاقها الخاص: **${cleanPages}**`,
  `- صفحات لها نصوص مباشرة أو مكونات تابعة تحتاج معالجة: **${affectedPages}**`,
  `- ملفات واجهة فريدة بها مؤشرات: **${issueFiles.size}**`,
  `- مشكلات مشتركة في تخطيط كل اللوحات: **${layoutIssues.length} ملفاً**`,
  '- محتوى الصفحات المحمية يحتاج حساب اختبار صالح للفحص البصري بعد إكمال معالجة النصوص.',
  '',
  '## تطابق القواميس المركزية',
  '',
  '| اللغة | المفاتيح | ناقص مقابل AR | زائد مقابل AR |',
  '|---|---:|---:|---:|',
  ...dictionaryRows.map((row) => `| ${row.locale.toUpperCase()} | ${row.total} | ${row.missing} | ${row.extra} |`),
  '',
  '## مشكلات التخطيط المشترك التي تظهر في جميع اللوحات',
  '',
  '| الملف | الحالة | أمثلة |',
  '|---|---|---|',
  ...layoutIssues.map((issue) => `| \`${issue.file}\` | ${issue.localCopy ? 'قاموس محلي' : issue.usesI18n ? 'نصوص خارج القاموس داخل ملف مترجم جزئياً' : 'غير مربوط بالقاموس'} | ${issue.samples.slice(0, 3).map((sample) => `${sample.text} (سطر ${sample.line})`).join('؛ ') || 'قاموس محلي'} |`),
  '',
  '## نتيجة كل صفحة',
  '',
  '| المسار | ملفات التبعية المفحوصة | النتيجة | مؤشرات النصوص | الملفات المسببة |',
  '|---|---:|---|---:|---:|',
  ...pageRows.map((row) => `| \`${row.route}\` | ${row.graph.length} | ${row.issues.length ? '🔴 تحتاج معالجة' : '✅ سليمة في نطاق الصفحة'} | ${row.hardcoded} | ${row.issues.length} |`),
  '',
  '## الملفات المسببة مرتبة حسب المسار',
  '',
  ...pageRows.filter((row) => row.issues.length).flatMap((row) => [
    `### \`${row.route}\``,
    '',
    ...row.issues.map((issue) => `- \`${issue.file}\`: ${issue.localCopy ? 'قاموس ترجمة محلي يحتاج نقله للمركزي' : issue.samples.slice(0, 5).map((sample) => `«${sample.text}» سطر ${sample.line}`).join('، ')}`),
    '',
  ]),
];

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ pages: pageRows.length, cleanPages, affectedPages, layoutIssueFiles: layoutIssues.length, uniqueIssueFiles: issueFiles.size, output: outputPath }, null, 2));
