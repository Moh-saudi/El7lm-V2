import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';

// Generate a short, unique token
function generateShortToken(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
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

        // Check if user exists in Firebase Auth
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return NextResponse.json(
                    { success: false, error: 'لا توجد حساب مسجل بهذا البريد الإلكتروني' },
                    { status: 404 }
                );
            }
            throw error;
        }

        // Generate short token
        const token = generateShortToken();
        const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

        // Store token in Firestore
        await adminDb.collection('passwordResetTokens').doc(token).set({
            email: email,
            userId: userRecord.uid,
            createdAt: Date.now(),
            expiresAt: expiresAt,
            used: false
        });

        // Create reset link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

        // Send beautiful email (we'll use a service or custom SMTP)
        // For now, we'll use Firebase's sendPasswordResetEmail as fallback
        // but with custom redirect URL

        // Note: We can integrate SendGrid, Resend, or any email service here
        // For now, let's create the email content structure

        const emailContent = {
            to: email,
            subject: '🔐 إعادة تعيين كلمة المرور - منصة الحلم',
            resetLink: resetLink,
            token: token,
            expiresIn: '60 دقيقة'
        };

        // TODO: Integrate with email service (SendGrid/Resend)
        // For now, we'll return the link to be sent via Firebase or custom service

        return NextResponse.json({
            success: true,
            resetLink: resetLink,
            token: token,
            expiresAt: expiresAt,
            message: 'تم إنشاء رابط إعادة التعيين بنجاح'
        });

    } catch (error: any) {
        console.error('Generate reset link error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate reset link' },
            { status: 500 }
        );
    }
}
