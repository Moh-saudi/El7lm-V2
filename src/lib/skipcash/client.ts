import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { skipCashConfig, getSkipCashBaseUrl } from './config';
import { SkipCashPaymentRequest, SkipCashPaymentResponse } from './types';

export const createSkipCashPayment = async (request: SkipCashPaymentRequest): Promise<SkipCashPaymentResponse> => {
    const {
        amount,
        customerEmail,
        customerPhone,
        customerName,
        transactionId,
        custom1,
        returnUrl,
        street,
        city,
        state,
        country,
        postalCode,
    } = request;

    if (!skipCashConfig.secretKey || !skipCashConfig.keyId) {
        throw new Error('SkipCash configuration is missing (SKIPCASH_SECRET_KEY or SKIPCASH_KEY_ID)');
    }

    const uid = uuidv4();
    const keyId = skipCashConfig.keyId;

    // Normalize names
    const names = (customerName || 'Customer EL7LM').trim().split(/\s+/);
    const firstName = names[0] || 'Customer';
    const lastName = names.slice(1).join(' ') || 'Platform';

    // The working legacy script used an 8-digit local phone number.
    let phoneStr = customerPhone || '33333333';
    phoneStr = phoneStr.replace(/\D/g, '');
    if (phoneStr.startsWith('974') && phoneStr.length > 8) {
        phoneStr = phoneStr.slice(3);
    }
    if (phoneStr.length > 8) phoneStr = phoneStr.slice(-8);

    const amountStr = Number(amount).toFixed(2);
    const normalizedCustom1 = (custom1 || '').trim();
    const resolvedStreet = street || 'Test St';
    const resolvedCity = city || 'Doha';
    const resolvedState = state || 'QA';
    const resolvedCountry = country || 'QA';
    const resolvedPostalCode = postalCode || '00000';

    // Match the working legacy script and official Node.js guide field order.
    const signatureFields: any = {
        Uid: uid,
        KeyId: keyId,
        Amount: amountStr,
        FirstName: firstName,
        LastName: lastName,
        Phone: phoneStr,
        Email: customerEmail,
        Street: resolvedStreet,
        City: resolvedCity,
        State: resolvedState,
        Country: resolvedCountry,
        PostalCode: resolvedPostalCode,
        TransactionId: transactionId || uid,
    };
    if (normalizedCustom1) {
        signatureFields.Custom1 = normalizedCustom1;
    }

    const combinedParts = [
        `Uid=${signatureFields.Uid}`,
        `KeyId=${signatureFields.KeyId}`,
        `Amount=${signatureFields.Amount}`,
        `FirstName=${signatureFields.FirstName}`,
        `LastName=${signatureFields.LastName}`,
        `Phone=${signatureFields.Phone}`,
        `Email=${signatureFields.Email}`,
        `Street=${signatureFields.Street}`,
        `City=${signatureFields.City}`,
        `State=${signatureFields.State}`,
        `Country=${signatureFields.Country}`,
        `PostalCode=${signatureFields.PostalCode}`,
        `TransactionId=${signatureFields.TransactionId}`,
    ];
    if (normalizedCustom1) {
        combinedParts.push(`Custom1=${signatureFields.Custom1}`);
    }
    const combinedData = combinedParts.join(',');
    const combinedDataHash = CryptoJS.HmacSHA256(combinedData, skipCashConfig.secretKey);
    const hashInBase64 = CryptoJS.enc.Base64.stringify(combinedDataHash);

    const payload = {
        ...signatureFields,
        ...(returnUrl ? { ReturnUrl: returnUrl } : {}),
    };

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
