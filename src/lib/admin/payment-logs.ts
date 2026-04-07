import { supabase } from '@/lib/supabase/config';

export interface PaymentLogEntry {
  id?: string;
  paymentId: string;
  userId: string;
  userName: string;
  action: 'receipt_received' | 'ocr_verification' | 'manual_verification' | 'status_change' | 'sms_sent' | 'receipt_preview';
  details: string;
  adminId?: string;
  adminName?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

class PaymentLogService {
  private table = 'payment_action_logs';

  async logAction(entry: PaymentLogEntry): Promise<void> {
    try {
      await supabase.from(this.table).insert({
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
      console.log('Payment action logged:', entry.action);
    } catch (error) {
      console.error('Error logging payment action:', error);
    }
  }

  async logReceiptReceived(paymentId: string, userId: string, userName: string, receiptUrl: string, adminId?: string, adminName?: string): Promise<void> {
    await this.logAction({ paymentId, userId, userName, action: 'receipt_received', details: 'تم استلام إيصال الدفع', adminId, adminName, metadata: { receiptUrl } });
  }

  async logOCRVerification(paymentId: string, userId: string, userName: string, ocrResult: Record<string, unknown>, adminId?: string, adminName?: string): Promise<void> {
    await this.logAction({
      paymentId, userId, userName, action: 'ocr_verification',
      details: `تم التحقق التلقائي من الإيصال - النتيجة: ${ocrResult.success ? 'نجح' : 'فشل'}`,
      adminId, adminName,
      metadata: { ocrResult, extractedAmounts: ocrResult.amounts, extractedText: String(ocrResult.text || '').substring(0, 200) },
    });
  }

  async logSMSSent(paymentId: string, userId: string, userName: string, phoneNumber: string, message: string, adminId?: string, adminName?: string): Promise<void> {
    await this.logAction({
      paymentId, userId, userName, action: 'sms_sent', details: 'تم إرسال رسالة نصية للعميل', adminId, adminName,
      metadata: { phoneNumber: phoneNumber.substring(0, 5) + '****', messagePreview: message.substring(0, 50) + '...' },
    });
  }

  async logStatusChange(paymentId: string, userId: string, userName: string, oldStatus: string, newStatus: string, adminId?: string, adminName?: string): Promise<void> {
    await this.logAction({
      paymentId, userId, userName, action: 'status_change',
      details: `تغيير حالة الدفعة من ${oldStatus} إلى ${newStatus}`,
      adminId, adminName, metadata: { oldStatus, newStatus },
    });
  }

  async logReceiptPreview(paymentId: string, userId: string, userName: string, adminId?: string, adminName?: string): Promise<void> {
    await this.logAction({ paymentId, userId, userName, action: 'receipt_preview', details: 'تم عرض معاينة الإيصال', adminId, adminName });
  }

  async getPaymentLogs(paymentId: string): Promise<PaymentLogEntry[]> {
    try {
      const { data } = await supabase.from(this.table).select('*').eq('paymentId', paymentId).order('createdAt', { ascending: false });
      return (data ?? []) as PaymentLogEntry[];
    } catch (error) {
      console.error('Error fetching payment logs:', error);
      return [];
    }
  }

  async getUserPaymentLogs(userId: string, limit: number = 50): Promise<PaymentLogEntry[]> {
    try {
      const { data } = await supabase.from(this.table).select('*').eq('userId', userId).order('createdAt', { ascending: false }).limit(limit);
      return (data ?? []) as PaymentLogEntry[];
    } catch (error) {
      console.error('Error fetching user payment logs:', error);
      return [];
    }
  }
}

export const paymentLogService = new PaymentLogService();
