/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@gideon-defender/ui',
    '@trycompai/design-system',
    '@gideon-defender/db',
    '@gideon-defender/company',
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
