import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { verifyPlayReviewOTP } from '@/lib/otp/play-review-otp';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber, generatePhoneVariants } from '@/lib/validation/phone-validation';
import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || body.phoneNumber;
    const tokenHash = body.tokenHash;
    const otp = body.otp;
    const deviceInfo = body.deviceInfo || {};

    if (!rawPhone || (!tokenHash && !otp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number and either tokenHash or otp are required',
        },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const phone = cleanPhoneNumber(rawPhone);
    let verifiedAuthUser: any = null;

    // 1. Verify tokenHash or OTP
    if (tokenHash) {
      // PKCE token hash verification with Supabase Auth
      try {
        const { data, error } = await admin.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'sms',
        });
        if (error || !data?.user) {
          return NextResponse.json(
            { success: false, error: error?.message || 'Invalid or expired token hash' },
            { status: 401 }
          );
        }
        verifiedAuthUser = data.user;
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: err?.message || 'Token verification failed' },
          { status: 401 }
        );
      }
    } else if (otp) {
      // Review OTP or Firestore OTP verification
      const reviewResult = await verifyPlayReviewOTP(rawPhone, otp);
      const otpResult = reviewResult.isReviewAccount
        ? reviewResult
        : await verifyOTPInFirestore(rawPhone, otp);

      if (!otpResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: otpResult.error || 'رمز التحقق غير صحيح',
            attemptsRemaining: otpResult.attemptsRemaining,
          },
          { status: 400 }
        );
      }
    }

    // 2. Resolve account record via canonical indexed lookup
    const phoneVariants = generatePhoneVariants(rawPhone);
    let userId: string | null = null;
    let accountType = 'player';
    let userName = '';
    let userEmail = '';
    let userAvatar: string | null = null;
    let cachedUid: string | null = null;
    let isProfileComplete = false;

    const resolved = await findAccountByPhone(rawPhone);
    if (resolved.found) {
      userId = resolved.id;
      userName = resolved.name;
      accountType = resolved.accountType;
      userEmail = resolved.email;
      cachedUid = resolved.uid;
      isProfileComplete = true;
    } else {
      // Check admin table
      const { data: adminUser } = await admin
        .from('admins')
        .select('id, uid, name, email')
        .in('phone', phoneVariants)
        .limit(1)
        .maybeSingle();

      if (adminUser) {
        userId = adminUser.id;
        accountType = 'admin';
        userName = adminUser.name || 'Admin';
        userEmail = adminUser.email || '';
        cachedUid = adminUser.uid || null;
        isProfileComplete = true;
      }
    }

    // 3. User is new if not found in platform tables
    if (!userId) {
      return NextResponse.json({
        success: true,
        isNew: true,
        phone,
        message: 'OTP verified successfully. Please complete registration.',
      });
    }

    // 4. Ensure Supabase Auth identity exists & retrieve session / tokens
    let authUid = verifiedAuthUser?.id || cachedUid;
    const constructedEmail = userEmail || `${phone}@el7lm.com`;

    if (!authUid) {
      try {
        const { data: existingUser } = await admin.auth.admin.getUserById(userId);
        if (existingUser?.user) {
          authUid = existingUser.user.id;
        }
      } catch (_) {}
    }

    // If still no auth identity, locate or create user in Supabase Auth
    if (!authUid) {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const found = (listData?.users || []).find(
        (u) =>
          u.phone === `+${phone}` ||
          u.phone === phone ||
          (userEmail && u.email === userEmail) ||
          u.email === constructedEmail
      );
      if (found) {
        authUid = found.id;
      } else {
        // Create auth user
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: constructedEmail,
          phone: `+${phone}`,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            full_name: userName,
            accountType,
            db_id: userId,
            created_by: 'v1_verify_session',
          },
        });
        if (!createError && created?.user) {
          authUid = created.user.id;
        }
      }
    }

    // Generate custom access token/session or temp credentials
    const tempPassword = `El7lm!${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}!${phone.slice(-4)}`;
    if (authUid) {
      await admin.auth.admin
        .updateUserById(authUid, {
          password: tempPassword,
          email_confirm: true,
          phone_confirm: true,
        })
        .catch(() => {});
    }

    // 5. Construct canonical response conforming to PLAN-01
    return NextResponse.json({
      success: true,
      authEmail: constructedEmail,
      tempPassword,
      deviceInfo,
      user: {
        id: userId,
        authUid: authUid || userId,
        phone: `+${phone}`,
        accountType,
        name: userName,
        avatar: userAvatar,
        isProfileComplete,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/v1/auth/otp/verify-session:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
