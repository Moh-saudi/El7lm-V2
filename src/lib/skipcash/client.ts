import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { skipCashConfig, getSkipCashBaseUrl } from './config';
import { SkipCashPaymentRequest, SkipCashPaymentResponse } from './types';

export const createSkipCashPayment = async (request: SkipCashPaymentRequest): Promise<SkipCashPaymentResponse> => {
    const { amount, customerEmail, customerPhone, customerName, transactionId, custom1, returnUrl } = request;

    if (!skipCashConfig.secretKey || !skipCashConfig.keyId) {
        throw new Error('SkipCash configuration is missing (SKIPCASH_SECRET_KEY or SKIPCASH_KEY_ID)');
    }

    const uid = uuidv4();
    const keyId = skipCashConfig.keyId;

    // Normalize names
    const names = (customerName || 'Customer EL7LM').trim().split(/\s+/);
    const firstName = names[0] || 'Customer';
    const lastName = names.slice(1).join(' ') || 'Platform';

    // Normalize Phone
    let phoneStr = customerPhone || '33333333';
    phoneStr = phoneStr.replace(/\D/g, '');
    if (phoneStr.startsWith('974')) {
        phoneStr = '+' + phoneStr;
    } else if (phoneStr.length === 8 && (['3', '5', '6', '7'].some(p => phoneStr.startsWith(p)))) {
        phoneStr = '+974' + phoneStr;
    } else if (phoneStr.length > 8) {
        phoneStr = '+' + phoneStr;
    }

    const amountStr = Number(amount).toFixed(2);

    // Fields for signature as per SkipCash documentation
    const signatureFields: any = {
        Uid: uid,
        KeyId: keyId,
        Amount: amountStr,
        FirstName: firstName,
        LastName: lastName,
        Phone: phoneStr,
        Email: customerEmail,
        Street: "Doha",
        City: "Doha",
        State: "QA",
        Country: "QA",
        PostalCode: "00000",
        TransactionId: transactionId || uid,
        Custom1: custom1 || ''
    };

    const signatureParts: string[] = [];
    const fieldsOrder = ["Uid", "KeyId", "Amount", "FirstName", "LastName", "Phone", "Email", "Street", "City", "State", "Country", "PostalCode", "TransactionId", "Custom1"];

    fieldsOrder.forEach(key => {
        const val = signatureFields[key];
        if (val !== undefined && val !== null && val !== '') {
            signatureParts.push(`${key}=${val}`);
        }
    });

    const combinedData = signatureParts.join(',');
    const combinedDataHash = CryptoJS.HmacSHA256(combinedData, skipCashConfig.secretKey);
    const hashInBase64 = CryptoJS.enc.Base64.stringify(combinedDataHash);

    // Payload for the POST request
    // IMPORTANT: SkipCash expects ReturnUrl in the payload but it is NOT part of the signature
    const payload: any = {};
    fieldsOrder.forEach(key => {
        const val = signatureFields[key];
        if (val !== undefined && val !== null && val !== '') {
            payload[key] = val;
        }
    });

    // Add ReturnUrl to payload
    if (returnUrl) {
        payload.ReturnUrl = returnUrl;
    }

    try {
        const baseUrl = getSkipCashBaseUrl();
        const url = `${baseUrl}/api/v1/payments`;

        const fs = require('fs');
        const debugLog = `\n--- ${new Date().toISOString()} ---\nURL: ${url}\nPayload: ${JSON.stringify(payload)}\nSignature Data: ${combinedData}\nAuthHeader: ${hashInBase64}\n`;
        fs.appendFileSync('skipcash_debug.log', debugLog);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: hashInBase64,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const json = await response.json();
        fs.appendFileSync('skipcash_debug.log', `Response: ${JSON.stringify(json)}\n`);
        return json as SkipCashPaymentResponse;
    } catch (err: any) {
        console.error('❌ [SkipCash Client] Error:', err);
        throw new Error(err.message || 'SkipCash payment initialization failed');
    }
};

export interface SkipCashPaymentDetail {
    id: string;
    amount: number;
    currency: string;
    statusId: number;
    status: string;
    transactionId: string;
    paymentToken: string;
    date: string;
}

export const getSkipCashPaymentDetails = async (paymentId: string): Promise<SkipCashPaymentDetail> => {
    const baseUrl = getSkipCashBaseUrl();
    const url = `${baseUrl}/api/v1/payments/${paymentId}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': skipCashConfig.secretKey, // Using Secret Key for GET requests if supported
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to get payment details: ${response.status}`);
    }

    const json = await response.json();
    return json.resultObj as SkipCashPaymentDetail;
};
