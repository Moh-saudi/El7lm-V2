/**
 * Professional Email Template for Email Verification
 * Arabic RTL Design with Modern Styling
 */

interface VerificationEmailProps {
    userName: string;
    otpCode?: string;
    verificationLink?: string;
    expiresIn?: string;
}

export function generateVerificationEmail({
    userName,
    otpCode,
    verificationLink,
    expiresIn = '30 دقيقة'
}: VerificationEmailProps): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>التحقق من البريد الإلكتروني</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); direction: rtl;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; padding: 20px;">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M9 11L12 14L22 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">منصة الحلم</h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">للتطوير الرياضي</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px; color: #1a202c; font-size: 24px; font-weight: bold;">مرحباً ${userName || 'عزيزي المستخدم'} 👋</h2>
                            
                            <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                شكراً لتسجيلك في منصة الحلم. لتفعيل حسابك والبدء في استخدام المنصة، يرجى ${verificationLink ? 'الضغط على الرابط أدناه:' : 'استخدام رمز التحقق التالي:'}
                            </p>

                            ${verificationLink ? `
                                <!-- Action Button -->
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${verificationLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                        تفعيل الحساب الآن
                                    </a>
                                </div>
                                <p style="margin: 0 0 20px; text-align: center; color: #718096; font-size: 14px;">
                                    أو انسخ الرابط التالي:
                                    <br>
                                    <a href="${verificationLink}" style="color: #667eea; word-break: break-all; font-size: 12px; display: block; margin-top: 5px;">${verificationLink}</a>
                                </p>
                            ` : `
                                <!-- OTP Box -->
                                <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px dashed #cbd5e0; border-radius: 12px; padding: 30px; margin: 0 0 30px; text-align: center;">
                                    <p style="margin: 0 0 15px; color: #718096; font-size: 14px; font-weight: 600;">
                                        رمز التحقق الخاص بك هو:
                                    </p>
                                    <div style="background: #ffffff; border-radius: 8px; padding: 20px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                                        <code style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; direction: ltr; display: inline-block;">
                                            ${otpCode}
                                        </code>
                                    </div>
                                </div>
                            `}

                            <!-- Warning Box -->
                            <div style="background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 50%); border-right: 4px solid #fc8181; border-radius: 8px; padding: 15px; margin: 0 0 20px;">
                                <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 1.5;">
                                    <strong>⚠️ ملاحظات هامة:</strong><br>
                                    • هذا الرابط/الرمز صالح لمدة <strong>${expiresIn}</strong><br>
                                    • لا تشارك بيانات التفعيل مع أي جهة أخرى<br>
                                    • إذا لم تطلب التسجيل، يرجى تجاهل هذه الرسالة
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px; color: #4a5568; font-size: 14px; font-weight: 600;">
                                منصة الحلم الرقمية
                            </p>
                            <p style="margin: 0 0 15px; color: #718096; font-size: 12px;">
                                أول متجر إلكتروني لتسويق وبيع اللاعبين في الشرق الأوسط
                            </p>
                            
                            <!-- Contact Info -->
                            <div style="margin: 20px 0; padding: 15px; background: #ffffff; border-radius: 8px;">
                                <p style="margin: 0 0 5px; color: #2d3748; font-size: 12px;">📱 قطر (واتساب الرسمي): +974 7054 2458</p>
                                <p style="margin: 0 0 5px; color: #2d3748; font-size: 12px;">📱 مصر: +20 101 779 9580</p>
                                <p style="margin: 0; color: #2d3748; font-size: 12px;">✉️ info@el7lm.com</p>
                            </div>

                            <p style="margin: 15px 0 0; color: #a0aec0; font-size: 11px;">
                                من شركة ميسك القطرية • www.mesk.qa
                            </p>
                            <p style="margin: 5px 0 0; color: #cbd5e0; font-size: 10px;">
                                © ${new Date().getFullYear()} منصة الحلم. جميع الحقوق محفوظة.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Bottom Note -->
                <table role="presentation" style="max-width: 600px; margin: 20px auto 0;">
                    <tr>
                        <td style="text-align: center;">
                            <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 12px;">
                                هذه رسالة آلية، يرجى عدم الرد عليها
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

// Plain text version
export function generateVerificationEmailText({
    userName,
    otpCode,
    verificationLink,
    expiresIn = '30 دقيقة'
}: VerificationEmailProps): string {
    return `
مرحباً ${userName || 'عزيزي المستخدم'}،

شكراً لتسجيلك في منصة الحلم. لتفعيل حسابك، يرجى ${verificationLink ? 'زيارة الرابط التالي:' : 'استخدام رمز التحقق التالي:'}

${verificationLink ? `رابط التفعيل: ${verificationLink}` : `رمز التحقق: ${otpCode}`}

⚠️ ملاحظات هامة:
• هذا الرابط/الرمز صالح لمدة ${expiresIn}
• لا تشارك هذا الرمز مع أي جهة أخرى
• إذا لم تطلب التسجيل، يرجى التواصل مع الدعم الفني

--
منصة الحلم للتطوير الرياضي
© ${new Date().getFullYear()} جميع الحقوق محفوظة
    `.trim();
}
