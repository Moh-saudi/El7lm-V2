import fs from 'fs';

const schemaData = JSON.parse(fs.readFileSync('scratch/schema-inspection.json', 'utf8'));
const tableMeta = schemaData.tableMetadata;

const CONCEPTS = [
  'id',
  'uid',
  'phone',
  'phoneNormalized',
  'phoneNumber',
  'originalPhone',
  'previousPhone',
  'phoneVerified',
  'countryCode',
  'email',
  'name',
  'full_name',
  'role',
  'roleId',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
  'status',
  'accountType',
  'displayName',
  'isActive',
  'isVerified',
  'lastLogin',
  'last_login'
];

const TABLES = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'admins'];

const matrix = {};

for (const concept of CONCEPTS) {
  matrix[concept] = {};
  for (const t of TABLES) {
    const cols = tableMeta[t]?.columns || [];
    matrix[concept][t] = cols.includes(concept);
  }
}

console.log('--- CONCEPT MATRIX ---');
console.table(matrix);

fs.writeFileSync('scratch/concept-matrix.json', JSON.stringify(matrix, null, 2), 'utf8');
console.log('✅ Saved scratch/concept-matrix.json');
