import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // دعم أسماء الملفات العربية
    remotePatterns: [
      { protocol: 'https', hostname: 'api.qrserver.com', pathname: '/v1/**' },
    ],
    unoptimized: true,
    // السماح بجميع أنواع الصور
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // إعدادات إضافية للصور
    minimumCacheTTL: 60,
  },
  // دعم أسماء الملفات العربية في المسارات
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // إزالة service-worker.js من الأخطاء
  async rewrites() {
    return [];
  },
};

const pwa = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

export default pwa(nextConfig);

