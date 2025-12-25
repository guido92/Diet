import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },


  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.giallozafferano.it',
      },
      {
        protocol: 'https',
        hostname: 'static.giallozafferano.it',
      },
      {
        protocol: 'https',
        hostname: '*.giallozafferano.it',
      }
    ],
  },
};

export default nextConfig;
