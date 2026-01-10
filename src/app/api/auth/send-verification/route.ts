import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email, name, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json(
                { success: false, error: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        // Import service
        const { sendEmail } = await import('@/lib/email/sender');

        // Import templates
        const { generateVerificationEmail, generateVerificationEmailText } = await import('@/lib/email/templates/verification');

        const emailHtml = generateVerificationEmail({
            userName: name || 'المستخدم',
            otpCode: otp,
            expiresIn: '30 دقيقة'
        });

        const emailText = generateVerificationEmailText({
            userName: name || 'المستخدم',
            otpCode: otp,
            expiresIn: '30 دقيقة'
        });

        const result = await sendEmail({
            to: email,
            subject: '🔐 رمز التحقق - منصة الحلم',
            html: emailHtml,
            text: emailText,
            type: 'verification',
            userName: name || 'المستخدم',
            metadata: { otp, source: 'registration' }
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error?.message || 'Failed to send email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Email sent successfully',
            id: result.id
        });

    } catch (error: any) {
        console.error('❌ API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
