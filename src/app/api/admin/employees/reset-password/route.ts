
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    try {
        if (!adminAuth) {
            return NextResponse.json(
                { error: 'Firebase Admin not initialized' },
                { status: 500 }
            );
        }

        // 1. التحقق من التوكن (حماية المسار)
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            // تحقق إضافي أن الطالب هو Admin فعلاً
            // if (!decodedToken.role && decodedToken.accountType !== 'admin') ...
        } catch (e) {
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }

        const body = await req.json();
        const { uid, newPassword } = body;

        if (!uid || !newPassword) {
            return NextResponse.json({ error: 'Missing uid or newPassword' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // 2. تحديث كلمة المرور في Firebase Auth
        await adminAuth.updateUser(uid, {
            password: newPassword
        });

        // (اختياري) يمكن إجبار المستخدم على تسجيل الخروج من كل الأجهزة
        // await adminAuth.revokeRefreshTokens(uid);

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error: any) {
        console.error('Error resetting password:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
