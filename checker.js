const fs = require('fs');
const content = fs.readFileSync('src/app/page.tsx', 'utf8');

function checkTags(tag) {
  const openCount = (content.match(new RegExp('<' + tag, 'g')) || []).length;
  const closeCount = (content.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  console.log(`${tag}: Open=${openCount}, Close=${closeCount}, Diff=${openCount - closeCount}`);
}

['div', 'section', 'main', 'header', 'footer', 'span'].forEach(checkTags);

// Find the first imbalance
let stack = [];
let lines = content.split('\n');
lines.forEach((line, i) => {
  const matches = line.matchAll(/<(div|section|main|header|footer|span)|<\/(div|section|main|header|footer|span)>/g);
  for (const match of matches) {
    if (match[0].startsWith('</')) {
      const closing = match[2];
      if (stack.length === 0) {
        console.log(`EXTRA CLOSING ${closing} at line ${i+1}: ${line.trim()}`);
      } else {
        const last = stack.pop();
        if (last.tag !== closing) {
          console.log(`MISMATCH at line ${i+1}: expected </${last.tag}> but found </${closing}>. Last open was at line ${last.line}`);
        }
      }
    } else {
      const opening = match[1];
      stack.push({tag: opening, line: i+1});
    }
  }
});

stack.forEach(unclosed => {
  console.log(`UNCLOSED ${unclosed.tag} opened at line ${unclosed.line}`);
});
