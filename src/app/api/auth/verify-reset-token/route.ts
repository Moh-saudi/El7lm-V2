import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { valid: false, error: 'Token is required' },
                { status: 400 }
            );
        }

        // Get token document from Firestore
        const tokenDoc = await adminDb.collection('passwordResetTokens').doc(token).get();

        if (!tokenDoc.exists) {
            return NextResponse.json({
                valid: false,
                error: 'الرابط غير صالح'
            });
        }

        const tokenData = tokenDoc.data();

        // Check if token is expired
        if (tokenData!.expiresAt < Date.now()) {
            return NextResponse.json({
                valid: false,
                error: 'انتهت صلاحية الرابط. يرجى طلب رابط جديد'
            });
        }

        // Check if token was already used
        if (tokenData!.used) {
            return NextResponse.json({
                valid: false,
                error: 'تم استخدام هذا الرابط من قبل'
            });
        }

        return NextResponse.json({
            valid: true,
            email: tokenData!.email,
            userId: tokenData!.userId
        });

    } catch (error: any) {
        console.error('Verify reset token error:', error);
        return NextResponse.json(
            { valid: false, error: error.message || 'Failed to verify token' },
            { status: 500 }
        );
    }
}
