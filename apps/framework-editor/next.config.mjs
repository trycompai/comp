/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@trycompai/ui',
    '@trycompai/design-system',
    '@trycompai/db',
    '@trycompai/company',
    'better-auth',
    '@noble/ciphers',
    '@noble/hashes',
  ],
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
