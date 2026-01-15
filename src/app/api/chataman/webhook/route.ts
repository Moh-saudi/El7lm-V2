import { NextRequest, NextResponse } from 'next/server';
import { ChatAmanService } from '@/lib/services/chataman-service';

// Webhook Verification (Commonly required by Meta/BSPs)
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // You might want to store a VERIFY_TOKEN in your env or config
    // For now, we will log and accept generic verifications if needed, 
    // or the user can configure a specific token.
    // Many custom BSPs valid verification just by returning the challenge.

    if (mode === 'subscribe' && challenge) {
        // Verify token here if you have one set
        console.log('ChatAman Webhook Verified');
        return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse('ChatAman Webhook Endpoint', { status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Log the raw incoming payload for debugging (essential for initial setup)
        console.log('------------------------------------------------');
        console.log('📥 ChatAman Webhook Received:', JSON.stringify(body, null, 2));
        console.log('------------------------------------------------');

        // Process the webhook event
        // We pass the entire body to the service to handle parsing logic
        const result = await ChatAmanService.handleWebhook(body);

        if (result.success) {
            return NextResponse.json({ status: 'success' }, { status: 200 });
        } else {
            // Even if we fail to process, we usually return 200 to the provider 
            // to stop them from retrying, unless it's a transient server error.
            // We logs the error internally.
            console.warn('⚠️ Webhook processed with warning:', result.error);
            return NextResponse.json({ status: 'received_with_warning' }, { status: 200 });
        }

    } catch (error: any) {
        console.error('❌ Error processing ChatAman webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
