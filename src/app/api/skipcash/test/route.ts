import { NextResponse } from 'next/server';
import { createSkipCashPayment } from '@/lib/skipcash/client';
import { skipCashConfig } from '@/lib/skipcash/config';

export async function GET() {
    try {
        const missing: string[] = [];
        if (!skipCashConfig.keyId) missing.push('Key ID');
        if (!skipCashConfig.clientId) missing.push('Client ID');
        if (!skipCashConfig.secretKey) missing.push('Secret Key');

        if (missing.length > 0) {
            return NextResponse.json({
                success: false,
                message: `Missing credentials: ${missing.join(', ')}`,
                steps: [
                    { name: 'Check Credentials', status: 'failed', details: 'Missing keys in .env.local' },
                ],
            });
        }

        const transactionId = `TEST-API-${Date.now()}`;
        const result = await createSkipCashPayment({
            amount: 10,
            customerEmail: 'admin@test.com',
            customerPhone: '+97412345678',
            customerName: 'Test Admin',
            transactionId,
            custom1: '',
        });

        if (result.returnCode !== 200) {
            return NextResponse.json({
                success: false,
                message: `SkipCash Logical Error: ${result.returnCode}`,
                details: result,
                env: process.env.SKIPCASH_MODE,
                steps: [
                    { name: 'Credentials Check', status: 'success' },
                    { name: 'Central Client Execution', status: 'success' },
                    {
                        name: 'API Request',
                        status: 'failed',
                        details:
                            result.returnMessage ||
                            (result as any).errorMessage ||
                            (result as any).error?.message ||
                            'Unknown error',
                    },
                ],
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully connected to SkipCash and created a test session.',
            data: result.resultObj,
            env: process.env.SKIPCASH_MODE,
            steps: [
                { name: 'Credentials Check', status: 'success' },
                { name: 'Central Client Execution', status: 'success' },
                { name: 'API Request', status: 'success' },
            ],
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: 'Internal Server Error during test',
            details: error.message,
            env: process.env.SKIPCASH_MODE,
            steps: [{ name: 'Internal Check', status: 'failed', details: error.message }],
        });
    }
}
