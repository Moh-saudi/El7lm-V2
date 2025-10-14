import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف ورمز التحقق مطلوبان' }, { status: 400 });
    }

    console.log(`🔑 [verify-otp] Verifying OTP for ${phoneNumber}`);

    // Query Firestore for the OTP
    const otpQuery = query(
      collection(db, 'otp_codes'),
      where('phoneNumber', '==', phoneNumber),
      where('otp', '==', otp),
      where('verified', '==', false)
    );

    const querySnapshot = await getDocs(otpQuery);

    if (querySnapshot.empty) {
      console.error('❌ [verify-otp] No matching OTP found');
      return NextResponse.json({
        success: false,
        verified: false,
        error: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      }, { status: 400 });
    }

    // Get the first matching document
    const otpDoc = querySnapshot.docs[0];
    const otpData = otpDoc.data();

    // Check if OTP is expired
    const expiresAt = otpData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      console.error('❌ [verify-otp] OTP expired');
      return NextResponse.json({
        success: false,
        verified: false,
        error: 'رمز التحقق منتهي الصلاحية'
      }, { status: 400 });
    }

    // Mark OTP as verified
    await updateDoc(otpDoc.ref, {
      verified: true,
      verifiedAt: new Date()
    });

    console.log(`✅ [verify-otp] OTP verified successfully for ${phoneNumber}`);

    return NextResponse.json({
      success: true,
      message: 'تم التحقق بنجاح',
      verified: true
    });

  } catch (error: any) {
    console.error('❌ [verify-otp] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ في التحقق',
      verified: false
    }, { status: 500 });
  }
}
