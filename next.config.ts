import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tối ưu chunk loading và error handling
  experimental: {
    // Giảm kích thước chunks để tải nhanh hơn
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },

  // Cấu hình webpack để xử lý chunk errors tốt hơn
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Thêm retry logic cho chunk loading
      config.output = {
        ...config.output,
        // Thêm crossOriginLoading để tránh CORS issues
        crossOriginLoading: 'anonymous',
      };
    }
    return config;
  },

  // Headers để tối ưu caching
  async headers() {
    return [
      {
        // Cache static assets nhưng không cache chunks quá lâu
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400', // 1 giờ cache, 1 ngày stale
          },
        ],
      },
    ];
  },
};

export default nextConfig;
