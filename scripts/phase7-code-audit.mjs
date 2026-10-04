import fs from 'fs';
import path from 'path';

const usages = JSON.parse(fs.readFileSync('scratch/users-usages.json', 'utf8'));

// Group by file
const byFile = {};
usages.forEach(u => {
  if (!byFile[u.file]) byFile[u.file] = [];
  byFile[u.file].push(u);
});

console.log(`Unique files referencing .from('users'): ${Object.keys(byFile).length}`);

// Categorize each file and occurrence
const categorized = {
  A_Auth_Identity: [],
  B_Profile: [],
  C_Authorization: [],
  D_Business_Entity: [],
  E_Legacy_Migration: []
};

for (const [file, items] of Object.entries(byFile)) {
  for (const item of items) {
    const fLower = file.toLowerCase();
    const cLower = (item.context || '').toLowerCase();

    let cat = 'B_Profile';
    let criticality = 'MEDIUM';
    let purpose = '';

    if (fLower.includes('auth') || fLower.includes('otp') || fLower.includes('login') || fLower.includes('session') || cLower.includes('phone') || cLower.includes('password') || cLower.includes('uid')) {
      cat = 'A_Auth_Identity';
      criticality = 'CRITICAL';
      purpose = 'User authentication, OTP verification, session generation, or identity resolution';
    } else if (fLower.includes('role') || fLower.includes('permission') || fLower.includes('admin') || cLower.includes('accounttype') || cLower.includes('role')) {
      cat = 'C_Authorization';
      criticality = 'HIGH';
      purpose = 'Role-based access control, account type check, or authorization guard';
    } else if (fLower.includes('migration') || fLower.includes('sync') || fLower.includes('legacy') || fLower.includes('cleanup') || fLower.includes('backfill')) {
      cat = 'E_Legacy_Migration';
      criticality = 'LOW';
      purpose = 'Historical migration, backfill, or data correction script';
    } else if (fLower.includes('profile') || fLower.includes('avatar') || fLower.includes('displayname') || cLower.includes('full_name') || cLower.includes('email')) {
      cat = 'B_Profile';
      criticality = 'HIGH';
      purpose = 'User profile data retrieval or display details';
    } else {
      cat = 'D_Business_Entity';
      criticality = 'MEDIUM';
      purpose = 'Entity relationship lookup or business data query';
    }

    categorized[cat].push({
      file,
      lineNum: item.lineNum,
      lineText: item.lineText,
      purpose,
      criticality
    });
  }
}

console.log('\n--- USAGE BREAKDOWN BY CATEGORY ---');
console.log(`A - Authentication / Identity: ${categorized.A_Auth_Identity.length}`);
console.log(`B - Profile: ${categorized.B_Profile.length}`);
console.log(`C - Authorization: ${categorized.C_Authorization.length}`);
console.log(`D - Business Entity: ${categorized.D_Business_Entity.length}`);
console.log(`E - Legacy / Migration: ${categorized.E_Legacy_Migration.length}`);

// Print critical files
console.log('\n--- KEY FILES IN AUTHENTICATION / IDENTITY ---');
const authFiles = new Set(categorized.A_Auth_Identity.map(x => x.file));
authFiles.forEach(f => console.log(' - ' + f));

fs.writeFileSync('scratch/users-categorized.json', JSON.stringify({ summary: {
  A: categorized.A_Auth_Identity.length,
  B: categorized.B_Profile.length,
  C: categorized.C_Authorization.length,
  D: categorized.D_Business_Entity.length,
  E: categorized.E_Legacy_Migration.length
}, categorized }, null, 2), 'utf8');
console.log('✅ Saved scratch/users-categorized.json');
