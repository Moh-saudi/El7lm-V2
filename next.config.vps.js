/** @type {import('next').NextConfig} */
const nextConfig = {
  // إعدادات مبسطة للـ VPS
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // تعطيل جميع التحسينات المعقدة
  swcMinify: true,
  optimizeFonts: false,
  compress: true,

  // إعدادات مبسطة
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },

  // تعطيل Static Generation
  trailingSlash: false,
  generateEtags: false,

  // webpack مبسط للـ VPS
  webpack: (config, { isServer }) => {
    // إعدادات أساسية فقط
    if (isServer) {
      config.optimization = {
        minimize: true,
        splitChunks: true,
      };
    }

    return config;
  },
}

module.exports = nextConfig;
