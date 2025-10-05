/** @type {import('next').NextConfig} */
const nextConfig = {
  // إعدادات محسّنة لـ Coolify
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // تعطيل جميع التحسينات لتوفير الذاكرة
  swcMinify: false,
  optimizeFonts: false,
  compress: false,


  // إعدادات الشبكة
  trailingSlash: false,
  generateEtags: true,

  // إعدادات timeout محسّنة
  staticPageGenerationTimeout: 30,
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // تعطيل Static Generation
    isrFlushToDisk: false,
    // إعدادات timeout إضافية
    staticGenerationRetryCount: 0,
    skipTrailingSlashRedirect: true,
  },

  // webpack مبسط لتوفير الذاكرة
  webpack: (config, { isServer }) => {
    // إعدادات مبسطة لتوفير الذاكرة
    if (isServer) {
      config.optimization = {
        minimize: false,
        splitChunks: false,
        concatenateModules: false,
      };
    }

    return config;
  },

  // إعدادات الصور
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
  },

  // إعدادات الأمان
  poweredByHeader: false,

  // إعدادات إضافية
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig;
