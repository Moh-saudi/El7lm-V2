const fs = require('fs');
const path = 'src/app/dashboard/admin/invoices/page.tsx';
const newUiPath = 'src/app/dashboard/admin/invoices/new_ui_block.tsx';

try {
    const pageContent = fs.readFileSync(path, 'utf8');
    const newUiContent = fs.readFileSync(newUiPath, 'utf8');

    // Find the start of the return statement
    const lines = pageContent.split('\n');
    let splitIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === 'return (') {
            splitIndex = i;
            break;
        }
    }

    if (splitIndex === -1) {
        throw new Error('Could not find "return (" in page.tsx');
    }

    // Keep everything before the return statement
    const header = lines.slice(0, splitIndex).join('\n');

    // Construct the new file content
    // We add '  return (' and then the new UI content
    const newContent = header + '\n  return (\n' + newUiContent;

    fs.writeFileSync(path, newContent);
    console.log('✅ Redesign applied successfully!');
} catch (err) {
    console.error('❌ Error applying redesign:', err);
    process.exit(1);
}
