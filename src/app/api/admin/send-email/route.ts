import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, EmailType } from '@/lib/email/sender';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json();
    let { to, subject, html, type, text, template } = body;

    if (!to || (!template && (!subject || !html))) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (template) {
      type = template === 'verification' ? 'verification' : 'password-reset';

      if (template === 'verification') {
        const { generateVerificationEmail, generateVerificationEmailText } = await import('@/lib/email/templates/verification');
        html = generateVerificationEmail({ userName: 'تجربة المسؤول', otpCode: '123456', expiresIn: '30 دقيقة' });
        text = generateVerificationEmailText({ userName: 'تجربة المسؤول', otpCode: '123456', expiresIn: '30 دقيقة' });
        subject = '🔐 (تجربة) رمز التحقق - منصة الحلم';
      } else if (template === 'password-reset') {
        const { generatePasswordResetEmail, generatePasswordResetPlainText } = await import('@/lib/email/templates/password-reset');
        html = generatePasswordResetEmail({ userName: 'تجربة المسؤول', resetLink: 'https://el7lm.com/auth/reset-password?token=TEST-TOKEN', token: 'TEST-TOKEN', expiresIn: '60 دقيقة' });
        text = generatePasswordResetPlainText({ userName: 'تجربة المسؤول', resetLink: 'https://el7lm.com/auth/reset-password?token=TEST-TOKEN', token: 'TEST-TOKEN', expiresIn: '60 دقيقة' });
        subject = '🔐 (تجربة) إعادة تعيين كلمة المرور';
      }
    }

    const validTypes: EmailType[] = ['notification', 'system', 'marketing', 'welcome', 'verification', 'password-reset'];
    const emailType = validTypes.includes(type) ? type : 'system';

    const result = await sendEmail({
      to, subject, html, text, type: emailType,
      userName: 'Admin Manual Send',
      metadata: { source: 'admin-dashboard', isTest: true, template },
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
