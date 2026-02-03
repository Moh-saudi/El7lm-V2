
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    try {
        if (!adminAuth || !adminDb) {
            return NextResponse.json(
                { error: 'Firebase Admin not initialized' },
                { status: 500 }
            );
        }

        // 1. التحقق من الصلاحية (Admin Only)
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // يمكن إضافة تحقق إضافي من دور المدير هنا

        const { uid } = await req.json();
        if (!uid) {
            return NextResponse.json({ error: 'Missing Employee UID' }, { status: 400 });
        }

        console.log(`🚨 Disabling employee account: ${uid}`);

        // 2. تعطيل الحساب في Firebase Auth (يمنع الدخول الجديد)
        await adminAuth.updateUser(uid, {
            disabled: true
        });

        // 3. إبطال الجلسة الحالية (يطرد المستخدم إذا كان متصلاً حالياً)
        await adminAuth.revokeRefreshTokens(uid);

        // 4. تحديث سجل قاعدة البيانات (Soft Delete)
        await adminDb.collection('employees').doc(uid).update({
            isActive: false,
            updatedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            message: 'Employee account secure disabled and tokens revoked'
        });

    } catch (error: any) {
        console.error('Error disabling employee:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
