import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

async function sendBeonOtp(phoneNumber: string, name: string, otpLength: number, lang: string) {
  const cleanPhone = phoneNumber.replace(/^\+/, '');
  const beonUrl = process.env.BEON_OTP_BASE_URL || 'https://v3.api.beon.chat/send/otp';
  const beonToken = process.env.BEON_OTP_TOKEN || process.env.BEON_V3_TOKEN;

  if (!beonToken) {
    console.error('❌ [send-otp] BEON_OTP_TOKEN is not set.');
    return { success: false, error: 'BeOn token not configured' };
  }

  console.log('🔧 [send-otp] BeOn config:', {
    url: beonUrl,
    tokenSet: !!beonToken,
  });

  const beonResponse = await fetch(beonUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'beon-token': beonToken,
    },
    body: JSON.stringify({
      phoneNumber: cleanPhone,
      name: name || 'El7lm',
      type: 'sms',
      otp_length: otpLength,
      lang: lang,
    }),
  });

  const responseText = await beonResponse.text();
  let beonData;
  try {
    beonData = JSON.parse(responseText);
  } catch (e) {
    console.error('❌ [send-otp] Failed to parse BeOn response as JSON. Response text:', responseText);
    return { 
      success: false, 
      error: 'Invalid response from OTP service.' 
    };
  }
  
  console.log('📨 [send-otp] استجابة BeOn:', beonData);

  if (beonResponse.ok && beonData.success) {
    return {
      success: true,
      reference: beonData.reference || beonData.data?.reference
    };
  }

  console.error('❌ [send-otp] فشل BeOn:', beonData);
  return {
    success: false,
    error: beonData.error || beonData.message || 'فشل في إرسال رمز التحقق'
  };
}

function generateBackupOtp(length: number): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

async function saveBackupOtp(phoneNumber: string, otp: string) {
  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    await addDoc(collection(db, 'backup_otps'), {
      phoneNumber,
      otp,
      createdAt: serverTimestamp(),
      expiresAt,
      verified: false,
    });
    console.log(`🔑 [send-otp] تم حفظ رمز احتياطي لـ ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('❌ [send-otp] فشل حفظ الرمز الاحتياطي:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, name, otpLength = 6, lang = 'ar' } = await request.json();

    console.log('📱 [send-otp] طلب إرسال OTP:', { phoneNumber, name, otpLength, lang });

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف مطلوب' },
        { status: 400 }
      );
    }

    // First attempt: BeOn
    const beonResult = await sendBeonOtp(phoneNumber, name, otpLength, lang);

    if (beonResult.success) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال رمز التحقق بنجاح',
        reference: beonResult.reference,
        expiresIn: 300,
        method: 'beon'
      });
    }

    // Fallback: Generate and save backup OTP
    console.warn(`⚠️ [send-otp] فشل الإرسال عبر BeOn لـ ${phoneNumber}. بدء النظام الاحتياطي.`);

    const backupOtp = generateBackupOtp(otpLength);
    const saved = await saveBackupOtp(phoneNumber, backupOtp);

    if (saved) {
       // In a real scenario, you wouldn't return the OTP.
       // This is for demonstration or internal testing.
       // For production, you would have a different mechanism for the user to get this code.
       return NextResponse.json({
        success: true,
        message: 'فشل إرسال الرسالة. تم إنشاء رمز احتياطي.',
        // DO NOT expose the OTP in production responses.
        // This is a temporary measure for debugging.
        backupOtp: process.env.NODE_ENV === 'development' ? backupOtp : undefined,
        method: 'backup'
      });
    }

    // If both BeOn and Firestore fallback fail
    return NextResponse.json({
      success: false,
      error: beonResult.error || 'فشل إرسال رمز التحقق وحفظ الرمز الاحتياطي'
    }, { status: 500 });


  } catch (error: any) {
    console.error('❌ [send-otp] خطأ فادح:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ داخلي في الخادم'
    }, { status: 500 });
  }
}

