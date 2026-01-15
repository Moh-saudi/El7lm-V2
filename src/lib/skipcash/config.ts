const isProduction = process.env.NODE_ENV === 'production';

export const skipCashConfig = {
    sandboxUrl: 'https://skipcashtest.azurewebsites.net',
    productionUrl: 'https://api.skipcash.app',
    secretKey: (process.env.SKIPCASH_SECRET_KEY || '').trim(),
    keyId: (process.env.SKIPCASH_KEY_ID || '').trim(),
    clientId: (process.env.SKIPCASH_CLIENT_ID || '').trim(),
    webhookKey: (process.env.SKIPCASH_WEBHOOK_KEY || '').trim(),
};

export const config = {
    baseUrl: process.env.SKIPCASH_MODE === 'live'
        ? skipCashConfig.productionUrl
        : skipCashConfig.sandboxUrl,
    ...skipCashConfig
};

export const getSkipCashBaseUrl = () => config.baseUrl;
