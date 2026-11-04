import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No standalone - use standard build (simpler, more reliable on Render)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
