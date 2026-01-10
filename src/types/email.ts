export type EmailType = 'verification' | 'password-reset' | 'notification' | 'welcome' | 'system' | 'marketing';

export interface EmailLog {
    id: string;
    to: string;
    subject: string;
    type: EmailType;
    status: 'success' | 'failed';
    sentAt: number;
    error?: string;
    resendId?: string;
    userId?: string;
    userName?: string;
    metadata?: Record<string, any>;
}
