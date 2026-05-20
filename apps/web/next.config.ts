import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',   // Static export — deploys to any CDN / Vercel
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
