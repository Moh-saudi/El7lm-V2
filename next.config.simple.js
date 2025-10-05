/** @type {import('next').NextConfig} */
const nextConfig = {
  // إعدادات أساسية فقط
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // تعطيل جميع التحسينات المعقدة
  swcMinify: false,
  optimizeFonts: false,
  compress: false,

  // تعطيل التحديثات التلقائية
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },

  // تعطيل التحديثات التلقائية
  onDemandEntries: {
    // فترة انتظار أطول قبل إغلاق الصفحة
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // تعطيل Hot Module Replacement
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: false,
      ignored: /node_modules/,
    };
    return config;
  },

  // تعطيل Static Generation بالكامل
  experimental: {
    // تعطيل جميع الميزات التجريبية
    disableOptimizedLoading: true,
    fastRefresh: false,
    disableStaticGeneration: true,
    isrMemoryCacheSize: 0,
    // تعطيل التحديثات التلقائية
    disableAutoRefresh: true,
    disableHotReload: true,
    // تعطيل ISR
    isrMemoryCacheSize: 0,
    // تعطيل Fast Refresh
    fastRefresh: false,
  },

  // webpack مبسط جداً
  webpack: (config, { isServer }) => {
    // تعطيل جميع التحسينات
    if (isServer) {
      config.optimization = {
        minimize: false,
        splitChunks: false,
        concatenateModules: false,
      };
    }

    // إضافة حماية من التحديثات المتكررة
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
}

module.exports = nextConfig;
