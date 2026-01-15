
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';

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
    players?: string[]; // IDs of players if it's a bulk payment
    createdAt?: any;
    updatedAt?: any;
    receiptUrl?: string; // For manual payments
    transactionId?: string; // External provider ID
    customerEmail?: string;
    customerName?: string;
}

export const InvoiceService = {
    /**
     * Create a pending invoice before redirecting to payment gateway
     */
    async createPendingInvoice(data: Omit<InvoiceRecord, 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const invoiceRef = await addDoc(collection(db, 'invoices'), {
                ...data,
                status: 'pending',
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                invoice_number: `INV-${Date.now().toString().slice(-8)}`
            });
            return invoiceRef.id;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    },

    /**
     * Submit a receipt for manual review
     */
    async submitManualReceipt(invoiceId: string, receiptUrl: string) {
        try {
            const invoiceRef = doc(db, 'invoices', invoiceId);
            await updateDoc(invoiceRef, {
                receiptUrl,
                status: 'pending_review',
                updated_at: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Also record in receipts collection for the legacy admin panel if needed
            await addDoc(collection(db, 'receipts'), {
                invoiceId,
                url: receiptUrl,
                userId: (await getDoc(invoiceRef)).data()?.userId,
                status: 'pending',
                timestamp: serverTimestamp()
            });

            return true;
        } catch (error) {
            console.error('Error submitting receipt:', error);
            throw error;
        }
    }
};
