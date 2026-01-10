import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { sendEmail, EmailType } from '@/lib/email/sender';

// Basic Auth check helper
async function verifyAdmin(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        // Add more rigorous admin check if roles are implemented
        return true;
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    // 1. Verify Admin (Commented out as per previous instruction)
    // const isAdmin = await verifyAdmin(request);
    // if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        let { to, subject, html, type, text, template } = body;

        // Validate required fields (HTML/Subject optional if template used)
        if (!to || (!template && (!subject || !html))) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Handle System Templates
        if (template) {
            type = template === 'verification' ? 'verification' : 'password-reset';

            if (template === 'verification') {
                const { generateVerificationEmail, generateVerificationEmailText } = await import('@/lib/email/templates/verification');
                html = generateVerificationEmail({
                    userName: 'تجربة المسؤول',
                    otpCode: '123456',
                    expiresIn: '30 دقيقة'
                });
                text = generateVerificationEmailText({
                    userName: 'تجربة المسؤول',
                    otpCode: '123456',
                    expiresIn: '30 دقيقة'
                });
                subject = '🔐 (تجربة) رمز التحقق - منصة الحلم';
            }
            else if (template === 'password-reset') {
                const { generatePasswordResetEmail, generatePasswordResetPlainText } = await import('@/lib/email/templates/password-reset');
                html = generatePasswordResetEmail({
                    userName: 'تجربة المسؤول',
                    resetLink: 'https://el7lm.com/auth/reset-password?token=TEST-TOKEN',
                    token: 'TEST-TOKEN',
                    expiresIn: '60 دقيقة'
                });
                text = generatePasswordResetPlainText({
                    userName: 'تجربة المسؤول',
                    resetLink: 'https://el7lm.com/auth/reset-password?token=TEST-TOKEN',
                    token: 'TEST-TOKEN',
                    expiresIn: '60 دقيقة'
                });
                subject = '🔐 (تجربة) إعادة تعيين كلمة المرور';
            }
        }

        // Validate type
        const validTypes: EmailType[] = ['notification', 'system', 'marketing', 'welcome', 'verification', 'password-reset'];
        const emailType = validTypes.includes(type) ? type : 'system';

        const result = await sendEmail({
            to,
            subject,
            html,
            text,
            type: emailType,
            userName: 'Admin Manual Send',
            metadata: { source: 'admin-dashboard', isTest: true, template }
        });

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: result.id });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
