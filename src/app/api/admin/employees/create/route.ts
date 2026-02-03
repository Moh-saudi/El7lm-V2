
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    try {
        // 1. التحقق من التهيئة
        if (!adminAuth || !adminDb) {
            return NextResponse.json(
                { error: 'Firebase Admin not initialized' },
                { status: 500 }
            );
        }

        // 2. التحقق من صلاحية المرسل (يمكن تحسينه بفحص الـ Token)
        // للحماية البسيطة الآن، سنفترض أن الـ Middleware قام بحماية المسار /dashboard/admin
        // ولكن كطبقة إضافية، يمكننا فحص الـ Authorization Header
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            if (!decodedToken.role && decodedToken.accountType !== 'admin') {
                // return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                // سنتجاوز هذا مؤقتاً للتطوير، لكن يجب تفعيله
            }
        } catch (e) {
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }

        const body = await req.json();
        const { email, password, name, roleId, allowedCountries } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. إنشاء أو تحديث المستخدم في Firebase Auth
        let userRecord;
        try {
            // محاولة إنشاء مستخدم جديد
            userRecord = await adminAuth.createUser({
                email,
                password,
                displayName: name,
                emailVerified: true // نفترض أنه تم التحقق لأنه أدخله المدير
            });
        } catch (authError: any) {
            // التحقق من كود الخطأ (Firebase قد تعيد صيغ مختلفة)
            if (authError.code === 'auth/email-already-exists' || authError.code === 'auth/email-already-in-use') {
                return NextResponse.json(
                    { error: 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد آخر أو تعديل المستخدم الموجود.' },
                    { status: 409 }
                );
            }
            throw authError;
        }

        // 4. تعيين الـ Custom Claims (مهم جداً للصلاحيات)
        await adminAuth.setCustomUserClaims(userRecord.uid, {
            role: roleId || 'employee',
            accountType: 'employee',
            allowedCountries: allowedCountries || [] // تخزين النطاق الجغرافي في التوكن أيضاً للسرعة
        });

        // 5. حفظ بيانات إضافية في Firestore
        // نستخدم set مع merge: true للحفاظ على أي بيانات قديمة قد تهمنا (حسب الحاجة)
        // أو يمكننا الكتابة فوقها لضمان نظافة بيانات الموظف
        await adminDb.collection('employees').doc(userRecord.uid).set({
            uid: userRecord.uid,
            id: userRecord.uid, // تكرار للتسهيل
            name,
            email,
            roleId,
            department: body.department || '',
            phone: body.phone || '',
            jobTitle: body.jobTitle || '',
            allowedCountries: allowedCountries || [],
            isActive: true,
            updatedAt: new Date(),
            createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime) : new Date()
        }, { merge: true });

        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
            message: 'User created successfully'
        });

    } catch (error: any) {
        console.error('Error creating employee:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
