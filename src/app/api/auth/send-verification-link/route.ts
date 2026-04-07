import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/sender';
import { generateVerificationEmail, generateVerificationEmailText } from '@/lib/email/templates/verification';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    console.log(`Generating verification link for: ${email}`);

    const db = getSupabaseAdmin();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://el7lm.com';

    // Generate email verification link via Supabase Auth Admin
    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: 'signup',
      email,
      password: 'TmpPassword123!', // Required by newer Supabase auth-js types
      options: { redirectTo: `${baseUrl}/auth/login?verified=true` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('❌ Failed to generate verification link:', linkError?.message);
      return NextResponse.json(
        { success: false, error: 'Failed to generate verification link', originalError: linkError?.message },
        { status: 500 }
      );
    }

    const verificationLink = linkData.properties.action_link;

    const html = generateVerificationEmail({ userName: name || 'User', verificationLink });
    const text = generateVerificationEmailText({ userName: name || 'User', verificationLink });

    const result = await sendEmail({
      to: email,
      subject: '✅ تفعيل حسابك في منصة الحلم',
      html, text,
      type: 'verification',
      userName: name,
      metadata: { isVerificationLink: true },
    });

    if (!result.success) {
      console.error('❌ Failed to send verification email:', result.error);
      return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
    }

    console.log('✅ Verification email sent successfully');
    return NextResponse.json({ success: true, id: result.id });
  } catch (error: unknown) {
    console.error('💥 Error generating verification link:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate verification link' },
      { status: 500 }
    );
  }
}
