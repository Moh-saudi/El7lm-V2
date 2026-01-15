import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { skipCashConfig } from '@/lib/skipcash/config';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    try {
        console.log("🧪 Starting SkipCash Connectivity Test via API...");

        // 1. Check Credentials
        const missing: string[] = [];
        if (!skipCashConfig.keyId) missing.push('Key ID');
        if (!skipCashConfig.clientId) missing.push('Client ID');
        if (!skipCashConfig.secretKey) missing.push('Secret Key');

        if (missing.length > 0) {
            return NextResponse.json({
                success: false,
                message: `Missing credentials: ${missing.join(', ')}`,
                steps: [
                    { name: 'Check Credentials', status: 'failed', details: 'Missing keys in .env.local' }
                ]
            });
        }

        // 2. Prepare Test Data
        const transactionId = `TEST-API-${Date.now()}`;
        const amount = "10.00"; // String for matching
        const data = {
            Uid: uuidv4(),
            KeyId: skipCashConfig.keyId,
            Amount: amount,
            FirstName: "Test",
            LastName: "Admin",
            Phone: "12345678",
            Email: "admin@test.com",
            Street: "Doha",
            City: "Doha",
            State: "QA", // Corrected
            Country: "QA",
            PostalCode: "00000",
            TransactionId: transactionId,
            Custom1: "AdminConnectivityTest",
            ReturnUrl: "https://google.com" // Use a generic valid URL for testing
        };

        // 3. Generate Signature
        const dataString = `Uid=${data.Uid},KeyId=${data.KeyId},Amount=${data.Amount},FirstName=${data.FirstName},LastName=${data.LastName},Phone=${data.Phone},Email=${data.Email},Street=${data.Street},City=${data.City},State=${data.State},Country=${data.Country},PostalCode=${data.PostalCode},TransactionId=${data.TransactionId},Custom1=${data.Custom1}`;

        const signature = crypto.createHmac('sha256', skipCashConfig.secretKey)
            .update(dataString)
            .digest('base64');

        // 4. Send Request
        const baseUrl = skipCashConfig.productionUrl; // Config logic switches based on mode? 
        // Wait, skipCashConfig in src/lib/skipcash/config.ts usually has separate URLs.
        // Let's check how config handles mode. 
        // Usually it's: const baseUrl = process.env.SKIPCASH_MODE === 'live' ? ... : ...;
        // Re-reading logic from previous context: 
        const isLive = process.env.SKIPCASH_MODE === 'live';
        const urlProperty = isLive ? 'productionUrl' : 'sandboxUrl';
        const endpoint = `${skipCashConfig[urlProperty]}/api/v1/payments`;

        console.log(`🚀 Sending to: ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': signature
            },
            body: JSON.stringify(data)
        });

        const responseText = await response.text();
        let resultBody;
        try {
            resultBody = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error('Failed to parse response JSON:', responseText);
            return NextResponse.json({
                success: false,
                message: `Invalid JSON response from SkipCash (Status: ${response.status})`,
                details: responseText,
                steps: [
                    { name: 'API Request', status: 'failed', details: 'Invalid JSON received' }
                ]
            });
        }

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                message: `SkipCash API Error: ${response.status}`,
                details: resultBody,
                env: process.env.SKIPCASH_MODE,
                steps: [
                    { name: 'Credentials Check', status: 'success' },
                    { name: 'Signature Generation', status: 'success' },
                    { name: 'API Request', status: 'failed', details: resultBody.errorMessage || 'Unknown error' }
                ]
            });
        }

        if (resultBody.returnCode !== 200) {
            return NextResponse.json({
                success: false,
                message: `SkipCash Logical Error: ${resultBody.returnCode}`,
                details: resultBody,
                steps: [
                    { name: 'Credentials Check', status: 'success' },
                    { name: 'Signature Generation', status: 'success' },
                    { name: 'API Request', status: 'warning', details: 'Connected but returned error (e.g. data validation)' }
                ]
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully connected to SkipCash and created a test session.',
            data: resultBody.resultObj,
            steps: [
                { name: 'Credentials Check', status: 'success' },
                { name: 'Signature Generation', status: 'success' },
                { name: 'API Request', status: 'success' }
            ]
        });

    } catch (error: any) {
        console.error("❌ Test failed:", error);
        return NextResponse.json({
            success: false,
            message: 'Internal Server Error during test',
            details: error.message,
            steps: [
                { name: 'Internal Check', status: 'failed', details: error.message }
            ]
        });
    }
}
