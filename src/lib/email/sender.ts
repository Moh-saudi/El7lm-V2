import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase/admin';
import { EmailType, EmailLog } from '@/types/email';

// Initialize Resend with API Key
// Initialize Resend with API Key (use fallback to prevent build errors)
const resend = new Resend(process.env.RESEND_API_KEY || 're_123_build_fix');

export type { EmailType, EmailLog }; // Re-export for convenience if needed

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    type: EmailType;
    userName?: string; // For logging/metadata
    userId?: string;   // For logging/metadata
    metadata?: Record<string, any>;
}

/**
 * Sends an email using Resend and logs the activity to Firestore.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: any }> {
    const { to, subject, html, text, type, userId, userName, metadata } = options;

    console.log(`📧 [EmailService] Preparing to send '${type}' email to ${to}`);

    try {
        // 1. Send via Resend
        const { data, error } = await resend.emails.send({
            from: 'منصة الحلم <onboarding@resend.dev>', // استخدام نطاق الاختبار المضمون
            to,
            subject,
            html,
            text: text || '', // Resend likes having a text fallback
        });

        if (error) {
            console.error('❌ [EmailService] Resend API Error:', error);

            // Log failure to Firestore
            await logEmail({
                to,
                subject,
                type,
                status: 'failed',
                error: error.message,
                userId,
                userName,
                metadata
            });

            return { success: false, error };
        }

        console.log('✅ [EmailService] Email sent successfully via Resend:', data?.id);

        // 2. Log success to Firestore
        await logEmail({
            to,
            subject,
            type,
            status: 'success',
            resendId: data?.id,
            userId,
            userName,
            metadata
        });

        return { success: true, id: data?.id };

    } catch (err: any) {
        console.error('💥 [EmailService] Unexpected Error:', err);

        // Log unexpected failure
        await logEmail({
            to,
            subject,
            type,
            status: 'failed',
            error: err.message || 'Unknown error',
            userId,
            userName,
            metadata
        });

        return { success: false, error: err };
    }
}

/**
 * Internal function to log email activity to Firestore.
 */
async function logEmail(data: Omit<EmailLog, 'id' | 'sentAt'>) {
    try {
        const logEntry: Omit<EmailLog, 'id'> = {
            ...data,
            sentAt: Date.now(),
        };

        await adminDb.collection('email_logs').add(logEntry);
        console.log('📝 [EmailService] Logged to Firestore');
    } catch (logErr) {
        // Don't throw if logging fails, just warn
        console.warn('⚠️ [EmailService] Failed to log email to Firestore:', logErr);
    }
}
