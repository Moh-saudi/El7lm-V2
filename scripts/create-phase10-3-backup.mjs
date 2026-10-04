import fs from 'fs';
import path from 'path';

// Load pre-phase10 complete backup and Phase 10.2 manifest
const manifestData = JSON.parse(fs.readFileSync('docs/review/phase10-2-final-commit-manifest.json', 'utf8'));
const fullBackup = JSON.parse(fs.readFileSync('docs/review/backup_users_pre_phase10_20260925.json', 'utf8'));

const fullBackupMap = new Map();
for (const r of fullBackup.records) {
  fullBackupMap.set(r.id, r);
}

// Find only the affected accounts (where at least one field is proposed for update)
const affectedManifest = manifestData.manifest.filter(m => m.new_supabase_uid !== null || m.new_phone_e164 !== null || m.new_country_code !== null);
console.log(`Total affected accounts in manifest: ${affectedManifest.length}`);

const backupRecords = [];
for (const m of affectedManifest) {
  const original = fullBackupMap.get(m.id);
  if (!original) {
    console.error(`WARNING: User ID ${m.id} not found in full backup!`);
    continue;
  }

  backupRecords.push({
    id: original.id,
    uid: original.uid,
    phone: original.phone || null,
    phoneNormalized: original.phoneNormalized || null,
    phone_e164: original.phone_e164 || null,
    country_code: original.country_code || null,
    supabase_uid: original.supabase_uid || null,
    accountType: original.accountType || null,
    isActive: original.isActive !== undefined ? original.isActive : null,
    isVerified: original.isVerified !== undefined ? original.isVerified : null,
    proposed_new_supabase_uid: m.new_supabase_uid,
    proposed_new_phone_e164: m.new_phone_e164,
    proposed_new_country_code: m.new_country_code
  });
}

const backupPayload = {
  metadata: {
    phase: 'Phase 10.3 — Canonical Identity Population Pre-Update Snapshot',
    timestamp: new Date().toISOString(),
    totalAffectedAccounts: backupRecords.length,
    criteria: 'Snapshot of only the accounts targeted for update in Phase 10.3'
  },
  records: backupRecords
};

const backupPath = 'docs/review/phase10-3-population-backup.json';
fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));
console.log(`✅ Saved ${backupPath} (${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB, ${backupRecords.length} records)`);
