/** @type {import('next').NextConfig} */
const nextConfig = {
  // إعدادات Production
  env: {
    ENABLE_SMS_SIMULATION: 'false',
    ENABLE_WHATSAPP_SIMULATION: 'false'
  },
  
  // إعدادات الأمان
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;


