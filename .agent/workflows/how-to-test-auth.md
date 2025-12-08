---
description: How to test the new Authentication features (Google Sign-In & Firebase Phone Auth)
---

# Testing Authentication Features

## 1. Prerequisites
- Ensure your Firebase project has **Google** and **Phone** sign-in providers enabled in the [Firebase Console](https://console.firebase.google.com/).
- Add your development domain (e.g., `localhost`) to the **Authorized Domains** list in Firebase Authentication settings.

## 2. Testing Google Sign-In
1. Navigate to `/auth/login`.
2. Click the **"الدخول بواسطة Google"** button.
3. Select your Google account in the popup.
   - **Scenario A (New User):** You should be registered as a 'player' (default) and redirected to the player dashboard.
   - **Scenario B (Existing User):** You should be logged in and redirected to your specific dashboard.
4. Verify that the toast notification shows success.

## 3. Testing Firebase Phone Auth (Registration)
1. Navigate to `/auth/register`.
2. Fill in the form details.
3. Enter a valid phone number.
4. Click **"إنشاء حساب"**.
5. You might see a reCAPTCHA challenge (if not invisible).
6. You should receive an SMS with the verification code.
   - **Note:** For testing, you can add "Phone numbers for testing" in Firebase Console to use fixed numbers and codes (e.g., `+20 1234567890` with code `123456`) to avoid SMS costs and rate limits.
7. Enter the OTP code in the modal.
8. Verify you become a registered user and are redirected to the dashboard.

## 4. Testing Firebase Phone Auth (Login)
1. Navigate to `/auth/login`.
2. Enter your registered phone number.
3. Click **"أو سجل الدخول برمز التحقق (OTP)"**.
4. Complete the reCAPTCHA if prompted.
5. Enter the OTP code received via SMS.
6. Verify you are logged in successfully.

## 5. Troubleshooting
- **"auth/invalid-phone-number"**: Ensure the phone number includes the correct country code (e.g., +20...).
- **"auth/quota-exceeded"**: You reached the SMS limit. Use test numbers in Firebase Console.
- **reCAPTCHA errors**: Ensure `recaptcha-container` is present in the DOM (it is added in the pages).
- **Popup blocked**: Allow popups for Google Sign-In.
