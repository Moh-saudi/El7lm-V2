
import { NextRequest, NextResponse } from 'next/server';
import { createSkipCashPayment } from '@/lib/skipcash/client';
import { SkipCashPaymentRequest } from '@/lib/skipcash/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CreateSessionBody = {
    amount: number;
    customerEmail: string;
    customerPhone: string;
    customerName?: string;
    transactionId?: string;
    custom1?: string;
    returnUrl?: string; // Optional override
};

/**
 * POST - Create a new SkipCash payment session
 */
export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as CreateSessionBody;

        // Validate required fields
        if (!body?.amount || !body?.customerEmail || !body?.customerPhone) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields',
                    details: 'amount, customerEmail, and customerPhone are required',
                },
                { status: 400 }
            );
        }

        const paymentRequest: SkipCashPaymentRequest = {
            amount: body.amount,
            customerEmail: body.customerEmail,
            customerPhone: body.customerPhone,
            customerName: body.customerName,
            transactionId: body.transactionId,
            custom1: body.custom1,
            // Allow returnUrl override (e.g. for simulation) or dynamically determine it
            returnUrl: body.returnUrl || `${request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`
        };

        const result = await createSkipCashPayment(paymentRequest);

        if (result.returnCode !== 200) {
            console.error('❌ [SkipCash API] Payment creation failed:', JSON.stringify(result, null, 2));
            return NextResponse.json(
                {
                    success: false,
                    error: result.returnMessage || 'Failed to create payment session',
                    details: result, // Full result for better debugging
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            payUrl: result.resultObj.payUrl,
            paymentId: result.resultObj.paymentId,
            fullResult: result
        });
    } catch (error) {
        console.error('❌ [SkipCash API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
