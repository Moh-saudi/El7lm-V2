const fs = require('fs');
const path = 'src/app/dashboard/admin/invoices/page.tsx';
const fixedPath = 'src/app/dashboard/admin/invoices/fixed_block.tsx';

try {
    const lines = fs.readFileSync(path, 'utf8').split('\n');

    // Part 1: Lines 1-768 (Indices 0-767)
    const part1 = lines.slice(0, 768).join('\n');

    // Part 3: Lines 806-End (Indices 805-End)
    // Note: We skip lines 769-805 (Indices 768-804) which is the broken block
    const part3 = lines.slice(805).join('\n');

    const fixed = fs.readFileSync(fixedPath, 'utf8');

    const newContent = part1 + '\n' + fixed + '\n' + part3;

    fs.writeFileSync(path, newContent);
    console.log('✅ File stitched successfully!');
} catch (err) {
    console.error('❌ Error stitching file:', err);
    process.exit(1);
}
