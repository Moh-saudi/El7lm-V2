import { Suspense } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import EmailCenterClient from './_components/EmailCenterClient';
import { EmailLog } from '@/types/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEmailLogs(): Promise<EmailLog[]> {
    try {
        const db = getSupabaseAdmin();
        const { data, error } = await db
            .from('email_logs')
            .select('*')
            .order('sentAt', { ascending: false })
            .limit(50);

        if (error) throw error;
        return (data ?? []) as EmailLog[];
    } catch (error) {
        console.error('Error fetching email logs:', error);
        return [];
    }
}

async function getEmailStats() {
    try {
        const db = getSupabaseAdmin();
        const { data: allLogs, error } = await db
            .from('email_logs')
            .select('status');

        if (error) throw error;

        const total = allLogs?.length ?? 0;
        const success = allLogs?.filter(l => l.status === 'success').length ?? 0;

        return {
            total,
            success,
            failed: total - success,
            successRate: total > 0 ? Math.round((success / total) * 100) : 0,
        };
    } catch (error) {
        console.error('Error fetching email stats:', error);
        return { total: 0, success: 0, failed: 0, successRate: 0 };
    }
}

export default async function EmailCenterPage() {
    const logs = await getEmailLogs();
    const stats = await getEmailStats();

    const config = {
        sender: 'onboarding@resend.dev',
        provider: 'Resend',
        isConnected: !!process.env.RESEND_API_KEY,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <Suspense fallback={<div className="p-10 text-center">جاري تحميل بيانات البريد...</div>}>
                <EmailCenterClient initialLogs={logs} config={config} stats={stats} />
            </Suspense>
        </div>
    );
}
