import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Token and password are required' },
                { status: 400 }
            );
        }

        // Validate password
        if (newPassword.length < 8) {
            return NextResponse.json(
                { success: false, error: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' },
                { status: 400 }
            );
        }

        // Get and verify token
        const tokenDoc = await adminDb.collection('passwordResetTokens').doc(token).get();

        if (!tokenDoc.exists) {
            return NextResponse.json({
                success: false,
                error: 'الرابط غير صالح'
            }, { status: 404 });
        }

        const tokenData = tokenDoc.data();

        // Check expiry
        if (tokenData!.expiresAt < Date.now()) {
            return NextResponse.json({
                success: false,
                error: 'انتهت صلاحية الرابط'
            }, { status: 410 });
        }

        // Check if used
        if (tokenData!.used) {
            return NextResponse.json({
                success: false,
                error: 'تم استخدام هذا الرابط من قبل'
            }, { status: 410 });
        }

        // Update password in Firebase Auth
        await adminAuth.updateUser(tokenData!.userId, {
            password: newPassword
        });

        // Mark token as used
        await adminDb.collection('passwordResetTokens').doc(token).update({
            used: true,
            usedAt: Date.now()
        });

        // Also update in Firestore if needed (for phone-based users)
        // This ensures consistency across all systems
        try {
            const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
            for (const coll of collections) {
                const snapshot = await adminDb
                    .collection(coll)
                    .where('email', '==', tokenData!.email)
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    // Update last password change timestamp
                    await snapshot.docs[0].ref.update({
                        lastPasswordChange: Date.now()
                    });
                    break;
                }
            }
        } catch (err) {
            // Non-critical, just log
            console.log('Could not update last password change in Firestore:', err);
        }

        return NextResponse.json({
            success: true,
            message: 'تم تحديث كلمة المرور بنجاح'
        });

    } catch (error: any) {
        console.error('Use reset token error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to reset password' },
            { status: 500 }
        );
    }
}
