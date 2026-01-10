import { Suspense } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import EmailCenterClient from './_components/EmailCenterClient';
import { EmailLog } from '@/types/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEmailLogs(): Promise<EmailLog[]> {
    try {
        const snapshot = await adminDb
            .collection('email_logs')
            .orderBy('sentAt', 'desc')
            .limit(50)
            .get();

        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as EmailLog[];

        return logs;
    } catch (error) {
        console.error('Error fetching email logs:', error);
        return [];
    }
}

async function getEmailStats() {
    try {
        const logsRef = adminDb.collection('email_logs');
        // Using aggregation count for better performance
        const total = (await logsRef.count().get()).data().count;
        const success = (await logsRef.where('status', '==', 'success').count().get()).data().count;

        return {
            total,
            success,
            failed: total - success,
            successRate: total > 0 ? Math.round((success / total) * 100) : 0
        };
    } catch (error) {
        console.error('Error fetching email stats:', error);
        return { total: 0, success: 0, failed: 0, successRate: 0 };
    }
}

export default async function EmailCenterPage() {
    const logs = await getEmailLogs();
    const stats = await getEmailStats();

    // System Configuration Status
    const config = {
        sender: 'onboarding@resend.dev', // Hardcoded as per current system instruction, or read from Env
        provider: 'Resend',
        isConnected: !!process.env.RESEND_API_KEY,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <Suspense fallback={<div className="p-10 text-center">جاري تحميل بيانات البريد...</div>}>
                <EmailCenterClient initialLogs={logs} config={config} stats={stats} />
            </Suspense>
        </div>
    );
}
