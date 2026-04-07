
import { supabase } from '@/lib/supabase/config';

export interface InvoiceRecord {
    id?: string;
    userId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'pending_review' | 'paid' | 'failed' | 'cancelled';
    paymentMethod: string;
    packageType: string;
    packageName: string;
    playerCount?: number;
    players?: string[];
    createdAt?: string;
    updatedAt?: string;
    receiptUrl?: string;
    transactionId?: string;
    customerEmail?: string;
    customerName?: string;
}

export const InvoiceService = {
    async createPendingInvoice(data: Omit<InvoiceRecord, 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const id = crypto.randomUUID();
            const now = new Date().toISOString();
            const { error } = await supabase.from('invoices').insert({
                ...data,
                id,
                status: 'pending',
                created_at: now,
                updated_at: now,
                createdAt: now,
                updatedAt: now,
                invoice_number: `INV-${Date.now().toString().slice(-8)}`,
            });
            if (error) throw error;
            return id;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    },

    async submitManualReceipt(invoiceId: string, receiptUrl: string) {
        try {
            const now = new Date().toISOString();
            const { data: invoiceRows, error: fetchError } = await supabase.from('invoices').select('userId').eq('id', invoiceId).limit(1);
            if (fetchError) throw fetchError;

            const { error } = await supabase.from('invoices').update({
                receiptUrl,
                status: 'pending_review',
                updated_at: now,
                updatedAt: now,
            }).eq('id', invoiceId);
            if (error) throw error;

            await supabase.from('receipts').insert({
                id: crypto.randomUUID(),
                invoiceId,
                url: receiptUrl,
                userId: invoiceRows?.[0]?.userId || null,
                status: 'pending',
                timestamp: now,
            });

            return true;
        } catch (error) {
            console.error('Error submitting receipt:', error);
            throw error;
        }
    }
};
