import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';

// Generate a short, unique token
function generateShortToken(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
}

export async function POST(request: NextRequest) {
    try {
        let { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        // Convert to lowercase to avoid case-sensitivity issues
        email = email.toLowerCase().trim();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Check if user exists in Firebase Auth
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
            console.log('✅ [generate-reset-link] User found in Firebase Auth:', email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log('⚠️ [generate-reset-link] User not found in Firebase Auth:', email);
                return NextResponse.json(
                    { success: false, error: 'لا توجد حساب مسجل بهذا البريد الإلكتروني' },
                    { status: 404 }
                );
            }
            throw error;
        }

        // ADDITIONAL CHECK: Verify user exists in Firestore
        console.log('🔍 [generate-reset-link] Checking Firestore for email:', email);
        const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'employees'];
        let foundInFirestore = false;
        let userCollection = '';
        let userDoc: any = null;

        for (const coll of collections) {
            try {
                const snapshot = await adminDb
                    .collection(coll)
                    .where('email', '==', email)
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    foundInFirestore = true;
                    userCollection = coll;
                    userDoc = snapshot.docs[0].data();
                    console.log(`✅ [generate-reset-link] User found in Firestore collection: ${coll}`);
                    break;
                }
            } catch (err) {
                console.warn(`⚠️ [generate-reset-link] Could not search in ${coll}:`, err);
            }
        }

        if (!foundInFirestore) {
            console.error('❌ [generate-reset-link] User found in Auth but NOT in Firestore!');
            return NextResponse.json({
                success: false,
                error: 'الحساب غير مكتمل في نظامنا. يرجى التواصل مع خدمة العملاء\n\n💬 قطر (واتساب): +974 7054 2458\n💬 مصر: +20 101 779 9580\n✉️ info@el7lm.com',
                needsSupport: true
            }, { status: 404 });
        }

        // Generate short token
        const token = generateShortToken();
        const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

        // Store token in Firestore
        await adminDb.collection('passwordResetTokens').doc(token).set({
            email: email,
            userId: userRecord.uid,
            collection: userCollection,
            createdAt: Date.now(),
            expiresAt: expiresAt,
            used: false
        });

        console.log('✅ [generate-reset-link] Token created:', token);

        // Create reset link - use production domain if available
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://el7lm.com';
        const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

        let emailSent = false;
        let resendError = null;

        try {
            const { sendEmail } = await import('@/lib/email/sender');

            const { generatePasswordResetEmail, generatePasswordResetPlainText } = await import('@/lib/email/templates/password-reset');

            const userName = userDoc?.full_name || userDoc?.name || 'المستخدم';

            const emailHtml = generatePasswordResetEmail({
                userName: userName,
                resetLink: resetLink,
                token: token,
                expiresIn: '60 دقيقة'
            });

            const emailText = generatePasswordResetPlainText({
                userName: userName,
                resetLink: resetLink,
                token: token,
                expiresIn: '60 دقيقة'
            });

            const result = await sendEmail({
                to: email,
                subject: '🔐 إعادة تعيين كلمة المرور - منصة الحلم',
                html: emailHtml,
                text: emailText,
                type: 'password-reset',
                userId: userRecord.uid,
                userName: userName,
                metadata: { token, collection: userCollection }
            });

            if (!result.success) {
                console.error('❌ [generate-reset-link] Send error:', result.error);
                resendError = result.error;
            } else {
                console.log('✅ [generate-reset-link] Email sent successfully:', result.id);
                emailSent = true;
            }
        } catch (err: any) {
            console.error('❌ [generate-reset-link] Critical Email Error:', err.message);
            resendError = { message: err.message };
        }

        return NextResponse.json({
            success: true,
            emailSent,
            resendError,
            resetLink: resetLink,
            token: token,
            expiresAt: expiresAt,
            message: emailSent ? 'تم إرسال رابط إعادة التعيين بنجاح' : 'تم إنشاء الرابط ولكن فشل الإرسال التلقائي'
        });

    } catch (error: any) {
        console.error('Generate reset link error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate reset link' },
            { status: 500 }
        );
    }
}
