import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        const { userId, userCollection, email } = await request.json();

        if (!userId || !userCollection || !email) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Update user's email in their collection
        await adminDb.collection(userCollection).doc(userId).set(
            { email },
            { merge: true }
        );

        // Also update in 'users' collection if not already there
        if (userCollection !== 'users') {
            await adminDb.collection('users').doc(userId).set(
                { email },
                { merge: true }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Update email error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update email' },
            { status: 500 }
        );
    }
}
