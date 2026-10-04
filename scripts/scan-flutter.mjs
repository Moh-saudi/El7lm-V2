import fs from 'fs';
import path from 'path';

function searchDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      searchDir(full);
    } else if (f.name.endsWith('.dart')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (l.includes(".from('") || l.includes('.from("')) {
          console.log(full.replace(/\\/g, '/') + ':' + (idx + 1) + ': ' + l.trim());
        }
      });
    }
  }
}

if (fs.existsSync('mobile/lib')) {
  searchDir('mobile/lib');
} else {
  console.log('mobile/lib not found');
}
