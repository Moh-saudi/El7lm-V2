// سكريبت تشخيص البيئة - للتحقق من إعدادات Firebase
require('dotenv').config({ path: '.env.local' });

console.log('🔍 فحص إعدادات البيئة...\n');

// فحص متغيرات Firebase Admin SDK
console.log('📋 Firebase Admin SDK Variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing');

// فحص متغيرات Firebase Config (Frontend)
console.log('\n📋 Firebase Config Variables (Frontend):');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_FIREBASE_APP_ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing');

// فحص إعدادات أخرى
console.log('\n📋 Other Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// التحقق من صحة Private Key
if (process.env.FIREBASE_PRIVATE_KEY) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const hasValidFormat = privateKey.includes('-----BEGIN PRIVATE KEY-----') && 
                        privateKey.includes('-----END PRIVATE KEY-----');
  console.log('FIREBASE_PRIVATE_KEY format:', hasValidFormat ? '✅ Valid' : '❌ Invalid');
}

console.log('\n🔍 Environment Check Complete!');
console.log('\n💡 إذا كانت هناك متغيرات مفقودة، تأكد من:');
console.log('1. وجود ملف .env.local في المجلد الجذر');
console.log('2. صحة قيم المتغيرات البيئية');
console.log('3. إعادة تشغيل الخادم بعد تحديث المتغيرات'); 
