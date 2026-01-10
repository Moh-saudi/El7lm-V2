
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/sender';
import { generateVerificationEmail, generateVerificationEmailText } from '@/lib/email/templates/verification';

export async function POST(request: NextRequest) {
    try {
        const { email, name } = await request.json();

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }

        console.log(` Generating verification link for: ${email}`);

        // Generate Firebase Verification Link
        // Note: This requires the service account to have permissions.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://el7lm.com';
        const actionCodeSettings = {
            url: `${baseUrl}/auth/login?verified=true`,
        };
        const verificationLink = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);

        // Generate content using the enhanced template
        const html = generateVerificationEmail({
            userName: name || 'User',
            verificationLink: verificationLink,
        });

        const text = generateVerificationEmailText({
            userName: name || 'User',
            verificationLink: verificationLink,
        });

        // Send Email via Resend
        const result = await sendEmail({
            to: email,
            subject: '✅ تفعيل حسابك في منصة الحلم',
            html,
            text,
            type: 'verification',
            userName: name,
            metadata: {
                isVerificationLink: true
            }
        });

        if (!result.success) {
            console.error('❌ Failed to send verification email via Resend:', result.error);
            return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
        }

        console.log('✅ Verification email sent successfully');
        return NextResponse.json({ success: true, id: result.id });

    } catch (error: any) {
        console.error('💥 Error generating verification link:', error);

        let errorMessage = 'Failed to generate verification link';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found in Firebase Auth';
        }

        return NextResponse.json({ success: false, error: errorMessage, originalError: error.message }, { status: 500 });
    }
}
