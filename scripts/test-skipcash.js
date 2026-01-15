const https = require('https');
const crypto = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Try to load .env.local
try {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
} catch (e) {
    console.log('Note: dotenv not found or .env.local missing, relying on system env vars.');
}

const secretKey = process.env.SKIPCASH_SECRET_KEY;
const keyId = process.env.SKIPCASH_KEY_ID;
const clientId = process.env.SKIPCASH_CLIENT_ID;
const mode = process.env.SKIPCASH_MODE || 'test';
const baseUrl = mode === 'live' ? 'https://api.skipcash.app' : 'https://skipcashtest.azurewebsites.net';

console.log('\n--- 🧪 SkipCash Connectivity Test ---');
console.log(`Environment: ${mode}`);
console.log(`Base URL:    ${baseUrl}`);
console.log(`Key ID:      ${keyId ? '✅ Found' : '❌ MISSING'}`);
console.log(`Client ID:   ${clientId ? '✅ Found' : '❌ MISSING'}`);
console.log(`Secret Key:  ${secretKey ? `✅ Found (Ends with ...${secretKey.slice(-4)})` : '❌ MISSING'}`);

if (!secretKey || !keyId) {
    console.error('\n❌ CRITICAL: Cannot proceed without credentials.');
    console.error('Please ensure you have added SKIPCASH_SECRET_KEY and SKIPCASH_KEY_ID to your .env.local file.');
    process.exit(1);
}

// Prepare Test Data
const uid = uuidv4();
const amount = "10.00";
const phone = "12345678";
const data = {
    Uid: uid,
    KeyId: keyId,
    Amount: amount,
    FirstName: "Test",
    LastName: "User",
    Phone: phone,
    Email: "test@example.com",
    Street: "Test St",
    City: "Doha",
    State: "QA",
    Country: "QA",
    PostalCode: "00000",
    TransactionId: `TEST-${Date.now()}`,
    Custom1: "IntegrationTest",
    ReturnUrl: "http://localhost:3000/payment/success"
};

console.log('\n📝 Generating Signature for:', data.TransactionId);

// Construct Signature String - Order is Critical
const dataString = `Uid=${data.Uid},KeyId=${data.KeyId},Amount=${data.Amount},FirstName=${data.FirstName},LastName=${data.LastName},Phone=${data.Phone},Email=${data.Email},Street=${data.Street},City=${data.City},State=${data.State},Country=${data.Country},PostalCode=${data.PostalCode},TransactionId=${data.TransactionId},Custom1=${data.Custom1}`;

const signature = crypto.HmacSHA256(dataString, secretKey);
const authorization = crypto.enc.Base64.stringify(signature);

console.log('🔐 Signature generated.');

// Make Request
const url = new URL(`${baseUrl}/api/v1/payments`);
const options = {
    method: 'POST',
    headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json'
    }
};

console.log('\n🚀 Sending Request to SkipCash...');

const req = https.request(url, options, (res) => {
    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        console.log(`\n📨 Response Status: ${res.statusCode}`);
        try {
            const json = JSON.parse(responseBody);
            console.log('📦 Response Body:', JSON.stringify(json, null, 2));

            if (res.statusCode === 200 && json.returnCode === 200) {
                console.log('\n✅ SUCCESS! Integration is working correctly.');
                console.log(`🔗 Payment URL: ${json.resultObj.payUrl}`);
            } else {
                console.log('\n❌ FAILED. Please check the error message above.');
                if (res.statusCode === 401) {
                    console.log('👉 Tip: 401 usually means the Secret Key is incorrect or the Signature format is wrong.');
                }
            }
        } catch (e) {
            console.log('Raw Response:', responseBody);
        }
    });
});

req.on('error', (e) => {
    console.error(`\n❌ Network Error: ${e.message}`);
});

req.write(JSON.stringify(data));
req.end();
