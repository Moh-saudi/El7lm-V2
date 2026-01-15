export interface SkipCashPaymentRequest {
    amount: number;
    currency?: string; // SkipCash works primarily with QAR
    customerEmail: string;
    customerPhone: string;
    customerName?: string;
    transactionId?: string; // Internal order ID
    returnUrl?: string; // Where to redirect after payment
    custom1?: string; // Optional metadata
}

export interface SkipCashPaymentResponse {
    resultObj: {
        payUrl?: string;
        paymentId?: string;
        [key: string]: any;
    };
    resultCode: number;
    returnCode: number;
    returnMessage: string;
}
