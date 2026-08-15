/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer requires canvas which is not available server-side
  serverExternalPackages: ["canvas"],
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ],
      },
    ];
  },
};

export default nextConfig;
