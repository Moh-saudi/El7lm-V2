/** @type {import('next').NextConfig} */
const nextConfig = {
    // إعداد متغيرات البيئة لـ Vercel
    env: {
        BEON_API_TOKEN: process.env.BEON_API_TOKEN,
        BEON_BASE_URL: process.env.BEON_BASE_URL,
        BEON_SMS_TOKEN: process.env.BEON_SMS_TOKEN,
        BEON_WHATSAPP_TOKEN: process.env.BEON_WHATSAPP_TOKEN,
        BEON_OTP_TOKEN: process.env.BEON_OTP_TOKEN,
        BEON_SENDER_NAME: process.env.BEON_SENDER_NAME,
        ENABLE_SMS_SIMULATION: process.env.ENABLE_SMS_SIMULATION,
        // Babaservice WhatsApp API Configuration
        BABASERVICE_BASE_URL: process.env.BABASERVICE_BASE_URL,
        BABASERVICE_ACCESS_TOKEN: process.env.BABASERVICE_ACCESS_TOKEN,
        BABASERVICE_INSTANCE_ID: process.env.BABASERVICE_INSTANCE_ID,
        BABASERVICE_WEBHOOK_URL: process.env.BABASERVICE_WEBHOOK_URL,
    },
    // تحسين التعامل مع الأخطاء
    output: 'standalone',
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // تحسين التعامل مع الأخطاء - تعطيل التحديثات التلقائية
    // onDemandEntries: {
    //     maxInactiveAge: 25 * 1000,
    //     pagesBufferLength: 2,
    // },
    // Memory optimization for build - زيادة timeout لتجنب مشاكل البناء
    staticPageGenerationTimeout: 30,
    // Reduce memory usage during build
    generateBuildId: async () => {
        return 'build-' + Date.now();
    },
    // إعدادات إضافية للتوافق مع Coolify
    trailingSlash: false,
    skipTrailingSlashRedirect: true,
    generateEtags: false,
    images: {
        // تمكين الصور المحلية
        unoptimized: true,
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 60,
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        // تحسين تحميل الصور
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'ekyerljzfokqimbabzxm.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            }
        ],
        domains: ['lh3.googleusercontent.com', 'graph.facebook.com'],
    },
    // تحسين الأداء العام
    compress: true,
    poweredByHeader: false,
    // تعطيل التحديثات التلقائية
    devIndicators: {
        position: 'bottom-right',
    },
    // إصلاح مشكلة إعادة تعريف location - webpack5 هو الافتراضي في Next.js 14
    // تحسين CSS - تم إزالة cssModules لأنه غير مدعوم في Next.js 14
    // تحسين معالجة CSS
    sassOptions: {
        includePaths: ['./src'],
    },
    // تحسين الأداء - swcMinify هو الافتراضي في Next.js 14
    // تحسين التوجيه والتخزين المؤقت
    generateEtags: false,
    trailingSlash: false,
    // تحسين الأداء
    reactStrictMode: true,

    // تحسين التعامل مع الملفات
    assetPrefix: '',
    // تحسين الأداء - optimizeFonts هو الافتراضي في Next.js 14
    // Prevent font optimization issues during build
    compiler: {
        // Remove console.log in production, keep console.error and console.warn
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn']
        } : false,
    },
    // إعدادات الخادم الخارجية - تم إزالة serverExternalPackages لأنه غير مدعوم في Next.js 14
    experimental: {
        serverActions: {
            bodySizeLimit: '100mb',
        },
    },

    // تحسين إعدادات الخطوط
    webpack: (config, { isServer }) => {
        // تحسين تحميل الخطوط
        config.module.rules.push({
            test: /\.(woff|woff2|eot|ttf|otf)$/i,
            type: 'asset/resource',
        });

        // تحسين التعامل مع الأخطاء
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
        };

        // إصلاح مشكلة إعادة تعريف location
        if (!isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                'location': false,
            };
        }

        // تحسين الأداء
        config.performance = {
            hints: false,
            maxEntrypointSize: 512000,
            maxAssetSize: 512000,
        };

        return config;
    },
    // إعدادات إضافية للاستقرار والأمان
    async headers() {
        return [
            {
                source: '/manifest.json',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                ],
            },
            {
                source: '/api/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    },
                    {
                        key: 'Pragma',
                        value: 'no-cache',
                    },
                    {
                        key: 'Expires',
                        value: '0',
                    },
                ],
            },
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.merchant.geidea.net https://accosa-ivs.s3.ap-south-1.amazonaws.com https://secure-acs2ui-b1.wibmo.com https://www.gstatic.com https://securetoken.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://s.ytimg.com https://apis.google.com https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.clarity.ms https://www.googleadservices.com https://scripts.clarity.ms https://connect.facebook.net; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://www.merchant.geidea.net https://accosa-ivs.s3.ap-south-1.amazonaws.com https://secure-acs2ui-b1.wibmo.com https://www.gstatic.com https://securetoken.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://s.ytimg.com https://apis.google.com https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.clarity.ms https://www.googleadservices.com https://scripts.clarity.ms https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://www.gstatic.com; font-src 'self' https://fonts.gstatic.com data: blob:; img-src 'self' data: https: blob:; media-src 'self' https: blob:; connect-src 'self' https: wss: https://*.geidea.net https://*.wibmo.com https://*.amazonaws.com https://www.clarity.ms https://www.google-analytics.com https://analytics.google.com https://*.facebook.com https://*.facebook.net; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.merchant.geidea.net https://secure-acs2ui-b1.wibmo.com https://*.firebaseapp.com https://translate.google.com https://www.googletagmanager.com https://www.facebook.com https://*.facebook.com; object-src 'self' data:; frame-ancestors 'self';",
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/geidea/:path*',
                destination: '/api/geidea/:path*',
            },
            {
                source: '/api/health',
                destination: '/api/health',
            },
        ];
    },
    // تحسين التعامل مع الأخطاء
    async redirects() {
        return [
            {
                source: '/api/health',
                destination: '/api/health',
                permanent: false,
            },
            {
                source: '/api/status',
                destination: '/api/status',
                permanent: false,
            },
        ];
    },
}

// تحسين التعامل مع الأخطاء
module.exports = nextConfig;
