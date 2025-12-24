/**
 * Professional Email Template for Password Reset
 * Arabic RTL Design with Modern Styling
 */

interface EmailTemplateProps {
    userName: string;
    resetLink: string;
    token: string;
    expiresIn: string;
}

export function generatePasswordResetEmail({
    userName,
    resetLink,
    token,
    expiresIn
}: EmailTemplateProps): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إعادة تعيين كلمة المرور</title>
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
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">منصة الحلم</h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">للتطوير الرياضي</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px; color: #1a202c; font-size: 24px; font-weight: bold;">مرحباً ${userName} 👋</h2>
                            
                            <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة الحلم.
                            </p>

                            <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.
                            </p>

                            <!-- Reset Button -->
                            <table role="presentation" style="width: 100%; margin: 0 0 30px;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s;">
                                            🔐 إعادة تعيين كلمة المرور
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Token Box -->
                            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px dashed #cbd5e0; border-radius: 12px; padding: 20px; margin: 0 0 30px; text-align: center;">
                                <p style="margin: 0 0 10px; color: #718096; font-size: 14px; font-weight: 600;">
                                    أو استخدم الرمز التالي:
                                </p>
                                <div style="background: #ffffff; border-radius: 8px; padding: 15px; display: inline-block;">
                                    <code style="font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                                        ${token}
                                    </code>
                                </div>
                            </div>

                            <!-- Warning Box -->
                            <div style="background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 50%); border-right: 4px solid #fc8181; border-radius: 8px; padding: 15px; margin: 0 0 20px;">
                                <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 1.5;">
                                    <strong>⚠️ تنبيه أمني:</strong><br>
                                    • الرابط صالح لمدة <strong>${expiresIn}</strong> فقط<br>
                                    • لا تشارك هذا الرابط مع أي شخص<br>
                                    • إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة
                                </p>
                            </div>

                            <!-- Alternative Link -->
                            <p style="margin: 0 0 10px; color: #718096; font-size: 13px; text-align: center;">
                                إذا لم يعمل الزر أعلاه، انسخ الرابط التالي والصقه في متصفحك:
                            </p>
                            <p style="margin: 0 0 30px; text-align: center;">
                                <a href="${resetLink}" style="color: #667eea; font-size: 12px; word-break: break-all;">
                                    ${resetLink}
                                </a>
                            </p>
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
                                © 2024 منصة الحلم. جميع الحقوق محفوظة.
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

// Plain text version for email clients that don't support HTML
export function generatePasswordResetEmailText({
    userName,
    resetLink,
    token,
    expiresIn
}: EmailTemplateProps): string {
    return `
مرحباً ${userName}،

تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة الحلم.

لإعادة تعيين كلمة المرور، يرجى اتباع الرابط التالي:
${resetLink}

أو استخدم الرمز التالي: ${token}

⚠️ تنبيه أمني:
• الرابط صالح لمدة ${expiresIn} فقط
• لا تشارك هذا الرابط مع أي شخص
• إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة

--
منصة الحلم للتطوير الرياضي
© 2024 جميع الحقوق محفوظة
    `.trim();
}

// Alias for backward compatibility
export const generatePasswordResetPlainText = generatePasswordResetEmailText;
