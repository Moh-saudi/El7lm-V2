// ملف تشخيص - نسخة محسّنة (مهاجر من Firebase إلى Supabase)
export function debugFirebaseConfig() {
  // فحص صامت - رسالة مختصرة فقط في وضع التطوير
  if (process.env.NODE_ENV === 'development') {
    // فحص سريع للخدمات الأساسية
    const hasApiKey = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const hasProjectId = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!hasApiKey || !hasProjectId) {
      console.error('❌ Firebase configuration incomplete');
      return;
    }

    try {
      const { auth, db } = require('./config');
      const authReady = !!auth;
      const dbReady = !!db;

      console.log(`🔥 Firebase: Auth ${authReady ? '✅' : '❌'} | DB ${dbReady ? '✅' : '❌'} | Ready`);
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// دالة لفحص الاتصال بـ Supabase
export async function testFirebaseConnection() {
  try {
    const { auth, db } = require('./config');

    console.log('Testing connection...');

    // اختبار Auth
    if (auth) {
      console.log('✅ Auth service is available');
    } else {
      console.log('❌ Auth service failed');
    }

    // اختبار DB
    if (db) {
      console.log('✅ DB service is available');

      // محاولة قراءة
      try {
        const testDoc = await db.collection('test').doc('test').get();
        console.log('✅ DB read test passed');
      } catch (error) {
        console.log('⚠️ DB read test failed (this might be normal):', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      console.log('❌ DB service failed');
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}
