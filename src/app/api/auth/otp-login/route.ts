/**
 * OTP Login via WhatsApp
 * يتحقق من OTP ثم يُنشئ Firebase Custom Token لتسجيل الدخول
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otp } = body;

    if (!phoneNumber || !otp) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف ورمز التحقق مطلوبان'
      }, { status: 400 });
    }

    // 1. التحقق من OTP في Firestore
    const otpResult = await verifyOTPInFirestore(phoneNumber, otp);
    if (!otpResult.success) {
      return NextResponse.json({
        success: false,
        error: otpResult.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      }, { status: 400 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({
        success: false,
        error: 'خدمة المصادقة غير متاحة'
      }, { status: 503 });
    }

    // 2. البحث عن المستخدم برقم الهاتف في Firestore
    const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'admins'];
    let uid: string | null = null;
    let accountType: string = 'player';
    let userName: string = '';

    // Standardize cleaning
    const cleanedSearchPhone = cleanPhoneNumber(phoneNumber);
    
    // تنسيقات الهاتف المختلفة للبحث
    const phoneVariants = [
      cleanedSearchPhone,
      `+${cleanedSearchPhone}`,
      phoneNumber, // fallback to original input
    ].filter((v, i, a) => a.indexOf(v) === i); // unique

    for (const collectionName of collections) {
      for (const phoneVariant of phoneVariants) {
        const snapshot = await adminDb
          .collection(collectionName)
          .where('phone', '==', phoneVariant)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          uid = snapshot.docs[0].id;
          userName = docData.full_name || docData.name || '';
          accountType = collectionName === 'admins' ? 'admin' : (docData.accountType || collectionName.replace(/s$/, ''));
          break;
        }
      }
      if (uid) break;
    }

    if (!uid) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف غير مسجل في النظام'
      }, { status: 404 });
    }

    // 3. إنشاء Firebase Custom Token
    const customToken = await adminAuth.createCustomToken(uid, {
      accountType,
      phone: phoneNumber,
    });

    return NextResponse.json({
      success: true,
      customToken,
      uid,
      accountType,
      userName,
      message: 'تم التحقق بنجاح'
    });

  } catch (error: any) {
    console.error('❌ [OTP Login] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تسجيل الدخول'
    }, { status: 500 });
  }
}
