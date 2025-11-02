import { NextRequest, NextResponse } from 'next/server';

// This is a simplified in-memory store for OTPs.
// In a real production environment, you should use a more persistent and secure store like Redis or a database.
// Using global to persist across Hot Reloads in development
const globalForOtp = global as typeof global & {
  otpStore?: { [key: string]: { otp: string; timestamp: number } }
};

const otpStore = globalForOtp.otpStore ?? {};
globalForOtp.otpStore = otpStore;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otp } = body;

    console.log('🔍 [verify-otp] Received request:', { phoneNumber, otp });
    console.log('🔍 [verify-otp] Current otpStore keys:', Object.keys(otpStore));
    console.log('🔍 [verify-otp] Full otpStore:', otpStore);

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: 'Phone number and OTP are required' }, { status: 400 });
    }

    const storedOtpData = otpStore[phoneNumber];

    if (!storedOtpData) {
      console.error('❌ [verify-otp] No OTP found for:', phoneNumber);
      console.error('❌ [verify-otp] Available keys:', Object.keys(otpStore));
      return NextResponse.json({ success: false, error: 'No OTP found for this number or it has expired' }, { status: 400 });
    }

    // OTPs are valid for 10 minutes (600000 ms)
    if (Date.now() - storedOtpData.timestamp > 600000) {
      delete otpStore[phoneNumber]; // Clean up expired OTP
      return NextResponse.json({ success: false, error: 'OTP has expired' }, { status: 400 });
    }

    if (storedOtpData.otp === otp) {
      delete otpStore[phoneNumber]; // Clean up used OTP
      return NextResponse.json({ success: true, message: 'OTP verified successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid OTP' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/verify-otp] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'An error occurred during OTP verification' }, { status: 500 });
  }
}

// Function to be used by the send-otp route to store the generated OTP
export function storeOtp(phoneNumber: string, otp: string) {
  otpStore[phoneNumber] = { otp, timestamp: Date.now() };
  console.log(`🔑 [storeOtp] Stored OTP ${otp} for ${phoneNumber}`);
  console.log(`🔑 [storeOtp] Current store keys:`, Object.keys(otpStore));
  console.log(`🔑 [storeOtp] Full store:`, otpStore);
}
