// أداة تشخيص نوع الحساب
import { supabase } from '@/lib/supabase/config';
import { AccountType } from '../types/common';

export interface AccountDebugInfo {
  uid: string;
  email: string;
  foundInUsers: boolean;
  usersData?: Record<string, unknown>;
  foundInCollections: string[];
  collectionsData: Record<string, Record<string, unknown>>;
  detectedAccountType?: AccountType;
  recommendedAction: string;
}

export async function debugAccountType(uid: string, email: string): Promise<AccountDebugInfo> {
  const debugInfo: AccountDebugInfo = {
    uid,
    email,
    foundInUsers: false,
    foundInCollections: [],
    collectionsData: {},
    recommendedAction: ''
  };

  try {
    // فحص users table
    console.log('🔍 Checking users table...');
    const { data: userData } = await supabase.from('users').select('*').eq('id', uid).limit(1);

    if (userData?.length) {
      debugInfo.foundInUsers = true;
      debugInfo.usersData = userData[0] as Record<string, unknown>;
      debugInfo.detectedAccountType = (userData[0] as Record<string, unknown>).accountType as AccountType;
      console.log('✅ Found in users table:', userData[0]);
    } else {
      console.log('❌ Not found in users table');
    }

    // فحص role-specific tables
    const tables: Array<{ name: string; accountType: AccountType }> = [
      { name: 'clubs', accountType: 'club' },
      { name: 'academies', accountType: 'academy' },
      { name: 'trainers', accountType: 'trainer' },
      { name: 'agents', accountType: 'agent' },
      { name: 'players', accountType: 'player' }
    ];

    for (const table of tables) {
      console.log(`🔍 Checking ${table.name} table...`);
      const { data } = await supabase.from(table.name).select('*').eq('id', uid).limit(1);

      if (data?.length) {
        debugInfo.foundInCollections.push(table.name);
        debugInfo.collectionsData[table.name] = data[0] as Record<string, unknown>;

        if (!debugInfo.detectedAccountType) {
          debugInfo.detectedAccountType = table.accountType;
        }

        console.log(`✅ Found in ${table.name}:`, data[0]);
      } else {
        console.log(`❌ Not found in ${table.name}`);
      }
    }

    // تحديد الإجراء المقترح
    if (debugInfo.foundInUsers && debugInfo.foundInCollections.length > 0) {
      debugInfo.recommendedAction = 'Account properly configured';
    } else if (!debugInfo.foundInUsers && debugInfo.foundInCollections.length > 0) {
      debugInfo.recommendedAction = `Create users row with accountType: ${debugInfo.detectedAccountType}`;
    } else if (debugInfo.foundInUsers && debugInfo.foundInCollections.length === 0) {
      debugInfo.recommendedAction = `Create role row in ${debugInfo.detectedAccountType}s table`;
    } else {
      debugInfo.recommendedAction = 'Account needs complete setup';
    }

    return debugInfo;

  } catch (error) {
    console.error('Error debugging account type:', error);
    debugInfo.recommendedAction = `Error occurred: ${error instanceof Error ? error.message : String(error)}`;
    return debugInfo;
  }
}

// دالة للتحقق من المستخدم الحالي
export async function debugCurrentUser(): Promise<void> {
  if (typeof window === 'undefined') return;

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    console.log('🔍 === Account Type Debug Info ===');
    const debugInfo = await debugAccountType(user.id, user.email || '');
    console.table(debugInfo);
    console.log('📋 Recommended Action:', debugInfo.recommendedAction);
    console.log('=================================');

    (window as Window & { accountDebugInfo?: AccountDebugInfo }).accountDebugInfo = debugInfo;
    console.log('💡 Access debug info via: window.accountDebugInfo');
  }
}

// تفعيل التشخيص في بيئة التطوير
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as Window & {
    debugAccountType?: typeof debugAccountType;
    debugCurrentUser?: typeof debugCurrentUser;
  }).debugAccountType = debugAccountType;
  (window as Window & {
    debugAccountType?: typeof debugAccountType;
    debugCurrentUser?: typeof debugCurrentUser;
  }).debugCurrentUser = debugCurrentUser;

  console.log('🛠️ Account debugging tools available:');
  console.log('   window.debugAccountType(uid, email)');
  console.log('   window.debugCurrentUser()');
}
