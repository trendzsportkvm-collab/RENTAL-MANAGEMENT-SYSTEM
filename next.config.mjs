/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer requires canvas which is not available server-side
  serverExternalPackages: ["canvas"],
  turbopack: {},
};

export default nextConfig;
