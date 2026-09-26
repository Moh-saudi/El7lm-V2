export {
  storeOTPInFirestore,
  verifyOTPInFirestore,
  deleteOTPFromFirestore,
  hasActiveOTP,
  cleanupExpiredOTPs,
} from './otp-manager';
