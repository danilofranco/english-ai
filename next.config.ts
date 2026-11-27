import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shield old deployments that still have recordings in the public directory.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/recordings/:path*', destination: '/api/retired-recordings' }],
    }
  },
  /* config options here */
};

export default nextConfig;
