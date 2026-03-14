const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env variables
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

// Ensure you're using the service_role key to bypass RLS and create users
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function migrateAuth() {
  const accountsPath = path.resolve(process.cwd(), 'accounts.json');
  if (!fs.existsSync(accountsPath)) {
    console.error('❌ accounts.json not found! Run firebase auth:export first.');
    process.exit(1);
  }

  const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
  const users = accountsData.users || [];
  
  console.log(`🚀 Found ${users.length} users in accounts.json. Starting migration...`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    if (!user.email && !user.phoneNumber) {
        console.log(`⚠️ Skipping user ${user.localId} - no email or phone`);
        continue;
    }

    try {
      // Supabase admin.createUser allows passing existing passwords and metadata
      // Since Firebase Scrypt is complex, if we pass the password_hash directly, 
      // Supabase might not understand the raw hash without an internal converter.
      // But Supabase provides a specific endpoint/method for bulk import, 
      // or we can use admin.createUser for individual transfers.
      
      const { data, error } = await supabase.auth.admin.createUser({
        uid: user.localId, // This might not work directly in all Supabase versions as it uses UUIDs normally
        email: user.email,
        phone: user.phoneNumber,
        email_confirm: user.emailVerified,
        user_metadata: {
          display_name: user.displayName,
          photo_url: user.photoUrl,
          imported_from_firebase: true,
          firebase_uid: user.localId
        }
      });

      if (error) {
          // Ignore "user already exists" errors if we ran this multiple times
          if (error.status === 422 && error.message.includes('already registered')) {
              successCount++;
          } else {
             console.error(`❌ Error migrating user ${user.email || user.phoneNumber}:`, error.message);
             errorCount++;
          }
      } else {
        successCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (e) {
        console.error(`❌ Exception migrating ${user.email || user.phoneNumber}:`, e.message);
        errorCount++;
    }
  }

  console.log('-----------------------------------');
  console.log(`✅ Migration Complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

migrateAuth();
