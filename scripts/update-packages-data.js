const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('❌ Missing Firebase credentials in .env.local');
    process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        console.log('✅ Firebase Admin initialized');
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error);
        process.exit(1);
    }
}

const db = admin.firestore();

const plansToUpdate = [
    {
        id: 'subscription_3months',
        data: {
            title: 'باقة الانطلاقة (The Kickoff)',
            subtitle: 'للتجربة والبداية',
            period: '3 شهور',
            base_currency: 'USD',
            base_original_price: 30,
            base_price: 20,
            features: [
                'ملف رياضي موثق وعلامة "لاعب نشط"',
                'مساحة تخزين تصل إلى 5 فيديوهات مهارات HD',
                'إضافة الإحصائيات الأساسية (الطول، الوزن، المراكز)',
                'الظهور في نتائج البحث العامة للأندية والوكلاء',
                'إمكانية رفع وتحديث السجل الطبي الأساسي'
            ],
            bonusFeatures: [],
            popular: false,
            icon: '📅',
            color: 'blue',
            isActive: true,
            order: 1,
            updatedAt: new Date()
        }
    },
    {
        id: 'subscription_6months',
        data: {
            title: 'باقة الاحتراف (The Pro)',
            subtitle: 'الخيار الأذكى',
            period: '6 شهور',
            base_currency: 'USD',
            base_original_price: 55,
            base_price: 35,
            features: [
                'ملف رياضي موثق وعلامة "لاعب نشط"',
                'مساحة تخزين تصل إلى 5 فيديوهات مهارات HD',
                'إضافة الإحصائيات الأساسية (الطول، الوزن، المراكز)',
                'الظهور في نتائج البحث العامة للأندية والوكلاء',
                'إمكانية رفع وتحديث السجل الطبي الأساسي',
                'أولوية الظهور في مقدمة نتائج البحث للوكلاء',
                'تحليلات أداء ذكية ورسوم بيانية تفاعلية للنقاط القوية',
                'تنبيهات فورية عند قيام كشاف أو نادي بزيارة ملفك',
                'معرض صور احترافي للمباريات والتدريبات الرسمية',
                'دعم فني مخصص مع أولوية في الرد على الاستفسارات'
            ],
            bonusFeatures: [],
            popular: true,
            icon: '👑',
            color: 'purple',
            isActive: true,
            order: 2,
            updatedAt: new Date()
        }
    },
    {
        id: 'subscription_annual',
        data: {
            title: 'باقة الحلم (The Dream)',
            subtitle: 'أفضل قيمة وتوفير',
            period: '12 شهر',
            base_currency: 'USD',
            base_original_price: 80,
            base_price: 50,
            features: [
                'ملف رياضي موثق وعلامة "لاعب نشط"',
                'مساحة تخزين تصل إلى 5 فيديوهات مهارات HD',
                'إضافة الإحصائيات الأساسية (الطول، الوزن، المراكز)',
                'الظهور في نتائج البحث العامة للأندية والوكلاء',
                'إمكانية رفع وتحديث السجل الطبي الأساسي',
                'أولوية الظهور في مقدمة نتائج البحث للوكلاء',
                'تحليلات أداء ذكية ورسوم بيانية تفاعلية للنقاط القوية',
                'تنبيهات فورية عند قيام كشاف أو نادي بزيارة ملفك',
                'معرض صور احترافي للمباريات والتدريبات الرسمية',
                'دعم فني مخصص مع أولوية في الرد على الاستفسارات',
                'ظهور مميز في قسم "مواهب الأسبوع" بالصفحة الرئيسية',
                'خاصية التواصل المباشر وإرسال السيرة الذاتية للوكلاء',
                'خدمة مونتاج فيديو "أفضل المهارات" بشكل احترافي',
                'أولوية التسجيل وحجز المقاعد في تجارب الأداء الواقعية',
                'شارة "نخبة الحلم" الذهبية لتمييز الملف أمام الكشافين',
                'تقرير تقييم نصف سنوي مفصل مدعوم بالذكاء الاصطناعي'
            ],
            bonusFeatures: [],
            popular: false,
            icon: '⭐',
            color: 'emerald',
            isActive: true,
            order: 3,
            updatedAt: new Date()
        }
    }
];

async function updatePlans() {
    console.log('🔄 Starting plans update...');
    try {
        for (const plan of plansToUpdate) {
            console.log(`Updating ${plan.id}...`);
            await db.collection('subscription_plans').doc(plan.id).set(plan.data, { merge: true });
        }
        console.log('✅ All plans updated successfully!');
    } catch (error) {
        console.error('❌ Error updating plans:', error);
    }
}

updatePlans();
