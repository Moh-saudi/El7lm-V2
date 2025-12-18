/**
 * اختبار مباشر لـ ChatAman API
 * نجرب endpoints مختلفة لإيجاد الصحيح
 */

const ACCESS_TOKEN = 'lmVt2Y62QMdZUp52JnkTeJNhgKERlCA92Oyv1aEh';

// قائمة بالـ Base URLs المحتملة
const possibleBaseUrls = [
    'https://chataman.com/api',
    'https://api.chataman.com',
    'https://chataman.com/api/v1',
    'https://chataman.com/api/v2',
    'https://app.chataman.com/api',
];

// قائمة بالـ endpoints المحتملة
const possibleEndpoints = [
    '/status',
    '/health',
    '/me',
    '/account',
    '/user',
    '/info',
];

async function testEndpoint(baseUrl: string, endpoint: string) {
    try {
        console.log(`\n🔍 اختبار: ${baseUrl}${endpoint}`);

        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        console.log(`   📊 Status: ${response.status} ${response.statusText}`);
        console.log(`   📋 Content-Type: ${response.headers.get('content-type')}`);

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            const data = await response.json();
            console.log(`   ✅ استجابة JSON:`, JSON.stringify(data, null, 2));
            return { success: true, baseUrl, endpoint, data };
        } else {
            const text = await response.text();
            console.log(`   ⚠️  استجابة نصية (أول 200 حرف):`, text.substring(0, 200));
            return { success: false, baseUrl, endpoint, error: 'Not JSON' };
        }
    } catch (error) {
        console.log(`   ❌ خطأ:`, error instanceof Error ? error.message : 'Unknown error');
        return { success: false, baseUrl, endpoint, error };
    }
}

async function findWorkingEndpoint() {
    console.log('🚀 بدء اختبار ChatAman API Endpoints...\n');
    console.log('='.repeat(60));

    const results = [];

    for (const baseUrl of possibleBaseUrls) {
        console.log(`\n📍 اختبار Base URL: ${baseUrl}`);
        console.log('-'.repeat(60));

        for (const endpoint of possibleEndpoints) {
            const result = await testEndpoint(baseUrl, endpoint);
            results.push(result);

            // انتظر قليلاً بين كل طلب
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ملخص النتائج:');
    console.log('='.repeat(60));

    const successfulResults = results.filter(r => r.success);

    if (successfulResults.length > 0) {
        console.log('\n✅ Endpoints التي نجحت:');
        successfulResults.forEach(r => {
            console.log(`   - ${r.baseUrl}${r.endpoint}`);
        });
    } else {
        console.log('\n❌ لم ينجح أي endpoint');
    }

    return results;
}

// تشغيل الاختبار
findWorkingEndpoint().then(results => {
    console.log('\n✅ انتهى الاختبار!');
    console.log(`📈 تم اختبار ${results.length} endpoint`);
    console.log(`✅ نجح ${results.filter(r => r.success).length} endpoint`);
}).catch(error => {
    console.error('❌ خطأ في الاختبار:', error);
});
