---
description: How to test Authentication Migration and Google Sign-In with Role Handling
---

# Testing Auth Migration & Roles

## 1. Test Role Selection with Google Sign-In
1. Go to `/auth/register`.
2. Select a role, e.g., "**Club**" (or Nady).
3. Click "المتابعة باستخدام Google" (Google Sign-In).
4. Complete Google Auth.
5. **Verify:** You should be redirected to `/dashboard/club` (not player).
6. **Verify:** Check Firestore `users` collection for the new document. `accountType` should be `club`.

## 2. Test Migration (Existing Email User)
1. **Prerequisite:** Create a user in Firestore (manually or via Register) with:
   - `email`: `your.google.email@gmail.com`
   - `accountType`: `academy`
   - `full_name`: `Old Account Name`
   - ensure `uid` is DIFFERENT from your Google UID (e.g., `test-uid-123`).
   - (This simulates a user who registered via Phone/Password but saved their email).
2. Go to `/auth/login`.
3. Click "الدخول بواسطة Google".
4. Sign in with `your.google.email@gmail.com`.
5. **Verify:** You are logged in successfully.
6. **Verify:** You are redirected to `/dashboard/academy`.
7. **Verify:** The new Google-linked User Document (in Firestore) contains fields from the old account (like `full_name`) and `migratedFromUid`.

## 3. Test "Unknown Account" Error handling
1. Go to `/auth/login`.
2. Enter a random email `nonexistent@test.com` and password.
3. Click Login.
4. **Verify:** Notification says "البريد الإلكتروني غير مسجل" (Email not registered) instead of generic error.
5. **Verify:** Prompts to Register.
