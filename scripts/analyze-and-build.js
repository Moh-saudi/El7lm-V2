const fs = require('fs');
const path = require('path');

const inputFile = path.resolve(process.cwd(), 'firebase_full_export.json');
const outputFile = path.resolve(process.cwd(), 'schema.sql');

async function run() {
    if (!fs.existsSync(inputFile)) {
        console.error('❌ File not found: ' + inputFile);
        process.exit(1);
    }

    console.log('⏳ Reading JSON export file (this might take a moment)...');
    const rawData = fs.readFileSync(inputFile, 'utf-8');
    const db = JSON.parse(rawData);

    console.log('🔍 Analyzing collections and inferring data types...');

    const tables = [];

    function inferType(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'boolean') return 'BOOLEAN';
        if (typeof value === 'number') {
            if (Number.isInteger(value)) return 'BIGINT';
            return 'DOUBLE PRECISION';
        }
        if (typeof value === 'string') {
            // Check if string is a valid ISO date (Timestamps were exported as ISO strings)
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) {
                return 'TIMESTAMP WITH TIME ZONE';
            }
            return 'TEXT';
        }
        if (Array.isArray(value)) return 'JSONB';
        if (typeof value === 'object') return 'JSONB';
        return 'TEXT';
    }

    for (const [collectionName, documents] of Object.entries(db)) {
        const columns = {};
        // All Firestore docs exported by our script have an 'id' field
        columns['id'] = 'TEXT PRIMARY KEY'; 

        if (documents && documents.length > 0) {
            // Check up to 1000 docs to infer types accurately and find optional fields
            const docsToAnalyze = documents.slice(0, 1000);
            
            for (const doc of docsToAnalyze) {
                for (const [key, value] of Object.entries(doc)) {
                    if (key === 'id') continue; // already set
                    
                    const inferredType = inferType(value);
                    
                    if (inferredType) {
                        if (columns[key] === 'BIGINT' && inferredType === 'DOUBLE PRECISION') {
                            columns[key] = 'DOUBLE PRECISION'; // Upgrade if fractional number is found later
                        } else if (!columns[key]) {
                            columns[key] = inferredType;
                        }
                    }
                }
            }
        }

        // Default any remaining nulls or missed inferences to TEXT
        for (const key of Object.keys(columns)) {
            if (!columns[key]) columns[key] = 'TEXT';
        }

        tables.push({ name: collectionName, columns });
    }

    console.log(`✍️ Generating SQL schema for ${tables.length} tables...`);
    let sql = '-- ==========================================\n';
    sql += '-- Auto-generated Supabase PostgreSQL Schema\n';
    sql += '-- Generated from Firebase Firestore Export\n';
    sql += '-- ==========================================\n\n';

    for (const table of tables) {
        sql += `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`;
        
        const colDefs = [];
        for (const [colName, colType] of Object.entries(table.columns)) {
            colDefs.push(`  "${colName}" ${colType}`);
        }
        
        sql += colDefs.join(',\n');
        sql += `\n);\n\n`;
    }

    fs.writeFileSync(outputFile, sql);
    console.log(`🎉 Schema successfully generated to: ${outputFile}`);
    console.log('💡 You can now copy the contents of schema.sql and paste it into the Supabase SQL Editor.');
}

run().catch(console.error);
