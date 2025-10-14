import { beonSMSService } from '@/lib/beon/sms-service';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// Generate a random OTP
function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

// Save OTP to Firestore
async function saveOTP(phoneNumber: string, otp: string): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    await addDoc(collection(db, 'otp_codes'), {
      phoneNumber,
      otp,
      createdAt: serverTimestamp(),
      expiresAt,
      verified: false,
    });
    console.log(`✅ [send-otp] OTP saved for ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('❌ [send-otp] Failed to save OTP:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, name, otpLength = 6, lang = 'ar' } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف مطلوب' }, { status: 400 });
    }

    console.log(`📱 [send-otp] Generating and sending OTP for ${phoneNumber}`);

    // Generate OTP locally
    const otp = generateOTP(otpLength);

    // Save OTP to Firestore
    const saved = await saveOTP(phoneNumber, otp);
    if (!saved) {
      return NextResponse.json({
        success: false,
        error: 'فشل في حفظ رمز التحقق',
      }, { status: 500 });
    }

    // Prepare message
    const message = `رمز التحقق الخاص بك هو: ${otp}\nصالح لمدة 5 دقائق.`;

    // Send OTP via SMS using the proven SMS service
    const result = await beonSMSService.sendSingleSMS(phoneNumber.replace(/^\+/, ''), message);

    if (result.success) {
      console.log(`✅ [send-otp] OTP sent successfully to ${phoneNumber}`);
      return NextResponse.json({
        success: true,
        message: 'تم إرسال رمز التحقق بنجاح',
        reference: otp, // In development, you might want to return this for testing
      });
    } else {
      console.error(`❌ [send-otp] Failed to send OTP:`, result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'فشل في إرسال رمز التحقق',
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ [send-otp] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ داخلي في الخادم',
    }, { status: 500 });
  }
}

