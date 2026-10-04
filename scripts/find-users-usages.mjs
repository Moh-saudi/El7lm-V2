import fs from 'fs';
import path from 'path';

function findFiles(dir, exts = ['.ts', '.tsx', '.js', '.dart']) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.next' && e.name !== '.git') {
        results.push(...findFiles(full, exts));
      }
    } else if (exts.some(ext => e.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const srcFiles = findFiles('src');
const mobileFiles = fs.existsSync('mobile') ? findFiles('mobile') : [];
const allCodeFiles = [...srcFiles, ...mobileFiles];

console.log(`Searching across ${allCodeFiles.length} source code files...`);

const userUsages = [];

for (const f of allCodeFiles) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      if (line.includes(".from('users')") || line.includes('.from("users")') || line.includes("from('users')")) {
        userUsages.push({
          file: f.replace(/\\/g, '/'),
          lineNum: idx + 1,
          lineText: line.trim(),
          context: lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 4)).map(l => l.trim()).join(' | ')
        });
      }
    });
  } catch {}
}

console.log(`Found ${userUsages.length} occurrences of .from('users')`);

fs.writeFileSync('scratch/users-usages.json', JSON.stringify(userUsages, null, 2), 'utf8');
console.log('✅ Saved scratch/users-usages.json');
